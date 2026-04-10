# Cardwise

Next.js app to compare credit cards, match spend to rewards, and browse products. Data is loaded from Supabase (`credit_cards`).

**Maintainer:** [@Vikas1248](https://github.com/Vikas1248) · [Repository](https://github.com/Vikas1248/credit-card-app)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure Supabase and optional OpenAI keys in `.env.local` (see Next.js env conventions; do not commit secrets).

## Card data

Canonical bundled dataset for imports: `data/credit_cards_amex_refined.json`. Use `import_cards_to_supabase.py` and `upload_cards_to_gcs.py` with your environment variables when syncing to Supabase or GCS.

### Why do I see more cards than in my JSON?

The app reads **whatever is in Supabase** (`credit_cards`). `import_cards_to_supabase.py` **inserts** rows; it does not delete older imports. If you previously loaded other banks, those rows stay until you remove them.

**Option A — clean the database (recommended)**  
In the Supabase SQL editor, run `sql/delete_non_amex_cards.sql` (deletes every row whose `network` is not `Amex`, including `NULL`).

**Option B — purge during the next import**  
With the service role key set:

```bash
.venv/bin/python import_cards_to_supabase.py --purge-non-amex --input data/credit_cards_amex_refined.json
```

**Option C — hide non-Amex in the UI only**  
Add to `.env.local` (and Vercel env for production):

```bash
NEXT_PUBLIC_CARD_NETWORK=Amex
```

This restricts list and recommend APIs to Amex; old rows remain in the DB until you delete them.

If you imported the same Amex file twice, you can get duplicate rows—delete duplicates in Supabase or truncate and import once.
