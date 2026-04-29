import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GuideHeroProps = {
  eyebrow?: string;
  headline: ReactNode;
  subheadline: string;
  savingsHighlight: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
};

export function GuideHero({
  eyebrow = "Guide",
  headline,
  subheadline,
  savingsHighlight,
  primaryCta,
  secondaryCta,
}: GuideHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-violet-50/70 p-6 shadow-md shadow-blue-900/[0.06] sm:p-10 lg:p-12">
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-violet-400/30 to-blue-400/20 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        {eyebrow ? (
          <p className="inline-flex rounded-full border border-blue-200/80 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-4 max-w-4xl text-3xl font-black leading-[1.15] tracking-tight text-zinc-950 sm:text-4xl lg:text-[2.75rem]">
          {headline}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          {subheadline}
        </p>
        <div className="mt-6 inline-flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white/90 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:gap-6">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
            Estimated upside
          </span>
          <span
            className={cn(
              "text-xl font-black tracking-tight sm:text-2xl",
              "bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"
            )}
          >
            {savingsHighlight}
          </span>
          <span className="text-xs text-zinc-500 sm:max-w-xs">
            Illustrative range for heavy Airtel + bill-pay + daily spend—your
            mileage depends on offers and caps.
          </span>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={primaryCta.href}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            {primaryCta.label}
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-8 text-sm font-bold text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50"
          >
            {secondaryCta.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
