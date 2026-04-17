import { openAiJsonCompletion, isOpenAiConfigured } from "@/lib/ai/openaiClient";
import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";
import type { UserProfile } from "@/lib/recommendV2/userProfile";
import type { CardRowForScoring, YearlyValue } from "@/lib/recommendV2/scoring";

export async function generateExplanation(
  card: CardRowForScoring,
  userProfile: UserProfile,
  value: YearlyValue
): Promise<string | null> {
  if (areThirdPartyApisDisabled() || !isOpenAiConfigured()) return null;

  const parsed = (await openAiJsonCompletion(
    "You output strict JSON only. Keys: explanation.",
    `
Explain in 2-3 lines why this credit card is best for this user.

User:
- Monthly spend: ₹${Math.round(userProfile.monthlySpend)}
- Categories: ${userProfile.topCategories.join(", ")}
- Lifestyle / benefits: ${userProfile.lifestyle.length ? userProfile.lifestyle.join(", ") : "—"}
- Preference: ${userProfile.preferredRewardType}
- Fee sensitivity: ${userProfile.feeSensitivity}

Card:
- Name: ${card.card_name}
- Bank: ${card.bank}
- Reward: ${card.reward_rate ?? "—"}
- Fee: ₹${Math.round(card.annual_fee)}

Value:
- Expected yearly reward: ₹${Math.round(value.yearlyReward)}
- Net gain: ₹${Math.round(value.netGain)}

Make it simple, personalized, and persuasive. Indian English. Use ₹. Max 260 characters.

Return JSON only:
{"explanation":"..."}
    `.trim(),
    0.35
  )) as { explanation?: string };

  const text = typeof parsed.explanation === "string" ? parsed.explanation.trim() : "";
  return text.length > 0 ? text : null;
}

