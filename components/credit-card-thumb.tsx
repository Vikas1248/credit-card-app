import Image from "next/image";

const PLACEHOLDER_DEFAULT = "/card-placeholder.svg";
const PLACEHOLDER_AXIS = "/card-placeholder-axis.svg";

function placeholderSrcForBank(bank: string | undefined): string {
  if (bank && /\baxis\b/i.test(bank)) {
    return PLACEHOLDER_AXIS;
  }
  return PLACEHOLDER_DEFAULT;
}

type CreditCardThumbFillProps = {
  /** When bank name includes "Axis", uses Axis-inspired purple/magenta art (not official branding). */
  bank?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/** Decorative card graphic. Parent must be `relative` with explicit size. */
export function CreditCardThumbFill({
  bank,
  className,
  sizes = "(max-width: 768px) 90vw, 280px",
  priority,
}: CreditCardThumbFillProps) {
  const src = placeholderSrcForBank(bank);
  return (
    <Image
      key={src}
      src={src}
      alt=""
      fill
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
