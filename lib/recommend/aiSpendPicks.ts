import { openAiJsonCompletion } from "@/lib/ai/openaiClient";
import type { SpendByCategory } from "@/lib/recommend/rewardCalculator";
import type { SpendRecommendationRow } from "@/lib/recommend/topSpendRecommendations";

function trimText(s: string | null, max: number): string | null {
  if (s == null) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function compactCandidates(rows: SpendRecommendationRow[]) {
  return rows.map((r) => ({
    card_id: r.id,
    card_name: r.card_name,
    bank: r.bank,
    network: r.network,
    annual_fee: r.annual_fee,
    reward_type: r.reward_type,
    lounge_access: trimText(r.lounge_access, 120),
    category_rates_percent: r.category_reward_pct,
    best_for: trimText(r.best_for, 220),
    reward_rate_text: trimText(r.reward_rate, 200),
    model_estimated_yearly_reward_inr: r.yearly_reward_inr,
    model_estimated_monthly_reward_inr:
      Math.round((r.yearly_reward_inr / 12) * 100) / 100,
  }));
}

type AiPick = { card_id?: string; explanation?: string; rank?: number };

/**
 * Ask the model to choose the best 3 cards for this spend profile from the candidate list only.
 * Returns null if parsing fails or picks are invalid.
 */
export async function fetchAiSpendTopPicks(
  monthlySpend: SpendByCategory,
  candidates: SpendRecommendationRow[]
): Promise<SpendRecommendationRow[] | null> {
  if (candidates.length < 3) {
    return null;
  }

  const allowed = new Set(candidates.map((c) => c.id));
  const payload = compactCandidates(candidates);

  const user = `
User average monthly spend (INR) by category:
${JSON.stringify(monthlySpend, null, 2)}

Candidate cards (choose ONLY from these card_id values; do not invent cards or rates):
${JSON.stringify(payload, null, 2)}

Each candidate includes model_estimated_yearly_reward_inr from our calculator — treat it as a strong signal but you may prefer a lower raw reward if fees, lounge_access, best_for, or category fit clearly justify it for this user.

Return ONLY valid JSON:
{
  "picks": [
    { "card_id": "<uuid from list>", "rank": 1, "explanation": "≤280 chars, Indian English, ₹ for rupees" },
    { "card_id": "...", "rank": 2, "explanation": "..." },
    { "card_id": "...", "rank": 3, "explanation": "..." }
  ]
}

Rules:
- Exactly 3 picks, ranks 1–3, unique card_ids all present in the candidate list.
- Explanations: tie to their spend pattern and this card's strengths; mention category % from category_rates_percent when useful.
`.trim();

  const parsed = (await openAiJsonCompletion(
    "You output strict JSON only. Keys: picks (array of {card_id, rank, explanation}). Obey all user rules.",
    user,
    0.2
  )) as { picks?: AiPick[] };

  const raw = parsed.picks;
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const byId = new Map(candidates.map((c) => [c.id, c] as const));
  const ordered: SpendRecommendationRow[] = [];
  const seen = new Set<string>();

  const sorted = [...raw].sort(
    (a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99)
  );

  for (const item of sorted) {
    const id = typeof item.card_id === "string" ? item.card_id : "";
    if (!id || seen.has(id) || !allowed.has(id)) continue;
    const row = byId.get(id);
    if (!row) continue;
    seen.add(id);
    const explanation =
      typeof item.explanation === "string" && item.explanation.trim()
        ? item.explanation.trim()
        : null;
    ordered.push({ ...row, explanation });
  }

  if (ordered.length < 3) {
    for (const c of candidates) {
      if (ordered.length >= 3) break;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      ordered.push({ ...c, explanation: null });
    }
  }

  if (ordered.length < 3) {
    return null;
  }

  return ordered.slice(0, 3);
}
