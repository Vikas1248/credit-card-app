"""
Import credit card JSON from GCS into Supabase `credit_cards`.

Uses the same bucket/prefix resolution as upload_cards_to_gcs.py (GCS_CARDS_BUCKET or GCS_BUCKET,
GCS_PREFIX defaulting to data/). Each *.json object under the prefix is loaded and inserted.

Requires: google-cloud-storage, Application Default Credentials, and Supabase service role.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from google.cloud import storage

import import_cards_to_supabase as ics
from pipeline_env import load_env_file
from upload_cards_to_gcs import resolve_bucket, resolve_prefix

REPO_ROOT = Path(__file__).resolve().parent


def list_json_blobs(bucket_name: str, prefix: str) -> list[storage.Blob]:
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    prefix_norm = prefix.rstrip("/") + "/" if prefix else ""
    out: list[storage.Blob] = []
    for blob in bucket.list_blobs(prefix=prefix_norm):
        if blob.name.endswith("/"):
            continue
        if not blob.name.lower().endswith(".json"):
            continue
        out.append(blob)
    return sorted(out, key=lambda b: b.name)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import {\"cards\": [...]} JSON files from GCS into Supabase credit_cards."
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
    parser.add_argument(
        "--env-file",
        type=Path,
        default=None,
        help=f"Optional dotenv file (default: {REPO_ROOT / '.env.local'} if it exists).",
    )
    parser.add_argument(
        "--no-env-file",
        action="store_true",
        help="Do not load .env.local automatically.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List JSON objects only; do not write to Supabase.",
    )
    parser.add_argument(
        "--purge-non-amex",
        action="store_true",
        help="Before any insert, DELETE rows where network is not Amex.",
    )
    parser.add_argument(
        "--purge-axis",
        action="store_true",
        help="Before any insert, DELETE rows where bank ILIKE '%%axis%%'.",
    )
    parser.add_argument(
        "--purge-amex",
        action="store_true",
        help="Before any insert, DELETE rows where bank = 'American Express'.",
    )
    parser.add_argument(
        "--purge-hdfc",
        action="store_true",
        help="Before any insert, DELETE rows where bank ILIKE '%%hdfc%%'.",
    )
    parser.add_argument(
        "--purge-sbi",
        action="store_true",
        help="Before any insert, DELETE rows where bank ILIKE '%%sbi%%'.",
    )
    parser.add_argument(
        "--replace-matching",
        action="store_true",
        help="For each GCS file: DELETE rows with exact card_name match, then insert that file.",
    )
    args = parser.parse_args()

    if not args.no_env_file:
        ef = args.env_file if args.env_file is not None else (REPO_ROOT / ".env.local")
        load_env_file(ef)

    bucket_name = resolve_bucket(args.bucket)
    if not bucket_name:
        print("Error: set --bucket, GCS_CARDS_BUCKET, or GCS_BUCKET.", file=sys.stderr)
        return 1

    prefix = resolve_prefix(args.prefix)
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
    if not supabase_url:
        print(
            "Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is not set.",
            file=sys.stderr,
        )
        return 1
    if not supabase_key:
        print(
            "Error: set SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
            file=sys.stderr,
        )
        return 1

    blobs = list_json_blobs(bucket_name, prefix)
    if not blobs:
        print(
            f"No .json objects under gs://{bucket_name}/{prefix.rstrip('/')}/",
            file=sys.stderr,
        )
        return 1

    print(f"Found {len(blobs)} JSON object(s) under gs://{bucket_name}/{prefix}", file=sys.stderr)
    for b in blobs:
        print(f"  {b.name}", file=sys.stderr)

    if args.dry_run:
        print("Dry run: no Supabase changes.", file=sys.stderr)
        return 0

    try:
        if args.purge_non_amex:
            ics.delete_non_amex_rows(supabase_url, supabase_key)
            print("Purged rows with network != Amex.", file=sys.stderr)
        if args.purge_axis:
            ics.delete_axis_bank_rows(supabase_url, supabase_key)
            print("Purged rows with bank matching axis.", file=sys.stderr)
        if args.purge_amex:
            ics.delete_amex_bank_rows(supabase_url, supabase_key)
            print("Purged rows with bank = American Express.", file=sys.stderr)
        if args.purge_hdfc:
            ics.delete_hdfc_bank_rows(supabase_url, supabase_key)
            print("Purged rows with bank matching hdfc.", file=sys.stderr)
        if args.purge_sbi:
            ics.delete_sbi_bank_rows(supabase_url, supabase_key)
            print("Purged rows with bank matching sbi.", file=sys.stderr)

        total_inserted = 0
        for blob in blobs:
            text = blob.download_as_text(encoding="utf-8")
            cards = ics.parse_cards_document(json.loads(text))
            rows = ics.map_to_db_rows(cards)
            if args.replace_matching and rows:
                names = sorted({r["card_name"] for r in rows})
                ics.delete_rows_by_exact_card_names(supabase_url, supabase_key, names)
                print(
                    f"Replaced (by card_name) from {blob.name}: {', '.join(names)}",
                    file=sys.stderr,
                )
            if not rows:
                print(f"Skip empty cards list: {blob.name}", file=sys.stderr)
                continue
            inserted = ics.insert_rows(supabase_url, supabase_key, rows)
            total_inserted += len(inserted)
            print(
                f"Inserted {len(inserted)} row(s) from {blob.name}",
                file=sys.stderr,
            )

        print(json.dumps({"inserted_total": total_inserted, "files": len(blobs)}, indent=2))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"Import error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
