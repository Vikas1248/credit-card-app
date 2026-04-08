import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Any


def infer_bank(card_name: str) -> str:
    name = card_name.lower()
    known_banks = [
        "hdfc",
        "icici",
        "sbi",
        "axis",
        "kotak",
        "rbl",
        "indusind",
        "yes bank",
        "standard chartered",
        "american express",
        "amex",
    ]
    for bank in known_banks:
        if bank in name:
            return bank.title()
    return "Unknown"


def infer_network(card_name: str, reward_rate: str) -> str:
    text = f"{card_name} {reward_rate}".lower()
    if "mastercard" in text:
        return "Mastercard"
    return "Visa"


def infer_reward_type(reward_rate: str) -> str:
    text = reward_rate.lower()
    if "%" in text or "cashback" in text:
        return "cashback"
    return "points"


def parse_fee(value: str) -> int:
    if not value or value.strip().lower() == "n/a":
        return 0
    digits = re.findall(r"\d+", value.replace(",", ""))
    if not digits:
        return 0
    return int(digits[0])


def read_cards(path: str) -> list[dict[str, str]]:
    with open(path, "r", encoding="utf-8") as file:
        payload = json.load(file)
    cards = payload.get("cards", [])
    if not isinstance(cards, list):
        raise ValueError("Input JSON must contain a 'cards' list.")
    return [card for card in cards if isinstance(card, dict)]


def map_to_db_rows(cards: list[dict[str, str]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for card in cards:
        card_name = str(card.get("card_name", "Unknown Card")).strip() or "Unknown Card"
        reward_rate = str(card.get("reward_rate", "N/A")).strip() or "N/A"
        annual_fee_raw = str(card.get("annual_fee", "0")).strip()
        lounge_access = str(card.get("lounge_access", "N/A")).strip() or "N/A"
        best_for = str(card.get("best_for", "N/A")).strip() or "N/A"

        rows.append(
            {
                "card_name": card_name,
                "bank": infer_bank(card_name),
                "network": infer_network(card_name, reward_rate),
                "joining_fee": 0,
                "annual_fee": parse_fee(annual_fee_raw),
                "reward_type": infer_reward_type(reward_rate),
                "reward_rate": reward_rate,
                "lounge_access": lounge_access,
                "best_for": best_for,
                "key_benefits": reward_rate,
            }
        )
    return rows


def insert_rows(supabase_url: str, supabase_key: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/credit_cards"
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(rows).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Prefer": "return=representation",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else []


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import extracted credit card JSON into Supabase credit_cards table."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to JSON file with shape: {\"cards\": [...]}",
    )
    args = parser.parse_args()

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )

    if not supabase_url:
        print("Error: NEXT_PUBLIC_SUPABASE_URL is not set.", file=sys.stderr)
        return 1
    if not supabase_key:
        print(
            "Error: set SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
            file=sys.stderr,
        )
        return 1

    try:
        cards = read_cards(args.input)
        rows = map_to_db_rows(cards)
        if not rows:
            print("No cards to insert.")
            return 0

        inserted = insert_rows(supabase_url, supabase_key, rows)
        print(json.dumps({"inserted_count": len(inserted), "rows": inserted}, indent=2))
        return 0
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        print(f"Supabase HTTP error {exc.code}: {error_body}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Import error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
