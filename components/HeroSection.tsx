import Link from "next/link";

const heroCards = [
  {
    name: "Cashback Plus",
    label: "Best for daily spend",
    gradient: "from-slate-950 via-blue-950 to-indigo-900",
    offset: "rotate-[-8deg] translate-y-6",
  },
  {
    name: "Travel Elite",
    label: "Lounge + miles",
    gradient: "from-blue-600 via-indigo-600 to-violet-700",
    offset: "rotate-[5deg] -translate-y-1",
  },
  {
    name: "Rewards Max",
    label: "Shopping rewards",
    gradient: "from-violet-600 via-fuchsia-600 to-orange-500",
    offset: "rotate-[-2deg] translate-y-8",
  },
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white px-5 py-10 shadow-md shadow-zinc-900/[0.04] sm:px-8 lg:px-10 lg:py-14">
      <div className="pointer-events-none absolute right-4 top-6 h-52 w-52 rounded-full bg-gradient-to-br from-violet-400/25 to-blue-400/20 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)] lg:items-center">
        <div>
          <p className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
            AI credit card advisor
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
            Find the Best Credit Card for You in{" "}
            <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              60 Seconds
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600 sm:text-lg">
            AI-powered recommendations. No spam. No credit score impact.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#recommendation-quiz"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/25"
            >
              Start Recommendation
            </a>
            <Link
              href="/cards"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 text-sm font-bold text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50"
            >
              Browse Cards
            </Link>
          </div>

          <p className="mt-5 text-sm font-semibold text-zinc-600">
            🔒 Safe • ⚡ Instant • 🇮🇳 Built for India
          </p>
        </div>

        <div className="relative mx-auto h-[360px] w-full max-w-md">
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-500/20 via-blue-500/20 to-orange-300/20 blur-3xl" />
          {heroCards.map((card, index) => (
            <div
              key={card.name}
              className={`absolute left-1/2 top-1/2 w-[82%] -translate-x-1/2 rounded-[1.75rem] bg-gradient-to-br ${card.gradient} p-5 text-white shadow-2xl shadow-blue-950/20 transition duration-300 hover:-translate-y-2 ${card.offset}`}
              style={{ zIndex: heroCards.length - index }}
            >
              <div className="flex items-start justify-between">
                <div className="h-9 w-12 rounded-lg bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 shadow-inner" />
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
                  {index === 0 ? "Visa" : index === 1 ? "Amex" : "RuPay"}
                </span>
              </div>
              <p className="mt-10 text-lg font-black">{card.name}</p>
              <p className="mt-2 text-sm text-white/75">{card.label}</p>
              <div className="mt-6 flex items-center justify-between text-xs text-white/70">
                <span>**** **** **** 2048</span>
                <span>CredGenie</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
