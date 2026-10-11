"use client";

import { useMemo, useState } from "react";

import { BlochSphere } from "@/components/bloch/BlochSphere";
import type { BlochArrow } from "@/components/bloch/types";
import { Equation } from "@/components/math/Equation";
import { MathMatrix } from "@/components/math/MathMatrix";
import { Tex } from "@/components/math/Tex";
import { latexComplex } from "@/components/math/latex";
import { PageTransition } from "@/components/experience/PageTransition";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { Expandable, KeyIdea, Notice, PageHeader } from "@/components/ui/editorial";
import { Chip, LegendItem, Panel } from "@/components/ui/primitives";
import {
  NAMED_STATES,
  PAULI_MATRICES,
  blochTuple,
  blochVector,
  formatPi,
  ketState,
  matVec,
  namedStateByKey,
  normalizeAxis,
  pauliDecomposition,
  radToDeg,
  rotationOperator,
  type AxisName,
  type BlochVector,
} from "@/lib/quantum";
import { usePalette } from "@/lib/theme";

const PRESET_AXES: Array<{ key: AxisName | "custom"; label: string }> = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" },
  { key: "z", label: "Z" },
  { key: "custom", label: "Custom" },
];

const ANGLE_SHORTCUTS: Array<{ label: string; value: number }> = [
  { label: "0", value: 0 },
  { label: "π/2", value: Math.PI / 2 },
  { label: "π", value: Math.PI },
  { label: "3π/2", value: (3 * Math.PI) / 2 },
  { label: "2π", value: 2 * Math.PI },
];

const COMPARISON = [
  {
    title: "Linear combination",
    tex: "E = a\\,I + b\\,X + c\\,Y + d\\,Z",
    line: "One operator, built from complex coefficients.",
  },
  {
    title: "Sequential application",
    tex: "X\\,Y = iZ \\neq X + Y",
    line: "Applying operators in turn is a product, not a sum.",
  },
  {
    title: "Probabilistic mixture",
    tex: "\\rho' = \\sum_k p_k\\, E_k\\, \\rho\\, E_k^{\\dagger}",
    line: "“X with probability p” is a channel, not an operator.",
  },
];

const axisFromSpherical = (theta: number, phi: number): BlochVector => ({
  x: Math.sin(theta) * Math.cos(phi),
  y: Math.sin(theta) * Math.sin(phi),
  z: Math.cos(theta),
});

