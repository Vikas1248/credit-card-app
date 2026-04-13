import { cardApplyButtonClass } from "@/lib/cardCta";

type ReferralApplyButtonProps = {
  href: string;
  className?: string;
  fullWidth?: boolean;
};

export function ReferralApplyButton({
  href,
  className = "",
  fullWidth,
}: ReferralApplyButtonProps) {
  const cls = `${cardApplyButtonClass}${fullWidth ? " w-full" : ""}${className ? ` ${className}` : ""}`;
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
