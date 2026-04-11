import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpendCategoryIcon } from "@/components/spend-category-icons";
import { CategoryBrowseClient } from "@/components/category-browse-client";
import {
  isSpendCategorySlug,
  SPEND_CATEGORIES,
  spendCategoryBySlug,
  type SpendCategorySlug,
} from "@/lib/spendCategories";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  if (!isSpendCategorySlug(raw)) {
    return { title: "Category · Cardwise" };
  }
  const { label, blurb } = spendCategoryBySlug(raw);
  return {
    title: `${label} credit cards · Cardwise`,
    description: blurb,
  };
}

export async function generateStaticParams(): Promise<{ slug: SpendCategorySlug }[]> {
  return SPEND_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug: raw } = await params;
  if (!isSpendCategorySlug(raw)) {
    notFound();
  }

  return (
    <>
      <div className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white"
              aria-hidden
            >
              C
            </span>
            Cardwise
          </Link>
          <nav
            className="flex flex-wrap gap-1 text-sm"
            aria-label="Other categories"
          >
            {SPEND_CATEGORIES.filter((c) => c.slug !== raw).map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <SpendCategoryIcon slug={c.slug} className="h-4 w-4" />
                {c.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <CategoryBrowseClient slug={raw} />
    </>
  );
}
