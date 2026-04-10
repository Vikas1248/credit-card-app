import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCardThumbFill } from "@/components/credit-card-thumb";
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

async function getCardById(id: string): Promise<CreditCard | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export default async function CardDetailsPage({ params }: CardDetailsPageProps) {
  const { id } = await params;
  const card = await getCardById(id);

  if (!card) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/#browse"
          className="mb-6 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <span aria-hidden>←</span> Back to catalog
        </Link>

        <article className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="relative aspect-[8/5] w-full border-b border-zinc-200 bg-zinc-900 dark:border-zinc-800">
            <CreditCardThumbFill
              className="object-cover object-center"
              priority
              sizes="(max-width: 768px) 100vw, 42rem"
            />
          </div>
          <div className="p-6 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Cardwise
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {card.card_name}
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {card.bank}
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
              {card.network}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <dt className="text-xs font-medium text-zinc-500">Joining fee</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {formatInr(card.joining_fee)}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <dt className="text-xs font-medium text-zinc-500">Annual fee</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {formatInr(card.annual_fee)}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <dt className="text-xs font-medium text-zinc-500">Reward type</dt>
              <dd className="mt-1 font-medium capitalize">{card.reward_type}</dd>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:col-span-2">
              <dt className="text-xs font-medium text-zinc-500">Reward rate</dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {card.reward_rate ?? "—"}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <dt className="text-xs font-medium text-zinc-500">Lounge access</dt>
              <dd className="mt-1">{card.lounge_access ?? "—"}</dd>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <dt className="text-xs font-medium text-zinc-500">Best for</dt>
              <dd className="mt-1">{card.best_for ?? "—"}</dd>
            </div>
          </dl>

          <section className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Category reward rates
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
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

          <section className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold">Key benefits</h2>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {card.key_benefits ?? "N/A"}
            </p>
          </section>
          </div>
        </article>
      </div>
    </main>
  );
}
