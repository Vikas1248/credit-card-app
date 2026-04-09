import { NextResponse } from "next/server";
import { finalizeSpendRecommendations } from "@/lib/recommend/finalizeSpendRecommendations";
import { parseSpendInput } from "@/lib/recommend/topSpendRecommendations";

export async function POST(request: Request) {
  try {
    const parsed = parseSpendInput(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const payload = await finalizeSpendRecommendations(parsed.spend, 3);
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
