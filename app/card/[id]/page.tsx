import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AmexGenericApplyLink } from "@/components/amex-generic-apply-link";
import { AmexPlatinumReserveApplyLink } from "@/components/amex-platinum-reserve-apply-link";
import { AxisApplyLink } from "@/components/axis-apply-link";
import { CardAiInsight } from "@/components/card-ai-insight";
import { CardDetailKeySummary } from "@/components/card-detail-key-summary";
import { CardProgramDetails } from "@/components/card-program-details";
import { HdfcApplyLink } from "@/components/hdfc-apply-link";
import { IndusIndApplyLink } from "@/components/indusind-apply-link";
import { SbiApplyLink } from "@/components/sbi-apply-link";
import { pickAdditionalDetailsMetadata } from "@/lib/cards/additionalDetailsMetadata";
import { isAmexCardUsingGenericApply } from "@/lib/cards/amexGenericApply";
import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";
import { isAxisBankCard } from "@/lib/cards/axisApply";
import { hdfcCardShowsApply } from "@/lib/cards/hdfcApply";
import { indusindCardShowsApply } from "@/lib/cards/indusindApply";
import { isSbiCard } from "@/lib/cards/sbiApply";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";
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

function stripHiddenMetadata(
  meta: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!meta || typeof meta !== "object") return {};
  return Object.fromEntries(
    Object.entries(meta).filter(([k]) => !HIDDEN_METADATA_KEYS.has(k))
  );
}

function filterPublicMetadata(
  meta: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return pickAdditionalDetailsMetadata(stripHiddenMetadata(meta));
}

function metadataHasPublicEntries(
  meta: Record<string, unknown> | null | undefined
): boolean {
  return Object.keys(filterPublicMetadata(meta)).length > 0;
}

const METADATA_LABELS: Record<string, string> = {
  eligibility: "Eligibility",
  welcome_offer: "Welcome offer",
  milestone_rewards: "Milestone rewards",
  excluded_categories: "Excluded spend categories",
  annual_fee_waiver_condition: "Annual fee waiver",
  cashback_cap_monthly: "Cashback cap (per month)",
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
    return <span className="text-zinc-400">—</span>;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) {
      return <span className="text-zinc-400">—</span>;
    }
    if (isHttpUrl(t)) {
      return (
        <a
          href={t}
          className="break-all font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:text-blue-500"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t}
        </a>
      );
    }
    return (
      <span className="whitespace-pre-wrap text-zinc-700">
        {t}
      </span>
    );
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="tabular-nums text-zinc-800">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-zinc-400">—</span>;
    }
    const primitiveOnly = value.every((x) =>
      ["string", "number", "boolean"].includes(typeof x)
    );
    if (primitiveOnly) {
      return (
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-zinc-700">
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
      return <span className="text-zinc-400">—</span>;
    }
    return (
      <dl className="mt-1 space-y-2 border-l-2 border-zinc-200 pl-3">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium text-zinc-500">
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

function AdditionalDetailsDocIcon({ className }: { className?: string }) {
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
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function KeyBenefitsIcon({ className }: { className?: string }) {
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
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function KeyBenefitPointerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-4 w-4"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 7L9 18l-5-5" />
    </svg>
  );
}

function parseKeyBenefitsList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^[•\-\u2022]+\s*/, "").trim())
    .filter(Boolean);
  return lines;
}

function cardHasDetailApply(card: CreditCard): boolean {
  return (
    isAxisBankCard(card.bank) ||
    isAmexPlatinumReserveCard(card.card_name, card.bank) ||
    isAmexCardUsingGenericApply(card.card_name, card.bank) ||
    isSbiCard(card.bank) ||
    hdfcCardShowsApply(card.bank, card.metadata) ||
    indusindCardShowsApply(card.bank, card.metadata)
  );
}

function DetailApplyCta({
  card,
  fullWidth = false,
  className,
}: {
  card: CreditCard;
  fullWidth?: boolean;
  className?: string;
}) {
  if (isAxisBankCard(card.bank)) {
    return <AxisApplyLink fullWidth={fullWidth} className={className} />;
  }
  if (isAmexPlatinumReserveCard(card.card_name, card.bank)) {
    return (
      <AmexPlatinumReserveApplyLink fullWidth={fullWidth} className={className} />
    );
  }
  if (isAmexCardUsingGenericApply(card.card_name, card.bank)) {
    return <AmexGenericApplyLink fullWidth={fullWidth} className={className} />;
  }
  if (isSbiCard(card.bank)) {
    return <SbiApplyLink fullWidth={fullWidth} className={className} />;
  }
  if (hdfcCardShowsApply(card.bank, card.metadata)) {
    return (
      <HdfcApplyLink
        metadata={card.metadata}
        fullWidth={fullWidth}
        className={className}
      />
    );
  }
  if (indusindCardShowsApply(card.bank, card.metadata)) {
    return (
      <IndusIndApplyLink
        metadata={card.metadata}
        fullWidth={fullWidth}
        className={className}
      />
    );
  }
  return null;
}

