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
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-900/[0.03] sm:p-6">
          <h3 className="text-lg font-black tracking-tight text-zinc-950">
            Tell us about your spending
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Takes less than 30 seconds — updates live as you adjust.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Spending mix
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Relative weights (shown as % of your mix). Bill pay is folded into shopping &amp; fuel
                for scoring.
              </p>
              <div className="mt-4 space-y-4">
                {SLIDER_CONFIG.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-800">
                        {label}
                      </span>
                      <span className="text-xs tabular-nums text-zinc-500">
                        {pctOfTotal(weights, key).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weights[key]}
                      onChange={(e) => setWeight(key, Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-600 transition"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="monthly-spend-slider"
                  className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500"
                >
                  Monthly spend
                </label>
                <span className="text-sm font-bold tabular-nums text-zinc-950">
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
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-blue-600 transition"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                ₹5,000 — ₹1,00,000 / month
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
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
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/20"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
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
                      <span className="block text-sm font-semibold text-zinc-950">
                        {opt.label}
                      </span>
                      <span className="text-xs text-zinc-500">{opt.sub}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/90 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:pointer-events-auto lg:static lg:z-0 lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:pb-0 lg:backdrop-blur-none">
          <button
            type="button"
            onClick={scrollToResults}
            className="pointer-events-auto inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 text-sm font-black text-white shadow-md shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 lg:shadow-sm"
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
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-900/[0.03] sm:p-6">
          <p className="text-sm font-semibold text-zinc-600">At a glance</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
            You could earn{" "}
            <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">{formatInr(topYearlyReward)}</span>
            <span className="text-lg font-semibold text-zinc-600"> / year</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Based on estimated yearly rewards on your top match (illustrative).
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          {loading && cards.length === 0 ? (
            <div className="grid gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-3xl bg-zinc-100"
                />
              ))}
            </div>
          ) : (
            cards.map((c, idx) => (
              <article
                key={c.card_id}
                style={{ transitionDelay: `${idx * 40}ms` }}
                className={`flex flex-col rounded-3xl border bg-white p-5 shadow-sm shadow-zinc-900/[0.03] transition-all duration-300 sm:p-6 ${
                  idx === 0
                    ? "border-orange-200 ring-1 ring-orange-200/70"
                    : "border-zinc-200"
                } ${loading ? "opacity-70" : "opacity-100"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-200">
                      {idx === 0 ? "Best match" : `#${idx + 1}`}
                    </span>
                    <h4 className="mt-2 text-lg font-black text-zinc-950">
                      {c.card_name}
                    </h4>
                    <p className="text-sm text-zinc-500">{c.bank}</p>
                  </div>
                  <span className="rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1 text-sm font-black tabular-nums text-white">
                    {c.score}%
                  </span>
                </div>

                <dl className="mt-4 rounded-2xl bg-zinc-50 p-4">
                  <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    Est. yearly reward
                  </dt>
                  <dd className="mt-1 text-xl font-black tabular-nums text-zinc-950">
                    {formatInr(c.yearlyReward)}
                  </dd>
                </dl>

                {c.benefitBullets && c.benefitBullets.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm text-zinc-700">
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

                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    Why this card
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-800">
                    {c.explanation ?? "—"}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/card/${c.card_id}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                  >
                    View details
                  </Link>
                  <Link
                    href={`/card/${c.card_id}#apply`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800"
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

        <p className="text-center text-[11px] leading-relaxed text-zinc-500">
          No sponsored rankings · No spam · Transparent calculations
        </p>
      </div>
    </div>
  );
}
