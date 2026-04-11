/** Compact rows for LLM prompts (keep token use bounded). */

export type CardBriefForAi = {
  id: string;
  card_name: string;
  bank: string;
  annual_fee: number;
  reward_type: string;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
  best_for: string | null;
};

export function toCardBrief(r: {
  id: string;
  card_name: string;
  bank: string;
  annual_fee: number;
  reward_type: string;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
  best_for: string | null;
}): CardBriefForAi {
  return {
    id: r.id,
    card_name: r.card_name,
    bank: r.bank,
    annual_fee: r.annual_fee,
    reward_type: r.reward_type,
    dining_reward: r.dining_reward,
    travel_reward: r.travel_reward,
    shopping_reward: r.shopping_reward,
    fuel_reward: r.fuel_reward,
    best_for:
      r.best_for && r.best_for.length > 160
        ? `${r.best_for.slice(0, 159)}…`
        : r.best_for,
  };
}

export function parseOrderedIds(
  parsed: unknown,
  allowed: Set<string>
): string[] | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as { ordered_ids?: unknown };
  const raw = o.ordered_ids;
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || !allowed.has(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    out.push(item);
  }
  return out.length > 0 ? out : null;
}

/** Append any allowed ids missing from ordered list (stable tail). */
export function mergeOrderWithAllIds(
  ordered: string[] | null,
  allIds: string[]
): string[] {
  if (!ordered || ordered.length === 0) return [...allIds];
  const seen = new Set(ordered);
  const tail = allIds.filter((id) => !seen.has(id));
  return [...ordered, ...tail];
}
