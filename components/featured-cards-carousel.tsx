"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AmexGenericApplyLink } from "@/components/amex-generic-apply-link";
import { AmexPlatinumReserveApplyLink } from "@/components/amex-platinum-reserve-apply-link";
import { AxisApplyLink } from "@/components/axis-apply-link";
import { CardTopRewardTag } from "@/components/card-top-reward-tag";
import { HdfcApplyLink } from "@/components/hdfc-apply-link";
import { IndusIndApplyLink } from "@/components/indusind-apply-link";
import { SbiApplyLink } from "@/components/sbi-apply-link";
import { isAmexCardUsingGenericApply } from "@/lib/cards/amexGenericApply";
import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";
import { isAxisBankCard } from "@/lib/cards/axisApply";
import { hdfcCardShowsApply } from "@/lib/cards/hdfcApply";
import { indusindCardShowsApply } from "@/lib/cards/indusindApply";
import { issuerHeroPlasticClass } from "@/lib/cards/issuerHeroPlastic";
import { isSbiCard } from "@/lib/cards/sbiApply";
import {
  cardViewDetailsButtonOnDarkClass,
} from "@/lib/cardCta";
import type { CardNetwork } from "@/lib/types/card";

type CardModel = {
  id: string;
  card_name: string;
  bank: string;
  network: CardNetwork;
  annual_fee: number;
  reward_type: string;
  best_for: string | null;
  key_benefits: string | null;
  metadata?: Record<string, unknown> | null;
};

export type FeaturedCarouselItem = {
  card: CardModel;
  tag: string;
  rewardLine: string;
};

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function CardPlasticMock({ card }: { card: CardModel }) {
  return (
    <div
      className={`${issuerHeroPlasticClass(card.bank, card.network)} aspect-[1.586/1] w-[min(88vw,300px)] p-5 sm:w-[min(90vw,340px)] sm:p-6`}
      style={{
        transform: "perspective(900px) rotateY(-10deg) rotateX(6deg)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent" />
      <div className="relative flex items-start justify-between">
        <div
          className="h-10 w-[3.25rem] rounded-md bg-gradient-to-br from-amber-100 via-amber-400 to-amber-700 shadow-md ring-1 ring-amber-950/30"
          aria-hidden
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
          {card.network}
        </span>
      </div>
      <div className="relative mt-5 flex gap-1.5" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/40" />
        ))}
      </div>
      <p className="relative mt-8 line-clamp-2 text-left text-base font-semibold leading-snug tracking-wide text-white drop-shadow">
        {card.card_name}
      </p>
      <p className="relative mt-1 text-sm font-medium text-white/75">{card.bank}</p>
    </div>
  );
}

function CardReferralApply({ card }: { card: CardModel }) {
  if (isAxisBankCard(card.bank)) {
    return <AxisApplyLink fullWidth />;
  }
  if (isAmexPlatinumReserveCard(card.card_name, card.bank)) {
    return <AmexPlatinumReserveApplyLink fullWidth />;
  }
  if (isAmexCardUsingGenericApply(card.card_name, card.bank)) {
    return <AmexGenericApplyLink fullWidth />;
  }
  if (isSbiCard(card.bank)) {
    return <SbiApplyLink fullWidth />;
  }
  if (hdfcCardShowsApply(card.bank, card.metadata)) {
    return <HdfcApplyLink metadata={card.metadata} fullWidth />;
  }
  if (indusindCardShowsApply(card.bank, card.metadata)) {
    return <IndusIndApplyLink metadata={card.metadata} fullWidth />;
  }
  return null;
}

function cardHasReferralApply(card: CardModel): boolean {
  return (
    isAxisBankCard(card.bank) ||
    isAmexPlatinumReserveCard(card.card_name, card.bank) ||
    isAmexCardUsingGenericApply(card.card_name, card.bank) ||
    isSbiCard(card.bank) ||
    hdfcCardShowsApply(card.bank, card.metadata) ||
    indusindCardShowsApply(card.bank, card.metadata)
  );
}

