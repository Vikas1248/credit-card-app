"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AIChatAdvisor } from "@/components/AIChatAdvisor";
import { CredGenieLogo } from "@/components/brand/credgenie-logo";
import { BrowseSection, type BrowseCreditCard } from "@/components/BrowseSection";
import { CompareDrawer } from "@/components/CompareDrawer";
import { HomeNavLink } from "@/components/home-nav-link";
import { HeroSection } from "@/components/HeroSection";
import { RecommendationQuiz } from "@/components/RecommendationQuiz";
import { SITE_NAME } from "@/lib/site";
import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
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

const sectionNavItems = [
  ["#chat-advisor", "AI Advisor"],
  ["#recommendation-quiz", "Recommend Me"],
  ["#compare", "Compare Cards"],
  ["/cards", "Browse Cards"],
  ["/guides", "Guides"],
] as const;

const siteHeaderNavItemClass =
  "shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-zinc-600 transition hover:bg-white hover:text-zinc-950 hover:shadow-sm";

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <HomeNavLink className="flex items-center gap-2.5">
          <CredGenieLogo />
        </HomeNavLink>

        <nav
          className="flex gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-zinc-50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Site navigation"
        >
          <HomeNavLink className={siteHeaderNavItemClass}>Home</HomeNavLink>
          {sectionNavItems.map(([href, label]) =>
            href.startsWith("/") ? (
              <Link
                key={href}
                href={href}
                className={siteHeaderNavItemClass}
              >
                {label}
              </Link>
            ) : (
              <a
                key={href}
                href={href}
                className={siteHeaderNavItemClass}
              >
                {label}
              </a>
            )
          )}
        </nav>
      </div>
    </header>
  );
}

export default function Home() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#hero") return;
    window.requestAnimationFrame(() => {
      document.getElementById("hero")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-950">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-8 sm:space-y-10">
          <HeroSection />
          <AIChatAdvisor />
          <RecommendationQuiz />
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
        <CredGenieLogo iconOnly iconClassName="h-14 w-14 rounded-full shadow-none" />
      </a>

    </div>
  );
}
