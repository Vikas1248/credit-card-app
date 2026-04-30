import type { CredGenieAdvisorProfile } from "./types";
import { mergeCredGenieAdvisorProfile } from "./profile";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AdvisorGapKind } from "./conversationState";

const TABLE = "credgenie_advisor_sessions";
const ENVELOPE_MARKER = "credgenieEnvelope";

const ALLOWED_GAP_KINDS = new Set<AdvisorGapKind>([
  "monthly_spend",
  "category_mix",
  "reward_format",
  "fee_tolerance",
  "telecom_spend_depth",
  "travel_type",
  "travel_frequency",
  "lounge_priority",
  "merchant_ecosystem",
]);

export type AdvisorSessionBlob = {
  profile: CredGenieAdvisorProfile;
  askedGapKinds: AdvisorGapKind[];
};

export function sanitizeCredGeniePayload(raw: unknown): CredGenieAdvisorProfile {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  if (o[ENVELOPE_MARKER] === true && o.profile && typeof o.profile === "object") {
    return normalizeProfileBlob(o.profile as Record<string, unknown>);
  }
  return normalizeProfileBlob(o);
}

export async function loadAdvisorSession(sessionId: string): Promise<AdvisorSessionBlob> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("profile")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error || !data?.profile || typeof data.profile !== "object") {
      return { profile: {}, askedGapKinds: [] };
    }
    return decodeStoredProfileColumn(data.profile);
  } catch {
    return { profile: {}, askedGapKinds: [] };
  }
}

export async function persistAdvisorSession(sessionId: string, blob: AdvisorSessionBlob): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    await supabase.from(TABLE).upsert(
      {
        session_id: sessionId,
        profile: {
          [ENVELOPE_MARKER]: true,
          profile: blob.profile,
          askedGapKinds: blob.askedGapKinds,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );
  } catch {
    /* table may not exist yet — chat still works client-side */
  }
}

/** Combine DB snapshot + optional client-supplied partial profile */
export function hydratePriorProfile(
  stored: CredGenieAdvisorProfile | null,
  clientPatch: CredGenieAdvisorProfile | undefined
): CredGenieAdvisorProfile {
  if (!stored && !clientPatch) return {};
  if (!stored) return { ...(clientPatch ?? {}) };
  if (!clientPatch) return { ...stored };
  return mergeCredGenieAdvisorProfile(stored, clientPatch);
}

function decodeStoredProfileColumn(raw: unknown): AdvisorSessionBlob {
  if (!raw || typeof raw !== "object") {
    return { profile: {}, askedGapKinds: [] };
  }
  const o = raw as Record<string, unknown>;
  if (o[ENVELOPE_MARKER] === true && o.profile && typeof o.profile === "object") {
    return {
      profile: normalizeProfileBlob(o.profile as Record<string, unknown>),
      askedGapKinds: normalizeAskedGapKinds(o.askedGapKinds),
    };
  }
  return {
    profile: normalizeProfileBlob(o),
    askedGapKinds: [],
  };
}

function normalizeAskedGapKinds(raw: unknown): AdvisorGapKind[] {
  if (!Array.isArray(raw)) return [];
  const out: AdvisorGapKind[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    if (!ALLOWED_GAP_KINDS.has(item as AdvisorGapKind)) continue;
    if (!out.includes(item as AdvisorGapKind)) out.push(item as AdvisorGapKind);
  }
  return out.slice(0, 24);
}

function normalizeProfileBlob(raw: Record<string, unknown>): CredGenieAdvisorProfile {
  const out: CredGenieAdvisorProfile = {};

  const level = (v: unknown) =>
    v === "low" || v === "medium" || v === "high" ? v : undefined;

  out.dining = level(raw.dining);
  out.travel = level(raw.travel);
  out.shopping = level(raw.shopping);
  out.fuel = level(raw.fuel);
  out.fees = level(raw.fees);

  const pr = raw.preferred_rewards;
  if (pr === "cashback" || pr === "travel" || pr === "mixed") out.preferred_rewards = pr;

  const tel = raw.telecomEcosystem;
  if (tel === "airtel" || tel === "jio" || tel === "vi" || tel === "none") {
    out.telecomEcosystem = tel;
  }

  const tf = raw.travelFrequency;
  if (tf === "rarely" || tf === "occasionally" || tf === "frequent") out.travelFrequency = tf;

  const tt = raw.travelType;
  if (tt === "domestic" || tt === "international" || tt === "both") out.travelType = tt;

  const lp = raw.loungePriority;
  if (lp === "none" || lp === "nice_to_have" || lp === "must_have") out.loungePriority = lp;

  if (Array.isArray(raw.existingCards)) {
    out.existingCards = raw.existingCards.filter((x): x is string => typeof x === "string");
  }

  if (typeof raw.monthlySpend === "number" && Number.isFinite(raw.monthlySpend)) {
    out.monthlySpend = Math.round(Math.max(0, Math.min(500_000, raw.monthlySpend)));
  }

  if (Array.isArray(raw.preferredBrands)) {
    out.preferredBrands = raw.preferredBrands.filter((x): x is string => typeof x === "string");
  }

  return out;
}
