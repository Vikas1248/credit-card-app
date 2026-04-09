"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { rewardCalculator } from "@/lib/recommend/rewardCalculator";

type CreditCard = {
  id: string;
  card_name: string;
  bank: string;
  network: "Visa" | "Mastercard";
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
  network: "Visa" | "Mastercard";
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

const sectionShell =
  "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-8";

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

function SiteHeader({
  search,
  onSearchChange,
  onRefresh,
  loadingCards,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  loadingCards: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-xl pr-2 text-zinc-900 dark:text-zinc-100"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white shadow-md shadow-blue-600/25"
              aria-hidden
            >
              C
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-tight">
                Cardwise
              </span>
              <span className="hidden text-[11px] font-medium text-zinc-500 sm:block dark:text-zinc-400">
                Credit card intelligence
              </span>
            </div>
          </Link>

          <nav
            className="order-last flex w-full gap-0.5 overflow-x-auto pb-1 sm:order-none sm:w-auto sm:pb-0"
            aria-label="Sections"
          >
            {(
              [
                ["#browse", "Browse"],
                ["#match", "Match spend"],
                ["#compare", "Compare"],
              ] as const
            ).map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="relative min-w-0 flex-1 basis-[200px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
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
              className={`${inputClass} pl-10`}
              aria-label="Search cards"
            />
          </div>

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loadingCards}
            className={btnGhost}
            title="Reload card list from server"
          >
            {loadingCards ? (
              <>
                <Spinner />
                <span className="hidden sm:inline">Syncing</span>
              </>
            ) : (
              <>
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline">Sync</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function BrowseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}

function PicksSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-80 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
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

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/cards?limit=200", { cache: "no-store" });
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

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return cards;

    return cards.filter((card) => {
      const text = [card.card_name, card.bank].join(" ").toLowerCase();

      return text.includes(query);
    });
  }, [cards, search]);

  const cardsSortedByName = useMemo(
    () => [...cards].sort((a, b) => a.card_name.localeCompare(b.card_name)),
    [cards]
  );

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

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <SiteHeader
        search={search}
        onSearchChange={setSearch}
        onRefresh={loadCards}
        loadingCards={loading}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-10 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white px-5 py-6 dark:border-blue-900/40 dark:from-blue-950/40 dark:to-zinc-900 sm:px-8 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Welcome
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Pick a card that fits how you actually spend
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Tell us your monthly dining, travel, shopping, and fuel spend—we rank
            cards by estimated yearly rewards. Compare any two products, then browse
            the full catalog with search in the header.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="#match"
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:hover:bg-blue-500"
            >
              Start with my spend
            </a>
            <a
              href="#browse"
              className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Browse all cards
            </a>
          </div>
        </div>

        <div className="space-y-10 sm:space-y-12">
          <section id="match" className={`scroll-mt-24 ${sectionShell}`}>
            <div className="flex flex-col gap-2 border-b border-zinc-100 pb-5 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">Match my spend</h2>
                <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                  Average monthly spend per category (INR). We rank by estimated
                  yearly rewards from your profile.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Step 1 · Your spend
              </span>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 sm:p-5">
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

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Short summaries need{" "}
                <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                  OPENAI_API_KEY
                </code>{" "}
                on the server.
              </p>
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
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {recommendations.map((card, index) => {
                  const isBest = index === 0;
                  const monthlyTotal = card.yearly_reward_inr / 12;
                  return (
                    <article
                      key={card.id}
                      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-zinc-950 ${
                        isBest
                          ? "border-emerald-500 ring-2 ring-emerald-500/25 dark:border-emerald-500"
                          : "border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
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
                        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                          <dt className="text-xs font-medium text-zinc-500">
                            Monthly reward
                          </dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {formatInr(monthlyTotal)}
                          </dd>
                        </div>
                        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
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

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500">
                          Fee {formatInr(card.annual_fee)} ·{" "}
                          {card.reward_type === "cashback"
                            ? "Cashback"
                            : "Points"}{" "}
                          · {card.reward_rate ?? "—"}
                        </p>
                        <Link
                          href={`/card/${card.id}`}
                          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Full details →
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section id="compare" className={`scroll-mt-24 ${sectionShell}`}>
            <div className="flex flex-col gap-2 border-b border-zinc-100 pb-5 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">Compare two cards</h2>
                <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                  Same monthly category totals as Match my spend. Choose two
                  products to see fees, reward rates, and estimated returns
                  side-by-side.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Side-by-side
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
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

        <section id="browse" className={`scroll-mt-24 ${sectionShell}`}>
          <div className="flex flex-col gap-3 border-b border-zinc-100 pb-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Browse catalog</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Filter with the search field in the header. {filteredCards.length}{" "}
                {filteredCards.length === 1 ? "card" : "cards"}
                {search.trim() ? " match" : " total"}.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-6">
              <BrowseGridSkeleton />
            </div>
          ) : error ? (
            <div
              className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              <span className="font-semibold">Couldn’t load cards</span>
              <span>{error}</span>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                No cards match your search
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Try another name or bank, or clear the search box.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCards.map((card) => (
                <article
                  key={card.id}
                  className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-snug tracking-tight">
                      <Link
                        href={`/card/${card.id}`}
                        className="text-zinc-900 transition hover:text-blue-600 dark:text-zinc-50 dark:hover:text-blue-400"
                      >
                        {card.card_name}
                      </Link>
                    </h3>
                    <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                      {card.network}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {card.bank}
                  </p>

                  <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Annual fee</dt>
                      <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatInr(card.annual_fee)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Rewards</dt>
                      <dd className="text-right font-medium capitalize text-zinc-800 dark:text-zinc-200">
                        {card.reward_type}
                      </dd>
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      <dt className="text-zinc-500">Rate</dt>
                      <dd className="mt-0.5 line-clamp-2 text-sm">
                        {card.reward_rate ?? "—"}
                      </dd>
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      <dt className="text-zinc-500">Best for</dt>
                      <dd className="mt-0.5 line-clamp-2 text-sm">
                        {card.best_for ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/card/${card.id}`}
                    className={`${btnPrimary} mt-auto w-full text-center no-underline`}
                  >
                    View details
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
        </div>
      </main>
      <footer className="border-t border-zinc-200/80 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        Cardwise uses your data for estimates only. Not financial advice.
      </footer>
    </div>
  );
}
