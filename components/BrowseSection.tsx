"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type BrowseCreditCard = {
  id: string;
  card_name: string;
  bank: string;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  best_for: string | null;
  key_benefits: string | null;
};

const filters = ["Travel", "Cashback", "Fuel", "Lifetime Free"] as const;

const mockCards: BrowseCreditCard[] = [
  {
    id: "mock-travel",
    card_name: "Travel Elite Card",
    bank: "CredGenie Bank",
    annual_fee: 2500,
    reward_type: "points",
    reward_rate: "10X points on travel",
    best_for: "Travel",
    key_benefits: "Airport lounge access and accelerated miles.",
  },
  {
    id: "mock-cashback",
    card_name: "Cashback Plus Card",
    bank: "CredGenie Bank",
    annual_fee: 999,
    reward_type: "cashback",
    reward_rate: "Up to 5% cashback",
    best_for: "Cashback",
    key_benefits: "Strong online cashback across popular merchants.",
  },
  {
    id: "mock-fuel",
    card_name: "Fuel Saver Card",
    bank: "CredGenie Bank",
    annual_fee: 499,
    reward_type: "cashback",
    reward_rate: "Fuel surcharge waiver",
    best_for: "Fuel",
    key_benefits: "Useful for fuel and daily spends.",
  },
];

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function matchesFilter(card: BrowseCreditCard, filter: string): boolean {
  const text = `${card.card_name} ${card.bank} ${card.reward_type} ${card.reward_rate ?? ""} ${card.best_for ?? ""} ${card.key_benefits ?? ""}`.toLowerCase();
  if (filter === "Lifetime Free") return card.annual_fee === 0;
  return text.includes(filter.toLowerCase());
}

export function BrowseSection({
  cards,
  loading,
}: {
  cards: BrowseCreditCard[];
  loading: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const sourceCards = cards.length > 0 ? cards : mockCards;
  const visibleCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceCards.filter((card) => {
      const text = `${card.card_name} ${card.bank} ${card.reward_type} ${card.reward_rate ?? ""} ${card.best_for ?? ""} ${card.key_benefits ?? ""}`.toLowerCase();
      const matchesQuery = q.length === 0 || text.includes(q);
      const matchesActiveFilter = activeFilter
        ? matchesFilter(card, activeFilter)
        : true;
      return matchesQuery && matchesActiveFilter;
    });
  }, [activeFilter, query, sourceCards]);

  const submitSearch = () => {
    const q = query.trim();
    router.push(q ? `/cards?q=${encodeURIComponent(q)}` : "/cards");
  };

  return (
    <section
      id="browse"
      className="scroll-mt-28 rounded-[2rem] border border-zinc-200/70 bg-white p-5 shadow-md shadow-zinc-900/[0.04] sm:p-8 lg:p-10"
      aria-labelledby="browse-heading"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="blue" className="uppercase tracking-[0.18em]">
            Browse cards
          </Badge>
          <h2
            id="browse-heading"
            className="mt-3 text-3xl font-black tracking-tight text-zinc-950"
          >
            Search and filter the catalog.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
            Use quick filters for common goals or jump into the full card list
            for deeper browsing.
          </p>
        </div>
        <Link href="/cards" className="inline-flex">
          <span className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white transition hover:bg-zinc-800">
            Open full catalog
          </span>
        </Link>
      </div>

      <Card className="mt-7 bg-zinc-50 shadow-none">
        <CardContent className="p-4">
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                ⌕
              </span>
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search cards, banks, rewards..."
                className="pl-10"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              Search full catalog
            </button>
          </form>
          <p className="mt-2 text-xs text-zinc-500">
            This section previews a few cards. Press Enter or search to see all
            matching cards in Browse Cards.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  setActiveFilter((current) =>
                    current === filter ? null : filter
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                  activeFilter === filter
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(loading ? mockCards : visibleCards).slice(0, 6).map((card) => {
          const matchedFilter =
            filters.find((filter) => matchesFilter(card, filter)) ?? "Top pick";
          return (
            <Card
              key={card.id}
              className="shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="line-clamp-2 text-base font-black text-zinc-950">
                      {card.card_name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-zinc-500">
                      {card.bank}
                    </p>
                  </div>
                  <Badge variant="violet" className="text-[11px]">
                    {matchedFilter}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold text-zinc-800">
                  {card.reward_rate ?? card.best_for ?? "Rewards and benefits"}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                  {card.key_benefits ??
                    "Compare fees, rewards, and category fit."}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Fee {formatInr(card.annual_fee)}
                  </span>
                  <Link
                    href={
                      card.id.startsWith("mock") ? "/cards" : `/card/${card.id}`
                    }
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-50"
                  >
                    Details
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!loading && visibleCards.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
          No cards match this search. Try another keyword or clear the filter.
        </p>
      ) : null}
    </section>
  );
}
