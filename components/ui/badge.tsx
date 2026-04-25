import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "blue" | "violet" | "orange" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-zinc-100 text-zinc-700",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  orange: "bg-orange-100 text-orange-700",
  outline: "border border-zinc-200 bg-white text-zinc-700",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-black",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
