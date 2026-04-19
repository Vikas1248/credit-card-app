/**
 * Shared types for `POST /api/recommend-cards` (wizard + LangGraph).
 * Kept in `lib/` so both the route and client components can import them.
 */

export type RecommendedCard = {
  card_id: string;
  card_name: string;
  bank: string;
  score: number;
  yearlyReward: number;
  annualFee: number;
  netGain: number;
  explanation: string | null;
};

export type RecommendCardsAiMeta = {
  explanation: {
    summary: string;
    why: string[];
    tradeoffs: string[];
  };
  confidence: number;
  decisionType: "clear_winner" | "close_call";
  runnerUp: {
    id: string;
    name: string;
    bank: string;
    score: number;
    netReward: number;
  } | null;
  betterAlternative?: {
    id: string;
    name: string;
    bank: string;
    score: number;
    netReward: number;
  };
};

export type RecommendCardsResponseBody = {
  cards: RecommendedCard[];
  ai: RecommendCardsAiMeta;
};
