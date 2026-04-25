# CredGenie

**CredGenie** is a [Next.js](https://nextjs.org/) app that helps people in India **discover and compare credit cards**: search the catalog, browse by spend category, match cards to monthly spend, compare two products, and get **optional AI** explanations when OpenAI is configured.

Live site: **[credgenie.in](https://credgenie.in)** · Company: **[CredGenie on LinkedIn](https://www.linkedin.com/company/credgenie)**

**Maintainer:** [@Vikas1248](https://github.com/Vikas1248) · **Repo:** [github.com/Vikas1248/credit-card-app](https://github.com/Vikas1248/credit-card-app)

---

## Features

- **Personalized recommendations (wizard v2)** — Split-layout slider flow captures spend mix + monthly spend + fee preference, then ranks cards with **deterministic scoring** and optional short AI explanation text.
- **Conversational advisor chat** — “Find my card with AI” chat extracts structured preferences from free text, asks targeted follow-ups, and returns top picks using the **same deterministic scoring pipeline**.
- **Graceful no-LLM behavior** — If OpenAI is unavailable, recommendations still work. Chat intent falls back to keyword rules and card explanations fall back to rule-based copy.
- **Recommendations survive refresh** — Last submitted profile is stored in **`sessionStorage`**; reload restores the block. Client requests skip the short-lived server cache so picks can refresh after deploys or rule changes.
- **Browse + search** — Full catalog with filters; optional **AI ranking** for search/browse when configured.
- **Category pages** — Dining, travel, shopping, fuel with earn-based sort and optional **AI insight** and **AI order**.
- **Compare two cards** — Side-by-side fees and category earn; optional **AI comparison** narrative.
- **Card detail** — Per-card view with optional **AI insight**.
- **Featured carousel** — Optional **AI-picked** featured cards on the home page.
- **Apply / affiliate CTAs** — Bank-specific apply links (Axis, SBI, HDFC, Amex, IndusInd, etc.) where implemented.

Card data is read from Supabase table **`credit_cards`**. Estimates are illustrative only — always confirm fees and rewards with the issuer.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| Styling | **Tailwind CSS 4** |
| Data | **Supabase** (`@supabase/supabase-js`; server routes use service role where configured) |
| AI | **Langflow** for chat intent extraction, **OpenAI Chat Completions** for fallback/explanations — see [AI, Langflow & OpenAI](#ai-langflow--openai) |
| PWA | **`@ducanh2912/next-pwa`** (offline shell / precache where enabled) |
| Affiliates | **Cuelinks** (optional widget + link kit; see layout / env) |

---

## Quickstart (local)

```bash
npm install
cp .env.example .env.local
# Edit .env.local — at minimum Supabase URL + anon key
npm run dev
```

Open **http://localhost:3000**.

```bash
npm run build   # production build (includes TypeScript)
npm run start   # run production build locally
npm run lint    # ESLint
```

---

## Project layout (high level)

| Path | Role |
|------|------|
| `app/` | Routes: home, `/cards`, `/card/[id]`, `/category/[slug]`, `/about`, API routes under `app/api/` |
| `components/` | Client UI (browse, compare, recommendations, apply links, etc.) |
| `components/chat/` | Chat advisor UI (`CreditAdvisorChat`) |
| `lib/spendCategories.ts` | Category earn ranges, **primary category** slug for browse chips |
| `lib/cards/` | Issuer-specific earn derivation (SBI/Axis catalog, Amex, etc.) |
| `lib/recommendV2/` | Wizard v2 profile parsing, **scoring**, **AI explanation** |
| `lib/chatAdvisor/` | Chat advisor intent extraction, profile merge logic, deterministic recommendation adapter |
| `lib/recommend/` | Older spend-based recommend flow + OpenAI summaries |
| `lib/ai/openaiClient.ts` | Shared OpenAI JSON chat helper |
| `data/` | Refined JSON sources used by import / pipeline scripts |

---

## Environment variables

Use **`.env.local`** locally. Do **not** commit secrets.

### Required (hosted catalog)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Recommended (server-side)

- `SUPABASE_SERVICE_ROLE_KEY` — API routes query Supabase with elevated access; keep secret.

### Site & SEO

- `NEXT_PUBLIC_SITE_URL` — Canonical origin (sitemap, `robots.txt`, Open Graph `metadataBase`). Example: `https://credgenie.in`
- `NEXT_PUBLIC_LINKEDIN_URL` — Optional override for footer / About LinkedIn link (default is CredGenie company page in code).

### Catalog filter

- `NEXT_PUBLIC_CARD_NETWORK` — Restrict UI catalog: `Visa` | `Mastercard` | `Amex` | unset | `all` | `*`.

### AI (Langflow + OpenAI)

- `LANGFLOW_API_URL` — Primary conversational advisor intent endpoint. Example: `http://<VM_IP>:7860/api/v1/run/<FLOW_ID>`.
- `LANGFLOW_API_KEY` — Optional; sent as `x-api-key` when configured.
- `OPENAI_API_KEY` — Enables AI features listed below.
- `OPENAI_MODEL` — Optional; defaults to **`gpt-4o-mini`**.
- `DISABLE_EXTERNAL_API_CALLS=1` — Disables third-party HTTP calls (including Langflow and OpenAI). See `lib/config/externalAccess.ts`.

### Cuelinks (optional)

- `NEXT_PUBLIC_CUELINKS_CHANNEL_ID`, `NEXT_PUBLIC_CUELINKS_WIDGET_KEY`, `NEXT_PUBLIC_CUELINKS_DISABLE_V2`, `NEXT_PUBLIC_CUELINKS_PUB_ID`

### Data pipeline (local / CI)

- `GCS_BUCKET`, `GCS_PREFIX` — Used by Python sync scripts when mirroring to GCS / import flows.

Full notes: **`.env.example`**.

---

## AI, Langflow & OpenAI

CredGenie uses AI only for structured intent extraction and explanation copy. It does **not** let AI pick the winning cards.

- **Langflow** is the primary intent extractor for the conversational advisor (`lib/chatAdvisor/langflowClient.ts`). The app posts chat text to `LANGFLOW_API_URL` using Langflow's run API payload (`input_value`, `input_type: "chat"`, `output_type: "chat"`).
- **OpenAI** remains available for fallback intent extraction and explanation copy, via **`https://api.openai.com/v1/chat/completions`** and `lib/ai/openaiClient.ts` (`openAiJsonCompletion`, JSON response format). Default model: **`gpt-4o-mini`** (override with `OPENAI_MODEL`).

If Langflow, OpenAI, or external APIs are unavailable, each feature **degrades gracefully** (keyword intent extraction, no AI text, or data-only ordering).

| Feature | API / library entry |
|---------|----------------------|
| Home featured carousel | `/api/cards/featured-ai` · `lib/featured/aiFeaturedCarousel.ts` |
| Category page copy / ordering | `/api/cards/category-insight` · `lib/category/aiCategoryInsight.ts` · `/api/cards/category-order-ai` · `lib/category/aiCategoryOrder.ts` |
| Search & catalog browse order | `/api/cards/search-ai` · `lib/search/aiSearchRank.ts` · `/api/cards/browse-order-ai` · `lib/search/aiBrowseOrder.ts` |
| Card detail blurb | `/api/cards/detail-ai-insight` · `lib/card/aiCardDetailInsight.ts` |
| Compare two cards | `/api/cards/compare-ai` · `lib/compare/aiTwoCards.ts` |
| Wizard “Recommended for you” (v2) | `/api/recommend-cards` · `lib/recommendV2/aiExplanation.ts` — short “why this card” per top pick |
| Conversational advisor (chat) | `/api/chat-advisor` · `lib/chatAdvisor/langflowClient.ts` (Langflow primary intent extraction) · `lib/chatAdvisor/intent.ts` (fallback chain) · `lib/chatAdvisor/recommend.ts` (deterministic ranking + explanation text) |
| Legacy spend recommend flow | `lib/recommend/spendRecommendationSummaryOpenAI.ts`, `spendExplanationOpenAI.ts`, `aiSpendPicks.ts`, `finalizeSpendRecommendations.ts` · `/api/recommend/openai` |

AI is **constrained to real cards** from your Supabase pool for ranking flows; it does not invent products. In recommendation/chat flows, AI does not choose winners — it only extracts intent and writes explanation copy.

### Verifying Langflow locally

Run the app and send a chat prompt such as `I use Swiggy a lot and want cashback with low fees`. In the Next.js server logs, Langflow success looks like:

```text
langflow_response: ...
intent_source: langflow
langflow_success: true
fallback_triggered: none
```

If Langflow fails or is missing, the app falls back and logs `intent_source: openai` or `intent_source: keyword`.

---

## How recommendations work

### Wizard v2 (`/api/recommend-cards`)

1. **Profile construction** — UI sliders map to normalized category weights + fee sensitivity (`lib/recommendV2/profileFromSpendSliders.ts`).
2. **Spend split + value** — Scoring uses explicit category weights when available (fallback: heuristic), then computes category-aware yearly value (`lib/recommendV2/scoring.ts`).
3. **Deterministic ranking** — Cards are ranked by deterministic score; OpenAI (if enabled) only generates explanation text.

### Conversational advisor (`/api/chat-advisor`)

1. **Intent extraction** — Parse user text into structured profile fields (`dining/travel/shopping/fuel/fees/preferred_rewards`) using Langflow first, then OpenAI fallback, then keyword fallback.
2. **Profile merge + follow-up** — Merge new signals without degrading stronger existing values; ask next best question if needed.
3. **Deterministic picks** — Convert chat profile into scoring profile, rank top cards deterministically, then add explanation copy (LLM or rule-based fallback).

Ranking and reward math remain **deterministic** across both flows.

---

## Card data & imports

Bundled refined JSON examples (import / pipeline inputs):

- `data/credit_cards_amex_refined.json`
- `data/credit_cards_axis_refined.json`
- `data/credit_cards_sbi_refined.json`

The **running app** reads whatever is in Supabase **`credit_cards`**.

### Data scripts (`package.json`)

```bash
npm run data:sync          # pipeline with docx conversion
npm run data:sync:mirror   # + mirror GCS
# See package.json for data:pipeline, data:upload-gcs, data:merge-refined
```

### Common issue: “More cards than in my JSON?”

`import_cards_to_supabase.py` **inserts** rows; it does not delete older imports.

- Clean the DB in Supabase SQL (e.g. project `sql/` helpers), or use purge flags if your import script supports them, or restrict the UI with `NEXT_PUBLIC_CARD_NETWORK`.

---

## Heuristic modelling (non-AI)

Some issuer cards use **catalog-derived earn ranges** instead of raw DB columns (e.g. SBI/Axis in `lib/cards/sbiAxisCategoryRewards.ts`). A few product-specific rules keep **category browse** and **recommendations** aligned with how cards are marketed — for example:

- **Amex Platinum / Platinum Reserve** — Treated as **travel-first** for primary category chips when points + name patterns match (`lib/spendCategories.ts`).
- **Flipkart co-brands** — Broad **travel** is modelled at base tier so **Cleartrip-only** uplift does not dominate travel-focused picks.

---

## License & disclaimer

CredGenie is **not** financial advice and is **not** affiliated with banks or card networks. Fees, rewards, and eligibility change; users must verify with issuers before applying.
