import type { CredGenieAdvisorProfile } from "./types";
import { mergeCredGenieAdvisorProfile } from "./profile";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const TABLE = "credgenie_advisor_sessions";
export function sanitizeCredGeniePayload(raw: unknown): CredGenieAdvisorProfile {
  if (!raw || typeof raw !== "object") return {};
  return normalizeProfileBlob(raw as Record<string, unknown>);
}

export async function loadAdvisorSessionProfile(
  sessionId: string
): Promise<CredGenieAdvisorProfile | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("profile")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error || !data?.profile || typeof data.profile !== "object") {
      return null;
    }
    return normalizeProfileBlob(data.profile as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function persistAdvisorSessionProfile(
  sessionId: string,
  profile: CredGenieAdvisorProfile
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    await supabase.from(TABLE).upsert(
      {
        session_id: sessionId,
        profile,
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
