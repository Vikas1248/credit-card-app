"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CatalogFullBrowseCard } from "@/components/catalog-full-browse-card";
import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
import { primarySpendCategorySlug } from "@/lib/spendCategories";
import {
  buildCatalogSearchHaystack,
  matchesCatalogSearchQuery,
} from "@/lib/search/catalogTextSearch";
import type { CardNetwork } from "@/lib/types/card";

type CreditCard = {
  id: string;
  card_name: string;
  bank: string;
  network: CardNetwork;
  joining_fee: number;
  annual_fee: number;
  reward_type: "cashback" | "points";
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
  key_benefits: string | null;
  last_updated: string;
  dining_reward: number | null;
  travel_reward: number | null;
  shopping_reward: number | null;
  fuel_reward: number | null;
  metadata?: Record<string, unknown> | null;
};

type BrowseSortMode =
  | "name"
  | "annual_asc"
  | "annual_desc"
  | "joining_asc"
  | "joining_desc"
  | "ai";

const BROWSE_SORT_OPTIONS: { value: BrowseSortMode; label: string }[] = [
  { value: "name", label: "Name (A-Z)" },
  { value: "annual_asc", label: "Annual fee (low to high)" },
  { value: "annual_desc", label: "Annual fee (high to low)" },
  { value: "joining_asc", label: "Joining fee (low to high)" },
  { value: "joining_desc", label: "Joining fee (high to low)" },
  { value: "ai", label: "AI curated browse" },
];

type AnnualFeeBand =
  | "any"
  | "free"
  | "r1_1000"
  | "r1001_5000"
  | "r5001_plus";

type SpendFocus = "all" | "dining" | "travel" | "shopping" | "fuel";

function annualFeeMatchesBand(fee: number, band: AnnualFeeBand): boolean {
  switch (band) {
    case "any":
      return true;
    case "free":
      return fee === 0;
    case "r1_1000":
      return fee >= 1 && fee <= 1000;
    case "r1001_5000":
      return fee >= 1001 && fee <= 5000;
    case "r5001_plus":
      return fee >= 5001;
    default:
      return true;
  }
}

function cardStrongInSpendFocus(
  card: CreditCard,
  focus: Exclude<SpendFocus, "all">
): boolean {
  const primary = primarySpendCategorySlug({
    card_name: card.card_name,
    bank: card.bank,
    network: card.network,
    reward_type: card.reward_type,
    best_for: card.best_for,
    reward_rate: card.reward_rate,
    key_benefits: card.key_benefits,
    metadata: card.metadata ?? null,
    dining_reward: card.dining_reward,
    travel_reward: card.travel_reward,
    shopping_reward: card.shopping_reward,
    fuel_reward: card.fuel_reward,
  });
  return primary === focus;
}

/** Short label for bank filter chips (not official marks). */
function shortBankLabel(bank: string): string {
  return bank
    .replace(/\s+Bank$/i, "")
    .replace(/\s+Card$/i, "")
    .trim();
}

function bankInitials(bank: string): string {
  const words = bank.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  const w = words[0] ?? "?";
  return w.slice(0, 2).toUpperCase();
}

function issuerChipSurfaceClass(bank: string): string {
  const b = bank.toLowerCase();
  if (b.includes("axis"))
    return "border-[#97144D]/20 bg-white text-[#6b0f36]";
  if (b.includes("american express") || b === "amex")
    return "border-[#006FCF]/20 bg-white text-[#004a9e]";
  if (b.includes("sbi"))
    return "border-[#0D4580]/20 bg-white text-[#0a3563]";
  if (b.includes("hdfc"))
    return "border-[#004C8F]/20 bg-white text-[#00386a]";
  if (b.includes("indusind"))
    return "border-[#C4151C]/20 bg-white text-[#8f0f14]";
  if (b.includes("icici"))
    return "border-[#F37021]/20 bg-white text-[#a34a16]";
  if (b.includes("kotak"))
    return "border-[#ED232A]/20 bg-white text-[#a0181d]";
  return "border-blue-100 bg-white text-blue-700";
}

