import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AmexPlatinumReserveApplyLink } from "@/components/amex-platinum-reserve-apply-link";
import { AxisApplyLink } from "@/components/axis-apply-link";
import { SbiApplyLink } from "@/components/sbi-apply-link";
import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";
import { isAxisBankCard } from "@/lib/cards/axisApply";
import { isSbiCard } from "@/lib/cards/sbiApply";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CardNetwork } from "@/lib/types/card";

type CardDetailsPageProps = {
  params: Promise<{ id: string }>;
};

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
  dining_reward?: number | null;
  travel_reward?: number | null;
  shopping_reward?: number | null;
  fuel_reward?: number | null;
  metadata?: Record<string, unknown> | null;
};

function metadataHasEntries(
  meta: Record<string, unknown> | null | undefined
): boolean {
  return Boolean(meta && typeof meta === "object" && Object.keys(meta).length > 0);
}

const METADATA_LABELS: Record<string, string> = {
  affiliate_link: "Apply / referral link",
  ai_best_for: "AI summary — best for",
  ai_cons: "AI summary — drawbacks",
  ai_not_ideal_for: "AI summary — less ideal for",
  ai_pros: "AI summary — highlights",
  eligibility: "Eligibility",
  reward_conversion: "Reward conversion",
  source: "Data source",
  welcome_offer: "Welcome offer",
  milestone_rewards: "Milestone rewards",
  excluded_categories: "Excluded categories",
  annual_fee_waiver_condition: "Annual fee waiver",
  cashback_cap_monthly: "Cashback cap (monthly)",
  finance_charges_monthly: "Finance charges (monthly)",
  fuel_surcharge_waiver: "Fuel surcharge waiver",
  priority_pass: "Priority Pass",
};

function humanizeMetadataKey(key: string): string {
  return (
    METADATA_LABELS[key] ??
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
  );
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function MetadataValueView({ value }: { value: unknown }): ReactNode {
  if (value == null) {
    return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) {
      return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
    }
    if (isHttpUrl(t)) {
      return (
        <a
          href={t}
          className="break-all font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:text-blue-500 dark:text-blue-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t}
        </a>
      );
    }
    return (
      <span className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
        {t}
      </span>
    );
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="tabular-nums text-zinc-800 dark:text-zinc-200">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
    }
    const primitiveOnly = value.every((x) =>
      ["string", "number", "boolean"].includes(typeof x)
    );
    if (primitiveOnly) {
      return (
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-zinc-700 dark:text-zinc-300">
          {value.map((x, i) => (
            <li key={i}>{String(x)}</li>
          ))}
        </ul>
      );
    }
    return (
      <ul className="mt-1 list-decimal space-y-3 pl-5 text-sm">
        {value.map((item, i) => (
          <li key={i}>
            <MetadataValueView value={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
    }
    return (
      <dl className="mt-1 space-y-2 border-l-2 border-zinc-200 pl-3 dark:border-zinc-600">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {humanizeMetadataKey(k)}
            </dt>
            <dd className="mt-0.5">
              <MetadataValueView value={v} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span>{String(value)}</span>;
}

function CardMetadataSection({
  metadata,
}: {
  metadata: Record<string, unknown>;
}) {
  const entries = Object.entries(metadata).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Additional details
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        From source data. Verify important facts with the issuer.
      </p>
      <dl className="mt-4 space-y-4">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-lg border border-zinc-100 bg-zinc-50/90 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {humanizeMetadataKey(key)}
            </dt>
            <dd className="mt-1.5 text-sm">
              <MetadataValueView value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

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

async function getCardById(id: string): Promise<CreditCard | null> {
  // Use the server client (service role when set), same as /api/cards — anon + RLS often blocks row reads.
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_cards")
    .select(
      "id, card_name, bank, network, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits, last_updated, dining_reward, travel_reward, shopping_reward, fuel_reward, metadata"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as CreditCard | null;
}

export default async function CardDetailsPage({ params }: CardDetailsPageProps) {
  const { id } = await params;
  const card = await getCardById(id);

  if (!card) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
        <Link
          href="/#browse"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <span aria-hidden>←</span> Back to all cards
        </Link>

        <article className="rounded-3xl border border-zinc-200/80 bg-white px-6 py-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 sm:px-10 sm:py-12">
          <header className="border-b border-zinc-100 pb-10 dark:border-zinc-800">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
                  {card.card_name}
                </h1>
                <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
                  {card.bank}
                </p>
              </div>
              <span className="shrink-0 self-start rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {card.network}
              </span>
            </div>
          </header>

          <div className="pt-10">
          {isAxisBankCard(card.bank) ? (
            <div className="mb-8 flex flex-col gap-2">
              <AxisApplyLink className="sm:self-start" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Opens Axis Bank in a new tab (referral). Cardwise is not the
                lender; terms are set by the bank.
              </p>
            </div>
          ) : null}

          {isAmexPlatinumReserveCard(card.card_name, card.bank) ? (
            <div className="mb-8 flex flex-col gap-2">
              <AmexPlatinumReserveApplyLink className="sm:self-start" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Opens American Express in a new tab (referral). Cardwise is not
                the issuer; approval and terms are decided by American Express.
              </p>
            </div>
          ) : null}

          {isSbiCard(card.bank) ? (
            <div className="mb-8 flex flex-col gap-2">
              <SbiApplyLink className="sm:self-start" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Opens SBI Card in a new tab (referral). Cardwise is not the
                issuer; approval and terms are decided by SBI Card.
              </p>
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <section>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Fees & rewards
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                  <dt className="text-zinc-500">Joining fee</dt>
                  <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatInr(card.joining_fee)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                  <dt className="text-zinc-500">Annual fee</dt>
                  <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatInr(card.annual_fee)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                  <dt className="text-zinc-500">Reward type</dt>
                  <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
                    {card.reward_type}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Reward rate</dt>
                  <dd className="mt-2 leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {card.reward_rate ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Lounge access</dt>
                  <dd className="mt-2 leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {card.lounge_access ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Best for</dt>
                  <dd className="mt-2 leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {card.best_for ?? "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Category earn rates
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Approximate % of spend in each category (where available).
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-2">
              {(
                [
                  ["dining_reward", "Dining"],
                  ["travel_reward", "Travel"],
                  ["shopping_reward", "Shopping"],
                  ["fuel_reward", "Fuel"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <dt className="text-xs text-zinc-500">{label}</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {formatPct(card[key] as number | null | undefined)}
                  </dd>
                </div>
              ))}
            </dl>
            </section>
          </div>

          <section className="mt-12 border-t border-zinc-100 pt-10 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Key benefits
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
              {card.key_benefits ?? "—"}
            </p>
          </section>

          {metadataHasEntries(card.metadata) ? (
            <div className="mt-12">
              <CardMetadataSection metadata={card.metadata!} />
            </div>
          ) : null}
          </div>
        </article>
      </div>
    </main>
  );
}
