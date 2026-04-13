/**
 * CredGenie XML sitemap at `/sitemap.xml` (Next.js Metadata Route).
 *
 * URLs use the request host when opened on a custom domain (e.g. credgenie.in), so
 * `<loc>` is not stuck on *.vercel.app. Optional: set `NEXT_PUBLIC_SITE_URL` to force
 * one canonical origin everywhere.
 */
import type { MetadataRoute } from "next";
import { SPEND_CATEGORY_SLUGS } from "@/lib/spendCategories";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePublicOrigin } from "@/lib/siteCanonical";

/** Avoid static generation with deployment hostname baked into `<loc>`. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await resolvePublicOrigin();
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
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
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

    const cardEntries: MetadataRoute.Sitemap = [...data]
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((row) => {
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
