import type { ReactNode } from "react";
import { SpendCategoryIcon } from "@/components/spend-category-icons";
import type { SpendCategorySlug } from "@/lib/spendCategories";
import type { CardNetwork } from "@/lib/types/card";

type CardKeySummary = {
  joining_fee: number;
  annual_fee: number;
  reward_type: "cashback" | "points";
  network: CardNetwork;
  dining_reward?: number | null;
  travel_reward?: number | null;
  shopping_reward?: number | null;
  fuel_reward?: number | null;
  last_updated?: string;
};

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value}%`;
}

function IconRing({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
      aria-hidden
    >
      {children}
    </span>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 010-4h14v4" />
      <path d="M3 5v14a2 2 0 002 2h16v-5" />
      <path d="M18 12a2 2 0 002 2v2a2 2 0 01-2 2h-2v-6h2z" />
    </svg>
  );
}

function CalendarFeeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}

function RewardTypeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function NetworkCardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function KeyTile({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-zinc-200/90 bg-white/80 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/40">
      <IconRing>{icon}</IconRing>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
        {sublabel ? (
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {sublabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

const CATEGORY_ROWS: { slug: SpendCategorySlug; label: string }[] = [
  { slug: "dining", label: "Dining" },
  { slug: "travel", label: "Travel" },
  { slug: "shopping", label: "Shopping" },
  { slug: "fuel", label: "Fuel" },
];

export function CardDetailKeySummary({ card }: { card: CardKeySummary }) {
  const rateKey = {
    dining: card.dining_reward,
    travel: card.travel_reward,
    shopping: card.shopping_reward,
    fuel: card.fuel_reward,
  } as const;

  const updatedLabel = card.last_updated
    ? (() => {
        const d = new Date(card.last_updated);
        return Number.isNaN(d.getTime())
          ? card.last_updated
          : d.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
      })()
    : null;

  return (
    <section className="mt-0" aria-labelledby="card-key-details-heading">
      <h2
        id="card-key-details-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
      >
        Key details
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Quick facts at a glance. See program details below for full wording.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KeyTile
          icon={<WalletIcon />}
          label="Joining fee"
          value={formatInr(card.joining_fee)}
        />
        <KeyTile
          icon={<CalendarFeeIcon />}
          label="Annual fee"
          value={formatInr(card.annual_fee)}
        />
        <KeyTile
          icon={<RewardTypeIcon />}
          label="Reward type"
          value={
            card.reward_type === "cashback" ? "Cashback" : "Reward points"
          }
        />
        <KeyTile
          icon={<NetworkCardIcon />}
          label="Network"
          value={card.network}
        />
      </div>

      <h3 className="mt-8 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Category earn rates
      </h3>
      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        Approximate % of spend where we have data.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORY_ROWS.map(({ slug, label }) => (
          <KeyTile
            key={slug}
            icon={
              <SpendCategoryIcon slug={slug} className="h-5 w-5 text-current" />
            }
            label={label}
            value={formatPct(rateKey[slug])}
          />
        ))}
      </div>

      {updatedLabel ? (
        <p className="mt-6 text-[11px] text-zinc-400 dark:text-zinc-500">
          Last updated{" "}
          <time dateTime={card.last_updated}>{updatedLabel}</time>
        </p>
      ) : null}
    </section>
  );
}
