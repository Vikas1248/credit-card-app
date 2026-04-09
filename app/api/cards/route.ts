import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type CardRow = {
  id: string;
  card_name: string;
  bank: string;
  network: "Visa" | "Mastercard";
  joining_fee: number;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  key_benefits: string | null;
  last_updated: string;
};

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const bank = searchParams.get("bank")?.trim();
    const network = searchParams.get("network")?.trim();
    const rewardType = searchParams.get("reward_type")?.trim();
    const maxAnnualFee = searchParams.get("max_annual_fee")?.trim();
    const minJoiningFee = searchParams.get("min_joining_fee")?.trim();
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");

    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50;
    const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;
    let query = supabase
      .from("credit_cards")
      .select(
        "id, card_name, bank, network, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits, last_updated"
      )
      .order("annual_fee", { ascending: true })
      .order("card_name", { ascending: true })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (q) {
      query = query.or(
        `card_name.ilike.%${q}%,bank.ilike.%${q}%,best_for.ilike.%${q}%`
      );
    }
    if (bank) query = query.eq("bank", bank);
    if (network) query = query.eq("network", network);
    if (rewardType) query = query.eq("reward_type", rewardType);
    if (maxAnnualFee && !Number.isNaN(Number(maxAnnualFee))) {
      query = query.lte("annual_fee", Number(maxAnnualFee));
    }
    if (minJoiningFee && !Number.isNaN(Number(minJoiningFee))) {
      query = query.gte("joining_fee", Number(minJoiningFee));
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ cards: (data ?? []) as CardRow[] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