/** Compact controls for the browse filter sidebar (readable at small width). */
const browseSidebarChipBase =
  "inline-flex w-full min-h-[2.25rem] items-center justify-start gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-xs font-bold leading-snug shadow-sm transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

const browseSelectedChipClass =
  "border-transparent bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md shadow-blue-600/20 ring-1 ring-blue-200";

const browseFilterSectionLabelClass =
  "flex w-full items-center justify-between gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-blue-700 shadow-sm transition hover:bg-blue-50";

const browseFilterSectionHintClass =
  "mb-2 mt-1.5 text-[10px] leading-snug text-zinc-500";

type FilterSectionId = "bank" | "spend" | "reward" | "fee" | "network";

function sortCardsByIdOrder(
  list: CreditCard[],
  order: string[] | null
): CreditCard[] {
  if (!order || order.length === 0) {
    return [...list].sort((a, b) => a.card_name.localeCompare(b.card_name));
  }
  const idx = new Map(order.map((id, i) => [id, i]));
  return [...list].sort(
    (a, b) => (idx.get(a.id) ?? 1e9) - (idx.get(b.id) ?? 1e9)
  );
}

const sectionShell =
  "rounded-[2rem] border border-zinc-200/70 bg-white p-5 shadow-md shadow-zinc-900/[0.04] sm:p-8 lg:p-10";

const headerInputClass =
  "w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? "h-4 w-4"}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SortIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h8M4 12h5M4 18h2" />
      <path d="M19 5v14M16 8l3-3 3 3M16 16l3 3 3-3" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 21l-5.2-5.2M11 18a7 7 0 100-14 7 7 0 000 14z" />
    </svg>
  );
}

function IconUtensils({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M3 3v18M8 3v9a4 4 0 004 4M21 3v18" strokeLinecap="round" />
    </svg>
  );
}

