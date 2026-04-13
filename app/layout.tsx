import type { Metadata, Viewport } from "next";
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from "@/lib/site";
import Link from "next/link";
import "./globals.css";

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
      </body>
    </html>
  );
}
