"use client";

import { useEffect, useMemo, useState } from "react";

type UserProfile = {
  monthlySpend: number;
  topCategories: string[];
  preferredRewardType: "cashback" | "points" | "miles";
  feeSensitivity: "low" | "medium" | "high";
  lifestyle: string[];
  spendContext?: {
    shopping?: {
      onlinePct: number;
      flipkartPct?: number;
      amazonPct?: number;
    };
    dining?: {
      deliveryPct: number;
      swiggyPct?: number;
      zomatoPct?: number;
    };
    travel?: {
      modes: Array<"flights" | "trains" | "hotels" | "cabs">;
      preferredAirline: "none" | "indigo" | "air_india" | "vistara";
      flightsPct: number;
      preferredAirlinePct?: number;
    };
  };
};

type RecommendedCard = {
  card_id: string;
  card_name: string;
  bank: string;
  score: number;
  yearlyReward: number;
  annualFee: number;
  netGain: number;
  explanation: string | null;
};

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function SkeletonCard() {
  return (
    <div className="h-56 animate-pulse rounded-2xl border border-zinc-200 bg-white/70 p-5 dark:border-zinc-700 dark:bg-zinc-950/20" />
  );
}

export function RecommendedCards({ profile }: { profile: UserProfile }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<RecommendedCard[]>([]);

  const requestBody = useMemo(() => profile, [profile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/recommend-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        const data = (await res.json()) as
          | RecommendedCard[]
          | { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(
            typeof (data as any)?.error === "string"
              ? (data as any).error
              : "Failed to load recommendations."
          );
        }
        setCards(Array.isArray(data) ? data : []);
      } catch (e) {
        if (cancelled) return;
        setCards([]);
        setError(e instanceof Error ? e.message : "Failed to load recommendations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestBody]);

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
            Recommended for you
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Based on your spend pattern and preferences. Scores reflect overall fit (0–100).
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : cards.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
          {cards.map((c, idx) => {
            const best = idx === 0;
            return (
              <article
                key={c.card_id}
                className={`flex h-full flex-col overflow-hidden rounded-2xl border p-5 shadow-sm dark:border-zinc-700 ${
                  best
                    ? "border-emerald-200 bg-emerald-50/40 ring-1 ring-emerald-200 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:ring-emerald-900/40"
                    : "border-zinc-200 bg-white/70 dark:bg-zinc-950/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    {best ? "Best match" : `Pick #${idx + 1}`}
                  </span>
                  <span className="rounded-full bg-blue-600/10 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    {c.score}%
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {c.card_name}
                </p>
                <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {c.bank}
                </p>

                <dl className="mt-4 text-sm">
                  <div className="rounded-xl border border-zinc-200 bg-white/70 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Yearly rewards
                    </dt>
                    <dd className="mt-1 text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatInr(c.yearlyReward)}
                    </dd>
                  </div>
                </dl>

                {c.explanation ? (
                  <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {c.explanation}
                  </p>
                ) : null}

                <div className="mt-auto pt-4">
                  <div className="grid grid-cols-1 gap-2">
                    <a
                      href={`/card/${c.card_id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:hover:bg-blue-500"
                    >
                      View card
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          No recommendations available for this profile.
        </p>
      )}
    </section>
  );
}

