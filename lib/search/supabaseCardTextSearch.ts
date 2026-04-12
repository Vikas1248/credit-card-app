import { sanitizeForIlikeContains } from "@/lib/search/sanitizeIlike";

const ILIKE_COLUMNS = [
  "card_name",
  "bank",
  "network",
  "best_for",
  "reward_rate",
  "key_benefits",
  "lounge_access",
] as const;

/**
 * PostgREST `or=(col.ilike.*pat*,...)` for catalog text search. Returns null if
 * nothing searchable remains after sanitizing.
 */
export function creditCardTextSearchOrFilter(qRaw: string): string | null {
  const q = sanitizeForIlikeContains(qRaw);
  if (!q) return null;
  const pat = `%${q}%`;
  return ILIKE_COLUMNS.map((c) => `${c}.ilike.${pat}`).join(",");
}
