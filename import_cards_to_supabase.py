import argparse
import json
import math
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


def infer_bank(card_name: str) -> str:
    name = card_name.lower()
    if "american express" in name or "amex" in name:
        return "American Express"
    if "axis bank" in name or "axis" in name:
        return "Axis Bank"
    return "Unknown"


def infer_network(card_name: str, reward_rate: str) -> str:
    text = f"{card_name} {reward_rate}".lower()
    if "mastercard" in text:
        return "Mastercard"
    if "american express" in card_name.lower() or "amex" in card_name.lower():
        return "Amex"
    return "Visa"


def infer_reward_type(reward_rate: str) -> str:
    text = reward_rate.lower()
    if "%" in text or "cashback" in text:
        return "cashback"
    return "points"


def parse_fee(value: str | int | float | None) -> int:
    if value is None:
        return 0
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return int(value)
    if not str(value).strip() or str(value).strip().lower() == "n/a":
        return 0
    digits = re.findall(r"\d+", str(value).replace(",", ""))
    if not digits:
        return 0
    return int(digits[0])


def opt_float(card: dict[str, Any], key: str) -> float | None:
    v = card.get(key)
    if v is None:
        return None
    try:
        f = float(v)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def read_cards(path: str) -> list[dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as file:
        payload = json.load(file)
    cards = payload.get("cards", [])
    if not isinstance(cards, list):
        raise ValueError("Input JSON must contain a 'cards' list.")
    return [card for card in cards if isinstance(card, dict)]


def map_to_db_rows(cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for card in cards:
        card_name = str(card.get("card_name", "Unknown Card")).strip() or "Unknown Card"
        reward_rate = str(card.get("reward_rate", "N/A")).strip() or "N/A"
        annual_fee_raw = card.get("annual_fee", "0")
        lounge_access = str(card.get("lounge_access", "N/A")).strip() or "N/A"
        best_for = str(card.get("best_for", "N/A")).strip() or "N/A"
        key_benefits_raw = card.get("key_benefits")
        key_benefits = (
            str(key_benefits_raw).strip()
            if key_benefits_raw is not None
            else reward_rate
        )

        bank = str(card.get("bank", "")).strip() or infer_bank(card_name)
        network_raw = str(card.get("network", "")).strip()
        if network_raw in ("Visa", "Mastercard", "Amex"):
            network = network_raw
        else:
            network = infer_network(card_name, reward_rate)

        rt = str(card.get("reward_type", "")).strip().lower()
        if rt in ("cashback", "points"):
            reward_type = rt
        else:
            reward_type = infer_reward_type(reward_rate)

        jf = card.get("joining_fee")
        if isinstance(jf, (int, float)) and not isinstance(jf, bool):
            joining_fee = int(jf)
        else:
            joining_fee = parse_fee(jf) if jf is not None else 0

        annual_fee = (
            parse_fee(annual_fee_raw)
            if not isinstance(annual_fee_raw, (int, float))
            else int(annual_fee_raw)
        )

        row: dict[str, Any] = {
            "card_name": card_name,
            "bank": bank,
            "network": network,
            "joining_fee": joining_fee,
            "annual_fee": annual_fee,
            "reward_type": reward_type,
            "reward_rate": reward_rate,
            "lounge_access": lounge_access,
            "best_for": best_for,
            "key_benefits": key_benefits,
        }
        for col in ("dining_reward", "travel_reward", "shopping_reward", "fuel_reward"):
            fv = opt_float(card, col)
            if fv is not None:
                row[col] = fv
        rows.append(row)
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


def delete_axis_bank_rows(supabase_url: str, supabase_key: str) -> None:
    """Remove rows whose bank name contains 'axis' (case-insensitive)."""
    base = supabase_url.rstrip("/")
    pattern = urllib.parse.quote("%axis%", safe="")
    endpoint = f"{base}/rest/v1/credit_cards?bank=ilike.{pattern}"
    request = urllib.request.Request(
        endpoint,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        },
        method="DELETE",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        response.read()


def delete_non_amex_rows(supabase_url: str, supabase_key: str) -> None:
    """Remove rows where network is not Amex (PostgREST neq). Service role recommended."""
    base = supabase_url.rstrip("/")
    endpoint = f"{base}/rest/v1/credit_cards?network=neq.Amex"
    request = urllib.request.Request(
        endpoint,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        },
        method="DELETE",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        response.read()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import extracted credit card JSON into Supabase credit_cards table."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to JSON file with shape: {\"cards\": [...]}",
    )
    parser.add_argument(
        "--purge-non-amex",
        action="store_true",
        help="Before insert, DELETE rows where network is not Amex (or is null). Needs service role.",
    )
    parser.add_argument(
        "--purge-axis",
        action="store_true",
        help="Before insert, DELETE rows where bank ILIKE '%%axis%%'. Needs service role.",
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
        if args.purge_non_amex:
            delete_non_amex_rows(supabase_url, supabase_key)
            print("Purged rows with network != Amex.", file=sys.stderr)
        if args.purge_axis:
            delete_axis_bank_rows(supabase_url, supabase_key)
            print("Purged rows with bank matching axis.", file=sys.stderr)

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
        if "credit_cards_network_check" in error_body or "23514" in error_body:
            print(
                "Hint: allow Amex in DB — run sql/extend_network_amex.sql in the Supabase SQL editor, then retry.",
                file=sys.stderr,
            )
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Import error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
