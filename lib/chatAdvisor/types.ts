import type { RecommendedCard } from "@/lib/recommendV2/recommendCardsApiTypes";
import type { AdvisorGapKind } from "./gapKinds";

export type AdvisorLevel = "low" | "medium" | "high";
export type AdvisorRewardPreference = "cashback" | "travel" | "mixed";

/** Legacy flat spend & fee fields (still supported in API payloads). */
export type AdvisorProfile = {
  dining?: AdvisorLevel;
  travel?: AdvisorLevel;
  shopping?: AdvisorLevel;
  fuel?: AdvisorLevel;
  fees?: AdvisorLevel;
  preferred_rewards?: AdvisorRewardPreference;
};

export type TelecomEcosystem = "airtel" | "jio" | "vi" | "none";
export type TravelFrequency = "rarely" | "occasionally" | "frequent";
export type TravelType = "domestic" | "international" | "both";
export type LoungePriority = "none" | "nice_to_have" | "must_have";

/**
 * CredGenie conversational profile: extends the legacy wizard with structured
 * lifestyle / ecosystem fields. Merge & scoring map into `UserProfile` for the
 * deterministic engine.
 */
export type CredGenieAdvisorProfile = AdvisorProfile & {
  telecomEcosystem?: TelecomEcosystem;
  travelFrequency?: TravelFrequency;
  travelType?: TravelType;
  loungePriority?: LoungePriority;
  existingCards?: string[];
  monthlySpend?: number;
  preferredBrands?: string[];
};

export type ChatAdvisorRequestBody = {
  message: string;
  /** Client-side accumulated profile (merged server-side with session store). */
  profile?: CredGenieAdvisorProfile;
  /** Stable id for Supabase-backed session persistence. */
  sessionId?: string;
  /** Echo prior asks so dedupe works even when DB persistence fails. */
  askedGapKinds?: AdvisorGapKind[];
  /** Last assistant question shown before this user reply — improves extraction for short answers. */
  precedingAssistantQuestion?: string | null;
};

export type ChatAdvisorResponseBody = {
  profile: CredGenieAdvisorProfile;
  /** Always returned — create on first turn if omitted in request. */
  sessionId: string;
  /** Gap ids already used for questions this session (merge client + server). */
  askedGapKinds: AdvisorGapKind[];
  /** 0–1 aggregate from `profileConfidence` (not persisted on profile blob). */
  confidenceScore: number;
  /** Short human rationale for the next question or recommendations (never card ordering). */
  reasoningBrief?: string;
  nextQuestion?: string;
  recommendations?: RecommendedCard[];
};
