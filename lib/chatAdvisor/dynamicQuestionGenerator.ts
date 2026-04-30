import { isOpenAiConfigured, openAiJsonCompletion } from "@/lib/ai/openaiClient";
import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";
import type { CredGenieAdvisorProfile } from "./types";
import type { ConfidenceBand } from "./profileConfidence";
import type { OpportunitySignal, AdvisorGapKind } from "./conversationState";

/** Keeps UI tight; LLM answers above this are trimmed or rejected after clamping. */
const MAX_QUESTION_CHARS = 118;
const MAX_REASONING_CHARS = 88;

const SYSTEM = `You are CredGenie AI, an Indian credit-card advisor optimizing rewards.

Voice: premium, trustworthy, ultra-brief — chat-length lines, not paragraphs.

Question rules:
- ONE short question only — ideally under ~14 words and under ${MAX_QUESTION_CHARS} characters.
- Dynamic: weave in ONE concrete cue from partialProfile when natural (city tier, telecom eco, rough bands already stated — don't invent facts).
- No preamble or framing ("Understanding...", "To help tailor...", "I'd love to know..."). Start directly with the question.
- Never rank or name specific cards.

Logic:
- Prioritize topOpportunity; gapKind MUST be exactly one string from candidateGapKinds (usually topOpportunity.kind).
- Respect alreadyAskedGapTopics — don't repeat the same angle (travel cadence, fuel commute, shopping-vs-telecom %).
- CRITICAL: Unless topOpportunity.kind is exactly "lounge_priority", never ask about lounges, Priority Pass, or complimentary lounge access.

reasoningBrief: single short clause, max ${MAX_REASONING_CHARS} characters — why this gap matters now (no card names).
- reasoningBrief must NOT be preamble copy (“Understanding … can enhance …”). Start as a fragment (“Dining cadence drives cashback boosts.”).

Reply as JSON only: {"question": string, "reasoningBrief": string, "gapKind": string}`;

export type GeneratedAdvisorQuestion = {
  question: string;
  reasoningBrief: string;
  /** Which opportunity gap this turn’s question satisfies (for session dedupe). */
  recordedGapKind: AdvisorGapKind | undefined;
};

/** Prefer first sentence or word-boundary trim so long model outputs still ship briefly. */
function clampQuestionToBrief(raw: string, maxChars: number): string {
  const q = raw.trim().replace(/\s+/g, " ");
  if (q.length <= maxChars) return q;

  const sentences = q.split(/(?<=[.!?])\s+/).filter(Boolean);
  const first = sentences[0] ?? q;
  if (first.length <= maxChars && first.length >= 14) return first;

  let cut = q.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.55) cut = cut.slice(0, lastSpace);
  cut = cut.replace(/[,;:–—]\s*$/u, "").trim();
  return cut.length >= 14 ? cut : q.slice(0, maxChars).trim();
}

function clampReasoningBrief(raw: string, maxChars: number): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, maxChars).replace(/\s*[,;:–—.]$/u, "").trim();
}

/** Strip LLM preamble drift before UI merges reasoning + question. */
function sanitizeReasoningBrief(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ");
  s = s.replace(/^understanding\s+[^.!?]+[.!?]\s*/i, "").trim();
  s = s.replace(/^to\s+(better|help|enhance|optimize|tailor)\s+[^.!?]+[.!?]\s*/i, "").trim();
  return s;
}

function finalizeReasoningBrief(raw: string): string {
  return clampReasoningBrief(sanitizeReasoningBrief(raw), MAX_REASONING_CHARS);
}

function finalizeGeneratedQuestion(gen: GeneratedAdvisorQuestion): GeneratedAdvisorQuestion {
  return {
    ...gen,
    reasoningBrief: finalizeReasoningBrief(gen.reasoningBrief),
  };
}

function deterministicQuestion(
  top: OpportunitySignal | undefined,
  band: ConfidenceBand
): GeneratedAdvisorQuestion {
  if (!top) {
    return {
      question: "Ballpark monthly spend on your cards overall?",
      reasoningBrief:
        band === "foundational"
          ? "Spend anchors reward sizing."
          : "Quick spend check keeps picks realistic.",
      recordedGapKind: undefined,
    };
  }

  const recordedGapKind = top.kind;

  switch (top.kind) {
    case "monthly_spend":
      return {
        question: "Rough total monthly spend on cards (₹ ballpark)?",
        reasoningBrief: "Rewards scale with spend.",
        recordedGapKind,
      };
    case "category_mix":
      return {
        question:
          "Top two among shopping, dining, travel, fuel — say low / medium / high each?",
        reasoningBrief: "Category mix picks accelerated earn lanes.",
        recordedGapKind,
      };
    case "reward_format":
      return {
        question: "Prefer cashback, travel points, or a mix?",
        reasoningBrief: "Format steers cashback vs miles-heavy cards.",
        recordedGapKind,
      };
    case "fee_tolerance":
      return {
        question: "Strictly no annual fee, okay with mid fees, or premium with perks?",
        reasoningBrief: "Fee appetite gates lounge-heavy vs free-card picks.",
        recordedGapKind,
      };
    case "telecom_spend_depth":
      return {
        question: "Rough share of monthly spend on telecom — broadband / family plans / recharge?",
        reasoningBrief: "Heavy telecom favors eco-specific cards.",
        recordedGapKind,
      };
    case "travel_type":
      return {
        question: "Flights mostly domestic, international, or mixed?",
        reasoningBrief: "Domestic vs int’l shifts forex and airline tie-ups.",
        recordedGapKind,
      };
    case "travel_frequency":
      return {
        question: "Travel rarely, a few trips a year, or almost monthly?",
        reasoningBrief: "Cadence drives miles vs simple cashback bias.",
        recordedGapKind,
      };
    case "lounge_priority":
      return {
        question: "Lounges — must-have, nice-to-have, or skip?",
        reasoningBrief: "Separates premium travel cards from lean picks.",
        recordedGapKind,
      };
    case "merchant_ecosystem":
      return {
        question: "Online spend lean Amazon, Flipkart, split, or hyperlocal apps?",
        reasoningBrief: "Merchant tilt unlocks stacked cashback routes.",
        recordedGapKind,
      };
    default:
      return {
        question: "Which spend bucket hurts most if rewards are weak?",
        reasoningBrief: "One anchor avoids mismatched picks.",
        recordedGapKind,
      };
  }
}

