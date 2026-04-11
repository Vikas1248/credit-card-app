import { openAiJsonCompletion } from "@/lib/ai/openaiClient";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CardNetwork } from "@/lib/types/card";

type CardBrief = {
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

export type FeaturedAiPick = { card_id: string; tag: string };

function maxRate(c: CardBrief): number {
  const vals = [
    c.dining_reward,
    c.travel_reward,
    c.shopping_reward,
    c.fuel_reward,
  ].filter((v): v is number => typeof v === "number" && v > 0);
  return vals.length ? Math.max(...vals) : 0;
}

export async function computeFeaturedCarouselPicks(
  network: CardNetwork | null
): Promise<FeaturedAiPick[]> {
  const supabase = getSupabaseServerClient();
  let q = supabase
    .from("credit_cards")
    .select(
      "id, card_name, bank, annual_fee, reward_type, dining_reward, travel_reward, shopping_reward, fuel_reward, best_for"
    )
    .order("annual_fee", { ascending: true })
    .limit(120);

  if (network) {
    q = q.eq("network", network);
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as CardBrief[];
  if (rows.length === 0) {
    return [];
  }

  const brief = rows.map((r) => ({
    card_id: r.id,
    card_name: r.card_name,
    bank: r.bank,
    annual_fee: r.annual_fee,
    reward_type: r.reward_type,
    best_for: r.best_for?.slice(0, 160) ?? null,
    max_listed_category_reward_pct: maxRate(r),
  }));

  const user = `
You curate a small "Featured picks" carousel for CredGenie, an Indian credit card discovery site.

Cards (pick ONLY from card_id values below):
${JSON.stringify(brief, null, 2)}

Choose exactly 5 cards with diverse appeal (mix fee levels, reward types, and use-cases). Assign each a short display tag (2–4 words), e.g. "Best overall", "Travel pick", "Zero annual fee", "Cashback", "Shopping".

Return ONLY valid JSON:
{ "items": [ { "card_id": "<uuid>", "tag": "..." }, ... ] }

Exactly 5 items, unique card_ids, all from the list.
`.trim();

  const parsed = (await openAiJsonCompletion(
    "You output strict JSON only. Key: items (array of {card_id, tag}).",
    user,
    0.35
  )) as { items?: { card_id?: string; tag?: string }[] };

  const items = parsed.items;
  if (!Array.isArray(items)) {
    return [];
  }

  const allowed = new Set(rows.map((r) => r.id));
  const out: FeaturedAiPick[] = [];
  const seen = new Set<string>();

  for (const it of items) {
    const id = typeof it.card_id === "string" ? it.card_id : "";
    const tag = typeof it.tag === "string" ? it.tag.trim() : "";
    if (!id || !tag || !allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ card_id: id, tag });
  }

  if (out.length < 5) {
    for (const r of rows.sort((a, b) => maxRate(b) - maxRate(a))) {
      if (out.length >= 5) break;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ card_id: r.id, tag: "Top pick" });
    }
  }

  return out.slice(0, 5);
}
