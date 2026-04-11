import { openAiJsonCompletion } from "@/lib/ai/openaiClient";
import type { CardBriefForAi } from "@/lib/ai/cardBrief";
import { parseOrderedIds } from "@/lib/ai/cardBrief";

/**
 * Full-catalog browse order: diverse, interesting first for someone exploring.
 */
export async function fetchAiBrowseOrder(
  cards: CardBriefForAi[]
): Promise<string[] | null> {
  if (cards.length === 0) return null;
  const allowed = new Set(cards.map((c) => c.id));

  const user = `
Order these Indian credit cards for CredGenie's "browse all" list.
Prioritize: mix of fee levels, reward types, and strong category stories — not alphabetical.

Cards:
${JSON.stringify(cards, null, 2)}

Return ONLY valid JSON:
{ "ordered_ids": [ "<uuid>", ... ] }

Include every card_id exactly once.
`.trim();

  const parsed = await openAiJsonCompletion(
    "You output strict JSON only. Key: ordered_ids (array of strings, permutation of all ids).",
    user,
    0.25
  );

  const ordered = parseOrderedIds(parsed, allowed);
  if (!ordered || ordered.length === 0) {
    return null;
  }
  return ordered;
}
