import type { RecommendedCard } from "@/lib/recommendV2/recommendCardsApiTypes";
import type { CardRowForScoring } from "@/lib/recommendV2/scoring";
import type { CredGenieAdvisorProfile } from "./types";

/** Prioritized gap / upsell dimension for dynamic questioning. */
export type AdvisorGapKind =
  | "monthly_spend"
  | "category_mix"
  | "reward_format"
  | "fee_tolerance"
  | "telecom_spend_depth"
  | "travel_type"
  | "travel_frequency"
  | "lounge_priority"
  | "merchant_ecosystem";

export type OpportunitySignal = {
  kind: AdvisorGapKind;
  /** Higher = ask sooner */
  priority: number;
  /** Short hint for LLM question generator */
  hint: string;
};

/**
 * Mutable LangGraph working state for one advisor turn (API single POST).
 */
export type AdvisorConversationState = {
  userMessage: string;
  /** Profile loaded from session + client before this turn */
  priorProfile: CredGenieAdvisorProfile;
  /** Raw model output */
  extracted?: Partial<CredGenieAdvisorProfile>;
  mergedProfile: CredGenieAdvisorProfile;
  gaps: AdvisorGapKind[];
  opportunities: OpportunitySignal[];
  confidenceScore: number;
  confidenceBand: "foundational" | "optimization" | "ready";
  nextQuestion: string | null;
  reasoningBrief?: string;
  recommendations?: RecommendedCard[];
  assistantSummary?: string;
  /** Cards loaded in route — passed through for deterministic ranking only */
  candidates?: CardRowForScoring[];
};

export function emptyAdvisorState(
  prior: CredGenieAdvisorProfile,
  message: string
): AdvisorConversationState {
  return {
    userMessage: message,
    priorProfile: prior,
    mergedProfile: { ...prior },
    gaps: [],
    opportunities: [],
    confidenceScore: 0,
    confidenceBand: "foundational",
    nextQuestion: null,
  };
}
