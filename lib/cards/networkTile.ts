import type { CardNetwork } from "@/lib/types/card";

/**
 * Plastic-style card surfaces (network-inspired tints, not brand marks).
 */
export function networkTileSurfaceClass(network: CardNetwork): string {
  switch (network) {
    case "Visa":
      return [
        "relative overflow-hidden border border-blue-300/55",
        "bg-[linear-gradient(125deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0)_40%),linear-gradient(158deg,#bfdbfe_0%,#ffffff_38%,#eff6ff_70%,#dbeafe_100%)]",
        "shadow-[0_8px_28px_-8px_rgba(37,99,235,0.14),inset_0_1px_0_rgba(255,255,255,0.9)]",
        "dark:border-blue-600/35",
        "dark:bg-[linear-gradient(125deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_36%),linear-gradient(155deg,#1e3a5f_0%,#0f172a_42%,#050a12_100%)]",
        "dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]",
      ].join(" ");
    case "Mastercard":
      return [
        "relative overflow-hidden border border-orange-300/50",
        "bg-[linear-gradient(125deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0)_40%),linear-gradient(158deg,#fcd9bd_0%,#ffffff_38%,#fff7ed_70%,#ffedd5_100%)]",
        "shadow-[0_8px_28px_-8px_rgba(234,88,12,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]",
        "dark:border-orange-700/35",
        "dark:bg-[linear-gradient(125deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_36%),linear-gradient(155deg,#5c2e14_0%,#2a1508_42%,#120a04_100%)]",
        "dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)]",
      ].join(" ");
    case "Amex":
      return [
        "relative overflow-hidden border border-cyan-300/50",
        "bg-[linear-gradient(125deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0)_40%),linear-gradient(158deg,#a5e8f5_0%,#ffffff_38%,#ecfeff_70%,#cffafe_100%)]",
        "shadow-[0_8px_28px_-8px_rgba(8,145,178,0.14),inset_0_1px_0_rgba(255,255,255,0.9)]",
        "dark:border-cyan-700/35",
        "dark:bg-[linear-gradient(125deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_36%),linear-gradient(155deg,#134e5f_0%,#0a2830_42%,#050f12_100%)]",
        "dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]",
      ].join(" ");
    default: {
      const _e: never = network;
      return _e;
    }
  }
}
