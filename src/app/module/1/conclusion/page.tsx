import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/experience/BackLink";

export const metadata: Metadata = {
  title: "Conclusion",
};

export default function Page() {
  return (
    <>
      <BackLink href="/module/1/challenge" label="Challenge" />

      <section id="page-4" className="scroll-mt-24 border-t border-line pt-8">
        <p className="eyebrow text-faint">Next</p>
        <h2 className="headline mt-3 text-3xl sm:text-4xl">Where this goes</h2>
        <p className="dek mt-4">
          You can now read the three Pauli errors, write any operator as a Pauli
          combination, and recognize an error from its outcome.
        </p>
        <p className="dek mt-3">
          Next: decoherence — how the environment turns a pure state mixed — and
          the first quantum error-correcting codes.
        </p>

        <div className="mt-8">
          <Link
            href="/module/1"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-surface-2 px-5 text-sm font-medium text-ink transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <span aria-hidden>↑</span> Back to the cover
          </Link>
        </div>
      </section>
    </>
  );
}
