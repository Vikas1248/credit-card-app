/**
 * Subset of `credit_cards.metadata` shown on the public card detail page.
 * Everything else stays in the DB for imports / app logic but is not listed here.
 */
export const ADDITIONAL_DETAILS_METADATA_KEYS: readonly string[] = [
  "eligibility",
  "welcome_offer",
  "annual_fee_waiver_condition",
  "milestone_rewards",
  "excluded_categories",
  "cashback_cap_monthly",
];

function isPresentMetadataValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string" && !value.trim()) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  ) {
    return false;
  }
  return true;
}

/**
 * After removing hidden/internal keys, keep only allowlisted keys in product order.
 */
export function pickAdditionalDetailsMetadata(
  metaWithoutHidden: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ADDITIONAL_DETAILS_METADATA_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(metaWithoutHidden, key)) continue;
    const v = metaWithoutHidden[key];
    if (!isPresentMetadataValue(v)) continue;
    out[key] = v;
  }
  return out;
}
