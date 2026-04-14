"use client";

import { SpendCategoryIcon } from "@/components/spend-category-icons";
import {
  formatCategoryRewardPctRange,
  rewardPctRangeForSpendCategory,
  SPEND_CATEGORY_SLUGS,
  spendCategoryBySlug,
  type CardWithCategoryRewardsInput,
} from "@/lib/spendCategories";

type CardTopRewardTagInput = Omit<
  CardWithCategoryRewardsInput,
  "dining_reward" | "travel_reward" | "shopping_reward" | "fuel_reward"
> & {
  dining_reward?: number | null;
  travel_reward?: number | null;
  shopping_reward?: number | null;
  fuel_reward?: number | null;
  category_reward_pct?: {
    dining: number | null;
    travel: number | null;
    shopping: number | null;
    fuel: number | null;
  };
};

type TopRewardTag = {
  slug: (typeof SPEND_CATEGORY_SLUGS)[number];
  label: string;
  rewardText: string;
};

function normalizedCardInput(card: CardTopRewardTagInput): CardWithCategoryRewardsInput {
  return {
    ...card,
    dining_reward: card.dining_reward ?? card.category_reward_pct?.dining ?? null,
    travel_reward: card.travel_reward ?? card.category_reward_pct?.travel ?? null,
    shopping_reward:
      card.shopping_reward ?? card.category_reward_pct?.shopping ?? null,
    fuel_reward: card.fuel_reward ?? card.category_reward_pct?.fuel ?? null,
  };
}

function resolveTopRewardTag(card: CardTopRewardTagInput): TopRewardTag | null {
  const input = normalizedCardInput(card);
  let best: { slug: (typeof SPEND_CATEGORY_SLUGS)[number]; max: number; min: number } | null =
    null;

  for (const slug of SPEND_CATEGORY_SLUGS) {
    const range = rewardPctRangeForSpendCategory(input, slug);
    if (!range || range.max <= 0) continue;
    if (
      !best ||
      range.max > best.max ||
      (Math.abs(range.max - best.max) < 1e-9 && range.min > best.min)
    ) {
      best = { slug, max: range.max, min: range.min };
    }
  }

  if (!best) return null;

  const range = rewardPctRangeForSpendCategory(input, best.slug);
  if (!range) return null;
  return {
    slug: best.slug,
    label: spendCategoryBySlug(best.slug).label,
    rewardText: formatCategoryRewardPctRange(range),
  };
}

export function CardTopRewardTag({
  card,
  tone = "light",
}: {
  card: CardTopRewardTagInput;
  tone?: "light" | "dark";
}) {
  const top = resolveTopRewardTag(card);
  if (!top) return null;

  const classes =
    tone === "dark"
      ? "inline-flex items-center gap-1.5 rounded-full border border-sky-300/35 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100"
      : "inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/90 px-2.5 py-1 text-[11px] font-semibold text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-100";

  return (
    <span className={classes} title={`Highest reward on ${top.label}`}>
      <SpendCategoryIcon slug={top.slug} className="h-3.5 w-3.5" />
      <span>
        {top.label} {top.rewardText}
      </span>
    </span>
  );
}
