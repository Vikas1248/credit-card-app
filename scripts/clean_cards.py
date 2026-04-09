import json
import logging
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
MODEL = "gpt-4o-mini"
INPUT_DIR = Path("cards")
OUTPUT_DIR = Path("cleaned_cards")
BANK_FROM_FOLDER = {
    "amex": "American Express",
    "american_express": "American Express",
    "icici": "ICICI",
    "sbi": "SBI",
    "axis": "Axis",
    "hdfc": "HDFC",
}


def setup_logger() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def normalize(value: Any) -> str:
    text = "N/A" if value is None else str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text or "N/A"


def build_prompt(raw_text: str, fallback_name: str) -> str:
    return f"""
Extract structured credit card data from the raw text below.

Return ONLY valid JSON in this exact format:
{{
  "card_name": "string",
  "bank": "string",
  "annual_fee": "string",
  "reward_type": "cashback|points|N/A",
  "reward_rate": "string",
  "lounge_access": "string",
  "best_for": "string",
  "key_benefits": "string"
}}

Rules:
- STRICTLY use only facts present in RAW TEXT.
- Do not guess, infer, or hallucinate unavailable values.
- If a field is unclear or missing, set it to "N/A".
- Use "{fallback_name}" for card_name if missing in RAW TEXT.
- reward_type must be exactly one of: "cashback", "points", "N/A".
- annual_fee should preserve original human-readable currency text if present.
- key_benefits should be a short summary from RAW TEXT, not invented.
- Return JSON object only. No markdown, comments, or extra keys.

RAW TEXT:
{raw_text}
""".strip()


def call_openai(api_key: str, raw_text: str, fallback_name: str) -> dict[str, Any]:
    payload = {
        "model": MODEL,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a strict financial information extractor. "
                    "Output must be valid JSON with exactly the requested keys. "
                    "Never fabricate details."
                ),
            },
            {"role": "user", "content": build_prompt(raw_text, fallback_name)},
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


def infer_bank_from_path(file_path: Path) -> str:
    parent_name = file_path.parent.name.lower()
    return BANK_FROM_FOLDER.get(parent_name, "Unknown")


def clean_card(
    extracted: dict[str, Any], fallback_name: str, fallback_bank: str
) -> dict[str, str]:
    reward_type = normalize(extracted.get("reward_type")).lower()
    if reward_type not in {"cashback", "points"}:
        reward_type = "N/A"

    card_name = normalize(extracted.get("card_name"))
    if card_name == "N/A":
        card_name = fallback_name

    cleaned = {
        "card_name": card_name,
        "bank": normalize(extracted.get("bank")),
        "annual_fee": normalize(extracted.get("annual_fee")),
        "reward_type": reward_type,
        "reward_rate": normalize(extracted.get("reward_rate")),
        "lounge_access": normalize(extracted.get("lounge_access")),
        "best_for": normalize(extracted.get("best_for")),
        "key_benefits": normalize(extracted.get("key_benefits")),
    }

    # Guardrails for consistency.
    if cleaned["bank"] == "N/A":
        cleaned["bank"] = fallback_bank
    for field in (
        "annual_fee",
        "reward_rate",
        "lounge_access",
        "best_for",
        "key_benefits",
    ):
        if not cleaned[field]:
            cleaned[field] = "N/A"
    return cleaned


def process_file(file_path: Path, api_key: str) -> bool:
    try:
        with file_path.open("r", encoding="utf-8") as file:
            payload = json.load(file)

        raw_text = normalize(payload.get("full_text_content"))
        fallback_name = normalize(payload.get("card_name"))
        fallback_bank = infer_bank_from_path(file_path)
        extracted = call_openai(api_key, raw_text, fallback_name)
        cleaned = clean_card(extracted, fallback_name, fallback_bank)

        relative_path = file_path.relative_to(INPUT_DIR)
        out_path = OUTPUT_DIR / relative_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as file:
            json.dump(cleaned, file, indent=2, ensure_ascii=False)

        logging.info("Saved cleaned file: %s", out_path)
        return True
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        logging.error("OpenAI API HTTP error for %s: %s", file_path.name, error_body)
        return False
    except urllib.error.URLError as exc:
        logging.error("Network error for %s: %s", file_path.name, exc)
        return False
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        logging.error("Parse error for %s: %s", file_path.name, exc)
        return False
    except Exception as exc:  # noqa: BLE001
        logging.exception("Unexpected error for %s: %s", file_path.name, exc)
        return False


def main() -> int:
    setup_logger()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logging.error("Missing OPENAI_API_KEY environment variable.")
        return 1

    if not INPUT_DIR.exists() or not INPUT_DIR.is_dir():
        logging.error("Input folder not found: %s", INPUT_DIR.resolve())
        return 1

    files = sorted(INPUT_DIR.glob("**/*.json"))
    if not files:
        logging.warning("No JSON files found in %s", INPUT_DIR.resolve())
        return 0

    success = 0
    failed = 0
    for file_path in files:
        if process_file(file_path, api_key):
            success += 1
        else:
            failed += 1

    logging.info("Completed: %d success, %d failed", success, failed)
    return 0 if success > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
