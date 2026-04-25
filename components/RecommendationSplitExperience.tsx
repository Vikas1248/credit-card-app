"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SendRecommendationEmailButton } from "@/components/send-recommendation-email-button";
import type {
  RecommendCardsResponseBody,
  RecommendedCard,
} from "@/lib/recommendV2/recommendCardsApiTypes";
import { CREDGENIE_RECOMMEND_FRESH_HEADER } from "@/lib/recommendV2/recommendCardsFreshHeader";
import {
  buildUserProfileFromSpendUi,
  DEFAULT_CATEGORY_WEIGHTS,
  monthlyRupeeSplitFromWeights,
  type CategoryWeightDraft,
  type FeeTierUi,
} from "@/lib/recommendV2/profileFromSpendSliders";
import type { SpendCategorySlug } from "@/lib/spendCategories";

const STORAGE_KEY = "credgenie:v2-recommend-profile";

const SLIDER_CONFIG: { key: keyof CategoryWeightDraft; label: string }[] = [
  { key: "shopping", label: "Shopping" },
  { key: "dining", label: "Dining" },
  { key: "travel", label: "Travel" },
  { key: "fuel", label: "Fuel" },
  { key: "bills", label: "Bills" },
];

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function weightSum(w: CategoryWeightDraft): number {
  return w.shopping + w.dining + w.travel + w.fuel + w.bills;
}

