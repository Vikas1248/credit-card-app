import { rewardCalculator, type SpendByCategory } from "@/lib/recommend/rewardCalculator";
import {
  rewardPctForSpendCategory,
  type SpendCategorySlug,
} from "@/lib/spendCategories";
import type { UserProfile } from "@/lib/recommendV2/userProfile";

export type CardRowForScoring = {
  id: string;
  card_name: string;
  bank: string;
  joining_fee: number;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  key_benefits: string | null;
  // Optional if table has category columns (CredGenie does in `credit_cards`)
  dining_reward?: number | null;
  travel_reward?: number | null;
  shopping_reward?: number | null;
  fuel_reward?: number | null;
  network?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type YearlyValue = {
  yearlyReward: number;
  annualFee: number;
  netGain: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function toPctMaybe(rewardRateText: string | null): number | null {
  if (!rewardRateText) return null;
  const t = rewardRateText.replace(/,/g, " ");
  // Common: "5%", "1.5% cashback", "Up to 10%..."
  const m = t.match(/(\d+(\.\d+)?)\s*%/);
  if (!m) return null;
  const pct = Number(m[1]);
  return Number.isFinite(pct) && pct > 0 ? pct : null;
}

function pctNearKeyword(text: string | null, keyword: string): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const k = keyword.toLowerCase();
  const idx = t.indexOf(k);
  if (idx < 0) return null;
  const window = t.slice(
    Math.max(0, idx - 60),
    Math.min(t.length, idx + k.length + 60)
  );
  const matches = [...window.matchAll(/(\d+(\.\d+)?)\s*%/g)].map((m) => Number(m[1]));
  const valid = matches.filter((n) => Number.isFinite(n) && n > 0 && n <= 25);
  if (valid.length === 0) return null;
  return Math.max(...valid);
}

function airlineKeyword(
  id: UserProfile["spendContext"] extends infer X
    ? X extends { travel?: { preferredAirline: infer A } }
      ? A
      : never
    : never
): string | null {
  if (id === "indigo") return "indigo";
  if (id === "air_india") return "air india";
  if (id === "vistara") return "vistara";
  return null;
}

function buildSpendSplit(profile: UserProfile): SpendByCategory {
  // Heuristic split:
  // - 60% into top categories (evenly)
  // - remaining 40% into others (evenly)
  const cats = ["dining", "travel", "shopping", "fuel"] as const;
  const top = new Set(profile.topCategories.map((c) => c.toLowerCase()));
  const topCats = cats.filter((c) => top.has(c));
  const otherCats = cats.filter((c) => !top.has(c));
  const spend = profile.monthlySpend;

  const result: SpendByCategory = { dining: 0, travel: 0, shopping: 0, fuel: 0 };
  const topPortion = spend * 0.6;
  const otherPortion = spend * 0.4;

  const topEach = topCats.length > 0 ? topPortion / topCats.length : 0;
  const otherEach = otherCats.length > 0 ? otherPortion / otherCats.length : otherPortion / cats.length;

  for (const c of cats) {
    if (topCats.includes(c)) result[c] = topEach;
    else result[c] = otherEach;
  }
  return result;
}

function textHaystack(card: CardRowForScoring): string {
  return `${card.card_name} ${card.bank} ${card.best_for ?? ""} ${card.key_benefits ?? ""} ${
    card.lounge_access ?? ""
  } ${card.reward_rate ?? ""}`.toLowerCase();
}

function profileCategorySlugs(profile: UserProfile): SpendCategorySlug[] {
  const allowed: SpendCategorySlug[] = ["dining", "travel", "shopping", "fuel"];
  return profile.topCategories
    .map((c) => c.toLowerCase())
    .filter((c): c is SpendCategorySlug =>
      allowed.includes(c as SpendCategorySlug)
    );
}

function categoryPct(card: CardRowForScoring, slug: SpendCategorySlug): number {
  const pct = rewardPctForSpendCategory(
    {
      card_name: card.card_name,
      bank: card.bank,
      network: (card.network as any) ?? undefined,
      reward_type: card.reward_type,
      best_for: card.best_for,
      reward_rate: card.reward_rate,
      metadata: card.metadata ?? null,
      key_benefits: card.key_benefits ?? null,
      dining_reward: card.dining_reward ?? null,
      travel_reward: card.travel_reward ?? null,
      shopping_reward: card.shopping_reward ?? null,
      fuel_reward: card.fuel_reward ?? null,
    },
    slug
  );
  return typeof pct === "number" && Number.isFinite(pct) && pct > 0 ? pct : 0;
}

function categoryMatchScore(card: CardRowForScoring, profile: UserProfile): number {
  const focusCats = profileCategorySlugs(profile);
  if (focusCats.length === 0) return 0.5;

  const focusPcts = focusCats.map((slug) => categoryPct(card, slug));
  const avgFocusPct =
    focusPcts.reduce((sum, value) => sum + value, 0) / Math.max(1, focusPcts.length);
  const bestFocusedPct = Math.max(...focusPcts, 0);

  // Strongly prefer cards with genuinely good earn on selected focus categories.
  return clamp01(avgFocusPct / 8) * 0.65 + clamp01(bestFocusedPct / 10) * 0.35;
}

function focusCategoryPenalty(card: CardRowForScoring, profile: UserProfile): number {
  const focusCats = profileCategorySlugs(profile);
  if (focusCats.length === 0) return 0;

  const weakestFocusedPct = Math.min(...focusCats.map((slug) => categoryPct(card, slug)));
  if (weakestFocusedPct >= 3) return 0;
  if (weakestFocusedPct > 0) return 0.08;
  return 0.18;
}

function lifestyleFitScore(card: CardRowForScoring, profile: UserProfile): number {
  const hay = textHaystack(card);
  if (profile.lifestyle.length === 0) return 0.5; // neutral
  const hits = profile.lifestyle
    .map((x) => x.toLowerCase())
    .filter((x) => x && (hay.includes(x) || (x === "traveler" && (hay.includes("travel") || hay.includes("lounge")))))
    .length;
  return clamp01(hits / Math.max(1, profile.lifestyle.length));
}

function rewardTypeAlignment(card: CardRowForScoring, profile: UserProfile): number {
  const pref = profile.preferredRewardType === "miles" ? "points" : profile.preferredRewardType;
  return card.reward_type === pref ? 1 : 0.35;
}

export function calculateYearlyValue(card: CardRowForScoring, profile: UserProfile): YearlyValue {
  const annualFee = Number.isFinite(card.annual_fee) ? card.annual_fee : 0;
  const spendSplit = buildSpendSplit(profile);

  // Primary: if category columns exist, compute from category pct model.
  const hasCategoryCols =
    typeof card.dining_reward === "number" ||
    typeof card.travel_reward === "number" ||
    typeof card.shopping_reward === "number" ||
    typeof card.fuel_reward === "number";

  let yearlyReward = 0;
  if (hasCategoryCols) {
    yearlyReward = rewardCalculator.computeYearlyRewards(spendSplit, {
      card_name: card.card_name,
      bank: card.bank,
      reward_type: card.reward_type,
      reward_rate: card.reward_rate,
      network: (card.network as any) ?? null,
      best_for: card.best_for,
      key_benefits: card.key_benefits,
      metadata: card.metadata ?? null,
      dining_reward: card.dining_reward ?? null,
      travel_reward: card.travel_reward ?? null,
      shopping_reward: card.shopping_reward ?? null,
      fuel_reward: card.fuel_reward ?? null,
    }).yearlyTotal;
  } else {
    // Fallback: parse a global % from reward_rate text (best-effort).
    const pct = toPctMaybe(card.reward_rate);
    if (pct != null) {
      yearlyReward = profile.monthlySpend * 12 * (pct / 100);
    } else {
      yearlyReward = 0;
    }
  }

  // Optional spend context uplift: adjust only when user specifies a primary app/airline
  // and card text clearly indicates the same co-brand / affinity.
  const hay = textHaystack(card);

  const baseShoppingPct = categoryPct(card, "shopping");
  const baseDiningPct = categoryPct(card, "dining");
  const baseTravelPct = categoryPct(card, "travel");

  const shoppingCtx = profile.spendContext?.shopping;
  if (shoppingCtx) {
    const onlineMonthly = spendSplit.shopping * (shoppingCtx.onlinePct / 100);
    const merchantShare = 0.85; // assume most online spend on the chosen merchant

    if (shoppingCtx.preferredMerchant === "flipkart" && hay.includes("flipkart")) {
      const boostedPct = pctNearKeyword(card.reward_rate, "flipkart") ?? toPctMaybe(card.reward_rate);
      if (typeof boostedPct === "number" && boostedPct > baseShoppingPct) {
        yearlyReward += onlineMonthly * merchantShare * 12 * ((boostedPct - baseShoppingPct) / 100);
      }
    }

    if (shoppingCtx.preferredMerchant === "amazon" && hay.includes("amazon")) {
      const boostedPct = pctNearKeyword(card.reward_rate, "amazon") ?? toPctMaybe(card.reward_rate);
      if (typeof boostedPct === "number" && boostedPct > baseShoppingPct) {
        yearlyReward += onlineMonthly * merchantShare * 12 * ((boostedPct - baseShoppingPct) / 100);
      }
    }
  }

  const diningCtx = profile.spendContext?.dining;
  if (diningCtx) {
    const deliveryMonthly = spendSplit.dining * (diningCtx.deliveryPct / 100);
    const appShare = 0.85; // assume most delivery spend is on selected app

    if (diningCtx.preferredApp === "swiggy" && hay.includes("swiggy")) {
      const boostedPct = pctNearKeyword(card.reward_rate, "swiggy") ?? toPctMaybe(card.reward_rate);
      if (typeof boostedPct === "number" && boostedPct > baseDiningPct) {
        yearlyReward += deliveryMonthly * appShare * 12 * ((boostedPct - baseDiningPct) / 100);
      }
    }

    if (diningCtx.preferredApp === "zomato" && hay.includes("zomato")) {
      const boostedPct = pctNearKeyword(card.reward_rate, "zomato") ?? toPctMaybe(card.reward_rate);
      if (typeof boostedPct === "number" && boostedPct > baseDiningPct) {
        yearlyReward += deliveryMonthly * appShare * 12 * ((boostedPct - baseDiningPct) / 100);
      }
    }
  }

  const travelCtx = profile.spendContext?.travel;
  const airlineKey = travelCtx ? airlineKeyword(travelCtx.preferredAirline) : null;
  if (travelCtx && airlineKey && hay.includes(airlineKey)) {
    const boostedPct =
      pctNearKeyword(card.reward_rate, airlineKey) ?? toPctMaybe(card.reward_rate);
    if (typeof boostedPct === "number" && boostedPct > baseTravelPct) {
      const flightsShare = travelCtx.modes.includes("flights")
        ? travelCtx.flightsPct / 100
        : 0.35;
      const flightsMonthly = spendSplit.travel * flightsShare;
      const airlineMonthly = flightsMonthly * 0.85; // assume most flights follow stated preference
      yearlyReward += airlineMonthly * 12 * ((boostedPct - baseTravelPct) / 100);
    }
  }

  const netGain = yearlyReward - annualFee;
  return {
    yearlyReward: Math.round(yearlyReward),
    annualFee: Math.round(annualFee),
    netGain: Math.round(netGain),
  };
}

export function scoreCard(card: CardRowForScoring, profile: UserProfile): number {
  // Weighted model:
  // - Category match (30%)
  // - Reward value estimation (30%)
  // - Fee efficiency (20%)
  // - Lifestyle fit (10%)
  // - Premium alignment (10%)
  const cat = categoryMatchScore(card, profile); // 0..1
  const value = calculateYearlyValue(card, profile);

  // Reward value score: scale net gain vs spend (cap)
  const yearlySpend = profile.monthlySpend * 12;
  const rewardValue = yearlySpend > 0 ? clamp01(value.yearlyReward / (yearlySpend * 0.12)) : 0; // 12% cap

  // Fee efficiency: net gain relative to spend; penalize high fees when sensitivity high
  const baseEff = yearlySpend > 0 ? clamp01((value.netGain + yearlySpend * 0.02) / (yearlySpend * 0.12)) : 0;
  const feePenalty =
    profile.feeSensitivity === "high"
      ? clamp01(card.annual_fee / 5000)
      : profile.feeSensitivity === "medium"
        ? clamp01(card.annual_fee / 10000)
        : clamp01(card.annual_fee / 20000);
  const feeEff = clamp01(baseEff * (1 - 0.55 * feePenalty));

  const lifestyle = lifestyleFitScore(card, profile);

  // Premium alignment: if feeSensitivity is low, premium cards are acceptable; otherwise reduce.
  const premium =
    profile.feeSensitivity === "low"
      ? clamp01(0.6 + 0.4 * (card.annual_fee > 1000 ? 1 : 0.3))
      : profile.feeSensitivity === "medium"
        ? clamp01(0.7 - 0.4 * (card.annual_fee > 2500 ? 1 : 0))
        : clamp01(0.8 - 0.7 * (card.annual_fee > 500 ? 1 : 0));

  const typeAlign = rewardTypeAlignment(card, profile); // 0..1
  const focusPenalty = focusCategoryPenalty(card, profile);

  const score01 = clamp01(
    0.3 * cat +
    0.3 * rewardValue * typeAlign +
    0.2 * feeEff +
    0.1 * lifestyle +
    0.1 * premium -
    focusPenalty
  );

  return Math.round(score01 * 100);
}

