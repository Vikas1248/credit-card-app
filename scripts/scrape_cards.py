import argparse
import json
import logging
import re
from pathlib import Path
from typing import Any

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


DEFAULT_URL = "https://www.americanexpress.com/in/credit-cards/all-cards/"
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


def scrape_cards(url: str) -> list[dict[str, str]]:
    cards: list[dict[str, str]] = []
    seen_names: set[str] = set()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        try:
            logging.info("Opening page: %s", url)
            page.goto(url, wait_until="domcontentloaded", timeout=90000)
            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except PlaywrightTimeoutError:
                logging.warning("Network idle wait timed out; continuing.")

            scroll_until_loaded(page)
            card_containers = page.locator(
                "article, section, li, div"
            ).filter(has=page.locator("h1, h2, h3, h4, h5"))

            total = card_containers.count()
            for idx in range(total):
                container = card_containers.nth(idx)
                heading = container.locator("h1, h2, h3, h4, h5").first
                if heading.count() == 0:
                    continue

                try:
                    card_name = clean_text(heading.inner_text(timeout=2000))
                except PlaywrightTimeoutError:
                    continue
                if not card_name:
                    continue

                # Keep likely card entities only.
                low = card_name.lower()
                if "card" not in low and "platinum" not in low and "sapphire" not in low:
                    continue
                if len(card_name) < 4 or len(card_name) > 120:
                    continue
                if card_name in seen_names:
                    continue

                try:
                    full_text_content = clean_text(container.inner_text(timeout=3000))
                except PlaywrightTimeoutError:
                    continue
                if len(full_text_content) < 40:
                    continue

                seen_names.add(card_name)
                cards.append(
                    {
                        "card_name": card_name,
                        "full_text_content": full_text_content,
                    }
                )

            # Fallback for sites where card names appear mostly in links.
            if not cards:
                logging.info("Primary extraction found no cards, using fallback mode.")
                anchors = page.locator("a")
                a_count = anchors.count()
                blocked_terms = {
                    "credit cards",
                    "debit cards",
                    "cards",
                    "card",
                    "learn more",
                    "apply now",
                    "read more",
                }
                for i in range(min(a_count, 1200)):
                    link = anchors.nth(i)
                    label = clean_text(link.inner_text(timeout=1000))
                    if not label:
                        continue
                    low = label.lower()
                    if "card" not in low:
                        continue
                    if low in blocked_terms:
                        continue
                    if len(label) < 6 or len(label) > 120:
                        continue
                    if label in seen_names:
                        continue

                    container = link.locator(
                        "xpath=ancestor::*[self::article or self::section or self::li or self::div][1]"
                    )
                    if container.count() == 0:
                        continue
                    full_text_content = clean_text(container.first.inner_text(timeout=1500))
                    if len(full_text_content) < 30:
                        continue

                    seen_names.add(label)
                    cards.append(
                        {
                            "card_name": label,
                            "full_text_content": full_text_content,
                        }
                    )

            logging.info("Scraped %d cards", len(cards))
            return cards
        finally:
            browser.close()


def save_cards(cards: list[dict[str, str]], output_dir: Path) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    count = 0

    for card in cards:
        file_name = f"{sanitize_filename(card['card_name'])}.json"
        file_path = output_dir / file_name
        with file_path.open("w", encoding="utf-8") as file:
            json.dump(card, file, indent=2, ensure_ascii=False)
        count += 1
        logging.info("Saved: %s", file_path)

    return count


def main() -> int:
    setup_logger()
    parser = argparse.ArgumentParser(
        description="Scrape Amex India card listings and save one JSON file per card."
    )
    parser.add_argument(
        "--url",
        default=DEFAULT_URL,
        help=f"Page URL to scrape (default: Amex India all-cards)",
    )
    parser.add_argument(
        "--output-dir",
        default=str(OUTPUT_DIR),
        help="Folder to save card JSON files (default: cards)",
    )
    args = parser.parse_args()

    try:
        target_url = args.url
        cards = scrape_cards(target_url)
        if not cards:
            logging.error("No card data extracted from URL: %s", target_url)
            return 1

        saved = save_cards(cards, Path(args.output_dir))
        logging.info("Done. Saved %d JSON files to %s", saved, args.output_dir)
        return 0
    except PlaywrightError as exc:
        logging.exception("Playwright error: %s", exc)
        return 1
    except Exception as exc:  # noqa: BLE001
        logging.exception("Unexpected error: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
