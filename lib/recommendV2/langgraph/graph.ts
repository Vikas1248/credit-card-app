/**
 * LangGraph wiring for CredGenie deterministic recommendations + LLM explanation.
 *
 * Plug into a Next.js route:
 * ```ts
 * const result = await getRecommendations({
 *   monthlySpend: 80000,
 *   categories: ["shopping", "dining"],
 *   candidatesOverride: rowsFromSupabase,
 * });
 * ```
 */

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import type { CardRowForScoring } from "@/lib/recommendV2/scoring";
import type { UserProfile } from "@/lib/recommendV2/userProfile";

import {
  alternativeDiscovery,
  computeConfidence,
  fetchCandidateCards,
  generateExplanation,
  normalizeUserInput,
  scoreCards,
  selectTopCards,
  validateTopCards,
  type RecommendationGraphState,
} from "./nodes";
import type {
  CategoryWeights,
  CredgenieRecommendationInput,
  CredgenieRecommendationResult,
  DecisionType,
  RecommendationExplanation,
  ScoredCard,
} from "./types";
import { toScoredCardSummary } from "./types";

const RecommendationState = Annotation.Root({
  userInput: Annotation<CredgenieRecommendationInput | undefined>(),
  categoryWeights: Annotation<CategoryWeights | undefined>(),
  userProfile: Annotation<UserProfile | undefined>(),
  candidates: Annotation<CardRowForScoring[] | undefined>(),
  scoredCards: Annotation<ScoredCard[] | undefined>(),
  topCards: Annotation<ScoredCard[] | undefined>(),
  decisionType: Annotation<DecisionType | undefined>(),
  confidence: Annotation<number | undefined>(),
  betterAlternative: Annotation<ScoredCard | undefined>(),
  explanation: Annotation<RecommendationExplanation | undefined>(),
});

let compiledGraph: ReturnType<typeof buildRecommendationGraphInternal> | null = null;

function buildRecommendationGraphInternal() {
  const graph = new StateGraph(RecommendationState)
    .addNode("normalizeUserInput", normalizeUserInput)
    .addNode("fetchCandidateCards", fetchCandidateCards)
    .addNode("scoreCards", scoreCards)
    .addNode("selectTopCards", selectTopCards)
    .addNode("validateTopCards", validateTopCards)
    .addNode("computeConfidence", computeConfidence)
    .addNode("alternativeDiscovery", alternativeDiscovery)
    .addNode("generateExplanation", generateExplanation)
    .addEdge(START, "normalizeUserInput")
    .addEdge("normalizeUserInput", "fetchCandidateCards")
    .addEdge("fetchCandidateCards", "scoreCards")
    .addEdge("scoreCards", "selectTopCards")
    .addEdge("selectTopCards", "validateTopCards")
    .addEdge("validateTopCards", "computeConfidence")
    .addEdge("computeConfidence", "alternativeDiscovery")
    .addEdge("alternativeDiscovery", "generateExplanation")
    .addEdge("generateExplanation", END);

  return graph.compile();
}

function getCompiledGraph() {
  if (!compiledGraph) compiledGraph = buildRecommendationGraphInternal();
  return compiledGraph;
}

function finalizeOrThrow(s: RecommendationGraphState): {
  topCards: ScoredCard[];
  decisionType: DecisionType;
  confidence: number;
  explanation: RecommendationExplanation;
} {
  if (!s.userProfile) throw new Error("Graph finished without `userProfile`.");
  if (!s.categoryWeights) throw new Error("Graph finished without `categoryWeights`.");
  if (!s.topCards?.length) throw new Error("Graph finished without ranked cards.");
  if (!s.decisionType) throw new Error("Graph finished without `decisionType`.");
  if (typeof s.confidence !== "number") throw new Error("Graph finished without `confidence`.");
  if (!s.explanation) throw new Error("Graph finished without `explanation`.");
  return {
    topCards: s.topCards,
    decisionType: s.decisionType,
    confidence: s.confidence,
    explanation: s.explanation,
  };
}

/**
 * Example entrypoint: run full LangGraph pipeline and return API-shaped JSON.
 * Ranking is fixed by `scoreCardWithDetails`; the LLM only narrates the outcome.
 */
export async function getRecommendations(
  userInput: CredgenieRecommendationInput
): Promise<CredgenieRecommendationResult> {
  const app = getCompiledGraph();
  const state = (await app.invoke({
    userInput,
  })) as RecommendationGraphState;

  const fin = finalizeOrThrow(state);

  const winner = fin.topCards[0];
  const runnerUp = fin.topCards[1] ?? null;

  const result: CredgenieRecommendationResult = {
    winner: toScoredCardSummary(winner),
    runnerUp: runnerUp ? toScoredCardSummary(runnerUp) : null,
    confidence: fin.confidence,
    decisionType: fin.decisionType,
    explanation: fin.explanation,
  };

  if (state.betterAlternative) {
    result.betterAlternative = toScoredCardSummary(state.betterAlternative);
  }

  return result;
}

/** Re-export for tests that need a fresh compile (e.g. after env mutation). */
export function __resetRecommendationGraphForTests() {
  compiledGraph = null;
}
