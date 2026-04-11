/** Same slugs as `SpendCategorySlug` in spendCategories (avoid circular import). */
type CategorySlug = "dining" | "travel" | "shopping" | "fuel";

/** Default value of 1 Membership Rewards point when redeemed (INR). */
export const DEFAULT_AMEX_MR_INR_PER_POINT = 0.25;

export type CategoryPctRange = { min: number; max: number };

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(String(v).replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseInrFromText(s: string): number | null {
  const m = s.match(/₹\s*([\d,]+)/);
  if (!m) return null;
  return num(m[1]);
}

function parseTransactionMinSpend(condition: string): number | null {
  const c = condition.replace(/\s+/g, " ");
  const multi = c.match(/(\d+)\s*transactions?\s+of\s+₹?\s*([\d,]+)/i);
  if (multi) {
    const count = Number(multi[1]);
    const each = num(multi[2]);
    if (count > 0 && each != null) return count * each;
  }
  return null;
}

function parseMonthlySpendThreshold(condition: string): number | null {
  const m = condition.match(/₹?\s*([\d,]+)\s*(?:spend|spent)\b/i);
  if (m) return num(m[1]);
  const m2 = condition.match(/₹\s*([\d,]+)/);
  if (m2) return num(m2[1]);
  return null;
}

function isMonthlyFrequency(m: Record<string, unknown>): boolean {
  if (m.frequency === "monthly") return true;
  if (typeof m.frequency === "string" && /month/i.test(m.frequency)) return true;
  const cond = String(m.condition ?? "");
  return /per month|in a month|each month|monthly spend/i.test(cond);
}

function isYearlyRenewalMilestone(m: Record<string, unknown>): boolean {
  if (m.frequency === "yearly") return true;
  const cond = String(m.condition ?? "").toLowerCase();
  return /renewal|card renewal|annual renewal/.test(cond);
}

function getPointsPerRupee(meta: Record<string, unknown>): number | null {
  const rc = meta.reward_conversion;
  if (!rc || typeof rc !== "object") return null;
  const ppr = (rc as Record<string, unknown>).points_per_rupee;
  return num(ppr);
}

function fuelExcluded(
  meta: Record<string, unknown>,
  rewardRate: string | null
): boolean {
  const rc = meta.reward_conversion;
  let text = "";
  if (rc && typeof rc === "object") {
    text += ` ${String((rc as Record<string, unknown>).description ?? "")}`;
  }
  text += ` ${String(rewardRate ?? "")}`;
  const t = text.toLowerCase();
  return (
    t.includes("except fuel") ||
    t.includes("excluding fuel") ||
    (t.includes("no points") && t.includes("fuel"))
  );
}

function getInrPerPoint(meta: Record<string, unknown>): number {
  const v = num(meta.membership_rewards_inr_per_point);
  if (v != null && v > 0) return v;
  return DEFAULT_AMEX_MR_INR_PER_POINT;
}

const ACCEL_KEYWORDS: Record<CategorySlug, RegExp[]> = {
  dining: [/zomato|swiggy|restaurant|dining|food/i],
  travel: [/uber|ola|flight|hotel|travel|makemytrip|booking\.com/i],
  shopping: [
    /flipkart|amazon|ajio|nykaa|myntra|shopping|retail|online partner|partner merchants/i,
  ],
  fuel: [/hpcl|iocl|bpcl|fuel|petrol/i],
};

function acceleratedPointsPerRupeeForSlug(
  entries: unknown[],
  slug: CategorySlug
): number | null {
  const patterns = ACCEL_KEYWORDS[slug];
  let best: number | null = null;
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const cat = String(o.category ?? "");
    if (!patterns.some((re) => re.test(cat))) continue;
    const ppr = num(o.points_per_rupee);
    if (ppr != null && ppr > 0 && (best == null || ppr > best)) best = ppr;
  }
  return best;
}

function monthlyMilestoneBonusInrPct(
  milestones: unknown[],
  inrPerPoint: number
): number {
  let monthlyValueInr = 0;
  let maxMinSpend = 0;
  for (const raw of milestones) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as Record<string, unknown>;
    if (!isMonthlyFrequency(m)) continue;
    if (isYearlyRenewalMilestone(m)) continue;

    const pts = num(m.reward_points);
    let valueInr = 0;
    if (pts != null && pts > 0) valueInr += pts * inrPerPoint;
    const rewardStr = m.reward;
    if (typeof rewardStr === "string") {
      const rupees = parseInrFromText(rewardStr);
      if (rupees != null && rupees > 0) valueInr += rupees;
    }
    if (valueInr <= 0) continue;

    const cond = String(m.condition ?? "");
    let minSpend = parseTransactionMinSpend(cond);
    if (minSpend == null) minSpend = parseMonthlySpendThreshold(cond);
    if (minSpend == null || minSpend <= 0) continue;

    monthlyValueInr += valueInr;
    if (minSpend > maxMinSpend) maxMinSpend = minSpend;
  }
  if (monthlyValueInr <= 0 || maxMinSpend <= 0) return 0;
  return (monthlyValueInr * 100) / maxMinSpend;
}

