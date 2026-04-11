import type { CardNetwork } from "@/lib/types/card";
import { networkTileSurfaceClass } from "@/lib/cards/networkTile";

export type IssuerBrandKind = "axis" | "amex" | "sbi" | "other";

/** Map `bank` field from catalog to issuer (UI styling only, not official marks). */
export function detectIssuerBrand(bank: string): IssuerBrandKind {
  const b = bank.toLowerCase().trim();
  if (b.includes("axis")) return "axis";
  if (b.includes("american express") || b === "amex") return "amex";
  if (b.includes("sbi")) return "sbi";
  return "other";
}

/**
 * Card tile surface: Axis burgundy family, Amex blue, SBI navy — then Visa/MC/Amex network tints.
 */
export function issuerBrandTileClass(bank: string, network: CardNetwork): string {
  switch (detectIssuerBrand(bank)) {
    case "axis":
      return "border-rose-800/25 bg-gradient-to-br from-rose-100/90 via-white to-amber-50/55 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] dark:border-rose-500/25 dark:from-rose-950/55 dark:via-zinc-900 dark:to-[#1a0a0d]/90";
    case "amex":
      return "border-[#006FCF]/40 bg-gradient-to-br from-[#e8f3fc]/95 via-white to-[#d0e8f9]/70 dark:border-[#006FCF]/35 dark:from-[#0a1c2e]/88 dark:via-zinc-900 dark:to-[#051525]/92";
    case "sbi":
      return "border-[#0D4580]/30 bg-gradient-to-br from-slate-100/95 via-white to-blue-100/65 dark:border-blue-500/25 dark:from-[#0c1929]/90 dark:via-zinc-900 dark:to-[#071018]/92";
    default:
      return networkTileSurfaceClass(network);
  }
}
