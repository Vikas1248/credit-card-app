import Link from "next/link";

const resultCards = [
  {
    name: "HDFC Millennia Credit Card",
    score: 96,
    why: "Strong cashback fit for online shopping and dining.",
    benefit: "Up to 5% cashback on popular brands",
    fee: "₹1,000/year",
  },
  {
    name: "Axis ACE Credit Card",
    score: 91,
    why: "Simple cashback with useful everyday categories.",
    benefit: "Flat cashback on bills and spends",
    fee: "₹499/year",
  },
  {
    name: "SBI Cashback Card",
    score: 88,
    why: "Useful when online shopping is your top category.",
    benefit: "Online spend cashback focus",
    fee: "₹999/year",
  },
] as const;

export function RecommendationResults() {
  return (
    <section
      id="results"
      className="scroll-mt-28 rounded-[2rem] border border-zinc-200/70 bg-white p-5 shadow-md shadow-zinc-900/[0.04] sm:p-8 lg:p-10"
      aria-labelledby="results-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            Recommendation results
          </span>
          <h2
            id="results-heading"
            className="mt-2 text-3xl font-black tracking-tight text-zinc-950"
          >
            Top matches, easy to scan.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
            Semi-colorful result cards highlight match quality without turning
            the page into a dashboard.
          </p>
        </div>
        <a
          href="#compare"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-zinc-200 px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
        >
          Compare cards
        </a>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {resultCards.map((card, index) => (
          <article
            key={card.name}
            className="relative rounded-3xl border border-zinc-200 bg-white p-5 shadow-md shadow-zinc-900/[0.04] transition hover:-translate-y-1 hover:shadow-lg"
          >
            {index === 0 ? (
              <span className="absolute right-4 top-4 rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                🔥 Best Pick
              </span>
            ) : null}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-black text-white">
              {index + 1}
            </div>
            <h3 className="mt-5 pr-24 text-lg font-black text-zinc-950">
              {card.name}
            </h3>
            <div className="mt-4 inline-flex rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1 text-xs font-black text-white">
              {card.score}% Match
            </div>
            <p className="mt-4 text-sm font-semibold text-zinc-800">
              {card.why}
            </p>
            <p className="mt-2 text-sm text-zinc-600">{card.benefit}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Annual fee: {card.fee}
            </p>
            <div className="mt-5 flex gap-2">
              <Link
                href="/cards"
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-zinc-950 px-3 text-xs font-bold text-white transition hover:bg-zinc-800"
              >
                View Details
              </Link>
              <a
                href="#compare"
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-zinc-200 px-3 text-xs font-bold text-zinc-800 transition hover:bg-zinc-50"
              >
                Compare
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
