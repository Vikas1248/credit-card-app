import type { Metadata } from "next";
import Link from "next/link";
import { AllCardsBrowse } from "@/components/all-cards-browse";
import { SpendCategoryIcon } from "@/components/spend-category-icons";
import { SITE_NAME } from "@/lib/site";
import { SPEND_CATEGORIES } from "@/lib/spendCategories";

const cardsTitle = `All credit cards · ${SITE_NAME}`;
const cardsDescription =
  "Search and filter the full credit card catalog: fees, networks, and optional AI-assisted ordering.";

export const metadata: Metadata = {
  title: cardsTitle,
  description: cardsDescription,
  openGraph: {
    title: cardsTitle,
    description: cardsDescription,
    url: "/cards",
  },
  twitter: {
    title: cardsTitle,
    description: cardsDescription,
  },
};

const navLinkClass =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

type PageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function CardsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = sp.q;
  const initialQuery =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? (raw[0] ?? "")
        : "";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-[10px] font-bold leading-tight text-white"
                aria-hidden
              >
                CG
              </span>
              {SITE_NAME}
            </Link>
            <nav
              className="flex flex-wrap items-center gap-1 text-sm"
              aria-label="Catalog sections"
            >
              <Link href="/#categories" className={navLinkClass}>
                Home categories
              </Link>
              {SPEND_CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className={navLinkClass}
                >
                  <SpendCategoryIcon slug={c.slug} className="h-4 w-4" />
                  {c.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <AllCardsBrowse initialQuery={initialQuery} />
    </div>
  );
}
