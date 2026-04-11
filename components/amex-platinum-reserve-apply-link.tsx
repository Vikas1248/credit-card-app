import { ReferralApplyButton } from "@/components/referral-apply-button";
import { AMEX_PLATINUM_RESERVE_APPLY_URL } from "@/lib/cards/amexPlatinumReserveApply";

type Props = {
  className?: string;
  fullWidth?: boolean;
  size?: "default" | "sm";
};

export function AmexPlatinumReserveApplyLink({
  className,
  fullWidth,
  size,
}: Props) {
  return (
    <ReferralApplyButton
      href={AMEX_PLATINUM_RESERVE_APPLY_URL}
      variant="amex"
      className={className}
      fullWidth={fullWidth}
      size={size}
    />
  );
}
