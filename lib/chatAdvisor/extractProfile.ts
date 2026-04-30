import { isOpenAiConfigured, openAiJsonCompletion } from "@/lib/ai/openaiClient";
import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";
import type {
  AdvisorLevel,
  AdvisorRewardPreference,
  CredGenieAdvisorProfile,
  LoungePriority,
  TelecomEcosystem,
  TravelFrequency,
  TravelType,
} from "./types";
import { extractIntentViaLangflow, normalizeAdvisorIntent } from "./langflowClient";

const LEVELS = new Set(["low", "medium", "high"]);

function pickLevel(v: unknown): AdvisorLevel | undefined {
  if (typeof v !== "string") return undefined;
  const n = v.trim().toLowerCase();
  return LEVELS.has(n) ? (n as AdvisorLevel) : undefined;
}

function pickReward(v: unknown): AdvisorRewardPreference | undefined {
  if (typeof v !== "string") return undefined;
  const n = v.trim().toLowerCase();
  if (n === "cashback" || n === "cash back") return "cashback";
  if (n === "travel" || n === "miles" || n === "points") return "travel";
  if (n === "mixed" || n === "balanced" || n === "both") return "mixed";
  return undefined;
}

function pickTelecom(v: unknown): TelecomEcosystem | undefined {
  if (typeof v !== "string") return undefined;
  const n = v.trim().toLowerCase();
  if (n.includes("airtel")) return "airtel";
  if (n.includes("jio")) return "jio";
  if (n.includes("vodafone") || n.includes("vi ") || n === "vi") return "vi";
  if (n === "none" || n === "no") return "none";
  return undefined;
}

function pickTravelFreq(v: unknown): TravelFrequency | undefined {
  if (typeof v !== "string") return undefined;
  const n = v.trim().toLowerCase();
  if (/\b(rare|hardly|almost never)\b/.test(n)) return "rarely";
  if (/\b(frequent|often|every month|weekly)\b/.test(n)) return "frequent";
  if (/\b(sometimes|few times|occasionally)\b/.test(n)) return "occasionally";
  if (n === "rarely" || n === "occasionally" || n === "frequent") return n as TravelFrequency;
  return undefined;
}

function pickTravelType(v: unknown): TravelType | undefined {
  if (typeof v !== "string") return undefined;
  const n = v.trim().toLowerCase();
  if (n.includes("both") || n.includes("mixed")) return "both";
  if (n.includes("international") || n.includes("overseas")) return "international";
  if (n.includes("domestic") || n.includes("within india")) return "domestic";
  return undefined;
}

function pickLounge(v: unknown): LoungePriority | undefined {
  if (typeof v !== "string") return undefined;
  const n = v.trim().toLowerCase();
  if (/\b(must|critical|essential|non-negotiable)\b/.test(n)) return "must_have";
  if (/\b(nice|helpful|bonus|prefer complimentary|complimentary)\b/.test(n)) return "nice_to_have";
  if (/\b(not important|don't care|dont care|skip|no lounge|never|rarely|don't use)\b/.test(n)) return "none";
  if (n === "none" || n === "nice_to_have" || n === "must_have") return n as LoungePriority;
  return undefined;
}

function parseMonthlySpend(message: string, rawNum: unknown): number | undefined {
  if (typeof rawNum === "number" && Number.isFinite(rawNum) && rawNum >= 3000) {
    return Math.round(Math.min(500_000, rawNum));
  }
  const t = message.toLowerCase();
  const lakhs = t.match(/(\d+(\.\d+)?)\s*l(?:akh)?\b/);
  if (lakhs) {
    const v = Number(lakhs[1]);
    if (Number.isFinite(v)) return Math.round(v * 100_000 / 12);
  }
  const k = t.match(/(\d+)\s*k\b/);
  if (k) {
    const v = Number(k[1]);
    if (Number.isFinite(v)) return Math.round(v * 1000);
  }
  const plain = t.match(/\b(\d{2,6})\b/);
  if (plain) {
    const v = Number(plain[1]);
    if (v >= 5000 && v <= 400000) return v;
  }
  return undefined;
}

