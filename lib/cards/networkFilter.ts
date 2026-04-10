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
 * Optional catalog filter (Visa / Mastercard / Amex). When unset, empty, * or all,
 * no network filter is applied — Amex, Axis, and other rows all show.
 */
export function getOptionalCardNetworkFilter(): CardNetwork | null {
  const raw = process.env.NEXT_PUBLIC_CARD_NETWORK?.trim();
  if (!raw || raw === "*" || raw === "all") {
    return null;
  }
  return parseCardNetworkParam(process.env.NEXT_PUBLIC_CARD_NETWORK);
}
