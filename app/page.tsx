"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AmexPlatinumReserveApplyLink } from "@/components/amex-platinum-reserve-apply-link";
import { AxisApplyLink } from "@/components/axis-apply-link";
import { FeaturedCardsCarousel } from "@/components/featured-cards-carousel";
import { SbiApplyLink } from "@/components/sbi-apply-link";
import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";
import { isAxisBankCard } from "@/lib/cards/axisApply";
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
  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

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
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
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
            className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Sections"
          >
            {(
              [
                ["#search", "Search"],
                ["#categories", "Categories"],
                ["#featured", "Featured"],
                ["#spend-picks", "Your spend"],
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
  const [recommendations, setRecommendations] = useState<SpendRecommendation[]>(
    []
  );
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

      const dining = Number(spendDining);
      const travel = Number(spendTravel);
      const shopping = Number(spendShopping);
      const fuel = Number(spendFuel);
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
        body: JSON.stringify({ dining, travel, shopping, fuel }),
      });

      const result: { recommendations?: SpendRecommendation[]; error?: string } =
        await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to fetch recommendations.");
      }

      setRecommendations(result.recommendations ?? []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Unexpected error";
      setRecommendationError(message);
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {SITE_NAME}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Find a credit card for how you spend
          </h1>
          <p className="mt-5 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {SITE_ABOUT_LEAD}
          </p>
        </header>

        <form
          className="mx-auto mt-10 max-w-xl"
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
          <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4 sm:gap-y-2">
            <button
              type="submit"
              className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Search in full catalog
            </button>
            <span className="hidden text-zinc-300 sm:inline" aria-hidden>
              ·
            </span>
            <Link
              href="/cards"
              className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              View all cards
            </Link>
          </div>
        </form>

        <section
          id="categories"
          className={`scroll-mt-28 mt-12 sm:mt-16 ${sectionShell}`}
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

        <div className="mt-16 space-y-24 sm:mt-20 sm:space-y-28">
          <section
            id="featured"
            className={`scroll-mt-28 ${sectionShell}`}
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
            className={`scroll-mt-28 ${sectionShell}`}
            aria-labelledby="spend-picks-heading"
          >
            <div className={sectionHeaderRowClass}>
              <div className={sectionHeaderAccentClass} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 id="spend-picks-heading" className={sectionTitleClass}>
                  Top cards for your spend
                </h2>
                <p className={sectionLeadClass}>
                  Enter average monthly spend (₹) per category. We estimate each
                  card’s yearly rewards from its category rates and rank the top
                  three.{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    If you multiply every box by the same amount, the order usually
                    stays the same
                  </span>
                  —change{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    how you split spend across categories
                  </span>{" "}
                  to see different winners. With AI available, we may adjust those
                  three picks and add short explanations; without it, ranking is
                  numeric only.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-950/40 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["spendDining", "Dining", spendDining, setSpendDining],
                    ["spendTravel", "Travel", spendTravel, setSpendTravel],
                    ["spendShopping", "Shopping", spendShopping, setSpendShopping],
                    ["spendFuel", "Fuel", spendFuel, setSpendFuel],
                  ] as const
                ).map(([id, label, value, setVal]) => (
                  <label key={id} className="block">
                    <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {label}{" "}
                      <span className="font-normal text-zinc-400">/ month · ₹</span>
                    </span>
                    <input
                      id={id}
                      type="number"
                      min={0}
                      step={100}
                      value={value}
                      onChange={(e) => setVal(e.target.value)}
                      className={inputClass}
                      inputMode="numeric"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => void loadRecommendations()}
                disabled={recommendationLoading}
                className={btnPrimary}
                aria-busy={recommendationLoading}
              >
                {recommendationLoading ? (
                  <>
                    <Spinner className="h-4 w-4 text-white" />
                    Calculating picks…
                  </>
                ) : (
                  "Update top 3 for this spend"
                )}
              </button>
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

            {recommendationLoading ? (
              <PicksSkeleton />
            ) : recommendations.length > 0 ? (
              <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
                {recommendations.map((card, index) => {
                  const isBest = index === 0;
                  const monthlyTotal = card.yearly_reward_inr / 12;
                  return (
                    <article
                      key={card.id}
                      className={`flex flex-col rounded-2xl border p-6 shadow-md ${issuerBrandTileClass(card.bank, card.network)} ${
                        isBest
                          ? "ring-2 ring-emerald-400/45 dark:ring-emerald-500/35"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          #{index + 1}
                        </span>
                        {isBest ? (
                          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            Best for you
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight">
                        <Link
                          href={`/card/${card.id}`}
                          className="text-zinc-900 transition hover:text-blue-600 dark:text-zinc-50 dark:hover:text-blue-400"
                        >
                          {card.card_name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {card.bank} · {card.network}
                      </p>

                      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-white/75 p-3 shadow-sm dark:bg-zinc-950/45">
                          <dt className="text-xs font-medium text-zinc-500">
                            Monthly reward
                          </dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {formatInr(monthlyTotal)}
                          </dd>
                        </div>
                        <div className="rounded-xl bg-white/75 p-3 shadow-sm dark:bg-zinc-950/45">
                          <dt className="text-xs font-medium text-zinc-500">
                            Yearly reward
                          </dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {formatInr(card.yearly_reward_inr)}
                          </dd>
                        </div>
                      </dl>

                      {card.explanation ? (
                        <div className="mt-4 flex gap-2 rounded-xl border border-blue-100 bg-blue-50/90 px-3 py-3 dark:border-blue-900/40 dark:bg-blue-950/40">
                          <span
                            className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
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
                          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                            {card.explanation}
                          </p>
                        </div>
                      ) : null}

                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        By category
                      </p>
                      <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 text-sm dark:border-zinc-700">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                                Category
                              </th>
                              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                                / mo
                              </th>
                              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                                / yr
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {CATEGORY_LABELS.map(({ key, label }) => {
                              const yearly = card.breakdown[key];
                              const monthly = yearly / 12;
                              return (
                                <tr
                                  key={key}
                                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                                >
                                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                                    {label}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums text-zinc-600 dark:text-zinc-400">
                                    {formatInr(monthly)}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums text-zinc-600 dark:text-zinc-400">
                                    {formatInr(yearly)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500">
                          Fee {formatInr(card.annual_fee)} ·{" "}
                          {card.reward_type === "cashback"
                            ? "Cashback"
                            : "Points"}{" "}
                          · {card.reward_rate ?? "—"}
                        </p>
                        <div
                          className={
                            isAxisBankCard(card.bank) ||
                            isAmexPlatinumReserveCard(card.card_name, card.bank) ||
                            isSbiCard(card.bank)
                              ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
                              : "grid grid-cols-1 gap-2"
                          }
                        >
                          <Link
                            href={`/card/${card.id}`}
                            className={`${cardViewDetailsButtonClass} w-full`}
                          >
                            View details
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
                          {isSbiCard(card.bank) ? (
                            <SbiApplyLink fullWidth />
                          ) : null}
                        </div>
                      </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
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
                    Top cards for your spend
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
                      {isSbiCard(compareLeft.bank) ? (
                        <SbiApplyLink fullWidth className="mt-2" />
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
                      {isSbiCard(compareRight.bank) ? (
                        <SbiApplyLink fullWidth className="mt-2" />
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

        </div>
      </main>
    </div>
  );
}
