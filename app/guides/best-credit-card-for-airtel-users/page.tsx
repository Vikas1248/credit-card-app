import type { Metadata } from "next";
import Link from "next/link";
import { AxisApplyLink } from "@/components/axis-apply-link";
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

const HERO_SUB =
  "If you're deep into the Airtel ecosystem, the right credit card can unlock serious annual savings. " +
  PAGE_DESCRIPTION;

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
            subheadline={HERO_SUB}
            savingsHighlight="Save roughly ₹15,000–₹20,000+ / year"
            primaryCta={{ href: "/#compare", label: "Compare Cards" }}
            secondaryCta={{ href: "/cards", label: "Apply Now" }}
          />

          <p className="guide-lead text-center text-sm font-medium text-zinc-500">
            Educational guide—not financial advice. Illustrative math uses example
            rates; real cashback depends on your bank, bill-pay path, and monthly
            caps. Confirm the latest MITC before you apply.
          </p>

          <GuideSection
            id="best-for"
            eyebrow="Is this for you?"
            title="Best credit card for Airtel users?"
            description="This strategy fits best when a large share of your money already flows through Airtel and partner channels."
          >
            <p className="text-base font-semibold text-zinc-800">
              If you use:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-zinc-700 sm:list-outside sm:pl-5">
              <li>Airtel broadband</li>
              <li>Airtel postpaid (for you + partner)</li>
              <li>Airtel Thanks app for bill payments</li>
              <li>
                Zomato, Blinkit, and movie bookings (where your card lists
                accelerated rewards)
              </li>
            </ul>
            <p className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/80 px-5 py-4 text-center text-base font-bold text-zinc-900 sm:text-lg">
              <strong className="text-violet-800">You</strong> could be missing
              out on{" "}
              <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                ₹15,000–₹20,000+ yearly savings
              </span>{" "}
              with the right card and payment habits.
            </p>
          </GuideSection>

          <GuideSection
            id="savings"
            eyebrow="Here’s how"
            title="How those savings can stack (illustrative)"
            description="Example only—issuers change rates, caps, and eligible merchant codes. Use this as a planning model, not a guarantee."
          >
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-2xl" aria-hidden>
                  📶
                </p>
                <h3 className="mt-2 font-black text-zinc-950">Airtel bill cashback</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  A monthly Airtel household bill of around{" "}
                  <strong>₹2,000</strong> can, in a strong bill-pay / utility
                  cashback setup, support roughly <strong>25% back</strong> on the
                  eligible portion—often modeled around{" "}
                  <strong>~₹500 cashback/month</strong> when the category and
                  cap allow it.
                </p>
                <p className="mt-3 text-sm font-bold text-emerald-800">
                  ➡️ Annual savings: ~₹6,000
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-2xl" aria-hidden>
                  🍔
                </p>
                <h3 className="mt-2 font-black text-zinc-950">
                  10% cashback on Zomato, Blinkit &amp; movie bookings
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  When your card accelerates these merchants and you use them
                  consistently, partner spend can add a meaningful second layer on
                  top of telecom.
                </p>
                <p className="mt-3 text-sm font-bold text-emerald-800">
                  ➡️ Annual savings: ~₹7,200
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-2xl" aria-hidden>
                  💡
                </p>
                <h3 className="mt-2 font-black text-zinc-950">
                  Utility bill cashback
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Extra upside when electricity, gas, or other utilities are paid
                  through paths your issuer treats as eligible—often stacked via
                  the Airtel Thanks / bill-pay journey you already use.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-2xl" aria-hidden>
                  🛒
                </p>
                <h3 className="mt-2 font-black text-zinc-950">
                  1% cashback on all other spends
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Everything outside bonus categories still earns a baseline rate—
                  important when your month isn&apos;t only telecom and delivery.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[1.75rem] border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 px-6 py-8 text-center shadow-inner">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                Total potential savings
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                ₹15,000–₹20,000{" "}
                <span className="text-xl font-bold text-zinc-600 sm:text-2xl">
                  per year
                </span>
              </p>
              <p className="mx-auto mt-3 max-w-lg text-xs text-zinc-500">
                Combined illustration across buckets above—your mix may be higher
                or lower.
              </p>
            </div>
          </GuideSection>

          <GuideSection id="bottom-line" eyebrow="Summary" title="Bottom line">
            <p className="text-lg leading-relaxed text-zinc-700">
              If you heavily use <strong>Airtel broadband</strong>,{" "}
              <strong>Airtel postpaid</strong>, and the broader{" "}
              <strong>Airtel ecosystem</strong>, the{" "}
              <strong>Airtel Axis Bank Credit Card</strong> is often the first
              product to evaluate—built for Airtel Thanks spend, utilities, and
              partner merchants (always confirm current rates and caps with Axis
              Bank).
            </p>
          </GuideSection>

          <GuideSection
            id="airtel-axis"
            eyebrow="Featured product"
            title="Airtel Axis Bank Credit Card"
            description="Co-branded by Airtel and Axis Bank—designed for bill pay via Airtel Thanks, utilities, and everyday spend. Headline benefits change over time; read the latest MITC before you apply."
          >
            <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-blue-50/80 p-6 sm:p-8">
              <p className="text-base leading-relaxed text-zinc-700">
                For many households that match this guide, the{" "}
                <strong className="text-zinc-900">
                  Airtel Axis Bank Credit Card
                </strong>{" "}
                lines up with how they already pay—fiber/postpaid through{" "}
                <strong>Airtel Thanks</strong>, utilities, and partner apps—under
                Axis Bank&apos;s published category rules and monthly caps.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-zinc-600">
                <li className="flex gap-2">
                  <span className="font-bold text-violet-600">→</span>
                  Accelerated cashback on eligible Airtel bills paid via Airtel
                  Thanks (subject to monthly caps).
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-violet-600">→</span>
                  Elevated value on categories such as utilities and select food /
                  quick commerce partners—verify merchant eligibility on each spend.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-violet-600">→</span>
                  Baseline rewards on other spends; fee waiver thresholds may apply
                  as per issuer rules.
                </li>
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-zinc-500">
                CredGenie is not a lender. Offers, fees, and rewards are controlled
                by Axis Bank; approval is subject to credit policy.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <AxisApplyLink
                  fullWidth
                  className="min-h-12 justify-center px-8 text-sm font-bold sm:w-auto sm:min-w-[12rem]"
                />
                <Link
                  href="/cards?q=Airtel+Axis"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 text-sm font-bold text-zinc-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                >
                  View in CredGenie catalog
                </Link>
              </div>
            </div>
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
            id="credgenie"
            eyebrow="Next step"
            title="Want to explore the best credit cards for your spending habits?"
            description={`Try ${SITE_NAME}—built for discovery without friction.`}
          >
            <ul className="space-y-3 text-zinc-700">
              <li className="flex gap-3">
                <span className="mt-1 font-bold text-blue-600">✓</span>
                <span>AI-powered recommendations</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 font-bold text-blue-600">✓</span>
                <span>Compare cards easily</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 font-bold text-blue-600">✓</span>
                <span>No signup required</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 font-bold text-blue-600">✓</span>
                <span>No spam calls</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 font-bold text-blue-600">✓</span>
                <span>No personal details needed for browsing and comparing</span>
              </li>
            </ul>
            <p className="mt-6 text-base font-semibold text-zinc-900">
              Discover your best-fit credit card smarter with {SITE_NAME}.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/cards"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5"
              >
                Apply Now
              </Link>
              <Link
                href="/#recommendation-quiz"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-8 text-sm font-bold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                Get recommendations
              </Link>
              <Link
                href="/#chat-advisor"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-8 text-sm font-bold text-violet-900 transition hover:bg-violet-100"
              >
                AI Advisor
              </Link>
              <Link
                href="/#compare"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/80 px-8 text-sm font-bold text-blue-800 transition hover:bg-blue-100"
              >
                Compare cards
              </Link>
            </div>
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
              items={FAQ_UI.map(({ question, answer }) => ({
                question,
                answer,
              }))}
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
