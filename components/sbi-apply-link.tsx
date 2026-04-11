import { ReferralApplyButton } from "@/components/referral-apply-button";
import { SBI_CARD_APPLY_URL } from "@/lib/cards/sbiApply";

type Props = {
  className?: string;
  fullWidth?: boolean;
  size?: "default" | "sm";
};

export function SbiApplyLink({ className, fullWidth, size }: Props) {
  return (
    <ReferralApplyButton
      href={SBI_CARD_APPLY_URL}
      variant="sbi"
      className={className}
      fullWidth={fullWidth}
      size={size}
    />
  );
}
