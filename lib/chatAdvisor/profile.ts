import type { UserProfile as RecommendUserProfile } from "@/lib/recommendV2/userProfile";
import type {
  AdvisorLevel,
  CredGenieAdvisorProfile,
  AdvisorRewardPreference,
  LoungePriority,
  TelecomEcosystem,
  TravelFrequency,
} from "./types";

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

const TELECOM_WEIGHT_FOR_BILLS = 0.12;

function levelToWeight(v?: AdvisorLevel): number {
  if (!v) return 0;
  return LEVEL_SCORE[v];
}

function normalizeWeightMap(profile: CredGenieAdvisorProfile): Record<CategoryKey, number> {
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

function strongerLevel(existing?: AdvisorLevel, incoming?: AdvisorLevel): AdvisorLevel | undefined {
  if (!incoming) return existing;
  if (!existing) return incoming;
  return LEVEL_SCORE[incoming] > LEVEL_SCORE[existing] ? incoming : existing;
}

function strongerTravelFreq(
  existing?: TravelFrequency,
  incoming?: TravelFrequency
): TravelFrequency | undefined {
  const rank: Record<TravelFrequency, number> = {
    rarely: 1,
    occasionally: 2,
    frequent: 3,
  };
  if (!incoming) return existing;
  if (!existing) return incoming;
  return rank[incoming] >= rank[existing] ? incoming : existing;
}

export function mergeCredGenieAdvisorProfile(
  current: CredGenieAdvisorProfile,
  extracted: Partial<CredGenieAdvisorProfile>
): CredGenieAdvisorProfile {
  const merged: CredGenieAdvisorProfile = { ...current };

  for (const key of CATEGORY_KEYS) {
    merged[key] = strongerLevel(merged[key], extracted[key]);
  }

  merged.fees = strongerLevel(merged.fees, extracted.fees);
  merged.preferred_rewards = mergeRewardPreference(
    merged.preferred_rewards,
    extracted.preferred_rewards
  );

  if (extracted.telecomEcosystem && extracted.telecomEcosystem !== "none") {
    merged.telecomEcosystem = extracted.telecomEcosystem;
  } else if (extracted.telecomEcosystem === "none") {
    merged.telecomEcosystem = "none";
  }

  merged.travelFrequency = strongerTravelFreq(merged.travelFrequency, extracted.travelFrequency);

  if (extracted.travelType) merged.travelType = extracted.travelType;

  if (extracted.loungePriority) {
    const lpRank: Record<LoungePriority, number> = {
      none: 0,
      nice_to_have: 1,
      must_have: 2,
    };
    const prev = merged.loungePriority ?? "none";
    merged.loungePriority =
      lpRank[extracted.loungePriority] >= lpRank[prev] ? extracted.loungePriority : prev;
  }

  if (Array.isArray(extracted.existingCards) && extracted.existingCards.length > 0) {
    merged.existingCards = normalizeStringList([
      ...(merged.existingCards ?? []),
      ...extracted.existingCards,
    ]);
  }

  if (typeof extracted.monthlySpend === "number" && Number.isFinite(extracted.monthlySpend)) {
    const n = Math.round(Math.max(0, Math.min(500_000, extracted.monthlySpend)));
    if (n > 0) merged.monthlySpend = n;
  }

  if (Array.isArray(extracted.preferredBrands) && extracted.preferredBrands.length > 0) {
    merged.preferredBrands = normalizeStringList([
      ...(merged.preferredBrands ?? []),
      ...extracted.preferredBrands,
    ]);
  }

  return merged;
}

/** @deprecated Use mergeCredGenieAdvisorProfile — alias for backward compat. */
export function mergeAdvisorProfile(
  current: CredGenieAdvisorProfile,
  extracted: Partial<CredGenieAdvisorProfile>
): CredGenieAdvisorProfile {
  return mergeCredGenieAdvisorProfile(current, extracted);
}

function mergeRewardPreference(
  existing?: AdvisorRewardPreference,
  incoming?: AdvisorRewardPreference
): AdvisorRewardPreference | undefined {
  if (!incoming) return existing;
  if (!existing) return incoming;
  return REWARD_SCORE[incoming] >= REWARD_SCORE[existing] ? incoming : existing;
}

function normalizeStringList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = raw.trim().toLowerCase();
    if (s.length < 2 || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out.slice(0, 24);
}

function lifestyleFromProfile(profile: CredGenieAdvisorProfile): string[] {
  const lifestyle: string[] = [];
  const lp = profile.loungePriority;
  if (lp === "must_have") {
    lifestyle.push("lounge_domestic", "lounge_international");
  } else if (lp === "nice_to_have") {
    lifestyle.push("lounge_domestic");
  }

  if (profile.travelFrequency === "frequent") lifestyle.push("traveler");

  return [...new Set(lifestyle)].slice(0, 10);
}

/** Derive merchant / app affinity for deterministic uplift in scoring. */
function spendContextFromProfile(profile: CredGenieAdvisorProfile): RecommendUserProfile["spendContext"] {
  const brands = profile.preferredBrands ?? [];
  const hay = brands.join(" ");

  let preferredMerchant: "none" | "flipkart" | "amazon" = "none";
  if (hay.includes("amazon")) preferredMerchant = "amazon";
  else if (hay.includes("flipkart")) preferredMerchant = "flipkart";

  let preferredApp: "none" | "swiggy" | "zomato" = "none";
  if (hay.includes("swiggy")) preferredApp = "swiggy";
  else if (hay.includes("zomato")) preferredApp = "zomato";

  const diningDeliveryPct =
    profile.dining === "high" ? 70 : profile.dining === "medium" ? 55 : 45;

  const modes: Array<"flights" | "trains" | "hotels"> = [];
  if (profile.travel === "high" || profile.travelFrequency === "frequent") {
    modes.push("flights", "hotels");
  } else if (profile.travel === "medium" || profile.travelFrequency === "occasionally") {
    modes.push("flights");
  }

  return {
    shopping: {
      onlinePct: profile.shopping === "high" ? 85 : profile.shopping === "medium" ? 72 : 60,
      preferredMerchant,
    },
    dining: {
      deliveryPct: diningDeliveryPct,
      preferredApp,
    },
    travel: {
      modes,
      preferredAirline: "none",
      flightsPct: profile.travelType === "international" ? 75 : 60,
    },
  };
}

function billPayShareFromTelecom(eco?: TelecomEcosystem): number | undefined {
  if (!eco || eco === "none") return undefined;
  return TELECOM_WEIGHT_FOR_BILLS;
}

export function toRecommendUserProfile(profile: CredGenieAdvisorProfile): RecommendUserProfile {
  const weights = normalizeWeightMap(profile);
  const topCategories = [...CATEGORY_KEYS].sort((a, b) => weights[b] - weights[a]).slice(0, 3);

  const preferredRewardType: RecommendUserProfile["preferredRewardType"] =
    profile.preferred_rewards === "travel"
      ? "points"
      : profile.preferred_rewards === "cashback"
        ? "cashback"
        : "points";

  const feeSensitivity: RecommendUserProfile["feeSensitivity"] =
    profile.fees === "low" ? "high" : profile.fees === "medium" ? "medium" : "low";

  const monthlySpend =
    typeof profile.monthlySpend === "number" && profile.monthlySpend > 0
      ? profile.monthlySpend
      : 35_000;

  const billPayWeightShare = billPayShareFromTelecom(profile.telecomEcosystem);

  return {
    monthlySpend,
    topCategories,
    categoryWeights: weights,
    ...(typeof billPayWeightShare === "number" ? { billPayWeightShare } : {}),
    preferredRewardType,
    feeSensitivity,
    lifestyle: lifestyleFromProfile(profile),
    spendContext: spendContextFromProfile(profile),
  };
}
