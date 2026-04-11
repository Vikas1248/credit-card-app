import { openAiJsonCompletion } from "@/lib/ai/openaiClient";

export type CardDetailAiPayload = {
  card_name: string;
  bank: string;
  network: string;
  annual_fee: number;
  joining_fee: number;
  reward_type: string;
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  key_benefits: string | null;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
};

export type CardDetailAiResult = {
  summary: string;
  ideal_for: string;
  watch_outs: string;
};

export async function fetchCardDetailAiInsight(
  card: CardDetailAiPayload
): Promise<CardDetailAiResult> {
  const user = `
Indian credit card (informational only; not financial advice):

${JSON.stringify(card, null, 2)}

Return ONLY valid JSON:
{
  "summary": "2–3 sentences: who this product is and main hook.",
  "ideal_for": "1–2 sentences: spending profile that fits.",
  "watch_outs": "1 sentence: fees, caps, or caveats to double-check with the bank."
}

Use Indian English and ₹ where relevant. Do not invent reward rates beyond the fields given.
`.trim();

  const parsed = (await openAiJsonCompletion(
    "You output strict JSON only. Keys: summary, ideal_for, watch_outs (strings).",
    user,
    0.3
  )) as Record<string, unknown>;

  const summary =
    typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const ideal_for =
    typeof parsed.ideal_for === "string" ? parsed.ideal_for.trim() : "";
  const watch_outs =
    typeof parsed.watch_outs === "string" ? parsed.watch_outs.trim() : "";

  if (!summary) {
    throw new Error("AI insight missing summary.");
  }

  return {
    summary,
    ideal_for: ideal_for || "—",
    watch_outs: watch_outs || "Confirm fees and reward rules on the issuer site.",
  };
}
