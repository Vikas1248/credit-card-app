"use client";

import { useEffect, useState } from "react";

type Insight = {
  summary: string;
  ideal_for: string;
  watch_outs: string;
};

export function CardAiInsight({ cardId }: { cardId: string }) {
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

  if (loading) {
    return (
      <section className="mt-10 rounded-2xl border border-indigo-200/70 bg-indigo-50/40 p-6 dark:border-indigo-900/40 dark:bg-indigo-950/25">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          AI snapshot
        </h2>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Loading…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-10 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          AI snapshot
        </h2>
        <p className="mt-2 text-sm text-amber-900 dark:text-amber-200/90">
          {error}
        </p>
      </section>
    );
  }

  if (!insight) {
    return (
      <section className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          AI snapshot
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Add{" "}
          <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">
            OPENAI_API_KEY
          </code>{" "}
          to enable a short AI summary for this card.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-indigo-200/70 bg-indigo-50/40 p-6 dark:border-indigo-900/40 dark:bg-indigo-950/25">
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
    </section>
  );
}
