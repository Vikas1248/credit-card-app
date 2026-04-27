import { CreditAdvisorChat } from "@/components/chat/CreditAdvisorChat";

export function AIChatAdvisor() {
  return (
    <section
      id="chat-advisor"
      className="relative scroll-mt-28 overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 shadow-xl shadow-violet-900/[0.08] sm:p-8 lg:p-10"
      aria-labelledby="chat-advisor-heading"
    >
      <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            AI advisor
          </span>
          <h2
            id="chat-advisor-heading"
            className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl"
          >
            Find Your Best Card with AI
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
            Personalized recommendations in seconds.
          </p>
        </div>
      </div>

      <div className="relative mt-7">
        <div className="absolute -left-2 top-5 h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
        <CreditAdvisorChat />
      </div>
    </section>
  );
}
