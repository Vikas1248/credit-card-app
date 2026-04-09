import json
import logging
import re
import sys
from pathlib import Path
from typing import Any

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


TARGET_URL = "https://www.americanexpress.com/in/credit-cards/all-cards/"
OUTPUT_DIR = Path("cards")


def setup_logger() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def sanitize_filename(card_name: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", card_name, flags=re.UNICODE).strip()
    cleaned = re.sub(r"[\s-]+", "_", cleaned)
    return cleaned or "unknown_card"


def scroll_until_loaded(page: Any, max_rounds: int = 20, pause_ms: int = 1200) -> None:
    previous_height = -1
    for _ in range(max_rounds):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(pause_ms)
        current_height = page.evaluate("document.body.scrollHeight")
        if current_height == previous_height:
            break
        previous_height = current_height
    page.evaluate("window.scrollTo(0, 0)")


def scrape_cards() -> list[dict[str, str]]:
    cards: list[dict[str, str]] = []
    seen_names: set[str] = set()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        try:
            logging.info("Opening page: %s", TARGET_URL)
            page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=90000)
            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except PlaywrightTimeoutError:
                logging.warning("Network idle wait timed out; continuing.")

            scroll_until_loaded(page)
            page_text = clean_text(page.locator("body").inner_text(timeout=10000))

            name_pattern = re.compile(
                r"American Express(?:[®™]|\s|[A-Za-z]){1,80}?(?:Credit Card|Card)",
                re.IGNORECASE,
            )

            for raw_name in name_pattern.findall(page_text):
                card_name = clean_text(raw_name)
                normalized = card_name.lower()
                if normalized in {"american express card", "american express® card"}:
                    continue
                if card_name in seen_names:
                    continue
                seen_names.add(card_name)

                idx = page_text.lower().find(normalized)
                if idx == -1:
                    continue

                start = max(0, idx - 120)
                end = min(len(page_text), idx + 700)
                full_text_content = clean_text(page_text[start:end])

                cards.append(
                    {
                        "card_name": card_name,
                        "full_text_content": full_text_content,
                    }
                )

            logging.info("Scraped %d cards", len(cards))
            return cards
        finally:
            browser.close()


def save_cards_to_files(cards: list[dict[str, str]]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logging.info("Saving card JSON files to: %s", OUTPUT_DIR.resolve())

    for card in cards:
        card_name = card["card_name"]
        file_name = f"{sanitize_filename(card_name)}.json"
        file_path = OUTPUT_DIR / file_name

        payload = {
            "card_name": card_name,
            "full_text_content": card["full_text_content"],
        }

        with file_path.open("w", encoding="utf-8") as file:
            json.dump(payload, file, indent=2, ensure_ascii=False)

        logging.info("Saved: %s", file_path)


def main() -> int:
    setup_logger()
    try:
        cards = scrape_cards()
        if not cards:
            logging.error("No cards found on the page.")
            return 1

        save_cards_to_files(cards)
        logging.info("Done. Created %d JSON files.", len(cards))
        return 0
    except PlaywrightError as exc:
        logging.exception("Playwright error: %s", exc)
        return 1
    except Exception as exc:  # noqa: BLE001
        logging.exception("Unexpected error: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
