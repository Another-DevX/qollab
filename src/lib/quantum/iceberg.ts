/**
 * Módulo 4 — Iceberg code [[4,2,2]] (motor tipado de referencia).
 *
 * Modelo exacto de cuatro qubits con los generadores de estabilizador
 *   S_X = X1 X2 X3 X4 ,   S_Z = Z1 Z2 Z3 Z4 .
 * El espacio de código es su autoespacio simultáneo +1 (dimensión 16/4 = 4),
 * por lo que codifica dos qubits lógicos.
 *
 * Este módulo es puro (sin DOM, sin React) y es el espejo tipado del motor
 * vanilla que ejecuta la plataforma (`platform/iceberg.js`). Sirve como
 * referencia para la futura integración Qiskit/Qollab: no ejecuta hardware.
 *
 * Resultado central: detección y corrección no son lo mismo.
 */

import {
  C_ZERO,
  cAbs,
  cAdd,
  cConj,
  cMul,
  cScale,
  complex,
  type Complex,
} from "./complex";

export type PauliChar = "I" | "X" | "Y" | "Z";
/** Un operador de Pauli sobre los cuatro qubits, p. ej. "XXII". */
export type Frame = string;
/** Vector de estado de 2⁴ = 16 amplitudes complejas (q1 = bit más significativo). */
export type State16 = Complex[];

export interface Syndrome {
  readonly sx: 1 | -1;
  readonly sz: 1 | -1;
}

export interface LogicalBasisEntry {
  readonly key: string;
  readonly label: string;
  /** Pares (bitstring físico, signo) de la superposición. */
  readonly terms: ReadonlyArray<readonly [string, number]>;
}

export type Classification = "identity" | "stabilizer" | "logical" | "detectable";

export interface FrameClassification {
  readonly frame: Frame;
  readonly weight: number;
  readonly sx: 1 | -1;
  readonly sz: 1 | -1;
  readonly detected: boolean;
  readonly logical: boolean;
  readonly kind: Classification;
}

export type NoiseModel = "x" | "z" | "depol";

export interface MonteCarloResult {
  readonly total: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly detected: number;
  readonly pAccept: number;
  readonly logicalRate: number;
  readonly logicalAccepted: number;
  readonly logicalAll: number;
}

export interface ExactResult {
  readonly pAccept: number;
  readonly detectedRate: number;
  readonly logicalAll: number;
  readonly logicalAccepted: number;
  readonly logicalRate: number;
}

export const N_QUBITS = 4;
export const CODE_DISTANCE = 2;
export const IDENTITY_FRAME: Frame = "IIII";
export const STABILIZERS = { X: "XXXX", Z: "ZZZZ" } as const;

/** Base lógica del enunciado (superposiciones físicas de dos términos). */
export const LOGICAL_BASIS: readonly LogicalBasisEntry[] = [
  { key: "00", label: "|00⟩_L", terms: [["0000", 1], ["1111", 1]] },
  { key: "01", label: "|01⟩_L", terms: [["0011", 1], ["1100", 1]] },
  { key: "10", label: "|10⟩_L", terms: [["0101", 1], ["1010", 1]] },
  { key: "11", label: "|11⟩_L", terms: [["0110", 1], ["1001", 1]] },
];

/* Producto de Pauli por qubit (fases globales descartadas). */
const MUL: Record<PauliChar, Record<PauliChar, PauliChar>> = {
  I: { I: "I", X: "X", Y: "Y", Z: "Z" },
  X: { I: "X", X: "I", Y: "Z", Z: "Y" },
  Y: { I: "Y", X: "Z", Y: "I", Z: "X" },
  Z: { I: "Z", X: "Y", Y: "X", Z: "I" },
};

export function isFrame(frame: string): frame is Frame {
  return typeof frame === "string" && frame.length === N_QUBITS && /^[IXYZ]+$/.test(frame);
}

export function pauliMul(a: Frame, b: Frame): Frame {
  let out = "";
  for (let i = 0; i < N_QUBITS; i++) out += MUL[a[i] as PauliChar][b[i] as PauliChar];
  return out;
}

export function frameFromErrors(errors: ReadonlyArray<{ q: number; pauli: PauliChar }>): Frame {
  const chars: PauliChar[] = ["I", "I", "I", "I"];
  for (const e of errors) chars[e.q] = MUL[chars[e.q]][e.pauli];
  return chars.join("");
}

export function weight(frame: Frame): number {
  let w = 0;
  for (let i = 0; i < N_QUBITS; i++) if (frame[i] !== "I") w++;
  return w;
}

/**
 * Síndrome a partir de las reglas de conmutación: un Pauli anticonmuta con
 * S_X = X⊗4 si un número impar de qubits lleva Y o Z, y con S_Z = Z⊗4 si un
 * número impar lleva X o Y.
 */
