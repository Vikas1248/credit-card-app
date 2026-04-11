"use client";

import Link from "next/link";
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
import { rewardCalculator } from "@/lib/recommend/rewardCalculator";
import {
  SITE_ABOUT_DETAIL,
  SITE_ABOUT_LEAD,
  SITE_NAME,
} from "@/lib/site";
import { SPEND_CATEGORIES } from "@/lib/spendCategories";
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

type BrowseSortMode =
  | "name"
  | "annual_asc"
  | "annual_desc"
  | "joining_asc"
  | "joining_desc"
  | "ai";

function parseOptionalInrBound(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

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

function sortCardsByIdOrder(
  list: CreditCard[],
  order: string[] | null
): CreditCard[] {
  if (!order || order.length === 0) {
    return [...list].sort((a, b) => a.card_name.localeCompare(b.card_name));
  }
  const idx = new Map(order.map((id, i) => [id, i]));
  return [...list].sort(
    (a, b) => (idx.get(a.id) ?? 1e9) - (idx.get(b.id) ?? 1e9)
  );
}

function topCategoryReward(card: CreditCard): {
  category: keyof RewardBreakdown;
  value: number;
} | null {
  const entries: Array<[keyof RewardBreakdown, number | null]> = [
    ["dining", card.dining_reward],
    ["travel", card.travel_reward],
    ["shopping", card.shopping_reward],
    ["fuel", card.fuel_reward],
  ];
  const valid = entries.filter(
    ([, value]) => typeof value === "number" && Number.isFinite(value) && value > 0
  ) as Array<[keyof RewardBreakdown, number]>;
  if (valid.length === 0) return null;
  valid.sort((a, b) => b[1] - a[1]);
  return { category: valid[0][0], value: valid[0][1] };
}

function categoryLabel(key: keyof RewardBreakdown): string {
  return CATEGORY_LABELS.find((c) => c.key === key)?.label ?? key;
}

function cardRates(card: CreditCard) {
  return {
    dining_reward: card.dining_reward,
    travel_reward: card.travel_reward,
    shopping_reward: card.shopping_reward,
    fuel_reward: card.fuel_reward,
  };
}

function categoryPct(
  card: CreditCard,
  key: keyof RewardBreakdown
): number | null {
  const map: Record<keyof RewardBreakdown, number | null> = {
    dining: card.dining_reward,
    travel: card.travel_reward,
    shopping: card.shopping_reward,
    fuel: card.fuel_reward,
  };
  return map[key];
}

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400";

const btnPrimary =
  "inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-55 dark:hover:bg-blue-500 sm:w-auto";

const btnGhost =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

/** Same height as referral Apply; indigo to match app accent vs issuer-colored Apply. */
const cardDetailsButtonClass =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl border-2 border-indigo-400/85 bg-indigo-50 px-3 text-sm font-semibold text-indigo-950 shadow-sm transition hover:border-indigo-500 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/55 dark:bg-indigo-950/45 dark:text-indigo-100 dark:hover:border-indigo-400 dark:hover:bg-indigo-900/55";

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

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  );
}

function SortIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h8M4 12h5M4 18h2" />
      <path d="M19 5v14M16 8l3-3 3 3M16 16l3 3 3-3" />
    </svg>
  );
}

const browseToolbarBtnClass =
  "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-zinc-700 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-200";

