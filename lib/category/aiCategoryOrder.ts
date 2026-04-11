import { openAiJsonCompletion } from "@/lib/ai/openaiClient";
import type { CardBriefForAi } from "@/lib/ai/cardBrief";
import { parseOrderedIds } from "@/lib/ai/cardBrief";
import { spendCategoryBySlug, type SpendCategorySlug } from "@/lib/spendCategories";

export async function fetchAiCategoryOrder(
  slug: SpendCategorySlug,
  cards: CardBriefForAi[]
): Promise<string[] | null> {
  if (cards.length === 0) return null;
  const meta = spendCategoryBySlug(slug);
  const allowed = new Set(cards.map((c) => c.id));

  const user = `
Spend category: ${meta.label} — ${meta.blurb}

Each card includes category reward % in dining_reward, travel_reward, shopping_reward, fuel_reward (null if unknown). For this page, the primary category is ${meta.label}: use the matching field as the main signal, but also weigh annual_fee, best_for, and reward_type.

Cards:
${JSON.stringify(cards, null, 2)}

Return ONLY valid JSON:
{ "ordered_ids": [ "<uuid>", ... ] }

Rank best choices for ${meta.label} first. Include every card_id exactly once (cards weak on this category can go last).
`.trim();

  const parsed = await openAiJsonCompletion(
    "You output strict JSON only. Key: ordered_ids (permutation of all card ids).",
    user,
    0.2
  );

  const ordered = parseOrderedIds(parsed, allowed);
  if (!ordered || ordered.length === 0) {
    return null;
  }
  return ordered;
}
