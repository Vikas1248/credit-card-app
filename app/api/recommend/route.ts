import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

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

    const filters: string[] = [];
    const params: unknown[] = [];

    if (preferredBank) {
      params.push(preferredBank);
      filters.push(`bank = $${params.length}`);
    }
    if (preferredNetwork) {
      params.push(preferredNetwork);
      filters.push(`network = $${params.length}`);
    }
    if (maxAnnualFee !== null && !Number.isNaN(maxAnnualFee)) {
      params.push(maxAnnualFee);
      filters.push(`annual_fee <= $${params.length}`);
    }
    if (loungeRequired) {
      filters.push(`coalesce(lounge_access, 'N/A') <> 'N/A'`);
    }

    params.push(body.salary);
    const salaryParam = params.length;
    params.push(preferredRewardType);
    const rewardTypeParam = params.length;
    params.push(spendingCategories.length > 0 ? `%${spendingCategories[0]}%` : null);
    const category1Param = params.length;
    params.push(spendingCategories.length > 1 ? `%${spendingCategories[1]}%` : null);
    const category2Param = params.length;

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const rows = await dbQuery<RecommendedCard>(
      `
      WITH scored AS (
        SELECT
        id,
        card_name,
        bank,
        network,
        annual_fee,
        reward_type,
        reward_rate,
        lounge_access,
        best_for,
        (
          -- Reward quality based on parsed percentage and preference matching
          COALESCE((substring(coalesce(reward_rate, '') from '([0-9]+(?:\\.[0-9]+)?)%'))::numeric, 0) * 10 +
          CASE WHEN $${rewardTypeParam} IS NOT NULL AND reward_type = $${rewardTypeParam} THEN 15 ELSE 0 END +
          CASE WHEN $${category1Param} IS NOT NULL AND (
            coalesce(reward_rate, '') ILIKE $${category1Param}
            OR coalesce(best_for, '') ILIKE $${category1Param}
            OR coalesce(key_benefits, '') ILIKE $${category1Param}
          ) THEN 8 ELSE 0 END +
          CASE WHEN $${category2Param} IS NOT NULL AND (
            coalesce(reward_rate, '') ILIKE $${category2Param}
            OR coalesce(best_for, '') ILIKE $${category2Param}
            OR coalesce(key_benefits, '') ILIKE $${category2Param}
          ) THEN 5 ELSE 0 END
        )::int AS reward_score,
        (
          -- Eligibility based on salary vs annual fee burden
          CASE
            WHEN annual_fee = 0 THEN 100
            WHEN annual_fee <= $${salaryParam} * 0.02 THEN 90
            WHEN annual_fee <= $${salaryParam} * 0.05 THEN 70
            WHEN annual_fee <= $${salaryParam} * 0.1 THEN 45
            ELSE 20
          END +
          CASE WHEN joining_fee = 0 THEN 5 ELSE 0 END
        )::int AS eligibility_score
        FROM credit_cards
        ${whereSql}
      )
      SELECT
        id,
        card_name,
        bank,
        network,
        annual_fee,
        reward_type,
        reward_rate,
        lounge_access,
        best_for,
        reward_score,
        eligibility_score,
        (reward_score + eligibility_score)::int AS final_score
      FROM scored
      ORDER BY final_score DESC, reward_score DESC, annual_fee ASC, card_name ASC
      LIMIT 3
      `,
      params
    );

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
