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

export function rewardPctForSpendCategory(
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

/** Higher category reward first; unknown rates last; then name. */
export function compareCardsBySpendCategory(
  slug: SpendCategorySlug,
  a: CardWithCategoryRewards,
  b: CardWithCategoryRewards
): number {
  const ar = rewardPctForSpendCategory(a, slug);
  const br = rewardPctForSpendCategory(b, slug);
  const as = ar ?? -1;
  const bs = br ?? -1;
  if (bs !== as) return bs - as;
  return a.card_name.localeCompare(b.card_name);
}
