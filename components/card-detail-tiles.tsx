import type { ReactNode } from "react";

/**
 * Fact card used on card detail: key details, program details, etc.
 */
export function DetailFactTile({
  icon,
  label,
  children,
  ringClassName = "bg-blue-600/10 text-blue-700",
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  /** Tailwind classes for the icon circle */
  ringClassName?: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-zinc-900/[0.03]">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ringClassName}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-500">
          {label}
        </p>
        <div className="mt-1 min-w-0 text-sm leading-relaxed text-zinc-800">
          {children}
        </div>
      </div>
    </div>
  );
}
