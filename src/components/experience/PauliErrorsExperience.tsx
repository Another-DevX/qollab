"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { BlochSphere } from "@/components/bloch/BlochSphere";
import type { BlochArrow } from "@/components/bloch/types";
import { Equation } from "@/components/math/Equation";
import { MathMatrix } from "@/components/math/MathMatrix";
import { Tex } from "@/components/math/Tex";
import { latexComplex } from "@/components/math/latex";
import { PageTransition } from "@/components/experience/PageTransition";
import { PAULI_INFO, pauliColor } from "@/components/experience/pauliInfo";
import { QubitReadout } from "@/components/experience/QubitReadout";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { Expandable, KeyIdea, Notice, PageHeader } from "@/components/ui/editorial";
import { Button, Chip, LegendItem, Panel } from "@/components/ui/primitives";
import {
  KET_0,
  NAMED_STATES,
  areEquivalentUpToPhase,
  blochToSpherical,
  blochTuple,
  blochVector,
  composePauliSequence,
  formatPi,
  ketState,
  matVec,
  namedStateByKey,
  pauliMatrix,
  radToDeg,
  type PauliName,
  type Spinor,
} from "@/lib/quantum";
import { usePalette } from "@/lib/theme";

const ERROR_ORDER: readonly Exclude<PauliName, "I">[] = ["X", "Y", "Z"];

const DEMOS: Record<
  "X" | "Y" | "Z",
  {
    line: string;
    basis: Array<[string, string]>;
    super: Array<[string, string]>;
    why: { q: string; a: string };
  }
> = {
  X: {
    line: "X swaps the two basis states — a bit flip.",
    basis: [
      ["X\\,|0\\rangle", "|1\\rangle"],
      ["X\\,|1\\rangle", "|0\\rangle"],
    ],
    super: [
      ["X\\,|+\\rangle", "|+\\rangle"],
      ["X\\,|-\\rangle", "-|-\\rangle"],
    ],
    why: {
      q: "Why are |+⟩ and |−⟩ unchanged?",
      a: "They are the eigenstates of X. Applying X to an eigenstate only adds a global phase, so the point on the sphere stays put.",
    },
  },
  Y: {
    line: "Y flips the bit and the phase together.",
    basis: [
      ["Y\\,|0\\rangle", "i\\,|1\\rangle"],
      ["Y\\,|1\\rangle", "-i\\,|0\\rangle"],
    ],
    super: [
      ["Y\\,|+i\\rangle", "|+i\\rangle"],
      ["Y\\,|-i\\rangle", "-|-i\\rangle"],
    ],
    why: {
      q: "Why is Y = iXZ?",
      a: "Multiplying the matrices gives XY = iZ, hence Y = iXZ up to a global phase. Geometrically, Y is a π rotation that combines the X and Z motions.",
    },
  },
  Z: {
    line: "Z keeps the populations; it flips the relative phase.",
    basis: [
      ["Z\\,|0\\rangle", "|0\\rangle"],
      ["Z\\,|1\\rangle", "-|1\\rangle"],
    ],
    super: [
      ["Z\\,|+\\rangle", "|-\\rangle"],
      ["Z\\,|-\\rangle", "|+\\rangle"],
    ],
    why: {
      q: "Why is a lone minus sign invisible?",
      a: "On a basis state, −|1⟩ and |1⟩ differ only by a global phase, which no measurement can detect. In a superposition the same minus sign becomes a relative phase — and that is observable, as |+⟩ → |−⟩ shows.",
    },
  },
};

function amplitudeChanged(a: Spinor[number], b: Spinor[number]): boolean {
  return Math.abs(a.re - b.re) > 1e-9 || Math.abs(a.im - b.im) > 1e-9;
}

