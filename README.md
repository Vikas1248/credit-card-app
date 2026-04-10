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
