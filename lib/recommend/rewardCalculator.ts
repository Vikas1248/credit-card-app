import {
  rewardPctMidpointForSpendCategory,
  type CardWithCategoryRewardsInput,
} from "@/lib/spendCategories";

/** Average monthly spend per category (INR). */
export type SpendByCategory = {
  dining: number;
  travel: number;
  shopping: number;
  fuel: number;
};

export type RewardBreakdown = {
  dining: number;
  travel: number;
  shopping: number;
  fuel: number;
};

export type CardCategoryRates = {
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
};

/** Card row with optional fields so Amex derived % midpoints can be used. */
export type CardCategoryRatesInput = CardCategoryRates &
  Partial<
    Pick<
      CardWithCategoryRewardsInput,
      "card_name" | "network" | "reward_type" | "best_for" | "reward_rate" | "metadata"
    >
  >;

function pct(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return value;
}

function resolvedCategoryPct(
  card: CardCategoryRatesInput,
  key: "dining" | "travel" | "shopping" | "fuel"
): number {
  const slug = key;
  const base = card[`${key}_reward` as const];
  if (typeof base === "number" && Number.isFinite(base) && base > 0) {
    return base;
  }
  return rewardPctMidpointForSpendCategory(
    {
      card_name: card.card_name ?? "",
      dining_reward: card.dining_reward,
      travel_reward: card.travel_reward,
      shopping_reward: card.shopping_reward,
      fuel_reward: card.fuel_reward,
      network: card.network,
      reward_type: card.reward_type,
      best_for: card.best_for,
      reward_rate: card.reward_rate,
      metadata: card.metadata,
    },
    slug
  );
}

/**
 * Category reward rates from DB are interpreted as % of spend in that category.
 * Monthly spend is annualized (×12) to produce yearly reward in INR.
 */
export const rewardCalculator = {
  computeYearlyRewards(
    monthlySpend: SpendByCategory,
    card: CardCategoryRatesInput
  ): { yearlyTotal: number; breakdown: RewardBreakdown } {
    const months = 12;
    const dining =
      monthlySpend.dining * months * (resolvedCategoryPct(card, "dining") / 100);
    const travel =
      monthlySpend.travel * months * (resolvedCategoryPct(card, "travel") / 100);
    const shopping =
      monthlySpend.shopping * months * (resolvedCategoryPct(card, "shopping") / 100);
    const fuel =
      monthlySpend.fuel * months * (resolvedCategoryPct(card, "fuel") / 100);
    const breakdown = { dining, travel, shopping, fuel };
    const yearlyTotal = dining + travel + shopping + fuel;
    return { yearlyTotal, breakdown };
  },
};
