import type { Metadata } from "next";
import Link from "next/link";
import { AllCardsBrowse } from "@/components/all-cards-browse";
import { CredGenieLogo } from "@/components/brand/credgenie-logo";
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
  "inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 font-bold text-zinc-600 transition hover:bg-white hover:text-zinc-950 hover:shadow-sm";

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
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-950">
      <div className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-sm font-black text-zinc-950"
            >
              <CredGenieLogo />
            </Link>
            <nav
              className="flex gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-zinc-50 p-1 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
