"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AmexGenericApplyLink } from "@/components/amex-generic-apply-link";
import { AmexPlatinumReserveApplyLink } from "@/components/amex-platinum-reserve-apply-link";
import { AxisApplyLink } from "@/components/axis-apply-link";
import { CardKeyBenefits } from "@/components/card-key-benefits";
import { CardTopRewardTag } from "@/components/card-top-reward-tag";
import { HdfcApplyLink } from "@/components/hdfc-apply-link";
import { IndusIndApplyLink } from "@/components/indusind-apply-link";
import { SbiApplyLink } from "@/components/sbi-apply-link";
import { isAmexCardUsingGenericApply } from "@/lib/cards/amexGenericApply";
import { isAmexPlatinumReserveCard } from "@/lib/cards/amexPlatinumReserveApply";
import { isAxisBankCard } from "@/lib/cards/axisApply";
import { hdfcCardShowsApply } from "@/lib/cards/hdfcApply";
import { indusindCardShowsApply } from "@/lib/cards/indusindApply";
import { getOptionalCardNetworkFilter } from "@/lib/cards/networkFilter";
import { issuerBrandTileClass } from "@/lib/cards/issuerBrandTile";
import { isSbiCard } from "@/lib/cards/sbiApply";
import {
  buildCatalogSearchHaystack,
  matchesCatalogSearchQuery,
} from "@/lib/search/catalogTextSearch";
import { cardViewDetailsButtonClass } from "@/lib/cardCta";
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

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

type AnnualFeeBand =
  | "any"
  | "free"
  | "r1_500"
  | "r501_1000"
  | "r1001_2500"
  | "r2501_5000"
  | "r5001_10000"
  | "r10001_plus";

type SpendFocus = "all" | "dining" | "travel" | "shopping" | "fuel";

function annualFeeMatchesBand(fee: number, band: AnnualFeeBand): boolean {
  switch (band) {
    case "any":
      return true;
    case "free":
      return fee === 0;
    case "r1_500":
      return fee >= 1 && fee <= 500;
    case "r501_1000":
      return fee >= 501 && fee <= 1000;
    case "r1001_2500":
      return fee >= 1001 && fee <= 2500;
    case "r2501_5000":
      return fee >= 2501 && fee <= 5000;
    case "r5001_10000":
      return fee >= 5001 && fee <= 10000;
    case "r10001_plus":
      return fee >= 10001;
    default:
      return true;
  }
}

function cardStrongInSpendFocus(
  card: CreditCard,
  focus: Exclude<SpendFocus, "all">
): boolean {
  const rates: { key: SpendFocus; v: number | null }[] = [
    { key: "dining", v: card.dining_reward },
    { key: "travel", v: card.travel_reward },
    { key: "shopping", v: card.shopping_reward },
    { key: "fuel", v: card.fuel_reward },
  ];
  const positive = rates.filter(
    (x): x is { key: SpendFocus; v: number } =>
      typeof x.v === "number" && x.v > 0
  );
  if (positive.length === 0) return false;
  const m = Math.max(...positive.map((x) => x.v));
  const mine = rates.find((x) => x.key === focus)?.v;
  return typeof mine === "number" && mine > 0 && mine >= m - 1e-9;
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
    return "border-[#97144D]/35 bg-[#97144D]/12 text-[#6b0f36] dark:border-[#c43d6b]/40 dark:bg-[#c43d6b]/15 dark:text-[#f5c4d4]";
  if (b.includes("american express") || b === "amex")
    return "border-[#006FCF]/35 bg-[#006FCF]/10 text-[#004a9e] dark:border-[#2e8fdf]/40 dark:bg-[#2e8fdf]/12 dark:text-[#b8daf7]";
  if (b.includes("sbi"))
    return "border-[#0D4580]/35 bg-[#0D4580]/10 text-[#0a3563] dark:border-[#3d7ab8]/40 dark:bg-[#3d7ab8]/12 dark:text-[#c5daf0]";
  if (b.includes("hdfc"))
    return "border-[#004C8F]/35 bg-[#004C8F]/10 text-[#00386a] dark:border-[#3d8fd4]/40 dark:bg-[#3d8fd4]/12 dark:text-[#c2ddf9]";
  if (b.includes("indusind"))
    return "border-[#C4151C]/35 bg-[#C4151C]/10 text-[#8f0f14] dark:border-[#e85c62]/40 dark:bg-[#e85c62]/12 dark:text-[#fcd4d6]";
  if (b.includes("icici"))
    return "border-[#F37021]/40 bg-[#F37021]/12 text-[#a34a16] dark:border-[#ff9a5c]/35 dark:bg-[#ff9a5c]/12 dark:text-[#ffd4bc]";
  if (b.includes("kotak"))
    return "border-[#ED232A]/35 bg-[#ED232A]/10 text-[#a0181d] dark:border-[#f56a70]/40 dark:bg-[#f56a70]/12 dark:text-[#fdd4d6]";
  return "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200";
}

