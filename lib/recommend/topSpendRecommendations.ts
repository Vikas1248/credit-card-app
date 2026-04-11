import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  rewardCalculator,
  type SpendByCategory,
} from "@/lib/recommend/rewardCalculator";
import {
  rewardPctMidpointForSpendCategory,
  type SpendCategorySlug,
} from "@/lib/spendCategories";
import type { CardNetwork } from "@/lib/types/card";

const SELECT_FIELDS =
  "id, card_name, bank, network, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits, dining_reward, travel_reward, shopping_reward, fuel_reward, metadata";

type CreditCardRow = {
  id: string;
  card_name: string;
  bank: string;
  network: CardNetwork;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  key_benefits: string | null;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
  metadata: Record<string, unknown> | null;
};

export type SpendRecommendationRow = {
  id: string;
  card_name: string;
  bank: string;
  network: CardNetwork;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  yearly_reward_inr: number;
  breakdown: {
    dining: number;
    travel: number;
    shopping: number;
    fuel: number;
  };
  category_reward_pct: {
    dining: number | null;
    travel: number | null;
    shopping: number | null;
    fuel: number | null;
  };
  explanation?: string | null;
};

export function parseSpendInput(
  body: unknown
): { ok: true; spend: SpendByCategory } | { ok: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const o = body as Record<string, unknown>;
  const keys = ["dining", "travel", "shopping", "fuel"] as const;
  const spend = {} as SpendByCategory;
  for (const k of keys) {
    const v = o[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      return {
        ok: false,
        error: `Field "${k}" must be a non-negative finite number (average monthly spend in INR).`,
      };
    }
    spend[k] = v;
  }
  return { ok: true, spend };
}

function roundInr(n: number): number {
  return Math.round(n * 100) / 100;
}

function categoryMidpointOrNull(
  card: CreditCardRow,
  slug: SpendCategorySlug
): number | null {
  const m = rewardPctMidpointForSpendCategory(
    {
      card_name: card.card_name,
      bank: card.bank,
      dining_reward: card.dining_reward,
      travel_reward: card.travel_reward,
      shopping_reward: card.shopping_reward,
      fuel_reward: card.fuel_reward,
      network: card.network,
      reward_type: card.reward_type,
      best_for: card.best_for,
      reward_rate: card.reward_rate,
      metadata: card.metadata,
      key_benefits: card.key_benefits,
    },
    slug
  );
  return m > 0 ? m : null;
}

export async function topSpendRecommendations(
  monthlySpend: SpendByCategory,
  limit = 3
): Promise<{
  assumptions: Record<string, string>;
  input_monthly_inr: SpendByCategory;
  recommendations: SpendRecommendationRow[];
}> {
  const supabase = getSupabaseServerClient();
  const envNetwork = getOptionalCardNetworkFilter();
  let q = supabase.from("credit_cards").select(SELECT_FIELDS);
  if (envNetwork) {
    q = q.eq("network", envNetwork);
  }
  const { data, error } = await q;

  if (error) {
    throw new Error(error.message);
  }

  const cards = (data ?? []) as CreditCardRow[];

  const recommendations: SpendRecommendationRow[] = cards
    .map((card) => {
      const { yearlyTotal, breakdown } = rewardCalculator.computeYearlyRewards(
        monthlySpend,
        {
          ...card,
          card_name: card.card_name,
          bank: card.bank,
          network: card.network,
          reward_type: card.reward_type,
          reward_rate: card.reward_rate,
          best_for: card.best_for,
          key_benefits: card.key_benefits,
          metadata: card.metadata,
        }
      );
      return {
        id: card.id,
        card_name: card.card_name,
        bank: card.bank,
        network: card.network,
        annual_fee: card.annual_fee,
        reward_type: card.reward_type,
        reward_rate: card.reward_rate,
        lounge_access: card.lounge_access,
        best_for: card.best_for,
        yearly_reward_inr: roundInr(yearlyTotal),
        breakdown: {
          dining: roundInr(breakdown.dining),
          travel: roundInr(breakdown.travel),
          shopping: roundInr(breakdown.shopping),
          fuel: roundInr(breakdown.fuel),
        },
        category_reward_pct: {
          dining: categoryMidpointOrNull(card, "dining"),
          travel: categoryMidpointOrNull(card, "travel"),
          shopping: categoryMidpointOrNull(card, "shopping"),
          fuel: categoryMidpointOrNull(card, "fuel"),
        },
      };
    })
    .sort((a, b) => {
      if (b.yearly_reward_inr !== a.yearly_reward_inr) {
        return b.yearly_reward_inr - a.yearly_reward_inr;
      }
      if (a.annual_fee !== b.annual_fee) return a.annual_fee - b.annual_fee;
      return a.card_name.localeCompare(b.card_name);
    })
    .slice(0, limit);

  return {
    assumptions: {
      spend_is_monthly_inr:
        "dining, travel, shopping, fuel are interpreted as average monthly spend in INR.",
      reward_columns_are_percent:
        "Category % uses issuer-specific rules when available (SBI/Axis from catalog copy; else DB columns; Amex from MR metadata). Midpoint used for summary numbers.",
    },
    input_monthly_inr: monthlySpend,
    recommendations,
  };
}
