import Link from "next/link";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Minimal masthead: identity and theme control, no section navigation.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/module/1"
          className="flex items-center gap-2.5 focus-visible:outline-none"
          aria-label="Qollab, back to the cover"
        >
          <span className="relative flex h-8 w-8 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-accent/45" />
            <span className="absolute inset-0 rounded-full border border-accent/25 [transform:rotateX(65deg)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-ink">
              Qollab
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              Module 1 · QEC
            </span>
          </span>
        </Link>

        <span className="ml-3 hidden text-xs text-faint sm:block">
          Understanding quantum errors
        </span>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
