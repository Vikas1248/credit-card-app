import {
  deriveAmexCategoryRange,
  type CategoryPctRange,
} from "@/lib/cards/amexCategoryRewards";

export type SpendCategorySlug = "dining" | "travel" | "shopping" | "fuel";

export const SPEND_CATEGORY_SLUGS: readonly SpendCategorySlug[] = [
  "dining",
  "travel",
  "shopping",
  "fuel",
] as const;

export type CardWithCategoryRewards = {
  card_name: string;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
};

/** Optional fields used to derive Amex points earn % from `metadata` when DB columns are empty. */
export type CardWithCategoryRewardsInput = CardWithCategoryRewards & {
  network?: string;
  reward_type?: "cashback" | "points";
  best_for?: string | null;
  reward_rate?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const SPEND_CATEGORIES: readonly {
  slug: SpendCategorySlug;
  label: string;
  blurb: string;
  tileHint: string;
}[] = [
  {
    slug: "dining",
    label: "Dining",
    blurb: "Cards that reward restaurants, delivery, and dining out.",
    tileHint: "Restaurants & delivery",
  },
  {
    slug: "travel",
    label: "Travel",
    blurb: "Cards with stronger travel and lounge-style perks.",
    tileHint: "Flights, hotels & lounges",
  },
  {
    slug: "shopping",
    label: "Shopping",
    blurb: "Cards tuned for retail and online shopping rewards.",
    tileHint: "Retail & online spends",
  },
  {
    slug: "fuel",
    label: "Fuel",
    blurb: "Cards with better returns on fuel and pumps.",
    tileHint: "Pumps & fuel spends",
  },
] as const;

export function isSpendCategorySlug(s: string): s is SpendCategorySlug {
  return (SPEND_CATEGORY_SLUGS as readonly string[]).includes(s);
}

export function spendCategoryBySlug(
  slug: SpendCategorySlug
): (typeof SPEND_CATEGORIES)[number] {
  const c = SPEND_CATEGORIES.find((x) => x.slug === slug);
  if (!c) throw new Error(`Unknown category slug: ${slug}`);
  return c;
}

function storedCategoryPct(
  card: CardWithCategoryRewards,
  slug: SpendCategorySlug
): number | null {
  const v =
    slug === "dining"
      ? card.dining_reward
      : slug === "travel"
        ? card.travel_reward
        : slug === "shopping"
          ? card.shopping_reward
          : card.fuel_reward;
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  return v;
}

/**
 * Min–max earn % for a category. Uses DB columns when set; otherwise derives Amex MR
 * equivalent % (base 1pt value × earn rate, plus milestones / accelerators in `max`).
 */
export function rewardPctRangeForSpendCategory(
  card: CardWithCategoryRewardsInput,
  slug: SpendCategorySlug
): CategoryPctRange | null {
  const stored = storedCategoryPct(card, slug);
  if (stored != null) return { min: stored, max: stored };

  const extended = card as CardWithCategoryRewardsInput;
  const derived = deriveAmexCategoryRange(
    {
      network: String(extended.network ?? ""),
      reward_type: String(extended.reward_type ?? ""),
      card_name: card.card_name,
      best_for: extended.best_for ?? null,
      reward_rate: extended.reward_rate ?? null,
      metadata: extended.metadata,
    },
    slug
  );
  return derived;
}

/** Single % for sorting and simple UI: max of the range (optimistic / “up to”). */
export function rewardPctForSpendCategory(
  card: CardWithCategoryRewardsInput,
  slug: SpendCategorySlug
): number | null {
  const r = rewardPctRangeForSpendCategory(card, slug);
  if (!r || !Number.isFinite(r.max) || r.max <= 0) return null;
  return r.max;
}

/** Midpoint of range for rough yearly reward math when only derived Amex data exists. */
export function rewardPctMidpointForSpendCategory(
  card: CardWithCategoryRewardsInput,
  slug: SpendCategorySlug
): number {
  const r = rewardPctRangeForSpendCategory(card, slug);
  if (!r) return 0;
  return (r.min + r.max) / 2;
}

export function formatCategoryRewardPctRange(range: CategoryPctRange | null): string {
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) return "—";
  if (Math.abs(range.max - range.min) < 0.05) return `${range.max}%`;
  return `${range.min}%–${range.max}%`;
}

/** Higher category reward first; unknown rates last; then name. */
export function compareCardsBySpendCategory(
  slug: SpendCategorySlug,
  a: CardWithCategoryRewardsInput,
  b: CardWithCategoryRewardsInput
): number {
  const ar = rewardPctForSpendCategory(a, slug);
  const br = rewardPctForSpendCategory(b, slug);
  const as = ar ?? -1;
  const bs = br ?? -1;
  if (bs !== as) return bs - as;
  return a.card_name.localeCompare(b.card_name);
}
