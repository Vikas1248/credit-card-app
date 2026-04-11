import type { SpendCategorySlug } from "@/lib/spendCategories";

const iconBase = "h-7 w-7 shrink-0";

export function SpendCategoryIcon({
  slug,
  className,
}: {
  slug: SpendCategorySlug;
  className?: string;
}) {
  const cn = className ? `${iconBase} ${className}` : iconBase;
  switch (slug) {
    case "dining":
      return (
        <svg
          className={cn}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M8 3v15c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2V3" />
          <path d="M10 3v5" />
          <path d="M6 3v4c0 1.1.9 2 2 2" />
          <path d="M18 8c0 4.5-2 7-4 9h8c-2-2-4-4.5-4-9a4 4 0 10-8 0" />
        </svg>
      );
    case "travel":
      return (
        <svg
          className={cn}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    case "shopping":
      return (
        <svg
          className={cn}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      );
    case "fuel":
      return (
        <svg
          className={cn}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M14 11h1a2 2 0 012 2v3a2 2 0 104 0v-7l-3-3" />
          <path d="M3 21V5a2 2 0 012-2h8a2 2 0 012 2v16" />
          <path d="M3 10h12" />
        </svg>
      );
    default: {
      const _exhaustive: never = slug;
      return _exhaustive;
    }
  }
}
