import type { MetadataRoute } from "next";
import { resolvePublicOrigin } from "@/lib/siteCanonical";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await resolvePublicOrigin();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
