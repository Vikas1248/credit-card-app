import Image from "next/image";

const PLACEHOLDER_SRC = "/card-placeholder.svg";

type CreditCardThumbFillProps = {
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/** Decorative generic card graphic (not issuer artwork). Parent must be `relative` with explicit size. */
export function CreditCardThumbFill({
  className,
  sizes = "(max-width: 768px) 90vw, 280px",
  priority,
}: CreditCardThumbFillProps) {
  return (
    <Image
      src={PLACEHOLDER_SRC}
      alt=""
      fill
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
