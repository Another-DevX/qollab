/**
 * Estados de un cúbit, la esfera de Bloch y fases globales.
 *
 * Un estado puro se escribe
 *
 *   |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩
 *
 * y se representa en la superficie de la esfera de Bloch mediante el vector
 * real (x, y, z) = (⟨X⟩, ⟨Y⟩, ⟨Z⟩). La fase global NO es observable, por lo
 * que estados que difieren solo en una fase global caen en el mismo punto.
 */

import {
  C_ONE,
  C_ZERO,
  cAbs2,
  cAdd,
  cArg,
  cConj,
  cExpI,
  cMul,
  cScale,
  type Complex,
} from "./complex";
import type { Spinor } from "./matrix";
import { matVec, type Matrix2 } from "./matrix";
import { PAULI_X, PAULI_Y, PAULI_Z, type AxisName } from "./pauli";

export interface BlochVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const blochTuple = (v: BlochVector): [number, number, number] => [
  v.x,
  v.y,
  v.z,
];

const S = 1 / Math.SQRT2;

/** |0⟩ */
export const KET_0: Spinor = [C_ONE, C_ZERO];
/** |1⟩ */
export const KET_1: Spinor = [C_ZERO, C_ONE];
/** |+⟩ = (|0⟩+|1⟩)/√2 */
export const KET_PLUS: Spinor = [
  { re: S, im: 0 },
  { re: S, im: 0 },
];
/** |−⟩ = (|0⟩−|1⟩)/√2 */
export const KET_MINUS: Spinor = [
  { re: S, im: 0 },
  { re: -S, im: 0 },
];
/** |+i⟩ = (|0⟩+i|1⟩)/√2 */
export const KET_PLUS_I: Spinor = [
  { re: S, im: 0 },
  { re: 0, im: S },
];
/** |−i⟩ = (|0⟩−i|1⟩)/√2 */
export const KET_MINUS_I: Spinor = [
  { re: S, im: 0 },
  { re: 0, im: -S },
];

export interface NamedState {
  readonly key: string;
  /** Etiqueta en notación de Dirac, p. ej. "|+⟩". */
  readonly label: string;
  readonly state: Spinor;
  readonly bloch: BlochVector;
  readonly description: string;
}

export const NAMED_STATES: readonly NamedState[] = [
  {
    key: "0",
    label: "|0⟩",
    state: KET_0,
    bloch: { x: 0, y: 0, z: 1 },
    description: "Polo norte: el estado base clásico 0.",
  },
  {
    key: "1",
    label: "|1⟩",
    state: KET_1,
    bloch: { x: 0, y: 0, z: -1 },
    description: "Polo sur: el estado base clásico 1.",
  },
  {
    key: "plus",
    label: "|+⟩",
    state: KET_PLUS,
    bloch: { x: 1, y: 0, z: 0 },
    description: "Superposición equiprobable sobre el ecuador (+X).",
  },
  {
    key: "minus",
    label: "|−⟩",
    state: KET_MINUS,
    bloch: { x: -1, y: 0, z: 0 },
    description: "Superposición equiprobable sobre el ecuador (−X).",
  },
  {
    key: "plus_i",
    label: "|+i⟩",
    state: KET_PLUS_I,
    bloch: { x: 0, y: 1, z: 0 },
    description: "Superposición con fase relativa +π/2 (+Y).",
  },
  {
    key: "minus_i",
    label: "|−i⟩",
    state: KET_MINUS_I,
    bloch: { x: 0, y: -1, z: 0 },
    description: "Superposición con fase relativa −π/2 (−Y).",
  },
];

export const namedStateByKey = (key: string): NamedState | undefined =>
  NAMED_STATES.find((s) => s.key === key);

/** |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩ */
export const ketState = (theta: number, phi: number): Spinor => [
  { re: Math.cos(theta / 2), im: 0 },
  cScale(cExpI(phi), Math.sin(theta / 2)),
];

/** Convierte una dirección de Bloch (x,y,z) a un estado puro. */
export const stateFromBloch = (x: number, y: number, z: number): Spinor => {
  const r = Math.hypot(x, y, z);
  if (r < 1e-12) return KET_0;
  const theta = Math.acos(Math.max(-1, Math.min(1, z / r)));
  const phi = x === 0 && y === 0 ? 0 : Math.atan2(y, x);
  return ketState(theta, phi);
};

/** Vector de Bloch (⟨X⟩, ⟨Y⟩, ⟨Z⟩) de un estado (normaliza de forma defensiva). */
export const blochVector = (state: Spinor): BlochVector => {
  const [a, b] = state;
  const norm2 = cAbs2(a) + cAbs2(b);
  if (norm2 < 1e-15) return { x: 0, y: 0, z: 0 };
  const ab = cMul(cConj(a), b);
  return {
    x: (2 * ab.re) / norm2,
    y: (2 * ab.im) / norm2,
    z: (cAbs2(a) - cAbs2(b)) / norm2,
  };
};

