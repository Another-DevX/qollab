/**
 * Generación y evaluación de retos del juego "¿Qué error sufrió este qubit?".
 *
 * Un reto consta de un estado puro |ψ⟩ (no degenerado) y un error
 * E ∈ {I, X, Y, Z}. El estado final se calcula SIEMPRE como E|ψ⟩ usando el
 * operador real, nunca de forma heurística.
 *
 * Para que la respuesta sea identificable, exigimos que las cuatro imágenes
 * {I|ψ⟩, X|ψ⟩, Y|ψ⟩, Z|ψ⟩} sean distintas salvo fase global. Esto equivale a
 * que |ψ⟩ no sea autoestado de ningún Pauli, es decir, que no caiga en los
 * seis estados cardinales (±X, ±Y, ±Z).
 */

import type { PauliName } from "./pauli";
import { PAULI_NAMES, applyPauli } from "./pauli";
import type { Spinor } from "./matrix";
import { ketState, overlap } from "./state";

export type Rng = () => number;

export interface Challenge {
  readonly id: string;
  /** Ángulo polar del estado inicial. */
  readonly theta: number;
  /** Ángulo azimutal del estado inicial. */
  readonly phi: number;
  readonly initial: Spinor;
  readonly error: PauliName;
  readonly final: Spinor;
}

/** Generador pseudoaleatorio determinista (mulberry32) para tests reproducibles. */
export const createSeededRng = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Margen mínimo de distinción: 1 − solapamiento debe superar `margin`. */
export const DEFAULT_MARGIN = 0.08;

/** Las cuatro imágenes de |ψ⟩ bajo {I, X, Y, Z}. */
export const pauliImages = (
  state: Spinor,
): Record<PauliName, Spinor> => ({
  I: applyPauli("I", state),
  X: applyPauli("X", state),
  Y: applyPauli("Y", state),
  Z: applyPauli("Z", state),
});

/** ¿Son distinguibles las cuatro imágenes de |ψ⟩ salvo fase global? */
export const isNonDegenerate = (
  state: Spinor,
  margin = DEFAULT_MARGIN,
): boolean => {
  const images = pauliImages(state);
  for (let i = 0; i < PAULI_NAMES.length; i++) {
    for (let j = i + 1; j < PAULI_NAMES.length; j++) {
      const ov = overlap(images[PAULI_NAMES[i]], images[PAULI_NAMES[j]]);
      if (ov > 1 - margin) return false;
    }
  }
  return true;
};

/** ¿Es el error E distinguible del estado inicial salvo fase global? */
export const isErrorDistinguishable = (
  state: Spinor,
  error: PauliName,
  margin = DEFAULT_MARGIN,
): boolean => {
  // La identidad deja el estado intacto; eso precisamente identifica a "I"
  // (el cúbit no sufrió ningún cambio), así que siempre es "distinguible".
  if (error === "I") return true;
  return overlap(state, applyPauli(error, state)) < 1 - margin;
};

export interface GenerateOptions {
  readonly margin?: number;
  /** Número máximo de intentos antes de ceder a un estado por defecto. */
  readonly maxAttempts?: number;
}

/**
 * Genera un estado puro inicial no degenerado. Muestrea θ ∈ (0.18π, 0.82π)
 * para mantenerlo lejos de los polos y aplica rechazo hasta que las cuatro
 * imágenes de Pauli sean distinguibles.
 */
export const generateInitialState = (
  rng: Rng = Math.random,
  options: GenerateOptions = {},
): { theta: number; phi: number; state: Spinor } => {
  const margin = options.margin ?? DEFAULT_MARGIN;
  const maxAttempts = options.maxAttempts ?? 100;
  for (let i = 0; i < maxAttempts; i++) {
    const theta = Math.PI * (0.18 + 0.64 * rng());
    const phi = 2 * Math.PI * rng();
    const state = ketState(theta, phi);
    if (isNonDegenerate(state, margin)) return { theta, phi, state };
  }
  // Reserva determinista: un estado genérico claramente no degenerado.
  const theta = Math.PI * 0.42;
  const phi = Math.PI * 0.31;
  return { theta, phi, state: ketState(theta, phi) };
};

export const pickHiddenError = (rng: Rng = Math.random): PauliName =>
  PAULI_NAMES[Math.floor(rng() * PAULI_NAMES.length) % PAULI_NAMES.length];

export const generateChallenge = (
  rng: Rng = Math.random,
  options: GenerateOptions = {},
): Challenge => {
  const { theta, phi, state } = generateInitialState(rng, options);
  const error = pickHiddenError(rng);
  const final = applyPauli(error, state);
  return {
    id: `${Math.floor(rng() * 1e9).toString(36)}-${Math.floor(rng() * 1e9).toString(36)}`,
    theta,
    phi,
    initial: state,
    error,
    final,
  };
};

export interface AnswerResult {
  readonly correct: boolean;
  readonly chosen: PauliName;
  readonly expected: PauliName;
  /** Error efectivo que explica la observación (por si eligió un equivalente). */
  readonly equivalentOtherwise: boolean;
}

export const checkAnswer = (
  challenge: Challenge,
  chosen: PauliName,
  eps = 1e-6,
): AnswerResult => {
  const correct = chosen === challenge.error;
  // Nota: por construcción las alternativas son mutuamente distinguibles,
  // así que no hay respuestas equivalentes salvo la correcta.
  const equivalentOtherwise =
    !correct &&
    1 - overlap(applyPauli(chosen, challenge.initial), challenge.final) <= eps;
  return { correct, chosen, expected: challenge.error, equivalentOtherwise };
};