function IconPlane({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        d="M10.5 19.5L6 21l1.5-4.5M6 21l-3-3M17.5 4.5L22 3l-1.5 4.5M22 3l3 3M8.5 10.5L12 7l8.5 3.5-4 4L12 17l-3.5-6.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShopping({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFuel({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        d="M4 22V6a2 2 0 012-2h8a2 2 0 012 2v8M4 10h12M8 6h4M18 22V10a2 2 0 114 0v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPercent({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        d="M19 5L5 19M9.5 9.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM19.5 14.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        d="M9.5 3.5L11 8l4.5 1.5L11 11 9.5 15.5 8 11 3.5 9.5 8 8 9.5 3.5zM19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconNetworkCard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconSlidersHorizontal({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="21" y1="4" x2="14" y2="4" />
      <line x1="10" y1="4" x2="3" y2="4" />
      <line x1="21" y1="12" x2="12" y2="12" />
      <line x1="8" y1="12" x2="3" y2="12" />
      <line x1="21" y1="20" x2="16" y2="20" />
      <line x1="12" y1="20" x2="3" y2="20" />
      <line x1="14" y1="2" x2="14" y2="6" />
      <line x1="10" y1="10" x2="10" y2="14" />
      <line x1="16" y1="18" x2="16" y2="22" />
    </svg>
  );
}

function IconArrowUturnLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 010 11H13" />
    </svg>
  );
}

function IconBuildingBank({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 21h18M4 21V10l8-5 8 5v11M9 21v-4h6v4" />
      <path d="M9 13h.01M12 13h.01M15 13h.01" />
    </svg>
  );
}

function IconSquares2x2({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconIndianRupee({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 3h12M6 8h12M8 8c2 0 3.5 1.5 4 4M6 12h6.5" />
      <path d="M10 12L8 21" />
    </svg>
  );
}

function IconGift({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M12 11V22M3 15h18" />
      <path d="M12 11H7.5a3.5 3.5 0 010-7C11 4 12 11 12 11z" />
      <path d="M12 11h4.5a3.5 3.5 0 000-7C13 4 12 11 12 11z" />
    </svg>
  );
}

function IconTrendingUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 7l-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}

/** Decorative network hints (not issuer marks). */
function IconVisaHint({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 16l6-14h4l6 14M8 10h8" />
    </svg>
  );
}

function IconMastercardHint({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="9"
        cy="12"
        r="5"
        stroke="currentColor"
        strokeWidth={2}
        opacity={0.45}
      />
      <circle
        cx="15"
        cy="12"
        r="5"
        stroke="currentColor"
        strokeWidth={2}
        opacity={0.85}
      />
    </svg>
  );
}

function IconAmexHint({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 12h10M7 15h6" />
    </svg>
  );
}

export function AllCardsBrowse({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const skipNextUrlSync = useRef(true);

  const [cards, setCards] = useState<CreditCard[]>([]);
  const [search, setSearch] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchAiOrder, setSearchAiOrder] = useState<string[] | null>(null);
  const [searchAiLoading, setSearchAiLoading] = useState(false);
  const [browseSort, setBrowseSort] = useState<BrowseSortMode>("name");
  const [browseAiOrder, setBrowseAiOrder] = useState<string[] | null>(null);
  const [browseAiLoading, setBrowseAiLoading] = useState(false);
  const [filterAnnualBand, setFilterAnnualBand] =
    useState<AnnualFeeBand>("any");
  const [filterBanks, setFilterBanks] = useState<string[]>([]);
  const [filterSpendFocus, setFilterSpendFocus] = useState<SpendFocus>("all");
  const [filterRewardType, setFilterRewardType] = useState<
    "all" | "cashback" | "points"
  >("all");
  const [filterNetwork, setFilterNetwork] = useState<"all" | CardNetwork>(
    "all"
  );
  const [browseSortOpen, setBrowseSortOpen] = useState(false);
  const [openFilterSections, setOpenFilterSections] = useState<
    Record<FilterSectionId, boolean>
  >({
    bank: false,
    spend: false,
    reward: false,
    fee: false,
    network: false,
  });

  const catalogNetworkLock = getOptionalCardNetworkFilter();

  useEffect(() => {
    setSearch(initialQuery);
    skipNextUrlSync.current = true;
  }, [initialQuery]);

  useEffect(() => {
    if (pathname !== "/cards") return;
    const timer = window.setTimeout(() => {
      if (skipNextUrlSync.current) {
        skipNextUrlSync.current = false;
        return;
      }
      const q = search.trim();
      const next = q
        ? `${pathname}?q=${encodeURIComponent(q)}`
        : pathname;
      router.replace(next, { scroll: false });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [search, pathname, router]);

  const browseFiltersActive = useMemo(
    () =>
      filterAnnualBand !== "any" ||
      filterBanks.length > 0 ||
      filterSpendFocus !== "all" ||
      filterRewardType !== "all" ||
      (!catalogNetworkLock && filterNetwork !== "all"),
    [
      filterAnnualBand,
      filterBanks,
      filterSpendFocus,
      filterRewardType,
      filterNetwork,
      catalogNetworkLock,
    ]
  );

  const catalogBankNames = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) {
      if (c.bank?.trim()) set.add(c.bank.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  function toggleBankFilter(bank: string) {
    setFilterBanks((prev) => {
      const has = prev.includes(bank);
      if (has) return prev.filter((b) => b !== bank);
      return [...prev, bank].sort((a, b) => a.localeCompare(b));
    });
  }

  function resetBrowseFilters() {
    setFilterAnnualBand("any");
    setFilterBanks([]);
    setFilterSpendFocus("all");
    setFilterRewardType("all");
    setFilterNetwork("all");
  }

  function toggleFilterSection(section: FilterSectionId) {
    setOpenFilterSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  const browseSortNonDefault = browseSort !== "name";
  const browseSortLabel =
    BROWSE_SORT_OPTIONS.find((option) => option.value === browseSort)?.label ??
    "Sort cards";

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: "200" });
      const catalogNetwork = getOptionalCardNetworkFilter();
      if (catalogNetwork) params.set("network", catalogNetwork);
      const response = await fetch(`/api/cards?${params.toString()}`, {
        cache: "no-store",
      });
      const result: { cards?: CreditCard[]; error?: string } =
        await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to fetch cards");
      }
      setCards(result.cards ?? []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchAiOrder(null);
      setSearchAiLoading(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setSearchAiLoading(true);
      void (async () => {
        try {
          const params = new URLSearchParams({ q });
          const n = getOptionalCardNetworkFilter();
          if (n) params.set("network", n);
          const res = await fetch(`/api/cards/search-ai?${params}`, {
            cache: "no-store",
          });
          const data: { source?: string; ordered_ids?: string[] } =
            await res.json();
          if (cancelled) return;
          if (data.source === "ai" && Array.isArray(data.ordered_ids)) {
            setSearchAiOrder(data.ordered_ids);
          } else {
            setSearchAiOrder(null);
          }
        } catch {
          if (!cancelled) setSearchAiOrder(null);
        } finally {
          if (!cancelled) setSearchAiLoading(false);
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setSearchAiLoading(false);
    };
  }, [search, cards.length]);

  useEffect(() => {
    if (browseSort !== "ai" || cards.length === 0) {
      if (browseSort !== "ai") setBrowseAiOrder(null);
      setBrowseAiLoading(false);
      return;
    }
    let cancelled = false;
    setBrowseAiLoading(true);
    void (async () => {
      try {
        const params = new URLSearchParams();
        const n = getOptionalCardNetworkFilter();
        if (n) params.set("network", n);
        const res = await fetch(`/api/cards/browse-order-ai?${params}`, {
          cache: "no-store",
        });
        const data: { source?: string; ordered_ids?: string[] | null } =
          await res.json();
        if (cancelled) return;
        if (data.source === "ai" && Array.isArray(data.ordered_ids)) {
          setBrowseAiOrder(data.ordered_ids);
        } else {
          setBrowseAiOrder(null);
        }
      } catch {
        if (!cancelled) setBrowseAiOrder(null);
      } finally {
        if (!cancelled) setBrowseAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [browseSort, cards.length]);

  const feeTypeFilteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (filterBanks.length > 0 && !filterBanks.includes(c.bank)) {
        return false;
      }
      if (!annualFeeMatchesBand(c.annual_fee, filterAnnualBand)) {
        return false;
      }
      if (
        filterSpendFocus !== "all" &&
        !cardStrongInSpendFocus(c, filterSpendFocus)
      ) {
        return false;
      }
      if (filterRewardType !== "all" && c.reward_type !== filterRewardType) {
        return false;
      }
      if (
        !catalogNetworkLock &&
        filterNetwork !== "all" &&
        c.network !== filterNetwork
      ) {
        return false;
      }
      return true;
    });
  }, [
    cards,
    filterBanks,
    filterAnnualBand,
    filterSpendFocus,
    filterRewardType,
    filterNetwork,
    catalogNetworkLock,
  ]);

  const textFilteredCards = useMemo(() => {
    const q = search.trim();
    if (!q) return feeTypeFilteredCards;

    return feeTypeFilteredCards.filter((card) => {
      const haystack = buildCatalogSearchHaystack({
        card_name: card.card_name,
        bank: card.bank,
        network: card.network,
        best_for: card.best_for,
        key_benefits: card.key_benefits,
        reward_rate: card.reward_rate,
        lounge_access: card.lounge_access,
      });
      return matchesCatalogSearchQuery(haystack, q);
    });
  }, [feeTypeFilteredCards, search]);

  const displayBrowseCards = useMemo(() => {
    const list = textFilteredCards;
    const q = search.trim();
    if (q.length >= 2 && searchAiOrder && searchAiOrder.length > 0) {
      return sortCardsByIdOrder(list, searchAiOrder);
    }
    if (!q && browseSort === "ai" && browseAiOrder && browseAiOrder.length > 0) {
      return sortCardsByIdOrder(list, browseAiOrder);
    }
    if (browseSort === "annual_asc") {
      return [...list].sort(
        (a, b) =>
          a.annual_fee - b.annual_fee ||
          a.card_name.localeCompare(b.card_name)
      );
    }
    if (browseSort === "annual_desc") {
      return [...list].sort(
        (a, b) =>
          b.annual_fee - a.annual_fee ||
          a.card_name.localeCompare(b.card_name)
      );
    }
    if (browseSort === "joining_asc") {
      return [...list].sort(
        (a, b) =>
          a.joining_fee - b.joining_fee ||
          a.card_name.localeCompare(b.card_name)
      );
    }
    if (browseSort === "joining_desc") {
      return [...list].sort(
        (a, b) =>
          b.joining_fee - a.joining_fee ||
          a.card_name.localeCompare(b.card_name)
      );
    }
    return sortCardsByIdOrder(list, null);
  }, [textFilteredCards, search, searchAiOrder, browseSort, browseAiOrder]);

  const showFacetSidebar = !loading && !error && cards.length > 0;

  const sidebarChipClass = browseSidebarChipBase;

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    for (const bank of filterBanks) {
      chips.push({
        key: `bank-${bank}`,
        label: shortBankLabel(bank),
        onRemove: () =>
          setFilterBanks((prev) => prev.filter((item) => item !== bank)),
      });
    }
    if (filterSpendFocus !== "all") {
      chips.push({
        key: "spend-focus",
        label: `Best for ${filterSpendFocus}`,
        onRemove: () => setFilterSpendFocus("all"),
      });
    }
    if (filterRewardType !== "all") {
      chips.push({
        key: "reward-type",
        label: filterRewardType,
        onRemove: () => setFilterRewardType("all"),
      });
    }
    if (filterAnnualBand !== "any") {
      const labelByBand: Record<AnnualFeeBand, string> = {
        any: "Any fee",
        free: "Lifetime free",
        r1_1000: "₹1-₹1,000 fee",
        r1001_5000: "₹1,001-₹5,000 fee",
        r5001_plus: "₹5,001+ fee",
      };
      chips.push({
        key: "annual-fee",
        label: labelByBand[filterAnnualBand],
        onRemove: () => setFilterAnnualBand("any"),
      });
    }
    if (!catalogNetworkLock && filterNetwork !== "all") {
      chips.push({
        key: "network",
        label: filterNetwork,
        onRemove: () => setFilterNetwork("all"),
      });
    }
    return chips;
  }, [
    catalogNetworkLock,
    filterAnnualBand,
    filterBanks,
    filterNetwork,
    filterRewardType,
    filterSpendFocus,
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <section className={sectionShell}>
        <div>
          <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Browse cards
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            Search and filter the catalog.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
            Use quick filters for common goals or search the full card list for
            deeper browsing.
          </p>
        </div>

        <div className="mt-7 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-violet-50/60 p-4">
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="relative min-w-0">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                <IconSearch className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cards, banks, rewards..."
                className={`${headerInputClass} ${searchAiLoading ? "pr-11" : ""}`}
                aria-label="Search cards"
                aria-busy={searchAiLoading}
              />
              {searchAiLoading ? (
                <span
                  className="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center text-blue-600"
                  role="status"
                  aria-live="polite"
                >
                  <Spinner className="h-4 w-4" />
                  <span className="sr-only">Updating relevance order...</span>
                </span>
              ) : null}
            </div>
            {!loading && !error && cards.length > 0 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setBrowseSortOpen((o) => !o);
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/25 sm:w-auto"
                  aria-expanded={browseSortOpen}
                  aria-controls="browse-sort-options"
                >
                  <SortIcon className="h-[1.05rem] w-[1.05rem]" />
                  Sort cards
                  {browseSortNonDefault ? (
                    <span className="h-2 w-2 rounded-full bg-white" aria-hidden />
                  ) : null}
                </button>
                {browseSortOpen ? (
                  <div
                    id="browse-sort-options"
                    className="absolute right-0 z-20 mt-2 w-full min-w-64 overflow-hidden rounded-2xl border border-blue-100 bg-white p-1.5 shadow-xl shadow-blue-900/[0.12] sm:w-72"
                    role="menu"
                    aria-label="Sort cards"
                  >
                    <p className="px-3 pb-1.5 pt-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                      Sort by
                    </p>
                    {BROWSE_SORT_OPTIONS.map((option) => {
                      const selected = browseSort === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setBrowseSort(option.value);
                            setBrowseSortOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                            selected
                              ? browseSelectedChipClass
                              : "text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                          role="menuitemradio"
                          aria-checked={selected}
                        >
                          <span>{option.label}</span>
                          {selected ? <span aria-hidden>Selected</span> : null}
                        </button>
                      );
                    })}
                    {browseSort === "ai" ? (
                      <div className="mt-1 rounded-xl bg-blue-50 px-3 py-2 text-xs text-zinc-600">
                        {browseAiLoading ? (
                          <span className="flex items-center gap-2">
                            <Spinner className="h-4 w-4 text-blue-600" />
                            Loading order...
                          </span>
                        ) : !browseAiOrder ? (
                          <>AI order unavailable - using A-Z</>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <p className="mt-1 text-center text-[10px] font-bold text-zinc-500 sm:text-left">
                  {browseSortLabel}
                </p>
              </div>
            ) : null}
          </form>
          <p className="mt-2 text-xs text-zinc-500">
            {textFilteredCards.length === cards.length && !search.trim() ? (
              <>
                {cards.length} {cards.length === 1 ? "card" : "cards"} in the
                catalog.
              </>
            ) : (
              <>
                {textFilteredCards.length}{" "}
                {textFilteredCards.length === 1 ? "card" : "cards"} matching
                your criteria ({cards.length} in catalog).
              </>
            )}{" "}
            {search.trim().length >= 2 ? (
              <span>
                When AI is available, results can reorder by relevance after you
                pause typing.
              </span>
            ) : null}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
              Quick filters
            </span>
            {(
              [
                ["dining", "Dining"],
                ["travel", "Travel"],
                ["shopping", "Shopping"],
                ["fuel", "Fuel"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setFilterSpendFocus((current) => (current === id ? "all" : id))
                }
                aria-pressed={filterSpendFocus === id}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                  filterSpendFocus === id
                    ? browseSelectedChipClass
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                  Active filters
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Tap a chip to remove it, or reset everything.
                </p>
              </div>
              <button
                type="button"
                onClick={resetBrowseFilters}
                className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white px-3 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                Reset all
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-sm ring-1 ring-blue-100 transition hover:text-blue-700 hover:ring-blue-200"
                >
                  {chip.label}
                  <span className="text-zinc-400" aria-hidden>
                    ×
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className={
            showFacetSidebar
              ? "mt-6 flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] lg:gap-6 lg:items-start"
              : "mt-6"
          }
        >
          {showFacetSidebar ? (
            <aside
              id="browse-filter-panel"
              className="shrink-0 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-violet-50/50 p-4 shadow-md shadow-blue-900/[0.05] sm:p-4 lg:sticky lg:top-24 lg:max-h-[min(100vh-6rem,42rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1"
              aria-label="Catalog filters"
            >
            <div className="flex flex-col divide-y divide-blue-100/70">
            <div className="flex items-start justify-between gap-2 pb-3">
              <div>
              <h2 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                <IconSlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                Filters
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Narrow cards by bank, rewards, fees, and network.
              </p>
              </div>
              {browseFiltersActive ? (
                <button
                  type="button"
                  onClick={resetBrowseFilters}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-blue-700 shadow-sm hover:bg-blue-50"
                >
                  <IconArrowUturnLeft className="h-3 w-3 opacity-80" />
                  Reset
                </button>
              ) : null}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => toggleFilterSection("bank")}
                className={browseFilterSectionLabelClass}
                aria-expanded={openFilterSections.bank}
                aria-controls="browse-bank-filters"
              >
                <span className="flex items-center gap-1">
                  <IconBuildingBank className="h-3 w-3 shrink-0 opacity-70" />
                  Bank
                </span>
                <span className="text-sm leading-none" aria-hidden>
                  {openFilterSections.bank ? "−" : "+"}
                </span>
              </button>
              {openFilterSections.bank ? (
                <>
                  <p className={browseFilterSectionHintClass}>Tap one or more</p>
                  <div
                    id="browse-bank-filters"
                    className="flex flex-col gap-1.5"
                    role="group"
                    aria-label="Filter by bank"
                  >
                    {catalogBankNames.map((bank) => {
                      const on = filterBanks.includes(bank);
                      return (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => toggleBankFilter(bank)}
                          aria-pressed={on}
                          className={`${sidebarChipClass} ${
                            on
                              ? browseSelectedChipClass
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[8px] font-bold leading-none ${issuerChipSurfaceClass(bank)}`}
                          >
                            {bankInitials(bank)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-left">
                            {shortBankLabel(bank)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => toggleFilterSection("spend")}
                className={browseFilterSectionLabelClass}
                aria-expanded={openFilterSections.spend}
                aria-controls="browse-spend-filters"
              >
                <span className="flex items-center gap-1">
                  <IconSquares2x2 className="h-3 w-3 shrink-0 opacity-70" />
                  Spend category
                </span>
                <span className="text-sm leading-none" aria-hidden>
                  {openFilterSections.spend ? "−" : "+"}
                </span>
              </button>
              {openFilterSections.spend ? (
                <>
                  <p className={browseFilterSectionHintClass}>
                    Where this card earns most
                  </p>
                  <div
                    id="browse-spend-filters"
                    className="flex flex-col gap-1.5"
                    role="group"
                    aria-label="Filter by strongest reward category"
                  >
                    {(
                      [
                        {
                          id: "dining" as const,
                          label: "Dining",
                          icon: IconUtensils,
                        },
                        {
                          id: "travel" as const,
                          label: "Travel",
                          icon: IconPlane,
                        },
                        {
                          id: "shopping" as const,
                          label: "Shopping",
                          icon: IconShopping,
                        },
                        {
                          id: "fuel" as const,
                          label: "Fuel",
                          icon: IconFuel,
                        },
                      ] as const
                    ).map(({ id, label, icon: Icon }) => {
                      const on = filterSpendFocus === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() =>
                            setFilterSpendFocus((current) =>
                              current === id ? "all" : id
                            )
                          }
                          aria-pressed={on}
                          className={`${sidebarChipClass} ${
                            on
                              ? browseSelectedChipClass
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          {Icon ? (
                            <Icon className="h-3.5 w-3.5 shrink-0 text-current opacity-90" />
                          ) : null}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => toggleFilterSection("reward")}
                className={browseFilterSectionLabelClass}
                aria-expanded={openFilterSections.reward}
                aria-controls="browse-reward-filters"
              >
                <span className="flex items-center gap-1">
                  <IconSparkles className="h-3 w-3 shrink-0 opacity-70" />
                  Reward type
                </span>
                <span className="text-sm leading-none" aria-hidden>
                  {openFilterSections.reward ? "−" : "+"}
                </span>
              </button>
              {openFilterSections.reward ? (
                <div
                  id="browse-reward-filters"
                  className="mt-2 flex flex-col gap-1.5"
                  role="group"
                  aria-label="Filter by reward type"
                >
                  {(
                    [
                      {
                        id: "cashback" as const,
                        label: "Cashback",
                        icon: IconPercent,
                      },
                      {
                        id: "points" as const,
                        label: "Points",
                        icon: IconSparkles,
                      },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => {
                    const on = filterRewardType === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setFilterRewardType((current) =>
                            current === id ? "all" : id
                          )
                        }
                        aria-pressed={on}
                        className={`${sidebarChipClass} ${
                          on
                            ? browseSelectedChipClass
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                      >
                        {Icon ? (
                          <Icon className="h-3.5 w-3.5 shrink-0 text-current opacity-90" />
                        ) : null}
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => toggleFilterSection("fee")}
                className={browseFilterSectionLabelClass}
                aria-expanded={openFilterSections.fee}
                aria-controls="browse-fee-filters"
              >
                <span className="flex items-center gap-1">
                  <IconIndianRupee className="h-3 w-3 shrink-0 opacity-70" />
                  Annual fee
                </span>
                <span className="text-sm leading-none" aria-hidden>
                  {openFilterSections.fee ? "−" : "+"}
                </span>
              </button>
              {openFilterSections.fee ? (
                <div
                  id="browse-fee-filters"
                  className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1"
                  role="group"
                  aria-label="Filter by annual fee range"
                >
                  {(
                    [
                      {
                        id: "free" as const,
                        label: "Free",
                        Icon: IconGift,
                      },
                      { id: "r1_1000" as const, label: "₹1 – ₹1,000", Icon: IconIndianRupee },
                      {
                        id: "r1001_5000" as const,
                        label: "₹1,001 – ₹5,000",
                        Icon: IconIndianRupee,
                      },
                      {
                        id: "r5001_plus" as const,
                        label: "₹5,001 & above",
                        Icon: IconTrendingUp,
                      },
                    ] as const
                  ).map(({ id, label, Icon: FeeIcon }) => {
                    const on = filterAnnualBand === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setFilterAnnualBand((current) =>
                            current === id ? "any" : id
                          )
                        }
                        aria-pressed={on}
                        className={`${sidebarChipClass} ${
                          on
                            ? browseSelectedChipClass
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                      >
                        <FeeIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => toggleFilterSection("network")}
                className={browseFilterSectionLabelClass}
                aria-expanded={openFilterSections.network}
                aria-controls="browse-network-filters"
              >
                <span className="flex items-center gap-1">
                  <IconNetworkCard className="h-3 w-3 shrink-0 opacity-70" />
                  Network
                </span>
                <span className="text-sm leading-none" aria-hidden>
                  {openFilterSections.network ? "−" : "+"}
                </span>
              </button>
              {openFilterSections.network ? (
                <>
                  <div
                    id="browse-network-filters"
                    className="mt-2 flex flex-col gap-1.5"
                    role="group"
                    aria-label="Filter by card network"
                  >
                    {(
                      [
                        { id: "Visa" as const, label: "Visa", Icon: IconVisaHint },
                        {
                          id: "Mastercard" as const,
                          label: "Mastercard",
                          Icon: IconMastercardHint,
                        },
                        { id: "Amex" as const, label: "Amex", Icon: IconAmexHint },
                      ] as const
                    ).map(({ id, label, Icon: NetIcon }) => {
                      const netLocked = Boolean(catalogNetworkLock);
                      const on = netLocked
                        ? id === catalogNetworkLock
                        : filterNetwork === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={netLocked}
                          onClick={() => {
                            if (!netLocked) {
                              setFilterNetwork((current) =>
                                current === id ? "all" : id
                              );
                            }
                          }}
                          aria-pressed={on}
                          className={`${sidebarChipClass} ${
                            netLocked ? "cursor-not-allowed opacity-90" : ""
                          } ${
                            on
                              ? browseSelectedChipClass
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          <NetIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {catalogNetworkLock ? (
                    <p className="mt-2 text-[10px] leading-snug text-zinc-500">
                      Network locked to {catalogNetworkLock} via{" "}
                      <code className="rounded bg-white px-1 py-0.5 text-[10px] ring-1 ring-blue-100">
                        NEXT_PUBLIC_CARD_NETWORK
                      </code>
                      .
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
            </div>
          </aside>
          ) : null}

          <div className="min-w-0">
        {loading ? (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-blue-50"
              />
            ))}
          </div>
        ) : error ? (
          <div
            className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            <span className="font-semibold">Couldn’t load cards</span>
            <span>{error}</span>
          </div>
        ) : textFilteredCards.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-6 py-12 text-center">
            {cards.length === 0 && !search.trim() ? (
              <>
                <p className="text-sm font-medium text-zinc-700">
                  No cards in the database
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Production loads from Supabase (
                  <code className="rounded bg-white px-1 py-0.5 text-xs ring-1 ring-blue-100">
                    credit_cards
                  </code>
                  ), not from repo{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-xs ring-1 ring-blue-100">
                    data/
                  </code>
                  . Import rows into the same Supabase project your Vercel env
                  points to, and confirm{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-xs ring-1 ring-blue-100">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  and keys are set in Vercel.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-700">
                  {feeTypeFilteredCards.length === 0
                    ? "No cards match your filters"
                    : "No cards match your search"}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {feeTypeFilteredCards.length === 0
                    ? "Widen annual fee, bank, or category filters, or tap Reset in filters."
                    : "Try another query, clear the search box, or adjust filters."}
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {displayBrowseCards.map((card) => (
              <li key={card.id} className="min-h-0">
                <CatalogFullBrowseCard card={card} />
              </li>
            ))}
          </ul>
        )}
          </div>
        </div>
      </section>
    </main>
  );
}
