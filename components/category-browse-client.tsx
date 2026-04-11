"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
import { issuerBrandTileClass } from "@/lib/cards/issuerBrandTile";
import {
  compareCardsBySpendCategory,
  rewardPctForSpendCategory,
  spendCategoryBySlug,
  type SpendCategorySlug,
} from "@/lib/spendCategories";
import type { CardNetwork } from "@/lib/types/card";
import { SpendCategoryIcon } from "@/components/spend-category-icons";

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

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value}%`;
}

export function CategoryBrowseClient({ slug }: { slug: SpendCategorySlug }) {
  const meta = spendCategoryBySlug(slug);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        if (!cancelled) setCards(result.cards ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unexpected error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    return [...cards].sort((a, b) => compareCardsBySpendCategory(slug, a, b));
  }, [cards, slug]);

  const withRate = sorted.filter((c) => rewardPctForSpendCategory(c, slug) != null)
    .length;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/#categories"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <span aria-hidden>←</span> All categories
        </Link>

        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
            aria-hidden
          >
            <SpendCategoryIcon slug={slug} className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              {meta.label} cards
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              {meta.blurb} Sorted by listed {meta.label.toLowerCase()} reward %
              (highest first). Cards without data for this category appear last.
            </p>
            {!loading && !error ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                {cards.length} {cards.length === 1 ? "card" : "cards"}
                {withRate > 0
                  ? ` · ${withRate} with a ${meta.label.toLowerCase()} rate`
                  : ""}
              </p>
            ) : null}
          </div>
        </header>

        {loading ? (
          <ul className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800"
              />
            ))}
          </ul>
        ) : error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No cards in the catalog yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((card) => {
              const pct = rewardPctForSpendCategory(card, slug);
              return (
                <li
                  key={card.id}
                  className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${issuerBrandTileClass(card.bank, card.network)}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        <Link
                          href={`/card/${card.id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {card.card_name}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {card.bank} · {card.network}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                        {card.best_for ?? card.reward_rate ?? "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <div className="rounded-xl bg-white/80 px-3 py-2 text-right shadow-sm ring-1 ring-zinc-200/70 dark:bg-zinc-950/50 dark:ring-zinc-600/50">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {meta.label} earn
                        </p>
                        <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatPct(pct)}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Fee {formatInr(card.annual_fee)}/yr ·{" "}
                        <span className="capitalize">{card.reward_type}</span>
                      </p>
                      <Link
                        href={`/card/${card.id}`}
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border-2 border-indigo-400/85 bg-indigo-50 px-4 text-sm font-semibold text-indigo-950 shadow-sm transition hover:border-indigo-500 hover:bg-indigo-100 dark:border-indigo-400/55 dark:bg-indigo-950/45 dark:text-indigo-100 dark:hover:bg-indigo-900/55 sm:w-auto"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
