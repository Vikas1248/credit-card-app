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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const bank = searchParams.get("bank")?.trim();
    const network = searchParams.get("network")?.trim();
    const rewardType = searchParams.get("reward_type")?.trim();
    const maxAnnualFee = searchParams.get("max_annual_fee")?.trim();
    const minJoiningFee = searchParams.get("min_joining_fee")?.trim();
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      whereClauses.push(
        `(card_name ILIKE $${i} OR bank ILIKE $${i} OR coalesce(best_for, '') ILIKE $${i})`
      );
    }
    if (bank) {
      params.push(bank);
      whereClauses.push(`bank = $${params.length}`);
    }
    if (network) {
      params.push(network);
      whereClauses.push(`network = $${params.length}`);
    }
    if (rewardType) {
      params.push(rewardType);
      whereClauses.push(`reward_type = $${params.length}`);
    }
    if (maxAnnualFee && !Number.isNaN(Number(maxAnnualFee))) {
      params.push(Number(maxAnnualFee));
      whereClauses.push(`annual_fee <= $${params.length}`);
    }
    if (minJoiningFee && !Number.isNaN(Number(minJoiningFee))) {
      params.push(Number(minJoiningFee));
      whereClauses.push(`joining_fee >= $${params.length}`);
    }

    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50;
    const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;

    params.push(safeLimit);
    const limitParam = params.length;
    params.push(safeOffset);
    const offsetParam = params.length;

    const whereSql = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

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
      ${whereSql}
      ORDER BY annual_fee ASC, card_name ASC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
      `,
      params
    );

    return NextResponse.json({ cards: rows }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
