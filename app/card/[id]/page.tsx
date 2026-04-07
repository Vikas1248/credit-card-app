import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";

type CardDetailsPageProps = {
  params: Promise<{ id: string }>;
};

type CreditCard = {
  id: string;
  card_name: string;
  bank: string;
  network: "Visa" | "Mastercard";
  joining_fee: number;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  key_benefits: string | null;
  last_updated: string;
};

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
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to cards
        </Link>

        <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {card.card_name}
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {card.bank}
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {card.network}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
              <dt className="font-medium">Joining fee</dt>
              <dd className="mt-1">Rs. {card.joining_fee}</dd>
            </div>
            <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
              <dt className="font-medium">Annual fee</dt>
              <dd className="mt-1">Rs. {card.annual_fee}</dd>
            </div>
            <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
              <dt className="font-medium">Reward type</dt>
              <dd className="mt-1 capitalize">{card.reward_type}</dd>
            </div>
            <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
              <dt className="font-medium">Reward rate</dt>
              <dd className="mt-1">{card.reward_rate ?? "N/A"}</dd>
            </div>
            <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
              <dt className="font-medium">Lounge access</dt>
              <dd className="mt-1">{card.lounge_access ?? "N/A"}</dd>
            </div>
            <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
              <dt className="font-medium">Best for</dt>
              <dd className="mt-1">{card.best_for ?? "N/A"}</dd>
            </div>
          </dl>

          <section className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold">Key benefits</h2>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {card.key_benefits ?? "N/A"}
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
