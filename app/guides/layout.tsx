import Link from "next/link";
import type { ReactNode } from "react";

export default function GuidesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-950">
      <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-black tracking-tight text-zinc-900 hover:text-blue-700"
          >
            CredGenie
          </Link>
          <Link
            href="/guides"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            All guides
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
