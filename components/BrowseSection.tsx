"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

/** Short label for header chip so long DB `best_for` strings don’t crowd the card name. */
function browsePreviewChipLabel(card: BrowseCreditCard): string {
  const raw =
    card.best_for ??
    (card.reward_type === "cashback" ? "Cashback" : "Points");
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= 40) return t;
  return `${t.slice(0, 37)}…`;
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
  const sourceCards = cards.length > 0 ? cards : mockCards;
  const visibleCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceCards.filter((card) => {
      const text = `${card.card_name} ${card.bank} ${card.reward_type} ${card.reward_rate ?? ""} ${card.best_for ?? ""} ${card.key_benefits ?? ""}`.toLowerCase();
      return q.length === 0 || text.includes(q);
    });
  }, [query, sourceCards]);

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
      <div>
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
            Search here or open the full catalog on Browse Cards for filters and
            sorting.
          </p>
        </div>
      </div>

      <Card className="mt-7 border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-violet-50/60 shadow-none">
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
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/25"
            >
              Search full catalog
            </button>
          </form>
          <p className="mt-2 text-xs text-zinc-500">
            This section previews a few cards. Press Enter or search to see all
            matching cards in Browse Cards.
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
        {(loading ? mockCards : visibleCards).slice(0, 6).map((card) => {
          const previewTag = browsePreviewChipLabel(card);
          const rewardLine =
            card.reward_rate ?? card.best_for ?? "Rewards and benefits";
          return (
            <Card
              key={card.id}
              className="group flex h-full min-h-[17rem] flex-col overflow-hidden rounded-3xl border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/[0.03] transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-900/[0.08]"
            >
              <div
                className="h-1 shrink-0 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400"
                aria-hidden
              />
              <CardHeader className="flex-shrink-0 space-y-0 px-5 pb-3 pt-4">
                <div className="min-w-0 space-y-2">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-base font-black leading-snug text-zinc-950">
                      {card.card_name}
                    </h3>
                    <p className="mt-1 truncate text-xs font-medium text-zinc-500">
                      {card.bank}
                    </p>
                  </div>
                  <Badge
                    variant="blue"
                    title={
                      card.best_for ??
                      (card.reward_type === "cashback" ? "Cashback" : "Points")
                    }
                    className="inline-flex max-w-full items-start rounded-2xl px-2.5 py-1.5 text-left text-[11px] font-semibold leading-snug text-blue-800"
                  >
                    <span className="line-clamp-2 break-words">{previewTag}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-0">
                <div className="min-h-[3rem] rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-blue-800">
                    {rewardLine}
                  </p>
                </div>
                <div className="mt-2 min-h-[2.5rem] flex-1">
                  <p className="line-clamp-2 text-sm leading-snug text-zinc-600">
                    {card.key_benefits ??
                      "Compare fees, rewards, and category fit."}
                  </p>
                </div>
                <div className="mt-auto flex flex-shrink-0 items-center justify-between gap-2 pt-3">
                  <span className="min-w-0 truncate rounded-full bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500 ring-1 ring-zinc-200">
                    Fee {formatInr(card.annual_fee)}
                  </span>
                  <Link
                    href={
                      card.id.startsWith("mock") ? "/cards" : `/card/${card.id}`
                    }
                    className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
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
          No cards match this search. Try another keyword or open Browse Cards
          for more options.
        </p>
      ) : null}
    </section>
  );
}
