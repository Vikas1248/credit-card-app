import type { UserProfile as RecommendUserProfile } from "@/lib/recommendV2/userProfile";
import type { AdvisorLevel, AdvisorProfile, AdvisorRewardPreference } from "./types";

const LEVEL_SCORE: Record<AdvisorLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const REWARD_SCORE: Record<AdvisorRewardPreference, number> = {
  mixed: 1,
  cashback: 2,
  travel: 2,
};

const CATEGORY_KEYS = ["shopping", "dining", "travel", "fuel"] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

function levelToWeight(v?: AdvisorLevel): number {
  if (!v) return 0;
  return LEVEL_SCORE[v];
}

function normalizeWeightMap(profile: AdvisorProfile): Record<CategoryKey, number> {
  const raw: Record<CategoryKey, number> = {
    shopping: levelToWeight(profile.shopping),
    dining: levelToWeight(profile.dining),
    travel: levelToWeight(profile.travel),
    fuel: levelToWeight(profile.fuel),
  };
  const sum = Object.values(raw).reduce((acc, n) => acc + n, 0);
  if (sum <= 0) {
    return { shopping: 0.25, dining: 0.25, travel: 0.25, fuel: 0.25 };
  }
  return {
    shopping: raw.shopping / sum,
    dining: raw.dining / sum,
    travel: raw.travel / sum,
    fuel: raw.fuel / sum,
  };
}

export function mergeAdvisorProfile(
  current: AdvisorProfile,
  extracted: Partial<AdvisorProfile>
): AdvisorProfile {
  const merged: AdvisorProfile = { ...current };

  for (const key of CATEGORY_KEYS) {
    const existing = merged[key];
    const incoming = extracted[key];
    if (!incoming) continue;
    if (!existing || LEVEL_SCORE[incoming] > LEVEL_SCORE[existing]) {
      merged[key] = incoming;
    }
  }

  const feeExisting = merged.fees;
  const feeIncoming = extracted.fees;
  if (feeIncoming) {
    if (!feeExisting || LEVEL_SCORE[feeIncoming] > LEVEL_SCORE[feeExisting]) {
      merged.fees = feeIncoming;
    }
  }

  const rewardExisting = merged.preferred_rewards;
  const rewardIncoming = extracted.preferred_rewards;
  if (rewardIncoming) {
    if (!rewardExisting || REWARD_SCORE[rewardIncoming] >= REWARD_SCORE[rewardExisting]) {
      merged.preferred_rewards = rewardIncoming;
    }
  }

  return merged;
}

export function missingProfileFields(profile: AdvisorProfile): string[] {
  const required: Array<keyof AdvisorProfile> = [
    "dining",
    "travel",
    "shopping",
    "fuel",
    "fees",
    "preferred_rewards",
  ];
  return required.filter((k) => !profile[k]).map(String);
}

export function nextQuestionForProfile(profile: AdvisorProfile): string {
  const next = nextMissingProfileField(profile);
  if (next === "preferred_rewards") {
    return "Do you prefer cashback, travel rewards, or a balanced mix?";
  }
  if (next === "fees") {
    return "How fee-sensitive are you: low fee, medium fee, or premium perks with higher fee?";
  }
  if (next === "shopping") {
    return "How much of your monthly spend goes to shopping: low, medium, or high?";
  }
  if (next === "dining") {
    return "How much do you spend on dining/food delivery: low, medium, or high?";
  }
  if (next === "travel") {
    return "How travel-heavy are you each month: low, medium, or high?";
  }
  if (next === "fuel") {
    return "How much do you spend on fuel: low, medium, or high?";
  }
  return "Tell me your top priority, and I will refine the picks.";
}

export function nextMissingProfileField(
  profile: AdvisorProfile
): keyof AdvisorProfile | null {
  if (!profile.preferred_rewards) return "preferred_rewards";
  if (!profile.fees) return "fees";
  if (!profile.shopping) return "shopping";
  if (!profile.dining) return "dining";
  if (!profile.travel) return "travel";
  if (!profile.fuel) return "fuel";
  return null;
}

export function isProfileSufficient(profile: AdvisorProfile): boolean {
  const filled =
    CATEGORY_KEYS.filter((k) => Boolean(profile[k])).length +
    (profile.fees ? 1 : 0) +
    (profile.preferred_rewards ? 1 : 0);
  return filled >= 4;
}

export function toRecommendUserProfile(profile: AdvisorProfile): RecommendUserProfile {
  const weights = normalizeWeightMap(profile);
  const topCategories = [...CATEGORY_KEYS]
    .sort((a, b) => weights[b] - weights[a])
    .slice(0, 3);

  const preferredRewardType: RecommendUserProfile["preferredRewardType"] =
    profile.preferred_rewards === "travel"
      ? "points"
      : profile.preferred_rewards === "cashback"
        ? "cashback"
        : "points";

  const feeSensitivity: RecommendUserProfile["feeSensitivity"] =
    profile.fees === "low" ? "high" : profile.fees === "medium" ? "medium" : "low";

  return {
    monthlySpend: 35_000,
    topCategories,
    categoryWeights: weights,
    preferredRewardType,
    feeSensitivity,
    lifestyle: [],
    spendContext: {
      shopping: { onlinePct: 70, preferredMerchant: "none" },
      dining: { deliveryPct: 60, preferredApp: "none" },
      travel: { modes: [], preferredAirline: "none", flightsPct: 60 },
    },
  };
}