const AUTO_MS = 6500;

export function FeaturedCardsCarousel({
  items,
  loading,
}: {
  items: FeaturedCarouselItem[];
  loading: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const n = items.length;
  const safeIndex = n === 0 ? 0 : Math.min(index, n - 1);
  const active = n > 0 ? items[safeIndex] : null;

  useEffect(() => {
    setIndex((i) => (n === 0 ? 0 : Math.min(i, n - 1)));
  }, [n]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setIndex((i) => (i + dir + n) % n);
    },
    [n]
  );

  useEffect(() => {
    if (n <= 1 || paused || reducedMotion || loading) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % n);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [n, paused, reducedMotion, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (loading) {
    return (
      <div className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="flex min-h-[280px] items-center justify-center gap-4 p-8 sm:min-h-[320px]">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-40 w-64 animate-pulse rounded-2xl bg-white/10 sm:h-48 sm:w-72"
            />
          ))}
        </div>
      </div>
    );
  }

  if (n === 0 || !active) {
    return null;
  }

  const transitionClass = reducedMotion
    ? ""
    : "transition-transform duration-500 ease-out";

  return (
    <div
      ref={containerRef}
      className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#0c4a6e] to-slate-900 shadow-lg ring-1 ring-white/10"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured credit cards"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx > 48) go(-1);
        else if (dx < -48) go(1);
      }}
    >
      <div className="relative">
        {n > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-4"
              aria-label="Previous featured card"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-4"
              aria-label="Next featured card"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        ) : null}

        <div className="overflow-hidden">
          <div
            className={`flex ${transitionClass}`}
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {items.map(({ card, tag, rewardLine }, slideIdx) => (
              <div
                key={card.id}
                className="flex w-full flex-shrink-0 flex-col items-center gap-10 px-5 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-14 lg:py-12"
                aria-hidden={slideIdx !== safeIndex}
              >
                <div className="max-w-xl flex-1 text-center lg:text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                    {tag}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    <Link
                      href={`/card/${card.id}`}
                      className="hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
                    >
                      {card.card_name}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {card.bank} · {card.network} ·{" "}
                    <span className="capitalize">{card.reward_type}</span>
                  </p>
                  <div className="mt-3 flex justify-center lg:justify-start">
                    <CardTopRewardTag card={card} tone="dark" />
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-200">
                    {card.best_for ?? card.key_benefits ?? "—"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-200 lg:justify-start">
                    <span>
                      <span className="text-slate-400">Annual fee </span>
                      <span className="font-semibold tabular-nums text-white">
                        {formatInr(card.annual_fee)}
                      </span>
                    </span>
                    <span className="text-emerald-300">{rewardLine}</span>
                  </div>
                  <div
                    className={
                      cardHasReferralApply(card)
                        ? "mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:max-w-2xl sm:grid-cols-2 sm:items-stretch lg:max-w-none"
                        : "mt-6 flex w-full max-w-xl flex-col gap-2"
                    }
                  >
                    <Link
                      href={`/card/${card.id}`}
                      className={`${cardViewDetailsButtonOnDarkClass} w-full`}
                    >
                      View details
                    </Link>
                    {cardHasReferralApply(card) ? (
                      <CardReferralApply card={card} />
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 justify-center lg:justify-end lg:pr-4">
                  <CardPlasticMock card={card} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {n > 1 ? (
          <div
            className="flex justify-center gap-2 pb-5 pt-1"
            role="tablist"
            aria-label="Featured slides"
          >
            {items.map(({ card }, i) => (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={`Show featured card ${i + 1} of ${n}`}
                onClick={() => setIndex(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === safeIndex
                    ? "w-8 bg-white"
                    : "w-2.5 bg-white/35 hover:bg-white/55"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
