import type { SpendByCategory } from "@/lib/recommend/rewardCalculator";
import type { SpendRecommendationRow } from "@/lib/recommend/topSpendRecommendations";

type OpenAIExplanationItem = {
  card_id: string;
  explanation: string;
};

function buildUserMessage(
  monthlySpend: SpendByCategory,
  rows: SpendRecommendationRow[]
): string {
  const cards = rows.map((r) => ({
    card_id: r.id,
    card_name: r.card_name,
    bank: r.bank,
    reward_type: r.reward_type,
    category_rates_percent: r.category_reward_pct,
    user_monthly_spend_inr: {
      dining: monthlySpend.dining,
      travel: monthlySpend.travel,
      shopping: monthlySpend.shopping,
      fuel: monthlySpend.fuel,
    },
    estimated_monthly_reward_inr_by_category: {
      dining: Math.round((r.breakdown.dining / 12) * 100) / 100,
      travel: Math.round((r.breakdown.travel / 12) * 100) / 100,
      shopping: Math.round((r.breakdown.shopping / 12) * 100) / 100,
      fuel: Math.round((r.breakdown.fuel / 12) * 100) / 100,
    },
    total_monthly_reward_inr: Math.round((r.yearly_reward_inr / 12) * 100) / 100,
    total_yearly_reward_inr: r.yearly_reward_inr,
  }));

  return `
User average monthly spend (INR) by category:
${JSON.stringify(monthlySpend, null, 2)}

Top-ranked cards with computed rewards (use these numbers only; do not invent rates or amounts):
${JSON.stringify(cards, null, 2)}

For EACH card_id above, write exactly one explanation string in Indian English.
- Mention how their spend pattern relates to this card (e.g. heavy dining vs travel).
- State the relevant reward rate from category_rates_percent when it is non-null and > 0 (e.g. "5% cashback on dining" or "5 reward rate on dining" for points cards say "points" not "cashback").
- Include estimated savings using total_monthly_reward_inr or a category line from estimated_monthly_reward_inr_by_category when helpful.
- Example tone: "You spend heavily on dining, this card gives 5% cashback on dining resulting in roughly ₹500/month in rewards."
- Use the ₹ symbol for rupees. Under 240 characters per explanation.
- If all category rates are null or zero, say rewards are uncertain from available data but mention total_monthly_reward_inr if > 0.

Return ONLY valid JSON:
{"explanations":[{"card_id":"<uuid>","explanation":"..."}]}
`.trim();
}

/**
 * Calls OpenAI to produce one short explanation per recommended card.
 * Requires OPENAI_API_KEY. Throws on API/parse errors (caller may catch).
 */
export async function fetchSpendRecommendationExplanations(
  monthlySpend: SpendByCategory,
  rows: SpendRecommendationRow[]
): Promise<Record<string, string>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  if (rows.length === 0) {
    return {};
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You output strict JSON only. Keys: explanations (array of {card_id, explanation}).",
        },
        {
          role: "user",
          content: buildUserMessage(monthlySpend, rows),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${errText}`);
  }

  const llmResult = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = llmResult.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response.");
  }

  const parsed = JSON.parse(content) as {
    explanations?: OpenAIExplanationItem[];
  };
  const list = parsed.explanations ?? [];
  const out: Record<string, string> = {};
  for (const item of list) {
    if (
      typeof item.card_id === "string" &&
      typeof item.explanation === "string" &&
      item.explanation.trim()
    ) {
      out[item.card_id] = item.explanation.trim();
    }
  }
  return out;
}

export function mergeSpendExplanations(
  rows: SpendRecommendationRow[],
  byId: Record<string, string>
): SpendRecommendationRow[] {
  return rows.map((r) => ({
    ...r,
    explanation: byId[r.id] ?? null,
  }));
}
