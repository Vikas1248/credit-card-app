/**
 * LangGraph node implementations for CredGenie recommendations.
 * Ranking, margins, and alternatives are fully deterministic; only `generateExplanation`
 * may call an LLM to narrate the precomputed winner and runner-up.
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { getOpenAiModel, isOpenAiConfigured } from "@/lib/ai/openaiClient";
import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";
import type { CardRowForScoring } from "@/lib/recommendV2/scoring";
import { scoreCardWithDetails } from "@/lib/recommendV2/scoring";
import type { UserProfile } from "@/lib/recommendV2/userProfile";

import { MOCK_CANDIDATE_CARDS } from "./mockCards";
import type {
  CategoryWeights,
  CredgenieRecommendationInput,
  DecisionType,
  RecommendationExplanation,
  ScoredCard,
  SpendCategorySlug,
} from "./types";

/** Shared graph state shape (each node returns a partial update). */
export type RecommendationGraphState = {
  userInput?: CredgenieRecommendationInput;
  categoryWeights?: CategoryWeights;
  userProfile?: UserProfile;
  candidates?: CardRowForScoring[];
  scoredCards?: ScoredCard[];
  topCards?: ScoredCard[];
  decisionType?: DecisionType;
  confidence?: number;
  betterAlternative?: ScoredCard;
  explanation?: RecommendationExplanation;
};

const SLUGS: SpendCategorySlug[] = ["shopping", "dining", "travel", "fuel"];

const ExplanationSchema = z.object({
  summary: z.string(),
  why: z.array(z.string()),
  tradeoffs: z.array(z.string()),
});

/**
 * Node 1 — Turn coarse spend hints into normalized weights and a `UserProfile`
 * compatible with existing scoring helpers.
 */
export async function normalizeUserInput(
  state: RecommendationGraphState
): Promise<Partial<RecommendationGraphState>> {
  const input = state.userInput;
  if (!input) {
    throw new Error("normalizeUserInput: missing `userInput`.");
  }
  if (typeof input.monthlySpend !== "number" || !Number.isFinite(input.monthlySpend) || input.monthlySpend < 0) {
    throw new Error("normalizeUserInput: `monthlySpend` must be a non-negative finite number.");
  }

  const raw: Record<SpendCategorySlug, number> = {
    shopping: 0,
    dining: 0,
    travel: 0,
    fuel: 0,
  };

  if (Array.isArray(input.categories)) {
    const list = input.categories.map((c) => c.toLowerCase() as SpendCategorySlug).filter((c) => SLUGS.includes(c));
    const w = list.length > 0 ? 1 / list.length : 0;
    for (const c of list) raw[c] += w;
  } else {
    for (const k of SLUGS) {
      const v = input.categories[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) raw[k] = v;
    }
  }

  const sum = SLUGS.reduce((s, k) => s + raw[k], 0);
  const categoryWeights: CategoryWeights =
    sum > 0
      ? {
          shopping: raw.shopping / sum,
          dining: raw.dining / sum,
          travel: raw.travel / sum,
          fuel: raw.fuel / sum,
        }
      : { shopping: 0.25, dining: 0.25, travel: 0.25, fuel: 0.25 };

  const topCategories =
    sum > 0
      ? SLUGS.filter((k) => raw[k] > 0)
          .sort((a, b) => raw[b] - raw[a])
          .slice(0, 4)
      : [...SLUGS];

  const userProfile: UserProfile = {
    monthlySpend: input.monthlySpend,
    topCategories: topCategories.length > 0 ? topCategories : ["shopping"],
    preferredRewardType: input.profileOverrides?.preferredRewardType ?? "cashback",
    feeSensitivity: input.profileOverrides?.feeSensitivity ?? "medium",
    lifestyle: input.profileOverrides?.lifestyle ?? [],
    spendContext: input.profileOverrides?.spendContext,
  };

  return { categoryWeights, userProfile };
}

/** Node 2 — Load catalog (override or mock). */
export async function fetchCandidateCards(
  state: RecommendationGraphState
): Promise<Partial<RecommendationGraphState>> {
  const override = state.userInput?.candidatesOverride;
  const candidates =
    Array.isArray(override) && override.length > 0 ? override : MOCK_CANDIDATE_CARDS;
  return { candidates };
}

/** Node 3 — Deterministic scores from `scoring.ts` (unchanged model). */
export async function scoreCards(
  state: RecommendationGraphState
): Promise<Partial<RecommendationGraphState>> {
  const profile = state.userProfile;
  const candidates = state.candidates;
  if (!profile) throw new Error("scoreCards: missing `userProfile`.");
  if (!candidates?.length) throw new Error("scoreCards: missing `candidates`.");

  const scoredCards: ScoredCard[] = candidates.map((card) => {
    const { score, breakdown, value } = scoreCardWithDetails(card, profile);
    return {
      card,
      name: card.card_name,
      score,
      netReward: value.netGain,
      breakdown,
    };
  });

  return { scoredCards };
}

/** Node 4 — Keep the top five by deterministic score. */
export async function selectTopCards(
  state: RecommendationGraphState
): Promise<Partial<RecommendationGraphState>> {
  const scored = state.scoredCards ?? [];
  const topCards = [...scored].sort((a, b) => b.score - a.score).slice(0, 5);
  return { topCards };
}

/**
 * Node 5 — Classify whether #1 is materially ahead of #2 (relative margin &lt; 2% ⇒ close call).
 */
export async function validateTopCards(
  state: RecommendationGraphState
): Promise<Partial<RecommendationGraphState>> {
  const top = state.topCards ?? [];
  const s1 = top[0]?.score ?? 0;
  const s2 = top[1]?.score ?? 0;
  const denom = Math.max(s1, 1);
  const relativeGap = (s1 - s2) / denom;
  const decisionType: DecisionType = relativeGap < 0.02 ? "close_call" : "clear_winner";
  return { decisionType };
}