export function PauliErrorsExperience() {
  const palette = usePalette();
  const [baseKey, setBaseKey] = useState<string>("0");
  const [theta, setTheta] = useState(0);
  const [phi, setPhi] = useState(0);
  const [ops, setOps] = useState<PauliName[]>([]);
  const [selectedOp, setSelectedOp] = useState<Exclude<PauliName, "I">>("X");

  const initialState = useMemo(
    () =>
      baseKey === "custom"
        ? ketState(theta, phi)
        : namedStateByKey(baseKey)?.state ?? KET_0,
    [baseKey, theta, phi],
  );

  const totalOperator = useMemo(() => composePauliSequence(ops), [ops]);
  const currentState = useMemo(
    () => matVec(totalOperator, initialState),
    [totalOperator, initialState],
  );

  const initialBloch = useMemo(() => blochVector(initialState), [initialState]);
  const currentBloch = useMemo(() => blochVector(currentState), [currentState]);
  const noObservableChange = useMemo(
    () =>
      ops.length > 0 && areEquivalentUpToPhase(initialState, currentState, 1e-6),
    [ops.length, initialState, currentState],
  );

  const demoResult = useMemo(
    () => matVec(pauliMatrix(selectedOp), initialState),
    [selectedOp, initialState],
  );
  const demo = DEMOS[selectedOp];
  const demoInfo = PAULI_INFO[selectedOp];
  const demoColor = pauliColor(selectedOp, palette);

  const amplitudeRows = (["α", "β"] as const).map((label, index) => {
    const from = initialState[index];
    const to = demoResult[index];
    return {
      label: label === "α" ? "\\alpha" : "\\beta",
      from: latexComplex(from),
      to: latexComplex(to),
      changed: amplitudeChanged(from, to),
    };
  });

  const arrows: BlochArrow[] = [
    { id: "original", vector: blochTuple(initialBloch), color: palette.original },
    { id: "current", vector: blochTuple(currentBloch), color: palette.transformed },
  ];

  const selectPreset = (key: string) => {
    setBaseKey(key);
    setOps([]);
    const named = namedStateByKey(key);
    if (named) {
      const spherical = blochToSpherical(named.bloch);
      setTheta(spherical.theta);
      setPhi(spherical.phi);
    }
  };

  return (
    <section id="page-1" className="scroll-mt-24">
      <PageHeader
        number="01"
        kicker="Pauli errors"
        title="What X, Y and Z do"
        dek="Three operators, three rotations. Switch between them and watch the qubit move."
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <Equation
          tex="|\psi\rangle = \cos(\theta/2)\,|0\rangle + e^{i\varphi}\sin(\theta/2)\,|1\rangle"
          className="sm:flex-1"
        />
        <p className="caption max-w-[24ch]">
          A pure state is a point on the sphere, fixed by (θ, φ).
        </p>
      </div>

      {/* ---------------- Read the transformation ---------------- */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          {ERROR_ORDER.map((name) => {
            const color = pauliColor(name, palette);
            const active = selectedOp === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedOp(name)}
                aria-pressed={active}
                className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                style={{
                  borderColor: active ? color : "var(--line)",
                  color: active ? color : "var(--muted)",
                  background: active
                    ? `color-mix(in srgb, ${color} 8%, transparent)`
                    : "transparent",
                }}
              >
                <span className="font-mono text-base font-semibold">{name}</span>
                <span className="text-xs font-normal text-faint">
                  {PAULI_INFO[name].title}
                </span>
              </button>
            );
          })}
        </div>

        <motion.div
          key={selectedOp}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
        >
          <div className="space-y-4">
            <div className="panel-quiet p-4">
              <p className="caption mb-3">Matrix</p>
              <MathMatrix
                matrix={pauliMatrix(selectedOp)}
                label={`${selectedOp} =`}
                digits={0}
                highlight
                accent={demoColor}
              />
            </div>

            <div className="panel-quiet p-4">
              <p className="caption mb-3">Effect on your state</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {amplitudeRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    style={{
                      borderColor: row.changed ? demoColor : "var(--line)",
                      background: row.changed
                        ? `color-mix(in srgb, ${demoColor} 8%, transparent)`
                        : "transparent",
                    }}
                  >
                    <Tex tex={`${row.label} = ${row.from}`} />
                    <span aria-hidden className="text-faint">
                      →
                    </span>
                    <Tex
                      tex={row.to}
                      className={row.changed ? "font-semibold" : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="caption mb-2">On basis states</p>
                <div className="space-y-2">
                  {demo.basis.map(([before, after]) => (
                    <div key={before} className="rounded-lg border border-line px-4 py-3">
                      <Tex tex={`${before} = ${after}`} display />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="caption mb-2">On superpositions</p>
                <div className="space-y-2">
                  {demo.super.map(([before, after]) => (
                    <div key={before} className="rounded-lg border border-line px-4 py-3">
                      <Tex tex={`${before} = ${after}`} display />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-3/40 px-4 py-3">
              <span className="caption">On the Bloch sphere</span>
              <Tex tex={demoInfo.mapTex} />
              <span className="caption">π about {selectedOp}</span>
            </div>

            <KeyIdea>{demo.line}</KeyIdea>

            {selectedOp === "Z" ? (
              <Expandable label="Global vs relative phase">
                On a basis state, <Tex tex="Z|1\rangle = -|1\rangle" /> hides the
                minus in a global phase. In a superposition the same sign is
                relative — observable, as <Tex tex="Z|+\rangle = |-\rangle" />{" "}
                shows.
              </Expandable>
            ) : (
              <Expandable label={`Why? — ${demo.why.q}`}>{demo.why.a}</Expandable>
            )}
          </div>
        </motion.div>
      </div>

      {/* ---------------- Experiment ---------------- */}
      <div className="mt-16">
        <h3 className="headline text-2xl">Explore</h3>
        <p className="dek mt-2">
          Pick a state, apply an error, and confirm the rotation you just read.
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24">
            <BlochSphere
              arrows={arrows}
              className="h-[380px] w-full sm:h-[480px] lg:h-[540px]"
              ariaLabel="Bloch sphere with the initial and current state vectors"
              overlay={
                <div className="flex flex-wrap gap-2">
                  <LegendItem color={palette.original} label="Initial" />
                  <LegendItem color={palette.transformed} label="Current" />
                </div>
              }
            />
          </div>

          <div className="space-y-5">
            <Panel>
              <h4 className="mb-3 text-sm font-semibold text-ink">Initial state</h4>
              <div className="flex flex-wrap gap-2">
                {NAMED_STATES.map((named) => (
                  <Chip
                    key={named.key}
                    selected={baseKey === named.key}
                    onClick={() => selectPreset(named.key)}
                    aria-label={`State ${named.label}`}
                  >
                    {named.label}
                  </Chip>
                ))}
                <Chip
                  selected={baseKey === "custom"}
                  onClick={() => setBaseKey("custom")}
                >
                  Custom
                </Chip>
              </div>

              <div className="mt-4 space-y-4 border-t border-line/70 pt-4">
                <RangeSlider
                  id="theta"
                  label={<>θ · polar</>}
                  value={theta}
                  min={0}
                  max={Math.PI}
                  step={0.01}
                  display={`${formatPi(theta)}  (${radToDeg(theta).toFixed(0)}°)`}
                  onChange={(value) => {
                    setBaseKey("custom");
                    setTheta(value);
                  }}
                />
                <RangeSlider
                  id="phi"
                  label={<>φ · azimuthal</>}
                  value={phi}
                  min={0}
                  max={2 * Math.PI}
                  step={0.01}
                  display={`${formatPi(phi)}  (${radToDeg(phi).toFixed(0)}°)`}
                  onChange={(value) => {
                    setBaseKey("custom");
                    setPhi(value);
                  }}
                />
              </div>
            </Panel>

            <Panel>
              <h4 className="mb-3 text-sm font-semibold text-ink">Apply an error</h4>
              <div className="grid grid-cols-3 gap-2">
                {ERROR_ORDER.map((name) => {
                  const color = pauliColor(name, palette);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSelectedOp(name);
                        setOps((previous) => [...previous, name]);
                      }}
                      aria-label={`Apply error ${name}`}
                      className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface-3/40 py-3 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <span className="text-2xl font-semibold" style={{ color }}>
                        {name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-faint">
                        {PAULI_INFO[name].title}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-4">
                <p className="caption">
                  Sequence:{" "}
                  <span className="font-mono text-muted">
                    {ops.length > 0 ? `${ops.slice().reverse().join(" ∘ ")} |ψ⟩` : "|ψ⟩"}
                  </span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOps([])}
                  disabled={ops.length === 0}
                >
                  Reset
                </Button>
              </div>
            </Panel>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <QubitReadout
            title="Initial state"
            state={initialState}
            color={palette.original}
          />
          <QubitReadout
            title="Current state"
            state={currentState}
            color={palette.transformed}
          />
        </div>

        <Notice>
          {noObservableChange ? (
            <>
              Both arrows overlap: the state changed only by a{" "}
              <strong>global phase</strong>, which is unobservable.
            </>
          ) : (
            <>
              Each click is a π rotation. Two clicks on the same axis cancel
              out; two different axes compose into a third Pauli.
            </>
          )}
        </Notice>
      </div>

      <PageTransition
        nextNumber="02"
        question="Are X, Y and Z all there is?"
        teaser={
          <>
            They are just π rotations. Any rotation, and in fact any single-qubit
            operator, can be written as a combination of <Tex tex="I, X, Y, Z" />.
          </>
        }
        href="/module/1/pauli-basis"
        action="See the Pauli basis"
      />
    </section>
  );
}
