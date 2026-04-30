/**
 * LangGraph orchestration for CredGenie conversational advisor.
 *
 * Nodes (implementation → logical names):
 * extractIntent → ExtractIntent · mergeProfile → MergeProfile · analyzeGaps → AnalyzeGaps ·
 * confidenceEvaluator → ConfidenceEvaluator · generateNextQuestion → GenerateNextQuestion ·
 * recommendCards → RecommendCards
 *
 * Ranking stays in `getTopRecommendationsForProfile` — this graph never sorts cards via LLM.
 */

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import type { RecommendedCard } from "@/lib/recommendV2/recommendCardsApiTypes";
import type { CardRowForScoring } from "@/lib/recommendV2/scoring";

import type {
  AdvisorConversationState,
  AdvisorGapKind,
  OpportunitySignal,
} from "./conversationState";
import type { CredGenieAdvisorProfile } from "./types";
import { mergeCredGenieAdvisorProfile, toRecommendUserProfile } from "./profile";
import { computeProfileConfidence, confidenceBandFromScore } from "./profileConfidence";
import { analyzeAdvisorOpportunities } from "./opportunityEngine";
import { generateDynamicNextQuestion } from "./dynamicQuestionGenerator";
import { extractCredGenieProfile } from "./extractProfile";
import { getTopRecommendationsForProfile } from "./recommend";

const AdvisorState = Annotation.Root({
  userMessage: Annotation<string>(),
  priorProfile: Annotation<CredGenieAdvisorProfile>(),
  extracted: Annotation<Partial<CredGenieAdvisorProfile> | undefined>(),
  mergedProfile: Annotation<CredGenieAdvisorProfile>(),
  gaps: Annotation<AdvisorGapKind[]>(),
  opportunities: Annotation<OpportunitySignal[]>(),
  confidenceScore: Annotation<number>(),
  confidenceBand: Annotation<AdvisorConversationState["confidenceBand"]>(),
  nextQuestion: Annotation<string | null>(),
  reasoningBrief: Annotation<string | undefined>(),
  recommendations: Annotation<RecommendedCard[] | undefined>(),
  assistantSummary: Annotation<string | undefined>(),
  candidates: Annotation<CardRowForScoring[] | undefined>(),
});

type AdvisorGraphState = typeof AdvisorState.State;

async function extractIntentNode(state: AdvisorGraphState): Promise<Partial<AdvisorGraphState>> {
  const extracted = await extractCredGenieProfile(state.userMessage);
  return { extracted };
}

async function mergeProfileNode(state: AdvisorGraphState): Promise<Partial<AdvisorGraphState>> {
  const mergedProfile = mergeCredGenieAdvisorProfile(state.priorProfile, state.extracted ?? {});
  return { mergedProfile };
}

async function analyzeGapsNode(state: AdvisorGraphState): Promise<Partial<AdvisorGraphState>> {
  const { gaps, opportunities } = analyzeAdvisorOpportunities(state.mergedProfile);
  return { gaps, opportunities };
}

async function confidenceEvaluatorNode(
  state: AdvisorGraphState
): Promise<Partial<AdvisorGraphState>> {
  const confidenceScore = computeProfileConfidence(state.mergedProfile);
  const confidenceBand = confidenceBandFromScore(confidenceScore);
  return { confidenceScore, confidenceBand };
}

function routeRecommendVsQuestion(state: AdvisorGraphState): "recommendCards" | "generateNextQuestion" {
  const m = state.mergedProfile;
  const spendOk = typeof m.monthlySpend === "number" && m.monthlySpend >= 5000;
  const cats = [m.shopping, m.dining, m.travel, m.fuel].filter(Boolean).length;
  if (
    state.confidenceScore >= 0.85 &&
    spendOk &&
    cats >= 2 &&
    Boolean(m.preferred_rewards) &&
    Boolean(m.fees)
  ) {
    return "recommendCards";
  }
  return "generateNextQuestion";
}

