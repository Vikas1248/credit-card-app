import { isOpenAiConfigured, openAiJsonCompletion } from "@/lib/ai/openaiClient";
import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";
import type { CredGenieAdvisorProfile } from "./types";
import type { ConfidenceBand } from "./profileConfidence";
import type { OpportunitySignal, AdvisorGapKind } from "./conversationState";

const SYSTEM = `You are CredGenie AI, a highly intelligent Indian credit card advisor.
Your purpose is to maximize user rewards, savings, and benefits.

Rules:
- Ask only ONE best next question (single sentence).
- Avoid static questionnaires; tailor to the user's partial profile.
- Prioritize highest financial optimization impact.
- Detect ecosystem opportunities (Airtel/Jio telecom, Amazon/Flipkart/Swiggy, travel, fuel, premium perks).
- Be concise, premium, and trustworthy.
- Never rank or name specific cards — scoring is handled elsewhere.
- If "alreadyAskedGapTopics" lists a topic id, do not ask a similar question again for that session (especially travel cadence, fuel/commute, or combined travel+fuel wording).
- Do not repeat shopping-vs-dining allocation vs telecom bill framing if those topics appear in alreadyAskedGapTopics — pick the next unused gap instead.
- Stick to the single highest-priority opportunity in "topOpportunity" — one clear question only.
- CRITICAL: Unless topOpportunity.kind is exactly "lounge_priority", do NOT ask about airport lounges, Priority Pass, lounge visits, or complimentary lounge access. For travel_type or travel_frequency, ask only about domestic/international split or how often they travel — no lounge wording.
- gapKind MUST be exactly one string from candidateGapKinds (the gap your question addresses). Usually match topOpportunity.kind; if you legitimately satisfy a different listed gap, use that gap’s id.

Reply as JSON only: {"question": string, "reasoningBrief": string, "gapKind": string}
reasoningBrief: max 220 chars, warm professional tone — why you're asking this now (no card names).`;

export type GeneratedAdvisorQuestion = {
  question: string;
  reasoningBrief: string;
  /** Which opportunity gap this turn’s question satisfies (for session dedupe). */
  recordedGapKind: AdvisorGapKind | undefined;
};

function deterministicQuestion(
  top: OpportunitySignal | undefined,
  band: ConfidenceBand
): GeneratedAdvisorQuestion {
  if (!top) {
    return {
      question:
        "Roughly how much hits your cards in a typical month across shopping, bills, travel, and dining combined?",
      reasoningBrief:
        band === "foundational"
          ? "Monthly spend anchors realistic reward estimates."
          : "A quick spend check keeps optimization honest.",
      recordedGapKind: undefined,
    };
  }

  const recordedGapKind = top.kind;

  switch (top.kind) {
    case "monthly_spend":
      return {
        question:
          "What’s a realistic monthly figure for everything you put on cards — groceries, bills, travel, dining?",
        reasoningBrief: "Reward math scales directly with monthly spend.",
        recordedGapKind,
      };
    case "category_mix":
      return {
        question:
          "Among shopping, dining out or delivery, travel, and fuel — which two are biggest for you, and would you call each low, medium, or high?",
        reasoningBrief: "Category mix drives which accelerated earn rates matter.",
        recordedGapKind,
      };
    case "reward_format":
      return {
        question:
          "Do you prefer straight cashback, travel points/miles you can redeem for flights/hotels, or a balanced mix?",
        reasoningBrief: "Reward format decides whether to bias everyday cashback vs travel upside.",
        recordedGapKind,
      };
    case "fee_tolerance":
      return {
        question:
          "Are you strictly low- or no-fee cards, okay with mid fees for perks, or open to premium fees for lounges and upgrades?",
        reasoningBrief: "Fee appetite separates premium perk cards from lean, low-fee picks.",
        recordedGapKind,
      };
    case "telecom_spend_depth":
      return {
        question:
          "Roughly what share of your monthly spend goes to telecom — broadband, postpaid family plans, or prepaid top-ups?",
        reasoningBrief: "Strong telecom spend makes ecosystem-specific cards worth weighing.",
        recordedGapKind,
      };
    case "travel_type":
      return {
        question:
          "Is most of your flying domestic within India, international, or fairly mixed?",
        reasoningBrief: "Domestic vs international travel shifts forex rules and airline tie-ups.",
        recordedGapKind,
      };
    case "travel_frequency":
      return {
        question:
          "How often are you flying or booking hotels — rarely, a few trips a year, or almost every month?",
        reasoningBrief: "Travel cadence decides how much mileage and annual-fee travel products matter.",
        recordedGapKind,
      };
    case "lounge_priority":
      return {
        question:
          "If you paid a higher annual fee, would airport lounge access be a must-have, nice-to-have, or not important?",
        reasoningBrief: "Lounge priority separates premium travel cards from lean cashback picks.",
        recordedGapKind,
      };
    case "merchant_ecosystem":
      return {
        question:
          "For online spends, do you lean Amazon, Flipkart, both equally, or mostly hyperlocal apps?",
        reasoningBrief: "Merchant ecosystems unlock category-specific cashback stacks.",
        recordedGapKind,
      };
    default:
      return {
        question:
          "Tell me the single spend bucket that would upset you most if a card rewarded it poorly.",
        reasoningBrief: "Pinpointing one weak spot avoids mismatched picks.",
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
    return fallback;
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
      `Context JSON:\n${payload}\n\nProduce the single best next question. gapKind must be one of candidateGapKinds.`,
      0.35
    );

    const o = raw as Record<string, unknown>;
    const question = typeof o.question === "string" ? o.question.trim() : "";
    const reasoningBrief =
      typeof o.reasoningBrief === "string" ? o.reasoningBrief.trim().slice(0, 280) : "";
    const parsedGk = parseRecordedGapKind(o.gapKind, candidateGapKinds, undefined);
    const recordedGapKind = alignRecordedGapKindFromQuestion(
      question,
      candidateGapKinds,
      parsedGk,
      top?.kind
    );

    if (
      question.length > 12 &&
      question.length < 320 &&
      !/\b(rank|best card|top \d|recommend)\b/i.test(question)
    ) {
      return {
        question,
        reasoningBrief: reasoningBrief || fallback.reasoningBrief,
        recordedGapKind: recordedGapKind ?? fallback.recordedGapKind,
      };
    }
  } catch {
    /* use fallback */
  }

  return fallback;
}
