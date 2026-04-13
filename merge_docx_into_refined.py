"""
Write data/credit_cards_*_refined.json from issuer source JSON (usually *_from_docx.json).

Default: refined lists exactly the cards in the source file (after normalize_card_record).
HDFC uses credit_cards_hdfc.json → credit_cards_hdfc_refined.json.

Optional: --append-unmatched-refined merges in old refined-only rows that do not fuzzy-match
any source card (SequenceMatcher ratio >= 0.48).

Run from repo root:
  .venv/bin/python merge_docx_into_refined.py
  .venv/bin/python merge_docx_into_refined.py --append-unmatched-refined
"""

from __future__ import annotations

import argparse
import json
import sys
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from convert_docx_cards_to_json import normalize_card_record

REPO_ROOT = Path(__file__).resolve().parent
DATA = REPO_ROOT / "data"
MATCH_MIN = 0.48

BANK_FILES = (
    ("amex", "credit_cards_amex_refined.json", "credit_cards_amex_from_docx.json"),
    ("axis", "credit_cards_axis_refined.json", "credit_cards_axis_from_docx.json"),
    ("hdfc", "credit_cards_hdfc_refined.json", "credit_cards_hdfc.json"),
    ("sbi", "credit_cards_sbi_refined.json", "credit_cards_sbi_from_docx.json"),
)


def norm_match(s: str) -> str:
    t = s.lower().replace("®", "").replace("™", "")
    t = " ".join(t.split())
    return t


def best_refined_index(doc_name: str, refined_cards: list[dict[str, Any]]) -> tuple[int, float]:
    best_i, best_r = -1, 0.0
    dn = norm_match(doc_name)
    for i, rc in enumerate(refined_cards):
        rn = norm_match(str(rc.get("card_name", "")))
        r = SequenceMatcher(None, dn, rn).ratio()
        if r > best_r:
            best_r, best_i = r, i
    return best_i, best_r


def merge_bank_docx_only(docx_path: Path, *, bank_label: str) -> dict[str, Any]:
    docx = json.loads(docx_path.read_text(encoding="utf-8"))
    dcards: list[dict[str, Any]] = list(docx.get("cards") or [])
    merged = [normalize_card_record(dict(dc)) for dc in dcards]
    source = (
        f"Refined = from_docx only ({docx_path.name}); normalized ({bank_label})"
    )
    return {
        "version": docx.get("version", 1),
        "source": source,
        "cards": merged,
    }


def merge_bank(
    refined_path: Path,
    docx_path: Path,
    *,
    bank_label: str,
) -> dict[str, Any]:
    refined = json.loads(refined_path.read_text(encoding="utf-8"))
    docx = json.loads(docx_path.read_text(encoding="utf-8"))
    rcards: list[dict[str, Any]] = list(refined.get("cards") or [])
    dcards: list[dict[str, Any]] = list(docx.get("cards") or [])

    unmatched_refined: set[int] = set(range(len(rcards)))
    merged: list[dict[str, Any]] = []

    for dc in dcards:
        card = normalize_card_record(dict(dc))
        merged.append(card)
        ri, ratio = best_refined_index(str(card.get("card_name", "")), rcards)
        if ri >= 0 and ratio >= MATCH_MIN and ri in unmatched_refined:
            unmatched_refined.discard(ri)

    for ri in sorted(unmatched_refined):
        merged.append(normalize_card_record(dict(rcards[ri])))

    source = (
        f"Merged: docx source ({docx_path.name}) + refined-only rows from {refined_path.name} "
        f"({bank_label})"
    )
    return {
        "version": refined.get("version", 1),
        "source": source,
        "cards": merged,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Refresh *_refined.json from *_from_docx.json (default: docx cards only)."
    )
    parser.add_argument(
        "--append-unmatched-refined",
        action="store_true",
        help="Also keep refined-only cards that do not match any docx card (legacy merge).",
    )
    args = parser.parse_args()

    for bank, refined_name, docx_name in BANK_FILES:
        refined_path = DATA / refined_name
        docx_path = DATA / docx_name
        if not docx_path.is_file():
            print(f"Skip {bank}: missing {docx_path.name}", file=sys.stderr)
            continue
        if args.append_unmatched_refined:
            if not refined_path.is_file():
                print(f"Skip {bank}: missing {refined_path.name}", file=sys.stderr)
                continue
            out = merge_bank(refined_path, docx_path, bank_label=bank)
        else:
            out = merge_bank_docx_only(docx_path, bank_label=bank)
        refined_path.write_text(
            json.dumps(out, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"{refined_name}: {len(out['cards'])} cards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
