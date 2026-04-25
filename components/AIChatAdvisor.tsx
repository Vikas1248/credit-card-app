import { CreditAdvisorChat } from "@/components/chat/CreditAdvisorChat";

const promptChips = [
  "Best travel credit cards",
  "Low annual fee cards",
  "Best cashback cards",
] as const;

export function AIChatAdvisor() {
  return (
    <section
      id="chat-advisor"
      className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 shadow-lg shadow-blue-900/[0.06] sm:p-8 lg:p-10"
      aria-labelledby="chat-advisor-heading"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-700 shadow-sm">
            Colorful AI advisor
          </span>
          <h2
            id="chat-advisor-heading"
            className="mt-4 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl"
          >
            Ask in plain English. Get card matches instantly.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
            Chat is where CredGenie feels alive: quick prompts, short follow-ups,
            and deterministic recommendations once we understand your spend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {promptChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-7">
        <div className="absolute -left-2 top-5 h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
        <CreditAdvisorChat />
      </div>
    </section>
  );
}
