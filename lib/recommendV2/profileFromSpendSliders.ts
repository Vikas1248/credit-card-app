import type { SpendCategorySlug } from "@/lib/spendCategories";
import type { UserProfile } from "@/lib/recommendV2/userProfile";

/** Slider weights (any non-negative scale; normalized internally). */
export type CategoryWeightDraft = {
  shopping: number;
  dining: number;
  travel: number;
  fuel: number;
  /** Utilities / bill pay — merged into shopping + fuel for scoring (unchanged model). */
  bills: number;
};

export const DEFAULT_CATEGORY_WEIGHTS: CategoryWeightDraft = {
  shopping: 50,
  dining: 30,
  travel: 10,
  fuel: 5,
  bills: 5,
};

export type FeeTierUi = "free" | "low" | "premium";

const SLUGS: SpendCategorySlug[] = ["shopping", "dining", "travel", "fuel"];

/**
 * Maps the five UI sliders into four scoring dimensions by splitting "bills"
 * evenly between shopping and fuel, then normalizing.
 */
export function effectiveCategoryWeights(w: CategoryWeightDraft): Record<SpendCategorySlug, number> {
  const rawSum =
    w.shopping + w.dining + w.travel + w.fuel + w.bills;
  if (!Number.isFinite(rawSum) || rawSum <= 0) {
    return { shopping: 0.25, dining: 0.25, travel: 0.25, fuel: 0.25 };
  }
  const s = w.shopping + w.bills / 2;
  const d = w.dining;
  const t = w.travel;
  const f = w.fuel + w.bills / 2;
  const total = s + d + t + f;
  return {
    shopping: s / total,
    dining: d / total,
    travel: t / total,
    fuel: f / total,
  };
}

export function topCategorySlugsFromEffective(
  effective: Record<SpendCategorySlug, number>,
  max = 3
): string[] {
  return [...SLUGS]
    .sort((a, b) => effective[b] - effective[a])
    .slice(0, max)
    .map((s) => s);
}

/** Rupee split across the four scored categories (sums to `monthlyTotal`). */
export function monthlyRupeeSplitFromWeights(
  monthlyTotal: number,
  w: CategoryWeightDraft
): Record<SpendCategorySlug, number> {
  const eff = effectiveCategoryWeights(w);
  const out = {} as Record<SpendCategorySlug, number>;
  for (const k of SLUGS) {
    out[k] = Math.round(monthlyTotal * eff[k]);
  }
  const sum = SLUGS.reduce((s, k) => s + out[k], 0);
  const delta = Math.round(monthlyTotal) - sum;
  if (delta !== 0) {
    const top = SLUGS.reduce((a, b) => (eff[b] > eff[a] ? b : a));
    out[top] = Math.max(0, out[top] + delta);
  }
  return out;
}

export function buildUserProfileFromSpendUi(opts: {
  monthlySpendTotal: number;
  weights: CategoryWeightDraft;
  feeTier: FeeTierUi;
}): UserProfile {
  const effective = effectiveCategoryWeights(opts.weights);
  const topCategories = topCategorySlugsFromEffective(effective, 3);
  const feeSensitivity: UserProfile["feeSensitivity"] =
    opts.feeTier === "free" ? "high" : opts.feeTier === "low" ? "medium" : "low";

  return {
    monthlySpend: Math.max(0, Math.round(opts.monthlySpendTotal)),
    topCategories: topCategories.length > 0 ? topCategories : ["shopping"],
    preferredRewardType: "cashback",
    feeSensitivity,
    lifestyle: [],
    spendContext: {
      shopping: { onlinePct: 70, preferredMerchant: "none" },
      dining: { deliveryPct: 55, preferredApp: "none" },
      travel: { modes: [], preferredAirline: "none", flightsPct: 60 },
    },
  };
}

export function feeTierLabel(tier: FeeTierUi): string {
  if (tier === "free") return "free or lifetime-free cards";
  if (tier === "low") return "low annual fees";
  return "premium cards with higher fees";
}

export function describeTopCategoriesForInsight(weights: CategoryWeightDraft): string {
  const eff = effectiveCategoryWeights(weights);
  const order = [...SLUGS].sort((a, b) => eff[b] - eff[a]);
  const labels: Record<SpendCategorySlug, string> = {
    shopping: "shopping",
    dining: "dining",
    travel: "travel",
    fuel: "fuel",
  };
  const top3 = order.slice(0, 3).map((k) => labels[k]);
  let s =
    top3.length === 1
      ? top3[0]!
      : top3.length === 2
        ? `${top3[0]} and ${top3[1]}`
        : `${top3[0]}, ${top3[1]}, and ${top3[2]}`;
  if (weights.bills > 0) {
    s += " (including bill pay)";
  }
  return s;
}
