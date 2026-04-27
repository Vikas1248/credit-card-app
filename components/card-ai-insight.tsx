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
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-md shadow-blue-600/20"
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
    `${extra} relative overflow-hidden rounded-3xl border p-5 shadow-lg shadow-blue-900/[0.06] sm:p-6 ${className ?? "mt-10"}`;

  const glow = (
    <>
      <div className="pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full bg-blue-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-violet-300/25 blur-3xl" />
    </>
  );

  if (loading) {
    return (
      <section
        className={wrap(
          "border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-violet-50/70"
        )}
      >
        {glow}
        <div className="relative flex items-start gap-3">
          <AiBadge />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-zinc-950">
              AI snapshot
            </h2>
            <p className="mt-2 text-sm font-medium text-zinc-600">
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
          "border-amber-200/80 bg-amber-50"
        )}
      >
        {glow}
        <div className="relative flex items-start gap-3">
          <AiBadge />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-zinc-950">
              AI snapshot
            </h2>
            <p className="mt-2 text-sm font-medium text-amber-900">
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
        className={wrap(
          "border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-violet-50/70"
        )}
      >
        {glow}
        <div className="relative flex items-start gap-3">
          <AiBadge />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-zinc-950">
              AI snapshot
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-700">
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
        "border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-violet-50/70"
      )}
    >
      {glow}
      <div className="relative flex items-start gap-3">
        <AiBadge />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-zinc-950">
            AI snapshot
          </h2>
          <p className="mt-1 text-xs font-medium text-zinc-500">
            Generated from on-page fields only; not financial advice.
          </p>
          <p className="mt-4 rounded-2xl border border-blue-100 bg-white/90 p-4 text-sm font-medium leading-relaxed text-zinc-800 shadow-sm">
            {insight.summary}
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-violet-100 bg-white/90 p-4 shadow-sm">
              <dt className="font-bold text-violet-700">
                Often fits
              </dt>
              <dd className="mt-1.5 leading-relaxed text-zinc-800">
                {insight.ideal_for}
              </dd>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-sm">
              <dt className="font-bold text-amber-700">
                Double-check
              </dt>
              <dd className="mt-1.5 leading-relaxed text-zinc-800">
                {insight.watch_outs}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
