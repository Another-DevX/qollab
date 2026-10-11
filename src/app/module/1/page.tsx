import type { Metadata } from "next";
import Link from "next/link";

import { ModuleHero } from "@/components/experience/ModuleHero";

export const metadata: Metadata = {
  title: "Cover",
};

const ROUTE = [
  {
    n: "01",
    href: "/module/1/pauli-errors",
    title: "Pauli errors",
    line: "What X, Y and Z do to a qubit.",
  },
  {
    n: "02",
    href: "/module/1/pauli-basis",
    title: "Pauli basis",
    line: "Why four matrices describe every operator.",
  },
  {
    n: "03",
    href: "/module/1/challenge",
    title: "Challenge",
    line: "Identify the error behind an outcome.",
  },
];

export default function CoverPage() {
  return (
    <>
      <ModuleHero />

      {/* Route: a reading guide, not a navigation bar. */}
      <section aria-label="Module route" className="mt-16">
        <div className="flex items-center gap-4">
          <span className="eyebrow text-faint">The route</span>
          <span className="rule flex-1" />
        </div>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {ROUTE.map((item) => (
            <li key={item.href} className="border-t border-line pt-4">
              <Link
                href={item.href}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <span className="serif text-2xl text-accent/80">{item.n}</span>
                <p className="mt-2 text-base font-semibold text-ink">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {item.line}
                </p>
                <span className="mt-2 inline-block text-sm text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Read →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
