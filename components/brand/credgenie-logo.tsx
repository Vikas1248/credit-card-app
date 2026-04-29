import { useId } from "react";
import { cn } from "@/lib/utils";

type CredGenieLogoProps = {
  iconOnly?: boolean;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
};

function CredGenieMark({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, "");

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
          <linearGradient
            id={`${gid}-card`}
            x1="4"
            y1="10"
            x2="72"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient
            id={`${gid}-circuit`}
            x1="54"
            y1="7"
            x2="110"
            y2="55"
            gradientUnits="userSpaceOnUse"
          >
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
          fill={`url(#${gid}-card)`}
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
          stroke={`url(#${gid}-circuit)`}
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
        <circle cx="58" cy="13" r="4" fill={`url(#${gid}-circuit)`} />
        <circle cx="85" cy="5" r="4" fill={`url(#${gid}-circuit)`} />
        <circle cx="96" cy="29" r="4" fill={`url(#${gid}-circuit)`} />
        <circle cx="58" cy="36" r="4" fill="white" />
        <circle cx="84" cy="44" r="4" fill="white" />
        <path
          d="M86 25L108 47L90 48C84 48 78 51 74 56C69 62 61 61 57 57"
          stroke={`url(#${gid}-circuit)`}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M72 56C68 58 64 61 61 64"
          stroke={`url(#${gid}-circuit)`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* AI neural cluster (design: replaces generic sparkles) */}
        <path
          d="M100 8 L112 5 M112 5 L118 14 M100 8 L106 16 M118 14 L128 10"
          stroke={`url(#${gid}-circuit)`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="8" r="3.5" fill={`url(#${gid}-circuit)`} />
        <circle cx="112" cy="5" r="3.5" fill={`url(#${gid}-circuit)`} />
        <circle cx="118" cy="14" r="3.2" fill={`url(#${gid}-circuit)`} />
        <circle
          cx="106"
          cy="16"
          r="3"
          fill="white"
          stroke={`url(#${gid}-circuit)`}
          strokeWidth="1.3"
        />
        <circle cx="128" cy="10" r="2.8" fill={`url(#${gid}-circuit)`} />
      </svg>
    </span>
  );
}

function CredGenieIconMark({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, "");

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
          <linearGradient
            id={`${gid}-icon-card`}
            x1="8"
            y1="23"
            x2="37"
            y2="41"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient
            id={`${gid}-icon-circuit`}
            x1="31"
            y1="9"
            x2="58"
            y2="43"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <rect
          x="8"
          y="23"
          width="30"
          height="18"
          rx="4"
          fill={`url(#${gid}-icon-card)`}
        />
        <rect
          x="13"
          y="28"
          width="8"
          height="5"
          rx="1.2"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M13 37H32"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M35 19H43M43 19L47 15M35 25H41M41 25L46 30H54"
          stroke={`url(#${gid}-icon-circuit)`}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M48 25L57 35L49 35.5C45 35.8 42 37.5 40 40C37 43.5 33 43 31 41"
          stroke={`url(#${gid}-icon-circuit)`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="35" cy="19" r="2.3" fill={`url(#${gid}-icon-circuit)`} />
        <circle cx="47" cy="15" r="2.3" fill={`url(#${gid}-icon-circuit)`} />
        <circle cx="54" cy="30" r="2.3" fill={`url(#${gid}-icon-circuit)`} />
        <path
          d="M44 8 L50 6 M50 6 L54 11 M44 8 L48 13 M54 11 L58 8"
          stroke={`url(#${gid}-icon-circuit)`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="44" cy="8" r="2.2" fill={`url(#${gid}-icon-circuit)`} />
        <circle cx="50" cy="6" r="2.2" fill={`url(#${gid}-icon-circuit)`} />
        <circle cx="54" cy="11" r="2" fill={`url(#${gid}-icon-circuit)`} />
        <circle
          cx="48"
          cy="13"
          r="1.8"
          fill="white"
          stroke={`url(#${gid}-icon-circuit)`}
          strokeWidth="0.85"
        />
        <circle cx="58" cy="8" r="1.7" fill={`url(#${gid}-icon-circuit)`} />
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
          "text-2xl font-black leading-none tracking-tight sm:text-3xl",
          wordmarkClassName
        )}
      >
        <span className="text-[#1e293b]">Cred</span>
        <span className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] bg-clip-text text-transparent">
          Genie
        </span>
      </span>
    </span>
  );
}
