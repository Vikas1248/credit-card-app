"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SendRecommendationEmailButton } from "@/components/send-recommendation-email-button";
import { cardApplyButtonClass } from "@/lib/cardCta";
import type {
  ChatAdvisorResponseBody,
  CredGenieAdvisorProfile,
} from "@/lib/chatAdvisor/types";
import type { RecommendedCard } from "@/lib/recommendV2/recommendCardsApiTypes";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const SAMPLE_PROMPTS = [
  "I use Airtel for broadband and prepaid — mostly digital spend.",
  "I travel frequently and want lounge access when I fly domestic.",
  "I spend heavily on Swiggy and want cashback, low annual fee.",
  "I shop on Amazon every month and occasionally book international flights.",
] as const;

const SESSION_ID_KEY = "credgenie:advisor-session-id";

type QuickReply = {
  label: string;
  value: string;
};

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function assistantTextFromResponse(payload: ChatAdvisorResponseBody): string {
  const reasoning = payload.reasoningBrief?.trim();
  if (payload.recommendations && payload.recommendations.length > 0) {
    const head = reasoning ? `${reasoning}\n\n` : "";
    return `${head}Here are three picks ranked by CredGenie's deterministic score — explanations may use AI wording.`;
  }
  const q = payload.nextQuestion ?? "Tell me a bit more so I can tune rewards.";
  return reasoning ? `${reasoning}\n\n${q}` : q;
}

function quickRepliesForQuestion(question: string | null): QuickReply[] {
  if (!question) return [];
  const q = question.toLowerCase();
  if (q.includes("cashback") || q.includes("travel points") || q.includes("balanced mix")) {
    return [
      { label: "Cashback", value: "I prefer cashback." },
      { label: "Travel points", value: "I prefer travel points or miles." },
      { label: "Balanced", value: "A balanced mix works for me." },
    ];
  }
  if (q.includes("fee") || q.includes("premium fees")) {
    return [
      { label: "Low / no fee", value: "I'm strictly low or no annual fee." },
      { label: "Mid fee okay", value: "Medium fees are fine if perks justify." },
      { label: "Premium OK", value: "I'm open to premium fees for lounges." },
    ];
  }
  if (q.includes("domestic") && q.includes("international")) {
    return [
      { label: "Mostly domestic", value: "Mostly domestic India flights." },
      { label: "Mostly international", value: "Mostly international trips." },
      { label: "Mixed", value: "Fairly mixed domestic and international." },
    ];
  }
  if (q.includes("monthly") || q.includes("figure") || q.includes("spend")) {
    return [
      { label: "~₹25k/mo", value: "About 25000 per month on cards." },
      { label: "~₹50k/mo", value: "About 50000 per month on cards." },
      { label: "~₹1L/mo", value: "About 100000 per month on cards." },
    ];
  }
  if (/\b(low|medium|high)\b/.test(q) && q.includes("shopping")) {
    return [
      { label: "Low", value: "Shopping spend is low." },
      { label: "Medium", value: "Shopping spend is medium." },
      { label: "High", value: "Shopping spend is high." },
    ];
  }
  return [];
}

function profileSummaryLines(profile: CredGenieAdvisorProfile): string[] {
  const lines: string[] = [];
  if (typeof profile.monthlySpend === "number" && profile.monthlySpend >= 5000) {
    lines.push(`Monthly card spend ~ ${formatInr(profile.monthlySpend)}`);
  }
  if (profile.telecomEcosystem && profile.telecomEcosystem !== "none") {
    lines.push(`Telecom: ${profile.telecomEcosystem}`);
  }
  if (profile.preferredBrands?.length) {
    lines.push(`Brands: ${profile.preferredBrands.join(", ")}`);
  }
  if (profile.travelFrequency) lines.push(`Travel cadence: ${profile.travelFrequency}`);
  if (profile.travelType) lines.push(`Travel type: ${profile.travelType}`);
  if (profile.loungePriority && profile.loungePriority !== "none") {
    lines.push(`Lounges: ${profile.loungePriority.replace(/_/g, " ")}`);
  }
  return lines;
}

