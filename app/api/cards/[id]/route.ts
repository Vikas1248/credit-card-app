import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const rows = await dbQuery<CardRow>(
      `
      SELECT
        id,
        card_name,
        bank,
        network,
        joining_fee,
        annual_fee,
        reward_type,
        reward_rate,
        lounge_access,
        best_for,
        key_benefits,
        last_updated
      FROM credit_cards
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ card: rows[0] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
