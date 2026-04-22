import { generateExplanation } from "@/lib/recommendV2/aiExplanation";
import type { RecommendedCard } from "@/lib/recommendV2/recommendCardsApiTypes";
import {
  calculateYearlyValue,
  scoreCardWithDetails,
  type CardRowForScoring,
} from "@/lib/recommendV2/scoring";
import type { UserProfile } from "@/lib/recommendV2/userProfile";

function truncateLine(text: string, max = 110): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function benefitBullets(card: CardRowForScoring): string[] {
  const out: string[] = [];
  if (card.best_for?.trim()) out.push(truncateLine(card.best_for, 120));
  if (card.key_benefits?.trim()) {
    const parts = card.key_benefits
      .split(/\n|•/)
      .map((x) => x.trim())
      .filter((x) => x.length > 6);
    for (const p of parts) {
      if (out.length >= 3) break;
      const line = truncateLine(p, 100);
      if (!out.includes(line)) out.push(line);
    }
  }
  return out.slice(0, 3);
}

function fallbackExplanation(card: CardRowForScoring, netGain: number): string {
  const bestFor = card.best_for?.trim();
  if (bestFor) {
    return `${bestFor}. Expected net value is about ₹${Math.round(netGain).toLocaleString("en-IN")} per year after fees.`;
  }
  return `Strong fit for your spend profile with estimated net value around ₹${Math.round(netGain).toLocaleString("en-IN")} per year.`;
}

export async function getTopRecommendationsForProfile(
  cards: CardRowForScoring[],
  profile: UserProfile
): Promise<RecommendedCard[]> {
  const ranked = cards
    .map((card) => {
      const details = scoreCardWithDetails(card, profile);
      return { card, details };
    })
    .sort((a, b) => {
      if (b.details.score !== a.details.score) return b.details.score - a.details.score;
      return b.details.value.netGain - a.details.value.netGain;
    })
    .slice(0, 3);

  const output: RecommendedCard[] = [];
  for (const item of ranked) {
    const value = calculateYearlyValue(item.card, profile);
    const ai = await generateExplanation(item.card, profile, value);
    output.push({
      card_id: item.card.id,
      card_name: item.card.card_name,
      bank: item.card.bank,
      score: item.details.score,
      yearlyReward: value.yearlyReward,
      annualFee: value.annualFee,
      netGain: value.netGain,
      explanation: ai ?? fallbackExplanation(item.card, value.netGain),
      benefitBullets: benefitBullets(item.card),
    });
  }

  return output;
}
