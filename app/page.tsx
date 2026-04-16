"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AmexGenericApplyLink } from "@/components/amex-generic-apply-link";
import { AmexPlatinumReserveApplyLink } from "@/components/amex-platinum-reserve-apply-link";
import { AxisApplyLink } from "@/components/axis-apply-link";
import { CardTopRewardTag } from "@/components/card-top-reward-tag";
import { FeaturedCardsCarousel } from "@/components/featured-cards-carousel";
import { HdfcApplyLink } from "@/components/hdfc-apply-link";
import { IndusIndApplyLink } from "@/components/indusind-apply-link";
import { SbiApplyLink } from "@/components/sbi-apply-link";
import { isAmexCardUsingGenericApply } from "@/lib/cards/amexGenericApply";
import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";
import { isAxisBankCard } from "@/lib/cards/axisApply";
import { hdfcCardShowsApply } from "@/lib/cards/hdfcApply";
import { indusindCardShowsApply } from "@/lib/cards/indusindApply";
import { isSbiCard } from "@/lib/cards/sbiApply";
import { SpendCategoryIcon } from "@/components/spend-category-icons";
import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
import { issuerBrandTileClass } from "@/lib/cards/issuerBrandTile";
import { SITE_ABOUT_LEAD, SITE_NAME } from "@/lib/site";
import { cardViewDetailsButtonClass } from "@/lib/cardCta";
import {
  formatCategoryRewardPctRange,
  rewardPctForSpendCategory,
  rewardPctRangeForSpendCategory,
  SPEND_CATEGORIES,
  type SpendCategorySlug,
} from "@/lib/spendCategories";
import type { CardNetwork } from "@/lib/types/card";

type CreditCard = {
  id: string;
  card_name: string;
  bank: string;
  network: CardNetwork;
  joining_fee: number;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  key_benefits: string | null;
  last_updated: string;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
  metadata?: Record<string, unknown> | null;
};

type RewardBreakdown = {
  dining: number;
  travel: number;
  shopping: number;
  fuel: number;
};

type SpendRecommendation = {
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
  breakdown: RewardBreakdown;
  category_reward_pct?: {
    dining: number | null;
    travel: number | null;
    shopping: number | null;
    fuel: number | null;
  };
  explanation?: string | null;
};

const CATEGORY_LABELS: { key: keyof RewardBreakdown; label: string }[] = [
  { key: "dining", label: "Dining" },
  { key: "travel", label: "Travel" },
  { key: "shopping", label: "Shopping" },
  { key: "fuel", label: "Fuel" },
];

type SalaryBandId =
  | "r0_5"
  | "r5_10"
  | "r10_25"
  | "r25_50"
  | "r50_plus";

type MonthlySpendBandId =
  | "under_20k"
  | "20k_50k"
  | "50k_100k"
  | "100k_plus";

type FeePreferenceId = "lifetime_free" | "low_fee" | "premium_ok";

type LifestyleNeedId =
  | "movie_offer"
  | "lounge_domestic"
  | "lounge_international"
  | "golf";

const SALARY_BAND_OPTIONS: { id: SalaryBandId; label: string }[] = [
  { id: "r0_5", label: "0-5 lakh" },
  { id: "r5_10", label: "5-10 lakh" },
  { id: "r10_25", label: "10-25 lakh" },
  { id: "r25_50", label: "25-50 lakh" },
  { id: "r50_plus", label: "50 lakh & above" },
];

const SALARY_BAND_SPEND_PRESETS: Record<
  SalaryBandId,
  { dining: number; travel: number; shopping: number; fuel: number }
> = {
  r0_5: { dining: 4000, travel: 2000, shopping: 5000, fuel: 3000 },
  r5_10: { dining: 8000, travel: 5000, shopping: 12000, fuel: 6000 },
  r10_25: { dining: 15000, travel: 12000, shopping: 22000, fuel: 9000 },
  r25_50: { dining: 25000, travel: 20000, shopping: 35000, fuel: 12000 },
  r50_plus: { dining: 40000, travel: 35000, shopping: 60000, fuel: 18000 },
};

const MONTHLY_SPEND_BAND_OPTIONS: {
  id: MonthlySpendBandId;
  label: string;
  multiplier: number;
}[] = [
  { id: "under_20k", label: "Under Rs20k / month", multiplier: 0.7 },
  { id: "20k_50k", label: "Rs20k-Rs50k / month", multiplier: 1 },
  { id: "50k_100k", label: "Rs50k-Rs100k / month", multiplier: 1.45 },
  { id: "100k_plus", label: "Rs100k+ / month", multiplier: 2 },
];

const FEE_PREFERENCE_OPTIONS: { id: FeePreferenceId; label: string }[] = [
  { id: "lifetime_free", label: "Lifetime free only" },
  { id: "low_fee", label: "Low annual fee preferred" },
  { id: "premium_ok", label: "Premium fee is okay" },
];

const LIFESTYLE_NEED_OPTIONS: { id: LifestyleNeedId; label: string }[] = [
  { id: "movie_offer", label: "Movie 1+1 offers" },
  { id: "lounge_domestic", label: "Domestic lounge" },
  { id: "lounge_international", label: "International lounge" },
  { id: "golf", label: "Golf benefits" },
];

