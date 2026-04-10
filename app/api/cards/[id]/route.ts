import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CardNetwork } from "@/lib/types/card";

type CardRow = {
  id: string;
  card_name: string;
  bank: string;
  network: CardNetwork;
  joining_fee: number;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  key_benefits: string | null;
  last_updated: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("credit_cards")
      .select(
        "id, card_name, bank, network, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits, last_updated"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ card: data as CardRow }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
