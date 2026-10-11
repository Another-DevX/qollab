/**
 * Rotaciones de un cúbit y descomposición en la base de Pauli.
 *
 * Una rotación de ángulo α alrededor del eje unitario n = (n_x, n_y, n_z) es
 *
 *   U = cos(α/2) I − i sin(α/2) (n_x X + n_y Y + n_z Z).
 *
 * Cualquier operador de un cúbit puede escribirse E = aI + bX + cY + dZ.
 * Nótese que esta COMBINACIÓN LINEAL de operadores no es lo mismo que
 * aplicarlos secuencialmente (la composición es un producto matricial).
 */

import { C_I, cMul, cScale, complex, type Complex } from "./complex";
import {
  matAdd,
  matDagger,
  matMul,
  matScale,
  matScaleComplex,
  matTrace,
  type Matrix2,
} from "./matrix";
import {
  PAULI_I,
  PAULI_X,
  PAULI_Y,
  PAULI_Z,
  type PauliName,
} from "./pauli";
import type { BlochVector } from "./state";

export interface PauliCoefficients {
  readonly a: Complex;
  readonly b: Complex;
  readonly c: Complex;
  readonly d: Complex;
}

/** Normaliza un eje arbitrario a longitud unitaria. */
export const normalizeAxis = (axis: BlochVector): BlochVector => {
  const n = Math.hypot(axis.x, axis.y, axis.z);
  if (n < 1e-12) return { x: 1, y: 0, z: 0 };
  return { x: axis.x / n, y: axis.y / n, z: axis.z / n };
};

/** σ·n = n_x X + n_y Y + n_z Z. */
export const dotPauli = (axis: BlochVector): Matrix2 => {
  const n = normalizeAxis(axis);
  return matAdd(
    matAdd(matScale(PAULI_X, n.x), matScale(PAULI_Y, n.y)),
    matScale(PAULI_Z, n.z),
  );
};

/** U = cos(α/2) I − i sin(α/2)(σ·n). */
export const rotationOperator = (axis: BlochVector, angle: number): Matrix2 => {
  const half = angle / 2;
  const n = normalizeAxis(axis);
  const identityPart = matScale(PAULI_I, Math.cos(half));
  const generatorPart = matScaleComplex(dotPauli(n), { re: 0, im: -Math.sin(half) });
  return matAdd(identityPart, generatorPart);
};

/** Coeficientes analíticos de la rotación en la base de Pauli. */
export const rotationPauliCoefficients = (
  axis: BlochVector,
  angle: number,
): PauliCoefficients => {
  const half = angle / 2;
  const n = normalizeAxis(axis);
  const b = cMul(C_I, cScale({ re: -Math.sin(half), im: 0 }, n.x));
  const c = cMul(C_I, cScale({ re: -Math.sin(half), im: 0 }, n.y));
  const d = cMul(C_I, cScale({ re: -Math.sin(half), im: 0 }, n.z));
  return { a: complex(Math.cos(half), 0), b, c, d };
};

/** Coeficiente c_k = Tr(B_k† M)/2 para B_k = I, X, Y, Z. */
const coefficient = (operator: Matrix2, basis: Matrix2): Complex =>
  cScale(matTrace(matMul(matDagger(basis), operator)), 1 / 2);

/** Descompone E = aI + bX + cY + dZ. */
export const pauliDecomposition = (operator: Matrix2): PauliCoefficients => ({
  a: coefficient(operator, PAULI_I),
  b: coefficient(operator, PAULI_X),
  c: coefficient(operator, PAULI_Y),
  d: coefficient(operator, PAULI_Z),
});

/** Reconstruye el operador a partir de sus coeficientes de Pauli. */
export const reconstructFromPauli = (coeffs: PauliCoefficients): Matrix2 => {
  return matAdd(
    matAdd(
      matScaleComplex(PAULI_I, coeffs.a),
      matScaleComplex(PAULI_X, coeffs.b),
    ),
    matAdd(
      matScaleComplex(PAULI_Y, coeffs.c),
      matScaleComplex(PAULI_Z, coeffs.d),
    ),
  );
};

/** Representación de un coeficiente de Pauli (etiqueta + valor). */
export const PAULI_COEFFICIENT_ORDER: readonly PauliName[] = ["I", "X", "Y", "Z"];

export const coefficientsToArray = (
  coeffs: PauliCoefficients,
): readonly [Complex, Complex, Complex, Complex] => [
  coeffs.a,
  coeffs.b,
  coeffs.c,
  coeffs.d,
];

export const COEFFICIENT_LABELS: Record<PauliName, string> = {
  I: "a",
  X: "b",
  Y: "c",
  Z: "d",
};
