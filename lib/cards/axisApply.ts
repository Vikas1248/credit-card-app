/** Axis Bank referral apply flow (opens in a new tab). */
export const AXIS_BANK_APPLY_URL =
  "https://refer.axis.bank.in/retail/cards/credit-card/refer-and-earn/get-started.htm?axisreferralcode=vi7902C7";

export function isAxisBankCard(bank: string): boolean {
  return /\baxis\b/i.test(bank);
}
