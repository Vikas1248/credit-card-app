import type { CardNetwork } from "@/lib/types/card";

export function parseCardNetworkParam(
  raw: string | undefined | null
): CardNetwork | null {
  const t = raw?.trim();
  if (t === "Visa" || t === "Mastercard" || t === "Amex") {
    return t;
  }
  return null;
}

/**
 * Catalog network constraint for list + recommend queries.
 * Defaults to Amex (this repo’s curated dataset). Set NEXT_PUBLIC_CARD_NETWORK=*
 * or `all` to disable filtering. Query param ?network= on /api/cards overrides
 * when the client sends it (see app/page.tsx).
 */
export function getOptionalCardNetworkFilter(): CardNetwork | null {
  const raw = process.env.NEXT_PUBLIC_CARD_NETWORK?.trim();
  if (raw === "*" || raw === "all") {
    return null;
  }
  return parseCardNetworkParam(process.env.NEXT_PUBLIC_CARD_NETWORK) ?? "Amex";
}
