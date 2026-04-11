import { openAiJsonCompletion } from "@/lib/ai/openaiClient";
import type { CardBriefForAi } from "@/lib/ai/cardBrief";
import { parseOrderedIds } from "@/lib/ai/cardBrief";

export async function fetchAiSearchRank(
  query: string,
  cards: CardBriefForAi[]
): Promise<string[] | null> {
  const q = query.trim();
  if (q.length < 2 || cards.length === 0) {
    return null;
  }

  const allowed = new Set(cards.map((c) => c.id));
  const user = `
User search query (Indian credit card shopper): ${JSON.stringify(q)}

Cards (rank ALL of these by relevance to the query; most relevant first):
${JSON.stringify(cards, null, 2)}

Return ONLY valid JSON:
{ "ordered_ids": [ "<uuid>", ... ] }

Include every card_id exactly once. Use card_name, bank, best_for, and reward fields to judge fit (e.g. "lounge", "fuel", "cashback", bank names).
`.trim();

  const parsed = await openAiJsonCompletion(
    "You output strict JSON only. Key: ordered_ids (array of card id strings).",
    user,
    0.15
  );

  const ordered = parseOrderedIds(parsed, allowed);
  if (!ordered || ordered.length === 0) {
    return null;
  }
  return ordered;
}
