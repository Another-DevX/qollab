"use client";

import Link from "next/link";

import { BlochSphere } from "@/components/bloch/BlochSphere";
import { blochTuple, blochVector, KET_PLUS_I } from "@/lib/quantum";
import { usePalette } from "@/lib/theme";

/** Cover spread: restrained, editorial, one accent. */
export function ModuleHero() {
  const palette = usePalette();
  const heroVector = blochVector(KET_PLUS_I);

  return (
    <header id="cover" className="pt-4 sm:pt-10">
      <div className="grid gap-12 lg:grid-cols-[1.12fr_1fr] lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-10 bg-accent" />
            <span className="eyebrow">Module 1 — Quantum Error Correction</span>
          </div>

          <h1 className="headline mt-6 text-[2.75rem] leading-[1.04] sm:text-6xl">
            Understanding quantum errors
          </h1>

          <p className="mt-5 max-w-[34ch] text-lg text-muted sm:text-xl">
            A qubit is fragile. To protect it, we first need to see how it
            fails.
          </p>

          <p className="dek mt-4">
            Follow a single qubit across the Bloch sphere: how the Pauli errors
            <span className="text-ink"> X</span>,<span className="text-ink"> Y</span> and
            <span className="text-ink"> Z</span> move it, why they form a
            complete basis, and how to identify the error behind a given outcome.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/module/1/pauli-errors"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Start reading
            </Link>
            <span className="caption">
              ≈ 10 min · 3 experiments, 1 challenge
            </span>
          </div>
        </div>

        <BlochSphere
          arrows={[
            { id: "hero", vector: blochTuple(heroVector), color: palette.original },
          ]}
          autoRotate
          className="h-[320px] w-full sm:h-[400px]"
          ariaLabel="Bloch sphere, rotating, showing the state |+i⟩"
        />
      </div>
    </header>
  );
}
