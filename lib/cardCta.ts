/**
 * Shared card list CTAs: same min height, padding, and radius everywhere.
 * Apply uses one indigo primary; details uses outline indigo on light UI.
 */

export const cardViewDetailsButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-indigo-500/80 bg-indigo-50 px-4 text-sm font-semibold text-indigo-950 shadow-sm transition hover:border-indigo-600 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/55 dark:bg-indigo-950/45 dark:text-indigo-100 dark:hover:border-indigo-400 dark:hover:bg-indigo-900/55";

/** Featured carousel sits on a dark gradient — keep contrast while matching shape/size. */
export const cardViewDetailsButtonOnDarkClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-white/45 bg-white/10 px-4 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:border-white/70 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const cardApplyButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400";
