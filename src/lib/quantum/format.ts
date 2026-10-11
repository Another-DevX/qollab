/**
 * Utilidades de formato para mostrar números complejos y matrices en la UI.
 * Separadas de la matemática para no mezclar presentación con cálculo.
 */

import type { Complex } from "./complex";

export const cleanNumber = (n: number, digits = 3): number => {
  const rounded = Number(n.toFixed(digits));
  return Object.is(rounded, -0) ? 0 : rounded;
};

export const formatNumber = (n: number, digits = 3): string =>
  String(cleanNumber(n, digits));

const imaginaryUnit = (im: number, digits: number): string => {
  const v = cleanNumber(im, digits);
  if (v === 1) return "i";
  if (v === -1) return "−i";
  return `${formatNumber(v, digits)}i`;
};

/** Formatea un número complejo: "a + bi", "i", "−2i", "0", "3". */
export const formatComplex = (c: Complex, digits = 3): string => {
  const re = cleanNumber(c.re, digits);
  const im = cleanNumber(c.im, digits);
  if (im === 0) return formatNumber(re, digits);
  if (re === 0) return imaginaryUnit(im, digits);
  const sign = im > 0 ? "+" : "−";
  return `${formatNumber(re, digits)} ${sign} ${imaginaryUnit(Math.abs(im), digits)}`;
};

/** Formatea un número real usando el signo menos tipográfico. */
export const formatReal = (n: number, digits = 3): string =>
  formatNumber(n, digits).replace("-", "−");

/** Fase en múltiplos de π, p. ej. 0.5π, −π, 0. */
export const formatPi = (radians: number, digits = 2): string => {
  const ratio = cleanNumber(radians / Math.PI, digits);
  if (ratio === 0) return "0";
  if (ratio === 1) return "π";
  if (ratio === -1) return "−π";
  return `${formatReal(ratio, digits)}π`;
};

/** Ángulo en grados a partir de radianes. */
export const radToDeg = (radians: number): number => (radians * 180) / Math.PI;
export const degToRad = (degrees: number): number => (degrees * Math.PI) / 180;
