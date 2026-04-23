import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";
import type { AdvisorLevel, AdvisorProfile, AdvisorRewardPreference } from "./types";

const VALID_LEVELS = ["low", "medium", "high"] as const;
const VALID_REWARDS = ["cashback", "travel", "mixed"] as const;
const TIMEOUT = process.env.NODE_ENV === "production" ? 1500 : 2500;
const CIRCUIT_OPEN_MS = 60_000;
const CIRCUIT_WINDOW_REQUESTS = 10;
const CIRCUIT_FAILURE_THRESHOLD = 5;

const intentCache = new Map<string, Partial<AdvisorProfile>>();
const recentOutcomes: boolean[] = [];
let circuitOpenUntil = 0;

function isAdvisorLevel(value: string): value is AdvisorLevel {
  return (VALID_LEVELS as readonly string[]).includes(value);
}

function isAdvisorReward(value: string): value is AdvisorRewardPreference {
  return (VALID_REWARDS as readonly string[]).includes(value);
}

function recordLangflowOutcome(success: boolean): void {
  recentOutcomes.push(success);
  if (recentOutcomes.length > CIRCUIT_WINDOW_REQUESTS) recentOutcomes.shift();

  const failures = recentOutcomes.filter((x) => !x).length;
  if (failures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
  }
}

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextFromLangflow(data: any): string | null {
  try {
    return (
      data?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ||
      data?.result ||
      data?.text ||
      null
    );
  } catch {
    return null;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    const match = text.match(/{[\s\S]*}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeFromObject(raw: unknown): Partial<AdvisorProfile> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<AdvisorProfile> = {};

  for (const key of ["dining", "travel", "shopping", "fuel", "fees"] as const) {
    const field = o[key];
    if (typeof field === "string") {
      const normalized = field.trim().toLowerCase();
      if (isAdvisorLevel(normalized)) out[key] = normalized;
    }
  }

  const reward = o.preferred_rewards;
  if (typeof reward === "string") {
    const normalizedReward = reward.trim().toLowerCase();
    if (isAdvisorReward(normalizedReward)) out.preferred_rewards = normalizedReward;
  }

  return out;
}

export function normalizeAdvisorIntent(raw: unknown): Partial<AdvisorProfile> {
  // 1) Already-object JSON response.
  const objectFirst = normalizeFromObject(raw);
  if (Object.keys(objectFirst).length > 0) return objectFirst;

  // 2) Langflow nested message text that contains JSON.
  const text = extractTextFromLangflow(raw);
  if (typeof text === "string" && text.trim().length > 0) {
    const parsed = safeJsonParse(text);
    if (!parsed) {
      console.warn("[chat-advisor] Langflow parse error: invalid JSON text block.");
      return {};
    }
    return normalizeFromObject(parsed);
  }

  return {};
}

export async function extractIntentViaLangflow(
  input: string
): Promise<Partial<AdvisorProfile>> {
  if (areThirdPartyApisDisabled()) {
    throw new Error("External APIs disabled (DISABLE_EXTERNAL_API_CALLS).");
  }

  const apiUrl = process.env.LANGFLOW_API_URL?.trim();
  if (!apiUrl) {
    throw new Error("LANGFLOW_API_URL is not set.");
  }
  if (isCircuitOpen()) {
    throw new Error("LANGFLOW_CIRCUIT_OPEN");
  }

  const cacheKey = input.trim().toLowerCase();
  if (cacheKey.length > 0) {
    const cached = intentCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const apiKey = process.env.LANGFLOW_API_KEY?.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        input,
        message: input,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      recordLangflowOutcome(false);
      throw new Error(`Langflow API error (${response.status}): ${text}`);
    }

    const raw = (await response.json()) as unknown;
    if (raw && typeof raw === "object") {
      const keys = Object.keys(raw as Record<string, unknown>);
      console.debug("[chat-advisor] Langflow response keys:", keys);
    } else {
      console.debug("[chat-advisor] Langflow response type:", typeof raw);
    }

    const normalized = normalizeAdvisorIntent(raw);
    if (Object.keys(normalized).length === 0) {
      recordLangflowOutcome(false);
      throw new Error("Langflow response did not contain valid intent fields.");
    }
    recordLangflowOutcome(true);
    if (cacheKey.length > 0) {
      intentCache.set(cacheKey, normalized);
    }
    return normalized;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      recordLangflowOutcome(false);
      throw new Error("Langflow timeout.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
