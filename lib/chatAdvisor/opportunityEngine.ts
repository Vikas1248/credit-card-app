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

/**
 * Identify missing high-value attributes and ecosystem hooks for follow-up questions.
 */
export function analyzeAdvisorOpportunities(
  profile: CredGenieAdvisorProfile
): { gaps: AdvisorGapKind[]; opportunities: OpportunitySignal[] } {
  const opportunities: OpportunitySignal[] = [];

  if (!profile.monthlySpend || profile.monthlySpend < 5000) {
    push(opportunities, "monthly_spend", 100, "Need typical monthly card spend for reward sizing.");
  }

  const filledCats = [
    profile.shopping,
    profile.dining,
    profile.travel,
    profile.fuel,
  ].filter(Boolean).length;
  if (filledCats < 2) {
    push(
      opportunities,
      "category_mix",
      92,
      "Need at least two spend lanes (shopping/dining/travel/fuel) with intensity."
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

  if (
    profile.travel === "high" ||
    profile.travel === "medium" ||
    profile.travelFrequency === "frequent" ||
    profile.travelFrequency === "occasionally"
  ) {
    if (!profile.travelType) {
      push(
        opportunities,
        "travel_type",
        76,
        "Travel-active user — domestic vs international split affects lounge/miles cards."
      );
    }
  }

  if (!profile.travelFrequency && (profile.travel === "high" || profile.travel === "medium")) {
    push(
      opportunities,
      "travel_frequency",
      70,
      "Coarse travel frequency refines airline/lounge recommendations."
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
