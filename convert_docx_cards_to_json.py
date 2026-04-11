"""
Extract card JSON embedded in Word (.docx) files, write data/credit_cards_<bank>_from_docx.json,
and optionally upload those files to GCS (same bucket/prefix as upload_cards_to_gcs.py).

Doc format: one or more JSON objects in the document (often one line per paragraph). Only objects
with a "card_name" field are treated as cards (avoids picking up nested snippets).

Dependencies: pip install -r requirements-data.txt
Auth for upload: Application Default Credentials (gcloud auth application-default login).
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from json import JSONDecoder
from pathlib import Path
from typing import Any

from docx import Document

from upload_cards_to_gcs import resolve_bucket, resolve_prefix, upload_single_json

REPO_ROOT = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = REPO_ROOT / "data"


def setup_logger() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def bank_slug_from_path(path: Path) -> str:
    n = path.name.lower()
    if "amex" in n:
        return "amex"
    if "axis" in n:
        return "axis"
    if "sbi" in n:
        return "sbi"
    stem = path.stem.lower().replace(" ", "_")
    return stem[:48] if stem else "cards"


def extract_card_objects_from_docx(path: Path) -> list[dict[str, Any]]:
    doc = Document(str(path))
    text = "\n".join(p.text for p in doc.paragraphs)
    decoder = JSONDecoder()
    pos = 0
    cards: list[dict[str, Any]] = []
    while pos < len(text):
        i = text.find("{", pos)
        if i < 0:
            break
        try:
            obj, end = decoder.raw_decode(text, i)
            if isinstance(obj, dict) and obj.get("card_name"):
                cards.append(obj)
            # `end` is the index in `text` after the parsed value (not an offset from `i`).
            pos = end
        except json.JSONDecodeError:
            pos = i + 1
    return cards


def normalize_card_record(card: dict[str, Any]) -> dict[str, Any]:
    out = dict(card)
    rr = out.get("reward_rate")
    if rr is None or (isinstance(rr, str) and not rr.strip()):
        rc = out.get("reward_conversion")
        if isinstance(rc, dict):
            desc = rc.get("description")
            if isinstance(desc, str) and desc.strip():
                out["reward_rate"] = desc.strip()
        if not out.get("reward_rate"):
            out["reward_rate"] = "N/A"
    return out


def build_payload(
    cards: list[dict[str, Any]], *, source: str, version: int = 1
) -> dict[str, Any]:
    return {
        "version": version,
        "source": source,
        "cards": [normalize_card_record(c) for c in cards],
    }


def convert_one_docx(
    docx_path: Path,
    out_dir: Path,
    *,
    upload: bool,
    bucket: str,
    prefix: str,
) -> Path | None:
    cards = extract_card_objects_from_docx(docx_path)
    if not cards:
        logging.warning("No card objects found in %s", docx_path.name)
        return None

    slug = bank_slug_from_path(docx_path)
    out_name = f"credit_cards_{slug}_from_docx.json"
    out_path = out_dir / out_name
    payload = build_payload(
        cards,
        source=f"Converted from {docx_path.name}",
    )
    out_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    logging.info("Wrote %s (%d cards)", out_path.relative_to(REPO_ROOT), len(cards))

    if upload:
        upload_single_json(out_path, bucket, prefix)
    return out_path


def main() -> int:
    setup_logger()
    parser = argparse.ArgumentParser(
        description="Convert card .docx files to JSON and optionally upload to GCS."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help=f"Folder containing .docx files (default: {DEFAULT_DATA_DIR}).",
    )
    parser.add_argument(
        "--no-upload",
        action="store_true",
        help="Only write JSON files; do not upload to GCS.",
    )
    parser.add_argument(
        "--bucket",
        default=None,
        help="GCS bucket (default: GCS_CARDS_BUCKET or GCS_BUCKET).",
    )
    parser.add_argument(
        "--prefix",
        default=None,
        help="GCS object prefix (default: GCS_PREFIX env, else data/).",
    )
    args = parser.parse_args()

    data_dir = args.data_dir.resolve()
    if not data_dir.is_dir():
        logging.error("Not a directory: %s", data_dir)
        return 1

    docx_files = sorted(data_dir.glob("*.docx"))
    if not docx_files:
        logging.error("No .docx files in %s", data_dir)
        return 1

    bucket = ""
    prefix = "data/"
    if not args.no_upload:
        bucket = resolve_bucket(args.bucket)
        if not bucket:
            logging.error("Set --bucket, GCS_CARDS_BUCKET, or GCS_BUCKET for upload.")
            return 1
        prefix = resolve_prefix(args.prefix)

    written = 0
    for docx_path in docx_files:
        out = convert_one_docx(
            docx_path,
            data_dir,
            upload=not args.no_upload,
            bucket=bucket,
            prefix=prefix,
        )
        if out is not None:
            written += 1

    if written == 0:
        return 1
    logging.info("Done. %d JSON file(s) written.", written)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