function pctOfTotal(w: CategoryWeightDraft, key: keyof CategoryWeightDraft): number {
  const s = weightSum(w);
  if (s <= 0) return 0;
  return (w[key] / s) * 100;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function RecommendationSplitExperience({
  onSpendSplitChange,
}: {
  /** Keeps compare-tool spend inputs in sync with the live wizard. */
  onSpendSplitChange?: (split: Record<SpendCategorySlug, number>) => void;
}) {
  const [weights, setWeights] = useState<CategoryWeightDraft>({ ...DEFAULT_CATEGORY_WEIGHTS });
  const [monthlySpend, setMonthlySpend] = useState(35_000);
  const [feeTier, setFeeTier] = useState<FeeTierUi>("low");
  const [cards, setCards] = useState<RecommendedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const profile = useMemo(
    () =>
      buildUserProfileFromSpendUi({
        monthlySpendTotal: monthlySpend,
        weights,
        feeTier,
      }),
    [monthlySpend, weights, feeTier]
  );

  const debouncedProfile = useDebouncedValue(profile, 380);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const o = JSON.parse(raw) as Record<string, unknown>;
      if (typeof o.monthlySpend === "number" && Number.isFinite(o.monthlySpend)) {
        setMonthlySpend(Math.min(100_000, Math.max(5_000, Math.round(o.monthlySpend))));
      }
      if (o.feeSensitivity === "high") setFeeTier("free");
      else if (o.feeSensitivity === "medium") setFeeTier("low");
      else if (o.feeSensitivity === "low") setFeeTier("premium");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* quota */
    }
  }, [profile]);

  const rupeeSplit = useMemo(
    () => monthlyRupeeSplitFromWeights(monthlySpend, weights),
    [monthlySpend, weights]
  );

  useEffect(() => {
    onSpendSplitChange?.(rupeeSplit);
  }, [rupeeSplit, onSpendSplitChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/recommend-cards", {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            [CREDGENIE_RECOMMEND_FRESH_HEADER]: "1",
          },
          body: JSON.stringify(debouncedProfile),
        });
        const data = (await res.json()) as
          | RecommendCardsResponseBody
          | RecommendedCard[]
          | { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(
            typeof (data as { error?: string }).error === "string"
              ? (data as { error: string }).error
              : "Failed to load recommendations."
          );
        }
        if (Array.isArray(data)) {
          setCards(data);
        } else if (data && typeof data === "object" && "cards" in data && Array.isArray(data.cards)) {
          setCards(data.cards);
        } else {
          setCards([]);
        }
      } catch (e) {
        if (!cancelled) {
          setCards([]);
          setError(e instanceof Error ? e.message : "Failed to load recommendations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedProfile]);

  const topYearlyReward = cards[0]?.yearlyReward ?? 0;

  const setWeight = useCallback((key: keyof CategoryWeightDraft, v: number) => {
    const n = Math.max(0, Math.min(100, Math.round(v)));
    setWeights((prev) => ({ ...prev, [key]: n }));
  }, []);

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mt-6 flex flex-col gap-8 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-10">
      {/* LEFT — inputs */}
      <div className="order-1 flex flex-col lg:sticky lg:top-24 lg:order-none lg:self-start">
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-950/40 sm:p-6">
          <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tell us about your spending
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Takes less than 30 seconds — updates live as you adjust.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Spending mix
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                Relative weights (shown as % of your mix). Bill pay is folded into shopping &amp; fuel
                for scoring.
              </p>
              <div className="mt-4 space-y-4">
                {SLIDER_CONFIG.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {label}
                      </span>
                      <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                        {pctOfTotal(weights, key).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weights[key]}
                      onChange={(e) => setWeight(key, Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-600 transition dark:bg-zinc-700 dark:accent-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="monthly-spend-slider"
                  className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  Monthly spend
                </label>
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatInr(monthlySpend)}
                </span>
              </div>
              <input
                id="monthly-spend-slider"
                type="range"
                min={5000}
                max={100000}
                step={1000}
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-600 transition dark:bg-zinc-700 dark:accent-blue-500"
              />
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                ₹5,000 — ₹1,00,000 / month
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Fee preference
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {(
                  [
                    { id: "free" as const, label: "Free", sub: "Prefer no annual fee" },
                    { id: "low" as const, label: "Low annual fee", sub: "Okay with modest fees" },
                    { id: "premium" as const, label: "Premium", sub: "Open to higher fees for perks" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-300 ${
                      feeTier === opt.id
                        ? "border-blue-500 bg-blue-50/80 ring-1 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/40 dark:ring-blue-500/25"
                        : "border-zinc-200/80 bg-white/80 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fee-pref"
                      checked={feeTier === opt.id}
                      onChange={() => setFeeTier(opt.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {opt.label}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{opt.sub}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/90 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-950/95 lg:pointer-events-auto lg:static lg:z-0 lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:pb-0 lg:backdrop-blur-none">
          <button
            type="button"
            onClick={scrollToResults}
            className="pointer-events-auto inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-300 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 lg:shadow-sm"
          >
            See My Best Cards →
          </button>
        </div>
      </div>

      {/* RIGHT — live results */}
      <div
        ref={resultsRef}
        id="recommendation-live-results"
        className="order-2 min-w-0 scroll-mt-28 space-y-6 lg:order-none"
      >
        <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/80 p-5 shadow-sm dark:border-zinc-700/80 dark:from-zinc-900 dark:to-zinc-950/80 sm:p-6">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">At a glance</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            You could earn{" "}
            <span className="text-blue-600 dark:text-blue-400">{formatInr(topYearlyReward)}</span>
            <span className="text-lg font-semibold text-zinc-600 dark:text-zinc-400"> / year</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Based on estimated yearly rewards on your top match (illustrative).
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          {loading && cards.length === 0 ? (
            <div className="grid gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/50"
                />
              ))}
            </div>
          ) : (
            cards.map((c, idx) => (
              <article
                key={c.card_id}
                style={{ transitionDelay: `${idx * 40}ms` }}
                className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 dark:bg-zinc-950/50 sm:p-6 ${
                  idx === 0
                    ? "border-emerald-200/90 ring-1 ring-emerald-200/60 dark:border-emerald-900/40 dark:ring-emerald-900/30"
                    : "border-zinc-200/80 dark:border-zinc-700/80"
                } ${loading ? "opacity-70" : "opacity-100"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-full bg-blue-600/10 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      {idx === 0 ? "Best match" : `#${idx + 1}`}
                    </span>
                    <h4 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {c.card_name}
                    </h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{c.bank}</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-bold tabular-nums text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {c.score}%
                  </span>
                </div>

                <dl className="mt-4 rounded-xl bg-zinc-50/90 p-4 dark:bg-zinc-900/40">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Est. yearly reward
                  </dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatInr(c.yearlyReward)}
                  </dd>
                </dl>

                {c.benefitBullets && c.benefitBullets.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {c.benefitBullets.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-blue-500" aria-hidden>
                          •
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-4 rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-4 dark:border-zinc-700/60 dark:bg-zinc-900/30">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Why this card
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {c.explanation ?? "—"}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/card/${c.card_id}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    View details
                  </Link>
                  <Link
                    href={`/card/${c.card_id}#apply`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    Apply
                  </Link>
                </div>
                <div className="mt-2">
                  <SendRecommendationEmailButton
                    cardName={c.card_name}
                    applyLink={`/card/${c.card_id}#apply`}
                    rewards={
                      c.explanation ??
                      `Estimated yearly reward: ${formatInr(c.yearlyReward)}`
                    }
                  />
                </div>
              </article>
            ))
          )}
        </div>

        <p className="text-center text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
          No sponsored rankings · No spam · Transparent calculations
        </p>
      </div>
    </div>
  );
}
