import type { ReactNode } from "react";

type FaqItem = {
  question: string;
  answer: ReactNode;
};

type GuideFaqProps = {
  items: FaqItem[];
};

export function GuideFaq({ items }: GuideFaqProps) {
  return (
    <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-zinc-50/50">
      {items.map((item, index) => (
        <details
          key={index}
          className="group px-5 py-4 open:bg-white sm:px-6"
        >
          <summary className="cursor-pointer list-none font-bold text-zinc-900 outline-none marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="flex items-start justify-between gap-3">
              <span>{item.question}</span>
              <span
                className="mt-0.5 shrink-0 text-blue-600 transition group-open:rotate-180"
                aria-hidden
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </span>
          </summary>
          <div className="mt-3 text-sm leading-relaxed text-zinc-600">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
