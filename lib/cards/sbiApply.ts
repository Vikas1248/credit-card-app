/** SBI Card apply / referral (opens in a new tab). */
export const SBI_CARD_APPLY_URL =
  "https://tjzuh.com/g/hxn4dcyutj367a3e77278bc555c0f8/";

export function isSbiCard(bank: string): boolean {
  return /\bsbi\b/i.test(bank);
}
