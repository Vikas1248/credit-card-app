import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/ai/openaiClient";
import { mergeOrderWithAllIds, toCardBrief } from "@/lib/ai/cardBrief";
import { fetchAiCategoryOrder } from "@/lib/category/aiCategoryOrder";
import {
  getOptionalCardNetworkFilter,
  parseCardNetworkParam,
} from "@/lib/cards/networkFilter";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  isSpendCategorySlug,
  type SpendCategorySlug,
} from "@/lib/spendCategories";
import type { CardNetwork } from "@/lib/types/card";

const SELECT_BRIEF =
  "id, card_name, bank, annual_fee, reward_type, dining_reward, travel_reward, shopping_reward, fuel_reward, best_for";

function networkCacheKey(network: CardNetwork | null): string {
  return network ?? "all";
}

async function computeCategoryOrder(
  slug: SpendCategorySlug,
  networkKey: string
): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const network =
    networkKey === "all" ? null : parseCardNetworkParam(networkKey);

  let q = supabase.from("credit_cards").select(SELECT_BRIEF).limit(200);
  if (network) {
    q = q.eq("network", network);
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const briefs = rows.map((r) =>
    toCardBrief(
      r as {
        id: string;
        card_name: string;
        bank: string;
        annual_fee: number;
        reward_type: string;
        dining_reward: number | null;
        travel_reward: number | null;
        shopping_reward: number | null;
        fuel_reward: number | null;
        best_for: string | null;
      }
    )
  );

  if (briefs.length === 0) {
    return [];
  }

  const allIds = briefs.map((b) => b.id);
  const nameSort = [...allIds].sort((a, b) => {
    const na = briefs.find((x) => x.id === a)?.card_name ?? "";
    const nb = briefs.find((x) => x.id === b)?.card_name ?? "";
    return na.localeCompare(nb);
  });
  try {
    const ranked = await fetchAiCategoryOrder(slug, briefs);
    return ranked ? mergeOrderWithAllIds(ranked, allIds) : nameSort;
  } catch {
    return nameSort;
  }
}

const getCachedCategoryOrder = unstable_cache(
  async (slug: SpendCategorySlug, networkKey: string) =>
    computeCategoryOrder(slug, networkKey),
  ["cardwise-category-order-ai-v1"],
  { revalidate: 1800 }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugRaw = searchParams.get("slug")?.trim() ?? "";
  if (!isSpendCategorySlug(slugRaw)) {
    return NextResponse.json(
      { error: "Invalid or missing slug (dining, travel, shopping, fuel)." },
      { status: 400 }
    );
  }
  const slug = slugRaw as SpendCategorySlug;

  if (!isOpenAiConfigured()) {
    return NextResponse.json({ source: "none" as const, ordered_ids: null });
  }

  try {
    const paramNet = parseCardNetworkParam(searchParams.get("network"));
    const effective = paramNet ?? getOptionalCardNetworkFilter();
    const key = networkCacheKey(effective);
    const ordered_ids = await getCachedCategoryOrder(slug, key);
    return NextResponse.json({ source: "ai" as const, ordered_ids });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { source: "error" as const, ordered_ids: null, error: message },
      { status: 500 }
    );
  }
}
