"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
};

type Recommendation = {
  card_id: string;
  card_name: string;
  reason: string;
};

export default function Home() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salary, setSalary] = useState("1200000");
  const [categories, setCategories] = useState("travel, shopping");
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null
  );
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/cards", { cache: "no-store" });
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

      const parsedSalary = Number(salary);
      if (!Number.isFinite(parsedSalary) || parsedSalary <= 0) {
        throw new Error("Please enter a valid salary.");
      }

      const response = await fetch("/api/recommend/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_spend: parsedSalary,
          categories: categories
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const result: { recommendations?: Recommendation[]; error?: string } =
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
          <h2 className="text-2xl font-semibold">Top 2 Cards for Your Spending</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Add your monthly spend and categories to get AI-ranked recommendations
            with reasons.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="number"
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
              placeholder="Monthly spend (INR)"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <input
              type="text"
              value={categories}
              onChange={(event) => setCategories(event.target.value)}
              placeholder="Categories (travel, dining, groceries)"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <button
            type="button"
            onClick={() => void loadRecommendations()}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {recommendationLoading ? "Getting recommendations..." : "Get top picks"}
          </button>

          {recommendationError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {recommendationError}
            </p>
          ) : null}

          {recommendations.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {recommendations.map((card, index) => (
                <article
                  key={card.card_id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    #{index + 1} Pick
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{card.card_name}</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {card.reason}
                  </p>
                </article>
              ))}
            </div>
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
