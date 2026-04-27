"use client";

import { useMemo, useState } from "react";
import type { BrowseCreditCard } from "@/components/BrowseSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const fallbackCards: BrowseCreditCard[] = [
  {
    id: "compare-cashback",
    card_name: "Cashback Plus Card",
    bank: "CredGenie Bank",
    annual_fee: 999,
    reward_type: "cashback",
    reward_rate: "Up to 5% cashback",
    best_for: "Online shopping",
    key_benefits: "Simple cashback on popular online merchants.",
  },
  {
    id: "compare-travel",
    card_name: "Travel Elite Card",
    bank: "CredGenie Bank",
    annual_fee: 2500,
    reward_type: "points",
    reward_rate: "10X travel points",
    best_for: "Travel",
    key_benefits: "Airport lounge access and travel rewards.",
  },
  {
    id: "compare-fuel",
    card_name: "Fuel Saver Card",
    bank: "CredGenie Bank",
    annual_fee: 499,
    reward_type: "cashback",
    reward_rate: "Fuel surcharge waiver",
    best_for: "Fuel",
    key_benefits: "Designed for fuel and daily spends.",
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

export function CompareDrawer({ cards }: { cards: BrowseCreditCard[] }) {
  const compareCards = useMemo(
    () => (cards.length >= 2 ? cards : fallbackCards),
    [cards]
  );
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareQuery, setCompareQuery] = useState("");

  const validSelectedIds = useMemo(() => {
    const validIds = new Set(compareCards.map((card) => card.id));
    return selectedIds.filter((id) => validIds.has(id)).slice(0, 3);
  }, [compareCards, selectedIds]);

  const filteredCompareCards = useMemo(() => {
    const q = compareQuery.trim().toLowerCase();
    if (!q) return compareCards;
    return compareCards.filter((card) => {
      const text = `${card.card_name} ${card.bank} ${card.reward_type} ${
        card.reward_rate ?? ""
      } ${card.best_for ?? ""} ${card.key_benefits ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [compareCards, compareQuery]);

  const selectedCards = compareCards.filter((card) =>
    validSelectedIds.includes(card.id)
  );

  const toggleCard = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      const validIds = new Set(compareCards.map((card) => card.id));
      const currentValid = current.filter((item) => validIds.has(item));
      if (currentValid.length >= 3) return currentValid;
      return [...current, id];
    });
  };

  return (
    <section
      id="compare"
      className="scroll-mt-28 rounded-[2rem] border border-zinc-200/70 bg-white p-5 shadow-md shadow-zinc-900/[0.04] sm:p-8 lg:p-10"
      aria-labelledby="compare-heading"
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <Badge variant="violet" className="uppercase tracking-[0.18em]">
              Compare Cards
            </Badge>
            <h2
              id="compare-heading"
              className="mt-3 text-3xl font-black tracking-tight text-zinc-950"
            >
              Compare top cards side by side to find your best match.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
              Review fees, rewards, travel perks, and overall fit—all in one place.
            </p>
          </div>
          <SheetTrigger asChild>
            <Button variant="gradient" size="lg">
              Open Compare
            </Button>
          </SheetTrigger>
        </div>

        <SheetContent className="lg:w-[min(1120px,94vw)]">
          <div className="flex items-start justify-between gap-4">
            <SheetHeader>
              <SheetTitle>Card comparison</SheetTitle>
              <SheetDescription>
                Search the catalog and select two or three cards to compare.
              </SheetDescription>
            </SheetHeader>
            <SheetClose asChild>
              <Button variant="outline" size="sm" className="rounded-full">
                Close
              </Button>
            </SheetClose>
          </div>

          <div className="mt-5">
            <Input
              type="search"
              value={compareQuery}
              onChange={(event) => setCompareQuery(event.target.value)}
              placeholder="Search cards to compare..."
            />
            <p className="mt-2 text-xs font-medium text-zinc-500">
              {validSelectedIds.length}/3 selected
            </p>
          </div>

          <div className="mt-4 max-h-56 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
            <div className="flex flex-wrap gap-2">
            {filteredCompareCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => toggleCard(card.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                  validSelectedIds.includes(card.id)
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                )}
              >
                {card.card_name}
              </button>
            ))}
            </div>
            {filteredCompareCards.length === 0 ? (
              <p className="text-sm text-zinc-500">No cards match this search.</p>
            ) : null}
          </div>

          {selectedCards.length >= 2 ? (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-700">
                  <tr>
                    <th className="w-32 px-4 py-3 font-black">Field</th>
                    {selectedCards.map((card) => (
                      <th key={card.id} className="px-4 py-3 font-black">
                        {card.card_name}
                        <span className="mt-1 block text-xs font-medium text-zinc-500">
                          {card.bank}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  <tr>
                    <td className="px-4 py-3 font-bold text-zinc-500">Fees</td>
                    {selectedCards.map((card) => (
                      <td key={`${card.id}-fee`} className="px-4 py-3">
                        {formatInr(card.annual_fee)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-zinc-500">Rewards</td>
                    {selectedCards.map((card) => (
                      <td key={`${card.id}-rewards`} className="px-4 py-3">
                        {card.reward_rate ?? card.reward_type}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-zinc-500">Best for</td>
                    {selectedCards.map((card) => (
                      <td key={`${card.id}-best`} className="px-4 py-3">
                        {card.best_for ?? "Everyday spends"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-zinc-500">Pros / Cons</td>
                    {selectedCards.map((card) => (
                      <td key={`${card.id}-pros`} className="px-4 py-3">
                        {card.key_benefits ?? "Compare reward value against fees."}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-600">
              Select at least two cards to build a side-by-side comparison.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
