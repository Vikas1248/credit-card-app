import Image from "next/image";

const PLACEHOLDER_DEFAULT = "/card-placeholder.svg";
const PLACEHOLDER_AXIS = "/card-placeholder-axis.svg";
const PLACEHOLDER_SBI = "/card-placeholder-sbi.svg";

function placeholderSrcForBank(bank: string | undefined): string {
  if (bank && /\baxis\b/i.test(bank)) {
    return PLACEHOLDER_AXIS;
  }
  if (bank && /\bsbi\b/i.test(bank)) {
    return PLACEHOLDER_SBI;
  }
  return PLACEHOLDER_DEFAULT;
}

type CreditCardThumbFillProps = {
  /** Axis / SBI use bank-coloured placeholder art (not issuer logos). */
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
