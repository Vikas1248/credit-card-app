import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/credgenie-logo.png";
const LOGO_W = 1024;
const LOGO_H = 682;

type CredGenieLogoProps = {
  iconOnly?: boolean;
  className?: string;
  iconClassName?: string;
  /** Applied to the wrapper when showing the full raster wordmark. */
  wordmarkClassName?: string;
};

/**
 * Official CredGenie logo (`public/brand/credgenie-logo.png`).
 * `iconOnly` crops the left portion for square FAB / icon slots.
 */
export function CredGenieLogo({
  iconOnly = false,
  className,
  iconClassName,
  wordmarkClassName,
}: CredGenieLogoProps) {
  if (iconOnly) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <span
          className={cn(
            "relative block shrink-0 overflow-hidden bg-white",
            iconClassName
          )}
        >
          <Image
            src={LOGO_SRC}
            alt="CredGenie"
            width={LOGO_W}
            height={LOGO_H}
            className="h-full w-[265%] max-w-none object-cover object-left"
            sizes="80px"
          />
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center",
        className,
        wordmarkClassName
      )}
    >
      <Image
        src={LOGO_SRC}
        alt="CredGenie"
        width={LOGO_W}
        height={LOGO_H}
        className="h-8 w-auto sm:h-9 lg:h-10"
        priority
        sizes="(max-width: 640px) 200px, 240px"
      />
    </span>
  );
}
