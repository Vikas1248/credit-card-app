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
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 px-4 py-10 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-zinc-100 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <section className="mb-8 rounded-3xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                Smart Card Finder
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Find Your Perfect Credit Card
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                Search by card name, explore top picks by spending profile, and
                compare rewards side-by-side.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadCards()}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Refresh cards
            </button>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Look up cards
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by card name or bank..."
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-blue-500 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        </section>

        <section className="mb-10 rounded-3xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-8">
          <h2 className="text-2xl font-semibold">Top cards for your spend</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter average monthly spend per category (INR). We rank cards by estimated
            yearly rewards from your profile.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-medium text-zinc-500">
              Dining / month
              <input
                type="number"
                min={0}
                step={100}
                value={spendDining}
                onChange={(event) => setSpendDining(event.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-500">
              Travel / month
              <input
                type="number"
                min={0}
                step={100}
                value={spendTravel}
                onChange={(event) => setSpendTravel(event.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-500">
              Shopping / month
              <input
                type="number"
                min={0}
                step={100}
                value={spendShopping}
                onChange={(event) => setSpendShopping(event.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-500">
              Fuel / month
              <input
                type="number"
                min={0}
                step={100}
                value={spendFuel}
                onChange={(event) => setSpendFuel(event.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void loadRecommendations()}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {recommendationLoading ? "Calculating..." : "Get top picks"}
          </button>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Personalized summaries use OpenAI when{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-[10px] dark:bg-zinc-800">
              OPENAI_API_KEY
            </code>{" "}
            is set on the server.
          </p>

          {recommendationError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {recommendationError}
            </p>
          ) : null}

          {recommendations.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {recommendations.map((card, index) => {
                const isBest = index === 0;
                const monthlyTotal = card.yearly_reward_inr / 12;
                return (
                  <article
                    key={card.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-zinc-950 ${
                      isBest
                        ? "border-emerald-500 ring-2 ring-emerald-500/30 dark:border-emerald-500"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                        #{index + 1} pick
                      </p>
                      {isBest ? (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                          Best for YOU
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold leading-snug">
                      <Link
                        href={`/card/${card.id}`}
                        className="transition hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {card.card_name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {card.bank} · {card.network}
                    </p>

                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                        <dt className="text-xs font-medium text-zinc-500">
                          Monthly reward
                        </dt>
                        <dd className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatInr(monthlyTotal)}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                        <dt className="text-xs font-medium text-zinc-500">
                          Yearly reward
                        </dt>
                        <dd className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatInr(card.yearly_reward_inr)}
                        </dd>
                      </div>
                    </dl>

                    {card.explanation ? (
                      <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50/90 px-3 py-3 text-sm leading-relaxed text-zinc-800 dark:border-blue-900/40 dark:bg-blue-950/50 dark:text-zinc-200">
                        {card.explanation}
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Category breakdown (est. reward)
                    </p>
                    <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 text-sm dark:border-zinc-700">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                            <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                              Category
                            </th>
                            <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                              / month
                            </th>
                            <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                              / year
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

                    <p className="mt-3 text-xs text-zinc-500">
                      Annual fee {formatInr(card.annual_fee)} ·{" "}
                      {card.reward_type === "cashback" ? "Cashback" : "Points"} ·{" "}
                      {card.reward_rate ?? "—"}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="mb-10 rounded-3xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-8">
          <h2 className="text-2xl font-semibold">Compare 2 cards</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Pick two cards. Estimated rewards use the same monthly category spend
            as in the section above (dining, travel, shopping, fuel).
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-500">
              Card A
              <select
                value={compareIdA}
                onChange={(e) => {
                  const v = e.target.value;
                  setCompareIdA(v);
                  if (v && v === compareIdB) setCompareIdB("");
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">Select a card…</option>
                {cardsSortedByName.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === compareIdB}>
                    {c.card_name} — {c.bank}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-500">
              Card B
              <select
                value={compareIdB}
                onChange={(e) => {
                  const v = e.target.value;
                  setCompareIdB(v);
                  if (v && v === compareIdA) setCompareIdA("");
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">Select a card…</option>
                {cardsSortedByName.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === compareIdA}>
                    {c.card_name} — {c.bank}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!parsedSpendForCompare ? (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
              Enter valid non-negative monthly spend amounts above to see estimated
              rewards.
            </p>
          ) : null}

          {compareLeft && compareRight && comparisonMetrics ? (
            <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
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

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Best Card in Every Category</h2>
            <span className="text-sm text-zinc-500">
              {filteredCards.length} cards
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading cards...
            </p>
          ) : error ? (
            <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : filteredCards.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No cards found for your search.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCards.map((card) => (
                <article
                  key={card.id}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-6">
                      <Link
                        href={`/card/${card.id}`}
                        className="transition group-hover:text-blue-600 dark:group-hover:text-blue-400"
                      >
                        {card.card_name}
                      </Link>
                    </h3>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {card.network}
                    </span>
                  </div>

                  <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {card.bank}
                  </p>

                  <div className="space-y-1.5 text-sm">
                    <p>
                      <span className="font-medium">Annual fee:</span> Rs.{" "}
                      {card.annual_fee}
                    </p>
                    <p>
                      <span className="font-medium">Reward type:</span>{" "}
                      {card.reward_type}
                    </p>
                    <p>
                      <span className="font-medium">Reward rate:</span>{" "}
                      {card.reward_rate ?? "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Best for:</span>{" "}
                      {card.best_for ?? "N/A"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
