import type { Metadata } from "next";
import Link from "next/link";
import { GuideFaq } from "@/components/guides/GuideFaq";
import { GuideFinalCta } from "@/components/guides/GuideFinalCta";
import { GuideHero } from "@/components/guides/GuideHero";
import { GuideSection } from "@/components/guides/GuideSection";
import { StructuredData } from "@/components/guides/StructuredData";
import { getSiteUrl, SITE_NAME } from "@/lib/site";

const PATH = "/guides/best-credit-card-for-airtel-users";

const PAGE_TITLE =
  "Best Credit Card for Airtel Users in India (Save ₹15,000–₹20,000+ Annually)";

const PAGE_DESCRIPTION =
  "Discover how Airtel users can maximize cashback on broadband, postpaid, utility bills, Zomato, Blinkit, and more using the right credit card.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PATH,
    type: "article",
    siteName: SITE_NAME,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

const FAQ_UI = [
  {
    question: "Is there one single “best” credit card for every Airtel user?",
    answer: (
      <>
        No. The best card depends on{" "}
        <strong>how you pay</strong> (BBPS vs cards),{" "}
        <strong>your monthly bills</strong>, and{" "}
        <strong>whether partner merchants</strong> (food delivery, grocery)
        match your card&apos;s bonus categories. Use CredGenie&apos;s{" "}
        <Link href="/cards" className="font-semibold text-blue-700 underline">
          browse & compare
        </Link>{" "}
        tools to shortlist options, then confirm rates with your bank.
      </>
    ),
    answerPlain:
      "No. The best card depends on how you pay (BBPS vs cards), your monthly bills, and whether partner merchants match your card's bonus categories. Use CredGenie's browse and compare tools to shortlist options, then confirm rates with your bank.",
  },
  {
    question: "Why do cashback limits matter for bill payments?",
    answer: (
      <>
        Many cards cap accelerated cashback on{" "}
        <strong>utilities, wallet loads, or telecom</strong> after a monthly
        threshold. If your Airtel fiber + postpaid + add-ons exceed those caps,
        your effective reward rate drops. Always read the{" "}
        <strong>MITC</strong> and bank pages for the latest caps and excluded
        merchant categories.
      </>
    ),
    answerPlain:
      "Many cards cap accelerated cashback on utilities, wallet loads, or telecom after a monthly threshold. If your Airtel bills exceed those caps, your effective reward rate drops. Always read the MITC and bank pages for the latest caps and excluded merchant categories.",
  },
  {
    question: "When is an annual fee worth it for Airtel-heavy spenders?",
    answer: (
      <>
        A fee can pay for itself if{" "}
        <strong>net rewards minus the fee</strong> beats free cards on your
        actual statement mix—including Airtel Black / broadband bundles,
        partner apps, and everyday spend. Model your last 3 months of spends,
        then compare{" "}
        <Link href="/#compare" className="font-semibold text-blue-700 underline">
          two cards side by side
        </Link>{" "}
        on CredGenie before you apply.
      </>
    ),
    answerPlain:
      "A fee can pay for itself if net rewards minus the fee beats free cards on your actual statement mix. Model your last three months of spends, then compare two cards side by side on CredGenie before you apply.",
  },
  {
    question: "Does paying Airtel via BBPS earn the same rewards as card apps?",
    answer: (
      <>
        Not always. Some cards treat{" "}
        <strong>BBPS / bill-pay rails</strong> differently from direct merchant
        spends on food or shopping apps. Check whether your bank classifies your
        payment path as eligible for accelerated cashback or rewards points.
      </>
    ),
    answerPlain:
      "Not always. Some cards treat BBPS and bill-pay rails differently from direct merchant spends on food or shopping apps. Check whether your bank classifies your payment path as eligible for accelerated cashback or rewards points.",
  },
];

