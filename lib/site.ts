/** Product name and copy used in metadata, PWA manifest, and UI. */

/**
 * Canonical site origin for sitemaps, Open Graph URLs, and robots.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://yoursite.com).
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

/**
 * LinkedIn company or profile URL for footer / about.
 * Override with `NEXT_PUBLIC_LINKEDIN_URL` (must be a linkedin.com URL).
 */
export function getSiteLinkedInUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_LINKEDIN_URL?.trim() ||
    "https://www.linkedin.com/company/credgenie";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
    url.search = "";
    url.hash = "";
    const out = url
      .toString()
      .replace(/\/$/, "")
      .replace(/^http:\/\//i, "https://");
    return out;
  } catch {
    return null;
  }
}

export const SITE_NAME = "CredGenie";

/** Browser tab / PWA install title. */
export const SITE_TITLE = `${SITE_NAME} — Smart credit card picks for India`;

/**
 * SEO and social: what the product does in one breath.
 */
export const SITE_DESCRIPTION =
  "CredGenie helps you explore Indian credit cards: search and filter by fees and network, browse dining, travel, shopping, and fuel picks, match cards to your monthly spend, and compare two products side by side—with optional AI summaries when configured. Estimates only; always confirm fees and rewards with your bank.";

/** Shorter line for manifest / compact UI. */
export const SITE_TAGLINE =
  "Discover, filter, and compare Indian credit cards—spend match, AI insights, and clear fees in one place.";

/** Home page: what CredGenie is (first paragraph under the headline). */
export const SITE_ABOUT_LEAD =
  "CredGenie is a credit card discovery companion for India: one place to explore products, fees, and rewards before you apply.";
