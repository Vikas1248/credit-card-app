import {
  deriveAmexCategoryRange,
  type CategoryPctRange,
} from "@/lib/cards/amexCategoryRewards";
import {
  deriveSbiAxisCategoryRange,
  isSbiAxisCatalogBank,
} from "@/lib/cards/sbiAxisCategoryRewards";

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

/** Optional fields used to derive issuer-specific earn % from `metadata` / copy. */
export type CardWithCategoryRewardsInput = CardWithCategoryRewards & {
  bank?: string | null;
  network?: string;
  reward_type?: "cashback" | "points" | string;
  best_for?: string | null;
  reward_rate?: string | null;
  metadata?: Record<string, unknown> | null;
  key_benefits?: string | null;
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
 * Min–max earn % for a category. SBI / Axis prefer catalog-derived ranges from copy +
 * reward_conversion (avoids mis-scaled manual columns). Then DB columns if set; else Amex MR.
 */
export function rewardPctRangeForSpendCategory(
  card: CardWithCategoryRewardsInput,
  slug: SpendCategorySlug
): CategoryPctRange | null {
  const extended = card as CardWithCategoryRewardsInput;
  const cardNameNorm = String(extended.card_name ?? "").toLowerCase();

  // Conservative Tata Neu Infinity cap: show partner-brand tier, not app-max tier.
  if (cardNameNorm.includes("tata neu infinity hdfc bank credit card")) {
    if (slug === "dining") return { min: 1.5, max: 1.5 };
    if (slug === "travel") return { min: 1.5, max: 1.5 };
    if (slug === "shopping") return { min: 1.5, max: 5 };
    if (slug === "fuel") return { min: 0, max: 0 };
  }
  if (cardNameNorm.includes("tata neu plus hdfc bank credit card")) {
    if (slug === "dining") return { min: 1, max: 1 };
    if (slug === "travel") return { min: 1, max: 1 };
    if (slug === "shopping") return { min: 1, max: 2 };
    if (slug === "fuel") return { min: 0, max: 0 };
  }
  if (cardNameNorm.includes("swiggy hdfc bank credit card")) {
    if (slug === "dining") return { min: 1, max: 5 };
    if (slug === "travel") return { min: 1, max: 1 };
    if (slug === "shopping") return { min: 1, max: 5 };
    if (slug === "fuel") return { min: 0, max: 0 };
  }

  const bankStr = String(extended.bank ?? "");
  if (isSbiAxisCatalogBank(bankStr)) {
    const sbiAxis = deriveSbiAxisCategoryRange(
      {
        bank: bankStr,
        card_name: card.card_name,
        reward_type: String(extended.reward_type ?? ""),
        reward_rate: extended.reward_rate ?? null,
        metadata: extended.metadata,
        key_benefits: extended.key_benefits ?? null,
        fuel_reward_column: extended.fuel_reward ?? null,
      },
      slug
    );
    if (sbiAxis != null) return sbiAxis;
  }

  const stored = storedCategoryPct(card, slug);
  if (stored != null) return { min: stored, max: stored };

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

/** Midpoint of range for rough yearly reward math when derived data is used. */
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

/**
 * Premium Amex India cards that are marketed and modeled as travel-first, even when
 * partner-accelerated shopping % ties or beats base travel in our heuristic ranges.
 */
export function isAmexCatalogTravelPrimaryCard(
  card: CardWithCategoryRewardsInput
): boolean {
  if (String(card.network) !== "Amex" || String(card.reward_type) !== "points") {
    return false;
  }
  const n = String(card.card_name ?? "").toLowerCase();
  if (n.includes("platinum reserve")) return true;
  if (n.includes("platinum travel")) return true;
  if (
    n.includes("american express") &&
    /\bplatinum\s+card\b/.test(n) &&
    !n.includes("travel") &&
    !n.includes("reserve")
  ) {
    return true;
  }
  return false;
}

/**
 * Which spend bucket this card is "strongest" in for category browse / filters.
 * On equal earn %, prefers shopping → dining → travel → fuel (avoids flat cashback
 * cards defaulting to travel when travel was iterated first).
 */
export function primarySpendCategorySlug(
  card: CardWithCategoryRewardsInput
): SpendCategorySlug | null {
  if (isAmexCatalogTravelPrimaryCard(card)) return "travel";

  const tieBreak: SpendCategorySlug[] = ["shopping", "dining", "travel", "fuel"];
  const scan: SpendCategorySlug[] = ["dining", "travel", "shopping", "fuel"];
  let best: { slug: SpendCategorySlug; pct: number } | null = null;
  for (const s of scan) {
    const pct = rewardPctForSpendCategory(card, s);
    if (pct == null || pct <= 0) continue;
    if (!best) {
      best = { slug: s, pct };
      continue;
    }
    if (pct > best.pct) {
      best = { slug: s, pct };
    } else if (pct === best.pct) {
      if (tieBreak.indexOf(s) < tieBreak.indexOf(best.slug)) {
        best = { slug: s, pct };
      }
    }
  }
  return best?.slug ?? null;
}
