import { ReferralApplyButton } from "@/components/referral-apply-button";
import { AXIS_BANK_APPLY_URL } from "@/lib/cards/axisApply";

type AxisApplyLinkProps = {
  className?: string;
  fullWidth?: boolean;
};

export function AxisApplyLink({
  className = "",
  fullWidth,
}: AxisApplyLinkProps) {
  return (
    <ReferralApplyButton
      href={AXIS_BANK_APPLY_URL}
      className={className}
      fullWidth={fullWidth}
    />
  );
}
