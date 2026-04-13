/**
 * HDFC Bank cards: apply URL lives in catalog metadata (`links.apply` or `affiliate_link`).
 */

export function isHdfcBankCard(bank: string): boolean {
  return bank.toLowerCase().includes("hdfc");
}

export function hdfcApplyUrlFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const links = metadata.links;
  if (links && typeof links === "object" && !Array.isArray(links)) {
    const apply = (links as Record<string, unknown>).apply;
    if (typeof apply === "string") {
      const t = apply.trim();
      if (t.startsWith("http")) return t;
    }
  }
  const aff = metadata.affiliate_link;
  if (typeof aff === "string") {
    const t = aff.trim();
    if (t.startsWith("http")) return t;
  }
  return null;
}

export function hdfcCardShowsApply(
  bank: string,
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return isHdfcBankCard(bank) && hdfcApplyUrlFromMetadata(metadata) != null;
}
