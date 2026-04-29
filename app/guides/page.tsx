import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const title = "Credit card guides";
const description = `Practical, SEO-friendly guides from ${SITE_NAME}—compare strategies, spend categories, and issuers before you apply.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides" },
  openGraph: { title, description, url: "/guides" },
  twitter: { title, description },
};

const guides = [
  {
    href: "/guides/best-credit-card-for-airtel-users",
    label: "Best credit card for Airtel users",
    blurb: "Broadband, postpaid, and ecosystem spend—maximize bill-pay and partner rewards.",
  },
] as const;

export default function GuidesIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600">
        {description}
      </p>
      <ul className="mt-10 space-y-4">
        {guides.map((g) => (
          <li key={g.href}>
            <Link
              href={g.href}
              className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <span className="font-bold text-zinc-900 hover:text-blue-700">
                {g.label} →
              </span>
              <span className="mt-1 block text-sm text-zinc-600">{g.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