export default function BestCreditCardAirtelGuidePage() {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}${PATH}`;
  const published = "2026-04-27";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: `${siteUrl}/guides`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: PAGE_TITLE,
        item: pageUrl,
      },
    ],
  };

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    datePublished: published,
    dateModified: published,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    isAccessibleForFree: true,
    inLanguage: "en-IN",
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_UI.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answerPlain,
      },
    })),
  };

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: siteUrl,
    },
  };

  return (
    <>
      <StructuredData
        data={[webPageLd, articleLd, breadcrumbLd, faqLd]}
      />

      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <nav aria-label="Breadcrumb" className="text-sm text-zinc-600">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="font-medium text-blue-700 hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden className="text-zinc-400">
              /
            </li>
            <li>
              <Link
                href="/guides"
                className="font-medium text-blue-700 hover:underline"
              >
                Guides
              </Link>
            </li>
            <li aria-hidden className="text-zinc-400">
              /
            </li>
            <li className="font-medium text-zinc-900">Airtel users</li>
          </ol>
        </nav>

        <div className="mt-8 space-y-10 lg:space-y-14">
          <GuideHero
            eyebrow="India · Telecom & rewards"
            headline={
              <>
                Best Credit Card for{" "}
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  Airtel Users
                </span>{" "}
                in India
              </>
            }
            subheadline={PAGE_DESCRIPTION}
            savingsHighlight="Save roughly ₹15,000–₹20,000+ / year"
            primaryCta={{ href: "/#compare", label: "Compare Cards" }}
            secondaryCta={{ href: "/cards", label: "Apply Now" }}
          />

          <p className="guide-lead text-center text-sm font-medium text-zinc-500">
            Educational guide—not financial advice. Rewards, categories, and fees
            change; confirm details with issuers before applying.
          </p>

          <GuideSection
            id="savings"
            eyebrow="Where savings come from"
            title="Savings breakdown (typical Airtel-heavy household)"
            description="Illustrative buckets you can optimize when your card’s bonus categories align with broadband, postpaid, utilities, and partner merchants."
          >
            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-black uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Spend bucket</th>
                    <th className="px-4 py-3 sm:px-5">Why it matters</th>
                    <th className="px-4 py-3 sm:px-5">Example lever</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="px-4 py-4 font-semibold text-zinc-900 sm:px-5">
                      Airtel bills
                    </td>
                    <td className="px-4 py-4 text-zinc-600 sm:px-5">
                      Fiber, postpaid family plans, add-ons—often a predictable
                      monthly chunk when paid on-card or via eligible rails.
                    </td>
                    <td className="px-4 py-4 text-zinc-600 sm:px-5">
                      Cards with strong utility / online bill-pay rewards (watch
                      caps).
                    </td>
                  </tr>
                  <tr className="bg-zinc-50/50">
                    <td className="px-4 py-4 font-semibold text-zinc-900 sm:px-5">
                      Dining & grocery
                    </td>
                    <td className="px-4 py-4 text-zinc-600 sm:px-5">
                      Partner ecosystems often overlap with food delivery and quick
                      commerce where accelerated cashback is common.
                    </td>
                    <td className="px-4 py-4 text-zinc-600 sm:px-5">
                      Category bonuses on select merchants—verify MCC eligibility.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 font-semibold text-zinc-900 sm:px-5">
                      Utility & BBPS-style bills
                    </td>
                    <td className="px-4 py-4 text-zinc-600 sm:px-5">
                      Electricity, gas, water—stack with bill-pay promotions when
                      your issuer counts them.
                    </td>
                    <td className="px-4 py-4 text-zinc-600 sm:px-5">
                      Separate monthly caps from telecom—plan payment timing.
                    </td>
                  </tr>
                  <tr className="bg-zinc-50/50">
                    <td className="px-4 py-4 font-semibold text-zinc-900 sm:px-5">
                      General spending
                    </td>
                    <td className="px-4 py-4 text-zinc-600 sm:px-5">
                      Everything else should still earn a{" "}
                      <strong className="text-zinc-800">respectable base rate</strong>
                      —especially if Airtel isn’t your biggest line item.
                    </td>
                    <td className="px-4 py-4 text-zinc-600 sm:px-5">
                      Flat cashback cards vs category kings—compare on{" "}
                      <Link href="/cards" className="font-semibold text-blue-700 underline">
                        CredGenie
                      </Link>
                      .
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GuideSection>

          <GuideSection
            id="who"
            eyebrow="Fit check"
            title="Who should prioritize this strategy?"
          >
            <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
              {[
                {
                  title: "Airtel broadband households",
                  body: "High fiber ARPU plus predictable recharge cycles—ideal if your card rewards online utilities or telecom spends.",
                },
                {
                  title: "Couples on postpaid",
                  body: "Multiple lines and add-ons increase monthly telecom volume; watch issuer caps so accelerated rates don’t clip early.",
                },
                {
                  title: "Frequent Airtel Thanks / ecosystem users",
                  body: "If you already route spends through partner brands (food, travel, lifestyle), align those merchants with your card’s bonus categories.",
                },
              ].map((card) => (
                <li
                  key={card.title}
                  className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/80 to-white p-5 shadow-sm"
                >
                  <h3 className="font-black text-zinc-950">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {card.body}
                  </p>
                </li>
              ))}
            </ul>
          </GuideSection>

          <GuideSection
            id="pros-cons"
            eyebrow="Reality check"
            title="Pros & cons (cashback-focused picks)"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
                <h3 className="text-lg font-black text-emerald-900">Strengths</h3>
                <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-emerald-900/90">
                  <li>
                    Strong upside when bonus categories match broadband, utilities,
                    and partner merchants you already use.
                  </li>
                  <li>
                    Predictable bills make it easier to model annual value vs annual
                    fees.
                  </li>
                  <li>
                    Works well with monthly budgeting—you can track caps on the{" "}
                    <strong>issuer app</strong>.
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6">
                <h3 className="text-lg font-black text-amber-950">Trade-offs</h3>
                <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-amber-950/95">
                  <li>
                    Spending caps and merchant eligibility rules can reduce realized
                    cashback vs headline rates.
                  </li>
                  <li>
                    BBPS / wallet routing may not always qualify—verify each payment
                    path.
                  </li>
                  <li>
                    Annual fees hurt if your spend mix shifts away from rewarded
                    categories mid-year.
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-6 text-sm text-zinc-600">
              <strong>Suitability:</strong> Best for users who pay large recurring
              bills on-card and can monitor categories monthly. Light spenders may
              prefer a simple lifetime-free flat-rate card—see{" "}
              <Link href="/cards" className="font-semibold text-blue-700 underline">
                browse filters
              </Link>
              .
            </p>
          </GuideSection>

          <GuideSection
            id="alternatives"
            eyebrow="Explore further"
            title="Alternatives & comparisons"
            description="No single issuer wins every scenario. Rotate between category specialists and flat cashback depending on your household mix."
          >
            <div className="flex flex-col gap-4">
              <Link
                href="/cards"
                className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md"
              >
                <span className="font-bold text-zinc-900 group-hover:text-blue-700">
                  Browse all cashback & utility-friendly cards →
                </span>
                <span className="mt-1 block text-sm text-zinc-600">
                  Filter by network, annual fee, and reward type—then open details.
                </span>
              </Link>
              <Link
                href="/#compare"
                className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md"
              >
                <span className="font-bold text-zinc-900 group-hover:text-blue-700">
                  Compare two cards side by side →
                </span>
                <span className="mt-1 block text-sm text-zinc-600">
                  Paste your shortlist and stress-test fees vs rewards.
                </span>
              </Link>
              <Link
                href="/about"
                className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md"
              >
                <span className="font-bold text-zinc-900 group-hover:text-blue-700">
                  Why CredGenie →
                </span>
                <span className="mt-1 block text-sm text-zinc-600">
                  Transparent discovery—estimates only; always confirm with your bank.
                </span>
              </Link>
            </div>
          </GuideSection>

          <GuideSection id="faq" eyebrow="FAQ" title="Common questions">
            <GuideFaq
            items={FAQ_UI.map(({ question, answer }) => ({ question, answer }))}
          />
          </GuideSection>

          <GuideFinalCta
            title="Turn insight into your next card"
            description="Run spend-led picks with CredGenie’s quiz and AI advisor, then jump to issuer pages when you’re ready."
          />

          <footer className="border-t border-zinc-200 pt-8 text-center text-xs text-zinc-500">
            © {new Date().getFullYear()} {SITE_NAME}. Guides are for education only.
            Card names, rates, and eligibility are issuer-specific.
          </footer>
        </div>
      </article>
    </>
  );
}
