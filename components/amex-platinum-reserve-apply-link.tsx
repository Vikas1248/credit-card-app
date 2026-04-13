import { ReferralApplyButton } from "@/components/referral-apply-button";
import { AMEX_PLATINUM_RESERVE_APPLY_URL } from "@/lib/cards/amexPlatinumReserveApply";

type Props = {
  className?: string;
  fullWidth?: boolean;
};

export function AmexPlatinumReserveApplyLink({
  className,
  fullWidth,
}: Props) {
  return (
    <ReferralApplyButton
      href={AMEX_PLATINUM_RESERVE_APPLY_URL}
      className={className}
      fullWidth={fullWidth}
    />
  );
}
