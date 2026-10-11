import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Editorial transition to the next page: poses the question that opens the
 * next spread and offers the natural way to continue reading.
 */
export function PageTransition({
  nextNumber,
  question,
  teaser,
  href,
  action,
}: {
  nextNumber: string;
  question: string;
  teaser: ReactNode;
  href: string;
  action: string;
}) {
  return (
    <aside className="mt-16 border-t border-line pt-8">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
        <div className="serif text-5xl leading-none text-accent/70">
          {nextNumber}
        </div>
        <div>
          <p className="eyebrow text-faint">Next</p>
          <p className="headline mt-2 text-2xl sm:text-3xl">{question}</p>
          <p className="dek mt-3 max-w-[52ch]">{teaser}</p>
          <Link
            href={href}
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            {action}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
