import { ReferralApplyButton } from "@/components/referral-apply-button";
import { hdfcApplyUrlFromMetadata } from "@/lib/cards/hdfcApply";

type Props = {
  metadata: Record<string, unknown> | null | undefined;
  className?: string;
  fullWidth?: boolean;
};

export function HdfcApplyLink({ metadata, className, fullWidth }: Props) {
  const href = hdfcApplyUrlFromMetadata(metadata);
  if (!href) return null;
  return (
    <ReferralApplyButton
      href={href}
      className={className ?? ""}
      fullWidth={fullWidth}
    />
  );
}
