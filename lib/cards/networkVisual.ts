import type { CardNetwork } from "@/lib/types/card";

/** Vertical accent bar (payment network–inspired, not official brand assets). */
export function networkRailClass(network: CardNetwork): string {
  switch (network) {
    case "Visa":
      return "bg-gradient-to-b from-blue-500 via-blue-700 to-indigo-900";
    case "Mastercard":
      return "bg-gradient-to-b from-red-600 via-orange-500 to-amber-400";
    case "Amex":
      return "bg-gradient-to-b from-sky-500 to-teal-600";
    default: {
      const _exhaustive: never = network;
      return _exhaustive;
    }
  }
}

/** Small pill / badge for network label. */
export function networkPillClass(network: CardNetwork): string {
  switch (network) {
    case "Visa":
      return "bg-blue-100 text-blue-900 ring-1 ring-blue-200/80 dark:bg-blue-950/70 dark:text-blue-100 dark:ring-blue-800/60";
    case "Mastercard":
      return "bg-orange-100 text-orange-950 ring-1 ring-orange-200/80 dark:bg-orange-950/60 dark:text-orange-100 dark:ring-orange-900/50";
    case "Amex":
      return "bg-cyan-100 text-cyan-950 ring-1 ring-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-100 dark:ring-cyan-800/50";
    default: {
      const _exhaustive: never = network;
      return _exhaustive;
    }
  }
}
