import type { RecommendedCard } from "@/lib/recommendV2/recommendCardsApiTypes";

export type AdvisorLevel = "low" | "medium" | "high";
export type AdvisorRewardPreference = "cashback" | "travel" | "mixed";

export type AdvisorProfile = {
  dining?: AdvisorLevel;
  travel?: AdvisorLevel;
  shopping?: AdvisorLevel;
  fuel?: AdvisorLevel;
  fees?: AdvisorLevel;
  preferred_rewards?: AdvisorRewardPreference;
};

export type ChatAdvisorRequestBody = {
  message: string;
  profile?: AdvisorProfile;
};

export type ChatAdvisorResponseBody = {
  profile: AdvisorProfile;
  nextQuestion?: string;
  recommendations?: RecommendedCard[];
};
