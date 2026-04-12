import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/ai/openaiClient";
import { mergeOrderWithAllIds, toCardBrief } from "@/lib/ai/cardBrief";
import {
  getOptionalCardNetworkFilter,
  parseCardNetworkParam,
} from "@/lib/cards/networkFilter";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAiSearchRank } from "@/lib/search/aiSearchRank";
import { creditCardTextSearchOrFilter } from "@/lib/search/supabaseCardTextSearch";

const SELECT_BRIEF =
  "id, card_name, bank, network, annual_fee, reward_type, reward_rate, lounge_access, dining_reward, travel_reward, shopping_reward, fuel_reward, best_for, key_benefits";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json(
        { source: "skip" as const, ordered_ids: null as string[] | null },
        { status: 200 }
      );
    }

    if (!isOpenAiConfigured()) {
      return NextResponse.json(
        { source: "none" as const, ordered_ids: null as string[] | null },
        { status: 200 }
      );
    }

    const supabase = getSupabaseServerClient();
    const paramNet = parseCardNetworkParam(searchParams.get("network"));
    const effectiveNetwork = paramNet ?? getOptionalCardNetworkFilter();

    const textOr = creditCardTextSearchOrFilter(q);
    if (!textOr) {
      return NextResponse.json(
        { source: "skip" as const, ordered_ids: null as string[] | null },
        { status: 200 }
      );
    }

    let query = supabase
      .from("credit_cards")
      .select(SELECT_BRIEF)
      .or(textOr)
      .limit(120);

    if (effectiveNetwork) {
      query = query.eq("network", effectiveNetwork);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return NextResponse.json(
        { source: "ai" as const, ordered_ids: [] as string[] },
        { status: 200 }
      );
    }

    const briefs = rows.map((r) =>
      toCardBrief({
        id: r.id,
        card_name: r.card_name,
        bank: r.bank,
        annual_fee: r.annual_fee,
        reward_type: r.reward_type,
        dining_reward: r.dining_reward,
        travel_reward: r.travel_reward,
        shopping_reward: r.shopping_reward,
        fuel_reward: r.fuel_reward,
        best_for: r.best_for,
      })
    );

    let ranked: string[] | null = null;
    try {
      ranked = await fetchAiSearchRank(q, briefs);
    } catch {
      ranked = null;
    }
    const allIds = briefs.map((b) => b.id);
    const ordered_ids = ranked
      ? mergeOrderWithAllIds(ranked, allIds)
      : [...allIds].sort((a, b) => {
          const na = briefs.find((x) => x.id === a)?.card_name ?? "";
          const nb = briefs.find((x) => x.id === b)?.card_name ?? "";
          return na.localeCompare(nb);
        });

    return NextResponse.json(
      { source: "ai" as const, ordered_ids },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
