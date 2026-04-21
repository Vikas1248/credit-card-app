export type UserProfile = {
  monthlySpend: number;
  topCategories: string[]; // e.g. ["shopping", "travel"]
  /**
   * Optional normalized per-category weights (any positive scale — not required to sum to 1).
   * When present, scoring uses these as the actual spend split instead of a coarse
   * `topCategories` heuristic. Populated by the slider-based UI.
   */
  categoryWeights?: {
    shopping?: number;
    dining?: number;
    travel?: number;
    fuel?: number;
  };
  preferredRewardType: "cashback" | "points" | "miles";
  feeSensitivity: "low" | "medium" | "high";
  lifestyle: string[]; // ["traveler", "online_shopper"]
  spendContext?: {
    shopping?: {
      onlinePct: number; // 0..100
      preferredMerchant?: "none" | "flipkart" | "amazon";
    };
    dining?: {
      deliveryPct: number; // 0..100
      preferredApp?: "none" | "swiggy" | "zomato";
    };
    travel?: {
      modes: Array<"flights" | "trains" | "hotels">;
      preferredAirline: "none" | "indigo" | "air_india" | "vistara";
      flightsPct: number; // 0..100 (share of travel spend via flights)
    };
  };
};

function clampPct(n: unknown, fallback: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseUserProfile(
  body: unknown
): { ok: true; profile: UserProfile } | { ok: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const o = body as Record<string, unknown>;

  const monthlySpend = o.monthlySpend;
  if (typeof monthlySpend !== "number" || !Number.isFinite(monthlySpend) || monthlySpend < 0) {
    return { ok: false, error: `"monthlySpend" must be a non-negative number.` };
  }

  const topCategoriesRaw = o.topCategories;
  const topCategories = Array.isArray(topCategoriesRaw)
    ? topCategoriesRaw.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => s.trim())
    : [];
  if (topCategories.length === 0) {
    return { ok: false, error: `"topCategories" must be a non-empty string array.` };
  }

  const preferredRewardType = o.preferredRewardType;
  if (preferredRewardType !== "cashback" && preferredRewardType !== "points" && preferredRewardType !== "miles") {
    return {
      ok: false,
      error: `"preferredRewardType" must be "cashback", "points", or "miles".`,
    };
  }

  const feeSensitivity = o.feeSensitivity;
  if (feeSensitivity !== "low" && feeSensitivity !== "medium" && feeSensitivity !== "high") {
    return { ok: false, error: `"feeSensitivity" must be "low", "medium", or "high".` };
  }

  const rawWeights = o.categoryWeights;
  let categoryWeights: UserProfile["categoryWeights"] | undefined;
  if (rawWeights && typeof rawWeights === "object") {
    const w = rawWeights as Record<string, unknown>;
    const out: NonNullable<UserProfile["categoryWeights"]> = {};
    for (const k of ["shopping", "dining", "travel", "fuel"] as const) {
      const v = w[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
    }
    if (Object.keys(out).length > 0) categoryWeights = out;
  }

  const lifestyleRaw = o.lifestyle;
  const lifestyle = Array.isArray(lifestyleRaw)
    ? lifestyleRaw.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => s.trim())
    : [];

  const ctxRaw = o.spendContext;
  const ctx =
    ctxRaw && typeof ctxRaw === "object" ? (ctxRaw as Record<string, unknown>) : null;

  const shoppingRaw =
    ctx?.shopping && typeof ctx.shopping === "object"
      ? (ctx.shopping as Record<string, unknown>)
      : null;
  const shoppingOnlinePct = clampPct(shoppingRaw?.onlinePct, 70);
  const preferredMerchant =
    shoppingRaw?.preferredMerchant === "flipkart" ||
    shoppingRaw?.preferredMerchant === "amazon" ||
    shoppingRaw?.preferredMerchant === "none"
      ? shoppingRaw.preferredMerchant
      : "none";

  const diningRaw =
    ctx?.dining && typeof ctx.dining === "object"
      ? (ctx.dining as Record<string, unknown>)
      : null;
  const diningDeliveryPct = clampPct(diningRaw?.deliveryPct, 55);
  const preferredDiningApp =
    diningRaw?.preferredApp === "swiggy" ||
    diningRaw?.preferredApp === "zomato" ||
    diningRaw?.preferredApp === "none"
      ? diningRaw.preferredApp
      : "none";

  const travelRaw =
    ctx?.travel && typeof ctx.travel === "object"
      ? (ctx.travel as Record<string, unknown>)
      : null;
  const travelModesRaw = Array.isArray(travelRaw?.modes) ? travelRaw?.modes : [];
  const travelModes = travelModesRaw
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toLowerCase())
    .filter(
      (v): v is "flights" | "trains" | "hotels" =>
        v === "flights" || v === "trains" || v === "hotels"
    )
    .slice(0, 4);
  const preferredAirline =
    travelRaw?.preferredAirline === "indigo" ||
    travelRaw?.preferredAirline === "air_india" ||
    travelRaw?.preferredAirline === "vistara" ||
    travelRaw?.preferredAirline === "none"
      ? travelRaw.preferredAirline
      : "none";
  const flightsPct = clampPct(travelRaw?.flightsPct, 60);

  return {
    ok: true,
    profile: {
      monthlySpend,
      topCategories: topCategories.slice(0, 8),
      ...(categoryWeights ? { categoryWeights } : {}),
      preferredRewardType,
      feeSensitivity,
      lifestyle: lifestyle.slice(0, 10),
      spendContext: {
        shopping: {
          onlinePct: shoppingOnlinePct,
          preferredMerchant,
        },
        dining: {
          deliveryPct: diningDeliveryPct,
          preferredApp: preferredDiningApp,
        },
        travel: {
          modes: travelModes,
          preferredAirline,
          flightsPct,
        },
      },
    },
  };
}

