import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type RecommendRequest = {
  salary: number;
  spending_categories?: string[];
  preferences?: {
    preferred_reward_type?: "cashback" | "points";
    lounge_required?: boolean;
    preferred_bank?: string;
    preferred_network?: "Visa" | "Mastercard";
    max_annual_fee?: number;
  };
};

type RecommendedCard = {
  id: string;
  card_name: string;
  bank: string;
  network: "Visa" | "Mastercard";
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  reward_score: number;
  eligibility_score: number;
  final_score: number;
};

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = (await request.json()) as RecommendRequest;
    if (typeof body.salary !== "number" || body.salary <= 0) {
      return NextResponse.json(
        { error: "salary must be a positive number" },
        { status: 400 }
      );
    }

    const spendingCategories = (body.spending_categories ?? [])
      .map((item) => item.trim())
      .filter(Boolean);
    const preferredRewardType = body.preferences?.preferred_reward_type ?? null;
    const loungeRequired = body.preferences?.lounge_required ?? false;
    const preferredBank = body.preferences?.preferred_bank?.trim() || null;
    const preferredNetwork = body.preferences?.preferred_network ?? null;
    const maxAnnualFee =
      typeof body.preferences?.max_annual_fee === "number"
        ? body.preferences.max_annual_fee
        : null;

    let query = supabase
      .from("credit_cards")
      .select(
        "id, card_name, bank, network, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits"
      );

    if (preferredBank) query = query.eq("bank", preferredBank);
    if (preferredNetwork) query = query.eq("network", preferredNetwork);
    if (maxAnnualFee !== null && !Number.isNaN(maxAnnualFee)) {
      query = query.lte("annual_fee", maxAnnualFee);
    }
    if (loungeRequired) {
      query = query.not("lounge_access", "is", null).neq("lounge_access", "N/A");
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    const category1 = spendingCategories[0]?.toLowerCase() ?? null;
    const category2 = spendingCategories[1]?.toLowerCase() ?? null;

    const rows: RecommendedCard[] = (data ?? [])
      .map((card) => {
        const rewardText = (card.reward_rate ?? "").toLowerCase();
        const bestForText = (card.best_for ?? "").toLowerCase();
        const benefitsText = (card.key_benefits ?? "").toLowerCase();
        const loungeText = (card.lounge_access ?? "").toLowerCase();
        const parsedPct = Number(
          ((card.reward_rate ?? "").match(/([0-9]+(?:\.[0-9]+)?)%/) ?? [0, "0"])[1]
        );

        const rewardScore =
          (Number.isFinite(parsedPct) ? parsedPct : 0) * 10 +
          (preferredRewardType && card.reward_type === preferredRewardType ? 15 : 0) +
          (category1 &&
          (rewardText.includes(category1) ||
            bestForText.includes(category1) ||
            benefitsText.includes(category1))
            ? 8
            : 0) +
          (category2 &&
          (rewardText.includes(category2) ||
            bestForText.includes(category2) ||
            benefitsText.includes(category2))
            ? 5
            : 0);

        const eligibilityScore =
          (card.annual_fee === 0
            ? 100
            : card.annual_fee <= body.salary * 0.02
              ? 90
              : card.annual_fee <= body.salary * 0.05
                ? 70
                : card.annual_fee <= body.salary * 0.1
                  ? 45
                  : 20) + (card.joining_fee === 0 ? 5 : 0);

        return {
          id: card.id,
          card_name: card.card_name,
          bank: card.bank,
          network: card.network,
          annual_fee: card.annual_fee,
          reward_type: card.reward_type,
          reward_rate: card.reward_rate,
          lounge_access: card.lounge_access,
          best_for: card.best_for,
          reward_score: Math.round(rewardScore),
          eligibility_score: Math.round(eligibilityScore),
          final_score: Math.round(rewardScore + eligibilityScore),
        };
      })
      .sort((a, b) => {
        if (b.final_score !== a.final_score) return b.final_score - a.final_score;
        if (b.reward_score !== a.reward_score) return b.reward_score - a.reward_score;
        if (a.annual_fee !== b.annual_fee) return a.annual_fee - b.annual_fee;
        return a.card_name.localeCompare(b.card_name);
      })
      .slice(0, 3);

    return NextResponse.json(
      {
        input: {
          salary: body.salary,
          spending_categories: spendingCategories,
          preferences: body.preferences ?? {},
        },
        recommendations: rows,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
