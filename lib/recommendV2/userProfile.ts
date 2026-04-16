export type UserProfile = {
  monthlySpend: number;
  topCategories: string[]; // e.g. ["shopping", "travel"]
  preferredRewardType: "cashback" | "points" | "miles";
  feeSensitivity: "low" | "medium" | "high";
  lifestyle: string[]; // ["traveler", "online_shopper"]
};

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

  const lifestyleRaw = o.lifestyle;
  const lifestyle = Array.isArray(lifestyleRaw)
    ? lifestyleRaw.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => s.trim())
    : [];

  return {
    ok: true,
    profile: {
      monthlySpend,
      topCategories: topCategories.slice(0, 8),
      preferredRewardType,
      feeSensitivity,
      lifestyle: lifestyle.slice(0, 10),
    },
  };
}

