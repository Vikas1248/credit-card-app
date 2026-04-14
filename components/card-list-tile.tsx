"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CardKeyBenefits } from "@/components/card-key-benefits";
import { CardTopRewardTag } from "@/components/card-top-reward-tag";
import { issuerBrandTileClass } from "@/lib/cards/issuerBrandTile";
import type { CardNetwork } from "@/lib/types/card";

type CardListTileModel = {
  id: string;
  card_name: string;
  bank: string;
  network: CardNetwork;
  annual_fee: number;
  joining_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  best_for: string | null;
  key_benefits: string | null;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
  metadata?: Record<string, unknown> | null;
};

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function CardListTile({
  card,
  rightSummary,
  actions,
}: {
  card: CardListTileModel;
  rightSummary?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <li
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              <Link
                href={`/card/${card.id}`}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                {card.card_name}
              </Link>
            </h2>
            <CardTopRewardTag card={card} />
          </div>
          <CardKeyBenefits card={card} />
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            <div>
              <span className="text-zinc-500">Annual fee </span>
              <span className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatInr(card.annual_fee)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Joining fee </span>
              <span className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatInr(card.joining_fee)}
              </span>
            </div>
            <div className="font-medium capitalize">{card.reward_type}</div>
          </dl>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:ml-auto sm:w-[11rem]">
          {rightSummary}
          {actions}
        </div>
      </div>
    </li>
  );
}