function SiteHeader({
  search,
  onSearchChange,
  searchRanking,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchRanking?: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
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
                ["#match", "Match spend"],
                ["#compare", "Compare"],
                ["#browse", "All cards"],
              ] as const
            ).map(([href, label]) => (
              <a key={href} href={href} className={headerNavLinkClass}>
                {label}
              </a>
            ))}
          </nav>

          <div
            id="search"
            className="relative min-w-0 flex-1 scroll-mt-28 sm:min-w-[240px]"
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
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search cards or banks…"
              className={headerInputClass}
              aria-label="Search cards"
            />
            {searchRanking ? (
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                AI ranking…
              </span>
            ) : null}
          </div>
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
  const [searchAiOrder, setSearchAiOrder] = useState<string[] | null>(null);
  const [searchAiLoading, setSearchAiLoading] = useState(false);
  const [browseSort, setBrowseSort] = useState<BrowseSortMode>("name");
  const [browseAiOrder, setBrowseAiOrder] = useState<string[] | null>(null);
  const [browseAiLoading, setBrowseAiLoading] = useState(false);
  const [filterMinAnnual, setFilterMinAnnual] = useState("");
  const [filterMaxAnnual, setFilterMaxAnnual] = useState("");
  const [filterMinJoining, setFilterMinJoining] = useState("");
  const [filterMaxJoining, setFilterMaxJoining] = useState("");
  const [filterRewardType, setFilterRewardType] = useState<
    "all" | "cashback" | "points"
  >("all");
  const [filterNetwork, setFilterNetwork] = useState<"all" | CardNetwork>(
    "all"
  );
  const [browseFilterOpen, setBrowseFilterOpen] = useState(false);
  const [browseSortOpen, setBrowseSortOpen] = useState(false);

  const catalogNetworkLock = getOptionalCardNetworkFilter();

  const browseFiltersActive = useMemo(
    () =>
      filterMinAnnual.trim() !== "" ||
      filterMaxAnnual.trim() !== "" ||
      filterMinJoining.trim() !== "" ||
      filterMaxJoining.trim() !== "" ||
      filterRewardType !== "all" ||
      (!catalogNetworkLock && filterNetwork !== "all"),
    [
      filterMinAnnual,
      filterMaxAnnual,
      filterMinJoining,
      filterMaxJoining,
      filterRewardType,
      filterNetwork,
      catalogNetworkLock,
    ]
  );

  const browseSortNonDefault = browseSort !== "name";

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

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchAiOrder(null);
      setSearchAiLoading(false);
      return;
    }
    let cancelled = false;
    setSearchAiLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ q });
          const n = getOptionalCardNetworkFilter();
          if (n) params.set("network", n);
          const res = await fetch(`/api/cards/search-ai?${params}`, {
            cache: "no-store",
          });
          const data: { source?: string; ordered_ids?: string[] } =
            await res.json();
          if (cancelled) return;
          if (data.source === "ai" && Array.isArray(data.ordered_ids)) {
            setSearchAiOrder(data.ordered_ids);
          } else {
            setSearchAiOrder(null);
          }
        } catch {
          if (!cancelled) setSearchAiOrder(null);
        } finally {
          if (!cancelled) setSearchAiLoading(false);
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, cards.length]);

  useEffect(() => {
    if (browseSort !== "ai" || cards.length === 0) {
      if (browseSort !== "ai") setBrowseAiOrder(null);
      setBrowseAiLoading(false);
      return;
    }
    let cancelled = false;
    setBrowseAiLoading(true);
    void (async () => {
      try {
        const params = new URLSearchParams();
        const n = getOptionalCardNetworkFilter();
        if (n) params.set("network", n);
        const res = await fetch(`/api/cards/browse-order-ai?${params}`, {
          cache: "no-store",
        });
        const data: { source?: string; ordered_ids?: string[] | null } =
          await res.json();
        if (cancelled) return;
        if (data.source === "ai" && Array.isArray(data.ordered_ids)) {
          setBrowseAiOrder(data.ordered_ids);
        } else {
          setBrowseAiOrder(null);
        }
      } catch {
        if (!cancelled) setBrowseAiOrder(null);
      } finally {
        if (!cancelled) setBrowseAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [browseSort, cards.length]);

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

  const feeTypeFilteredCards = useMemo(() => {
    const minA = parseOptionalInrBound(filterMinAnnual);
    const maxA = parseOptionalInrBound(filterMaxAnnual);
    const minJ = parseOptionalInrBound(filterMinJoining);
    const maxJ = parseOptionalInrBound(filterMaxJoining);

    return cards.filter((c) => {
      if (filterRewardType !== "all" && c.reward_type !== filterRewardType) {
        return false;
      }
      if (
        !catalogNetworkLock &&
        filterNetwork !== "all" &&
        c.network !== filterNetwork
      ) {
        return false;
      }
      if (minA !== null && c.annual_fee < minA) return false;
      if (maxA !== null && c.annual_fee > maxA) return false;
      if (minJ !== null && c.joining_fee < minJ) return false;
      if (maxJ !== null && c.joining_fee > maxJ) return false;
      return true;
    });
  }, [
    cards,
    filterRewardType,
    filterNetwork,
    catalogNetworkLock,
    filterMinAnnual,
    filterMaxAnnual,
    filterMinJoining,
    filterMaxJoining,
  ]);

  const textFilteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return feeTypeFilteredCards;

    return feeTypeFilteredCards.filter((card) => {
      const text = [
        card.card_name,
        card.bank,
        card.best_for ?? "",
        card.key_benefits ?? "",
        card.reward_rate ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [feeTypeFilteredCards, search]);

  const displayBrowseCards = useMemo(() => {
    const list = textFilteredCards;
    const q = search.trim();
    if (q.length >= 2 && searchAiOrder && searchAiOrder.length > 0) {
      return sortCardsByIdOrder(list, searchAiOrder);
    }
    if (!q && browseSort === "ai" && browseAiOrder && browseAiOrder.length > 0) {
      return sortCardsByIdOrder(list, browseAiOrder);
    }
    if (browseSort === "annual_asc") {
      return [...list].sort(
        (a, b) =>
          a.annual_fee - b.annual_fee ||
          a.card_name.localeCompare(b.card_name)
      );
    }
    if (browseSort === "annual_desc") {
      return [...list].sort(
        (a, b) =>
          b.annual_fee - a.annual_fee ||
          a.card_name.localeCompare(b.card_name)
      );
    }
    if (browseSort === "joining_asc") {
      return [...list].sort(
        (a, b) =>
          a.joining_fee - b.joining_fee ||
          a.card_name.localeCompare(b.card_name)
      );
    }
    if (browseSort === "joining_desc") {
      return [...list].sort(
        (a, b) =>
          b.joining_fee - a.joining_fee ||
          a.card_name.localeCompare(b.card_name)
      );
    }
    return sortCardsByIdOrder(list, null);
  }, [textFilteredCards, search, searchAiOrder, browseSort, browseAiOrder]);

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

  const comparisonMetrics = useMemo(() => {
    if (!parsedSpendForCompare || !compareLeft || !compareRight) return null;
    const left = rewardCalculator.computeYearlyRewards(
      parsedSpendForCompare,
      cardRates(compareLeft)
    );
    const right = rewardCalculator.computeYearlyRewards(
      parsedSpendForCompare,
      cardRates(compareRight)
    );
    return { left, right };
  }, [parsedSpendForCompare, compareLeft, compareRight]);

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
      <SiteHeader
        search={search}
        onSearchChange={setSearch}
        searchRanking={searchAiLoading}
      />

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
          <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {SITE_ABOUT_DETAIL}
          </p>
        </header>

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
              <p className={`${sectionLeadClass} max-w-lg`}>
                Tap a category to open a dedicated list ranked by that earn rate.
              </p>
            </div>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
                  Full-width spotlight carousel inspired by issuer homepages: one
                  featured card at a time with a large plastic preview, arrows, and
                  dots. With OpenAI enabled picks refresh hourly; otherwise up to
                  five category highlights.
                </p>
              </div>
            </div>
            <FeaturedCardsCarousel
              items={featuredCarouselSlides}
              loading={loading}
            />
          </section>

          <section id="match" className={`scroll-mt-28 ${sectionShell}`}>
            <div className={sectionHeaderRowClass}>
              <div className={sectionHeaderAccentClass} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className={sectionTitleClass}>Match my spend</h2>
                <p className={sectionLeadClass}>
                  Enter average monthly spend (INR) per category. With{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
                    OPENAI_API_KEY
                  </code>{" "}
                  set, an AI picks and explains your top 3 from the best
                  candidates; otherwise we use the numeric ranking only.
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
                  "Show top 3 cards"
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
                            className={cardDetailsButtonClass}
                          >
                            Details
                          </Link>
                          {isAxisBankCard(card.bank) ? (
                            <AxisApplyLink fullWidth size="sm" />
                          ) : null}
                          {isAmexPlatinumReserveCard(
                            card.card_name,
                            card.bank
                          ) ? (
                            <AmexPlatinumReserveApplyLink fullWidth size="sm" />
                          ) : null}
                          {isSbiCard(card.bank) ? (
                            <SbiApplyLink fullWidth size="sm" />
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
                  Uses the same monthly spend as Match my spend when valid. The
                  table is computed locally; with OpenAI configured, an AI summary
                  loads below.
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

            {!parsedSpendForCompare ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                Enter valid monthly spend amounts in{" "}
                <a href="#match" className="font-semibold underline">
                  Match my spend
                </a>{" "}
                to estimate comparison rewards.
              </div>
            ) : null}

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
                    Add{" "}
                    <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">
                      OPENAI_API_KEY
                    </code>{" "}
                    (and do not set{" "}
                    <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">
                      DISABLE_EXTERNAL_API_CALLS
                    </code>
                    ) to generate this summary.
                  </p>
                ) : null}
              </div>
            ) : null}

            {compareLeft && compareRight && comparisonMetrics ? (
              <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-700">
                <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                    <th className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">
                      Metric
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
                        <AxisApplyLink size="sm" className="mt-2" />
                      ) : null}
                      {isAmexPlatinumReserveCard(
                        compareLeft.card_name,
                        compareLeft.bank
                      ) ? (
                        <AmexPlatinumReserveApplyLink
                          size="sm"
                          className="mt-2"
                        />
                      ) : null}
                      {isSbiCard(compareLeft.bank) ? (
                        <SbiApplyLink size="sm" className="mt-2" />
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
                        <AxisApplyLink size="sm" className="mt-2" />
                      ) : null}
                      {isAmexPlatinumReserveCard(
                        compareRight.card_name,
                        compareRight.bank
                      ) ? (
                        <AmexPlatinumReserveApplyLink
                          size="sm"
                          className="mt-2"
                        />
                      ) : null}
                      {isSbiCard(compareRight.bank) ? (
                        <SbiApplyLink size="sm" className="mt-2" />
                      ) : null}
                    </th>
                  </tr>
                </thead>
                <tbody className="text-zinc-700 dark:text-zinc-300">
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
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      Reward % (category spend)
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
                        {formatPct(categoryPct(compareLeft, key))}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {formatPct(categoryPct(compareRight, key))}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      Estimated reward (your spend)
                    </td>
                  </tr>
                  {CATEGORY_LABELS.map(({ key, label }) => {
                    const lm = comparisonMetrics.left.breakdown[key] / 12;
                    const rm = comparisonMetrics.right.breakdown[key] / 12;
                    return (
                      <tr
                        key={`${key}-inr`}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="px-4 py-2 pl-6 text-zinc-600 dark:text-zinc-400">
                          {label} / month
                        </td>
                        <td className="px-4 py-2 tabular-nums">{formatInr(lm)}</td>
                        <td className="px-4 py-2 tabular-nums">{formatInr(rm)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                      Total / month
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatInr(comparisonMetrics.left.yearlyTotal / 12)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatInr(comparisonMetrics.right.yearlyTotal / 12)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                      Total / year
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatInr(comparisonMetrics.left.yearlyTotal)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatInr(comparisonMetrics.right.yearlyTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : parsedSpendForCompare && (compareIdA || compareIdB) ? (
            <p className="mt-4 text-sm text-zinc-500">
              Select both cards to see the comparison.
            </p>
          ) : null}
        </section>

        <section id="browse" className={`scroll-mt-28 ${sectionShell}`}>
          <div className={sectionHeaderRowClass}>
            <div className={sectionHeaderAccentClass} aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className={sectionTitleClass}>All cards</h2>
                <p className={sectionLeadClass}>
                  {textFilteredCards.length === cards.length && !search.trim() ? (
                    <>
                      {cards.length} {cards.length === 1 ? "card" : "cards"} in
                      the catalog.
                    </>
                  ) : (
                    <>
                      {textFilteredCards.length}{" "}
                      {textFilteredCards.length === 1 ? "card" : "cards"}{" "}
                      matching your criteria ({cards.length} in catalog).
                    </>
                  )}{" "}
                  {search.trim().length >= 2 ? (
                    <span className="text-zinc-500">
                      With OpenAI configured, search results reorder by relevance
                      after you pause typing.
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Use the filter and sort icons to narrow the list and change
                  order.
                </p>
              </div>
              {!loading && !error && cards.length > 0 ? (
                <div
                  className="flex shrink-0 items-center gap-2"
                  role="toolbar"
                  aria-label="Browse tools"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setBrowseFilterOpen((o) => !o);
                      setBrowseSortOpen(false);
                    }}
                    className={`${browseToolbarBtnClass} border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${
                      browseFilterOpen
                        ? "border-blue-400 ring-2 ring-blue-500/30 dark:border-blue-500/50"
                        : ""
                    }`}
                    aria-expanded={browseFilterOpen}
                    aria-controls="browse-filter-panel"
                    title="Filter cards"
                  >
                    <FilterIcon className="h-5 w-5" />
                    <span className="sr-only">Filter</span>
                    {browseFiltersActive ? (
                      <span
                        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBrowseSortOpen((o) => !o);
                      setBrowseFilterOpen(false);
                    }}
                    className={`${browseToolbarBtnClass} border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${
                      browseSortOpen
                        ? "border-blue-400 ring-2 ring-blue-500/30 dark:border-blue-500/50"
                        : ""
                    }`}
                    aria-expanded={browseSortOpen}
                    aria-controls="browse-sort-panel"
                    title="Sort cards"
                  >
                    <SortIcon className="h-5 w-5" />
                    <span className="sr-only">Sort</span>
                    {browseSortNonDefault ? (
                      <span
                        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {!loading && !error && cards.length > 0 && browseFilterOpen ? (
            <div
              id="browse-filter-panel"
              className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-700 dark:bg-zinc-950/40"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Filter by fees, reward type &amp; network
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Annual fee min (₹)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={filterMinAnnual}
                    onChange={(e) => setFilterMinAnnual(e.target.value)}
                    placeholder="Any"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Annual fee max (₹)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={filterMaxAnnual}
                    onChange={(e) => setFilterMaxAnnual(e.target.value)}
                    placeholder="Any"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Joining fee min (₹)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={filterMinJoining}
                    onChange={(e) => setFilterMinJoining(e.target.value)}
                    placeholder="Any"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Joining fee max (₹)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={filterMaxJoining}
                    onChange={(e) => setFilterMaxJoining(e.target.value)}
                    placeholder="Any"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Reward type
                  </span>
                  <select
                    value={filterRewardType}
                    onChange={(e) =>
                      setFilterRewardType(
                        e.target.value as "all" | "cashback" | "points"
                      )
                    }
                    className={inputClass}
                  >
                    <option value="all">All</option>
                    <option value="cashback">Cashback</option>
                    <option value="points">Points</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Card network
                  </span>
                  <select
                    value={catalogNetworkLock ?? filterNetwork}
                    onChange={(e) =>
                      setFilterNetwork(e.target.value as "all" | CardNetwork)
                    }
                    disabled={Boolean(catalogNetworkLock)}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`}
                    title={
                      catalogNetworkLock
                        ? "Catalog is limited by NEXT_PUBLIC_CARD_NETWORK"
                        : undefined
                    }
                  >
                    <option value="all">All networks</option>
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">Amex</option>
                  </select>
                  {catalogNetworkLock ? (
                    <span className="mt-1 block text-[11px] text-zinc-500">
                      Locked to {catalogNetworkLock} via env.
                    </span>
                  ) : null}
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterMinAnnual("");
                  setFilterMaxAnnual("");
                  setFilterMinJoining("");
                  setFilterMaxJoining("");
                  setFilterRewardType("all");
                  setFilterNetwork("all");
                }}
                className="mt-4 text-xs font-semibold text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {!loading && !error && cards.length > 0 && browseSortOpen ? (
            <div
              id="browse-sort-panel"
              className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-700 dark:bg-zinc-950/40"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Sort order
              </h3>
              <label className="mt-3 block sm:flex sm:items-end sm:gap-4">
                <div className="min-w-0 flex-1">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Order by
                  </span>
                  <select
                    value={browseSort}
                    onChange={(e) =>
                      setBrowseSort(e.target.value as BrowseSortMode)
                    }
                    className={inputClass}
                  >
                    <option value="name">Name (A–Z)</option>
                    <option value="annual_asc">Annual fee (low → high)</option>
                    <option value="annual_desc">Annual fee (high → low)</option>
                    <option value="joining_asc">
                      Joining fee (low → high)
                    </option>
                    <option value="joining_desc">
                      Joining fee (high → low)
                    </option>
                    <option value="ai">AI curated browse</option>
                  </select>
                </div>
                {browseSort === "ai" ? (
                  <span className="mt-2 flex items-center gap-2 text-xs text-zinc-500 sm:mt-0 sm:pb-2.5">
                    {browseAiLoading ? (
                      <>
                        <Spinner className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        Loading order…
                      </>
                    ) : !browseAiOrder ? (
                      <>Needs OPENAI_API_KEY — using A–Z</>
                    ) : null}
                  </span>
                ) : null}
              </label>
            </div>
          ) : null}

          {loading ? (
            <div className="mt-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
                />
              ))}
            </div>
          ) : error ? (
            <div
              className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              <span className="font-semibold">Couldn’t load cards</span>
              <span>{error}</span>
            </div>
          ) : textFilteredCards.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
              {cards.length === 0 && !search.trim() ? (
                <>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    No cards in the database
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Production loads from Supabase (<code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">credit_cards</code>), not from repo{" "}
                    <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">data/</code>. Import rows into the same Supabase project your
                    Vercel env points to, and confirm{" "}
                    <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_URL</code> and keys are set in Vercel.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {feeTypeFilteredCards.length === 0
                      ? "No cards match your filters"
                      : "No cards match your search"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {feeTypeFilteredCards.length === 0
                      ? "Widen annual or joining fee ranges, set reward type and network to All, or clear filters."
                      : "Try another query, clear the search box, or adjust filters."}
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {displayBrowseCards.map((card) => (
                <li
                  key={card.id}
                  className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${issuerBrandTileClass(card.bank, card.network)}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                          <Link
                            href={`/card/${card.id}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {card.card_name}
                          </Link>
                        </h3>
                        <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-950/50 dark:text-zinc-300 dark:ring-zinc-600/60">
                          {card.network}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {card.bank}
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {card.best_for ?? card.reward_rate ?? "—"}
                      </p>
                      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
                        <div>
                          <span className="text-zinc-400">Annual </span>
                          <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                            {formatInr(card.annual_fee)}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Joining </span>
                          <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                            {formatInr(card.joining_fee)}
                          </span>
                        </div>
                        <div className="capitalize">{card.reward_type}</div>
                      </dl>
                    </div>
                    <div className="flex w-full shrink-0 flex-col gap-2 sm:ml-auto sm:w-[9.5rem]">
                      <Link
                        href={`/card/${card.id}`}
                        className={cardDetailsButtonClass}
                      >
                        Details
                      </Link>
                      {isAxisBankCard(card.bank) ? (
                        <AxisApplyLink className="w-full" />
                      ) : null}
                      {isAmexPlatinumReserveCard(
                        card.card_name,
                        card.bank
                      ) ? (
                        <AmexPlatinumReserveApplyLink className="w-full" />
                      ) : null}
                      {isSbiCard(card.bank) ? (
                        <SbiApplyLink className="w-full" />
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>
      </main>
      <footer className="border-t border-zinc-200/80 py-14 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        {SITE_NAME} uses your inputs for illustrative estimates only. Not
        financial advice; not affiliated with banks or card networks.
      </footer>
    </div>
  );
}
