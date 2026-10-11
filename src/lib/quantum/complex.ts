/**
 * Números complejos.
 *
 * Este módulo es puramente matemático: no depende de React ni del render.
 * Todas las operaciones devuelven nuevos valores (inmutables).
 */

export interface Complex {
  readonly re: number;
  readonly im: number;
}

export const complex = (re: number, im = 0): Complex => ({ re, im });

export const C_ZERO: Complex = { re: 0, im: 0 };
export const C_ONE: Complex = { re: 1, im: 0 };
export const C_I: Complex = { re: 0, im: 1 };

export const cAdd = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

export const cSub = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im,
});

export const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const cScale = (a: Complex, s: number): Complex => ({
  re: a.re * s,
  im: a.im * s,
});

export const cNeg = (a: Complex): Complex => ({ re: -a.re, im: -a.im });

export const cConj = (a: Complex): Complex => ({ re: a.re, im: -a.im });

/** |a|² = a·ā */
export const cAbs2 = (a: Complex): number => a.re * a.re + a.im * a.im;

/** |a| */
export const cAbs = (a: Complex): number => Math.sqrt(cAbs2(a));

/** e^{i φ} = cos φ + i sin φ */
export const cExpI = (phi: number): Complex => ({
  re: Math.cos(phi),
  im: Math.sin(phi),
});

/** Número complejo en forma polar: r·e^{i φ} */
export const cPolar = (r: number, phi: number): Complex => ({
  re: r * Math.cos(phi),
  im: r * Math.sin(phi),
});

/** Argumento (fase) de un número complejo, en (-π, π]. */
export const cArg = (a: Complex): number => Math.atan2(a.im, a.re);

export const cEquals = (a: Complex, b: Complex, eps = 1e-9): boolean =>
  Math.abs(a.re - b.re) <= eps && Math.abs(a.im - b.im) <= eps;
