import { isOpenAiConfigured, openAiJsonCompletion } from "@/lib/ai/openaiClient";
import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";
import type { AdvisorLevel, AdvisorProfile, AdvisorRewardPreference } from "./types";

const VALID_LEVELS = ["low", "medium", "high"] as const;
const VALID_REWARDS = ["cashback", "travel", "mixed"] as const;

function isAdvisorLevel(value: string): value is AdvisorLevel {
  return (VALID_LEVELS as readonly string[]).includes(value);
}

function isAdvisorReward(value: string): value is AdvisorRewardPreference {
  return (VALID_REWARDS as readonly string[]).includes(value);
}

function sanitizeExtractedIntent(raw: unknown): Partial<AdvisorProfile> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<AdvisorProfile> = {};

  for (const key of ["dining", "travel", "shopping", "fuel", "fees"] as const) {
    const value = o[key];
    if (typeof value === "string" && isAdvisorLevel(value)) {
      out[key] = value;
    }
  }
  const reward = o.preferred_rewards;
  if (typeof reward === "string" && isAdvisorReward(reward)) {
    out.preferred_rewards = reward;
  }
  return out;
}

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
  if (areThirdPartyApisDisabled() || !isOpenAiConfigured()) {
    return fallbackIntentFromText(message);
  }

  try {
    const raw = await openAiJsonCompletion(
      "Extract structured credit card preferences from user input.\n\nReturn JSON:\n{\n  \"dining\": \"low\"|\"medium\"|\"high\"|null,\n  \"travel\": \"low\"|\"medium\"|\"high\"|null,\n  \"shopping\": \"low\"|\"medium\"|\"high\"|null,\n  \"fuel\": \"low\"|\"medium\"|\"high\"|null,\n  \"fees\": \"low\"|\"medium\"|\"high\"|null,\n  \"preferred_rewards\": \"cashback\"|\"travel\"|\"mixed\"|null\n}\n\nOnly extract what is clearly mentioned. Do not guess.",
      message,
      0
    );
    const parsed = sanitizeExtractedIntent(raw);
    if (Object.keys(parsed).length > 0) return parsed;
  } catch {
    // Fallback on parser errors or API failure.
  }

  return fallbackIntentFromText(message);
}
