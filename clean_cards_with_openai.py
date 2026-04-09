import json
import logging
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
MODEL = "gpt-4o-mini"
INPUT_DIR = Path("cards")
OUTPUT_DIR = Path("cleaned_cards")


def setup_logger() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def normalize_value(value: Any) -> str:
    text = "N/A" if value is None else str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text if text else "N/A"


def parse_fee_to_int(value: str) -> int:
    digits = re.findall(r"\d+", value.replace(",", ""))
    return int(digits[0]) if digits else 0


def build_prompt(raw_text: str) -> str:
    return f"""
Extract structured credit card data from the raw text below.

Return ONLY valid JSON in this exact format:
{{
  "card_name": "string",
  "annual_fee": "string",
  "reward_type": "cashback|points|N/A",
  "reward_rate": "string",
  "lounge_access": "string",
  "best_for": "string"
}}

Rules:
- STRICTLY use only facts present in RAW TEXT.
- Do not guess, infer, or hallucinate unavailable values.
- If any field is unclear, return "N/A".
- reward_type must be exactly one of: "cashback", "points", "N/A".
- annual_fee should preserve original human-readable currency text if present.
- Return JSON object only. No markdown, comments, or extra keys.

RAW TEXT:
{raw_text}
""".strip()


def call_openai(api_key: str, raw_text: str) -> dict[str, Any]:
    payload = {
        "model": MODEL,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a strict financial information extractor. "
                    "Output valid JSON with exactly requested keys. "
                    "Never fabricate missing details."
                ),
            },
            {
                "role": "user",
                "content": build_prompt(raw_text),
            },
        ],
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
        body = response.read().decode("utf-8")
        data = json.loads(body)
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)


def supabase_request(
    method: str,
    url: str,
    supabase_key: str,
    body: list[dict[str, Any]] | dict[str, Any] | None = None,
    prefer_header: str = "return=minimal",
) -> None:
    headers = {
        "Content-Type": "application/json",
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Prefer": prefer_header,
    }
    request = urllib.request.Request(
        url,
        data=None if body is None else json.dumps(body).encode("utf-8"),
        headers=headers,
        method=method,
    )
    with urllib.request.urlopen(request, timeout=60):
        return


def upsert_card_to_supabase(
    supabase_url: str, supabase_key: str, cleaned_card: dict[str, str]
) -> None:
    base_url = f"{supabase_url.rstrip('/')}/rest/v1/credit_cards"

    payload = {
        "card_name": cleaned_card["card_name"],
        "bank": "American Express",
        "network": "Visa",
        "joining_fee": 0,
        "annual_fee": parse_fee_to_int(cleaned_card["annual_fee"]),
        "reward_type": cleaned_card["reward_type"]
        if cleaned_card["reward_type"] in {"cashback", "points"}
        else "points",
        "reward_rate": cleaned_card["reward_rate"],
        "lounge_access": cleaned_card["lounge_access"],
        "best_for": cleaned_card["best_for"],
        "key_benefits": cleaned_card["reward_rate"],
    }

    # Try update-by-card_name first. If no row exists, insert new.
    update_url = f"{base_url}?card_name=eq.{urllib.parse.quote(payload['card_name'])}"
    supabase_request(
        "PATCH", update_url, supabase_key, payload, prefer_header="return=representation"
    )

    # Check if row exists after update; if not, insert.
    check_url = f"{base_url}?select=id&card_name=eq.{urllib.parse.quote(payload['card_name'])}&limit=1"
    request = urllib.request.Request(
        check_url,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        },
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        rows = json.loads(response.read().decode("utf-8"))
        if not rows:
            supabase_request("POST", base_url, supabase_key, [payload])


def clean_card_object(card: dict[str, Any], fallback_name: str) -> dict[str, str]:
    reward_type = normalize_value(card.get("reward_type"))
    reward_type_lower = reward_type.lower()
    if reward_type_lower not in {"cashback", "points"}:
        reward_type = "N/A"

    return {
        "card_name": normalize_value(card.get("card_name")) if card.get("card_name") else fallback_name,
        "annual_fee": normalize_value(card.get("annual_fee")),
        "reward_type": reward_type,
        "reward_rate": normalize_value(card.get("reward_rate")),
        "lounge_access": normalize_value(card.get("lounge_access")),
        "best_for": normalize_value(card.get("best_for")),
    }


def process_files(
    api_key: str, supabase_url: str, supabase_key: str
) -> int:
    if not INPUT_DIR.exists() or not INPUT_DIR.is_dir():
        logging.error("Input folder not found: %s", INPUT_DIR.resolve())
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(INPUT_DIR.glob("*.json"))

    if not files:
        logging.warning("No JSON files found in %s", INPUT_DIR.resolve())
        return 0

    for file_path in files:
        try:
            with file_path.open("r", encoding="utf-8") as file:
                payload = json.load(file)

            raw_text = normalize_value(payload.get("full_text_content"))
            fallback_name = normalize_value(payload.get("card_name"))

            extracted = call_openai(api_key=api_key, raw_text=raw_text)
            cleaned = clean_card_object(extracted, fallback_name)

            output_path = OUTPUT_DIR / file_path.name
            with output_path.open("w", encoding="utf-8") as file:
                json.dump(cleaned, file, indent=2, ensure_ascii=False)

            upsert_card_to_supabase(
                supabase_url=supabase_url,
                supabase_key=supabase_key,
                cleaned_card=cleaned,
            )

            logging.info("Cleaned and saved: %s", output_path)
        except urllib.error.HTTPError as exc:
            error_text = exc.read().decode("utf-8", errors="ignore")
            logging.error("HTTP error for %s: %s", file_path.name, error_text)
        except urllib.error.URLError as exc:
            logging.error("Network error for %s: %s", file_path.name, exc)
        except (KeyError, IndexError, json.JSONDecodeError) as exc:
            logging.error("Parse error for %s: %s", file_path.name, exc)
        except Exception as exc:  # noqa: BLE001
            logging.exception("Unexpected error for %s: %s", file_path.name, exc)

    return 0


def main() -> int:
    setup_logger()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logging.error("Missing OPENAI_API_KEY environment variable.")
        return 1

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )

    if not supabase_url:
        logging.error(
            "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) environment variable."
        )
        return 1
    if not supabase_key:
        logging.error(
            "Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variable."
        )
        return 1

    return process_files(
        api_key=api_key,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
    )


if __name__ == "__main__":
    raise SystemExit(main())
