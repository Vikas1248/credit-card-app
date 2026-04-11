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
 * Card tile surfaces: plastic-like layered gradients (specular + body), issuer-tinted edges.
 * Palettes loosely echo marketing cards (Axis burgundy, Amex blue, SBI navy); not official marks.
 */
export function issuerBrandTileClass(bank: string, network: CardNetwork): string {
  switch (detectIssuerBrand(bank)) {
    case "axis":
      return [
        "relative overflow-hidden border border-[#97144D]/22",
        "bg-[linear-gradient(125deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0)_42%),linear-gradient(158deg,#e8c4cf_0%,#ffffff_36%,#fff9f7_68%,#fde8e4_100%)]",
        "shadow-[0_8px_32px_-8px_rgba(151,20,77,0.2),inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(151,20,77,0.06)]",
        "dark:border-[#c43d6b]/28",
        "dark:bg-[linear-gradient(125deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_38%),linear-gradient(155deg,#6b1f35_0%,#3a1220_38%,#1a0a10_100%)]",
        "dark:shadow-[0_14px_44px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)]",
      ].join(" ");
    case "amex":
      return [
        "relative overflow-hidden border border-[#006FCF]/35",
        "bg-[linear-gradient(125deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_40%),linear-gradient(158deg,#c5ddf0_0%,#ffffff_38%,#f0f7fd_72%,#d8e9f7_100%)]",
        "shadow-[0_8px_28px_-8px_rgba(0,111,207,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]",
        "dark:border-[#2e8fdf]/35",
        "dark:bg-[linear-gradient(125deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_36%),linear-gradient(155deg,#0d3a5c_0%,#082438_40%,#051018_100%)]",
        "dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)]",
      ].join(" ");
    case "sbi":
      return [
        "relative overflow-hidden border border-[#0D4580]/28",
        "bg-[linear-gradient(125deg,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0)_40%),linear-gradient(158deg,#c9d8e8_0%,#ffffff_38%,#f2f6fb_70%,#dce6f2_100%)]",
        "shadow-[0_8px_28px_-8px_rgba(13,69,128,0.16),inset_0_1px_0_rgba(255,255,255,0.9)]",
        "dark:border-[#3d7ab8]/30",
        "dark:bg-[linear-gradient(125deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_36%),linear-gradient(155deg,#143a5c_0%,#0c2238_42%,#050d14_100%)]",
        "dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]",
      ].join(" ");
    default:
      return networkTileSurfaceClass(network);
  }
}
