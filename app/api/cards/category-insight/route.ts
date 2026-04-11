import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/ai/openaiClient";
import {
  getOptionalCardNetworkFilter,
  parseCardNetworkParam,
} from "@/lib/cards/networkFilter";
import { computeCategoryPageInsight } from "@/lib/category/aiCategoryInsight";
import {
  isSpendCategorySlug,
  type SpendCategorySlug,
} from "@/lib/spendCategories";
import type { CardNetwork } from "@/lib/types/card";

function networkCacheKey(network: CardNetwork | null): string {
  return network ?? "all";
}

const getCachedCategoryInsight = unstable_cache(
  async (slug: SpendCategorySlug, networkKey: string): Promise<string> => {
    const network =
      networkKey === "all" ? null : parseCardNetworkParam(networkKey);
    return computeCategoryPageInsight(slug, network);
  },
  ["cardwise-category-insight-v1"],
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
    return NextResponse.json({ source: "none" as const, paragraph: null });
  }

  try {
    const paramNet = parseCardNetworkParam(searchParams.get("network"));
    const effective = paramNet ?? getOptionalCardNetworkFilter();
    const key = networkCacheKey(effective);
    const paragraph = await getCachedCategoryInsight(slug, key);
    return NextResponse.json({ source: "ai" as const, paragraph });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { source: "error" as const, paragraph: null, error: message },
      { status: 500 }
    );
  }
}
