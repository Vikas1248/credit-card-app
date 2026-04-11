# CredGenie

**CredGenie** is a Next.js app for Indian credit card discovery: filter and sort by fees and network, browse by spend category, match monthly spend to estimated rewards, compare two cards, and use optional AI rankings and copy when OpenAI is configured. Card data is loaded from Supabase (`credit_cards`).

**Maintainer:** [@Vikas1248](https://github.com/Vikas1248) · [Repository](https://github.com/Vikas1248/credit-card-app)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure Supabase and optional OpenAI keys in `.env.local` (see Next.js env conventions; do not commit secrets).

## Card data

Bundled datasets for imports:

- `data/credit_cards_amex_refined.json`
- `data/credit_cards_axis_refined.json`
- `data/credit_cards_sbi_refined.json` (replace with your own “SBI Credit Card data” export if needed)

Use `import_cards_to_supabase.py` with optional `--purge-axis`, `--purge-sbi`, or `sql/delete_sbi_bank_cards.sql`, plus `upload_cards_to_gcs.py` when syncing to Supabase or GCS.

### Why do I see more cards than in my JSON?

The app reads **whatever is in Supabase** (`credit_cards`). `import_cards_to_supabase.py` **inserts** rows; it does not delete older imports. If you previously loaded other banks, those rows stay until you remove them.

**Option A — clean the database (recommended)**  
In the Supabase SQL editor, run `sql/delete_non_amex_cards.sql` (deletes every row whose `network` is not `Amex`, including `NULL`).

**Option B — purge during the next import**  
With the service role key set:

```bash
.venv/bin/python import_cards_to_supabase.py --purge-non-amex --input data/credit_cards_amex_refined.json
```

**Option C — catalog filter**  
By default **no network filter** is applied (Amex, Axis Visa/Mastercard, etc. all show). Set `NEXT_PUBLIC_CARD_NETWORK` to `Visa`, `Mastercard`, or `Amex` to restrict the catalog, or `all` / `*` explicitly. The home page passes that value as `?network=` when set.

If you imported the same Amex file twice, you can get duplicate rows—delete duplicates in Supabase or truncate and import once.