export function PauliBasisExperience() {
  const palette = usePalette();
  const [baseKey, setBaseKey] = useState("plus");
  const [axisKey, setAxisKey] = useState<AxisName | "custom">("z");
  const [axisTheta, setAxisTheta] = useState(Math.PI / 3);
  const [axisPhi, setAxisPhi] = useState(Math.PI / 4);
  const [angle, setAngle] = useState(Math.PI / 2);

  const baseState = useMemo(
    () => namedStateByKey(baseKey)?.state ?? ketState(0, 0),
    [baseKey],
  );

  const axisVector = useMemo<BlochVector>(() => {
    if (axisKey === "custom") return normalizeAxis(axisFromSpherical(axisTheta, axisPhi));
    if (axisKey === "x") return { x: 1, y: 0, z: 0 };
    if (axisKey === "y") return { x: 0, y: 1, z: 0 };
    return { x: 0, y: 0, z: 1 };
  }, [axisKey, axisTheta, axisPhi]);

  const operator = useMemo(() => rotationOperator(axisVector, angle), [axisVector, angle]);
  const coeffs = useMemo(() => pauliDecomposition(operator), [operator]);
  const rotatedState = useMemo(() => matVec(operator, baseState), [operator, baseState]);

  const baseBloch = blochVector(baseState);
  const rotatedBloch = blochVector(rotatedState);

  const isEigenstate = useMemo(() => {
    const delta = Math.hypot(
      baseBloch.x - rotatedBloch.x,
      baseBloch.y - rotatedBloch.y,
      baseBloch.z - rotatedBloch.z,
    );
    return angle > 1e-3 && delta < 1e-6;
  }, [baseBloch, rotatedBloch, angle]);

  const nearPi = Math.abs(angle - Math.PI) < 0.02;

  const arrows: BlochArrow[] = [
    { id: "axis", vector: blochTuple(axisVector), color: palette.grid, opacity: 0.5 },
    { id: "base", vector: blochTuple(baseBloch), color: palette.original },
    { id: "rotated", vector: blochTuple(rotatedBloch), color: palette.transformed },
  ];

  const coefficients = [
    { label: "a", value: latexComplex(coeffs.a), key: "I" },
    { label: "b", value: latexComplex(coeffs.b), key: "X" },
    { label: "c", value: latexComplex(coeffs.c), key: "Y" },
    { label: "d", value: latexComplex(coeffs.d), key: "Z" },
  ];

  return (
    <section id="page-2" className="scroll-mt-24">
      <PageHeader
        number="02"
        kicker="Pauli basis"
        title="Four matrices are enough"
        dek="Any single-qubit operator is a combination of I, X, Y and Z."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <Equation
          tex="E = a\,I + b\,X + c\,Y + d\,Z, \qquad a,b,c,d \in \mathbb{C}"
        />
        <div className="grid grid-cols-4 gap-2">
          {(["I", "X", "Y", "Z"] as const).map((name) => (
            <div
              key={name}
              className="panel-quiet flex items-center justify-center p-3"
            >
              <MathMatrix
                matrix={PAULI_MATRICES[name]}
                label={`${name} =`}
                digits={0}
                highlight
                accent={palette.original}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- Three operations ---------------- */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {COMPARISON.map((block) => (
          <div key={block.title} className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="text-sm font-semibold text-ink">{block.title}</p>
            <div className="rounded-lg border border-line px-3 py-3 text-center">
              <Tex tex={block.tex} />
            </div>
            <p className="text-sm leading-relaxed text-muted">{block.line}</p>
          </div>
        ))}
      </div>

      {/* ---------------- Rotation example ---------------- */}
      <div className="mt-16">
        <h3 className="headline text-2xl">Rotations live in the basis too</h3>
        <p className="dek mt-2">
          A rotation of angle α about the unit axis <Tex tex="\mathbf{n}" /> is a
          Pauli combination.
        </p>

        <Equation
          tex="R_{\mathbf{n}}(\alpha) = \cos\!\left(\tfrac{\alpha}{2}\right) I - i\,\sin\!\left(\tfrac{\alpha}{2}\right)\bigl(n_x X + n_y Y + n_z Z\bigr)"
          className="mt-6"
        />

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24">
            <BlochSphere
              arrows={arrows}
              className="h-[380px] w-full sm:h-[480px] lg:h-[540px]"
              ariaLabel="Bloch sphere with the base state, the rotated state and the rotation axis"
              overlay={
                <div className="flex flex-wrap gap-2">
                  <LegendItem color={palette.original} label="Base" />
                  <LegendItem color={palette.transformed} label="Rotated" />
                  <LegendItem color={palette.grid} label="Axis" />
                </div>
              }
            />
          </div>

          <div className="space-y-5">
            <Panel>
              <h4 className="mb-3 text-sm font-semibold text-ink">Base state</h4>
              <div className="flex flex-wrap gap-2">
                {NAMED_STATES.map((named) => (
                  <Chip
                    key={named.key}
                    selected={baseKey === named.key}
                    onClick={() => setBaseKey(named.key)}
                    aria-label={`State ${named.label}`}
                  >
                    {named.label}
                  </Chip>
                ))}
              </div>
            </Panel>

            <Panel>
              <h4 className="mb-3 text-sm font-semibold text-ink">Axis and angle</h4>
              <div className="flex flex-wrap gap-2">
                {PRESET_AXES.map((axis) => (
                  <Chip
                    key={axis.key}
                    selected={axisKey === axis.key}
                    onClick={() => setAxisKey(axis.key)}
                    aria-label={`Axis ${axis.label}`}
                  >
                    {axis.label}
                  </Chip>
                ))}
              </div>

              {axisKey === "custom" ? (
                <div className="mt-4 space-y-4 border-t border-line/70 pt-4">
                  <RangeSlider
                    id="axis-theta"
                    label="Axis θ"
                    value={axisTheta}
                    min={0}
                    max={Math.PI}
                    step={0.01}
                    display={`${formatPi(axisTheta)} (${radToDeg(axisTheta).toFixed(0)}°)`}
                    onChange={setAxisTheta}
                  />
                  <RangeSlider
                    id="axis-phi"
                    label="Axis φ"
                    value={axisPhi}
                    min={0}
                    max={2 * Math.PI}
                    step={0.01}
                    display={`${formatPi(axisPhi)} (${radToDeg(axisPhi).toFixed(0)}°)`}
                    onChange={setAxisPhi}
                  />
                </div>
              ) : null}

              <div className="mt-4 space-y-3 border-t border-line/70 pt-4">
                <RangeSlider
                  id="angle"
                  label="α · rotation angle"
                  value={angle}
                  min={0}
                  max={2 * Math.PI}
                  step={0.005}
                  display={`${formatPi(angle)} (${radToDeg(angle).toFixed(0)}°)`}
                  onChange={setAngle}
                />
                <div className="flex flex-wrap gap-2">
                  {ANGLE_SHORTCUTS.map((shortcut) => (
                    <Chip
                      key={shortcut.label}
                      selected={Math.abs(angle - shortcut.value) < 0.01}
                      onClick={() => setAngle(shortcut.value)}
                    >
                      {shortcut.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel>
            <h4 className="mb-3 text-sm font-semibold text-ink">Rotation operator</h4>
            <MathMatrix
              matrix={operator}
              caption="U(α, n)"
              label="U ="
              digits={3}
              highlight
              accent={palette.transformed}
            />
          </Panel>
          <Panel>
            <h4 className="mb-3 text-sm font-semibold text-ink">Pauli coefficients</h4>
            <div className="grid grid-cols-2 gap-2">
              {coefficients.map((coef) => (
                <div
                  key={coef.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
                >
                  <span className="font-mono text-xs text-faint">{coef.key}</span>
                  <Tex tex={`${coef.label} = ${coef.value}`} />
                </div>
              ))}
            </div>
            <p className="caption mt-3">
              Move the axis or angle and watch a, b, c, d change.
            </p>
          </Panel>
        </div>

        {nearPi ? (
          <div className="mt-5">
            <KeyIdea label="Discrete case">
              At <Tex tex="\alpha = \pi" /> the rotation becomes{" "}
              <Tex tex="-i\,(n_xX+n_yY+n_zZ)" />: a Pauli, up to the global phase{" "}
              <Tex tex="-i" />.
            </KeyIdea>
          </div>
        ) : null}
        {isEigenstate ? (
          <div className="mt-5">
            <Notice label="No visible change">
              The base state is an eigenstate here: the rotation only adds a
              global phase, so the vector stays put. Try another state or axis.
            </Notice>
          </div>
        ) : null}
      </div>

      {/* ---------------- Operators vs channels ---------------- */}
      <div className="mt-16 border-t border-line pt-8">
        <h3 className="headline text-2xl">An operator is not a channel</h3>
        <p className="dek mt-2">
          Unitaries move pure states around the surface. Real noise can do more.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line p-5">
            <p className="text-sm font-semibold text-ink">Unitary operator</p>
            <div className="mt-3 rounded-lg border border-line px-3 py-2 text-center">
              <Tex tex="|\psi\rangle \mapsto U\,|\psi\rangle" />
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>Pure states stay pure.</li>
              <li>Bloch vector keeps length 1.</li>
              <li>A Pauli error, or any rotation.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-line p-5">
            <p className="text-sm font-semibold text-ink">Quantum channel</p>
            <div className="mt-3 rounded-lg border border-line px-3 py-2 text-center">
              <Tex tex="\rho \mapsto \sum_k E_k\,\rho\,E_k^{\dagger}" />
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>Pure states can become mixed.</li>
              <li>Bloch vector can shrink: <Tex tex="|\mathbf{r}| < 1" />.</li>
              <li>Models decoherence and probabilistic noise.</li>
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <Expandable label="Why? — Kraus operators and completeness">
            A channel is written with operators{" "}
            <Tex tex="E_k" /> that need not be unitary. The condition{" "}
            <Tex tex="\sum_k E_k^{\dagger}E_k = I" /> keeps probabilities
            summing to one. With a single term, <Tex tex="E_1 = U" /> recovers
            the unitary case — which is why one arrow on the sphere cannot
            capture every kind of noise.
          </Expandable>
        </div>
      </div>

      <PageTransition
        nextNumber="03"
        question="If we know the errors, can we identify them?"
        teaser={
          <>
            Knowing what <Tex tex="X" />, <Tex tex="Y" /> and <Tex tex="Z" /> do
            is the first step. The next is to read the error off the outcome —
            the challenge.
          </>
        }
        href="/module/1/challenge"
        action="Take the challenge"
      />
    </section>
  );
}
