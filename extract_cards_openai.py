import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Any


OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_MODEL = "gpt-4o-mini"


def read_input_text(path: str | None) -> str:
    if path:
        with open(path, "r", encoding="utf-8") as file:
            return file.read().strip()
    return sys.stdin.read().strip()


def build_prompt(raw_text: str) -> list[dict[str, str]]:
    system_message = (
        "You are a data extraction assistant. "
        "Extract credit card details from raw text and return JSON only."
    )
    user_message = f"""
Extract structured credit card data from this raw text.

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{{
  "cards": [
    {{
      "card_name": "string",
      "annual_fee": "string",
      "reward_rate": "string",
      "lounge_access": "string",
      "best_for": "string"
    }}
  ]
}}

Rules:
- Keep values concise and human-readable.
- If a field is missing, use "N/A".
- Do not invent cards not present in the text.

RAW TEXT:
{raw_text}
""".strip()

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message},
    ]


def call_openai(api_key: str, model: str, raw_text: str) -> dict[str, Any]:
    payload = {
        "model": model,
        "temperature": 0,
        "messages": build_prompt(raw_text),
        "response_format": {"type": "json_object"},
    }

    request = urllib.request.Request(
        OPENAI_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=90) as response:
        response_body = response.read().decode("utf-8")
        return json.loads(response_body)


def extract_json_content(api_response: dict[str, Any]) -> dict[str, Any]:
    try:
        content = api_response["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("Model output is not a JSON object.")
        return parsed
    except (KeyError, IndexError, json.JSONDecodeError, TypeError, ValueError) as exc:
        raise ValueError(f"Failed to parse model JSON output: {exc}") from exc


def normalize_cards(data: dict[str, Any]) -> list[dict[str, str]]:
    cards = data.get("cards", [])
    if not isinstance(cards, list):
        raise ValueError("Expected 'cards' to be a list.")

    normalized: list[dict[str, str]] = []
    required_fields = [
        "card_name",
        "annual_fee",
        "reward_rate",
        "lounge_access",
        "best_for",
    ]

    for item in cards:
        if not isinstance(item, dict):
            continue
        clean_item: dict[str, str] = {}
        for field in required_fields:
            value = item.get(field, "N/A")
            value_str = str(value).strip() if value is not None else "N/A"
            clean_item[field] = re.sub(r"\s+", " ", value_str) or "N/A"
        normalized.append(clean_item)

    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract structured credit card JSON from raw text using OpenAI API."
    )
    parser.add_argument(
        "--input",
        help="Path to a text file containing raw scraped card text. If omitted, reads stdin.",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"OpenAI model to use (default: {DEFAULT_MODEL}).",
    )
    args = parser.parse_args()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY is not set.", file=sys.stderr)
        return 1

    try:
        raw_text = read_input_text(args.input)
        if not raw_text:
            print("Error: No input text provided.", file=sys.stderr)
            return 1

        api_response = call_openai(api_key=api_key, model=args.model, raw_text=raw_text)
        extracted = extract_json_content(api_response)
        cards = normalize_cards(extracted)
        print(json.dumps({"cards": cards}, indent=2, ensure_ascii=False))
        return 0
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        print(f"OpenAI API HTTP error {exc.code}: {error_body}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Network error calling OpenAI API: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Unexpected error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
