import argparse
import logging
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


def main() -> int:
    setup_logger()

    parser = argparse.ArgumentParser(
        description="Upload card JSON files from local 'cards' folder to GCS under raw/ prefix."
    )
    parser.add_argument(
        "--bucket",
        required=True,
        help="Target Google Cloud Storage bucket name.",
    )
    parser.add_argument(
        "--cards-dir",
        default="cards",
        help="Local folder containing card JSON files (default: cards).",
    )
    parser.add_argument(
        "--prefix",
        default="raw/",
        help="GCS object prefix/folder (default: raw/).",
    )
    args = parser.parse_args()

    try:
        cards_dir = Path(args.cards_dir)
        count = upload_json_files(cards_dir, args.bucket, args.prefix)
        logging.info("Done. Uploaded %d file(s).", count)
        return 0
    except Exception as exc:  # noqa: BLE001
        logging.exception("Upload failed: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
