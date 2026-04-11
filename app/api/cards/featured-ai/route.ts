import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/ai/openaiClient";
import {
  getOptionalCardNetworkFilter,
  parseCardNetworkParam,
} from "@/lib/cards/networkFilter";
import {
  computeFeaturedCarouselPicks,
  type FeaturedAiPick,
} from "@/lib/featured/aiFeaturedCarousel";
import type { CardNetwork } from "@/lib/types/card";

function networkCacheKey(network: CardNetwork | null): string {
  return network ?? "all";
}

const getCachedFeaturedPicks = unstable_cache(
  async (networkKey: string): Promise<FeaturedAiPick[]> => {
    const network =
      networkKey === "all" ? null : parseCardNetworkParam(networkKey);
    return computeFeaturedCarouselPicks(network);
  },
  ["credgenie-featured-ai-v1"],
  { revalidate: 3600 }
);

export async function GET(request: Request) {
  if (!isOpenAiConfigured()) {
    return NextResponse.json({ source: "none" as const, picks: [] });
  }

  try {
    const { searchParams } = new URL(request.url);
    const paramNet = parseCardNetworkParam(searchParams.get("network"));
    const effective = paramNet ?? getOptionalCardNetworkFilter();
    const key = networkCacheKey(effective);
    const picks = await getCachedFeaturedPicks(key);
    return NextResponse.json({ source: "ai" as const, picks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { source: "error" as const, picks: [], error: message },
      { status: 500 }
    );
  }
}
