"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AmexPlatinumReserveApplyLink } from "@/components/amex-platinum-reserve-apply-link";
import { AxisApplyLink } from "@/components/axis-apply-link";
import { SbiApplyLink } from "@/components/sbi-apply-link";
import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";
import { isAxisBankCard } from "@/lib/cards/axisApply";
import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
import { issuerBrandTileClass } from "@/lib/cards/issuerBrandTile";
import { isSbiCard } from "@/lib/cards/sbiApply";
import {
  buildCatalogSearchHaystack,
  matchesCatalogSearchQuery,
} from "@/lib/search/catalogTextSearch";
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

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400";

const cardDetailsButtonClass =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl border-2 border-indigo-400/85 bg-indigo-50 px-3 text-sm font-semibold text-indigo-950 shadow-sm transition hover:border-indigo-500 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/55 dark:bg-indigo-950/45 dark:text-indigo-100 dark:hover:border-indigo-400 dark:hover:bg-indigo-900/55";

const sectionShell =
  "rounded-3xl border border-zinc-300/90 bg-white p-8 shadow-md shadow-zinc-900/[0.06] ring-1 ring-zinc-950/[0.04] dark:border-zinc-600 dark:bg-zinc-900/70 dark:shadow-black/40 dark:ring-white/[0.06] sm:p-10";

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

const browseToolbarBtnClass =
  "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-zinc-700 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-200";

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

export function AllCardsBrowse({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const skipNextUrlSync = useRef(true);

  const [cards, setCards] = useState<CreditCard[]>([]);
  const [search, setSearch] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    setSearch(initialQuery);
    skipNextUrlSync.current = true;
  }, [initialQuery]);

  useEffect(() => {
    if (pathname !== "/cards") return;
    const timer = window.setTimeout(() => {
      if (skipNextUrlSync.current) {
        skipNextUrlSync.current = false;
        return;
      }
      const q = search.trim();
      const next = q
        ? `${pathname}?q=${encodeURIComponent(q)}`
        : pathname;
      router.replace(next, { scroll: false });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [search, pathname, router]);

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
      if (catalogNetwork) params.set("network", catalogNetwork);
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
    const q = search.trim();
    if (q.length < 2) {
      setSearchAiOrder(null);
      setSearchAiLoading(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setSearchAiLoading(true);
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
      setSearchAiLoading(false);
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
    const q = search.trim();
    if (!q) return feeTypeFilteredCards;

    return feeTypeFilteredCards.filter((card) => {
      const haystack = buildCatalogSearchHaystack({
        card_name: card.card_name,
        bank: card.bank,
        network: card.network,
        best_for: card.best_for,
        key_benefits: card.key_benefits,
        reward_rate: card.reward_rate,
        lounge_access: card.lounge_access,
      });
      return matchesCatalogSearchQuery(haystack, q);
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <section className={sectionShell}>
        <div className={sectionHeaderRowClass}>
          <div className={sectionHeaderAccentClass} aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className={sectionTitleClass}>All cards</h1>
              <p className={sectionLeadClass}>
                {textFilteredCards.length === cards.length && !search.trim() ? (
                  <>
                    {cards.length} {cards.length === 1 ? "card" : "cards"} in the
                    catalog.
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
                    When AI is available, results can reorder by relevance after
                    you pause typing.
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

        <div className="relative mt-6 min-w-0">
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards or banks…"
            className={`${headerInputClass} ${searchAiLoading ? "pr-11" : ""}`}
            aria-label="Search cards"
            aria-busy={searchAiLoading}
          />
          {searchAiLoading ? (
            <span
              className="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center text-indigo-600 dark:text-indigo-400"
              role="status"
              aria-live="polite"
            >
              <Spinner className="h-4 w-4" />
              <span className="sr-only">Updating relevance order…</span>
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <Link
            href="/#categories"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Browse by category (all cards on each list)
          </Link>
        </p>

        {!loading && !error && cards.length > 0 && browseFilterOpen ? (
          <div
            id="browse-filter-panel"
            className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-700 dark:bg-zinc-950/40"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Filter by fees, reward type &amp; network
            </h2>
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
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Sort order
            </h2>
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
                  <option value="joining_asc">Joining fee (low → high)</option>
                  <option value="joining_desc">Joining fee (high → low)</option>
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
                    <>AI order unavailable — using A–Z</>
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
                  Production loads from Supabase (
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">
                    credit_cards
                  </code>
                  ), not from repo{" "}
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">
                    data/
                  </code>
                  . Import rows into the same Supabase project your Vercel env
                  points to, and confirm{" "}
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  and keys are set in Vercel.
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
                      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        <Link
                          href={`/card/${card.id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {card.card_name}
                        </Link>
                      </h2>
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
                    {isAmexPlatinumReserveCard(card.card_name, card.bank) ? (
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
    </main>
  );
}
