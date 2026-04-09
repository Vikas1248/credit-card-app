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

function pct(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return value;
}

/**
 * Category reward rates from DB are interpreted as % of spend in that category.
 * Monthly spend is annualized (×12) to produce yearly reward in INR.
 */
export const rewardCalculator = {
  computeYearlyRewards(
    monthlySpend: SpendByCategory,
    card: CardCategoryRates
  ): { yearlyTotal: number; breakdown: RewardBreakdown } {
    const months = 12;
    const dining = monthlySpend.dining * months * (pct(card.dining_reward) / 100);
    const travel = monthlySpend.travel * months * (pct(card.travel_reward) / 100);
    const shopping = monthlySpend.shopping * months * (pct(card.shopping_reward) / 100);
    const fuel = monthlySpend.fuel * months * (pct(card.fuel_reward) / 100);
    const breakdown = { dining, travel, shopping, fuel };
    const yearlyTotal = dining + travel + shopping + fuel;
    return { yearlyTotal, breakdown };
  },
};
