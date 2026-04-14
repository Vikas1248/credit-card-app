"use client";

type CardKeyBenefitsInput = {
  annual_fee: number;
  reward_rate?: string | null;
  key_benefits?: string | null;
  best_for?: string | null;
};

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
    <ul className="mt-2 space-y-1">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500/80" aria-hidden />
          <span className="line-clamp-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}
