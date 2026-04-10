import argparse
import logging
import os
from pathlib import Path

from google.cloud import storage


def setup_logger() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def upload_json_files(cards_dir: Path, bucket_name: str, prefix: str = "raw/") -> int:
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


def upload_single_json(file_path: Path, bucket_name: str, prefix: str = "refined/") -> None:
    if not file_path.is_file():
        raise FileNotFoundError(f"JSON file not found: {file_path}")

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    object_name = f"{prefix.rstrip('/')}/{file_path.name}"
    blob = bucket.blob(object_name)
    blob.upload_from_filename(str(file_path), content_type="application/json")
    logging.info("Uploaded %s -> gs://%s/%s", file_path.name, bucket_name, object_name)


def main() -> int:
    setup_logger()

    parser = argparse.ArgumentParser(
        description="Upload card JSON files from local 'cards' folder to GCS under raw/ prefix."
    )
    parser.add_argument(
        "--bucket",
        default=None,
        help="Target GCS bucket name (default: GCS_CARDS_BUCKET env).",
    )
    parser.add_argument(
        "--cards-dir",
        default=None,
        help="Local folder containing card JSON files (uploads all *.json).",
    )
    parser.add_argument(
        "--file",
        default=None,
        help="Single JSON file to upload (e.g. data/credit_cards_amex_refined.json).",
    )
    parser.add_argument(
        "--prefix",
        default="raw/",
        help="GCS object prefix/folder (default: raw/ for --cards-dir, refined/ for --file).",
    )
    args = parser.parse_args()
    bucket = args.bucket or os.environ.get("GCS_CARDS_BUCKET", "").strip()
    if not bucket:
        logging.error("Set --bucket or GCS_CARDS_BUCKET.")
        return 1

    try:
        if args.file:
            prefix = args.prefix if args.prefix != "raw/" else "refined/"
            upload_single_json(Path(args.file), bucket, prefix)
            logging.info("Done. Uploaded 1 file.")
            return 0
        if not args.cards_dir:
            logging.error("Provide --cards-dir or --file.")
            return 1
        cards_dir = Path(args.cards_dir)
        count = upload_json_files(cards_dir, bucket, args.prefix)
        logging.info("Done. Uploaded %d file(s).", count)
        return 0
    except Exception as exc:  # noqa: BLE001
        logging.exception("Upload failed: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
