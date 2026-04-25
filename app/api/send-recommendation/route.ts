import { NextResponse } from "next/server";
import { Resend } from "resend";

type SendRecommendationBody = {
  email?: unknown;
  card?: {
    name?: unknown;
    applyLink?: unknown;
    rewards?: unknown;
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeApplyLink(value: unknown, request: Request): string {
  if (typeof value !== "string") return "#";
  const trimmed = value.trim();
  if (!trimmed) return "#";
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const requestOrigin = new URL(request.url).origin;
    return new URL(trimmed, configuredOrigin || requestOrigin).toString();
  }
  return "#";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as SendRecommendationBody;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const cardName =
      typeof body.card?.name === "string" ? body.card.name.trim() : "";
    const rewards =
      typeof body.card?.rewards === "string" ? body.card.rewards.trim() : "";
    const applyLink = safeApplyLink(body.card?.applyLink, request);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }
    if (!cardName) {
      return NextResponse.json(
        { error: "Card name is required." },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "CredGenie <noreply@credgenie.in>",
      to: email,
      subject: "Your credit card recommendation",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
          <h2 style="margin: 0 0 12px;">Your Recommended Credit Card</h2>
          <p style="margin: 0 0 10px;"><strong>${escapeHtml(cardName)}</strong></p>
          ${rewards ? `<p style="margin: 0 0 16px;">${escapeHtml(rewards)}</p>` : ""}
          <a
            href="${escapeHtml(applyLink)}"
            style="display: inline-block; border-radius: 10px; background: #2563eb; color: white; padding: 10px 14px; text-decoration: none; font-weight: 700;"
          >
            Apply Now
          </a>
          <p style="margin-top: 18px; font-size: 12px; color: #71717a;">
            Rewards and fees can change. Please verify final terms with the issuer before applying.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("send-recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to send email." },
      { status: 500 }
    );
  }
}
