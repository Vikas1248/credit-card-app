import { ReferralApplyButton } from "@/components/referral-apply-button";
import { AMEX_INDIA_GENERIC_APPLY_URL } from "@/lib/cards/amexGenericApply";

type Props = {
  className?: string;
  fullWidth?: boolean;
};

export function AmexGenericApplyLink({ className, fullWidth }: Props) {
  return (
    <ReferralApplyButton
      href={AMEX_INDIA_GENERIC_APPLY_URL}
      className={className ?? ""}
      fullWidth={fullWidth}
    />
  );
}
