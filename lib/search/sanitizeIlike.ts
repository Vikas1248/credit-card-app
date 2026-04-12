/**
 * PostgREST `ilike` treats `%` and `_` as wildcards. Remove them so user input
 * cannot accidentally broaden or distort matches.
 */
export function sanitizeForIlikeContains(q: string): string {
  return q
    .replace(/[%_,()\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
