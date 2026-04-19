import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getRecommendations,
  profileToGraphInput,
  type CredgenieRecommendationResult,
  type ScoredCardSummary,
} from "@/lib/recommendV2/langgraph";
import type {
  RecommendCardsAiMeta,
  RecommendCardsResponseBody,
  RecommendedCard,
} from "@/lib/recommendV2/recommendCardsApiTypes";
import { parseUserProfile } from "@/lib/recommendV2/userProfile";
import type { CardRowForScoring } from "@/lib/recommendV2/scoring";
import { CREDGENIE_RECOMMEND_FRESH_HEADER } from "@/lib/recommendV2/recommendCardsFreshHeader";

function summaryForAiMeta(s: ScoredCardSummary | null | undefined) {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    bank: s.bank,
    score: s.score,
    netReward: s.netReward,
  };
}

function buildAiMetaFromGraph(result: CredgenieRecommendationResult): RecommendCardsAiMeta {
  return {
    explanation: result.explanation,
    confidence: result.confidence,
    decisionType: result.decisionType,
    runnerUp: summaryForAiMeta(result.runnerUp),
    ...(result.betterAlternative
      ? { betterAlternative: summaryForAiMeta(result.betterAlternative)! }
      : {}),
  };
}

function truncateLine(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function benefitBulletsFromRow(card: CardRowForScoring | undefined): string[] {
  if (!card) return [];
  const out: string[] = [];
  if (card.best_for?.trim()) {
    out.push(truncateLine(card.best_for, 120));
  }
  if (card.key_benefits?.trim()) {
    const parts = card.key_benefits
      .split(/\n|•/)
      .map((x) => x.trim())
      .filter((x) => x.length > 6);
    for (const p of parts) {
      if (out.length >= 3) break;
      const line = truncateLine(p, 100);
      if (!out.some((x) => x === line || x.includes(line.slice(0, 40)))) out.push(line);
    }
  }
  return out.slice(0, 3);
}

const SELECT_FIELDS =
  "id, card_name, bank, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits, dining_reward, travel_reward, shopping_reward, fuel_reward, network, metadata";

type CacheEntry = { expiresAt: number; payload: RecommendCardsResponseBody };
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

    const skipCache =
      request.headers.get(CREDGENIE_RECOMMEND_FRESH_HEADER) === "1";
    const key = cacheKey(parsed.profile);
    const now = Date.now();
    if (!skipCache) {
      const cached = cache.get(key);
      if (cached && cached.expiresAt > now) {
        return NextResponse.json(cached.payload, {
          status: 200,
          headers: { "Cache-Control": "private, max-age=600" },
        });
      }
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("credit_cards").select(SELECT_FIELDS);
    if (error) {
      throw new Error(error.message);
    }
    const cards = (data ?? []) as CardRowForScoring[];
    if (cards.length === 0) {
      const empty: RecommendCardsResponseBody = {
        cards: [],
        ai: {
          explanation: { summary: "", why: [], tradeoffs: [] },
          confidence: 0,
          decisionType: "clear_winner",
          runnerUp: null,
        },
      };
      return NextResponse.json(empty, { status: 200 });
    }

    const graphInput = profileToGraphInput(parsed.profile);
    const graphResult = await getRecommendations({
      ...graphInput,
      candidatesOverride: cards,
    });

    const byId = new Map(cards.map((c) => [c.id, c]));
    const enrichedCards: RecommendedCard[] = graphResult.topPicks.map((row) => ({
      ...row,
      benefitBullets: benefitBulletsFromRow(byId.get(row.card_id)),
    }));

    const payload: RecommendCardsResponseBody = {
      cards: enrichedCards,
      ai: buildAiMetaFromGraph(graphResult),
    };

    if (!skipCache) {
      cache.set(key, { expiresAt: now + CACHE_TTL_MS, payload });
    }

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, private",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

