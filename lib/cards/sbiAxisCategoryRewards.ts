import type { CategoryPctRange } from "@/lib/cards/amexCategoryRewards";

/** Same slugs as SpendCategorySlug (avoid circular import). */
type CategorySlug = "dining" | "travel" | "shopping" | "fuel";

const MAX_REASONABLE_PCT = 45;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(String(v).replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function roundDisplayPct(n: number): number {
  return Math.round(n * 10) / 10;
}

export function isSbiAxisCatalogBank(bank: string | null | undefined): boolean {
  const b = (bank ?? "").toLowerCase();
  return (
    /\bsbi\b/.test(b) ||
    /\baxis\b/.test(b) ||
    b.includes("sbi card")
  );
}

const SLUG_PATTERNS: Record<CategorySlug, RegExp[]> = {
  dining: [
    /swiggy|zomato|dining|restaurant|food\s+delivery|food\s+apps|grocer|groceries|movie|movies|departmental|department\s*store|eazydiner|blinkit/i,
  ],
  travel: [
    /travel|flight|hotel|cleartrip|yatra|makemytrip|goibibo|indigo|irctc|rail|train|airline|uber|\bola\b/i,
  ],
  shopping: [
    /amazon|flipkart|myntra|online\s+shopping|shopping|retail|utility\s+bill|utilities|bill\s+pay|paytm|blinkit|partner\s*merchant|airtel\s+thanks/i,
  ],
  fuel: [
    /fuel|petrol|diesel|iocl|bpcl|hpcl|indian\s*oil|bpcl|octane|mobility/i,
  ],
};

function corpusFromCard(input: {
  reward_rate: string | null | undefined;
  metadata: Record<string, unknown> | null | undefined;
  key_benefits: string | null | undefined;
}): string {
  const parts: string[] = [];
  if (input.reward_rate) parts.push(input.reward_rate);
  if (input.key_benefits) parts.push(input.key_benefits);
  const meta = input.metadata && typeof input.metadata === "object"
    ? (input.metadata as Record<string, unknown>)
    : {};
  const rc = meta.reward_conversion;
  if (rc && typeof rc === "object") {
    parts.push(String((rc as Record<string, unknown>).description ?? ""));
  }
  const kb = meta.key_benefits;
  if (Array.isArray(kb)) {
    parts.push(kb.map(String).join("\n"));
  } else if (typeof kb === "string") {
    parts.push(kb);
  }
  return parts.join("\n");
}

/** `(~2.5%)`, `(~1.25%)`, `5% cashback`, `4% on` — capped for sanity. */
function parsePercentHints(text: string): number[] {
  const out: number[] = [];
  const reParen = /\(\s*~?\s*([\d.]+)\s*%\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = reParen.exec(text)) !== null) {
    const v = Number(m[1]);
    if (Number.isFinite(v) && v > 0 && v <= MAX_REASONABLE_PCT) out.push(v);
  }
  const rePlain = /\b([\d.]+)\s*%\s*(?:cashback|on|off|value|back)/gi;
  while ((m = rePlain.exec(text)) !== null) {
    const v = Number(m[1]);
    if (Number.isFinite(v) && v > 0 && v <= MAX_REASONABLE_PCT) out.push(v);
  }
  return out;
}

