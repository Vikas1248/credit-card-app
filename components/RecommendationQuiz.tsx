"use client";

import { RecommendationSplitExperience } from "@/components/RecommendationSplitExperience";
import type { SpendCategorySlug } from "@/lib/spendCategories";

export function RecommendationQuiz({
  onSpendSplitChange,
}: {
  onSpendSplitChange?: (split: Record<SpendCategorySlug, number>) => void;
}) {
  return (
    <section
      id="recommendation-quiz"
      className="scroll-mt-28 rounded-[2rem] border border-zinc-200/70 bg-white p-5 shadow-md shadow-zinc-900/[0.04] sm:p-8 lg:p-10"
      aria-labelledby="recommendation-quiz-heading"
    >
      <div className="flex flex-col gap-4 border-b border-zinc-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Recommend me
          </span>
          <h2
            id="recommendation-quiz-heading"
            className="mt-2 text-3xl font-black tracking-tight text-zinc-950"
          >
            Answer a few quick questions to unlock your best credit card matches.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
            Tailored to your spending, rewards goals, and annual fee preferences.
          </p>
        </div>
        <div className="min-w-[180px]">
          <div className="mb-2 flex justify-between text-xs font-bold text-zinc-500">
            <span>Step 1 of 4</span>
            <span>25%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100">
            <div className="h-2 w-1/4 rounded-full bg-gradient-to-r from-violet-600 to-blue-600" />
          </div>
        </div>
      </div>

      <RecommendationSplitExperience onSpendSplitChange={onSpendSplitChange} />
    </section>
  );
}
