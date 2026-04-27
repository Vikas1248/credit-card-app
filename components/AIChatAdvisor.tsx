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
      className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white p-5 shadow-md shadow-zinc-900/[0.04] sm:p-8 lg:p-10"
      aria-labelledby="chat-advisor-heading"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2
            id="chat-advisor-heading"
            className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl"
          >
            Find Your Best Card with AI
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
            Personalized recommendations in seconds.
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
