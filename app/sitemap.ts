import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { SPEND_CATEGORY_SLUGS } from "@/lib/spendCategories";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/cards`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...SPEND_CATEGORY_SLUGS.map((slug) => ({
      url: `${base}/category/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("credit_cards")
      .select("id, last_updated");

    if (error || !data?.length) {
      return staticEntries;
    }

    const cardEntries: MetadataRoute.Sitemap = data.map((row) => {
      let lastModified = now;
      if (row.last_updated) {
        const parsed = new Date(row.last_updated);
        if (!Number.isNaN(parsed.getTime())) lastModified = parsed;
      }
      return {
        url: `${base}/card/${row.id}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

    return [...staticEntries, ...cardEntries];
  } catch {
    return staticEntries;
  }
}
