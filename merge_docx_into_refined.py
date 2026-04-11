"""
Merge data/credit_cards_*_from_docx.json (source of truth) into *_refined.json.

- Every docx-derived card is kept (normalized reward_rate, etc.).
- Refined-only cards (no fuzzy name match to any docx card) are appended so nothing is dropped.
- Match threshold: SequenceMatcher ratio >= 0.48 (tuned for "SBI Card SimplyCLICK" vs "SBI SimplyCLICK Credit Card").

Run from repo root:
  .venv/bin/python merge_docx_into_refined.py
"""

from __future__ import annotations

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
    for bank, refined_name, docx_name in BANK_FILES:
        refined_path = DATA / refined_name
        docx_path = DATA / docx_name
        if not docx_path.is_file():
            print(f"Skip {bank}: missing {docx_path.name}", file=sys.stderr)
            continue
        if not refined_path.is_file():
            print(f"Skip {bank}: missing {refined_path.name}", file=sys.stderr)
            continue
        out = merge_bank(refined_path, docx_path, bank_label=bank)
        refined_path.write_text(
            json.dumps(out, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"{refined_name}: {len(out['cards'])} cards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
