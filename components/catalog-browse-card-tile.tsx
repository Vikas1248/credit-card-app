import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type CatalogBrowseCardFields = {
  id: string;
  card_name: string;
  bank: string;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  best_for: string | null;
  key_benefits: string | null;
};

function formatInrFee(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Short label for header chip so long DB `best_for` strings stay compact. */
export function previewChipLabel(card: CatalogBrowseCardFields): string {
  const raw =
    card.best_for ??
    (card.reward_type === "cashback" ? "Cashback" : "Points");
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= 40) return t;
  return `${t.slice(0, 37)}…`;
}

type CatalogBrowseCardTileProps = {
  card: CatalogBrowseCardFields;
  detailsHref: string;
  /** Defaults to "Details" (homepage Search & filter preview). */
  detailsLabel?: string;
  /** Optional slot below the fee/details row (e.g. issuer Apply links on `/cards`). */
  footerExtra?: ReactNode;
};

export function CatalogBrowseCardTile({
  card,
  detailsHref,
  detailsLabel = "Details",
  footerExtra,
}: CatalogBrowseCardTileProps) {
  const chip = previewChipLabel(card);
  const rewardLine =
    card.reward_rate ?? card.best_for ?? "Rewards and benefits";

  return (
    <Card className="group flex h-full min-h-[17rem] flex-col overflow-hidden rounded-3xl border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/[0.03] transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-900/[0.08]">
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
            <span className="line-clamp-2 break-words">{chip}</span>
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
            {card.key_benefits?.trim() ||
              "Compare fees, rewards, and category fit."}
          </p>
        </div>
        <div className="mt-auto flex flex-shrink-0 flex-col gap-2 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate rounded-full bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500 ring-1 ring-zinc-200">
              Fee {formatInrFee(card.annual_fee)}
            </span>
            <Link
              href={detailsHref}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
            >
              {detailsLabel}
            </Link>
          </div>
          {footerExtra ? (
            <div className="grid w-full gap-2">{footerExtra}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
