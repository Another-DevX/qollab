/**
 * Matrices de Pauli.
 *
 *   I = ⎡1 0⎤   X = ⎡0 1⎤   Y = ⎡0 −i⎤   Z = ⎡1  0⎤
 *       ⎣0 1⎦       ⎣1 0⎦       ⎣i  0⎦       ⎣0 −1⎦
 *
 * X, Y, Z son unitarias y hermíticas (σ† = σ, σ² = I), tienen traza nula y
 * son ortogonales entre sí bajo el producto interno de Hilbert-Schmidt
 * ⟨A,B⟩ = Tr(A†B). En consecuencia {I, X, Y, Z} es una base ortonormal
 * (salvo normalización) del espacio de matrices 2×2 complejas.
 */

import { C_ONE, C_ZERO } from "./complex";
import { matMul, matVec, type Matrix2, type Spinor } from "./matrix";

export type PauliName = "I" | "X" | "Y" | "Z";
export type AxisName = "x" | "y" | "z";

export const PAULI_I: Matrix2 = [
  [C_ONE, C_ZERO],
  [C_ZERO, C_ONE],
];

export const PAULI_X: Matrix2 = [
  [C_ZERO, C_ONE],
  [C_ONE, C_ZERO],
];

export const PAULI_Y: Matrix2 = [
  [C_ZERO, { re: 0, im: -1 }],
  [{ re: 0, im: 1 }, C_ZERO],
];

export const PAULI_Z: Matrix2 = [
  [C_ONE, C_ZERO],
  [C_ZERO, { re: -1, im: 0 }],
];

export const PAULI_MATRICES: Record<PauliName, Matrix2> = {
  I: PAULI_I,
  X: PAULI_X,
  Y: PAULI_Y,
  Z: PAULI_Z,
};

export const PAULI_NAMES: readonly PauliName[] = ["I", "X", "Y", "Z"];

/** Eje del espacio de Bloch asociado a cada Pauli no trivial. */
export const PAULI_AXIS: Record<PauliName, AxisName> = {
  I: "x", // I no rota; el eje es irrelevante
  X: "x",
  Y: "y",
  Z: "z",
};

export const pauliMatrix = (name: PauliName): Matrix2 => PAULI_MATRICES[name];

/** Aplica un operador de Pauli a un estado: |ψ⟩ ↦ P|ψ⟩. */
export const applyPauli = (name: PauliName, state: Spinor): Spinor =>
  matVec(PAULI_MATRICES[name], state);

/**
 * Operador total resultante de aplicar una secuencia de Paulis.
 * `names[0]` actúa primero, `names[1]` después, etc.:
 *   P_total = names[n-1] · … · names[1] · names[0]
 */
export const composePauliSequence = (names: readonly PauliName[]): Matrix2 => {
  let result: Matrix2 = PAULI_I;
  for (const name of names) {
    result = matMul(PAULI_MATRICES[name], result);
  }
  return result;
};
