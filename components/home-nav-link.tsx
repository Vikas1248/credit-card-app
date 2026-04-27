"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type HomeNavLinkProps = {
  className?: string;
  children: ReactNode;
};

/**
 * Home in the site header: from other routes goes to /#hero; on the homepage
 * it smooth-scrolls to the hero (Next.js does not scroll on same-route /).
 */
export function HomeNavLink({ className, children }: HomeNavLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      href="/#hero"
      className={className}
      onClick={(e) => {
        if (pathname === "/") {
          e.preventDefault();
          document.getElementById("hero")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          window.history.replaceState(null, "", "/");
        }
      }}
    >
      {children}
    </Link>
  );
}
