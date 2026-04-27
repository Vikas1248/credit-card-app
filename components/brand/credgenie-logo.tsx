import { cn } from "@/lib/utils";

type CredGenieLogoProps = {
  iconOnly?: boolean;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
};

function CredGenieMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex h-10 w-[7rem] shrink-0 items-center justify-center",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 134 64"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="credgenie-card" x1="4" y1="10" x2="72" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient id="credgenie-circuit" x1="54" y1="7" x2="110" y2="55" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="19"
          width="62"
          height="36"
          rx="7"
          fill="url(#credgenie-card)"
        />
        <rect
          x="12"
          y="30"
          width="16"
          height="10"
          rx="2.5"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M12 48H53"
          stroke="white"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M58 13H77M77 13L85 5M58 20H71M71 20L80 29H96"
          stroke="url(#credgenie-circuit)"
          strokeWidth="4.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M58 27H77M77 27L87 18M58 36H75M75 36L84 44"
          stroke="white"
          strokeWidth="4.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="58" cy="13" r="4" fill="url(#credgenie-circuit)" />
        <circle cx="85" cy="5" r="4" fill="url(#credgenie-circuit)" />
        <circle cx="96" cy="29" r="4" fill="url(#credgenie-circuit)" />
        <circle cx="58" cy="36" r="4" fill="white" />
        <circle cx="84" cy="44" r="4" fill="white" />
        <path
          d="M86 25L108 47L90 48C84 48 78 51 74 56C69 62 61 61 57 57"
          stroke="url(#credgenie-circuit)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M72 56C68 58 64 61 61 64"
          stroke="url(#credgenie-circuit)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path d="M104 3L107 9L113 12L107 15L104 21L101 15L95 12L101 9L104 3Z" fill="#7C3AED" />
        <path d="M120 8L122 12L126 14L122 16L120 20L118 16L114 14L118 12L120 8Z" fill="#A855F7" />
      </svg>
    </span>
  );
}

function CredGenieIconMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f8fafc]",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="credgenie-icon-card" x1="8" y1="23" x2="37" y2="41" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient id="credgenie-icon-circuit" x1="31" y1="9" x2="58" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <rect x="8" y="23" width="30" height="18" rx="4" fill="url(#credgenie-icon-card)" />
        <rect x="13" y="28" width="8" height="5" rx="1.2" fill="white" fillOpacity="0.95" />
        <path d="M13 37H32" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M35 19H43M43 19L47 15M35 25H41M41 25L46 30H54" stroke="url(#credgenie-icon-circuit)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M48 25L57 35L49 35.5C45 35.8 42 37.5 40 40C37 43.5 33 43 31 41" stroke="url(#credgenie-icon-circuit)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="35" cy="19" r="2.3" fill="url(#credgenie-icon-circuit)" />
        <circle cx="47" cy="15" r="2.3" fill="url(#credgenie-icon-circuit)" />
        <circle cx="54" cy="30" r="2.3" fill="url(#credgenie-icon-circuit)" />
        <path d="M52 9L54 13L58 15L54 17L52 21L50 17L46 15L50 13L52 9Z" fill="#7C3AED" />
      </svg>
    </span>
  );
}

export function CredGenieLogo({
  iconOnly = false,
  className,
  iconClassName,
  wordmarkClassName,
}: CredGenieLogoProps) {
  if (iconOnly) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <CredGenieIconMark className={iconClassName} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <CredGenieMark className={iconClassName} />
      <span
        className={cn(
          "text-2xl font-black leading-none tracking-tight text-[#0f2557] sm:text-3xl",
          wordmarkClassName
        )}
      >
        <span>Cred</span>
        <span className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] bg-clip-text text-transparent">
          Genie
        </span>
      </span>
    </span>
  );
}
