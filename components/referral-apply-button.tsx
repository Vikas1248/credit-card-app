type ReferralVariant = "axis" | "amex" | "sbi";

type ReferralApplyButtonProps = {
  href: string;
  variant: ReferralVariant;
  className?: string;
  fullWidth?: boolean;
  size?: "default" | "sm";
};

const axisBase =
  "inline-flex items-center justify-center gap-1 rounded-xl bg-purple-800 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-800 dark:bg-purple-700 dark:hover:bg-purple-600";

const axisSm =
  "inline-flex items-center justify-center rounded-lg bg-purple-800 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-900 dark:bg-purple-700 dark:hover:bg-purple-600";

const amexBase =
  "inline-flex items-center justify-center gap-1 rounded-xl bg-[#006FCF] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0058A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006FCF]";

const amexSm =
  "inline-flex items-center justify-center rounded-lg bg-[#006FCF] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0058A8]";

const sbiBase =
  "inline-flex items-center justify-center gap-1 rounded-xl bg-[#0D4580] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3766] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D4580]";

const sbiSm =
  "inline-flex items-center justify-center rounded-lg bg-[#0D4580] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0a3766]";

const VARIANT_STYLES: Record<
  ReferralVariant,
  { base: string; sm: string }
> = {
  axis: { base: axisBase, sm: axisSm },
  amex: { base: amexBase, sm: amexSm },
  sbi: { base: sbiBase, sm: sbiSm },
};

export function ReferralApplyButton({
  href,
  variant,
  className = "",
  fullWidth,
  size = "default",
}: ReferralApplyButtonProps) {
  const { base, sm } = VARIANT_STYLES[variant];
  const cls = `${size === "sm" ? sm : base} ${className}${fullWidth ? " w-full" : ""}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={cls}
    >
      Apply
    </a>
  );
}
