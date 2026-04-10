import type { CardNetwork } from "@/lib/types/card";

/**
 * When set (e.g. Amex-only catalog), all card list / recommend queries restrict to this network.
 * Set in .env.local: NEXT_PUBLIC_CARD_NETWORK=Amex
 */
export function getOptionalCardNetworkFilter(): CardNetwork | null {
  const raw = process.env.NEXT_PUBLIC_CARD_NETWORK?.trim();
  if (raw === "Visa" || raw === "Mastercard" || raw === "Amex") {
    return raw;
  }
  return null;
}
