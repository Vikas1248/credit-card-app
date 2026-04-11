"""
Replace local data/*.json with JSON objects from GCS (same bucket/prefix as upload_cards_to_gcs.py).

Uses Application Default Credentials. Downloads to a temp dir first, then swaps files so a
failed run leaves existing data/ unchanged.
"""

from __future__ import annotations

import argparse
import logging
import shutil
import tempfile
from pathlib import Path

from google.cloud import storage

from upload_cards_to_gcs import DEFAULT_DATA_DIR, resolve_bucket, resolve_prefix, setup_logger


def list_json_blobs(bucket_name: str, prefix: str) -> list[storage.Blob]:
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    prefix_norm = prefix.rstrip("/") + "/" if prefix else ""
    blobs: list[storage.Blob] = []
    for blob in bucket.list_blobs(prefix=prefix_norm):
        name = blob.name
        if name.endswith("/"):
            continue
        if not name.lower().endswith(".json"):
            continue
        blobs.append(blob)
    return sorted(blobs, key=lambda b: b.name)


def download_replace_data_dir(
    bucket_name: str,
    prefix: str,
    dest_dir: Path,
    dry_run: bool,
) -> int:
    blobs = list_json_blobs(bucket_name, prefix)
    if not blobs:
        logging.error(
            "No .json objects under gs://%s/%s — check bucket and GCS_PREFIX.",
            bucket_name,
            prefix.rstrip("/") + "/",
        )
        return 1

    logging.info(
        "Found %d object(s) under gs://%s/%s",
        len(blobs),
        bucket_name,
        prefix.rstrip("/") + "/",
    )
    for b in blobs:
        logging.info("  %s", b.name)

    if dry_run:
        logging.info("Dry run: no files deleted or downloaded.")
        return 0

    dest_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(dir=dest_dir.parent) as raw_tmp:
        tmp_path = Path(raw_tmp)
        for blob in blobs:
            base = Path(blob.name).name
            if not base or base == ".json":
                logging.warning("Skip object with unusable name: %s", blob.name)
                continue
            out = tmp_path / base
            blob.download_to_filename(str(out))
            logging.info("Downloaded %s -> %s", blob.name, out.name)

        json_in_data = list(dest_dir.glob("*.json"))
        for p in json_in_data:
            p.unlink()
            logging.info("Removed local %s", p.name)

        for p in sorted(tmp_path.glob("*.json")):
            shutil.move(str(p), dest_dir / p.name)
            logging.info("Installed %s", p.name)

    logging.info("Done. Local %s now matches GCS for this prefix.", dest_dir)
    return 0


def main() -> int:
    setup_logger()
    parser = argparse.ArgumentParser(
        description=(
            "Delete local data/*.json and replace with JSON files from GCS "
            "(default: same bucket/prefix as upload_cards_to_gcs.py)."
        )
    )
    parser.add_argument(
        "--bucket",
        default=None,
        help="GCS bucket (default: GCS_CARDS_BUCKET or GCS_BUCKET).",
    )
    parser.add_argument(
        "--prefix",
        default=None,
        help="Object prefix (default: GCS_PREFIX env, else data/).",
    )
    parser.add_argument(
        "--dest",
        default=None,
        help=f"Local folder (default: {DEFAULT_DATA_DIR}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List matching objects only; do not change local files.",
    )
    args = parser.parse_args()

    bucket = resolve_bucket(args.bucket)
    if not bucket:
        logging.error("Set --bucket, GCS_CARDS_BUCKET, or GCS_BUCKET.")
        return 1

    prefix = resolve_prefix(args.prefix)
    dest = Path(args.dest) if args.dest else DEFAULT_DATA_DIR

    try:
        return download_replace_data_dir(bucket, prefix, dest, args.dry_run)
    except Exception as exc:  # noqa: BLE001
        logging.exception("Download failed: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
