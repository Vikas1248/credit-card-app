import type { CredGenieAdvisorProfile } from "./types";
import type { AdvisorGapKind, OpportunitySignal } from "./conversationState";

/** Gaps where a second ask is acceptable if the profile field is still empty. */
const REPEAT_OK = new Set<AdvisorGapKind>(["monthly_spend", "reward_format", "fee_tolerance"]);

function gapStillOpen(kind: AdvisorGapKind, profile: CredGenieAdvisorProfile): boolean {
  switch (kind) {
    case "monthly_spend":
      return !profile.monthlySpend || profile.monthlySpend < 5000;
    case "reward_format":
      return !profile.preferred_rewards;
    case "fee_tolerance":
      return !profile.fees;
    default:
      return false;
  }
}

/**
 * Drop opportunities we've already posed this session, except high-priority gaps
 * that may need a genuine re-ask when the user still hasn't filled the field.
 */
export function filterOpportunitiesAfterAsked(
  opportunities: OpportunitySignal[],
  askedGapKinds: AdvisorGapKind[],
  profile: CredGenieAdvisorProfile
): OpportunitySignal[] {
  return opportunities.filter((o) => {
    if (!askedGapKinds.includes(o.kind)) return true;
    return REPEAT_OK.has(o.kind) && gapStillOpen(o.kind, profile);
  });
}

export function nextAskedGapKindsAfterQuestion(
  prior: AdvisorGapKind[],
  usedKind: AdvisorGapKind | undefined
): AdvisorGapKind[] {
  if (!usedKind || prior.includes(usedKind)) return prior;
  return [...prior, usedKind];
}
