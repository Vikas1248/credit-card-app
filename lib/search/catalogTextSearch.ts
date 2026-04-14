/** Fields scanned for client-side catalog search (subset of card row). */
export type CardSearchTextFields = {
  card_name: string;
  bank: string;
  network: string;
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  key_benefits: string | null;
};

export function buildCatalogSearchHaystack(card: CardSearchTextFields): string {
  return [
    card.card_name,
    card.network,
    card.best_for ?? "",
    card.key_benefits ?? "",
    card.reward_rate ?? "",
    card.lounge_access ?? "",
  ].join("\n");
}

/**
 * Every whitespace-separated token must appear (order-free). Empty query matches all.
 */
export function matchesCatalogSearchQuery(
  haystack: string,
  queryRaw: string
): boolean {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return true;
  const h = haystack.toLowerCase();
  return tokens.every((t) => h.includes(t));
}
