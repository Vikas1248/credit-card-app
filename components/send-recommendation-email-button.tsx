"use client";

import { useState } from "react";

type SendRecommendationEmailButtonProps = {
  cardName: string;
  applyLink: string;
  rewards?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendRecommendationEmailButton({
  cardName,
  applyLink,
  rewards,
}: SendRecommendationEmailButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async () => {
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      setMessage(null);
      return;
    }

    try {
      setSending(true);
      setError(null);
      setMessage(null);
      const response = await fetch("/api/send-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          card: {
            name: cardName,
            applyLink,
            rewards: rewards ?? "Top cashback and benefits",
          },
        }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to send email.");
      }
      setMessage("Email sent successfully.");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
          setMessage(null);
        }}
        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950"
      >
        Send to Email
      </button>

      {open ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendEmail()}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-blue-500"
          >
            {sending ? "Sending..." : "Send recommendation"}
          </button>
          {message ? (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
