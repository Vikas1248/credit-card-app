"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AIChatAdvisor } from "@/components/AIChatAdvisor";
import { BrowseSection, type BrowseCreditCard } from "@/components/BrowseSection";
import { CompareDrawer } from "@/components/CompareDrawer";
import { HeroSection } from "@/components/HeroSection";
import { RecommendationQuiz } from "@/components/RecommendationQuiz";
import { RecommendationResults } from "@/components/RecommendationResults";
import { TrustStrip } from "@/components/TrustStrip";
import { SITE_NAME } from "@/lib/site";
import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
import type { SpendCategorySlug } from "@/lib/spendCategories";
import type { CardNetwork } from "@/lib/types/card";

type CreditCard = BrowseCreditCard & {
  network: CardNetwork;
  joining_fee: number;
  lounge_access: string | null;
  last_updated: string;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
  metadata?: Record<string, unknown> | null;
};

const navItems = [
  ["#chat-advisor", "AI advisor"],
  ["#recommendation-quiz", "Quiz"],
  ["#results", "Results"],
  ["#compare", "Compare"],
  ["#browse", "Browse"],
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-lg font-black text-white shadow-md shadow-blue-600/20"
            aria-hidden
          >
            ✦
          </span>
          <span className="text-sm font-black tracking-tight text-zinc-950">
            {SITE_NAME} AI
          </span>
        </Link>

        <nav
          className="flex gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-zinc-50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Homepage sections"
        >
          {navItems.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-zinc-600 transition hover:bg-white hover:text-zinc-950 hover:shadow-sm"
            >
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#recommendation-quiz"
          className="hidden rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-black text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 lg:inline-flex"
        >
          Get started
        </a>
      </div>
    </header>
  );
}

export default function Home() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spendSplit, setSpendSplit] = useState<Record<SpendCategorySlug, number>>({
    dining: 8000,
    travel: 5000,
    shopping: 12000,
    fuel: 6000,
  });

  const handleRecommendSpendSplit = useCallback(
    (split: Record<SpendCategorySlug, number>) => {
      setSpendSplit(split);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function loadCards() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ limit: "200" });
        const catalogNetwork = getOptionalCardNetworkFilter();
        if (catalogNetwork) params.set("network", catalogNetwork);

        const response = await fetch(`/api/cards?${params.toString()}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          cards?: CreditCard[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to fetch cards");
        }

        if (!cancelled) setCards(result.cards ?? []);
      } catch (fetchError) {
        if (!cancelled) {
          setCards([]);
          setError(
            fetchError instanceof Error ? fetchError.message : "Unexpected error"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCards();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyTotal = Object.values(spendSplit).reduce(
    (total, value) => total + value,
    0
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-950">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-8 sm:space-y-10">
          <HeroSection />
          <TrustStrip />
          <AIChatAdvisor />
          <RecommendationQuiz onSpendSplitChange={handleRecommendSpendSplit} />
          <RecommendationResults />
          <CompareDrawer cards={cards} />
          <BrowseSection cards={cards} loading={loading} />

          {error ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Card catalog could not load right now, so some sections are using
              preview cards. {error}
            </p>
          ) : null}
        </div>
      </main>

      <a
        href="#chat-advisor"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-xl text-white shadow-2xl shadow-blue-900/25 transition hover:-translate-y-1"
        aria-label="Open AI chat advisor"
        title={`Open ${SITE_NAME} AI advisor`}
      >
        ✦
      </a>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-zinc-500 sm:px-6">
        Live spend context: ₹{monthlyTotal.toLocaleString("en-IN")} monthly
        profile. Recommendations remain deterministic; AI explains and extracts
        intent.
      </footer>
    </div>
  );
}
