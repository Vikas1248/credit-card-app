import type { CardRowForScoring, CardScoreBreakdown } from "@/lib/recommendV2/scoring";
import type { UserProfile } from "@/lib/recommendV2/userProfile";

/** Canonical spend slugs used in CredGenie scoring. */
export type SpendCategorySlug = "shopping" | "dining" | "travel" | "fuel";

/**
 * API-friendly raw input for the recommendation graph.
 * `categories` may be a list of focus areas or explicit non-negative weights per slug.
 */
export type CredgenieRecommendationInput = {
  monthlySpend: number;
  categories: SpendCategorySlug[] | Partial<Record<SpendCategorySlug, number>>;
  /**
   * Optional 0–1 share of spend on bills / utilities (from slider UI), not represented
   * in the four scored categories after bills are merged into shopping + fuel.
   */
  billPayWeightShare?: number;
  /** When set, skips mock catalog (e.g. pass Supabase rows). */
  candidatesOverride?: CardRowForScoring[];
  profileOverrides?: Partial<
    Pick<UserProfile, "preferredRewardType" | "feeSensitivity" | "lifestyle" | "spendContext">
  >;
};

/** Normalized weights over the four spend dimensions (sum = 1). */
export type CategoryWeights = Record<SpendCategorySlug, number>;

/** One card after deterministic scoring (LLM must not alter rank). */
export type ScoredCard = {
  card: CardRowForScoring;
  name: string;
  score: number;
  netReward: number;
  breakdown: CardScoreBreakdown;
};

export type DecisionType = "clear_winner" | "close_call";

export type RecommendationExplanation = {
  summary: string;
  why: string[];
  tradeoffs: string[];
};

/** Top picks for the wizard grid (same shape as `/api/recommend-cards` card rows). */
export type RecommendationCardRow = {
  card_id: string;
  card_name: string;
  bank: string;
  score: number;
  yearlyReward: number;
  annualFee: number;
  netGain: number;
  /** Short line for the tile; full narrative is in `explanation` on the result. */
  explanation: string | null;
};

/** Payload returned from `getRecommendations` (API contract). */
export type CredgenieRecommendationResult = {
  winner: ScoredCardSummary;
  runnerUp: ScoredCardSummary | null;
  confidence: number;
  decisionType: DecisionType;
  betterAlternative?: ScoredCardSummary;
  explanation: RecommendationExplanation;
  /** First three ranked cards with yearly value fields for the UI. */
  topPicks: RecommendationCardRow[];
};

/** Slim card view for JSON APIs. */
export type ScoredCardSummary = {
  id: string;
  name: string;
  bank: string;
  score: number;
  netReward: number;
  breakdown: CardScoreBreakdown;
};

export function toScoredCardSummary(s: ScoredCard): ScoredCardSummary {
  return {
    id: s.card.id,
    name: s.name,
    bank: s.card.bank,
    score: s.score,
    netReward: s.netReward,
    breakdown: s.breakdown,
  };
}