function CardMetadataSection({
  metadata,
}: {
  metadata: Record<string, unknown>;
}) {
  const entries = Object.entries(metadata);
  return (
    <section
      className="mt-12 border-t border-zinc-100 pt-10"
      aria-labelledby="card-additional-details-heading"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-600/10 text-slate-700"
          aria-hidden
        >
          <AdditionalDetailsDocIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="card-additional-details-heading"
            className="text-sm font-semibold text-zinc-950"
          >
            Good to know
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Eligibility, welcome benefits, fee waivers, and common limits. We do
            not list internal catalog or partner-only fields—always confirm with
            your bank before you apply.
          </p>
          <dl className="mt-4 space-y-4">
            {entries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm shadow-zinc-900/[0.03]"
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {humanizeMetadataKey(key)}
                </dt>
                <dd className="mt-1.5 text-sm">
                  <MetadataValueView value={value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

const getCardById = cache(async (id: string): Promise<CreditCard | null> => {
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
});

function truncateMetaDescription(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

type CardPageParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<CardPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await getCardById(id);
  if (!card) {
    return { title: "Card not found" };
  }

  const path = `/card/${card.id}`;
  const title = `${card.card_name} · ${card.bank}`;
  const rawDesc =
    card.best_for?.trim() ||
    card.reward_rate?.trim() ||
    card.key_benefits?.trim() ||
    `${card.card_name} from ${card.bank} — fees, rewards, and benefits on ${SITE_NAME}.`;
  const description = truncateMetaDescription(rawDesc, 155);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: `${card.card_name} · ${SITE_NAME}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${card.card_name} · ${SITE_NAME}`,
      description,
    },
  };
}

export default async function CardDetailsPage({ params }: CardDetailsPageProps) {
  const { id } = await params;
  const card = await getCardById(id);

  if (!card) {
    notFound();
  }
  const keyBenefitsList = parseKeyBenefitsList(card.key_benefits);
  const hasApply = cardHasDetailApply(card);

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-4 py-12 pb-28 text-zinc-900 sm:px-6 sm:py-16 sm:pb-16">
      <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
        <Link
          href="/cards"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
        >
          <span aria-hidden>←</span> Back to all cards
        </Link>

        <article className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xl shadow-zinc-900/[0.05]">
          <div className="h-1.5 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />
          <div className="px-6 py-10 sm:px-10 sm:py-12">
          <header className="border-b border-zinc-100 pb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                  {card.card_name}
                </h1>
                <p className="mt-3 text-base text-zinc-600">
                  {card.bank}
                </p>
              </div>
              <span className="shrink-0 self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {card.network}
              </span>
            </div>
            <div id="apply" className="mt-5 hidden scroll-mt-28 sm:flex">
              {hasApply ? (
                <DetailApplyCta card={card} />
              ) : (
                <Link
                  href="/cards"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Check eligibility
                </Link>
              )}
            </div>
          </header>

          <div className="pt-10">
            <CardAiInsight cardId={card.id} className="mb-10 mt-0" />

            <CardDetailKeySummary
              card={{
                card_name: card.card_name,
                bank: card.bank,
                joining_fee: card.joining_fee,
                annual_fee: card.annual_fee,
                reward_type: card.reward_type,
                network: card.network,
                best_for: card.best_for,
                reward_rate: card.reward_rate,
                key_benefits: card.key_benefits,
                metadata: card.metadata,
                dining_reward: card.dining_reward,
                travel_reward: card.travel_reward,
                shopping_reward: card.shopping_reward,
                fuel_reward: card.fuel_reward,
                last_updated: card.last_updated,
              }}
            />

          <CardProgramDetails
            card={{
              reward_rate: card.reward_rate,
              lounge_access: card.lounge_access,
              best_for: card.best_for,
            }}
          />

          <section
            className="mt-12 border-t border-zinc-100 pt-10"
            aria-labelledby="card-key-benefits-heading"
          >
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700"
                aria-hidden
              >
                <KeyBenefitsIcon />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="card-key-benefits-heading"
                  className="text-sm font-semibold text-zinc-950"
                >
                  Key benefits
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Highlights from the issuer listing; confirm live offers on the
                  bank’s site.
                </p>
                {keyBenefitsList.length > 0 ? (
                  <ul className="mt-4 space-y-2.5">
                    {keyBenefitsList.map((benefit, index) => (
                      <li
                        key={`${benefit}-${index}`}
                        className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-700"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600/10 text-teal-700">
                          <KeyBenefitPointerIcon className="h-3.5 w-3.5" />
                        </span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-base leading-relaxed text-zinc-700">
                    —
                  </p>
                )}
              </div>
            </div>
          </section>

          {metadataHasPublicEntries(card.metadata) ? (
            <CardMetadataSection metadata={filterPublicMetadata(card.metadata)} />
          ) : null}
          </div>
          </div>
        </article>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 p-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          <Link
            href="/cards"
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Learn more
          </Link>
          {hasApply ? (
            <DetailApplyCta card={card} fullWidth className="flex-1" />
          ) : (
            <Link
              href="/cards"
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Check eligibility
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
