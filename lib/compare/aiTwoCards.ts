import { openAiJsonCompletion } from "@/lib/ai/openaiClient";
import type { SpendByCategory } from "@/lib/recommend/rewardCalculator";
import { rewardCalculator } from "@/lib/recommend/rewardCalculator";

export type CardForCompareAi = {
  id: string;
  card_name: string;
  bank: string;
  network: string;
  annual_fee: number;
  joining_fee: number;
  reward_type: string;
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
  metadata?: Record<string, unknown> | null;
  key_benefits?: string | null;
};

export type CompareAiResponse = {
  overview: string;
  when_left_better: string;
  when_right_better: string;
  caveat: string;
};

function summarizeCard(
  label: string,
  card: CardForCompareAi,
  spend: SpendByCategory | null
) {
  const rates = {
    dining: card.dining_reward,
    travel: card.travel_reward,
    shopping: card.shopping_reward,
    fuel: card.fuel_reward,
  };
  let yearly: { yearlyTotal: number } | null = null;
  if (spend) {
    yearly = rewardCalculator.computeYearlyRewards(spend, {
      card_name: card.card_name,
      network: card.network as "Visa" | "Mastercard" | "Amex",
      reward_type: card.reward_type as "cashback" | "points",
      reward_rate: card.reward_rate,
      best_for: card.best_for,
      metadata: card.metadata,
      key_benefits: card.key_benefits,
      dining_reward: card.dining_reward,
      travel_reward: card.travel_reward,
      shopping_reward: card.shopping_reward,
      fuel_reward: card.fuel_reward,
    });
  }
  return {
    label,
    id: card.id,
    card_name: card.card_name,
    bank: card.bank,
    network: card.network,
    annual_fee_inr: card.annual_fee,
    joining_fee_inr: card.joining_fee,
    reward_type: card.reward_type,
    reward_rate_text: card.reward_rate,
    lounge_access: card.lounge_access,
    best_for: card.best_for,
    category_reward_percent: rates,
    model_yearly_reward_inr_if_spend: yearly?.yearlyTotal ?? null,
  };
}

export async function fetchAiTwoCardComparison(
  left: CardForCompareAi,
  right: CardForCompareAi,
  monthlySpend: SpendByCategory | null
): Promise<CompareAiResponse> {
  const a = summarizeCard("Card A (left column)", left, monthlySpend);
  const b = summarizeCard("Card B (right column)", right, monthlySpend);

  const user = `
Compare these two Indian credit cards for a typical user.

${JSON.stringify({ card_a: a, card_b: b, user_monthly_spend_inr: monthlySpend }, null, 2)}

Use model_yearly_reward_inr_if_spend only when non-null; it follows category_reward_percent × spend. Do not invent reward rates.

Return ONLY valid JSON:
{
  "overview": "2–4 sentences in Indian English.",
  "when_left_better": "1–3 sentences: when ${left.card_name} is the stronger choice.",
  "when_right_better": "1–3 sentences: when ${right.card_name} is the stronger choice.",
  "caveat": "One short sentence: not financial advice; user should verify fees and T&Cs with the issuer."
}
`.trim();

  const parsed = (await openAiJsonCompletion(
    "You output strict JSON only with keys overview, when_left_better, when_right_better, caveat.",
    user,
    0.3
  )) as Record<string, unknown>;

  const overview = typeof parsed.overview === "string" ? parsed.overview.trim() : "";
  const when_left_better =
    typeof parsed.when_left_better === "string"
      ? parsed.when_left_better.trim()
      : "";
  const when_right_better =
    typeof parsed.when_right_better === "string"
      ? parsed.when_right_better.trim()
      : "";
  const caveat =
    typeof parsed.caveat === "string" ? parsed.caveat.trim() : "";

  if (!overview) {
    throw new Error("AI comparison missing overview.");
  }

  return {
    overview,
    when_left_better: when_left_better || "—",
    when_right_better: when_right_better || "—",
    caveat: caveat || "Verify current fees and terms with the bank before applying.",
  };
}