function brandsFromText(message: string): string[] {
  const t = message.toLowerCase();
  const brands: string[] = [];
  const tokens = [
    "amazon",
    "flipkart",
    "swiggy",
    "zomato",
    "blinkit",
    "myntra",
    "nykaa",
    "paytm",
    "cred",
    "airtel",
    "jio",
  ];
  for (const b of tokens) {
    if (t.includes(b)) brands.push(b);
  }
  return brands;
}

function hasIntensifier(text: string): boolean {
  return /\b(very|mostly|frequent|frequently|often|a lot|high|heavy|regularly)\b/.test(text);
}

/** Infer lounge preference when users answer frequency/access wording without explicit must/nice/none labels. */
function inferLoungePriorityFromKeywords(text: string): LoungePriority | undefined {
  const t = text.toLowerCase();
  const loungeCtx =
    /\b(lounges?\b|airport lounges?\b|priority pass)\b/.test(t) ||
    (/\bcomplimentary\b/.test(t) && /\b(access|visits)\b/.test(t));
  const domesticLounges = /\bdomestic\b/.test(t) && /\b(lounges?\b|airport)\b/.test(t);

  if (!loungeCtx && !domesticLounges) return undefined;

  if (/\b(never|don't use|dont use|rarely|hardly ever|not important|don't care|dont care|no need|skip)\b/.test(t)) {
    return "none";
  }
  if (
    /\b(must|essential|critical|every trip|always|very frequent|multiple times (a )?(month|week))\b/.test(t)
  ) {
    return "must_have";
  }
  if (/\b(often|frequent|weekly|monthly|several times)\b/.test(t)) return "must_have";
  if (/\b(nice|sometimes|occasionally|few times a year|okay|bonus|prefer complimentary)\b/.test(t)) {
    return "nice_to_have";
  }

  return "nice_to_have";
}

/** Keyword fallback when APIs unavailable or return sparse intent. */
export function keywordCredGenieExtract(message: string): Partial<CredGenieAdvisorProfile> {
  const t = message.toLowerCase();
  const out: Partial<CredGenieAdvisorProfile> = {};

  if (/\b(swiggy|zomato|restaurant|dining|food delivery|eating out)\b/.test(t)) {
    out.dining = hasIntensifier(t) ? "high" : "medium";
  }
  if (/\b(travel|flight|flights|hotel|trip|airport)\b/.test(t)) {
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

  if (/\b(cashback|cash back)\b/.test(t)) out.preferred_rewards = "cashback";
  else if (/\b(travel rewards|miles|points|air miles)\b/.test(t)) out.preferred_rewards = "travel";
  else if (/\b(mix|balanced|both)\b/.test(t)) out.preferred_rewards = "mixed";

  const telecom = pickTelecom(t);
  if (telecom) out.telecomEcosystem = telecom;

  const inferredLounges = inferLoungePriorityFromKeywords(message);
  if (inferredLounges) out.loungePriority = inferredLounges;

  if (/\b(frequent|often)\b/.test(t) && /\b(travel|fly)\b/.test(t)) {
    out.travelFrequency = "frequent";
  }

  const brands = brandsFromText(message);
  if (brands.length) out.preferredBrands = brands;

  const spend = parseMonthlySpend(message, undefined);
  if (spend) out.monthlySpend = spend;

  return out;
}

function normalizeOpenAiExtract(raw: unknown): Partial<CredGenieAdvisorProfile> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<CredGenieAdvisorProfile> = {};

  const dining =
    pickLevel(o.dining) ??
    pickLevel(o.diningSpend) ??
    pickLevel((o as { dining_spend?: unknown }).dining_spend);
  const shopping =
    pickLevel(o.shopping) ??
    pickLevel(o.shoppingSpend) ??
    pickLevel((o as { shopping_spend?: unknown }).shopping_spend);
  const travel =
    pickLevel(o.travel) ??
    pickLevel(o.travelSpend) ??
    pickLevel((o as { travel_spend?: unknown }).travel_spend);
  const fuel =
    pickLevel(o.fuel) ??
    pickLevel(o.fuelSpend) ??
    pickLevel((o as { fuel_spend?: unknown }).fuel_spend);

  if (dining) out.dining = dining;
  if (shopping) out.shopping = shopping;
  if (travel) out.travel = travel;
  if (fuel) out.fuel = fuel;

  const fees =
    pickLevel(o.fees) ?? pickLevel(o.feeTolerance) ?? pickLevel((o as { fee_tolerance?: unknown }).fee_tolerance);
  if (fees) out.fees = fees;

  const rewards =
    pickReward(o.preferred_rewards) ??
    pickReward(o.rewardsPreference) ??
    pickReward((o as { rewards_preference?: unknown }).rewards_preference);
  if (rewards) out.preferred_rewards = rewards;

  const telecom =
    pickTelecom(o.telecomEcosystem) ?? pickTelecom((o as { telecom_ecosystem?: unknown }).telecom_ecosystem);
  if (telecom) out.telecomEcosystem = telecom;

  const tf =
    pickTravelFreq(o.travelFrequency) ?? pickTravelFreq((o as { travel_frequency?: unknown }).travel_frequency);
  if (tf) out.travelFrequency = tf;

  const tt =
    pickTravelType(o.travelType) ?? pickTravelType((o as { travel_type?: unknown }).travel_type);
  if (tt) out.travelType = tt;

  const lp =
    pickLounge(o.loungePriority) ?? pickLounge((o as { lounge_priority?: unknown }).lounge_priority);
  if (lp) out.loungePriority = lp;

  if (Array.isArray(o.existingCards)) {
    const cards = o.existingCards.filter((x): x is string => typeof x === "string").map((x) => x.trim());
    if (cards.length) out.existingCards = cards;
  }

  const ms =
    parseMonthlySpend("", o.monthlySpend) ??
    parseMonthlySpend("", (o as { monthly_spend?: unknown }).monthly_spend);
  if (ms) out.monthlySpend = ms;

  if (Array.isArray(o.preferredBrands)) {
    const b = o.preferredBrands.filter((x): x is string => typeof x === "string").map((x) => x.trim().toLowerCase());
    if (b.length) out.preferredBrands = b;
  }

  return out;
}

