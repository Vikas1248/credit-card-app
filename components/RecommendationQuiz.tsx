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
      <div className="border-b border-zinc-100 pb-6">
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
      </div>

      <RecommendationSplitExperience onSpendSplitChange={onSpendSplitChange} />
    </section>
  );
}
