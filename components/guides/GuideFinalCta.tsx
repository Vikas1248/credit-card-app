import Link from "next/link";

type GuideFinalCtaProps = {
  title: string;
  description: string;
};

export function GuideFinalCta({ title, description }: GuideFinalCtaProps) {
  return (
    <aside className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-gradient-to-br from-violet-600 via-blue-600 to-blue-700 p-8 text-center shadow-xl shadow-blue-900/20 sm:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.25) 0%, transparent 40%)",
        }}
        aria-hidden
      />
      <div className="relative">
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
          {description}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/#recommendation-quiz"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-white px-8 text-sm font-bold text-blue-700 shadow-lg transition hover:-translate-y-0.5 sm:w-auto"
          >
            Personalized recommendations
          </Link>
          <Link
            href="/#chat-advisor"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-white/40 bg-white/10 px-8 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20 sm:w-auto"
          >
            AI Advisor
          </Link>
          <Link
            href="/cards"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/50 px-8 text-sm font-bold text-white transition hover:bg-white/15 sm:w-auto"
          >
            Browse & apply
          </Link>
        </div>
      </div>
    </aside>
  );
}
