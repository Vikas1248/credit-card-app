/**
 * Shared card list CTAs: same min height, padding, and radius everywhere.
 * Apply uses one indigo primary; details uses a blue outline on light UI.
 */

export const cardViewDetailsButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-100 bg-white px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

/** Featured carousel sits on a dark gradient — keep contrast while matching shape/size. */
export const cardViewDetailsButtonOnDarkClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-white/45 bg-white/10 px-4 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:border-white/70 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const cardApplyButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