function parseRecordedGapKind(
  raw: unknown,
  candidates: AdvisorGapKind[],
  fallback: AdvisorGapKind | undefined
): AdvisorGapKind | undefined {
  if (typeof raw !== "string") return fallback;
  const k = raw.trim() as AdvisorGapKind;
  return candidates.includes(k) ? k : fallback;
}

/** If the model asks a lounge-specific question while top gap was something else, still record lounge_priority for dedupe. */
function alignRecordedGapKindFromQuestion(
  question: string,
  candidates: AdvisorGapKind[],
  parsedGapKind: AdvisorGapKind | undefined,
  topKind: AdvisorGapKind | undefined
): AdvisorGapKind | undefined {
  const resolved = parsedGapKind ?? topKind;
  if (resolved === "fee_tolerance") return resolved;

  const q = question.toLowerCase();
  const mentionsLounges = /\b(lounges?\b|airport lounges?\b|priority pass)\b/.test(q);
  const cadenceLounges = /\bhow often\b/.test(q) && mentionsLounges;
  const domesticLounges =
    mentionsLounges &&
    /\b(domestic travel|domestic travels|complimentary access|visits per year|maximize your travel experience)\b/.test(q);

  if ((cadenceLounges || domesticLounges) && candidates.includes("lounge_priority")) {
    return "lounge_priority";
  }

  const diningFreqCue =
    /\b(how often|how many times|monthly|per month)\b/i.test(q) ||
    /\btimes\b[\s\S]{0,48}\b(month|week)\b/i.test(q);
  const asksCategoryDiningCadence =
    candidates.includes("category_mix") &&
    /\b(dine|dining|food delivery|restaurants?|swiggy|zomato|eat out|eating out|order food)\b/i.test(q) &&
    diningFreqCue;

  if (asksCategoryDiningCadence) return "category_mix";

  return resolved;
}

export async function generateDynamicNextQuestion(opts: {
  profile: CredGenieAdvisorProfile;
  opportunities: OpportunitySignal[];
  confidenceBand: ConfidenceBand;
  userMessage: string;
  askedGapKinds?: AdvisorGapKind[];
}): Promise<GeneratedAdvisorQuestion> {
  const top = opts.opportunities[0];
  const fallback = deterministicQuestion(top, opts.confidenceBand);
  const candidateGapKinds = opts.opportunities.slice(0, 8).map((o) => o.kind);

  if (areThirdPartyApisDisabled() || !isOpenAiConfigured()) {
    return finalizeGeneratedQuestion(fallback);
  }

  try {
    const payload = JSON.stringify(
      {
        partialProfile: opts.profile,
        topOpportunity: top ?? null,
        candidateGapKinds,
        confidenceBand: opts.confidenceBand,
        userLastMessage: opts.userMessage,
        alreadyAskedGapTopics: opts.askedGapKinds ?? [],
      },
      null,
      0
    );

    const raw = await openAiJsonCompletion(
      SYSTEM,
      `Context JSON:\n${payload}\n\nOne brief question + short reasoningBrief. gapKind ∈ candidateGapKinds.`,
      0.28
    );

    const o = raw as Record<string, unknown>;
    const rawQuestion = typeof o.question === "string" ? o.question.trim() : "";
    const question = clampQuestionToBrief(rawQuestion, MAX_QUESTION_CHARS);
    const reasoningBrief =
      typeof o.reasoningBrief === "string"
        ? clampReasoningBrief(o.reasoningBrief, MAX_REASONING_CHARS)
        : "";
    const parsedGk = parseRecordedGapKind(o.gapKind, candidateGapKinds, undefined);
    const recordedGapKind = alignRecordedGapKindFromQuestion(
      question,
      candidateGapKinds,
      parsedGk,
      top?.kind
    );

    if (
      question.length >= 14 &&
      question.length <= MAX_QUESTION_CHARS &&
      !/\b(rank|best card|top \d|recommend)\b/i.test(question)
    ) {
      return finalizeGeneratedQuestion({
        question,
        reasoningBrief: reasoningBrief || fallback.reasoningBrief,
        recordedGapKind: recordedGapKind ?? fallback.recordedGapKind,
      });
    }
  } catch {
    /* use fallback */
  }

  return finalizeGeneratedQuestion(fallback);
}
