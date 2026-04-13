import { ReferralApplyButton } from "@/components/referral-apply-button";
import { indusindApplyUrlFromMetadata } from "@/lib/cards/indusindApply";

type Props = {
  metadata: Record<string, unknown> | null | undefined;
  className?: string;
  fullWidth?: boolean;
};

export function IndusIndApplyLink({ metadata, className, fullWidth }: Props) {
  const href = indusindApplyUrlFromMetadata(metadata);
  if (!href) return null;
  return (
    <ReferralApplyButton
      href={href}
      className={className ?? ""}
      fullWidth={fullWidth}
    />
  );
}
