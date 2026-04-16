# CredGenie

**CredGenie** helps users discover the best Indian credit cards for their spend pattern.

It supports:

- **Personalized recommendations** (spend + preferences + optional AI summary)
- **Browse + search** across the full catalog
- **Category pages** (dining / travel / shopping / fuel)
- **Compare two cards** side-by-side (with optional AI narrative)
- **Apply / affiliate CTAs** (bank-specific routing where available)

Card data is read from Supabase table: **`credit_cards`**.

**Maintainer:** [@Vikas1248](https://github.com/Vikas1248) · **Repo:** `https://github.com/Vikas1248/credit-card-app`

## Quickstart (local)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Use `.env.local` for local development. Never commit secrets.

### Required (Supabase)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Recommended (server-side Supabase access)

- `SUPABASE_SERVICE_ROLE_KEY`  
  Used by API routes to query Supabase server-side. Keep secret.

### Optional

- `NEXT_PUBLIC_SITE_URL`  
  Used for sitemap/robots/OG metadata base.
- `NEXT_PUBLIC_CARD_NETWORK`  
  Catalog filter: `Visa` | `Mastercard` | `Amex` | unset | `all` | `*`.
- **AI features**
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (defaults to `gpt-4o-mini`)
  - `DISABLE_EXTERNAL_API_CALLS=1` to force-disable any third-party HTTP calls (OpenAI).
- **Cuelinks**
  - `NEXT_PUBLIC_CUELINKS_CHANNEL_ID`
  - `NEXT_PUBLIC_CUELINKS_WIDGET_KEY`
  - `NEXT_PUBLIC_CUELINKS_DISABLE_V2`
  - `NEXT_PUBLIC_CUELINKS_PUB_ID`
- **Data pipeline (optional)**
  - `GCS_BUCKET`
  - `GCS_PREFIX`

See `.env.example` for notes.

## How recommendations work

CredGenie ranks cards in two phases:

- **Math ranking (default):** estimates yearly rewards from your monthly spend split across dining / travel / shopping / fuel.
- **Preference matching:** adjusts ranking using selected preferences (fee comfort, top categories, lifestyle needs) and excludes cards the user already has.

When OpenAI is configured, CredGenie additionally adds:

- **One-line AI summary** of why the shortlist fits
- **Per-card “Why this fits”** short explanation

AI output is constrained to the candidate pool produced by the spend model (no invented cards).

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build (includes TypeScript step)
npm run start    # start built app
npm run lint     # eslint
```

## Card data & imports

Bundled datasets used by import scripts:

- `data/credit_cards_amex_refined.json`
- `data/credit_cards_axis_refined.json`
- `data/credit_cards_sbi_refined.json`

The app reads **whatever is currently in Supabase** (`credit_cards`).
If you import multiple times without purging, you may see extra or duplicate rows.

### Common issue: “Why do I see more cards than in my JSON?”

`import_cards_to_supabase.py` inserts rows; it doesn’t delete older imports.

Options:

- **Clean the DB (recommended):** run a delete script in Supabase SQL editor (for example `sql/delete_non_amex_cards.sql`).
- **Purge on import:** use the service role key and pass the purge flags supported by the import script.
- **Catalog filter:** set `NEXT_PUBLIC_CARD_NETWORK` to restrict what the UI shows.
