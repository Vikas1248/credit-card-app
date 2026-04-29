import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GuideSectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function GuideSection({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: GuideSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 rounded-[2rem] border border-zinc-200/80 bg-white p-6 shadow-sm shadow-zinc-900/[0.04] sm:p-8 lg:p-10",
        className
      )}
      aria-labelledby={id ? `${id}-heading` : undefined}
    >
      {eyebrow ? (
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id ? `${id}-heading` : undefined}
        className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-600">
          {description}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}