/**
 * Node 6 — Map raw score gap to a 0–1 confidence (larger gap ⇒ higher confidence).
 * Uses the 0–100 score scale: confidence = min(1, max(0, (s1 - s2) / 100)).
 */
export async function computeConfidence(
  state: RecommendationGraphState
): Promise<Partial<RecommendationGraphState>> {
  const top = state.topCards ?? [];
  const s1 = top[0]?.score ?? 0;
  const s2 = top[1]?.score ?? 0;
  const diff = Math.max(0, s1 - s2);
  const confidence = Math.min(1, diff / 100);
  return { confidence };
}

/**
 * Node 7 — Surface a non-top-two card that beats the winner on net reward by 10%+
 * or on category fit alone (still does not change the winner).
 */
export async function alternativeDiscovery(
  state: RecommendationGraphState
): Promise<Partial<RecommendationGraphState>> {
  const top = state.topCards ?? [];
  const scored = state.scoredCards ?? [];
  const winner = top[0];
  if (!winner) return {};

  const runner = top[1];
  const excluded = new Set([winner.card.id, runner?.card.id].filter(Boolean) as string[]);

  const pool = scored.filter((c) => !excluded.has(c.card.id));
  const qualifying = pool.filter((alt) => {
    const rewardEdge = winner.netReward > 0 ? alt.netReward > winner.netReward * 1.1 : alt.netReward > 0;
    const fitEdge = alt.breakdown.categoryFit > winner.breakdown.categoryFit;
    return rewardEdge || fitEdge;
  });

  if (qualifying.length === 0) return { betterAlternative: undefined };

  qualifying.sort((a, b) => {
    if (b.netReward !== a.netReward) return b.netReward - a.netReward;
    return b.breakdown.categoryFit - a.breakdown.categoryFit;
  });

  return { betterAlternative: qualifying[0] };
}

function deterministicExplanation(
  profile: UserProfile,
  winner: ScoredCard,
  runner: ScoredCard | undefined,
  confidence: number,
  decisionType: DecisionType
): RecommendationExplanation {
  const rupee = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const marginLabel = decisionType === "close_call" ? "close call" : "clear winner";
  const summary = runner
    ? `${winner.name} leads with score ${winner.score} vs ${runner.name} at ${runner.score} (${marginLabel}, confidence ${(confidence * 100).toFixed(0)}%).`
    : `${winner.name} is the top match for your spend pattern (score ${winner.score}).`;

  const why: string[] = [
    `Monthly spend ${rupee(profile.monthlySpend)} with focus on ${profile.topCategories.join(", ")}.`,
    `Expected net reward about ${rupee(winner.netReward)} per year after annual fee (model estimate).`,
    `Category fit score ${winner.breakdown.categoryFit.toFixed(2)} and fee score ${winner.breakdown.feeScore.toFixed(2)} on a 0–1 scale.`,
  ];

  if (runner) {
    why.push(`${runner.name} stays close on score with net reward near ${rupee(runner.netReward)}.`);
  }

  const tradeoffs: string[] = [
    "Higher lounge or travel perks often trade off against higher annual fees—check fee sensitivity before applying.",
    "Category accelerators change with merchant rules; confirm latest bank T&Cs before choosing.",
  ];

  return { summary, why, tradeoffs };
}

/**
 * Node 8 — LLM narration only; JSON shape is validated and falls back if the model drifts.
 */
export async function generateExplanation(
  state: RecommendationGraphState
): Promise<Partial<RecommendationGraphState>> {
  const profile = state.userProfile;
  const top = state.topCards ?? [];
  const winner = top[0];
  const runner = top[1];
  const confidence = state.confidence ?? 0;
  const decisionType = state.decisionType ?? "clear_winner";

  if (!profile || !winner) {
    throw new Error("generateExplanation: missing `userProfile` or winner in `topCards`.");
  }

  if (areThirdPartyApisDisabled() || !isOpenAiConfigured()) {
    return {
      explanation: deterministicExplanation(profile, winner, runner, confidence, decisionType),
    };
  }

  const model = new ChatOpenAI({
    model: getOpenAiModel(),
    temperature: 0.25,
    modelKwargs: { response_format: { type: "json_object" } },
  });

  const system = `You write marketing-quality but accurate explanations for Indian credit-card shoppers.
You MUST NOT change ranks, scores, or pick a different winner. Use only the facts provided.
Output strict JSON with keys: summary (string), why (string array, 2-4 items), tradeoffs (string array, 2-3 items).
Use Indian English and the ₹ symbol for rupees. Be concise.`;

  const user = JSON.stringify(
    {
      userProfile: profile,
      winner: {
        name: winner.name,
        bank: winner.card.bank,
        score: winner.score,
        netReward: winner.netReward,
        annualFee: winner.card.annual_fee,
        breakdown: winner.breakdown,
      },
      runnerUp: runner
        ? {
            name: runner.name,
            bank: runner.card.bank,
            score: runner.score,
            netReward: runner.netReward,
            breakdown: runner.breakdown,
          }
        : null,
      confidence,
      decisionType,
    },
    null,
    2
  );

  try {
    const res = await model.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const text = aiMessageContentToString(res.content);
    const parsed = ExplanationSchema.safeParse(JSON.parse(text));
    if (parsed.success) {
      return { explanation: parsed.data };
    }
  } catch {
    // fall through
  }

  return {
    explanation: deterministicExplanation(profile, winner, runner, confidence, decisionType),
  };
}

function aiMessageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return JSON.stringify(content ?? "");
}
