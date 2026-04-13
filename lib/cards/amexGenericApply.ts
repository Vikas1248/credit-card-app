import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";

/** Fallback Apply for Amex India cards without a dedicated referral CTA in the UI. */
export const AMEX_INDIA_GENERIC_APPLY_URL =
  "https://www.americanexpress.com/in/credit-cards/all-cards/?inav=en_in_menu_cards_top_links_view_all_cards";

export function isAmexIssuer(cardName: string, bank: string): boolean {
  const n = cardName.toLowerCase();
  const b = bank.toLowerCase();
  return (
    b.includes("american express") ||
    b.includes("amex") ||
    n.includes("american express") ||
    n.includes("amex")
  );
}

/** Amex catalog row that should use the generic all-cards landing (not Platinum Reserve referral). */
export function isAmexCardUsingGenericApply(
  cardName: string,
  bank: string
): boolean {
  return (
    isAmexIssuer(cardName, bank) &&
    !isAmexPlatinumReserveCard(cardName, bank)
  );
}
