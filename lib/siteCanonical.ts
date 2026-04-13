import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/site";

function isVercelDeploymentHost(host: string): boolean {
  return /\.vercel\.app$/i.test(host.trim());
}

function isLocalHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return (
    h.startsWith("localhost") ||
    h.startsWith("127.0.0.1") ||
    h === "[::1]" ||
    h.startsWith("[::1]:")
  );
}

/**
 * Prefer custom domain over *.vercel.app: forwarded chains sometimes list the deployment
 * host first, which made `<loc>` wrong for credgenie.in even in incognito.
 */
function pickRequestHost(h: Headers): string {
  const candidates: string[] = [];
  const forwarded = h.get("x-forwarded-host");
  if (forwarded) {
    for (const part of forwarded.split(",")) {
      const t = part.trim();
      if (t) candidates.push(t);
    }
  }
  const hostHeader = h.get("host")?.trim();
  if (hostHeader) candidates.push(hostHeader);

  const preferred = candidates.find(
    (x) => !isVercelDeploymentHost(x) && !isLocalHost(x)
  );
  if (preferred) return preferred;

  const nonLocal = candidates.find((x) => !isLocalHost(x));
  if (nonLocal) return nonLocal;

  return candidates[0] ?? "";
}

/**
 * Canonical `https://…` origin for sitemap.xml and robots.txt.
 * Server-only (uses `headers()`).
 *
 * Order: `NEXT_PUBLIC_SITE_URL` → best Host / X-Forwarded-Host (skip *.vercel.app when
 * a custom domain is present) → `getSiteUrl()` fallback.
 */
export async function resolvePublicOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  try {
    const h = await headers();
    const host = pickRequestHost(h);
    if (host) {
      const protoRaw = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const proto = protoRaw === "http" ? "http" : "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    /* no request context */
  }
  return getSiteUrl().replace(/\/$/, "");
}
