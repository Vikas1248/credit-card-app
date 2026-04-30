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
import {
  dedupeShoppingDiningTelecomOpportunities,
  filterOpportunitiesAfterAsked,
  nextAskedGapKindsAfterQuestion,
} from "./opportunityDedup";
import { generateDynamicNextQuestion } from "./dynamicQuestionGenerator";
import { extractCredGenieProfile } from "./extractProfile";
import { getTopRecommendationsForProfile } from "./recommend";

const AdvisorState = Annotation.Root({
  userMessage: Annotation<string>(),
  /** Prior assistant question — helps interpret terse replies (e.g. cadence-only answers). */
  precedingAssistantQuestion: Annotation<string | undefined>(),
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
  askedGapKinds: Annotation<AdvisorGapKind[]>(),
});

type AdvisorGraphState = typeof AdvisorState.State;

async function extractIntentNode(state: AdvisorGraphState): Promise<Partial<AdvisorGraphState>> {
  const extracted = await extractCredGenieProfile(state.userMessage, {
    precedingAssistantQuestion: state.precedingAssistantQuestion,
  });
  return { extracted };
}

async function mergeProfileNode(state: AdvisorGraphState): Promise<Partial<AdvisorGraphState>> {
  const mergedProfile = mergeCredGenieAdvisorProfile(state.priorProfile, state.extracted ?? {});
  return { mergedProfile };
}

async function analyzeGapsNode(state: AdvisorGraphState): Promise<Partial<AdvisorGraphState>> {
  const { opportunities: rawOpsFromEngine } = analyzeAdvisorOpportunities(state.mergedProfile);
  const rawOps = rawOpsFromEngine.filter(
    (o) =>
      !(
        o.kind === "telecom_spend_depth" &&
        state.askedGapKinds.includes("telecom_spend_depth")
      )
  );
  const opportunities = dedupeShoppingDiningTelecomOpportunities(
    rawOps,
    state.mergedProfile,
    state.askedGapKinds
  );
  const gaps = [...new Set(opportunities.map((o) => o.kind))];
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
  /** Align with profileConfidence: minimal core (1 lane + spend + rewards + fees) crosses this. */
  if (
    state.confidenceScore >= 0.8 &&
    spendOk &&
    cats >= 1 &&
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
  const filtered = filterOpportunitiesAfterAsked(
    state.opportunities,
    state.askedGapKinds,
    state.mergedProfile
  );

  if (filtered.length === 0 && state.opportunities.length > 0) {
    return {
      nextQuestion: "Anything major still missing — groceries, bills, or online shopping?",
      reasoningBrief: "Covering gaps without repeating topics.",
      assistantSummary: "Covering gaps without repeating topics.",
      recommendations: undefined,
      askedGapKinds: state.askedGapKinds,
    };
  }

  const topKind = filtered[0]?.kind;
  const { question, reasoningBrief, recordedGapKind } = await generateDynamicNextQuestion({
    profile: state.mergedProfile,
    opportunities: filtered,
    confidenceBand: state.confidenceBand,
    userMessage: state.userMessage,
    askedGapKinds: state.askedGapKinds,
  });

  const askedGapKinds = nextAskedGapKindsAfterQuestion(
    state.askedGapKinds,
    recordedGapKind ?? topKind
  );

  return {
    nextQuestion: question,
    reasoningBrief,
    assistantSummary: reasoningBrief,
    recommendations: undefined,
    askedGapKinds,
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
  priorAskedGapKinds?: AdvisorGapKind[];
  precedingAssistantQuestion?: string | null;
}): Promise<AdvisorConversationState> {
  const app = getCompiledAdvisorGraph();
  const askedGapKinds = input.priorAskedGapKinds ?? [];
  const priorQ =
    typeof input.precedingAssistantQuestion === "string"
      ? input.precedingAssistantQuestion.trim().slice(0, 600)
      : undefined;
  const result = (await app.invoke({
    userMessage: input.userMessage,
    precedingAssistantQuestion: priorQ,
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
    askedGapKinds,
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
    askedGapKinds: result.askedGapKinds,
  };
}

export function __resetAdvisorGraphForTests() {
  compiled = null;
}
