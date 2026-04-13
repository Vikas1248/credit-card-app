import { ReferralApplyButton } from "@/components/referral-apply-button";
import { SBI_CARD_APPLY_URL } from "@/lib/cards/sbiApply";

type Props = {
  className?: string;
  fullWidth?: boolean;
};

export function SbiApplyLink({ className, fullWidth }: Props) {
  return (
    <ReferralApplyButton
      href={SBI_CARD_APPLY_URL}
      className={className}
      fullWidth={fullWidth}
    />
  );
}
