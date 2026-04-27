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
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] shadow-md shadow-indigo-600/20",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 40 40"
        className="h-8 w-8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="7.5"
          y="10"
          width="25"
          height="17"
          rx="4"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M10 15.5h20"
          stroke="#c7d2fe"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18.6 23.3c-.9.9-2 1.3-3.3 1.3-2.6 0-4.5-1.9-4.5-4.5s1.9-4.5 4.5-4.5c1.4 0 2.5.5 3.3 1.4"
          stroke="#4f46e5"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M26.8 17.2c-.8-.9-1.8-1.4-3.1-1.4-2.6 0-4.5 1.9-4.5 4.4s1.9 4.4 4.5 4.4c1.2 0 2.3-.4 3.1-1.2v-2.5h-3.1"
          stroke="#7c3aed"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="27.6" cy="9" r="1.7" fill="white" />
        <circle cx="32.3" cy="6.8" r="1.2" fill="white" fillOpacity="0.9" />
        <circle cx="33.6" cy="12" r="1.1" fill="white" fillOpacity="0.85" />
        <path
          d="M29.1 8.3l2.1-1M29.1 9.8l3.3 1.6"
          stroke="white"
          strokeOpacity="0.78"
          strokeWidth="1"
          strokeLinecap="round"
        />
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
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <CredGenieMark className={iconClassName} />
      {!iconOnly ? (
        <span
          className={cn(
            "text-sm font-black tracking-tight text-[#1e293b]",
            wordmarkClassName
          )}
        >
          <span>Cred</span>
          <span className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] bg-clip-text text-transparent">
            Genie
          </span>
        </span>
      ) : null}
    </span>
  );
}
