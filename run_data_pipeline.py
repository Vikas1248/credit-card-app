#!/usr/bin/env python3
"""
End-to-end data path: local → GCS → Supabase → Vercel (reads same Supabase).

  0. (Optional) convert_docx_cards_to_json.py — Word files in data/*.docx → data/credit_cards_*_from_docx.json
  1. upload_cards_to_gcs.py — every data/*.json → gs://<bucket>/<GCS_PREFIX>/
  2. import_cards_from_gcs.py — each *.json at that prefix → Supabase public.credit_cards
  3. Vercel — no data upload. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
     SUPABASE_SERVICE_ROLE_KEY to the same Supabase project; redeploy after env changes.
     The site calls /api/cards, which reads Supabase only.

Downstream in the Next.js app
  - /api/cards, /api/cards/recommend, /api/recommend/openai (optional OpenAI).

Env: GCS_CARDS_BUCKET or GCS_BUCKET, GCS_PREFIX (optional), NEXT_PUBLIC_SUPABASE_URL or
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Docx step also needs: pip install -r requirements-data.txt

Requires: pip install google-cloud-storage, gcloud auth application-default login (or service account).
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from pipeline_env import load_env_file

REPO_ROOT = Path(__file__).resolve().parent


def run_step(argv: list[str]) -> int:
    print("+", " ".join(argv), flush=True)
    return subprocess.call(argv, cwd=str(REPO_ROOT))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run data/ → GCS → Supabase pipeline (then use the app + AI on top of DB)."
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=REPO_ROOT / ".env.local",
        help="Dotenv file to load if present (values do not override existing env).",
    )
    parser.add_argument(
        "--no-env-file",
        action="store_true",
        help="Skip loading .env.local.",
    )
    parser.add_argument(
        "--convert-docx",
        action="store_true",
        help="First refresh JSON from data/*.docx (writes credit_cards_*_from_docx.json, no GCS yet).",
    )
    parser.add_argument(
        "--skip-upload",
        action="store_true",
        help="Skip step 1 (GCS already has the JSON you want).",
    )
    parser.add_argument(
        "--skip-import",
        action="store_true",
        help="Skip step 2 (only upload to GCS).",
    )
    parser.add_argument(
        "--dry-run-import",
        action="store_true",
        help="Pass --dry-run to import (list GCS JSON only, no DB writes).",
    )
    parser.add_argument(
        "--purge-non-amex",
        action="store_true",
        help="Forward to import: delete non-Amex rows before inserts.",
    )
    parser.add_argument(
        "--purge-axis",
        action="store_true",
        help="Forward to import: delete Axis bank rows before inserts.",
    )
    parser.add_argument(
        "--purge-sbi",
        action="store_true",
        help="Forward to import: delete SBI bank rows before inserts.",
    )
    parser.add_argument(
        "--replace-matching",
        action="store_true",
        help="Forward to import: per-file replace by exact card_name.",
    )
    args = parser.parse_args()

    if not args.no_env_file:
        load_env_file(args.env_file)

    py = sys.executable

    if args.convert_docx:
        code = run_step(
            [py, str(REPO_ROOT / "convert_docx_cards_to_json.py"), "--no-upload"]
        )
        if code != 0:
            return code

    if not args.skip_upload:
        code = run_step([py, str(REPO_ROOT / "upload_cards_to_gcs.py")])
        if code != 0:
            return code

    if not args.skip_import:
        cmd = [py, str(REPO_ROOT / "import_cards_from_gcs.py"), "--no-env-file"]
        if args.dry_run_import:
            cmd.append("--dry-run")
        if args.purge_non_amex:
            cmd.append("--purge-non-amex")
        if args.purge_axis:
            cmd.append("--purge-axis")
        if args.purge_sbi:
            cmd.append("--purge-sbi")
        if args.replace_matching:
            cmd.append("--replace-matching")
        code = run_step(cmd)
        if code != 0:
            return code

    print(
        "Pipeline finished. Local JSON is in GCS and Supabase. "
        "Vercel: same Supabase env vars as this project, then redeploy — no files pushed to Vercel for card data.",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
