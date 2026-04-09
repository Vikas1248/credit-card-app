import type { SpendByCategory } from "@/lib/recommend/rewardCalculator";
import {
  fetchSpendRecommendationExplanations,
  mergeSpendExplanations,
} from "@/lib/recommend/spendExplanationOpenAI";
import {
  topSpendRecommendations,
  type SpendRecommendationRow,
} from "@/lib/recommend/topSpendRecommendations";

function withNullExplanations(
  rows: SpendRecommendationRow[]
): SpendRecommendationRow[] {
  return rows.map((r) => ({ ...r, explanation: null as string | null }));
}

/**
 * Ranks cards by spend, then enriches with OpenAI explanations when OPENAI_API_KEY is set.
 */
export async function finalizeSpendRecommendations(
  monthlySpend: SpendByCategory,
  limit = 3
): Promise<Awaited<ReturnType<typeof topSpendRecommendations>>> {
  const payload = await topSpendRecommendations(monthlySpend, limit);

  if (!process.env.OPENAI_API_KEY) {
    return {
      ...payload,
      recommendations: withNullExplanations(payload.recommendations),
    };
  }

  try {
    const byId = await fetchSpendRecommendationExplanations(
      monthlySpend,
      payload.recommendations
    );
    return {
      ...payload,
      recommendations: mergeSpendExplanations(payload.recommendations, byId),
    };
  } catch {
    return {
      ...payload,
      recommendations: withNullExplanations(payload.recommendations),
    };
  }
}
