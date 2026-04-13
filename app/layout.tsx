import type { Metadata, Viewport } from "next";
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from "@/lib/site";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

/**
 * Matches Cuelinks’ official paste: global `var cId`, then IIFE appends `cuelinksv2.js` to `body`.
 * `cId` defaults to channel **281873**; set `NEXT_PUBLIC_CUELINKS_CHANNEL_ID` to override.
 *
 * Optional `NEXT_PUBLIC_CUELINKS_PUB_ID`: when set, emits `var pubID` first (v2 `pub_id=` mode).
 */
const CUELINKS_CID =
  process.env.NEXT_PUBLIC_CUELINKS_CHANNEL_ID?.trim() || "281873";
const CUELINKS_PUB_ID_RAW =
  process.env.NEXT_PUBLIC_CUELINKS_PUB_ID?.trim() ?? "";
const CUELINKS_PUB_ID = CUELINKS_PUB_ID_RAW || null;

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  other: {
    "verify-admitad": "367a3e7727",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-zinc-200/80 py-10 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          <p>
            {SITE_NAME} uses your inputs for illustrative estimates only. Not
            financial advice; not affiliated with banks or card networks.
          </p>
          <p className="mt-2">
            <Link
              href="/about"
              className="font-medium text-zinc-600 hover:underline dark:text-zinc-300"
            >
              About CredGenie
            </Link>{" "}
            ·{" "}
            <a
              href="mailto:support@credgenie.in"
              className="font-medium text-zinc-600 hover:underline dark:text-zinc-300"
            >
              support@credgenie.in
            </a>
          </p>
        </footer>
        <Script id="cuelinks-affiliate" strategy="afterInteractive">
          {`
${CUELINKS_PUB_ID ? `var pubID = ${JSON.stringify(CUELINKS_PUB_ID)};\n` : ""}var cId = ${JSON.stringify(CUELINKS_CID)};

(function(d, t) {
  var s = document.createElement('script');
  s.type = 'text/javascript';
  s.async = true;
  s.src = (document.location.protocol == 'https:' ? 'https://cdn0.cuelinks.com/js/' : 'http://cdn0.cuelinks.com/js/') + 'cuelinksv2.js';
  document.getElementsByTagName('body')[0].appendChild(s);
}());
          `}
        </Script>
      </body>
    </html>
  );
}
