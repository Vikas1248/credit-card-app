import { AXIS_BANK_APPLY_URL } from "@/lib/cards/axisApply";

type AxisApplyLinkProps = {
  className?: string;
  fullWidth?: boolean;
  /** Smaller padding for table headers / compact rows */
  size?: "default" | "sm";
};

const basePrimary =
  "inline-flex items-center justify-center gap-1 rounded-xl bg-purple-800 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-800 dark:bg-purple-700 dark:hover:bg-purple-600";

const smPrimary =
  "inline-flex items-center justify-center rounded-lg bg-purple-800 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-900 dark:bg-purple-700 dark:hover:bg-purple-600";

export function AxisApplyLink({
  className = "",
  fullWidth,
  size = "default",
}: AxisApplyLinkProps) {
  const cls =
    size === "sm" ? `${smPrimary} ${className}` : `${basePrimary} ${className}`;
  return (
    <a
      href={AXIS_BANK_APPLY_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`${cls}${fullWidth ? " w-full" : ""}`}
    >
      Apply
    </a>
  );
}
