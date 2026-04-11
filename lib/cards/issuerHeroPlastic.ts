import type { CardNetwork } from "@/lib/types/card";
import { detectIssuerBrand } from "@/lib/cards/issuerBrandTile";

/**
 * Dark “plastic” surface for hero carousel card mock (readable on navy backdrop).
 */
export function issuerHeroPlasticClass(bank: string, network: CardNetwork): string {
  const base =
    "relative overflow-hidden rounded-2xl border shadow-2xl ring-1 ring-white/10";
  switch (detectIssuerBrand(bank)) {
    case "axis":
      return `${base} border-[#c43d6b]/35 bg-gradient-to-br from-[#6b1f35] via-[#3a1220] to-[#140608]`;
    case "amex":
      return `${base} border-[#2e8fdf]/40 bg-gradient-to-br from-[#0d3a5c] via-[#082438] to-[#050a12]`;
    case "sbi":
      return `${base} border-[#3d7ab8]/35 bg-gradient-to-br from-[#143a5c] via-[#0c2238] to-[#050d14]`;
    default: {
      const n = network;
      if (n === "Visa") {
        return `${base} border-blue-400/30 bg-gradient-to-br from-[#1e3a5f] via-[#0f172a] to-[#050a14]`;
      }
      if (n === "Mastercard") {
        return `${base} border-orange-400/25 bg-gradient-to-br from-[#5c2e14] via-[#2a1508] to-[#0c0603]`;
      }
      return `${base} border-cyan-400/25 bg-gradient-to-br from-[#134e5f] via-[#0a2830] to-[#050f12]`;
    }
  }
}
