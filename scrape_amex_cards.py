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

            # Try to find card-like containers and extract visible text.
            card_nodes = page.locator("article, section, div").filter(
                has=page.locator("h1, h2, h3, h4")
            )

            seen: set[str] = set()
            total = card_nodes.count()

            for index in range(total):
                node = card_nodes.nth(index)
                text_content = clean_text(node.inner_text(timeout=5000))
                if not text_content or len(text_content) < 40:
                    continue

                heading = node.locator("h1, h2, h3, h4").first
                card_name = clean_text(heading.inner_text(timeout=3000)) if heading.count() else ""

                if not card_name:
                    continue

                key = f"{card_name}|{text_content[:120]}"
                if key in seen:
                    continue
                seen.add(key)

                cards.append(
                    {
                        "card_name": card_name,
                        "full_text_content": text_content,
                    }
                )

            # Fallback: if strict container parsing fails, parse heading blocks.
            if not cards:
                headings = page.locator("h1, h2, h3, h4")
                heading_count = headings.count()

                for i in range(heading_count):
                    heading_text = clean_text(headings.nth(i).inner_text(timeout=3000))
                    if not heading_text:
                        continue

                    parent_text = clean_text(
                        headings.nth(i).locator("xpath=ancestor::*[self::article or self::section or self::div][1]").inner_text(timeout=5000)
                    )
                    if len(parent_text) < 40:
                        continue

                    key = f"{heading_text}|{parent_text[:120]}"
                    if key in seen:
                        continue
                    seen.add(key)

                    cards.append(
                        {
                            "card_name": heading_text,
                            "full_text_content": parent_text,
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
