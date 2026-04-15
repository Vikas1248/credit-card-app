import { openAiJsonCompletion } from "@/lib/ai/openaiClient";
import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";
import type { SpendByCategory } from "@/lib/recommend/rewardCalculator";
import type {
  RecommendationProfile,
  SpendRecommendationRow,
} from "@/lib/recommend/topSpendRecommendations";

type SummaryResponse = {
  summary?: string;
};

export async function fetchSpendRecommendationSummary(
  monthlySpend: SpendByCategory,
  rows: SpendRecommendationRow[],
  profile?: RecommendationProfile
): Promise<string | null> {
  if (areThirdPartyApisDisabled() || rows.length === 0) return null;

  const parsed = (await openAiJsonCompletion(
    "You output strict JSON only. Keys: summary.",
    `
User monthly spend profile (INR):
${JSON.stringify(monthlySpend, null, 2)}

User selected preferences (if any):
${JSON.stringify(profile ?? {}, null, 2)}

Recommended cards (ordered best to lower fit):
${JSON.stringify(
  rows.map((r) => ({
    card_name: r.card_name,
    bank: r.bank,
    annual_fee: r.annual_fee,
    reward_type: r.reward_type,
    yearly_reward_inr: r.yearly_reward_inr,
    category_reward_pct: r.category_reward_pct,
  })),
  null,
  2
)}

Write one concise recommendation summary (max 240 chars), Indian English, with ₹ symbol where useful.
Mention why these cards fit the user's selected spend + preference profile.

Return JSON only:
{"summary":"..."}
    `.trim(),
    0.2
  )) as SummaryResponse;

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  return summary.length > 0 ? summary : null;
}
