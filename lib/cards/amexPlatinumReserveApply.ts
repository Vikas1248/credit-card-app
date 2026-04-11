/** Amex India referral landing for Platinum Reserve (opens in a new tab). */
export const AMEX_PLATINUM_RESERVE_APPLY_URL =
  "https://americanexpress.com/en-in/referral/platinum-reserve?ref=vIKASP3DFm&XLINK=MYCP";

export function isAmexPlatinumReserveCard(
  cardName: string,
  bank: string
): boolean {
  const n = cardName.toLowerCase();
  const b = bank.toLowerCase();
  const reserve =
    n.includes("platinum") &&
    n.includes("reserve") &&
    !n.includes("platinum travel");
  const amexBank =
    b.includes("american express") ||
    b.includes("amex") ||
    n.includes("american express") ||
    n.includes("amex");
  return reserve && amexBank;
}
