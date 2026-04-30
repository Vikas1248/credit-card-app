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
- Stick to the single highest-priority opportunity in "topOpportunity" — one clear question only.

Reply as JSON only: {"question": string, "reasoningBrief": string}
reasoningBrief: max 220 chars, warm professional tone — why you're asking this now (no card names).`;

function deterministicQuestion(
  profile: CredGenieAdvisorProfile,
  top: OpportunitySignal | undefined,
  band: ConfidenceBand
): { question: string; reasoningBrief: string } {
  if (!top) {
    return {
      question:
        "Roughly how much hits your cards in a typical month across shopping, bills, travel, and dining combined?",
      reasoningBrief:
        band === "foundational"
          ? "Monthly spend anchors realistic reward estimates."
          : "A quick spend check keeps optimization honest.",
    };
  }

  switch (top.kind) {
    case "monthly_spend":
      return {
        question:
          "What’s a realistic monthly figure for everything you put on cards — groceries, bills, travel, dining?",
        reasoningBrief: "Reward math scales directly with monthly spend.",
      };
    case "category_mix":
      return {
        question:
          "Among shopping, dining out or delivery, travel, and fuel — which two are biggest for you, and would you call each low, medium, or high?",
        reasoningBrief: "Category mix drives which accelerated earn rates matter.",
      };
    case "reward_format":
      return {
        question:
          "Do you prefer straight cashback, travel points/miles you can redeem for flights/hotels, or a balanced mix?",
        reasoningBrief: "Reward format decides whether to bias everyday cashback vs travel upside.",
      };
    case "fee_tolerance":
      return {
        question:
          "Are you strictly low- or no-fee cards, okay with mid fees for perks, or open to premium fees for lounges and upgrades?",
        reasoningBrief: "Fee appetite unlocks lounge-heavy vs lifetime-free angles.",
      };
    case "telecom_spend_depth":
      return {
        question:
          "Roughly what share of your monthly spend goes to telecom — broadband, postpaid family plans, or prepaid top-ups?",
        reasoningBrief: "Strong telecom spend makes ecosystem-specific cards worth weighing.",
      };
    case "travel_type":
      return {
        question:
          "Is most of your flying domestic within India, international, or fairly mixed?",
        reasoningBrief: "Domestic vs international travel shifts lounge and forex benefits.",
      };
    case "travel_frequency":
      return {
        question:
          "How often are you flying or booking hotels — rarely, a few trips a year, or almost every month?",
        reasoningBrief: "Travel cadence decides how hard to push miles and lounge perks.",
      };
    case "lounge_priority":
      return {
        question:
          "If you paid a higher annual fee, would airport lounge access be a must-have, nice-to-have, or not important?",
        reasoningBrief: "Lounge priority separates premium travel cards from lean cashback picks.",
      };
    case "merchant_ecosystem":
      return {
        question:
          "For online spends, do you lean Amazon, Flipkart, both equally, or mostly hyperlocal apps?",
        reasoningBrief: "Merchant ecosystems unlock category-specific cashback stacks.",
      };
    default:
      return {
        question:
          "Tell me the single spend bucket that would upset you most if a card rewarded it poorly.",
        reasoningBrief: "Pinpointing one weak spot avoids mismatched picks.",
      };
  }
}

export async function generateDynamicNextQuestion(opts: {
  profile: CredGenieAdvisorProfile;
  opportunities: OpportunitySignal[];
  confidenceBand: ConfidenceBand;
  userMessage: string;
  askedGapKinds?: AdvisorGapKind[];
}): Promise<{ question: string; reasoningBrief: string }> {
  const top = opts.opportunities[0];
  const fallback = deterministicQuestion(opts.profile, top, opts.confidenceBand);

  if (areThirdPartyApisDisabled() || !isOpenAiConfigured()) {
    return fallback;
  }

  try {
    const payload = JSON.stringify(
      {
        partialProfile: opts.profile,
        topOpportunity: top ?? null,
        confidenceBand: opts.confidenceBand,
        userLastMessage: opts.userMessage,
        alreadyAskedGapTopics: opts.askedGapKinds ?? [],
      },
      null,
      0
    );

    const raw = await openAiJsonCompletion(
      SYSTEM,
      `Context JSON:\n${payload}\n\nProduce the single best next question.`,
      0.35
    );

    const o = raw as Record<string, unknown>;
    const question = typeof o.question === "string" ? o.question.trim() : "";
    const reasoningBrief =
      typeof o.reasoningBrief === "string" ? o.reasoningBrief.trim().slice(0, 280) : "";

    if (
      question.length > 12 &&
      question.length < 320 &&
      !/\b(rank|best card|top \d|recommend)\b/i.test(question)
    ) {
      return {
        question,
        reasoningBrief: reasoningBrief || fallback.reasoningBrief,
      };
    }
  } catch {
    /* use fallback */
  }

  return fallback;
}
