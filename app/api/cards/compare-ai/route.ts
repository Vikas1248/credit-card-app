import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/ai/openaiClient";
import {
  fetchAiTwoCardComparison,
  type CardForCompareAi,
} from "@/lib/compare/aiTwoCards";
import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SpendByCategory } from "@/lib/recommend/rewardCalculator";

const SELECT =
  "id, card_name, bank, network, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, dining_reward, travel_reward, shopping_reward, fuel_reward";

function parseSpend(
  body: Record<string, unknown>
): SpendByCategory | null {
  const keys = ["dining", "travel", "shopping", "fuel"] as const;
  const out = {} as SpendByCategory;
  for (const k of keys) {
    const v = body[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      return null;
    }
    out[k] = v;
  }
  return out;
}

export async function POST(request: Request) {
  try {
    if (!isOpenAiConfigured()) {
      return NextResponse.json(
        { error: "OpenAI is not configured or external APIs are disabled." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const cardIdA =
      typeof body.cardIdA === "string" ? body.cardIdA.trim() : "";
    const cardIdB =
      typeof body.cardIdB === "string" ? body.cardIdB.trim() : "";
    if (!cardIdA || !cardIdB || cardIdA === cardIdB) {
      return NextResponse.json(
        { error: "cardIdA and cardIdB must be two different non-empty strings." },
        { status: 400 }
      );
    }

    const spend = parseSpend(body);

    const supabase = getSupabaseServerClient();
    const envNetwork = getOptionalCardNetworkFilter();

    async function loadOne(id: string) {
      let q = supabase.from("credit_cards").select(SELECT).eq("id", id);
      if (envNetwork) {
        q = q.eq("network", envNetwork);
      }
      const { data, error } = await q.maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data as CardForCompareAi | null;
    }

    const [left, right] = await Promise.all([loadOne(cardIdA), loadOne(cardIdB)]);
    if (!left || !right) {
      return NextResponse.json(
        { error: "One or both cards were not found in the catalog." },
        { status: 404 }
      );
    }

    const result = await fetchAiTwoCardComparison(left, right, spend);
    return NextResponse.json({ comparison: result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
