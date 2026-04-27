"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type SendRecommendationEmailButtonProps = {
  cardName: string;
  applyLink: string;
  rewards?: string | null;
  /** Smaller trigger for inline toolbars (e.g. beside Apply). */
  compact?: boolean;
  className?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendRecommendationEmailButton({
  cardName,
  applyLink,
  rewards,
  compact = false,
  className,
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
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
          setMessage(null);
        }}
        className={cn(
          "inline-flex items-center justify-center border font-semibold shadow-sm transition hover:-translate-y-0.5",
          compact
            ? "min-h-10 w-full rounded-lg px-3 text-xs"
            : "min-h-11 w-full rounded-xl px-4 text-sm",
          open
            ? "border-blue-600 bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-blue-600/20"
            : "border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50"
        )}
      >
        Email
      </button>

      {open ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 shadow-sm">
          <label className="block text-xs font-medium text-zinc-700">
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendEmail()}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send"}
          </button>
          {message ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
