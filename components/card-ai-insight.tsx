"use client";

import { useEffect, useState } from "react";

type Insight = {
  summary: string;
  ideal_for: string;
  watch_outs: string;
};

function AiBadge() {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
      aria-hidden
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3a6 6 0 009 9 9 9 0 11-9-9z" />
        <path d="M12 12v9M12 3v3" />
      </svg>
    </span>
  );
}

export function CardAiInsight({
  cardId,
  className,
}: {
  cardId: string;
  /** e.g. mb-10 mt-0 when placed directly under the card header */
  className?: string;
}) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ id: cardId });
        const res = await fetch(
          `/api/cards/detail-ai-insight?${params.toString()}`,
          { cache: "no-store" }
        );
        const data: {
          source?: string;
          insight?: Insight | null;
          error?: string;
        } = await res.json();
        if (cancelled) return;
        if (data.source === "ai" && data.insight) {
          setInsight(data.insight);
        } else {
          setInsight(null);
          if (data.source === "error" && data.error) {
            setError(data.error);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setInsight(null);
          setError(e instanceof Error ? e.message : "Could not load insight.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const wrap = (extra: string) =>
    `${extra} rounded-2xl border p-6 ${className ?? "mt-10"}`;

  if (loading) {
    return (
      <section
        className={wrap(
          "border-indigo-200/70 bg-indigo-50/40 dark:border-indigo-900/40 dark:bg-indigo-950/25"
        )}
      >
        <div className="flex items-start gap-3">
          <AiBadge />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              AI snapshot
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Loading…
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={wrap(
          "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
        )}
      >
        <div className="flex items-start gap-3">
          <AiBadge />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              AI snapshot
            </h2>
            <p className="mt-2 text-sm text-amber-900 dark:text-amber-200/90">
              {error}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!insight) {
    return (
      <section
        className={wrap("border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/30")}
      >
        <div className="flex items-start gap-3">
          <AiBadge />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              AI snapshot
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              When AI is enabled for this deployment, a short summary for this
              card appears here.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={wrap(
        "border-indigo-200/70 bg-indigo-50/40 dark:border-indigo-900/40 dark:bg-indigo-950/25"
      )}
    >
      <div className="flex items-start gap-3">
        <AiBadge />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI snapshot
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Generated from on-page fields only; not financial advice.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            {insight.summary}
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                Often fits
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {insight.ideal_for}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                Double-check
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                {insight.watch_outs}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
