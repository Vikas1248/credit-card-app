import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/ai/openaiClient";
import {
  fetchCardDetailAiInsight,
  type CardDetailAiPayload,
} from "@/lib/card/aiCardDetailInsight";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const SELECT =
  "id, card_name, bank, network, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits, dining_reward, travel_reward, shopping_reward, fuel_reward";

async function computeInsight(cardId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_cards")
    .select(SELECT)
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const row = data as CardDetailAiPayload & { id: string };
  return fetchCardDetailAiInsight(row);
}

const getCachedInsight = unstable_cache(
  async (cardId: string) => computeInsight(cardId),
  ["credgenie-detail-ai-v1"],
  { revalidate: 1800 }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  if (!isOpenAiConfigured()) {
    return NextResponse.json({ source: "none" as const, insight: null });
  }

  try {
    const insight = await getCachedInsight(id);
    if (!insight) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }
    return NextResponse.json({ source: "ai" as const, insight });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { source: "error" as const, insight: null, error: message },
      { status: 500 }
    );
  }
}
