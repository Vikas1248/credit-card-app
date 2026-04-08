import argparse
import json
import os
import sys
import tempfile
from typing import Any

from extract_cards_openai import (
    DEFAULT_MODEL,
    call_openai,
    extract_json_content,
    normalize_cards,
)
from import_cards_to_supabase import main as import_cards_main
from scrape_amex_cards import scrape_cards


def build_raw_text_from_scrape(scraped_cards: list[dict[str, str]]) -> str:
    blocks: list[str] = []
    for card in scraped_cards:
        card_name = card.get("card_name", "").strip()
        full_text = card.get("full_text_content", "").strip()
        if not card_name and not full_text:
            continue
        blocks.append(f"Card Name: {card_name}\nContent: {full_text}")
    return "\n\n---\n\n".join(blocks)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scrape Amex cards with Playwright and extract structured JSON via OpenAI."
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"OpenAI model to use (default: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--save-raw",
        help="Optional file path to save raw scraped cards JSON before extraction.",
    )
    parser.add_argument(
        "--save-structured",
        help="Optional file path to save extracted structured JSON.",
    )
    parser.add_argument(
        "--push-to-supabase",
        action="store_true",
        help="If set, imports structured JSON into Supabase after extraction.",
    )
    args = parser.parse_args()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY is not set.", file=sys.stderr)
        return 1

    try:
        scraped_cards = scrape_cards()
        if not scraped_cards:
            print("Error: No cards scraped from source page.", file=sys.stderr)
            return 1

        if args.save_raw:
            with open(args.save_raw, "w", encoding="utf-8") as file:
                json.dump(scraped_cards, file, indent=2, ensure_ascii=False)

        raw_text = build_raw_text_from_scrape(scraped_cards)
        api_response: dict[str, Any] = call_openai(
            api_key=api_key,
            model=args.model,
            raw_text=raw_text,
        )
        extracted = extract_json_content(api_response)
        cards = normalize_cards(extracted)
        structured_payload = {"cards": cards}

        if args.save_structured:
            with open(args.save_structured, "w", encoding="utf-8") as file:
                json.dump(structured_payload, file, indent=2, ensure_ascii=False)

        if args.push_to_supabase:
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False, encoding="utf-8"
            ) as temp_file:
                json.dump(structured_payload, temp_file, indent=2, ensure_ascii=False)
                temp_path = temp_file.name

            old_argv = sys.argv[:]
            try:
                sys.argv = ["import_cards_to_supabase.py", "--input", temp_path]
                import_exit_code = import_cards_main()
                if import_exit_code != 0:
                    return import_exit_code
            finally:
                sys.argv = old_argv
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

        print(json.dumps(structured_payload, indent=2, ensure_ascii=False))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"Pipeline error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
