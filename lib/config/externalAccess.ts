/**
 * When true, the app will not call third-party HTTP APIs used for optional AI
 * features (OpenAI). Card data still comes from Supabase (your configured host).
 *
 * Set env: DISABLE_EXTERNAL_API_CALLS=1 (or true / yes)
 */
export function areThirdPartyApisDisabled(): boolean {
  const v = process.env.DISABLE_EXTERNAL_API_CALLS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