/** Compact controls for the browse filter sidebar (readable at small width). */
const browseSidebarChipBase =
  "inline-flex w-full min-h-[2rem] items-center justify-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium leading-snug transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

const browseFilterSectionLabelClass =
  "mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";

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

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400";

const sectionShell =
  "rounded-3xl border border-zinc-300/90 bg-white p-8 shadow-md shadow-zinc-900/[0.06] ring-1 ring-zinc-950/[0.04] dark:border-zinc-600 dark:bg-zinc-900/70 dark:shadow-black/40 dark:ring-white/[0.06] sm:p-10";

const sectionTitleClass =
  "text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl";

const sectionLeadClass =
  "mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400";

const sectionHeaderRowClass =
  "flex gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-600 sm:gap-4";

const sectionHeaderAccentClass =
  "mt-2 h-11 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shadow-sm shadow-blue-500/30";

const headerInputClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50/90 py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500";

const browseToolbarBtnClass =
  "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-zinc-700 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-200";

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

function IconLayers({ className }: { className?: string }) {
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
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
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

  const browseSortNonDefault = browseSort !== "name";

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

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <section className={sectionShell}>
        <div className={sectionHeaderRowClass}>
          <div className={sectionHeaderAccentClass} aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className={sectionTitleClass}>All cards</h1>
              <p className={sectionLeadClass}>
                {textFilteredCards.length === cards.length && !search.trim() ? (
                  <>
                    {cards.length} {cards.length === 1 ? "card" : "cards"} in the
                    catalog.
                  </>
                ) : (
                  <>
                    {textFilteredCards.length}{" "}
                    {textFilteredCards.length === 1 ? "card" : "cards"}{" "}
                    matching your criteria ({cards.length} in catalog).
                  </>
                )}{" "}
                {search.trim().length >= 2 ? (
                  <span className="text-zinc-500">
                    When AI is available, results can reorder by relevance after
                    you pause typing.
                  </span>
                ) : null}
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Desktop: filters in the left column. Phone: filters sit under the
                list. Tap <span className="font-medium text-zinc-600 dark:text-zinc-300">Sort</span>{" "}
                to change order.
              </p>
            </div>
            {!loading && !error && cards.length > 0 ? (
              <div
                className="flex shrink-0 items-center gap-2"
                role="toolbar"
                aria-label="Browse tools"
              >
                <button
                  type="button"
                  onClick={() => {
                    setBrowseSortOpen((o) => !o);
                  }}
                  className={`${browseToolbarBtnClass} border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${
                    browseSortOpen
                      ? "border-blue-400 ring-2 ring-blue-500/30 dark:border-blue-500/50"
                      : ""
                  }`}
                  aria-expanded={browseSortOpen}
                  aria-controls="browse-sort-panel"
                  title="Sort cards"
                >
                  <SortIcon className="h-[1.15rem] w-[1.15rem]" />
                  <span className="sr-only">Sort</span>
                  {browseSortNonDefault ? (
                    <span
                      className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={
            showFacetSidebar
              ? "mt-6 flex flex-col-reverse gap-5 lg:grid lg:grid-cols-[minmax(196px,232px)_minmax(0,1fr)] lg:gap-6 lg:items-start"
              : "mt-6"
          }
        >
          {showFacetSidebar ? (
            <aside
              id="browse-filter-panel"
              className="mb-6 shrink-0 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/50 sm:p-3.5 lg:sticky lg:top-20 lg:mb-0 lg:max-h-[min(100vh-5.5rem,42rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-0.5"
              aria-label="Catalog filters"
            >
            <div className="flex flex-col divide-y divide-zinc-200/80 dark:divide-zinc-600/50">
            <div className="flex items-start justify-between gap-2 pb-3">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <IconSlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                Filters
              </h2>
              {browseFiltersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilterAnnualBand("any");
                    setFilterBanks([]);
                    setFilterSpendFocus("all");
                    setFilterRewardType("all");
                    setFilterNetwork("all");
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                >
                  <IconArrowUturnLeft className="h-3 w-3 opacity-80" />
                  Reset
                </button>
              ) : null}
            </div>

            <div className="pt-3">
              <p className={browseFilterSectionLabelClass}>
                <IconBuildingBank className="h-3 w-3 shrink-0 opacity-70" />
                Bank
              </p>
              <p className="mb-1.5 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
                Tap one or more
              </p>
              <div
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
                          ? "border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500/35 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-100"
                          : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-200 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500"
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
            </div>

            <div className="pt-3">
              <p className={browseFilterSectionLabelClass}>
                <IconSquares2x2 className="h-3 w-3 shrink-0 opacity-70" />
                Spend category
              </p>
              <p className="mb-1.5 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
                Where this card earns most
              </p>
              <div
                className="flex flex-col gap-1.5"
                role="group"
                aria-label="Filter by strongest reward category"
              >
                {(
                  [
                    {
                      id: "all" as const,
                      label: "Any",
                      icon: IconSquares2x2,
                    },
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
                      onClick={() => setFilterSpendFocus(id)}
                      aria-pressed={on}
                      className={`${sidebarChipClass} ${
                        on
                          ? "border-indigo-500 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-500/35 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-50"
                          : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-200 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
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
            </div>

            <div className="pt-3">
              <p className={browseFilterSectionLabelClass}>
                <IconSparkles className="h-3 w-3 shrink-0 opacity-70" />
                Reward type
              </p>
              <div
                className="flex flex-col gap-1.5"
                role="group"
                aria-label="Filter by reward type"
              >
                {(
                  [
                    { id: "all" as const, label: "All", icon: IconLayers },
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
                      onClick={() => setFilterRewardType(id)}
                      aria-pressed={on}
                      className={`${sidebarChipClass} ${
                        on
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/35 dark:border-emerald-500 dark:bg-emerald-950/35 dark:text-emerald-50"
                          : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-200 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
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
            </div>

            <div className="pt-3">
              <p className={browseFilterSectionLabelClass}>
                <IconIndianRupee className="h-3 w-3 shrink-0 opacity-70" />
                Annual fee
              </p>
              <div
                className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1"
                role="group"
                aria-label="Filter by annual fee range"
              >
                {(
                  [
                    {
                      id: "any" as const,
                      label: "Any",
                      Icon: IconSquares2x2,
                    },
                    {
                      id: "free" as const,
                      label: "Free (₹0)",
                      Icon: IconGift,
                    },
                    { id: "r1_500" as const, label: "₹1 – ₹500", Icon: IconIndianRupee },
                    {
                      id: "r501_1000" as const,
                      label: "₹501 – ₹1,000",
                      Icon: IconIndianRupee,
                    },
                    {
                      id: "r1001_2500" as const,
                      label: "₹1,001 – ₹2,500",
                      Icon: IconIndianRupee,
                    },
                    {
                      id: "r2501_5000" as const,
                      label: "₹2,501 – ₹5,000",
                      Icon: IconIndianRupee,
                    },
                    {
                      id: "r5001_10000" as const,
                      label: "₹5,001 – ₹10,000",
                      Icon: IconIndianRupee,
                    },
                    {
                      id: "r10001_plus" as const,
                      label: "₹10,001+",
                      Icon: IconTrendingUp,
                    },
                  ] as const
                ).map(({ id, label, Icon: FeeIcon }) => {
                  const on = filterAnnualBand === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilterAnnualBand(id)}
                      aria-pressed={on}
                      className={`${sidebarChipClass} ${
                        on
                          ? "border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500/35 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-50"
                          : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-200 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      <FeeIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3">
              <p className={browseFilterSectionLabelClass}>
                <IconNetworkCard className="h-3 w-3 shrink-0 opacity-70" />
                Network
              </p>
              <div
                className="flex flex-col gap-1.5"
                role="group"
                aria-label="Filter by card network"
              >
                {(
                  [
                    { id: "all" as const, label: "All", Icon: IconNetworkCard },
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
                    : id === "all"
                      ? filterNetwork === "all"
                      : filterNetwork === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={netLocked}
                      onClick={() => {
                        if (!netLocked) setFilterNetwork(id);
                      }}
                      aria-pressed={on}
                      className={`${sidebarChipClass} ${
                        netLocked ? "cursor-not-allowed opacity-90" : ""
                      } ${
                        on
                          ? "border-violet-600 bg-violet-50 text-violet-950 ring-1 ring-violet-500/35 dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-50"
                          : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-200 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      <NetIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                      {label}
                    </button>
                  );
                })}
              </div>
              {catalogNetworkLock ? (
                <p className="mt-2 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                  Network locked to {catalogNetworkLock} via{" "}
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-[10px] dark:bg-zinc-800">
                    NEXT_PUBLIC_CARD_NETWORK
                  </code>
                  .
                </p>
              ) : null}
            </div>
            </div>
          </aside>
          ) : null}

          <div className="min-w-0">
            <div className="relative min-w-0">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                <IconSearch className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search credit cards…"
                className={`${headerInputClass} ${searchAiLoading ? "pr-11" : ""}`}
                aria-label="Search cards"
                aria-busy={searchAiLoading}
              />
              {searchAiLoading ? (
                <span
                  className="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center text-indigo-600 dark:text-indigo-400"
                  role="status"
                  aria-live="polite"
                >
                  <Spinner className="h-4 w-4" />
                  <span className="sr-only">Updating relevance order…</span>
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:text-left">
              <Link
                href="/#categories"
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Browse by category (all cards on each list)
              </Link>
            </p>

        {!loading && !error && cards.length > 0 && browseSortOpen ? (
          <div
            id="browse-sort-panel"
            className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-950/40"
          >
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <SortIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              Sort
            </h2>
            <label className="mt-2 block sm:flex sm:items-end sm:gap-3">
              <div className="min-w-0 flex-1">
                <span className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  Order by
                </span>
                <select
                  value={browseSort}
                  onChange={(e) =>
                    setBrowseSort(e.target.value as BrowseSortMode)
                  }
                  className={`${inputClass} py-2 text-sm`}
                >
                  <option value="name">Name (A–Z)</option>
                  <option value="annual_asc">Annual fee (low → high)</option>
                  <option value="annual_desc">Annual fee (high → low)</option>
                  <option value="joining_asc">Joining fee (low → high)</option>
                  <option value="joining_desc">Joining fee (high → low)</option>
                  <option value="ai">AI curated browse</option>
                </select>
              </div>
              {browseSort === "ai" ? (
                <span className="mt-2 flex items-center gap-2 text-xs text-zinc-500 sm:mt-0 sm:pb-2.5">
                  {browseAiLoading ? (
                    <>
                      <Spinner className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Loading order…
                    </>
                  ) : !browseAiOrder ? (
                    <>AI order unavailable — using A–Z</>
                  ) : null}
                </span>
              ) : null}
            </label>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : error ? (
          <div
            className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            <span className="font-semibold">Couldn’t load cards</span>
            <span>{error}</span>
          </div>
        ) : textFilteredCards.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
            {cards.length === 0 && !search.trim() ? (
              <>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  No cards in the database
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Production loads from Supabase (
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">
                    credit_cards
                  </code>
                  ), not from repo{" "}
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">
                    data/
                  </code>
                  . Import rows into the same Supabase project your Vercel env
                  points to, and confirm{" "}
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-xs dark:bg-zinc-800">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  and keys are set in Vercel.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
          <ul className="mt-8 space-y-6">
            {displayBrowseCards.map((card) => (
              <li
                key={card.id}
                className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${issuerBrandTileClass(card.bank, card.network)}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-white/90 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
                        {card.network}
                      </span>
                      <span className="inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-white/90 px-2.5 text-[11px] font-semibold tracking-wide text-zinc-700 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
                        {card.bank}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        <Link
                          href={`/card/${card.id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {card.card_name}
                        </Link>
                      </h2>
                      <CardTopRewardTag card={card} />
                    </div>
                    <CardKeyBenefits card={card} />
                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                      <div>
                        <span className="text-zinc-500">Annual fee </span>
                        <span className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatInr(card.annual_fee)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Joining fee </span>
                        <span className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatInr(card.joining_fee)}
                        </span>
                      </div>
                      <div className="font-medium capitalize">{card.reward_type}</div>
                    </dl>
                  </div>
                  <div className="flex w-full shrink-0 flex-col gap-2 sm:ml-auto sm:w-[9.5rem]">
                    <Link
                      href={`/card/${card.id}`}
                      className={`${cardViewDetailsButtonClass} w-full`}
                    >
                      View details
                    </Link>
                    {isAxisBankCard(card.bank) ? (
                      <AxisApplyLink className="w-full" />
                    ) : null}
                    {isAmexPlatinumReserveCard(card.card_name, card.bank) ? (
                      <AmexPlatinumReserveApplyLink className="w-full" />
                    ) : null}
                    {isAmexCardUsingGenericApply(card.card_name, card.bank) ? (
                      <AmexGenericApplyLink className="w-full" />
                    ) : null}
                    {isSbiCard(card.bank) ? (
                      <SbiApplyLink className="w-full" />
                    ) : null}
                    {hdfcCardShowsApply(card.bank, card.metadata) ? (
                      <HdfcApplyLink
                        metadata={card.metadata}
                        className="w-full"
                      />
                    ) : null}
                    {indusindCardShowsApply(card.bank, card.metadata) ? (
                      <IndusIndApplyLink
                        metadata={card.metadata}
                        className="w-full"
                      />
                    ) : null}
                  </div>
                </div>
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