export const EXPECTATION_OPERATORS: Record<AxisName, Matrix2> = {
  x: PAULI_X,
  y: PAULI_Y,
  z: PAULI_Z,
};

/** ⟨ψ|M|ψ⟩ para un operador hermítico M. */
export const expectationValue = (state: Spinor, operator: Matrix2): number => {
  const applied = matVec(operator, state);
  const prod: Complex = cAdd(
    cMul(cConj(state[0]), applied[0]),
    cMul(cConj(state[1]), applied[1]),
  );
  return prod.re; // hermítico ⇒ parte imaginaria ≈ 0
};

/** Normaliza un espinor. */
export const normalizeSpinor = (state: Spinor): Spinor => {
  const norm = Math.sqrt(cAbs2(state[0]) + cAbs2(state[1]));
  if (norm < 1e-15) return KET_0;
  return [cScale(state[0], 1 / norm), cScale(state[1], 1 / norm)];
};

/** Producto interno ⟨a|b⟩ = a†·b. */
export const innerProduct = (a: Spinor, b: Spinor): Complex =>
  cAdd(cMul(cConj(a[0]), b[0]), cMul(cConj(a[1]), b[1]));

/** Solapamiento |⟨a|b⟩| ∈ [0,1]. */
export const overlap = (a: Spinor, b: Spinor): number => {
  const ip = innerProduct(normalizeSpinor(a), normalizeSpinor(b));
  return Math.hypot(ip.re, ip.im);
};

/** ¿Representan a y b el mismo estado físico salvo fase global? */
export const areEquivalentUpToPhase = (
  a: Spinor,
  b: Spinor,
  eps = 1e-6,
): boolean => 1 - overlap(a, b) <= eps;

/**
 * Fase global γ tal que |b⟩ ≈ e^{iγ}|a⟩ (válido cuando son equivalentes).
 * γ = arg⟨a|b⟩.
 */
export const globalPhaseBetween = (a: Spinor, b: Spinor): number =>
  cArg(innerProduct(normalizeSpinor(a), normalizeSpinor(b)));

/** Probabilidad de medir 0 o 1. */
export const outcomeProbability = (state: Spinor, outcome: 0 | 1): number => {
  const norm2 = cAbs2(state[0]) + cAbs2(state[1]);
  if (norm2 < 1e-15) return outcome === 0 ? 1 : 0;
  return cAbs2(state[outcome]) / norm2;
};

export interface SphericalAngles {
  readonly theta: number; // [0, π]
  readonly phi: number; // [0, 2π)
}

export const blochToSpherical = (v: BlochVector): SphericalAngles => {
  const r = Math.hypot(v.x, v.y, v.z);
  if (r < 1e-12) return { theta: 0, phi: 0 };
  const theta = Math.acos(Math.max(-1, Math.min(1, v.z / r)));
  let phi = v.x === 0 && v.y === 0 ? 0 : Math.atan2(v.y, v.x);
  if (phi < 0) phi += 2 * Math.PI;
  return { theta, phi };
};

/** Rotación de Rodrigues de un vector de Bloch alrededor de un eje unitario. */
export const rotateBloch = (
  v: BlochVector,
  axis: BlochVector,
  angle: number,
): BlochVector => {
  const n = Math.hypot(axis.x, axis.y, axis.z) || 1;
  const nx = axis.x / n;
  const ny = axis.y / n;
  const nz = axis.z / n;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = nx * v.x + ny * v.y + nz * v.z;
  const crossX = ny * v.z - nz * v.y;
  const crossY = nz * v.x - nx * v.z;
  const crossZ = nx * v.y - ny * v.x;
  return {
    x: v.x * cos + crossX * sin + nx * dot * (1 - cos),
    y: v.y * cos + crossY * sin + ny * dot * (1 - cos),
    z: v.z * cos + crossZ * sin + nz * dot * (1 - cos),
  };
};

export const AXIS_VECTORS: Record<AxisName, BlochVector> = {
  x: { x: 1, y: 0, z: 0 },
  y: { x: 0, y: 1, z: 0 },
  z: { x: 0, y: 0, z: 1 },
};

export const blochEquals = (a: BlochVector, b: BlochVector, eps = 1e-6): boolean =>
  Math.abs(a.x - b.x) <= eps &&
  Math.abs(a.y - b.y) <= eps &&
  Math.abs(a.z - b.z) <= eps;
