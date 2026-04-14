"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AmexGenericApplyLink } from "@/components/amex-generic-apply-link";
import { AmexPlatinumReserveApplyLink } from "@/components/amex-platinum-reserve-apply-link";
import { AxisApplyLink } from "@/components/axis-apply-link";
import { CardKeyBenefits } from "@/components/card-key-benefits";
import { CardTopRewardTag } from "@/components/card-top-reward-tag";
import { HdfcApplyLink } from "@/components/hdfc-apply-link";
import { IndusIndApplyLink } from "@/components/indusind-apply-link";
import { SbiApplyLink } from "@/components/sbi-apply-link";
import { isAmexCardUsingGenericApply } from "@/lib/cards/amexGenericApply";
import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";
import { isAxisBankCard } from "@/lib/cards/axisApply";
import { hdfcCardShowsApply } from "@/lib/cards/hdfcApply";
import { indusindCardShowsApply } from "@/lib/cards/indusindApply";
import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
import { issuerBrandTileClass } from "@/lib/cards/issuerBrandTile";
import { isSbiCard } from "@/lib/cards/sbiApply";
import {
  compareCardsBySpendCategory,
  rewardPctForSpendCategory,
  spendCategoryBySlug,
  type SpendCategorySlug,
} from "@/lib/spendCategories";
import type { CardNetwork } from "@/lib/types/card";
import { SpendCategoryIcon } from "@/components/spend-category-icons";
import { cardViewDetailsButtonClass } from "@/lib/cardCta";

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
  metadata: Record<string, unknown> | null;
};

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function CategoryBrowseClient({ slug }: { slug: SpendCategorySlug }) {
  const meta = spendCategoryBySlug(slug);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiParagraph, setAiParagraph] = useState<string | null>(null);
  const [aiInsightError, setAiInsightError] = useState<string | null>(null);
  const [listSort, setListSort] = useState<"earn" | "ai">("earn");
  const [categoryAiOrder, setCategoryAiOrder] = useState<string[] | null>(null);
  const [categoryOrderLoading, setCategoryOrderLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAiInsightError(null);
        const params = new URLSearchParams({ slug });
        const catalogNetwork = getOptionalCardNetworkFilter();
        if (catalogNetwork) params.set("network", catalogNetwork);
        const res = await fetch(
          `/api/cards/category-insight?${params.toString()}`,
          { cache: "no-store" }
        );
        const data: {
          source?: string;
          paragraph?: string | null;
          error?: string;
        } = await res.json();
        if (cancelled) return;
        if (data.source === "ai" && typeof data.paragraph === "string") {
          setAiParagraph(data.paragraph);
        } else {
          setAiParagraph(null);
          if (data.source === "error" && data.error) {
            setAiInsightError(data.error);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setAiParagraph(null);
          setAiInsightError(
            e instanceof Error ? e.message : "Could not load AI insight."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (listSort !== "ai") {
      setCategoryAiOrder(null);
      setCategoryOrderLoading(false);
      return;
    }
    let cancelled = false;
    setCategoryOrderLoading(true);
    void (async () => {
      try {
        const params = new URLSearchParams({ slug });
        const catalogNetwork = getOptionalCardNetworkFilter();
        if (catalogNetwork) params.set("network", catalogNetwork);
        const res = await fetch(
          `/api/cards/category-order-ai?${params.toString()}`,
          { cache: "no-store" }
        );
        const data: { source?: string; ordered_ids?: string[] | null } =
          await res.json();
        if (cancelled) return;
        if (data.source === "ai" && Array.isArray(data.ordered_ids)) {
          setCategoryAiOrder(data.ordered_ids);
        } else {
          setCategoryAiOrder(null);
        }
      } catch {
        if (!cancelled) setCategoryAiOrder(null);
      } finally {
        if (!cancelled) setCategoryOrderLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listSort, slug]);

  const sortedByEarn = useMemo(() => {
    return [...cards].sort((a, b) => compareCardsBySpendCategory(slug, a, b));
  }, [cards, slug]);

  const sorted = useMemo(() => {
    if (
      listSort === "ai" &&
      categoryAiOrder &&
      categoryAiOrder.length > 0
    ) {
      const idx = new Map(categoryAiOrder.map((id, i) => [id, i]));
      return [...cards].sort(
        (a, b) => (idx.get(a.id) ?? 1e9) - (idx.get(b.id) ?? 1e9)
      );
    }
    return sortedByEarn;
  }, [listSort, categoryAiOrder, cards, sortedByEarn]);

  const withRate = sorted.filter((c) => rewardPctForSpendCategory(c, slug) != null)
    .length;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          <Link
            href="/#categories"
            className="inline-flex items-center gap-2 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <span aria-hidden>←</span> All categories
          </Link>
          <Link
            href="/cards"
            className="inline-flex items-center gap-2 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Full catalog <span aria-hidden>→</span>
          </Link>
        </div>

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
              {meta.blurb} The full catalog is listed here—cards without a
              published {meta.label.toLowerCase()} rate show — and sort after
              cards with data. Default order is by that earn % (highest first).
              Switch to AI ranking for a holistic order when AI is available.
            </p>
            {aiParagraph ? (
              <p className="mt-4 max-w-2xl rounded-xl border border-indigo-200/70 bg-indigo-50/50 p-4 text-sm leading-relaxed text-zinc-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-zinc-300">
                {aiParagraph}
              </p>
            ) : null}
            {aiInsightError ? (
              <p className="mt-2 text-sm text-amber-800 dark:text-amber-200/90">
                {aiInsightError}
              </p>
            ) : null}

            {!loading && !error && cards.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  List order:
                </span>
                <button
                  type="button"
                  onClick={() => setListSort("earn")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    listSort === "earn"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  Earn % (data)
                </button>
                <button
                  type="button"
                  onClick={() => setListSort("ai")}
                  disabled={categoryOrderLoading}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                    listSort === "ai"
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "border border-indigo-200 bg-indigo-50 text-indigo-950 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-100 dark:hover:bg-indigo-900/50"
                  }`}
                >
                  {categoryOrderLoading ? "AI order…" : "AI ranking"}
                </button>
                {listSort === "ai" &&
                !categoryOrderLoading &&
                !categoryAiOrder ? (
                  <span className="text-xs text-zinc-500">
                    (AI unavailable — using earn %)
                  </span>
                ) : null}
              </div>
            ) : null}

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
          <ul className="space-y-6">
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
          <ul className="space-y-6">
            {sorted.map((card) => {
              return (
                <li
                  key={card.id}
                  className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${issuerBrandTileClass(card.bank, card.network)}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-white/90 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
                          {card.network}
                        </span>
                        <span className="inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-white/90 px-2.5 text-[11px] font-semibold tracking-wide text-zinc-700 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
                          {card.bank}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        <Link
                          href={`/card/${card.id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {card.card_name}
                        </Link>
                      </h2>
                      <div className="mt-2">
                        <CardTopRewardTag card={card} />
                      </div>
                      <CardKeyBenefits card={card} />
                    </div>
                    <div className="flex w-full shrink-0 flex-col gap-2 sm:ml-auto sm:w-[9.5rem]">
                      <Link
                        href={`/card/${card.id}`}
                        className={`${cardViewDetailsButtonClass} w-full`}
                      >
                        Learn more
                      </Link>
                      {isAxisBankCard(card.bank) ? (
                        <AxisApplyLink className="w-full" />
                      ) : null}
                      {isAmexPlatinumReserveCard(card.card_name, card.bank) ? (
                        <AmexPlatinumReserveApplyLink className="w-full" />
                      ) : null}
                      {isAmexCardUsingGenericApply(card.card_name, card.bank) ? (
                        <AmexGenericApplyLink className="w-full" />
                      ) : null}
                      {isSbiCard(card.bank) ? (
                        <SbiApplyLink className="w-full" />
                      ) : null}
                      {hdfcCardShowsApply(card.bank, card.metadata) ? (
                        <HdfcApplyLink
                          metadata={card.metadata}
                          className="w-full"
                        />
                      ) : null}
                      {indusindCardShowsApply(card.bank, card.metadata) ? (
                        <IndusIndApplyLink
                          metadata={card.metadata}
                          className="w-full"
                        />
                      ) : null}
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
