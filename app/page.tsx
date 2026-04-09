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
  id: string;
  card_name: string;
  bank: string;
  network: "Visa" | "Mastercard";
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  reward_score: number;
  eligibility_score: number;
  final_score: number;
};

export default function Home() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salary, setSalary] = useState("1200000");
  const [categories, setCategories] = useState("travel, shopping");
  const [prefRewardType, setPrefRewardType] = useState<"cashback" | "points">(
    "points"
  );
  const [loungeRequired, setLoungeRequired] = useState(true);
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

      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salary: parsedSalary,
          spending_categories: categories
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          preferences: {
            preferred_reward_type: prefRewardType,
            lounge_required: loungeRequired,
          },
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
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Credit Cards
            </h1>
            <button
              type="button"
              onClick={() => void loadCards()}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Refresh cards
            </button>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Search and compare cards by bank, rewards, and best use case.
          </p>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by card name or bank..."
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-blue-500 transition focus:ring-2 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        <section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold">Recommended for you</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your profile to get top 3 credit card recommendations.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="number"
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
              placeholder="Annual salary"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <input
              type="text"
              value={categories}
              onChange={(event) => setCategories(event.target.value)}
              placeholder="Categories (comma separated)"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <select
              value={prefRewardType}
              onChange={(event) =>
                setPrefRewardType(event.target.value as "cashback" | "points")
              }
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="points">Points</option>
              <option value="cashback">Cashback</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <input
                type="checkbox"
                checked={loungeRequired}
                onChange={(event) => setLoungeRequired(event.target.checked)}
              />
              Lounge required
            </label>
          </div>

          <button
            type="button"
            onClick={() => void loadRecommendations()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            {recommendationLoading ? "Getting recommendations..." : "Recommend top 3"}
          </button>

          {recommendationError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {recommendationError}
            </p>
          ) : null}

          {recommendations.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {recommendations.map((card, index) => (
                <article
                  key={card.id}
                  className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    #{index + 1}
                  </p>
                  <h3 className="mt-1 font-semibold">{card.card_name}</h3>
                  <p className="mt-1 text-sm">{card.bank}</p>
                  <p className="mt-2 text-sm">Annual fee: Rs. {card.annual_fee}</p>
                  <p className="text-sm">Reward rate: {card.reward_rate ?? "N/A"}</p>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Score: {card.final_score} (reward {card.reward_score} +
                    eligibility {card.eligibility_score})
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </section>

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
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => (
              <article
                key={card.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    <Link
                      href={`/card/${card.id}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {card.card_name}
                    </Link>
                  </h2>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {card.network}
                  </span>
                </div>

                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {card.bank}
                </p>

                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Joining fee:</span> Rs.
                    {card.joining_fee}
                  </p>
                  <p>
                    <span className="font-medium">Annual fee:</span> Rs.
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
                    <span className="font-medium">Lounge access:</span>{" "}
                    {card.lounge_access ?? "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Best for:</span>{" "}
                    {card.best_for ?? "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Key benefits:</span>{" "}
                    {card.key_benefits ?? "N/A"}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