export function syndrome(frame: Frame): Syndrome {
  let yz = 0;
  let xy = 0;
  for (let i = 0; i < N_QUBITS; i++) {
    const c = frame[i];
    if (c === "Y" || c === "Z") yz++;
    if (c === "X" || c === "Y") xy++;
  }
  return { sx: yz % 2 === 0 ? 1 : -1, sz: xy % 2 === 0 ? 1 : -1 };
}

export function syndromeBits(frame: Frame): readonly [number, number] {
  const s = syndrome(frame);
  return [s.sx === -1 ? 1 : 0, s.sz === -1 ? 1 : 0];
}

export function inStabilizer(frame: Frame): boolean {
  return frame === "IIII" || frame === "XXXX" || frame === "ZZZZ" || frame === "YYYY";
}

/** Normalizador del grupo de estabilizadores: todo Pauli con síndrome trivial. */
export function inNormalizer(frame: Frame): boolean {
  const s = syndrome(frame);
  return s.sx === 1 && s.sz === 1;
}

/** Operador lógico no trivial: conmuta con ambos estabilizadores pero no es uno. */
export function isLogical(frame: Frame): boolean {
  return inNormalizer(frame) && !inStabilizer(frame);
}

export function classify(frame: Frame): FrameClassification {
  const s = syndrome(frame);
  const detected = !(s.sx === 1 && s.sz === 1);
  const logical = isLogical(frame);
  const kind: Classification =
    frame === IDENTITY_FRAME ? "identity" : inStabilizer(frame) ? "stabilizer" : logical ? "logical" : "detectable";
  return { frame, weight: weight(frame), sx: s.sx, sz: s.sz, detected, logical, kind };
}

export function residual(errorFrame: Frame, correctionFrame: Frame): Frame {
  return pauliMul(errorFrame, correctionFrame);
}

/**
 * La recuperación tiene éxito si el residuo actúa como la identidad sobre el
 * espacio de código, es decir, si es un estabilizador — NO basta con que tenga
 * síndrome trivial (un operador lógico no trivial también lo tiene).
 */
export function recovered(errorFrame: Frame, correctionFrame: Frame): boolean {
  return inStabilizer(residual(errorFrame, correctionFrame));
}

/* ---------------- Vector de estado exacto de 16 amplitudes ---------------- */
const S = 1 / Math.SQRT2;

export function encodeLogical(key: string): State16 {
  const entry = LOGICAL_BASIS.find((l) => l.key === key) ?? LOGICAL_BASIS[0];
  const reg: State16 = Array.from({ length: 1 << N_QUBITS }, () => C_ZERO);
  for (const [bits, sign] of entry.terms) {
    const idx = parseInt(bits, 2);
    reg[idx] = cAdd(reg[idx], complex(S * sign, 0));
  }
  return reg;
}

function applyPauliQubit(state: State16, q: number, p: PauliChar): State16 {
  const n = N_QUBITS;
  const mask = 1 << (n - 1 - q);
  if (p === "X") {
    const out: State16 = new Array(state.length);
    for (let i = 0; i < state.length; i++) out[i ^ mask] = state[i];
    return out;
  }
  if (p === "Z") {
    return state.map((c, i) => (((i >> (n - 1 - q)) & 1) ? cScale(c, -1) : c));
  }
  return state.slice();
}

export function applyFrame(state: State16, frame: Frame): State16 {
  let out = state.slice();
  for (let q = 0; q < N_QUBITS; q++) {
    const p = frame[q] as PauliChar;
    if (p === "X") out = applyPauliQubit(out, q, "X");
    else if (p === "Z") out = applyPauliQubit(out, q, "Z");
    else if (p === "Y") {
      out = applyPauliQubit(out, q, "X");
      out = applyPauliQubit(out, q, "Z");
    }
  }
  return out;
}

function popcount(i: number): number {
  let c = 0;
  while (i) {
    c += i & 1;
    i >>>= 1;
  }
  return c;
}

/** Autoespacio del estabilizador: +1, −1, o 0 si el estado no es autoestado. */
export function stabilizerValue(state: State16, type: "X" | "Z"): 1 | -1 | 0 {
  const mask = (1 << N_QUBITS) - 1;
  const applied: State16 = new Array(state.length);
  for (let i = 0; i < state.length; i++) {
    if (type === "X") applied[i ^ mask] = state[i];
    else applied[i] = popcount(i) % 2 === 0 ? state[i] : cScale(state[i], -1);
  }
  let plus = true;
  let minus = true;
  for (let i = 0; i < state.length; i++) {
    if (cAbs(cAdd(applied[i], cScale(state[i], -1))) > 1e-9) plus = false;
    if (cAbs(cAdd(applied[i], state[i])) > 1e-9) minus = false;
  }
  if (plus) return 1;
  if (minus) return -1;
  return 0;
}