function parseCategorySpecificPercentHints(
  text: string,
  slug: CategorySlug,
  basePct: number | null
): number[] {
  const keywords: Record<CategorySlug, string> = {
    dining:
      "dining|restaurant|food\\s+delivery|swiggy|zomato|grocer|groceries|movies?|departmental",
    travel:
      "travel|flight|hotel|cleartrip|yatra|makemytrip|goibibo|indigo|irctc|rail|train|airline",
    shopping:
      "shopping|amazon|flipkart|myntra|retail|online\\s+spend|online\\s+shopping",
    fuel: "fuel|petrol|diesel|bpcl|hpcl|iocl|indian\\s*oil",
  };
  const kw = keywords[slug];
  const chunks = text
    .split(/[\n.;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: number[] = [];

  for (const chunk of chunks) {
    const lower = chunk.toLowerCase();
    if (!slugMatchesCorpus(slug, lower)) continue;

    // Generic partner-brand lines overstate non-shopping categories.
    if (slug !== "shopping" && lower.includes("partner brands")) continue;
    // Surcharge-waiver text is not a fuel reward multiplier.
    if (slug === "fuel" && /fuel\s+surcharge\s+waiver/.test(lower)) continue;

    // Extract only % hints tied to this category keyword, not every % in the line.
    const pctHints: number[] = [];
    const reNearA = new RegExp(
      `(?:${kw})[^()%]{0,90}\\(\\s*~?\\s*([\\d.]+)\\s*%\\s*\\)`,
      "gi"
    );
    const reNearB = new RegExp(
      `\\(\\s*~?\\s*([\\d.]+)\\s*%\\s*\\)[^.\\n]{0,90}(?:${kw})`,
      "gi"
    );
    let mPct: RegExpExecArray | null;
    while ((mPct = reNearA.exec(chunk)) !== null) {
      const v = Number(mPct[1]);
      if (Number.isFinite(v) && v > 0 && v <= MAX_REASONABLE_PCT)
        pctHints.push(v);
    }
    while ((mPct = reNearB.exec(chunk)) !== null) {
      const v = Number(mPct[1]);
      if (Number.isFinite(v) && v > 0 && v <= MAX_REASONABLE_PCT)
        pctHints.push(v);
    }
    for (const v of pctHints) out.push(v);

    // Parse category-tied "points per ₹" (e.g., "10 points per ₹100 on dining")
    // so we can derive higher dining/travel rates even when % isn't written explicitly.
    if (basePct != null && basePct > 0) {
      const inrPerPoint = basePct / 100;
      const rePtsNearA = new RegExp(
        `(\\d+(?:\\.\\d+)?)\\s*(?:reward\\s*)?points?\\s+per\\s+₹?\\s*([\\d,]+)[^.\\n]{0,90}(?:${kw})`,
        "gi"
      );
      const rePtsNearB = new RegExp(
        `(?:${kw})[^.\\n]{0,90}(\\d+(?:\\.\\d+)?)\\s*(?:reward\\s*)?points?\\s+per\\s+₹?\\s*([\\d,]+)`,
        "gi"
      );
      let mPts: RegExpExecArray | null;
      while ((mPts = rePtsNearA.exec(chunk)) !== null) {
        const pts = Number(mPts[1]);
        const rs = Number(String(mPts[2]).replace(/,/g, ""));
        if (Number.isFinite(pts) && Number.isFinite(rs) && pts > 0 && rs > 0) {
          out.push((pts / rs) * inrPerPoint * 100);
        }
      }
      while ((mPts = rePtsNearB.exec(chunk)) !== null) {
        const pts = Number(mPts[1]);
        const rs = Number(String(mPts[2]).replace(/,/g, ""));
        if (Number.isFinite(pts) && Number.isFinite(rs) && pts > 0 && rs > 0) {
          out.push((pts / rs) * inrPerPoint * 100);
        }
      }
    }

    // Allow X-multiplier cues only when explicitly tied to this category chunk.
    if (basePct != null && basePct > 0) {
      const reXNearA = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*[xX][^.\\n]{0,90}(?:${kw})`, "gi");
      const reXNearB = new RegExp(`(?:${kw})[^.\\n]{0,90}(\\d+(?:\\.\\d+)?)\\s*[xX]`, "gi");
      let m: RegExpExecArray | null;
      while ((m = reXNearA.exec(chunk)) !== null) {
        const mult = Number(m[1]);
        if (Number.isFinite(mult) && mult > 0 && mult <= 50) {
          out.push(basePct * mult);
        }
      }
      while ((m = reXNearB.exec(chunk)) !== null) {
        const mult = Number(m[1]);
        if (Number.isFinite(mult) && mult > 0 && mult <= 50) {
          out.push(basePct * mult);
        }
      }
    }
  }
  return out.filter((v) => Number.isFinite(v) && v > 0 && v <= MAX_REASONABLE_PCT);
}

function getPointsPerRupee(meta: Record<string, unknown>): number | null {
  const rc = meta.reward_conversion;
  if (!rc || typeof rc !== "object") return null;
  return num((rc as Record<string, unknown>).points_per_rupee);
}

function parseInrPerPointFromText(text: string): number | null {
  const t = text.replace(/\s+/g, " ");
  let m = t.match(/1\s*TC\s*=\s*₹?\s*([\d.]+)/i);
  if (m) {
    const v = Number(m[1]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  m = t.match(/(?:1|one)\s+point\s*=\s*₹?\s*([\d.]+)/i);
  if (m) {
    const v = Number(m[1]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  m = t.match(/(\d+)\s*points?\s*=\s*₹?\s*1\b/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return 1 / n;
  }
  m = t.match(/(\d+)\s*points?\s*=\s*₹?\s*1\s*redeem/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return 1 / n;
  }
  return null;
}

function inrPerPointFromMeta(meta: Record<string, unknown>): number | null {
  const keys = [
    "reward_points_inr_per_point",
    "membership_rewards_inr_per_point",
    "edge_point_inr",
    "bluchip_inr",
  ] as const;
  for (const k of keys) {
    const v = num(meta[k]);
    if (v != null && v > 0) return v;
  }
  return null;
}

function defaultInrPerPoint(
  cardName: string,
  rewardTypeNorm: string,
  corpus: string
): number {
  if (/indo?go/i.test(cardName)) return 1;
  if (rewardTypeNorm.includes("travel_credit")) return 1;
  const parsed = parseInrPerPointFromText(corpus);
  if (parsed != null) return parsed;
  return 0.25;
}

function fuelCashbackExcluded(meta: Record<string, unknown>, corpus: string): boolean {
  const ex = meta.excluded_categories;
  if (Array.isArray(ex)) {
    const s = ex.map((x) => String(x).toLowerCase()).join(" ");
    if (s.includes("fuel")) return true;
  }
  const t = corpus.toLowerCase();
  return t.includes("except fuel") || t.includes("excluding fuel");
}

function slugMatchesCorpus(slug: CategorySlug, corpus: string): boolean {
  return SLUG_PATTERNS[slug].some((re) => re.test(corpus));
}

function hasFuelSurchargeWaiverOnly(corpus: string): boolean {
  const t = corpus.toLowerCase();
  const hasWaiver = /fuel\s+surcharge\s+waiver/.test(t);
  if (!hasWaiver) return false;
  // Treat as "waiver-only" when no explicit fuel earn/cashback/value-back style signal exists.
  const hasExplicitFuelEarn =
    /(?:fuel|petrol|diesel|bpcl|hpcl|iocl|indian\s*oil)[^.\n]{0,90}(?:cashback|value\s*back|reward|points?|travel\s*credits?|x)/i.test(
      t
    ) ||
    /(?:cashback|value\s*back|reward|points?|travel\s*credits?|x)[^.\n]{0,90}(?:fuel|petrol|diesel|bpcl|hpcl|iocl|indian\s*oil)/i.test(
      t
    );
  return !hasExplicitFuelEarn;
}

/**
 * Cashback cards often list 25% / 10% / 1% in one block; dining should not inherit
 * the telecom-only top tier (e.g. Airtel Axis 25% is for Airtel Thanks, not restaurants).
 */
function diningCashbackTierPct(corpus: string): number | null {
  const t = corpus.replace(/\s+/g, " ");
  const patterns = [
    /(\d+(?:\.\d+)?)\s*%\s*(?:value-back|value\s*back|cashback)[^.\n]{0,120}(?:food\s+delivery|Zomato|Swiggy|Blinkit)/i,
    /(\d+(?:\.\d+)?)\s*%\s*on\s*utilities\s*&\s*food\s+apps/i,
    /(\d+(?:\.\d+)?)\s*%\s*[^\n]{0,50}utilities\s*&\s*food\s+apps/i,
    /(\d+(?:\.\d+)?)\s*%\s*value-back\s+on\s+food\s+delivery/i,
  ];
  let best: number | null = null;
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const v = Number(m[1]);
      if (Number.isFinite(v) && v > 0 && v <= MAX_REASONABLE_PCT) {
        best = best == null ? v : Math.max(best, v);
      }
    }
  }
  return best;
}

/** e.g. 2 BluChips per ₹200 vs 1 per ₹200, or 6 Travel Credits per ₹200 vs 2 per ₹200. */
function parsePointsPerRupeeBands(
  corpus: string,
  inrPerPoint: number
): { minPct: number; maxPct: number } | null {
  const re =
    /(\d+)\s+(?:BluChips?|EDGE\s*(?:Reward\s*)?points?|reward\s*points?|Travel\s*Credits?)\s+per\s+₹?\s*([\d,]+)/gi;
  const ppms: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(corpus)) !== null) {
    const pts = Number(m[1]);
    const rs = Number(String(m[2]).replace(/,/g, ""));
    if (pts > 0 && rs > 0) ppms.push((pts / rs) * inrPerPoint * 100);
  }
  if (ppms.length < 2) return null;
  return { minPct: Math.min(...ppms), maxPct: Math.max(...ppms) };
}

export type SbiAxisDerivationCardInput = {
  bank: string;
  card_name: string;
  reward_type: string;
  reward_rate: string | null;
  metadata: Record<string, unknown> | null | undefined;
  key_benefits?: string | null;
  fuel_reward_column?: number | null;
};

/**
 * Derives min–max category earn % for SBI / Axis catalog cards from reward_conversion,
 * cashback slabs, and % hints in copy. When this returns non-null, spendCategories prefers
 * it over hand-entered category columns (often mis-scaled).
 */
export function deriveSbiAxisCategoryRange(
  card: SbiAxisDerivationCardInput,
  slug: CategorySlug
): CategoryPctRange | null {
  if (!isSbiAxisCatalogBank(card.bank)) return null;

  const meta =
    card.metadata && typeof card.metadata === "object"
      ? (card.metadata as Record<string, unknown>)
      : {};
  const corpus = corpusFromCard({
    reward_rate: card.reward_rate,
    metadata: card.metadata,
    key_benefits: card.key_benefits,
  });
  const rewardTypeNorm = String(card.reward_type ?? "").toLowerCase();

  const online = num(meta.online_cashback);
  const offline = num(meta.offline_cashback);
  const isCashbackSlab =
    rewardTypeNorm.includes("cashback") &&
    online != null &&
    offline != null &&
    online > 0 &&
    offline >= 0 &&
    online <= 1 &&
    offline <= 1;

  if (isCashbackSlab) {
    const lo = offline * 100;
    const hi = online * 100;
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= 0) return null;
    if (slug === "fuel" && fuelCashbackExcluded(meta, corpus)) return null;
    const minR = roundDisplayPct(Math.min(lo, hi));
    const maxR = roundDisplayPct(Math.max(lo, hi));
    if (slug === "fuel") {
      return { min: minR, max: minR };
    }
    return { min: minR, max: maxR };
  }

  const hints = parsePercentHints(corpus);
  const ppr = getPointsPerRupee(meta);
  const metaInr = inrPerPointFromMeta(meta);
  const textInr = parseInrPerPointFromText(corpus);
  const inr =
    metaInr ?? textInr ?? defaultInrPerPoint(card.card_name, rewardTypeNorm, corpus);

  let basePct: number | null = null;
  if (ppr != null && ppr > 0 && inr > 0) {
    basePct = ppr * inr * 100;
  }
  const categoryHints = parseCategorySpecificPercentHints(corpus, slug, basePct);

  const bands = parsePointsPerRupeeBands(corpus, inr);
  if (bands) {
    // Prefer parsed bands for "other/base" earn when present (e.g. PRIME/ELITE:
    // "2 points per ₹100"), since catalog points_per_rupee can reflect promo tiers.
    basePct = bands.minPct;
  }

  let floorPct: number;
  let ceilPct: number;
  if (hints.length > 0) {
    floorPct = Math.min(...hints);
    ceilPct = Math.max(...hints);
  } else if (bands) {
    floorPct = bands.minPct;
    ceilPct = bands.maxPct;
  } else if (basePct != null) {
    floorPct = basePct;
    ceilPct = basePct;
  } else {
    return null;
  }

  if (bands) {
    floorPct = Math.min(floorPct, bands.minPct);
    ceilPct = Math.max(ceilPct, bands.maxPct);
  }
  if (basePct != null) {
    floorPct = Math.min(floorPct, basePct);
    ceilPct = Math.max(ceilPct, basePct);
  }

  if (
    slug === "dining" &&
    rewardTypeNorm.includes("cashback") &&
    hints.length >= 2
  ) {
    const diningCap = diningCashbackTierPct(corpus);
    if (diningCap != null) {
      return {
        min: roundDisplayPct(floorPct),
        max: roundDisplayPct(Math.min(ceilPct, diningCap)),
      };
    }
  }

  if (slug === "fuel") {
    if (fuelCashbackExcluded(meta, corpus)) return null;
    const colFuel = card.fuel_reward_column;
    if (
      hasFuelSurchargeWaiverOnly(corpus) &&
      !(typeof colFuel === "number" && Number.isFinite(colFuel) && colFuel > 0)
    ) {
      if (basePct == null) return null;
      return {
        min: roundDisplayPct(basePct),
        max: roundDisplayPct(basePct),
      };
    }
    const hasFuelSignal =
      slugMatchesCorpus("fuel", corpus) ||
      (typeof colFuel === "number" && Number.isFinite(colFuel) && colFuel > 0);
    if (!hasFuelSignal) {
      if (basePct == null) return null;
      return {
        min: roundDisplayPct(basePct),
        max: roundDisplayPct(basePct),
      };
    }
  }

  const matches = slugMatchesCorpus(slug, corpus);
  if (matches) {
    if (categoryHints.length > 0) {
      const minCat = Math.min(...categoryHints);
      const maxCat = Math.max(...categoryHints);
      return {
        min: roundDisplayPct(minCat),
        max: roundDisplayPct(Math.max(maxCat, minCat)),
      };
    }
    // Conservative fallback: if category text exists but no category-tied earn signal,
    // show base earn only (instead of inheriting card-level max hints).
    if (basePct != null) {
      return {
        min: roundDisplayPct(basePct),
        max: roundDisplayPct(basePct),
      };
    }
    return null;
  }

  if (basePct == null) {
    return {
      min: roundDisplayPct(floorPct),
      max: roundDisplayPct(floorPct),
    };
  }

  return {
    min: roundDisplayPct(basePct),
    max: roundDisplayPct(basePct),
  };
}
