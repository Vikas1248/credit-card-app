import type { UserProfile } from "@/lib/recommendV2/userProfile";

import type { CredgenieRecommendationInput, SpendCategorySlug } from "./types";

const SLUGS = new Set<string>(["shopping", "dining", "travel", "fuel"]);

/**
 * Map a v2 wizard `UserProfile` (from `parseUserProfile`) into LangGraph raw input.
 */
export function profileToGraphInput(profile: UserProfile): CredgenieRecommendationInput {
  const categories = profile.topCategories
    .map((c) => c.toLowerCase())
    .filter((c): c is SpendCategorySlug => SLUGS.has(c));

  return {
    monthlySpend: profile.monthlySpend,
    categories: categories.length > 0 ? categories : (["shopping"] as SpendCategorySlug[]),
    profileOverrides: {
      preferredRewardType: profile.preferredRewardType,
      feeSensitivity: profile.feeSensitivity,
      lifestyle: profile.lifestyle,
      spendContext: profile.spendContext,
    },
  };
}
