import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_NAME } from "@/lib/site";
import { CredGenieLogo } from "@/components/brand/credgenie-logo";
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
    return { title: `Category · ${SITE_NAME}` };
  }
  const { label, blurb } = spendCategoryBySlug(raw);
  return {
    title: `${label} credit cards · ${SITE_NAME}`,
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
      <div className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-black text-zinc-950"
          >
            <CredGenieLogo />
          </Link>
          <nav
            className="flex gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-zinc-50 p-1 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Catalog"
          >
            <Link
              href="/cards"
              className="inline-flex items-center rounded-full border border-transparent px-3 py-1.5 font-bold text-zinc-600 transition hover:bg-white hover:text-zinc-950 hover:shadow-sm"
            >
              All cards
            </Link>
            {SPEND_CATEGORIES.filter((c) => c.slug !== raw).map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 font-bold text-zinc-600 transition hover:bg-white hover:text-zinc-950 hover:shadow-sm"
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