export function stabilizerValues(state: State16): { sx: 1 | -1 | 0; sz: 1 | -1 | 0 } {
  return { sx: stabilizerValue(state, "X"), sz: stabilizerValue(state, "Z") };
}

export function isInCodeSpace(state: State16): boolean {
  return stabilizerValue(state, "X") === 1 && stabilizerValue(state, "Z") === 1;
}

export function sameUpToPhase(a: State16, b: State16, eps = 1e-6): boolean {
  let idx = -1;
  for (let i = 0; i < a.length; i++) if (cAbs(a[i]) > 1e-9) { idx = i; break; }
  if (idx < 0) return false;
  const denom = cMul(a[idx], cConj(a[idx])).re; // |a[idx]|² > 0
  const lam = cScale(cMul(b[idx], cConj(a[idx])), 1 / denom);
  for (let i = 0; i < a.length; i++) if (cAbs(cAdd(b[i], cScale(cMul(lam, a[i]), -1))) > eps) return false;
  return true;
}

/* ---------------- Ruido y postselección ---------------- */
export function perQubitDist(model: NoiseModel, p: number): Record<PauliChar, number> {
  if (model === "x") return { I: 1 - p, X: p, Y: 0, Z: 0 };
  if (model === "z") return { I: 1 - p, X: 0, Y: 0, Z: p };
  return { I: 1 - p, X: p / 3, Y: p / 3, Z: p / 3 };
}

export function sampleFrame(p: number, model: NoiseModel, rng: () => number = Math.random): Frame {
  const d = perQubitDist(model, p);
  let out = "";
  for (let q = 0; q < N_QUBITS; q++) {
    const r = rng();
    let acc = d.I;
    if (r < acc) { out += "I"; continue; }
    acc += d.X; if (r < acc) { out += "X"; continue; }
    acc += d.Y; if (r < acc) { out += "Y"; continue; }
    out += "Z";
  }
  return out;
}

export function monteCarlo(
  p: number,
  model: NoiseModel,
  trials: number,
  postselect: boolean,
  rng: () => number = Math.random,
): MonteCarloResult {
  let accepted = 0;
  let rejected = 0;
  let logicalAccepted = 0;
  let logicalAll = 0;
  let detected = 0;
  for (let t = 0; t < trials; t++) {
    const frame = sampleFrame(p, model, rng);
    const isDetected = !inNormalizer(frame);
    const isLog = isLogical(frame);
    if (isDetected) detected++;
    if (isLog) logicalAll++;
    const isAccepted = postselect ? !isDetected : true;
    if (isAccepted) {
      accepted++;
      if (isLog) logicalAccepted++;
    } else rejected++;
  }
  return {
    total: trials,
    accepted,
    rejected,
    detected,
    pAccept: trials > 0 ? accepted / trials : 0,
    logicalRate: accepted > 0 ? logicalAccepted / accepted : 0,
    logicalAccepted,
    logicalAll,
  };
}

/** Expectativa exacta sobre los 4⁴ = 256 marcos de Pauli (validación). */
export function exact(p: number, model: NoiseModel): ExactResult {
  const d = perQubitDist(model, p);
  const paulis: PauliChar[] = ["I", "X", "Y", "Z"];
  let pAccept = 0;
  let logicalAll = 0;
  let logicalAccepted = 0;
  for (let m = 0; m < 1 << (2 * N_QUBITS); m++) {
    let frame = "";
    let prob = 1;
    let tmp = m;
    for (let q = 0; q < N_QUBITS; q++) {
      const pc = paulis[tmp & 3];
      tmp >>= 2;
      frame += pc;
      prob *= d[pc];
    }
    if (prob < 1e-15) continue;
    const isLog = isLogical(frame);
    if (inNormalizer(frame)) {
      pAccept += prob;
      if (isLog) logicalAccepted += prob;
    }
    if (isLog) logicalAll += prob;
  }
  return {
    pAccept,
    detectedRate: 1 - pAccept,
    logicalAll,
    logicalAccepted,
    logicalRate: pAccept > 0 ? logicalAccepted / pAccept : 0,
  };
}

/** Descripción legible: "X₁X₂", "I". */
export function describeFrame(frame: Frame): string {
  const subs = ["₁", "₂", "₃", "₄"];
  const parts: string[] = [];
  for (let i = 0; i < N_QUBITS; i++) if (frame[i] !== "I") parts.push(frame[i] + subs[i]);
  return parts.length ? parts.join(" ") : "I";
}
