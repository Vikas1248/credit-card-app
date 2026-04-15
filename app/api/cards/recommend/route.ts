import { NextResponse } from "next/server";
import { finalizeSpendRecommendations } from "@/lib/recommend/finalizeSpendRecommendations";
import {
  parseSpendInput,
  type RecommendationProfile,
} from "@/lib/recommend/topSpendRecommendations";

type ProfileCategory = "dining" | "travel" | "shopping" | "fuel";
type ProfileLifestyleNeed =
  | "movie_offer"
  | "lounge_domestic"
  | "lounge_international"
  | "golf";

function parseRecommendationProfile(body: unknown): RecommendationProfile | undefined {
  if (body === null || typeof body !== "object") return undefined;
  const o = body as Record<string, unknown>;
  const raw = o.profile;
  if (raw === null || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;

  const topCategories = Array.isArray(p.top_categories)
    ? p.top_categories.filter(
        (v): v is ProfileCategory =>
          v === "dining" || v === "travel" || v === "shopping" || v === "fuel"
      )
    : undefined;

  const lifestyleNeeds = Array.isArray(p.lifestyle_needs)
    ? p.lifestyle_needs.filter(
        (v): v is ProfileLifestyleNeed =>
          v === "movie_offer" ||
          v === "lounge_domestic" ||
          v === "lounge_international" ||
          v === "golf"
      )
    : undefined;

  const feePreference =
    p.fee_preference === "lifetime_free" ||
    p.fee_preference === "low_fee" ||
    p.fee_preference === "premium_ok"
      ? p.fee_preference
      : undefined;

  const excludeCardIds = Array.isArray(p.exclude_card_ids)
    ? p.exclude_card_ids.filter((v): v is string => typeof v === "string")
    : undefined;

  return {
    top_categories: topCategories,
    lifestyle_needs: lifestyleNeeds,
    fee_preference: feePreference,
    exclude_card_ids: excludeCardIds,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseSpendInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const profile = parseRecommendationProfile(body);
    const payload = await finalizeSpendRecommendations(parsed.spend, 3, profile);
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
