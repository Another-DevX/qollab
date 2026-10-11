/**
 * Matrices complejas 2×2 y vectores de estado (espinores de 2 componentes).
 *
 * El espacio de matrices complejas 2×2 tiene dimensión 4 sobre ℂ, que es
 * exactamente la razón por la que {I, X, Y, Z} forma una base (ver `pauli.ts`).
 */

import {
  C_ZERO,
  cAdd,
  cConj,
  cMul,
  cScale,
  cSub,
  type Complex,
} from "./complex";

/** Matriz compleja 2×2 en orden fila-mayor. */
export type Matrix2 = readonly [
  readonly [Complex, Complex],
  readonly [Complex, Complex],
];

/** Vector de estado de un cúbit: [α, β] con |α|² + |β|² = 1. */
export type Spinor = readonly [Complex, Complex];

export const ZERO_2: Matrix2 = [
  [C_ZERO, C_ZERO],
  [C_ZERO, C_ZERO],
];

export const IDENTITY_2: Matrix2 = [
  [
    { re: 1, im: 0 },
    { re: 0, im: 0 },
  ],
  [
    { re: 0, im: 0 },
    { re: 1, im: 0 },
  ],
];

/** Producto matricial A·B. */
export const matMul = (a: Matrix2, b: Matrix2): Matrix2 => {
  const cell = (i: 0 | 1, j: 0 | 1): Complex =>
    cAdd(cMul(a[i][0], b[0][j]), cMul(a[i][1], b[1][j]));
  return [
    [cell(0, 0), cell(0, 1)],
    [cell(1, 0), cell(1, 1)],
  ];
};

/** Aplicación de una matriz a un espinor: M|ψ⟩. */
export const matVec = (m: Matrix2, v: Spinor): Spinor => [
  cAdd(cMul(m[0][0], v[0]), cMul(m[0][1], v[1])),
  cAdd(cMul(m[1][0], v[0]), cMul(m[1][1], v[1])),
];

/** Suma de matrices. */
export const matAdd = (a: Matrix2, b: Matrix2): Matrix2 => [
  [cAdd(a[0][0], b[0][0]), cAdd(a[0][1], b[0][1])],
  [cAdd(a[1][0], b[1][0]), cAdd(a[1][1], b[1][1])],
];

/** Producto por un escalar real. */
export const matScale = (a: Matrix2, s: number): Matrix2 => [
  [cScale(a[0][0], s), cScale(a[0][1], s)],
  [cScale(a[1][0], s), cScale(a[1][1], s)],
];

/** Multiplicación por un escalar complejo. */
export const matScaleComplex = (a: Matrix2, s: Complex): Matrix2 => [
  [cMul(a[0][0], s), cMul(a[0][1], s)],
  [cMul(a[1][0], s), cMul(a[1][1], s)],
];

/** Conjugado traspuesto (adjunto) M†. */
export const matDagger = (a: Matrix2): Matrix2 => [
  [cConj(a[0][0]), cConj(a[1][0])],
  [cConj(a[0][1]), cConj(a[1][1])],
];

/** Traza de la matriz. */
export const matTrace = (a: Matrix2): Complex => cAdd(a[0][0], a[1][1]);

/** Determinante de la matriz. */
export const matDet = (a: Matrix2): Complex =>
  cSub(cMul(a[0][0], a[1][1]), cMul(a[0][1], a[1][0]));

/** Comparación por entradas con tolerancia. */
export const matEquals = (a: Matrix2, b: Matrix2, eps = 1e-9): boolean => {
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const x = a[i as 0 | 1][j as 0 | 1];
      const y = b[i as 0 | 1][j as 0 | 1];
      if (Math.abs(x.re - y.re) > eps || Math.abs(x.im - y.im) > eps) {
        return false;
      }
    }
  }
  return true;
};

/** Convierte una matriz de números reales en una matriz compleja. */
export const realMatrix2 = (a: number, b: number, c: number, d: number): Matrix2 => [
  [
    { re: a, im: 0 },
    { re: b, im: 0 },
  ],
  [
    { re: c, im: 0 },
    { re: d, im: 0 },
  ],
];

/** Copia tipada de una matriz (útil para serializar/UI). */
export const cloneMatrix = (a: Matrix2): Matrix2 => [
  [{ ...a[0][0] }, { ...a[0][1] }],
  [{ ...a[1][0] }, { ...a[1][1] }],
];
