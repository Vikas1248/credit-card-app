import { isOpenAiConfigured } from "@/lib/ai/openaiClient";
import { fetchAiSpendTopPicks } from "@/lib/recommend/aiSpendPicks";
import {
  fetchSpendRecommendationExplanations,
  mergeSpendExplanations,
} from "@/lib/recommend/spendExplanationOpenAI";
import type { SpendByCategory } from "@/lib/recommend/rewardCalculator";
import {
  topSpendRecommendations,
  type SpendRecommendationRow,
} from "@/lib/recommend/topSpendRecommendations";

function withNullExplanations(
  rows: SpendRecommendationRow[]
): SpendRecommendationRow[] {
  return rows.map((r) => ({ ...r, explanation: null as string | null }));
}

const CANDIDATE_POOL = 40;

/**
 * Ranks cards by spend model, then (when OpenAI is configured) lets the model
 * pick the top 3 from the best ~40 with explanations. Falls back to pure math
 * top 3 plus optional explanation pass when AI fails.
 */
export async function finalizeSpendRecommendations(
  monthlySpend: SpendByCategory,
  limit = 3
): Promise<Awaited<ReturnType<typeof topSpendRecommendations>>> {
  const pool = await topSpendRecommendations(
    monthlySpend,
    Math.max(limit, CANDIDATE_POOL)
  );

  if (isOpenAiConfigured() && pool.recommendations.length >= limit) {
    try {
      const aiTop = await fetchAiSpendTopPicks(
        monthlySpend,
        pool.recommendations
      );
      if (aiTop && aiTop.length >= limit) {
        return {
          ...pool,
          recommendations: aiTop.slice(0, limit),
        };
      }
    } catch {
      /* fall through to math + optional explanations */
    }
  }

  const topN = pool.recommendations.slice(0, limit);
  const payloadN = {
    ...pool,
    recommendations: topN,
  };

  if (!isOpenAiConfigured()) {
    return {
      ...payloadN,
      recommendations: withNullExplanations(payloadN.recommendations),
    };
  }

  try {
    const byId = await fetchSpendRecommendationExplanations(
      monthlySpend,
      topN
    );
    return {
      ...payloadN,
      recommendations: mergeSpendExplanations(topN, byId),
    };
  } catch {
    return {
      ...payloadN,
      recommendations: withNullExplanations(topN),
    };
  }
}
