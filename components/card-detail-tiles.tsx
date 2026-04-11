import type { ReactNode } from "react";

/**
 * Fact card used on card detail: key details, program details, etc.
 */
export function DetailFactTile({
  icon,
  label,
  children,
  ringClassName = "bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  /** Tailwind classes for the icon circle */
  ringClassName?: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-zinc-200/90 bg-white/80 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/40">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ringClassName}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <div className="mt-1 min-w-0 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {children}
        </div>
      </div>
    </div>
  );
}
