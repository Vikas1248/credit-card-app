import type { CredGenieAdvisorProfile } from "./types";

/**
 * Aggregate confidence (0–1). Tuned so typical multi-turn chats cross 0.85 after
 * spend + rewards + fees + category signals — without requiring every optional field.
 */
export function computeProfileConfidence(profile: CredGenieAdvisorProfile): number {
  let score = 0;

  if (typeof profile.monthlySpend === "number" && profile.monthlySpend >= 5000) {
    score += 0.22;
  }

  const cats = [profile.shopping, profile.dining, profile.travel, profile.fuel].filter(Boolean);
  score += Math.min(0.28, cats.length * 0.07);

  if (cats.some((c) => c === "high" || c === "medium")) score += 0.06;

  if (profile.preferred_rewards) score += 0.14;

  if (profile.fees) score += 0.12;

  if (profile.telecomEcosystem && profile.telecomEcosystem !== "none") score += 0.05;

  if (profile.travelFrequency) score += 0.06;
  if (profile.travelType) score += 0.04;

  if (profile.loungePriority && profile.loungePriority !== "none") score += 0.05;

  const brands = profile.preferredBrands?.length ?? 0;
  score += Math.min(0.08, brands * 0.025);

  if (profile.travel === "high" || profile.travelFrequency === "frequent") {
    if (!profile.travelType) score -= 0.04;
  }

  let finalScore = Math.max(0, Math.min(1, score));

  // Monthly spend anchors INR reward estimates — avoid “ready” without it.
  if (!(typeof profile.monthlySpend === "number" && profile.monthlySpend >= 5000)) {
    finalScore = Math.min(finalScore, 0.82);
  }

  return finalScore;
}

export type ConfidenceBand = "foundational" | "optimization" | "ready";

export function confidenceBandFromScore(score: number): ConfidenceBand {
  if (score < 0.6) return "foundational";
  if (score < 0.85) return "optimization";
  return "ready";
}
