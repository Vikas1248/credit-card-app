"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SendRecommendationEmailButton } from "@/components/send-recommendation-email-button";
import type { AdvisorProfile, ChatAdvisorResponseBody } from "@/lib/chatAdvisor/types";
import type { RecommendedCard } from "@/lib/recommendV2/recommendCardsApiTypes";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const SAMPLE_PROMPTS = [
  "I use Swiggy a lot and want cashback with low fees.",
  "I shop mostly on Amazon and Flipkart every month.",
  "I travel a few times a year and want airport lounge benefits.",
  "I want a simple card for fuel and daily spends with no annual fee.",
] as const;

type QuickReply = {
  label: string;
  value: string;
};

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function assistantTextFromResponse(payload: ChatAdvisorResponseBody): string {
  if (payload.recommendations && payload.recommendations.length > 0) {
    if (payload.nextQuestion) {
      return `I found early matches. ${payload.nextQuestion}`;
    }
    return "Great, I have enough context. These are your top card matches — you can keep chatting to refine them.";
  }
  return payload.nextQuestion ?? "Tell me a bit more about your spend habits.";
}

function quickRepliesForQuestion(question: string | null): QuickReply[] {
  if (!question) return [];
  const q = question.toLowerCase();
  if (q.includes("cashback") || q.includes("travel rewards") || q.includes("balanced")) {
    return [
      { label: "Cashback", value: "cashback" },
      { label: "Travel rewards", value: "travel" },
      { label: "Balanced mix", value: "mixed" },
    ];
  }
  if (q.includes("fee-sensitive") || q.includes("low fee") || q.includes("premium perks")) {
    return [
      { label: "Low fee", value: "low" },
      { label: "Medium fee", value: "medium" },
      { label: "Premium perks", value: "high" },
    ];
  }
  if (q.includes("low, medium, or high")) {
    return [
      { label: "Low", value: "low" },
      { label: "Medium", value: "medium" },
      { label: "High", value: "high" },
    ];
  }
  return [];
}

export function CreditAdvisorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "assistant",
      text: "Hi! I can help you find the best card. Start by sharing where you spend most each month.",
    },
  ]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<AdvisorProfile>({});
  const [recommendations, setRecommendations] = useState<RecommendedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastNextQuestion, setLastNextQuestion] = useState<string | null>(null);

  const profilePills = useMemo(() => {
    const out: string[] = [];
    if (profile.shopping) out.push(`Shopping: ${profile.shopping}`);
    if (profile.dining) out.push(`Dining: ${profile.dining}`);
    if (profile.travel) out.push(`Travel: ${profile.travel}`);
    if (profile.fuel) out.push(`Fuel: ${profile.fuel}`);
    if (profile.fees) out.push(`Fees: ${profile.fees}`);
    if (profile.preferred_rewards) out.push(`Rewards: ${profile.preferred_rewards}`);
    return out;
  }, [profile]);

  const quickReplies = useMemo(
    () => quickRepliesForQuestion(lastNextQuestion),
    [lastNextQuestion]
  );

  const sendMessage = async (sampleText?: string) => {
    const text = (sampleText ?? input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    setInput("");
    setError(null);
    setLastNextQuestion(null);
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ message: text, profile }),
      });
      const payload = (await response.json()) as
        | ChatAdvisorResponseBody
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          typeof (payload as { error?: string }).error === "string"
            ? (payload as { error: string }).error
            : "Could not get advisor response."
        );
      }

      const advisorPayload = payload as ChatAdvisorResponseBody;
      setProfile(advisorPayload.profile ?? {});
      setLastNextQuestion(advisorPayload.nextQuestion ?? null);
      if (advisorPayload.recommendations) {
        setRecommendations(advisorPayload.recommendations);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: assistantTextFromResponse(advisorPayload),
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get advisor response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="rounded-[1.75rem] border border-violet-100 bg-white/95 p-4 shadow-lg shadow-violet-900/[0.08] ring-1 ring-white/70 sm:p-5">
        <h3 className="text-lg font-semibold text-zinc-950">
          Chat with credit advisor
        </h3>
        <p className="mt-1 text-sm text-zinc-600">
          Share your spending habits. I’ll ask only a couple of quick follow-ups before showing picks.
        </p>

        {messages.length === 1 ? (
          <div className="mt-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Try one
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(sample)}
                  className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {profilePills.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {profilePills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
              >
                {pill}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/60 p-3 ring-1 ring-blue-100/70">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "border border-zinc-200 bg-white text-zinc-800 shadow-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading ? (
            <p className="text-xs font-medium text-blue-600">Thinking…</p>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {quickReplies.length > 0 ? (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="text-xs font-medium text-blue-800">
              Select an option or type your answer:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply.value}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(reply.value)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reply.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. I spend a lot on Swiggy and online shopping"
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </section>

      <section className="rounded-[1.75rem] border border-blue-100 bg-white/95 p-4 shadow-lg shadow-blue-900/[0.06] ring-1 ring-white/70 sm:p-5">
        <h3 className="text-lg font-semibold text-zinc-950">
          Recommended cards
        </h3>
        <p className="mt-1 text-sm text-zinc-600">
          Deterministic ranking from your profile. AI is only used for explanation text.
        </p>

        {recommendations.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-700">
            Start the chat to see top card recommendations here.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {recommendations.map((card, idx) => (
              <article
                key={card.card_id}
                className={`rounded-xl border p-4 ${
                  idx === 0
                    ? "border-emerald-200 bg-emerald-50/60 shadow-sm"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {card.card_name}
                    </p>
                    <p className="text-xs text-zinc-500">{card.bank}</p>
                  </div>
                  <span className="rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {card.score}%
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-blue-700">
                  {formatInr(card.yearlyReward)} / year
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  {card.explanation ?? "Strong fit for your profile."}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/card/${card.card_id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
                  >
                    View details
                  </Link>
                  <Link
                    href={`/card/${card.card_id}#apply`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    Apply
                  </Link>
                </div>
                <div className="mt-2">
                  <SendRecommendationEmailButton
                    cardName={card.card_name}
                    applyLink={`/card/${card.card_id}#apply`}
                    rewards={
                      card.explanation ??
                      `Estimated yearly reward: ${formatInr(card.yearlyReward)}`
                    }
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
