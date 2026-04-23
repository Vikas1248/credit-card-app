import { isOpenAiConfigured, openAiJsonCompletion } from "@/lib/ai/openaiClient";
import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";
import type { AdvisorProfile } from "./types";
import { extractIntentViaLangflow, normalizeAdvisorIntent } from "./langflowClient";

function hasIntensifier(text: string): boolean {
  return /\b(very|mostly|frequent|frequently|often|a lot|high|heavy|regularly)\b/.test(text);
}

function fallbackIntentFromText(message: string): Partial<AdvisorProfile> {
  const t = message.toLowerCase();
  const out: Partial<AdvisorProfile> = {};

  if (/\b(swiggy|zomato|restaurant|dining|food delivery|eating out)\b/.test(t)) {
    out.dining = hasIntensifier(t) ? "high" : "medium";
  }
  if (/\b(travel|flight|flights|hotel|trip|airport|lounge)\b/.test(t)) {
    out.travel = hasIntensifier(t) ? "high" : "medium";
  }
  if (/\b(shopping|amazon|flipkart|myntra|online shopping)\b/.test(t)) {
    out.shopping = hasIntensifier(t) ? "high" : "medium";
  }
  if (/\b(fuel|petrol|diesel)\b/.test(t)) {
    out.fuel = hasIntensifier(t) ? "high" : "medium";
  }
  if (/\b(no fee|lifetime free|free card|low fee|avoid fee|no annual fee)\b/.test(t)) {
    out.fees = "low";
  } else if (/\b(premium|higher fee|high fee)\b/.test(t)) {
    out.fees = "high";
  }

  if (/\b(cashback|cash back)\b/.test(t)) {
    out.preferred_rewards = "cashback";
  } else if (/\b(travel rewards|miles|points|air miles)\b/.test(t)) {
    out.preferred_rewards = "travel";
  } else if (/\b(mix|balanced|both)\b/.test(t)) {
    out.preferred_rewards = "mixed";
  }

  return out;
}

export async function extractAdvisorIntent(message: string): Promise<Partial<AdvisorProfile>> {
  if (areThirdPartyApisDisabled()) {
    console.log("intent_source:", "keyword");
    console.log("langflow_success:", false);
    console.log("fallback_triggered:", "external_apis_disabled");
    return fallbackIntentFromText(message);
  }

  // Primary extractor: Langflow service.
  try {
    const langflowParsed = await extractIntentViaLangflow(message);
    if (Object.keys(langflowParsed).length > 0) {
      console.log("intent_source:", "langflow");
      console.log("langflow_success:", true);
      console.log("fallback_triggered:", "none");
      return langflowParsed;
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : "langflow_unknown_error";
    console.log("langflow_success:", false);
    console.log("fallback_triggered:", `langflow:${reason}`);
  }

  // Secondary fallback: existing OpenAI intent extraction.
  if (isOpenAiConfigured()) {
    try {
      const raw = await openAiJsonCompletion(
        "Extract structured credit card preferences from user input.\n\nReturn JSON:\n{\n  \"dining\": \"low\"|\"medium\"|\"high\"|null,\n  \"travel\": \"low\"|\"medium\"|\"high\"|null,\n  \"shopping\": \"low\"|\"medium\"|\"high\"|null,\n  \"fuel\": \"low\"|\"medium\"|\"high\"|null,\n  \"fees\": \"low\"|\"medium\"|\"high\"|null,\n  \"preferred_rewards\": \"cashback\"|\"travel\"|\"mixed\"|null\n}\n\nOnly extract what is clearly mentioned. Do not guess.",
        message,
        0
      );
      const parsed = normalizeAdvisorIntent(raw);
      if (Object.keys(parsed).length > 0) {
        console.log("intent_source:", "openai");
        console.log("langflow_success:", false);
        console.log("fallback_triggered:", "langflow_failed");
        return parsed;
      }
      console.log("fallback_triggered:", "openai_empty_intent");
    } catch (err) {
      const reason = err instanceof Error ? err.message : "openai_unknown_error";
      console.log("fallback_triggered:", `openai:${reason}`);
    }
  } else {
    console.log("fallback_triggered:", "openai_not_configured");
  }

  console.log("intent_source:", "keyword");
  console.log("langflow_success:", false);
  return fallbackIntentFromText(message);
}
