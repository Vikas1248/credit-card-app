import { openAiJsonCompletion } from "@/lib/ai/openaiClient";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  compareCardsBySpendCategory,
  rewardPctForSpendCategory,
  spendCategoryBySlug,
  type SpendCategorySlug,
} from "@/lib/spendCategories";
import type { CardNetwork } from "@/lib/types/card";

type CardRow = {
  id: string;
  card_name: string;
  bank: string;
  network: string;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
  best_for: string | null;
  metadata: Record<string, unknown> | null;
};

export async function computeCategoryPageInsight(
  slug: SpendCategorySlug,
  network: CardNetwork | null
): Promise<string> {
  const meta = spendCategoryBySlug(slug);
  const supabase = getSupabaseServerClient();
  let q = supabase
    .from("credit_cards")
    .select(
      "id, card_name, bank, network, annual_fee, reward_type, reward_rate, dining_reward, travel_reward, shopping_reward, fuel_reward, best_for, metadata"
    )
    .limit(200);

  if (network) {
    q = q.eq("network", network);
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }

  const cards = [...((data ?? []) as CardRow[])].sort((a, b) =>
    compareCardsBySpendCategory(slug, a, b)
  );

  const top = cards.slice(0, 18).map((c) => ({
    card_id: c.id,
    card_name: c.card_name,
    bank: c.bank,
    annual_fee: c.annual_fee,
    reward_type: c.reward_type,
    category_reward_percent: rewardPctForSpendCategory(c, slug),
    best_for: c.best_for?.slice(0, 140) ?? null,
  }));

  const user = `
Category: ${meta.label} — ${meta.blurb}

Top cards in our catalog for this category (sorted by listed ${meta.label.toLowerCase()} reward % where available):
${JSON.stringify(top, null, 2)}

Write one short paragraph (3–5 sentences) in Indian English for someone browsing this category: what to look for in a ${meta.label.toLowerCase()} card, how annual fee trade-offs often work, and remind them to confirm merchant/category rules with the bank. Do not claim official bank endorsement.

Return ONLY valid JSON: { "paragraph": "..." }
`.trim();

  const parsed = (await openAiJsonCompletion(
    "You output strict JSON only. Key: paragraph (string).",
    user,
    0.35
  )) as { paragraph?: string };

  const p = typeof parsed.paragraph === "string" ? parsed.paragraph.trim() : "";
  return p || `Browse ${meta.label.toLowerCase()} cards below, sorted by the earn rate we have on file. Compare annual fees and check issuer terms before you apply.`;
}
