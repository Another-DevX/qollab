"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Ensures every page starts at the top of the viewport on navigation.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}
