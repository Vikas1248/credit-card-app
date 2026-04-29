"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * HTML id for SVG href must be valid and stable across SSR + hydration.
 * Design ref: https://pry-square-73654317.figma.site/ (gradient + slate + purple)
 */
function useSvgIdScope(prefix: string) {
  const raw = useId().replace(/:/g, "");
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "x");
  const scope = safe.length > 0 && /^[a-zA-Z_]/.test(safe) ? safe : `g${safe}`;
  return (name: string) => `cgl-${prefix}-${name}-${scope}`;
}

type CredGenieLogoProps = {
  iconOnly?: boolean;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
};

function CredGenieMark({ className }: { className?: string }) {
  const id = useSvgIdScope("mark");
  const idCard = id("card");
  const idCircuit = id("circuit");

  return (
    <span
      className={cn(
        "relative flex h-10 w-[7.5rem] min-w-0 shrink-0 items-center justify-center overflow-visible",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 134 64"
        className="h-full w-full max-h-10 min-h-[2.5rem] overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient
            id={idCard}
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
            id={idCircuit}
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
          fill={`url(#${idCard})`}
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
          stroke={`url(#${idCircuit})`}
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
        <circle cx="58" cy="13" r="4" fill={`url(#${idCircuit})`} />
        <circle cx="85" cy="5" r="4" fill={`url(#${idCircuit})`} />
        <circle cx="96" cy="29" r="4" fill={`url(#${idCircuit})`} />
        <circle cx="58" cy="36" r="4" fill="white" />
        <circle cx="84" cy="44" r="4" fill="white" />
        <path
          d="M86 25L108 47L90 48C84 48 78 51 74 56C69 62 61 61 57 57"
          stroke={`url(#${idCircuit})`}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M72 56C68 58 64 61 61 64"
          stroke={`url(#${idCircuit})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M100 8 L112 5 M112 5 L118 14 M100 8 L106 16 M118 14 L128 10"
          stroke={`url(#${idCircuit})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="8" r="3.5" fill={`url(#${idCircuit})`} />
        <circle cx="112" cy="5" r="3.5" fill={`url(#${idCircuit})`} />
        <circle cx="118" cy="14" r="3.2" fill={`url(#${idCircuit})`} />
        <circle
          cx="106"
          cy="16"
          r="3"
          fill="white"
          stroke={`url(#${idCircuit})`}
          strokeWidth="1.3"
        />
        <circle cx="128" cy="10" r="2.8" fill={`url(#${idCircuit})`} />
      </svg>
    </span>
  );
}

function CredGenieIconMark({ className }: { className?: string }) {
  const id = useSvgIdScope("icon");
  const idCard = id("card");
  const idCircuit = id("circuit");

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
        className="h-full w-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient
            id={idCard}
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
            id={idCircuit}
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
          fill={`url(#${idCard})`}
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
          stroke={`url(#${idCircuit})`}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M48 25L57 35L49 35.5C45 35.8 42 37.5 40 40C37 43.5 33 43 31 41"
          stroke={`url(#${idCircuit})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="35" cy="19" r="2.3" fill={`url(#${idCircuit})`} />
        <circle cx="47" cy="15" r="2.3" fill={`url(#${idCircuit})`} />
        <circle cx="54" cy="30" r="2.3" fill={`url(#${idCircuit})`} />
        <path
          d="M44 8 L50 6 M50 6 L54 11 M44 8 L48 13 M54 11 L58 8"
          stroke={`url(#${idCircuit})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="44" cy="8" r="2.2" fill={`url(#${idCircuit})`} />
        <circle cx="50" cy="6" r="2.2" fill={`url(#${idCircuit})`} />
        <circle cx="54" cy="11" r="2" fill={`url(#${idCircuit})`} />
        <circle
          cx="48"
          cy="13"
          r="1.8"
          fill="white"
          stroke={`url(#${idCircuit})`}
          strokeWidth="0.85"
        />
        <circle cx="58" cy="8" r="1.7" fill={`url(#${idCircuit})`} />
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
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <CredGenieMark className={iconClassName} />
      <span
        className={cn(
          "min-w-0 text-2xl font-black leading-none tracking-tight sm:text-3xl",
          wordmarkClassName
        )}
      >
        <span className="text-[#1e293b]">Cred</span>
        {/* Figma system: gradient icon + slate Cred + purple-accent Genie */}
        <span className="inline-block bg-gradient-to-r from-[#6366f1] via-[#9333ea] to-[#a855f7] bg-clip-text text-transparent">
          Genie
        </span>
      </span>
    </span>
  );
}