const OPENAI_SYSTEM = `Extract structured Indian credit-card user preferences from the latest user message.
Return JSON only with nullable fields:
{
 "dining": "low"|"medium"|"high"|null,
 "travel": "low"|"medium"|"high"|null,
 "shopping": "low"|"medium"|"high"|null,
 "fuel": "low"|"medium"|"high"|null,
 "fees": "low"|"medium"|"high"|null,
 "preferred_rewards": "cashback"|"travel"|"mixed"|null,
 "telecomEcosystem": "airtel"|"jio"|"vi"|"none"|null,
 "travelFrequency": "rarely"|"occasionally"|"frequent"|null,
 "travelType": "domestic"|"international"|"both"|null,
 "loungePriority": "none"|"nice_to_have"|"must_have"|null,
 "monthlySpend": number|null,
 "preferredBrands": string[]|null,
 "existingCards": string[]|null
}

Only populate what is clearly implied. Use null otherwise. monthlySpend must be total monthly card spend in INR if stated.
For loungePriority, infer from lounge/Priority Pass mentions, visit frequency, complimentary access preference, or explicit must-have vs not important.`;

/**
 * Primary entry: Langflow (legacy slots) → OpenAI JSON (rich) → keywords.
 */
export async function extractCredGenieProfile(message: string): Promise<Partial<CredGenieAdvisorProfile>> {
  const keyword = keywordCredGenieExtract(message);

  if (areThirdPartyApisDisabled()) {
    return keyword;
  }

  const langflowParsed = await extractIntentViaLangflow(message);
  if (langflowParsed) {
    const normalizedLangflow = normalizeAdvisorIntent(langflowParsed) as Partial<CredGenieAdvisorProfile>;
    if (Object.keys(normalizedLangflow).length > 0) {
      return { ...keyword, ...normalizedLangflow };
    }
  }

  if (isOpenAiConfigured()) {
    try {
      const raw = await openAiJsonCompletion(OPENAI_SYSTEM, message, 0.2);
      const fromAi = normalizeOpenAiExtract(raw);
      if (Object.keys(fromAi).length > 0) {
        return { ...keyword, ...fromAi };
      }
    } catch {
      /* fall through */
    }
  }

  return keyword;
}
