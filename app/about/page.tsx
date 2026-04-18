import type { Metadata } from "next";
import Link from "next/link";
import { getSiteLinkedInUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

const aboutTitle = `About ${SITE_NAME}`;

export const metadata: Metadata = {
  title: aboutTitle,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: aboutTitle,
    description: SITE_DESCRIPTION,
    url: "/about",
  },
  twitter: {
    title: aboutTitle,
    description: SITE_DESCRIPTION,
  },
};

export default function AboutPage() {
  const linkedInUrl = getSiteLinkedInUrl();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 text-zinc-900 dark:text-zinc-100 sm:px-6 sm:py-16">
      <Link
        href="/"
        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to home
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
        About {SITE_NAME}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
        {SITE_NAME} helps you discover and compare Indian credit cards in one
        place. You can search the full catalog, filter by fees and network,
        browse by spend category, compare two cards side by side, and estimate
        rewards from your own monthly spend mix.
      </p>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white/70 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold">Need help?</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          For queries, corrections, or support, email us at{" "}
          <a
            href="mailto:support@credgenie.in"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            support@credgenie.in
          </a>
          .
          {linkedInUrl ? (
            <>
              {" "}
              You can also connect on{" "}
              <a
                href={linkedInUrl}
                target="_blank"
                rel="noopener noreferrer me"
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                LinkedIn
              </a>
              .
            </>
          ) : null}
        </p>
      </section>
    </main>
  );
}
