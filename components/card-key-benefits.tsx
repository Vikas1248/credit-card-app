"use client";

type CardKeyBenefitsInput = {
  annual_fee: number;
  reward_rate?: string | null;
  key_benefits?: string | null;
  best_for?: string | null;
};

function BenefitIcon({ text }: { text: string }) {
  const t = text.toLowerCase();
  const base = "h-3.5 w-3.5 shrink-0";
  if (/(lounge|travel|flight|hotel|air)/.test(t)) {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    );
  }
  if (/(dining|restaurant|food|eats)/.test(t)) {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M3 3v18M8 3v9a4 4 0 004 4M21 3v18" strokeLinecap="round" />
      </svg>
    );
  }
  if (/(fuel|petrol|diesel|pump)/.test(t)) {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M14 11h1a2 2 0 012 2v3a2 2 0 104 0v-7l-3-3" />
        <path d="M3 21V5a2 2 0 012-2h8a2 2 0 012 2v16" />
      </svg>
    );
  }
  if (/(cashback|%|reward|points|bluchip|milestone)/.test(t)) {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M19 5L5 19M9.5 9.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM19.5 14.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    );
  }
  if (/(fee|free|waiver)/.test(t)) {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M6 3h12M6 8h12M8 8c2 0 3.5 1.5 4 4M6 12h6.5" />
        <path d="M10 12L8 21" />
      </svg>
    );
  }
  return (
    <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 3l2.7 5.5L21 9.3l-4.5 4.4 1.1 6.2L12 17l-5.6 2.9 1.1-6.2L3 9.3l6.3-.8L12 3z" />
    </svg>
  );
}

function normalizeBenefit(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[.;:,]+$/g, "")
    .trim();
}

export function deriveCardKeyBenefits(card: CardKeyBenefitsInput): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const item = normalizeBenefit(raw);
    if (!item) return;
    const key = item.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };

  if (card.annual_fee === 0) {
    push("No annual fee");
  }

  const combined = `${card.reward_rate ?? ""}. ${card.key_benefits ?? ""}. ${card.best_for ?? ""}`;
  const percentPhrases = combined.match(/\d+(?:\.\d+)?%\s*[^.,;|]{3,60}/g) ?? [];
  for (const phrase of percentPhrases) {
    push(phrase);
    if (out.length >= 3) break;
  }

  if (out.length < 3 && card.best_for) {
    push(card.best_for);
  }
  if (out.length < 3 && card.key_benefits) {
    for (const chunk of card.key_benefits.split(/[|.•]/g)) {
      push(chunk);
      if (out.length >= 3) break;
    }
  }
  if (out.length < 3 && card.reward_rate) {
    for (const chunk of card.reward_rate.split(/[|.•]/g)) {
      push(chunk);
      if (out.length >= 3) break;
    }
  }

  return out.slice(0, 3);
}

export function CardKeyBenefits({ card }: { card: CardKeyBenefitsInput }) {
  const items = deriveCardKeyBenefits(card);
  if (items.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-sm text-zinc-700"
        >
          <span className="mt-0.5 text-blue-600" aria-hidden>
            <BenefitIcon text={item} />
          </span>
          <span className="line-clamp-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}