function annualPointsMilestoneTravelBoost(
  milestones: unknown[],
  inrPerPoint: number
): number {
  let best = 0;
  for (const raw of milestones) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as Record<string, unknown>;
    if (isMonthlyFrequency(m)) continue;
    if (isYearlyRenewalMilestone(m)) continue;
    const spend = num(m.spend);
    const pts = num(m.reward_points);
    if (spend == null || spend <= 0 || pts == null || pts <= 0) continue;
    let rupeeExtra = 0;
    const bonus = m.bonus;
    if (typeof bonus === "string") {
      rupeeExtra = parseInrFromText(bonus) ?? 0;
    }
    const value = pts * inrPerPoint + rupeeExtra;
    const pct = (value * 100) / spend;
    if (pct > best) best = pct;
  }
  return best;
}

function annualVoucherBoostAllCategories(milestones: unknown[]): number {
  let best = 0;
  for (const raw of milestones) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as Record<string, unknown>;
    const spend = num(m.spend);
    const reward = m.reward;
    if (spend == null || spend <= 0 || typeof reward !== "string") continue;
    if (m.reward_points != null) continue;
    const rupees = parseInrFromText(reward);
    if (rupees == null || rupees <= 0) continue;
    const pct = (rupees * 100) / spend;
    if (pct > best) best = pct;
  }
  return best;
}

function travelTilted(
  cardName: string,
  bestFor: string | null
): boolean {
  const n = cardName.toLowerCase();
  const b = (bestFor ?? "").toLowerCase();
  return (
    n.includes("travel") ||
    b.includes("travel") ||
    b.includes("milestone-based rewards")
  );
}

function roundDisplayPct(n: number): number {
  return Math.round(n * 10) / 10;
}

export type CardInputForAmexDerivation = {
  network: string;
  reward_type: string;
  card_name: string;
  best_for: string | null;
  reward_rate: string | null;
  metadata: Record<string, unknown> | null | undefined;
};

export type AmexPointValueUiInput = {
  network: string;
  reward_type: string;
  metadata: Record<string, unknown> | null | undefined;
};

/**
 * INR assumed per Membership Rewards point for category % on the card detail page.
 * Null when the card is not an Amex points product or earn rate is not in metadata.
 */
export function amexMembershipRewardsInrPerPointForUi(
  card: AmexPointValueUiInput
): number | null {
  if (card.network !== "Amex" || card.reward_type !== "points") return null;
  const meta =
    card.metadata && typeof card.metadata === "object"
      ? (card.metadata as Record<string, unknown>)
      : {};
  const ppr = getPointsPerRupee(meta);
  if (ppr == null || ppr <= 0) return null;
  return getInrPerPoint(meta);
}

/**
 * Effective earn % of spend (cashback-equivalent) for Amex points cards from
 * metadata: base = points_per_rupee × MR INR value; max adds monthly milestones,
 * annual spend-tier bonuses (travel-focused cards), vouchers, and category accelerators.
 */
export function deriveAmexCategoryRange(
  card: CardInputForAmexDerivation,
  slug: CategorySlug
): CategoryPctRange | null {
  if (card.network !== "Amex" || card.reward_type !== "points") return null;
  const meta =
    card.metadata && typeof card.metadata === "object"
      ? (card.metadata as Record<string, unknown>)
      : {};

  const ppr = getPointsPerRupee(meta);
  if (ppr == null || ppr <= 0) return null;

  const inr = getInrPerPoint(meta);
  const base = ppr * inr * 100;
  if (!Number.isFinite(base) || base <= 0) return null;

  if (slug === "fuel" && fuelExcluded(meta, card.reward_rate)) return null;

  const milestones = Array.isArray(meta.milestone_rewards)
    ? meta.milestone_rewards
    : [];
  const monthlyExtra = monthlyMilestoneBonusInrPct(milestones, inr);
  const voucherAnnual = annualVoucherBoostAllCategories(milestones);
  const travelAnnual = travelTilted(card.card_name, card.best_for)
    ? annualPointsMilestoneTravelBoost(milestones, inr)
    : 0;

  const accelerated = Array.isArray(meta.accelerated_rewards)
    ? meta.accelerated_rewards
    : [];
  const accelPpr = acceleratedPointsPerRupeeForSlug(accelerated, slug);
  const accelPct = accelPpr != null ? accelPpr * inr * 100 : 0;

  const stackExtra =
    monthlyExtra + voucherAnnual + (slug === "travel" ? travelAnnual : 0);
  let maxR = base + stackExtra;
  if (accelPct > base) {
    maxR = Math.max(maxR, accelPct + monthlyExtra);
  }

  return {
    min: roundDisplayPct(base),
    max: roundDisplayPct(Math.max(maxR, base)),
  };
}
