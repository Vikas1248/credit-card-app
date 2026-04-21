import type { UserProfile } from "@/lib/recommendV2/userProfile";

import type { CredgenieRecommendationInput, SpendCategorySlug } from "./types";

const SLUGS: readonly SpendCategorySlug[] = ["shopping", "dining", "travel", "fuel"];
const SLUG_SET = new Set<string>(SLUGS);

/**
 * Map a v2 wizard `UserProfile` (from `parseUserProfile`) into LangGraph raw input.
 * Prefers the slider-derived `categoryWeights` when available so the graph's scoring
 * uses the real spend mix (and not just a ranked-top-3 heuristic).
 */
export function profileToGraphInput(profile: UserProfile): CredgenieRecommendationInput {
  const w = profile.categoryWeights;
  let categories: CredgenieRecommendationInput["categories"];
  if (w) {
    const obj: Partial<Record<SpendCategorySlug, number>> = {};
    let anyPositive = false;
    for (const slug of SLUGS) {
      const v = w[slug];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        obj[slug] = v;
        anyPositive = true;
      }
    }
    categories = anyPositive ? obj : (["shopping"] as SpendCategorySlug[]);
  } else {
    const list = profile.topCategories
      .map((c) => c.toLowerCase())
      .filter((c): c is SpendCategorySlug => SLUG_SET.has(c));
    categories = list.length > 0 ? list : (["shopping"] as SpendCategorySlug[]);
  }

  return {
    monthlySpend: profile.monthlySpend,
    categories,
    profileOverrides: {
      preferredRewardType: profile.preferredRewardType,
      feeSensitivity: profile.feeSensitivity,
      lifestyle: profile.lifestyle,
      spendContext: profile.spendContext,
    },
  };
}