export function CreditAdvisorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "assistant",
      text: "Hi — I'm CredGenie. Describe your spend in your own words (telecom, travel, apps you use). I'll ask one sharp follow-up at a time until we're confident enough for picks.",
    },
  ]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<CredGenieAdvisorProfile>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedCard[]>([]);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  /** Avoid showing 0% before any server round-trip (reads like a bug). */
  const [confidenceReady, setConfidenceReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastNextQuestion, setLastNextQuestion] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_ID_KEY);
      if (raw && raw.length >= 16) setSessionId(raw);
      else {
        const id = newSessionId();
        sessionStorage.setItem(SESSION_ID_KEY, id);
        setSessionId(id);
      }
    } catch {
      setSessionId(newSessionId());
    }
  }, []);

  const profilePills = useMemo(() => {
    const out: string[] = [];
    if (profile.shopping) out.push(`Shopping: ${profile.shopping}`);
    if (profile.dining) out.push(`Dining: ${profile.dining}`);
    if (profile.travel) out.push(`Travel: ${profile.travel}`);
    if (profile.fuel) out.push(`Fuel: ${profile.fuel}`);
    if (profile.fees) out.push(`Fee comfort: ${profile.fees}`);
    if (profile.preferred_rewards) out.push(`Rewards: ${profile.preferred_rewards}`);
    if (profile.telecomEcosystem && profile.telecomEcosystem !== "none") {
      out.push(`Telco: ${profile.telecomEcosystem}`);
    }
    for (const b of profile.preferredBrands ?? []) {
      if (out.length < 14) out.push(b);
    }
    return out;
  }, [profile]);

  const summaryLines = useMemo(() => profileSummaryLines(profile), [profile]);

  const quickReplies = useMemo(
    () => quickRepliesForQuestion(lastNextQuestion),
    [lastNextQuestion]
  );

  const sendMessage = async (sampleText?: string) => {
    const text = (sampleText ?? input).trim();
    if (!text || loading) return;
    if (!sessionId) return;

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
        body: JSON.stringify({ message: text, profile, sessionId }),
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
      if (advisorPayload.sessionId) {
        setSessionId(advisorPayload.sessionId);
        try {
          sessionStorage.setItem(SESSION_ID_KEY, advisorPayload.sessionId);
        } catch {
          /* ignore */
        }
      }
      setConfidenceScore(
        typeof advisorPayload.confidenceScore === "number"
          ? advisorPayload.confidenceScore
          : 0
      );
      setConfidenceReady(true);
      setLastNextQuestion(advisorPayload.nextQuestion ?? null);

      if (advisorPayload.recommendations?.length) {
        setRecommendations(advisorPayload.recommendations);
      } else if (advisorPayload.nextQuestion) {
        setRecommendations([]);
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

  const pct = Math.round(Math.min(100, Math.max(0, confidenceScore * 100)));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="rounded-[1.75rem] border border-violet-100 bg-white/95 p-4 shadow-lg shadow-violet-900/[0.08] ring-1 ring-white/70 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              className="text-lg font-semibold text-zinc-950"
              title="Your chat updates a structured profile; card order always comes from CredGenie's scoring engine, not from the AI that writes questions."
            >
              CredGenie advisor
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Describe how you spend in plain language — I&apos;ll narrow it down with one follow-up
              at a time, then surface card picks matched to that profile.
            </p>
          </div>
          <div className="min-w-[140px] flex-1 rounded-2xl border border-violet-100 bg-violet-50/50 px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
              Profile confidence
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-violet-200/80">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600 transition-[width] duration-500 ease-out ${
                  !confidenceReady ? "opacity-40" : ""
                }`}
                style={{ width: confidenceReady ? `${pct}%` : "0%" }}
              />
            </div>
            <p className="mt-1 text-xs font-medium text-violet-900">
              {confidenceReady ? (
                `${pct}%`
              ) : (
                <span className="font-normal text-violet-700/90">Updates after your first reply</span>
              )}
            </p>
          </div>
        </div>

        {messages.length === 1 ? (
          <div className="mt-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Try saying
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  disabled={loading || !sessionId}
                  onClick={() => void sendMessage(sample)}
                  className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {summaryLines.length > 0 ? (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700">
            <p className="font-semibold text-zinc-900">Live profile summary</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
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
                {m.role === "assistant" ? (
                  <div className="whitespace-pre-wrap">{m.text}</div>
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}
          {loading ? (
            <p className="text-xs font-medium text-blue-600">Refining profile…</p>
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
              Quick reply or type your own:
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
            placeholder="e.g. I use Airtel broadband and Swiggy almost daily"
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length === 0 || !sessionId}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </section>

      <section className="rounded-[1.75rem] border border-blue-100 bg-white/95 p-4 shadow-lg shadow-blue-900/[0.06] ring-1 ring-white/70 sm:p-5">
        <h3 className="text-lg font-semibold text-zinc-950">Recommended cards</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Scoring is deterministic; chat only shapes your profile inputs.
        </p>

        {recommendations.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-700">
            Picks appear once profile confidence crosses the threshold — keep sharing how you spend.
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
                    <p className="text-sm font-semibold text-zinc-900">{card.card_name}</p>
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
                <div className="mt-3 flex flex-wrap items-start gap-2">
                  <Link
                    href={`/card/${card.card_id}`}
                    className="inline-flex min-h-10 flex-1 basis-[7.5rem] items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
                  >
                    View details
                  </Link>
                  <Link
                    href={`/card/${card.card_id}#apply`}
                    className={cn(
                      cardApplyButtonClass,
                      "flex-1 basis-[7.5rem] rounded-lg px-3 text-xs"
                    )}
                  >
                    Apply
                  </Link>
                  <SendRecommendationEmailButton
                    compact
                    className="flex-1 basis-[7.5rem]"
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
