import argparse
import logging
import os
from pathlib import Path
from typing import Optional

from google.cloud import storage

REPO_ROOT = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = REPO_ROOT / "data"


def setup_logger() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def upload_json_files(cards_dir: Path, bucket_name: str, prefix: str = "data/") -> int:
    if not cards_dir.exists() or not cards_dir.is_dir():
        raise FileNotFoundError(f"Cards folder not found: {cards_dir}")

    json_files = sorted(cards_dir.glob("*.json"))
    if not json_files:
        logging.warning("No JSON files found in %s", cards_dir)
        return 0

    client = storage.Client()  # Uses Application Default Credentials
    bucket = client.bucket(bucket_name)

    uploaded_count = 0
    for file_path in json_files:
        object_name = f"{prefix.rstrip('/')}/{file_path.name}"
        blob = bucket.blob(object_name)
        blob.upload_from_filename(str(file_path), content_type="application/json")
        logging.info("Uploaded %s -> gs://%s/%s", file_path.name, bucket_name, object_name)
        uploaded_count += 1

    return uploaded_count


def upload_single_json(file_path: Path, bucket_name: str, prefix: str = "data/") -> None:
    if not file_path.is_file():
        raise FileNotFoundError(f"JSON file not found: {file_path}")

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    object_name = f"{prefix.rstrip('/')}/{file_path.name}"
    blob = bucket.blob(object_name)
    blob.upload_from_filename(str(file_path), content_type="application/json")
    logging.info("Uploaded %s -> gs://%s/%s", file_path.name, bucket_name, object_name)


def resolve_bucket(cli_bucket: Optional[str]) -> str:
    return (
        (cli_bucket or "").strip()
        or os.environ.get("GCS_CARDS_BUCKET", "").strip()
        or os.environ.get("GCS_BUCKET", "").strip()
    )


def resolve_prefix(cli_prefix: Optional[str]) -> str:
    if cli_prefix is not None and cli_prefix.strip():
        return cli_prefix.strip().rstrip("/") + "/"
    env = os.environ.get("GCS_PREFIX", "").strip()
    if env:
        return env.rstrip("/") + "/"
    return "data/"


def main() -> int:
    setup_logger()

    parser = argparse.ArgumentParser(
        description=(
            "Upload card JSON files to GCS. By default uploads every *.json in the repo data/ "
            "folder to gs://<bucket>/<prefix>/ (prefix defaults to data/ to mirror data/)."
        )
    )
    parser.add_argument(
        "--bucket",
        default=None,
        help="Target GCS bucket (default: GCS_CARDS_BUCKET or GCS_BUCKET).",
    )
    parser.add_argument(
        "--cards-dir",
        default=None,
        help=f"Local folder of *.json files (default: {DEFAULT_DATA_DIR}).",
    )
    parser.add_argument(
        "--file",
        default=None,
        help="Single JSON file to upload (e.g. data/credit_cards_amex_refined.json).",
    )
    parser.add_argument(
        "--prefix",
        default=None,
        help="GCS object prefix (default: GCS_PREFIX env, else data/).",
    )
    args = parser.parse_args()
    bucket = resolve_bucket(args.bucket)
    if not bucket:
        logging.error("Set --bucket, GCS_CARDS_BUCKET, or GCS_BUCKET.")
        return 1

    prefix = resolve_prefix(args.prefix)

    try:
        if args.file:
            upload_single_json(Path(args.file), bucket, prefix)
            logging.info("Done. Uploaded 1 file.")
            return 0
        cards_dir = Path(args.cards_dir) if args.cards_dir else DEFAULT_DATA_DIR
        count = upload_json_files(cards_dir, bucket, prefix)
        logging.info("Done. Uploaded %d file(s).", count)
        return 0
    except Exception as exc:  # noqa: BLE001
        logging.exception("Upload failed: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
