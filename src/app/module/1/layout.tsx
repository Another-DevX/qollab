import type { ReactNode } from "react";

import { ScrollToTop } from "@/components/site/ScrollToTop";

/** Shared page frame for every module page (keeps the original container). */
export default function ModuleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-12 sm:px-6">
      <ScrollToTop />
      {children}
    </div>
  );
}
