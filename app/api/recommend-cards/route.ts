import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseUserProfile } from "@/lib/recommendV2/userProfile";
import {
  calculateYearlyValue,
  scoreCard,
  type CardRowForScoring,
} from "@/lib/recommendV2/scoring";
import { generateExplanation } from "@/lib/recommendV2/aiExplanation";

type RecommendedCard = {
  card_id: string;
  card_name: string;
  bank: string;
  score: number; // 0..100
  yearlyReward: number;
  annualFee: number;
  netGain: number;
  explanation: string | null;
};

const SELECT_FIELDS =
  "id, card_name, bank, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits, dining_reward, travel_reward, shopping_reward, fuel_reward, network, metadata";

type CacheEntry = { expiresAt: number; payload: RecommendedCard[] };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 min

function cacheKey(profile: unknown): string {
  return JSON.stringify(profile);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseUserProfile(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const key = cacheKey(parsed.profile);
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload, {
        status: 200,
        headers: { "Cache-Control": "private, max-age=600" },
      });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("credit_cards").select(SELECT_FIELDS);
    if (error) {
      throw new Error(error.message);
    }
    const cards = (data ?? []) as CardRowForScoring[];
    if (cards.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const scored = cards
      .map((card) => {
        const value = calculateYearlyValue(card, parsed.profile);
        const score = scoreCard(card, parsed.profile);
        return { card, value, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const withExplanation = await Promise.all(
      scored.map(async ({ card, value, score }): Promise<RecommendedCard> => {
        const explanation = await generateExplanation(card, parsed.profile, value);
        return {
          card_id: card.id,
          card_name: card.card_name,
          bank: card.bank,
          score,
          yearlyReward: value.yearlyReward,
          annualFee: value.annualFee,
          netGain: value.netGain,
          explanation,
        };
      })
    );

    cache.set(key, { expiresAt: now + CACHE_TTL_MS, payload: withExplanation });

    return NextResponse.json(withExplanation, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

