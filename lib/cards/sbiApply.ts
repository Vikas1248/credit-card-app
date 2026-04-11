/** SBI Card e-apply referral (opens in a new tab). */
export const SBI_CARD_APPLY_URL =
  "https://www.sbicard.com/eapply/eapply-form.page/catalogue-refer?referralcode=jK5LFX3GT34";

export function isSbiCard(bank: string): boolean {
  return /\bsbi\b/i.test(bank);
}
