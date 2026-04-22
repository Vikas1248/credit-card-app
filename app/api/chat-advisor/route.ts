import { NextResponse } from "next/server";
import { extractAdvisorIntent } from "@/lib/chatAdvisor/intent";
import {
  isProfileSufficient,
  mergeAdvisorProfile,
  missingProfileFields,
  nextMissingProfileField,
  nextQuestionForProfile,
  toRecommendUserProfile,
} from "@/lib/chatAdvisor/profile";
import { getTopRecommendationsForProfile } from "@/lib/chatAdvisor/recommend";
import type {
  AdvisorLevel,
  AdvisorProfile,
  AdvisorRewardPreference,
  ChatAdvisorRequestBody,
  ChatAdvisorResponseBody,
} from "@/lib/chatAdvisor/types";
import type { CardRowForScoring } from "@/lib/recommendV2/scoring";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const SELECT_FIELDS =
  "id, card_name, bank, joining_fee, annual_fee, reward_type, reward_rate, lounge_access, best_for, key_benefits, dining_reward, travel_reward, shopping_reward, fuel_reward, network, metadata";

const VALID_LEVELS = ["low", "medium", "high"] as const;
const VALID_REWARD = ["cashback", "travel", "mixed"] as const;

function isAdvisorLevel(value: string): value is AdvisorLevel {
  return (VALID_LEVELS as readonly string[]).includes(value);
}

function isAdvisorReward(value: string): value is AdvisorRewardPreference {
  return (VALID_REWARD as readonly string[]).includes(value);
}

function sanitizeProfile(raw: unknown): AdvisorProfile {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: AdvisorProfile = {};
  for (const key of ["dining", "travel", "shopping", "fuel", "fees"] as const) {
    const v = o[key];
    if (typeof v === "string" && isAdvisorLevel(v)) out[key] = v;
  }
  if (typeof o.preferred_rewards === "string" && isAdvisorReward(o.preferred_rewards)) {
    out.preferred_rewards = o.preferred_rewards;
  }
  return out;
}

function filledFieldCount(profile: AdvisorProfile): number {
  return (
    (profile.dining ? 1 : 0) +
    (profile.travel ? 1 : 0) +
    (profile.shopping ? 1 : 0) +
    (profile.fuel ? 1 : 0) +
    (profile.fees ? 1 : 0) +
    (profile.preferred_rewards ? 1 : 0)
  );
}

function contextualFollowUpIntent(
  message: string,
  currentProfile: AdvisorProfile,
  extracted: Partial<AdvisorProfile>
): Partial<AdvisorProfile> {
  const out: Partial<AdvisorProfile> = { ...extracted };
  const normalized = message.trim().toLowerCase();
  const hasAnyExtracted = Object.keys(extracted).length > 0;

  if (hasAnyExtracted) return out;

  const nextField = nextMissingProfileField(currentProfile);
  if (!nextField) return out;

  if (isAdvisorLevel(normalized)) {
    if (
      nextField === "shopping" ||
      nextField === "dining" ||
      nextField === "travel" ||
      nextField === "fuel" ||
      nextField === "fees"
    ) {
      out[nextField] = normalized;
      return out;
    }
  }

  if (isAdvisorReward(normalized)) {
    if (nextField === "preferred_rewards") {
      out.preferred_rewards = normalized;
      return out;
    }
  }

  if (
    nextField === "preferred_rewards" &&
    /\b(cashback|cash back)\b/.test(normalized)
  ) {
    out.preferred_rewards = "cashback";
  } else if (
    nextField === "preferred_rewards" &&
    /\b(travel|miles|points)\b/.test(normalized)
  ) {
    out.preferred_rewards = "travel";
  } else if (
    nextField === "preferred_rewards" &&
    /\b(mix|mixed|both|balanced)\b/.test(normalized)
  ) {
    out.preferred_rewards = "mixed";
  }

  return out;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatAdvisorRequestBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const currentProfile = sanitizeProfile(body.profile);
    const extracted = await extractAdvisorIntent(message);
    const contextual = contextualFollowUpIntent(message, currentProfile, extracted);
    const profile = mergeAdvisorProfile(currentProfile, contextual);

    const shouldRecommendNow =
      isProfileSufficient(profile) || filledFieldCount(profile) >= 3;

    let recommendations: ChatAdvisorResponseBody["recommendations"] | undefined;
    if (shouldRecommendNow) {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.from("credit_cards").select(SELECT_FIELDS);
      if (error) {
        throw new Error(error.message);
      }
      const cards = (data ?? []) as CardRowForScoring[];
      if (cards.length > 0) {
        recommendations = await getTopRecommendationsForProfile(
          cards,
          toRecommendUserProfile(profile)
        );
      }
    }

    const missing = missingProfileFields(profile);
    const response: ChatAdvisorResponseBody = {
      profile,
      ...(missing.length > 0 ? { nextQuestion: nextQuestionForProfile(profile) } : {}),
      ...(recommendations && recommendations.length > 0 ? { recommendations } : {}),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