async function generateNextQuestionNode(
  state: AdvisorGraphState
): Promise<Partial<AdvisorGraphState>> {
  const { question, reasoningBrief } = await generateDynamicNextQuestion({
    profile: state.mergedProfile,
    opportunities: state.opportunities,
    confidenceBand: state.confidenceBand,
    userMessage: state.userMessage,
  });
  return {
    nextQuestion: question,
    reasoningBrief,
    assistantSummary: reasoningBrief,
    recommendations: undefined,
  };
}

async function recommendCardsNode(state: AdvisorGraphState): Promise<Partial<AdvisorGraphState>> {
  const cards = state.candidates ?? [];
  if (cards.length === 0) {
    return {
      recommendations: [],
      nextQuestion: null,
      reasoningBrief:
        "Card catalog is temporarily unavailable — please try again shortly.",
    };
  }
  const recommendations = await getTopRecommendationsForProfile(
    cards,
    toRecommendUserProfile(state.mergedProfile)
  );
  return {
    recommendations,
    nextQuestion: null,
    reasoningBrief:
      "Selections use CredGenie's deterministic scoring — explanations may use AI wording only.",
    assistantSummary: `Confidence is strong (${Math.round(state.confidenceScore * 100)}%) — here are three optimized picks.`,
  };
}

let compiled: ReturnType<typeof buildAdvisorGraph> | null = null;

function buildAdvisorGraph() {
  const graph = new StateGraph(AdvisorState)
    .addNode("extractIntent", extractIntentNode)
    .addNode("mergeProfile", mergeProfileNode)
    .addNode("analyzeGaps", analyzeGapsNode)
    .addNode("confidenceEvaluator", confidenceEvaluatorNode)
    .addNode("generateNextQuestion", generateNextQuestionNode)
    .addNode("recommendCards", recommendCardsNode)
    .addEdge(START, "extractIntent")
    .addEdge("extractIntent", "mergeProfile")
    .addEdge("mergeProfile", "analyzeGaps")
    .addEdge("analyzeGaps", "confidenceEvaluator")
    .addConditionalEdges("confidenceEvaluator", routeRecommendVsQuestion, {
      recommendCards: "recommendCards",
      generateNextQuestion: "generateNextQuestion",
    })
    .addEdge("generateNextQuestion", END)
    .addEdge("recommendCards", END);

  return graph.compile();
}

function getCompiledAdvisorGraph() {
  if (!compiled) compiled = buildAdvisorGraph();
  return compiled;
}

export async function runAdvisorConversationTurn(input: {
  userMessage: string;
  priorProfile: CredGenieAdvisorProfile;
  candidates: CardRowForScoring[];
}): Promise<AdvisorConversationState> {
  const app = getCompiledAdvisorGraph();
  const result = (await app.invoke({
    userMessage: input.userMessage,
    priorProfile: input.priorProfile,
    extracted: undefined,
    mergedProfile: input.priorProfile,
    gaps: [],
    opportunities: [],
    confidenceScore: 0,
    confidenceBand: "foundational",
    nextQuestion: null,
    reasoningBrief: undefined,
    recommendations: undefined,
    assistantSummary: undefined,
    candidates: input.candidates,
  })) as AdvisorGraphState;

  return {
    userMessage: result.userMessage,
    priorProfile: result.priorProfile,
    extracted: result.extracted,
    mergedProfile: result.mergedProfile,
    gaps: result.gaps,
    opportunities: result.opportunities,
    confidenceScore: result.confidenceScore,
    confidenceBand: result.confidenceBand,
    nextQuestion: result.nextQuestion,
    reasoningBrief: result.reasoningBrief,
    recommendations: result.recommendations,
    assistantSummary: result.assistantSummary,
    candidates: result.candidates,
  };
}

export function __resetAdvisorGraphForTests() {
  compiled = null;
}
