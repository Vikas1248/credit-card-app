"use client";

import Link from "next/link";
import { AmexGenericApplyLink } from "@/components/amex-generic-apply-link";
import { AmexPlatinumReserveApplyLink } from "@/components/amex-platinum-reserve-apply-link";
import { AxisApplyLink } from "@/components/axis-apply-link";
import { CardKeyBenefits } from "@/components/card-key-benefits";
import { CardTopRewardTag } from "@/components/card-top-reward-tag";
import { HdfcApplyLink } from "@/components/hdfc-apply-link";
import { IndusIndApplyLink } from "@/components/indusind-apply-link";
import { SbiApplyLink } from "@/components/sbi-apply-link";
import { cardViewDetailsButtonClass } from "@/lib/cardCta";
import { isAmexCardUsingGenericApply } from "@/lib/cards/amexGenericApply";
import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";
import { isAxisBankCard } from "@/lib/cards/axisApply";
import { hdfcCardShowsApply } from "@/lib/cards/hdfcApply";
import { indusindCardShowsApply } from "@/lib/cards/indusindApply";
import { isSbiCard } from "@/lib/cards/sbiApply";
import type { CardNetwork } from "@/lib/types/card";

export type CatalogFullBrowseCardData = {
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

function normalizeDisplayText(
  value: string | null | undefined,
  fallback: string
): string {
  const cleaned = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

type CatalogFullBrowseCardProps = {
  card: CatalogFullBrowseCardData;
  /** Defaults to `/card/${card.id}` (use `/cards` for homepage mock ids). */
  learnMoreHref?: string;
};

export function CatalogFullBrowseCard({
  card,
  learnMoreHref,
}: CatalogFullBrowseCardProps) {
  const detailHref = learnMoreHref ?? `/card/${card.id}`;

  return (
    <div className="group relative flex h-full min-h-[26rem] flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm shadow-zinc-900/[0.03] transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-900/[0.08] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-8 items-center rounded-lg border border-blue-100 bg-blue-50/70 px-2.5 text-[11px] font-bold uppercase tracking-wide text-blue-700 shadow-sm">
          {normalizeDisplayText(card.network, "Network")}
        </span>
        <span className="inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-white px-2.5 text-[11px] font-semibold tracking-wide text-zinc-600 shadow-sm">
          {normalizeDisplayText(card.bank, "Unknown bank")}
        </span>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 space-y-2">
          <div className="min-h-[2.75rem]">
            <h2 className="text-base font-semibold leading-snug text-zinc-900">
              <Link
                href={detailHref}
                className="line-clamp-2 block hover:text-blue-600"
              >
                {normalizeDisplayText(card.card_name, "Unnamed card")}
              </Link>
            </h2>
          </div>
          <div className="flex min-h-[2.25rem] flex-wrap items-center gap-2">
            <CardTopRewardTag card={card} />
          </div>
        </div>

        <div className="mt-2 h-[4.75rem] shrink-0 overflow-hidden [&_ul]:mt-0">
          <CardKeyBenefits card={card} />
        </div>

        <dl className="mt-3 shrink-0 grid grid-cols-2 gap-2 text-sm text-zinc-600">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-3 py-2">
            <dt className="text-[11px] text-zinc-500">Annual fee</dt>
            <dd className="text-sm font-bold tabular-nums text-zinc-900">
              {formatInr(card.annual_fee)}
            </dd>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
            <dt className="text-[11px] text-zinc-500">Joining fee</dt>
            <dd className="text-sm font-bold tabular-nums text-zinc-900">
              {formatInr(card.joining_fee)}
            </dd>
          </div>
        </dl>

        <p className="mt-3 shrink-0 text-xs font-medium capitalize text-zinc-500">
          Reward type: {card.reward_type}
        </p>

        <div className="mt-auto grid shrink-0 gap-2 pt-4">
          <Link
            href={detailHref}
            className={`${cardViewDetailsButtonClass} w-full`}
          >
            Learn more
          </Link>
          {isAxisBankCard(card.bank) ? <AxisApplyLink className="w-full" /> : null}
          {isAmexPlatinumReserveCard(card.card_name, card.bank) ? (
            <AmexPlatinumReserveApplyLink className="w-full" />
          ) : null}
          {isAmexCardUsingGenericApply(card.card_name, card.bank) ? (
            <AmexGenericApplyLink className="w-full" />
          ) : null}
          {isSbiCard(card.bank) ? <SbiApplyLink className="w-full" /> : null}
          {hdfcCardShowsApply(card.bank, card.metadata) ? (
            <HdfcApplyLink metadata={card.metadata} className="w-full" />
          ) : null}
          {indusindCardShowsApply(card.bank, card.metadata) ? (
            <IndusIndApplyLink metadata={card.metadata} className="w-full" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
