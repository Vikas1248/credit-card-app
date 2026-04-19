"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  RecommendCardsAiMeta,
  RecommendCardsResponseBody,
  RecommendedCard,
} from "@/lib/recommendV2/recommendCardsApiTypes";
import { CREDGENIE_RECOMMEND_FRESH_HEADER } from "@/lib/recommendV2/recommendCardsFreshHeader";
import type { UserProfile } from "@/lib/recommendV2/userProfile";

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function SkeletonCard() {
  return (
    <div className="h-56 animate-pulse rounded-2xl bg-white/80 p-5 shadow-sm shadow-zinc-900/[0.04] dark:bg-zinc-950/30" />
  );
}

export function RecommendedCards({ profile }: { profile: UserProfile }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<RecommendedCard[]>([]);
  const [ai, setAi] = useState<RecommendCardsAiMeta | null>(null);

  const requestBody = useMemo(() => profile, [profile]);

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
          body: JSON.stringify(requestBody),
        });
        const data = (await res.json()) as
          | RecommendCardsResponseBody
          | RecommendedCard[]
          | { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(
            typeof (data as { error?: string })?.error === "string"
              ? (data as { error: string }).error
              : "Failed to load recommendations."
          );
        }
        if (Array.isArray(data)) {
          setCards(data);
          setAi(null);
        } else if (data && typeof data === "object" && "cards" in data && Array.isArray(data.cards)) {
          setCards(data.cards);
          setAi(data.ai ?? null);
        } else {
          setCards([]);
          setAi(null);
        }
      } catch (e) {
        if (cancelled) return;
        setCards([]);
        setAi(null);
        setError(e instanceof Error ? e.message : "Failed to load recommendations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestBody]);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm shadow-zinc-900/[0.06] dark:bg-zinc-900/45 dark:shadow-black/30 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
            Recommended for you
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Based on your spend pattern and preferences. Scores reflect overall fit (0–100). AI copy
            is generated from the LangGraph winner and runner-up only; ranking stays deterministic.
          </p>
        </div>
      </div>

      {ai &&
      (ai.explanation.summary.trim().length > 0 ||
        ai.explanation.why.length > 0 ||
        ai.explanation.tradeoffs.length > 0) ? (
        <div className="mt-6 rounded-2xl border border-violet-200/80 bg-violet-50/60 p-5 dark:border-violet-900/40 dark:bg-violet-950/25">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-violet-950 dark:text-violet-100">
              AI recommendation
            </h3>
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-zinc-900/80 dark:text-violet-200">
              {ai.decisionType === "close_call" ? "Close call" : "Clear winner"}
            </span>
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-zinc-900/80 dark:text-violet-200">
              Confidence {(ai.confidence * 100).toFixed(0)}%
            </span>
          </div>
          {ai.explanation.summary.trim() ? (
            <p className="mt-3 text-sm leading-relaxed text-violet-950/90 dark:text-violet-100/90">
              {ai.explanation.summary}
            </p>
          ) : null}
          {ai.explanation.why.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-violet-950/85 dark:text-violet-100/85">
              {ai.explanation.why.map((line, i) => (
                <li key={`why-${i}-${line.slice(0, 24)}`}>{line}</li>
              ))}
            </ul>
          ) : null}
          {ai.explanation.tradeoffs.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-900/70 dark:text-violet-200/80">
                Tradeoffs
              </p>
              <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-sm text-violet-950/85 dark:text-violet-100/85">
                {ai.explanation.tradeoffs.map((line, i) => (
                  <li key={`trade-${i}-${line.slice(0, 24)}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {ai.runnerUp ? (
            <p className="mt-3 text-xs text-violet-900/75 dark:text-violet-200/75">
              Runner-up:{" "}
              <span className="font-medium text-violet-950 dark:text-violet-100">
                {ai.runnerUp.name}
              </span>{" "}
              (score {ai.runnerUp.score}, net ≈ {formatInr(ai.runnerUp.netReward)} / yr).
            </p>
          ) : null}
          {ai.betterAlternative ? (
            <p className="mt-2 text-xs text-violet-900/75 dark:text-violet-200/75">
              Worth a look:{" "}
              <span className="font-medium text-violet-950 dark:text-violet-100">
                {ai.betterAlternative.name}
              </span>{" "}
              — higher reward or category fit vs the top pick for your pattern.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : cards.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
          {cards.map((c, idx) => {
            const best = idx === 0;
            return (
              <article
                key={c.card_id}
                className={`flex h-full flex-col overflow-hidden rounded-2xl p-5 shadow-sm shadow-zinc-900/[0.05] dark:shadow-black/25 ${
                  best
                    ? "bg-emerald-50/50 ring-1 ring-emerald-200/70 dark:bg-emerald-950/25 dark:ring-emerald-900/35"
                    : "bg-white/90 dark:bg-zinc-950/35"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full border border-zinc-200/60 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700/60 dark:bg-zinc-900 dark:text-zinc-200">
                    {best ? "Best match" : `Pick #${idx + 1}`}
                  </span>
                  <span className="rounded-full bg-blue-600/10 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    {c.score}%
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {c.card_name}
                </p>
                <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {c.bank}
                </p>

                <dl className="mt-4 text-sm">
                  <div className="rounded-xl bg-zinc-50/90 p-3 dark:bg-zinc-900/50">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Yearly rewards
                    </dt>
                    <dd className="mt-1 text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatInr(c.yearlyReward)}
                    </dd>
                  </div>
                </dl>

                {c.explanation ? (
                  <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {c.explanation}
                  </p>
                ) : null}

                <div className="mt-auto pt-4">
                  <div className="grid grid-cols-1 gap-2">
                    <a
                      href={`/card/${c.card_id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:hover:bg-blue-500"
                    >
                      View card
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          No recommendations available for this profile.
        </p>
      )}
    </section>
  );
}