type FeaturedGroup = {
  id: "best-overall" | "cashback" | "travel" | "lifetime-free";
  title: string;
  subtitle: string;
  cards: CreditCard[];
};

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value}%`;
}

function cardCategoryInput(card: CreditCard) {
  return {
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
    key_benefits: card.key_benefits ?? null,
    metadata: card.metadata ?? null,
  };
}

function topCategoryReward(card: CreditCard): {
  category: keyof RewardBreakdown;
  value: number;
} | null {
  const keys: SpendCategorySlug[] = ["dining", "travel", "shopping", "fuel"];
  const valid = keys
    .map((k) => [k, rewardPctForSpendCategory(cardCategoryInput(card), k)] as const)
    .filter(
      (entry): entry is [SpendCategorySlug, number] =>
        entry[1] != null && entry[1] > 0
    );
  if (valid.length === 0) return null;
  valid.sort((a, b) => b[1] - a[1]);
  return { category: valid[0][0], value: valid[0][1] };
}

function categoryLabel(key: keyof RewardBreakdown): string {
  return CATEGORY_LABELS.find((c) => c.key === key)?.label ?? key;
}

function categoryEarnDisplay(card: CreditCard, key: SpendCategorySlug): string {
  return formatCategoryRewardPctRange(
    rewardPctRangeForSpendCategory(cardCategoryInput(card), key)
  );
}

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400";

const btnPrimary =
  "inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-55 dark:hover:bg-blue-500 sm:w-auto";

const btnGhost =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const sectionShell =
  "rounded-3xl border border-zinc-300/90 bg-white p-8 shadow-md shadow-zinc-900/[0.06] ring-1 ring-zinc-950/[0.04] dark:border-zinc-600 dark:bg-zinc-900/70 dark:shadow-black/40 dark:ring-white/[0.06] sm:p-10";

/** In-page section titles (distinct from sticky page header). */
const sectionTitleClass =
  "text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl";

const sectionLeadClass =
  "mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400";

const sectionHeaderRowClass =
  "flex gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-600 sm:gap-4";

const sectionHeaderAccentClass =
  "mt-2 h-11 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shadow-sm shadow-blue-500/30";

const headerInputClass =
  "w-full rounded-2xl border border-zinc-200 bg-zinc-50/90 py-3 pl-11 pr-4 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500";

const headerNavLinkClass =
  "shrink-0 rounded-full border border-transparent px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-200 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-100";

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? "h-4 w-4"}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function HomeSearchBar({
  id,
  className,
  search,
  onSearchChange,
}: {
  id?: string;
  className?: string;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div
      id={id}
      className={`relative min-w-0 scroll-mt-28 ${className ?? ""}`}
    >
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.2-5.2M11 18a7 7 0 100-14 7 7 0 000 14z"
          />
        </svg>
      </span>
      <input
        type="search"
        name="q"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search cards or banks…"
        className={headerInputClass}
        aria-label="Search cards"
      />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-xl pr-2 text-zinc-900 dark:text-zinc-100"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold leading-tight text-white shadow-md"
              aria-hidden
            >
              CG
            </span>
            <span className="text-sm font-bold tracking-tight">{SITE_NAME}</span>
          </Link>

          <nav
            className="flex gap-1 overflow-x-auto rounded-full border border-zinc-200/80 bg-zinc-50/90 p-1 pb-1 sm:pb-1 dark:border-zinc-700/80 dark:bg-zinc-900/70 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Sections"
          >
            {(
              [
                ["#search", "Search"],
                ["#categories", "Categories"],
                ["#featured", "Featured"],
                ["#spend-picks", "Top spends"],
                ["#compare", "Compare"],
              ] as const
            ).map(([href, label]) => (
              <a key={href} href={href} className={headerNavLinkClass}>
                {label}
              </a>
            ))}
            <Link href="/cards" className={headerNavLinkClass}>
              All cards
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function PicksSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [search, setSearch] = useState("");
  const [salaryBand, setSalaryBand] = useState<SalaryBandId>("r5_10");
  const [monthlySpendBand, setMonthlySpendBand] =
    useState<MonthlySpendBandId>("20k_50k");
  const [topCategories, setTopCategories] = useState<SpendCategorySlug[]>([
    "shopping",
    "dining",
  ]);
  const [existingCardIds, setExistingCardIds] = useState<string[]>([]);
  const [feePreference, setFeePreference] = useState<FeePreferenceId>("low_fee");
  const [lifestyleNeeds, setLifestyleNeeds] = useState<LifestyleNeedId[]>([]);
  const [wizardStep, setWizardStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spendDining, setSpendDining] = useState("8000");
  const [spendTravel, setSpendTravel] = useState("5000");
  const [spendShopping, setSpendShopping] = useState("12000");
  const [spendFuel, setSpendFuel] = useState("6000");
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null
  );
  const [recommendationNotice, setRecommendationNotice] = useState<string | null>(
    null
  );
  const [recommendations, setRecommendations] = useState<SpendRecommendation[]>(
    []
  );
  const [recommendationSummary, setRecommendationSummary] = useState<
    string | null
  >(null);
  const [compareIdA, setCompareIdA] = useState("");
  const [compareIdB, setCompareIdB] = useState("");
  const [featuredFromAi, setFeaturedFromAi] = useState<
    { card: CreditCard; tag: string }[] | null
  >(null);
  const [compareAi, setCompareAi] = useState<{
    overview: string;
    when_left_better: string;
    when_right_better: string;
    caveat: string;
  } | null>(null);
  const [compareAiLoading, setCompareAiLoading] = useState(false);
  const [compareAiError, setCompareAiError] = useState<string | null>(null);

  const toggleTopCategory = (slug: SpendCategorySlug) => {
    setTopCategories((prev) => {
      if (prev.includes(slug)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== slug);
      }
      return [...prev, slug];
    });
  };

  const toggleExistingCard = (cardId: string) => {
    setExistingCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((x) => x !== cardId) : [...prev, cardId]
    );
  };

  const toggleLifestyleNeed = (need: LifestyleNeedId) => {
    setLifestyleNeeds((prev) =>
      prev.includes(need) ? prev.filter((x) => x !== need) : [...prev, need]
    );
  };

  const buildWizardSpendPlan = () => {
    const base = SALARY_BAND_SPEND_PRESETS[salaryBand];
    const spendBand =
      MONTHLY_SPEND_BAND_OPTIONS.find((x) => x.id === monthlySpendBand) ??
      MONTHLY_SPEND_BAND_OPTIONS[1];
    const result: Record<SpendCategorySlug, number> = {
      dining: base.dining * spendBand.multiplier,
      travel: base.travel * spendBand.multiplier,
      shopping: base.shopping * spendBand.multiplier,
      fuel: base.fuel * spendBand.multiplier,
    };
    const selected = new Set(topCategories);
    for (const slug of ["dining", "travel", "shopping", "fuel"] as const) {
      const focusMultiplier =
        selected.size === 0 || selected.has(slug) ? 1.3 : 0.78;
      result[slug] = Math.max(0, Math.round((result[slug] * focusMultiplier) / 100) * 100);
    }
    return result;
  };

  const recommendationPreferenceScore = (card: SpendRecommendation): number => {
    let score = 0;

    if (feePreference === "lifetime_free") {
      score += card.annual_fee === 0 ? 2.5 : -5;
    } else if (feePreference === "low_fee") {
      if (card.annual_fee === 0) score += 2.2;
      else if (card.annual_fee <= 500) score += 1.6;
      else if (card.annual_fee <= 1000) score += 1;
      else if (card.annual_fee > 2500) score -= 1.2;
    }

    const categoryPct = card.category_reward_pct;
    if (categoryPct && topCategories.length > 0) {
      for (const slug of topCategories) {
        const pct = categoryPct[slug];
        if (typeof pct === "number" && Number.isFinite(pct)) {
          score += Math.min(2, pct / 3);
        }
      }
    }

    const haystack =
      `${card.reward_rate ?? ""} ${card.best_for ?? ""} ${card.lounge_access ?? ""} ${card.card_name}`.toLowerCase();
    for (const need of lifestyleNeeds) {
      if (
        (need === "movie_offer" &&
          (haystack.includes("movie") ||
            haystack.includes("bookmyshow") ||
            haystack.includes("cinema"))) ||
        (need === "lounge_domestic" &&
          (haystack.includes("domestic lounge") ||
            haystack.includes("domestic"))) ||
        (need === "lounge_international" &&
          (haystack.includes("international lounge") ||
            haystack.includes("priority pass") ||
            haystack.includes("international"))) ||
        (need === "golf" && haystack.includes("golf"))
      ) {
        score += 1.4;
      }
    }
    return score;
  };

  const recommendationText = (
    card: SpendRecommendation,
    sourceCard: CreditCard | null
  ): string => {
    const metaText =
      sourceCard?.metadata != null ? JSON.stringify(sourceCard.metadata) : "";
    return [
      card.card_name,
      card.bank,
      card.reward_rate ?? "",
      card.best_for ?? "",
      card.lounge_access ?? "",
      sourceCard?.key_benefits ?? "",
      metaText,
    ]
      .join(" ")
      .toLowerCase();
  };

  const cardMatchesLifestyleNeeds = (
    card: SpendRecommendation,
    sourceCard: CreditCard | null
  ): boolean => {
    if (lifestyleNeeds.length === 0) return true;
    const text = recommendationText(card, sourceCard);
    for (const need of lifestyleNeeds) {
      const matched =
        (need === "movie_offer" &&
          (text.includes("movie") ||
            text.includes("bookmyshow") ||
            text.includes("cinema"))) ||
        (need === "lounge_domestic" &&
          (text.includes("domestic lounge") || text.includes("domestic"))) ||
        (need === "lounge_international" &&
          (text.includes("international lounge") ||
            text.includes("priority pass") ||
            text.includes("international"))) ||
        (need === "golf" && text.includes("golf"));
      if (!matched) return false;
    }
    return true;
  };

  const cardMatchesTopCategorySelection = (card: SpendRecommendation): boolean => {
    if (topCategories.length === 0) return true;
    const pct = card.category_reward_pct;
    if (!pct) return false;
    const hasSelectedCategoryEarn = topCategories.some(
      (slug) => typeof pct[slug] === "number" && (pct[slug] ?? 0) > 0
    );
    return hasSelectedCategoryEarn;
  };

  const cardMatchesFeePreference = (card: SpendRecommendation): boolean => {
    if (feePreference === "lifetime_free") return card.annual_fee === 0;
    if (feePreference === "low_fee") return card.annual_fee <= 1000;
    return true;
  };

  const recommendationMatchesSelections = (
    card: SpendRecommendation,
    sourceCard: CreditCard | null
  ): boolean => {
    return (
      cardMatchesFeePreference(card) &&
      cardMatchesTopCategorySelection(card) &&
      cardMatchesLifestyleNeeds(card, sourceCard)
    );
  };

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: "200" });
      const catalogNetwork = getOptionalCardNetworkFilter();
      if (catalogNetwork) {
        params.set("network", catalogNetwork);
      }
      const response = await fetch(`/api/cards?${params.toString()}`, {
        cache: "no-store",
      });
      const result: { cards?: CreditCard[]; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to fetch cards");
      }

      setCards(result.cards ?? []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
  }, []);

  useEffect(() => {
    if (cards.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        const n = getOptionalCardNetworkFilter();
        if (n) params.set("network", n);
        const res = await fetch(`/api/cards/featured-ai?${params}`, {
          cache: "no-store",
        });
        const data: {
          source?: string;
          picks?: { card_id: string; tag: string }[];
        } = await res.json();
        if (cancelled) return;
        if (data.source !== "ai" || !Array.isArray(data.picks)) {
          setFeaturedFromAi([]);
          return;
        }
        const items: { card: CreditCard; tag: string }[] = [];
        for (const p of data.picks) {
          if (typeof p.card_id !== "string" || typeof p.tag !== "string") {
            continue;
          }
          const c = cards.find((x) => x.id === p.card_id);
          if (c) items.push({ card: c, tag: p.tag });
        }
        setFeaturedFromAi(items.length >= 3 ? items : []);
      } catch {
        if (!cancelled) setFeaturedFromAi([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cards]);

  const loadRecommendations = async () => {
    try {
      setRecommendationLoading(true);
      setRecommendationError(null);
      setRecommendationNotice(null);
      setRecommendationSummary(null);

      const wizardSpend = buildWizardSpendPlan();
      const dining = wizardSpend.dining;
      const travel = wizardSpend.travel;
      const shopping = wizardSpend.shopping;
      const fuel = wizardSpend.fuel;
      setSpendDining(String(dining));
      setSpendTravel(String(travel));
      setSpendShopping(String(shopping));
      setSpendFuel(String(fuel));
      const fields = [
        { name: "Dining", value: dining },
        { name: "Travel", value: travel },
        { name: "Shopping", value: shopping },
        { name: "Fuel", value: fuel },
      ];
      for (const f of fields) {
        if (!Number.isFinite(f.value) || f.value < 0) {
          throw new Error(
            `Please enter a valid non-negative monthly spend for ${f.name}.`
          );
        }
      }

      const response = await fetch("/api/cards/recommend", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dining,
          travel,
          shopping,
          fuel,
          profile: {
            top_categories: topCategories,
            fee_preference: feePreference,
            lifestyle_needs: lifestyleNeeds,
            exclude_card_ids: existingCardIds,
          },
        }),
      });

      const result: {
        recommendations?: SpendRecommendation[];
        summary_text?: string | null;
        error?: string;
      } = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to fetch recommendations.");
      }
      setRecommendationSummary(result.summary_text ?? null);

      const raw = result.recommendations ?? [];
      const sourceCardById = new Map(cards.map((c) => [c.id, c] as const));
      const filtered = raw.filter((rec) => !existingCardIds.includes(rec.id));
      const strictMatches = filtered.filter((rec) =>
        recommendationMatchesSelections(rec, sourceCardById.get(rec.id) ?? null)
      );
      const feeAndCategoryMatches = filtered.filter(
        (rec) =>
          cardMatchesFeePreference(rec) && cardMatchesTopCategorySelection(rec)
      );
      const feeOnlyMatches = filtered.filter((rec) => cardMatchesFeePreference(rec));

      let finalMatches = strictMatches;
      if (finalMatches.length === 0) finalMatches = feeAndCategoryMatches;
      if (finalMatches.length === 0) finalMatches = feeOnlyMatches;
      if (finalMatches.length === 0) finalMatches = filtered;

      if (strictMatches.length === 0) {
        setRecommendationNotice(
          "No exact matches found. Showing nearest matches based on your spend and preferences."
        );
      }

      const ranked = [...finalMatches].sort((a, b) => {
        const scoreA = a.yearly_reward_inr + recommendationPreferenceScore(a) * 1200;
        const scoreB = b.yearly_reward_inr + recommendationPreferenceScore(b) * 1200;
        return scoreB - scoreA;
      });
      setRecommendations(ranked.slice(0, 3));
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Unexpected error";
      setRecommendationError(message);
      setRecommendationNotice(null);
      setRecommendationSummary(null);
    } finally {
      setRecommendationLoading(false);
    }
  };

  const cardsSortedByName = useMemo(
    () => [...cards].sort((a, b) => a.card_name.localeCompare(b.card_name)),
    [cards]
  );

  const featuredGroups = useMemo<FeaturedGroup[]>(() => {
    const byAnnualFee = [...cards].sort((a, b) => a.annual_fee - b.annual_fee);
    const byTopRate = [...cards].sort((a, b) => {
      const aTop = topCategoryReward(a)?.value ?? 0;
      const bTop = topCategoryReward(b)?.value ?? 0;
      return bTop - aTop;
    });

    const bestOverall = [...cards]
      .sort((a, b) => {
        const aScore = (topCategoryReward(a)?.value ?? 0) * 10 - a.annual_fee / 1000;
        const bScore = (topCategoryReward(b)?.value ?? 0) * 10 - b.annual_fee / 1000;
        return bScore - aScore;
      })
      .slice(0, 8);

    const cashback = [...cards]
      .filter((c) => c.reward_type === "cashback")
      .sort((a, b) => (topCategoryReward(b)?.value ?? 0) - (topCategoryReward(a)?.value ?? 0))
      .slice(0, 8);

    const travel = [...cards]
      .filter((c) => {
        const text = `${c.best_for ?? ""} ${c.reward_rate ?? ""} ${c.key_benefits ?? ""}`.toLowerCase();
        return text.includes("travel") || text.includes("lounge");
      })
      .sort((a, b) => (topCategoryReward(b)?.value ?? 0) - (topCategoryReward(a)?.value ?? 0))
      .slice(0, 8);

    const lifetimeFree = byAnnualFee.filter((c) => c.annual_fee === 0).slice(0, 8);

    return [
      {
        id: "best-overall",
        title: "Best overall",
        subtitle: "Balanced reward + fee value",
        cards: bestOverall.length > 0 ? bestOverall : byTopRate.slice(0, 8),
      },
      {
        id: "cashback",
        title: "Cashback cards",
        subtitle: "High cash return cards",
        cards: cashback.length > 0 ? cashback : byTopRate.slice(0, 8),
      },
      {
        id: "travel",
        title: "Travel cards",
        subtitle: "Lounge and travel oriented picks",
        cards: travel.length > 0 ? travel : byTopRate.slice(0, 8),
      },
      {
        id: "lifetime-free",
        title: "Lifetime free cards",
        subtitle: "No annual fee picks",
        cards: lifetimeFree.length > 0 ? lifetimeFree : byAnnualFee.slice(0, 8),
      },
    ];
  }, [cards]);

  /** One card per featured category, max 5 (fills with a top-scored extra if needed). */
  const featuredCarouselItems = useMemo(() => {
    const result: { card: CreditCard; tag: string }[] = [];
    const seen = new Set<string>();
    for (const group of featuredGroups) {
      const pick = group.cards.find((c) => !seen.has(c.id));
      if (pick) {
        seen.add(pick.id);
        result.push({ card: pick, tag: group.title });
      }
    }
    if (result.length < 5 && cards.length > 0) {
      const scored = [...cards].sort((a, b) => {
        const aS =
          (topCategoryReward(a)?.value ?? 0) * 10 - a.annual_fee / 1000;
        const bS =
          (topCategoryReward(b)?.value ?? 0) * 10 - b.annual_fee / 1000;
        return bS - aS;
      });
      for (const c of scored) {
        if (result.length >= 5) break;
        if (!seen.has(c.id)) {
          seen.add(c.id);
          result.push({ card: c, tag: "Top pick" });
        }
      }
    }
    return result.slice(0, 5);
  }, [featuredGroups, cards]);

  const parsedSpendForCompare = useMemo(() => {
    const dining = Number(spendDining);
    const travel = Number(spendTravel);
    const shopping = Number(spendShopping);
    const fuel = Number(spendFuel);
    if (
      [dining, travel, shopping, fuel].some(
        (v) => !Number.isFinite(v) || v < 0
      )
    ) {
      return null;
    }
    return { dining, travel, shopping, fuel };
  }, [spendDining, spendTravel, spendShopping, spendFuel]);

  const compareLeft = useMemo(
    () => cards.find((c) => c.id === compareIdA) ?? null,
    [cards, compareIdA]
  );
  const compareRight = useMemo(
    () => cards.find((c) => c.id === compareIdB) ?? null,
    [cards, compareIdB]
  );

  useEffect(() => {
    if (!compareLeft || !compareRight) {
      setCompareAi(null);
      setCompareAiLoading(false);
      setCompareAiError(null);
      return;
    }
    const ac = new AbortController();
    (async () => {
      setCompareAiLoading(true);
      setCompareAiError(null);
      try {
        const body: Record<string, string | number> = {
          cardIdA: compareLeft.id,
          cardIdB: compareRight.id,
        };
        if (parsedSpendForCompare) {
          body.dining = parsedSpendForCompare.dining;
          body.travel = parsedSpendForCompare.travel;
          body.shopping = parsedSpendForCompare.shopping;
          body.fuel = parsedSpendForCompare.fuel;
        }
        const res = await fetch("/api/cards/compare-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        const data: {
          comparison?: {
            overview: string;
            when_left_better: string;
            when_right_better: string;
            caveat: string;
          };
          error?: string;
        } = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load AI comparison.");
        }
        if (data.comparison) setCompareAi(data.comparison);
        else setCompareAi(null);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setCompareAi(null);
        setCompareAiError(
          e instanceof Error ? e.message : "Could not load AI comparison."
        );
      } finally {
        if (!ac.signal.aborted) setCompareAiLoading(false);
      }
    })();
    return () => ac.abort();
  }, [
    compareLeft?.id,
    compareRight?.id,
    parsedSpendForCompare?.dining,
    parsedSpendForCompare?.travel,
    parsedSpendForCompare?.shopping,
    parsedSpendForCompare?.fuel,
  ]);

  const displayFeaturedCarouselItems = useMemo(() => {
    if (featuredFromAi && featuredFromAi.length >= 3) {
      return featuredFromAi;
    }
    return featuredCarouselItems;
  }, [featuredFromAi, featuredCarouselItems]);

  const featuredCarouselSlides = useMemo(() => {
    return displayFeaturedCarouselItems.map(({ card, tag }) => {
      const topReward = topCategoryReward(card);
      const rewardLine = topReward
        ? `${formatPct(topReward.value)} ${categoryLabel(topReward.category)}`
        : (card.reward_rate ?? "—").slice(0, 80);
      return { card, tag, rewardLine };
    });
  }, [displayFeaturedCarouselItems]);

  const topPicksCards = useMemo(() => {
    const bestOverall = featuredGroups.find((g) => g.id === "best-overall");
    return (bestOverall?.cards ?? []).slice(0, 3);
  }, [featuredGroups]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <header className="rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-white to-blue-50/50 p-7 shadow-sm dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-900 sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              {SITE_NAME}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
              Find your next credit card faster
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Compare and get the best card based on your spend.
            </p>
          </div>

          <form
            className="mx-auto mt-8 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              const q = search.trim();
              router.push(q ? `/cards?q=${encodeURIComponent(q)}` : "/cards");
            }}
          >
            <HomeSearchBar
              id="search"
              search={search}
              onSearchChange={setSearch}
            />
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-2">
              <a href="#spend-picks" className={btnPrimary}>
                Get Personalized Recommendations
              </a>
              <Link
                href="/cards"
                className={btnGhost}
              >
                Browse All Cards
              </Link>
            </div>
          </form>
        </header>

        <div className="mt-2 flex flex-col gap-16 sm:mt-3 sm:gap-20">
        <section
          id="categories-legacy"
          className={`order-2 hidden scroll-mt-28 ${sectionShell}`}
          aria-labelledby="categories-heading"
        >
          <div className={sectionHeaderRowClass}>
            <div className={sectionHeaderAccentClass} aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 id="categories-heading" className={sectionTitleClass}>
                Browse by category
              </h2>
              <p className={`${sectionLeadClass} max-w-2xl`}>
                Every card in the catalog appears on each category page—sorted by
                that earn rate, with missing rates shown as — and listed after
                cards that have data. Or jump to the full list with search and
                filters.
              </p>
            </div>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
            {SPEND_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="group flex h-full flex-col items-center rounded-2xl border border-zinc-200/80 bg-white px-4 py-5 text-center shadow-sm transition hover:border-blue-300/80 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-blue-700/50"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 transition group-hover:bg-blue-600/15 dark:bg-blue-500/15 dark:text-blue-300"
                    aria-hidden
                  >
                    <SpendCategoryIcon slug={c.slug} className="h-6 w-6" />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {c.label}
                  </span>
                  <span className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                    {c.tileHint}
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/cards"
                className="group flex h-full flex-col items-center rounded-2xl border border-zinc-200/80 bg-white px-4 py-5 text-center shadow-sm transition hover:border-indigo-300/80 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-indigo-600/50"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700 transition group-hover:bg-indigo-600/15 dark:bg-indigo-500/15 dark:text-indigo-300"
                  aria-hidden
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </span>
                <span className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  All cards
                </span>
                <span className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                  Search, sort &amp; filters
                </span>
              </Link>
            </li>
          </ul>
        </section>

        <div className="order-1 space-y-24 sm:space-y-28">
          <section
            id="featured-legacy"
            className={`hidden scroll-mt-28 ${sectionShell}`}
            aria-labelledby="featured-heading"
          >
            <div className={sectionHeaderRowClass}>
              <div className={sectionHeaderAccentClass} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 id="featured-heading" className={sectionTitleClass}>
                  Featured picks
                </h2>
                <p className={sectionLeadClass}>
                  Rotating highlights from the catalog—up to five picks at a time.
                </p>
              </div>
            </div>
            <FeaturedCardsCarousel
              items={featuredCarouselSlides}
              loading={loading}
            />
          </section>

          <section
            id="spend-picks"
            className="scroll-mt-28 rounded-3xl bg-white p-8 shadow-md shadow-zinc-900/[0.06] ring-1 ring-zinc-950/[0.04] dark:bg-zinc-900/70 dark:shadow-black/40 dark:ring-white/[0.06] sm:p-10"
            aria-labelledby="spend-picks-heading"
          >
            <div className={sectionHeaderRowClass}>
              <div className={sectionHeaderAccentClass} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 id="spend-picks-heading" className={sectionTitleClass}>
                  Recommended cards for you
                </h2>
                <p className={sectionLeadClass}>
                  Tell us your spend pattern and preferences. We’ll shortlist cards and
                  explain the “why” in one line.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-950/40 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    Step {wizardStep} of 6
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {Math.round((wizardStep / 6) * 100)}% complete
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-500"
                    style={{ width: `${(wizardStep / 6) * 100}%` }}
                  />
                </div>

                <div className="mt-5">
                  {wizardStep === 1 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Income range
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SALARY_BAND_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSalaryBand(opt.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              salaryBand === opt.id
                                ? "border-blue-500 bg-blue-600 text-white"
                                : "border-zinc-300 bg-white text-zinc-700 hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {wizardStep === 2 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Total monthly spend
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MONTHLY_SPEND_BAND_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setMonthlySpendBand(opt.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              monthlySpendBand === opt.id
                                ? "border-blue-500 bg-blue-600 text-white"
                                : "border-zinc-300 bg-white text-zinc-700 hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {wizardStep === 3 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Top categories (choose 1-3)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SPEND_CATEGORIES.map((cat) => {
                          const active = topCategories.includes(cat.slug);
                          return (
                            <button
                              key={cat.slug}
                              type="button"
                              onClick={() => toggleTopCategory(cat.slug)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                active
                                  ? "border-blue-500 bg-blue-600 text-white"
                                  : "border-zinc-300 bg-white text-zinc-700 hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                              }`}
                            >
                              <SpendCategoryIcon slug={cat.slug} className="h-3.5 w-3.5" />
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {wizardStep === 4 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Existing cards (optional)
                      </p>
                      <div className="max-h-44 overflow-auto rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
                        <div className="flex flex-wrap gap-2">
                          {cardsSortedByName.slice(0, 60).map((card) => {
                            const selected = existingCardIds.includes(card.id);
                            return (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => toggleExistingCard(card.id)}
                                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                  selected
                                    ? "border-blue-500 bg-blue-600 text-white"
                                    : "border-zinc-300 bg-white text-zinc-700 hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                                }`}
                              >
                                {card.card_name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {wizardStep === 5 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Fee preference
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {FEE_PREFERENCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFeePreference(opt.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              feePreference === opt.id
                                ? "border-blue-500 bg-blue-600 text-white"
                                : "border-zinc-300 bg-white text-zinc-700 hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {wizardStep === 6 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Travel / lifestyle needs
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {LIFESTYLE_NEED_OPTIONS.map((opt) => {
                          const selected = lifestyleNeeds.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleLifestyleNeed(opt.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                selected
                                  ? "border-blue-500 bg-blue-600 text-white"
                                  : "border-zinc-300 bg-white text-zinc-700 hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                    disabled={wizardStep === 1}
                    className={
                      wizardStep === 1
                        ? btnGhost
                        : "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    }
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => Math.min(6, s + 1))}
                    disabled={wizardStep === 6}
                    className={
                      wizardStep === 6
                        ? btnGhost
                        : "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-500 bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400"
                    }
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadRecommendations()}
                    disabled={recommendationLoading || wizardStep !== 6}
                    className={btnPrimary}
                    aria-busy={recommendationLoading}
                  >
                    {recommendationLoading ? (
                      <>
                        <Spinner className="h-4 w-4 text-white" />
                        Finding your best cards...
                      </>
                    ) : (
                      "Show my recommendations"
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/30 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Your inputs
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      We use these to rank the catalog (and exclude your existing cards).
                    </p>
                  </div>
                  <a
                    href="#spend-picks"
                    onClick={(e) => {
                      e.preventDefault();
                      setWizardStep(1);
                    }}
                    className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </a>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Focus
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {topCategories.map((slug) => (
                        <span
                          key={slug}
                          className="rounded-full bg-blue-600/10 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                        >
                          {SPEND_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug}
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Fee
                    </dt>
                    <dd className="mt-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {FEE_PREFERENCE_OPTIONS.find((o) => o.id === feePreference)?.label ??
                        "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Lifestyle
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {lifestyleNeeds.length > 0 ? (
                        lifestyleNeeds.map((id) => (
                          <span
                            key={id}
                            className="rounded-full bg-indigo-600/10 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                          >
                            {LIFESTYLE_NEED_OPTIONS.find((o) => o.id === id)?.label ?? id}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          None
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/30">
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    What you’ll get
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <li>- Top 3 picks with estimated monthly rewards</li>
                    <li>- Fee-aware ranking and preference matching</li>
                    <li>- One-line AI summary when available</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="sr-only" aria-live="polite">
              {recommendationError ? recommendationError : ""}
            </div>
            {recommendationError ? (
              <div
                className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                <span className="shrink-0 font-semibold">Error</span>
                <span>{recommendationError}</span>
              </div>
            ) : null}
            {recommendationNotice ? (
              <div className="mt-4 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-200">
                <span className="shrink-0 font-semibold">Note</span>
                <span>{recommendationNotice}</span>
              </div>
            ) : null}

            {recommendationLoading ? (
              <PicksSkeleton />
            ) : recommendations.length > 0 ? (
              <div className="mt-10">
                {recommendationSummary ? (
                  <div className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white px-4 py-3 text-sm text-indigo-950 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/50 dark:to-zinc-950/20 dark:text-indigo-100 sm:px-5 sm:py-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                        aria-hidden
                      >
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9 2a1 1 0 00-1 1v1.06a6.5 6.5 0 00-4.31 4.31H2a1 1 0 100 2h1.69A6.5 6.5 0 008 15.94V17a1 1 0 102 0v-1.06a6.5 6.5 0 004.31-4.31H18a1 1 0 100-2h-1.69A6.5 6.5 0 0012 4.06V3a1 1 0 00-1-1H9zm1 4a4.5 4.5 0 11-.001 9.001A4.5 4.5 0 0110 6z" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-200">
                          AI summary
                        </p>
                        <p className="mt-1 text-sm leading-relaxed">{recommendationSummary}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3">
                {recommendations.map((card, index) => {
                  const isBest = index === 0;
                  const monthlyTotal = card.yearly_reward_inr / 12;
                  const pickMetadata =
                    cards.find((c) => c.id === card.id)?.metadata ?? null;
                  const showHdfcApply = hdfcCardShowsApply(
                    card.bank,
                    pickMetadata
                  );
                  const showIndusindApply = indusindCardShowsApply(
                    card.bank,
                    pickMetadata
                  );
                  return (
                    <article
                      key={card.id}
                      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 shadow-md ${issuerBrandTileClass(card.bank, card.network)} ${
                        isBest
                          ? "ring-2 ring-emerald-400/45 dark:ring-emerald-500/35"
                          : ""
                      }`}
                    >
                      <div className="flex h-full flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-200">
                              Pick #{index + 1}
                            </span>
                            {isBest ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                                Top match
                              </span>
                            ) : null}
                          </div>
                          <span className="shrink-0 rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-200">
                            {card.network}
                          </span>
                        </div>

                        <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug tracking-tight">
                          <Link
                            href={`/card/${card.id}`}
                            className="text-zinc-900 transition group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400"
                          >
                            {card.card_name}
                          </Link>
                        </h3>

                        <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {card.bank}
                        </p>

                        <div className="mt-3">
                          <CardTopRewardTag card={card} />
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-2xl border border-zinc-200 bg-white/70 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/25">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Est. monthly rewards
                            </dt>
                            <dd className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatInr(monthlyTotal)}
                            </dd>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-white/70 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/25">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Annual fee
                            </dt>
                            <dd className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatInr(card.annual_fee)}
                            </dd>
                          </div>
                        </dl>

                        {card.explanation ? (
                          <div className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-white px-4 py-3 text-sm text-zinc-800 shadow-sm dark:border-blue-900/50 dark:from-blue-950/50 dark:to-zinc-950/10 dark:text-zinc-200">
                            <div className="flex items-start gap-2.5">
                              <span
                                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                                aria-hidden
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                                  Why this fits
                                </p>
                                <p className="mt-1 leading-relaxed">{card.explanation}</p>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-auto pt-5">
                          <div className="rounded-2xl border border-zinc-200 bg-white/70 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/25">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Actions
                            </p>
                            <div
                              className={
                                isAxisBankCard(card.bank) ||
                                isAmexPlatinumReserveCard(card.card_name, card.bank) ||
                                isAmexCardUsingGenericApply(card.card_name, card.bank) ||
                                isSbiCard(card.bank) ||
                                showHdfcApply ||
                                showIndusindApply
                                  ? "mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 [&>*]:min-h-11"
                                  : "mt-2 grid grid-cols-1 gap-2 [&>*]:min-h-11"
                              }
                            >
                              <Link
                                href={`/card/${card.id}`}
                                className={`${cardViewDetailsButtonClass} w-full`}
                              >
                                Learn more
                              </Link>
                          {isAxisBankCard(card.bank) ? (
                            <AxisApplyLink fullWidth />
                          ) : null}
                          {isAmexPlatinumReserveCard(
                            card.card_name,
                            card.bank
                          ) ? (
                            <AmexPlatinumReserveApplyLink fullWidth />
                          ) : null}
                          {isAmexCardUsingGenericApply(
                            card.card_name,
                            card.bank
                          ) ? (
                            <AmexGenericApplyLink fullWidth />
                          ) : null}
                          {isSbiCard(card.bank) ? (
                            <SbiApplyLink fullWidth />
                          ) : null}
                          {showHdfcApply ? (
                            <HdfcApplyLink
                              metadata={pickMetadata}
                              fullWidth
                            />
                          ) : null}
                          {showIndusindApply ? (
                            <IndusIndApplyLink
                              metadata={pickMetadata}
                              fullWidth
                            />
                          ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              </div>
            ) : null}
          </section>

          <section className={sectionShell} aria-labelledby="trust-heading">
            <div className={sectionHeaderRowClass}>
              <div className={sectionHeaderAccentClass} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 id="trust-heading" className={sectionTitleClass}>
                  Why users trust these recommendations
                </h2>
                <p className={sectionLeadClass}>
                  We rank cards using your spend mix and show a transparent
                  breakdown by category, plus fees and reward type, so users can
                  compare with confidence.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/50">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Personalized math</p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">Based on monthly spend split across dining, travel, shopping, and fuel.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/50">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Fee-aware ranking</p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">Annual fee, joining fee, and reward type stay visible in every recommendation.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/50">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Actionable picks</p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">Direct Learn more / Apply actions help users move from discovery to decision.</p>
              </div>
            </div>
          </section>

          <section className={sectionShell} aria-labelledby="top-picks-heading">
            <div className={sectionHeaderRowClass}>
              <div className={sectionHeaderAccentClass} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 id="top-picks-heading" className={sectionTitleClass}>
                  Top picks
                </h2>
                <p className={sectionLeadClass}>
                  Quick shortlist of high-value cards to start exploring right away.
                </p>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {topPicksCards.map((card) => (
                <article
                  key={card.id}
                  className={`rounded-2xl border p-4 shadow-sm ${issuerBrandTileClass(card.bank, card.network)}`}
                >
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{card.bank}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {card.card_name}
                  </h3>
                  <div className="mt-2">
                    <CardTopRewardTag card={card} />
                  </div>
                  <div className="mt-3">
                    <Link href={`/card/${card.id}`} className={`${cardViewDetailsButtonClass} w-full`}>
                      Learn more
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            id="categories"
            className={sectionShell}
            aria-labelledby="categories-heading-main"
          >
            <div className={sectionHeaderRowClass}>
              <div className={sectionHeaderAccentClass} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 id="categories-heading-main" className={sectionTitleClass}>
                  Categories
                </h2>
                <p className={`${sectionLeadClass} max-w-2xl`}>
                  Explore all cards by category and compare where each card earns most.
                </p>
              </div>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
              {SPEND_CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="group flex h-full flex-col items-center rounded-2xl border border-zinc-200/80 bg-white px-4 py-5 text-center shadow-sm transition hover:border-blue-300/80 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-blue-700/50"
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 transition group-hover:bg-blue-600/15 dark:bg-blue-500/15 dark:text-blue-300"
                      aria-hidden
                    >
                      <SpendCategoryIcon slug={c.slug} className="h-6 w-6" />
                    </span>
                    <span className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {c.label}
                    </span>
                    <span className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                      {c.tileHint}
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/cards"
                  className="group flex h-full flex-col items-center rounded-2xl border border-zinc-200/80 bg-white px-4 py-5 text-center shadow-sm transition hover:border-indigo-300/80 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-indigo-600/50"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700 transition group-hover:bg-indigo-600/15 dark:bg-indigo-500/15 dark:text-indigo-300"
                    aria-hidden
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  </span>
                  <span className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    All cards
                  </span>
                  <span className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                    Search, sort &amp; filters
                  </span>
                </Link>
              </li>
            </ul>
          </section>

          <section id="compare" className={`scroll-mt-28 ${sectionShell}`}>
            <div className={sectionHeaderRowClass}>
              <div className={sectionHeaderAccentClass} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className={sectionTitleClass}>Compare two cards</h2>
                <p className={sectionLeadClass}>
                  Side-by-side fees, reward terms, and category earn rates (same
                  fields as each card’s detail page). When AI is available, a short
                  narrative summary can appear above; if you’ve entered spend in{" "}
                  <a href="#spend-picks" className="font-medium underline">
                    Find cards by your top spends
                  </a>
                  , the AI uses it for context.
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 items-end gap-6 md:grid-cols-[1fr_auto_1fr]">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  First card
                </span>
                <select
                  value={compareIdA}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCompareIdA(v);
                    if (v && v === compareIdB) setCompareIdB("");
                  }}
                  className={inputClass}
                >
                  <option value="">Choose…</option>
                  {cardsSortedByName.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={c.id === compareIdB}
                    >
                      {c.card_name} — {c.bank}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="hidden items-center justify-center pb-2 text-xs font-bold uppercase tracking-wider text-zinc-400 md:flex"
                aria-hidden
              >
                vs
              </div>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Second card
                </span>
                <select
                  value={compareIdB}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCompareIdB(v);
                    if (v && v === compareIdA) setCompareIdA("");
                  }}
                  className={inputClass}
                >
                  <option value="">Choose…</option>
                  {cardsSortedByName.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={c.id === compareIdA}
                    >
                      {c.card_name} — {c.bank}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {compareLeft && compareRight ? (
              <div className="mt-6 rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/25">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    AI comparison
                  </h3>
                  {compareAiLoading ? (
                    <Spinner className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  ) : null}
                </div>
                {compareAiError ? (
                  <p className="mt-2 text-sm text-amber-800 dark:text-amber-200/90">
                    {compareAiError}
                  </p>
                ) : null}
                {compareAi ? (
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    <p>{compareAi.overview}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-white/70 p-3 dark:bg-zinc-900/40">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          When {compareLeft.card_name} fits better
                        </p>
                        <p className="mt-1">{compareAi.when_left_better}</p>
                      </div>
                      <div className="rounded-lg bg-white/70 p-3 dark:bg-zinc-900/40">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          When {compareRight.card_name} fits better
                        </p>
                        <p className="mt-1">{compareAi.when_right_better}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {compareAi.caveat}
                    </p>
                  </div>
                ) : !compareAiLoading && !compareAiError ? (
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    AI summary isn’t available in this environment. Use the
                    comparison table below for fees, rewards, and category rates.
                  </p>
                ) : null}
              </div>
            ) : null}

            {compareLeft && compareRight ? (
              <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-700">
                <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                    <th className="w-[28%] px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">
                      Details
                    </th>
                    <th className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">
                      <Link
                        href={`/card/${compareLeft.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {compareLeft.card_name}
                      </Link>
                      <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                        {compareLeft.bank}
                      </span>
                      {isAxisBankCard(compareLeft.bank) ? (
                        <AxisApplyLink fullWidth className="mt-2" />
                      ) : null}
                      {isAmexPlatinumReserveCard(
                        compareLeft.card_name,
                        compareLeft.bank
                      ) ? (
                        <AmexPlatinumReserveApplyLink
                          fullWidth
                          className="mt-2"
                        />
                      ) : null}
                      {isAmexCardUsingGenericApply(
                        compareLeft.card_name,
                        compareLeft.bank
                      ) ? (
                        <AmexGenericApplyLink fullWidth className="mt-2" />
                      ) : null}
                      {isSbiCard(compareLeft.bank) ? (
                        <SbiApplyLink fullWidth className="mt-2" />
                      ) : null}
                      {hdfcCardShowsApply(
                        compareLeft.bank,
                        compareLeft.metadata
                      ) ? (
                        <HdfcApplyLink
                          metadata={compareLeft.metadata}
                          fullWidth
                          className="mt-2"
                        />
                      ) : null}
                      {indusindCardShowsApply(
                        compareLeft.bank,
                        compareLeft.metadata
                      ) ? (
                        <IndusIndApplyLink
                          metadata={compareLeft.metadata}
                          fullWidth
                          className="mt-2"
                        />
                      ) : null}
                    </th>
                    <th className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">
                      <Link
                        href={`/card/${compareRight.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {compareRight.card_name}
                      </Link>
                      <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                        {compareRight.bank}
                      </span>
                      {isAxisBankCard(compareRight.bank) ? (
                        <AxisApplyLink fullWidth className="mt-2" />
                      ) : null}
                      {isAmexPlatinumReserveCard(
                        compareRight.card_name,
                        compareRight.bank
                      ) ? (
                        <AmexPlatinumReserveApplyLink
                          fullWidth
                          className="mt-2"
                        />
                      ) : null}
                      {isAmexCardUsingGenericApply(
                        compareRight.card_name,
                        compareRight.bank
                      ) ? (
                        <AmexGenericApplyLink fullWidth className="mt-2" />
                      ) : null}
                      {isSbiCard(compareRight.bank) ? (
                        <SbiApplyLink fullWidth className="mt-2" />
                      ) : null}
                      {hdfcCardShowsApply(
                        compareRight.bank,
                        compareRight.metadata
                      ) ? (
                        <HdfcApplyLink
                          metadata={compareRight.metadata}
                          fullWidth
                          className="mt-2"
                        />
                      ) : null}
                      {indusindCardShowsApply(
                        compareRight.bank,
                        compareRight.metadata
                      ) ? (
                        <IndusIndApplyLink
                          metadata={compareRight.metadata}
                          fullWidth
                          className="mt-2"
                        />
                      ) : null}
                    </th>
                  </tr>
                </thead>
                <tbody className="text-zinc-700 dark:text-zinc-300">
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      Fees &amp; rewards
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                      Network
                    </td>
                    <td className="px-4 py-2.5">{compareLeft.network}</td>
                    <td className="px-4 py-2.5">{compareRight.network}</td>
                  </tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                      Joining fee
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatInr(compareLeft.joining_fee)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatInr(compareRight.joining_fee)}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                      Annual fee
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatInr(compareLeft.annual_fee)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatInr(compareRight.annual_fee)}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                      Reward type
                    </td>
                    <td className="px-4 py-2.5 capitalize">
                      {compareLeft.reward_type}
                    </td>
                    <td className="px-4 py-2.5 capitalize">
                      {compareRight.reward_type}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2.5 align-top font-medium text-zinc-600 dark:text-zinc-400">
                      Reward rate
                    </td>
                    <td className="px-4 py-2.5 align-top text-sm leading-relaxed">
                      {compareLeft.reward_rate ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 align-top text-sm leading-relaxed">
                      {compareRight.reward_rate ?? "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2.5 align-top font-medium text-zinc-600 dark:text-zinc-400">
                      Lounge access
                    </td>
                    <td className="px-4 py-2.5 align-top text-sm leading-relaxed">
                      {compareLeft.lounge_access ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 align-top text-sm leading-relaxed">
                      {compareRight.lounge_access ?? "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2.5 align-top font-medium text-zinc-600 dark:text-zinc-400">
                      Best for
                    </td>
                    <td className="px-4 py-2.5 align-top text-sm leading-relaxed">
                      {compareLeft.best_for ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 align-top text-sm leading-relaxed">
                      {compareRight.best_for ?? "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      Category earn rates
                      <span className="mt-0.5 block font-normal normal-case text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                        Approximate % of spend per category (where available).
                      </span>
                    </td>
                  </tr>
                  {CATEGORY_LABELS.map(({ key, label }) => (
                    <tr
                      key={key}
                      className="border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-4 py-2 pl-6 text-zinc-600 dark:text-zinc-400">
                        {label}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {categoryEarnDisplay(compareLeft, key)}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {categoryEarnDisplay(compareRight, key)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : compareIdA || compareIdB ? (
            <p className="mt-4 text-sm text-zinc-500">
              Select both cards to see the comparison.
            </p>
          ) : null}
        </section>

          <section
            id="featured"
            className={`scroll-mt-28 ${sectionShell}`}
            aria-labelledby="featured-heading-main"
          >
            <div className={sectionHeaderRowClass}>
              <div className={sectionHeaderAccentClass} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 id="featured-heading-main" className={sectionTitleClass}>
                  Featured
                </h2>
                <p className={sectionLeadClass}>
                  Rotating highlights from the catalog—up to five picks at a time.
                </p>
              </div>
            </div>
            <FeaturedCardsCarousel
              items={featuredCarouselSlides}
              loading={loading}
            />
          </section>

        </div>

        <footer className="mt-16 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400" />
        </div>
      </main>
    </div>
  );
}
