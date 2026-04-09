import json
import re
import sys
from typing import Any

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


TARGET_URL = "https://www.americanexpress.com/in/credit-cards/all-cards/"


def scroll_until_complete(page: Any, max_rounds: int = 25, pause_ms: int = 1200) -> None:
    """Scroll down repeatedly until page height stops growing."""
    previous_height = -1

    for _ in range(max_rounds):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(pause_ms)
        current_height = page.evaluate("document.body.scrollHeight")

        if current_height == previous_height:
            break
        previous_height = current_height

    page.evaluate("window.scrollTo(0, 0)")


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def scrape_cards() -> list[dict[str, str]]:
    cards: list[dict[str, str]] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        try:
            page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=90000)
            page.wait_for_load_state("networkidle", timeout=30000)
        except PlaywrightTimeoutError:
            # Continue even if networkidle times out, because many sites keep background requests open.
            pass

        try:
            scroll_until_complete(page)

            page_text = clean_text(page.locator("body").inner_text(timeout=10000))

            # Capture card names from visible page text (works even when cards are in carousels/lists).
            name_pattern = re.compile(
                r"American Express(?:[®™]|\s|[A-Za-z]){1,80}?(?:Credit Card|Card)",
                re.IGNORECASE,
            )
            matches = name_pattern.findall(page_text)
            normalized_names: list[str] = []

            for raw_name in matches:
                name = clean_text(raw_name)
                if not name.lower().startswith("american express"):
                    continue
                if name.lower() in {"american express card", "american express® card"}:
                    continue
                if name not in normalized_names:
                    normalized_names.append(name)

            for card_name in normalized_names:
                # Capture a nearby text window as full card context.
                idx = page_text.lower().find(card_name.lower())
                if idx == -1:
                    continue
                start = max(0, idx - 80)
                end = min(len(page_text), idx + 520)
                snippet = clean_text(page_text[start:end])
                cards.append(
                    {
                        "card_name": card_name,
                        "full_text_content": snippet,
                    }
                )

            return cards
        finally:
            context.close()
            browser.close()


def main() -> int:
    try:
        data = scrape_cards()
        print(json.dumps(data, indent=2, ensure_ascii=False))
        print(f"\nTotal cards extracted: {len(data)}")
        return 0
    except PlaywrightError as exc:
        print(f"Playwright error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Unexpected error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
