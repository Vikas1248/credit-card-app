import type { CredGenieAdvisorProfile } from "./types";
import type { AdvisorGapKind, OpportunitySignal } from "./conversationState";

function push(
  out: OpportunitySignal[],
  kind: AdvisorGapKind,
  priority: number,
  hint: string
) {
  out.push({ kind, priority, hint });
}

function filledCategoryCount(profile: CredGenieAdvisorProfile): number {
  return [profile.shopping, profile.dining, profile.travel, profile.fuel].filter(Boolean).length;
}

/** User shows travel spend level but not how often they fly — handle before generic category_mix. */
function travelNeedsCadence(profile: CredGenieAdvisorProfile): boolean {
  return (
    Boolean(profile.travel) &&
    !profile.travelFrequency &&
    (profile.travel === "high" || profile.travel === "medium")
  );
}

function shouldAskTravelType(profile: CredGenieAdvisorProfile): boolean {
  if (profile.travelType) return false;
  if (!profile.travelFrequency || profile.travelFrequency === "rarely") return false;
  return (
    profile.travel === "high" ||
    profile.travel === "medium" ||
    profile.travelFrequency === "frequent" ||
    profile.travelFrequency === "occasionally"
  );
}

/**
 * Identify missing high-value attributes and ecosystem hooks for follow-up questions.
 * Travel is sequenced: cadence → domestic/international — never stack with generic
 * “category mix” when only travel cadence is missing (avoids duplicate travel/fuel asks).
 */
export function analyzeAdvisorOpportunities(
  profile: CredGenieAdvisorProfile
): { gaps: AdvisorGapKind[]; opportunities: OpportunitySignal[] } {
  const opportunities: OpportunitySignal[] = [];

  if (!profile.monthlySpend || profile.monthlySpend < 5000) {
    push(opportunities, "monthly_spend", 100, "Need typical monthly card spend for reward sizing.");
  }

  const filledCats = filledCategoryCount(profile);
  const travelCadenceGap = travelNeedsCadence(profile);

  if (filledCats < 2 && !travelCadenceGap) {
    push(
      opportunities,
      "category_mix",
      92,
      "Need at least two spend lanes (shopping/dining/travel/fuel) with intensity."
    );
  }

  if (travelCadenceGap) {
    push(
      opportunities,
      "travel_frequency",
      91,
      "Travel spend level known but cadence unknown — ask before domestic/international split."
    );
  }

  if (shouldAskTravelType(profile)) {
    push(
      opportunities,
      "travel_type",
      76,
      "Travel-active user — domestic vs international split affects lounge/miles cards."
    );
  }

  if (!profile.preferred_rewards) {
    push(opportunities, "reward_format", 88, "Cashback vs travel/points preference unknown.");
  }

  if (!profile.fees) {
    push(opportunities, "fee_tolerance", 84, "Fee tolerance unknown for lounge/premium cards.");
  }

  if (profile.telecomEcosystem === "airtel" || profile.telecomEcosystem === "jio") {
    push(
      opportunities,
      "telecom_spend_depth",
      78,
      `User tied to ${profile.telecomEcosystem}; quantify broadband/recharge share of spend.`
    );
  }

  if (profile.fees === "high" && !profile.loungePriority) {
    push(
      opportunities,
      "lounge_priority",
      68,
      "Premium fee tolerance — clarify lounge importance vs miles."
    );
  }

  if (profile.preferred_rewards === "cashback" && (profile.preferredBrands?.length ?? 0) === 0) {
    push(
      opportunities,
      "merchant_ecosystem",
      62,
      "Cashback-focused — Amazon/Flipkart/Swiggy ecosystem materially changes picks."
    );
  }

  opportunities.sort((a, b) => b.priority - a.priority);
  const gaps = [...new Set(opportunities.map((o) => o.kind))];

  return { gaps, opportunities };
}
