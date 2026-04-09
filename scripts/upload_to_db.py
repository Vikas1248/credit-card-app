import json
import logging
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


INPUT_DIR = Path("cleaned_cards")


def setup_logger() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def normalize(value: Any) -> str:
    if value is None:
        return "N/A"
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text or "N/A"


def parse_fee_to_int(value: str) -> int:
    digits = re.findall(r"\d+", value.replace(",", ""))
    return int(digits[0]) if digits else 0


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


def build_payload(cleaned_card: dict[str, Any]) -> dict[str, Any]:
    reward_type = normalize(cleaned_card.get("reward_type")).lower()
    if reward_type not in {"cashback", "points"}:
        reward_type = "points"

    return {
        "card_name": normalize(cleaned_card.get("card_name")),
        "bank": normalize(cleaned_card.get("bank")),
        "network": "Visa",
        "joining_fee": 0,
        "annual_fee": parse_fee_to_int(normalize(cleaned_card.get("annual_fee"))),
        "reward_type": reward_type,
        "reward_rate": normalize(cleaned_card.get("reward_rate")),
        "lounge_access": normalize(cleaned_card.get("lounge_access")),
        "best_for": normalize(cleaned_card.get("best_for")),
        "key_benefits": normalize(cleaned_card.get("key_benefits")),
    }


def upsert_card(supabase_url: str, supabase_key: str, payload: dict[str, Any]) -> None:
    base_url = f"{supabase_url.rstrip('/')}/rest/v1/credit_cards"
    quoted_name = urllib.parse.quote(payload["card_name"])
    quoted_bank = urllib.parse.quote(payload["bank"])

    # Check existence by composite business key: card_name + bank
    check_url = (
        f"{base_url}?select=id"
        f"&card_name=eq.{quoted_name}"
        f"&bank=eq.{quoted_bank}"
        "&limit=1"
    )
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
        if rows:
            patch_url = (
                f"{base_url}?card_name=eq.{quoted_name}&bank=eq.{quoted_bank}"
            )
            supabase_request(
                "PATCH",
                patch_url,
                supabase_key,
                payload,
                prefer_header="return=representation",
            )
        else:
            supabase_request("POST", base_url, supabase_key, [payload])


def main() -> int:
    setup_logger()

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
    if not INPUT_DIR.exists() or not INPUT_DIR.is_dir():
        logging.error("Input folder not found: %s", INPUT_DIR.resolve())
        return 1

    files = sorted(INPUT_DIR.glob("*.json"))
    if not files:
        logging.warning("No JSON files found in %s", INPUT_DIR.resolve())
        return 0

    success = 0
    failed = 0

    for file_path in files:
        try:
            with file_path.open("r", encoding="utf-8") as file:
                cleaned_card = json.load(file)

            payload = build_payload(cleaned_card)
            upsert_card(supabase_url, supabase_key, payload)
            logging.info("Uploaded to Supabase cards: %s", payload["card_name"])
            success += 1
        except urllib.error.HTTPError as exc:
            error_text = exc.read().decode("utf-8", errors="ignore")
            logging.error("Supabase HTTP error for %s: %s", file_path.name, error_text)
            failed += 1
        except urllib.error.URLError as exc:
            logging.error("Network error for %s: %s", file_path.name, exc)
            failed += 1
        except json.JSONDecodeError as exc:
            logging.error("Invalid JSON in %s: %s", file_path.name, exc)
            failed += 1
        except Exception as exc:  # noqa: BLE001
            logging.exception("Unexpected error for %s: %s", file_path.name, exc)
            failed += 1

    logging.info("Completed upload: %d success, %d failed", success, failed)
    return 0 if success > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
