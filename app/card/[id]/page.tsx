import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardAiInsight } from "@/components/card-ai-insight";
import { CardDetailKeySummary } from "@/components/card-detail-key-summary";
import { issuerBrandTileClass } from "@/lib/cards/issuerBrandTile";
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

/** Shown in Additional details; source / AI blurbs stay in DB but are not user-facing here. */
const HIDDEN_METADATA_KEYS = new Set([
  "source",
  "source_uri",
  "data_source",
  "ai_best_for",
  "ai_cons",
  "ai_not_ideal_for",
  "ai_pros",
  "affiliate_link",
  "referral_link",
  "apply_link",
]);

function filterPublicMetadata(
  meta: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!meta || typeof meta !== "object") return {};
  return Object.fromEntries(
    Object.entries(meta).filter(([k]) => !HIDDEN_METADATA_KEYS.has(k))
  );
}

function metadataHasPublicEntries(
  meta: Record<string, unknown> | null | undefined
): boolean {
  return Object.keys(filterPublicMetadata(meta)).length > 0;
}

const METADATA_LABELS: Record<string, string> = {
  eligibility: "Eligibility",
  reward_conversion: "Reward conversion",
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
          href="/cards"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <span aria-hidden>←</span> Back to all cards
        </Link>

        <article
          className={`rounded-3xl border px-6 py-10 shadow-md sm:px-10 sm:py-12 ${issuerBrandTileClass(card.bank, card.network)}`}
        >
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
            <CardAiInsight cardId={card.id} className="mb-10 mt-0" />

            <CardDetailKeySummary
              card={{
                joining_fee: card.joining_fee,
                annual_fee: card.annual_fee,
                reward_type: card.reward_type,
                network: card.network,
                dining_reward: card.dining_reward,
                travel_reward: card.travel_reward,
                shopping_reward: card.shopping_reward,
                fuel_reward: card.fuel_reward,
                last_updated: card.last_updated,
              }}
            />

          <section className="mt-12 border-t border-zinc-100 pt-10 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Program details
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Issuer wording and perks from our catalog.
            </p>
            <dl className="mt-6 space-y-6 text-sm">
              <div>
                <dt className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    aria-hidden
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                  Reward rate
                </dt>
                <dd className="mt-2 pl-10 leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {card.reward_rate ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                    aria-hidden
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path d="M2 9a2 2 0 012-2h2.5a1 1 0 01.8.4l1.9 2.53a1 1 0 00.8.4H20a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9z" />
                      <path d="M6 15h.01M10 15h4" />
                    </svg>
                  </span>
                  Lounge access
                </dt>
                <dd className="mt-2 pl-10 leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {card.lounge_access ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
                    aria-hidden
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L5 9h7l3-7z" />
                    </svg>
                  </span>
                  Best for
                </dt>
                <dd className="mt-2 pl-10 leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {card.best_for ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-12 border-t border-zinc-100 pt-10 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Key benefits
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
              {card.key_benefits ?? "—"}
            </p>
          </section>

          {metadataHasPublicEntries(card.metadata) ? (
            <div className="mt-12">
              <CardMetadataSection metadata={filterPublicMetadata(card.metadata)} />
            </div>
          ) : null}
          </div>
        </article>
      </div>
    </main>
  );
}
