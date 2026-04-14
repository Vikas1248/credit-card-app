"use client";

import { SpendCategoryIcon } from "@/components/spend-category-icons";
import {
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
  rewardPct: number;
};

const PRIMARY_TAG_CATEGORY_ORDER: (typeof SPEND_CATEGORY_SLUGS)[number][] = [
  "travel",
  "dining",
  "shopping",
  "fuel",
];

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
  let best: { slug: (typeof SPEND_CATEGORY_SLUGS)[number]; max: number } | null = null;

  for (const slug of PRIMARY_TAG_CATEGORY_ORDER) {
    const range = rewardPctRangeForSpendCategory(input, slug);
    if (!range || range.max <= 0) continue;
    if (!best || range.max > best.max) best = { slug, max: range.max };
  }

  if (!best) return null;

  const range = rewardPctRangeForSpendCategory(input, best.slug);
  if (!range) return null;
  return {
    slug: best.slug,
    label: spendCategoryBySlug(best.slug).label,
    rewardPct: range.max,
  };
}

function categoryToneClass(
  slug: (typeof SPEND_CATEGORY_SLUGS)[number],
  tone: "light" | "dark"
): string {
  if (tone === "dark") {
    switch (slug) {
      case "dining":
        return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
      case "travel":
        return "border-sky-300/35 bg-sky-400/10 text-sky-100";
      case "shopping":
        return "border-violet-300/35 bg-violet-400/10 text-violet-100";
      case "fuel":
        return "border-amber-300/35 bg-amber-400/10 text-amber-100";
      default:
        return "border-sky-300/35 bg-sky-400/10 text-sky-100";
    }
  }

  switch (slug) {
    case "dining":
      return "border-emerald-200/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-100";
    case "travel":
      return "border-blue-200/80 bg-blue-50/90 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-100";
    case "shopping":
      return "border-violet-200/80 bg-violet-50/90 text-violet-900 dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-100";
    case "fuel":
      return "border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100";
    default:
      return "border-blue-200/80 bg-blue-50/90 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-100";
  }
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

  const classes = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryToneClass(top.slug, tone)}`;

  return (
    <span className={classes} title={`Highest reward on ${top.label}`}>
      <SpendCategoryIcon slug={top.slug} className="h-3.5 w-3.5" />
      <span>
        {top.label} {top.rewardPct}%
      </span>
    </span>
  );
}
