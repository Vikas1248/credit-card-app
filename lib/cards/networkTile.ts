import type { CardNetwork } from "@/lib/types/card";

/**
 * Soft gradient + border for card surfaces (network-inspired tints, not brand marks).
 */
export function networkTileSurfaceClass(network: CardNetwork): string {
  switch (network) {
    case "Visa":
      return "border-blue-200/70 bg-gradient-to-br from-blue-50/95 via-white to-indigo-50/80 dark:border-blue-800/45 dark:from-blue-950/40 dark:via-zinc-900 dark:to-indigo-950/35";
    case "Mastercard":
      return "border-orange-200/70 bg-gradient-to-br from-orange-50/95 via-white to-amber-50/75 dark:border-orange-900/40 dark:from-orange-950/35 dark:via-zinc-900 dark:to-amber-950/25";
    case "Amex":
      return "border-cyan-200/70 bg-gradient-to-br from-cyan-50/95 via-white to-sky-50/80 dark:border-cyan-900/40 dark:from-cyan-950/35 dark:via-zinc-900 dark:to-sky-950/30";
    default: {
      const _e: never = network;
      return _e;
    }
  }
}
