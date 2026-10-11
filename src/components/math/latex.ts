import type { Complex, Matrix2 } from "@/lib/quantum";

/* Utilidades para convertir números complejos y matrices a LaTeX. */

const tidy = (n: number, digits: number): number => {
  const rounded = Number(n.toFixed(digits));
  return Object.is(rounded, -0) ? 0 : rounded;
};

/** Número real como LaTeX usando el signo menos ASCII de KaTeX. */
export const latexNumber = (n: number, digits = 3): string =>
  String(tidy(n, digits));

/** Número complejo como LaTeX: "2-i", "-i", "0.71+0.71i", "0". */
export const latexComplex = (c: Complex, digits = 3): string => {
  const re = tidy(c.re, digits);
  const im = tidy(c.im, digits);
  if (im === 0) return String(re);
  const absIm = Math.abs(im);
  const unit = absIm === 1 ? "i" : `${absIm}i`;
  const imPart = im < 0 ? `-${unit}` : unit;
  if (re === 0) return imPart;
  return `${re}${im < 0 ? "-" : "+"}${unit}`;
};

export interface MatrixLatexOptions {
  digits?: number;
  /** Colorea las entradas no nulas con `accent`. */
  highlight?: boolean;
  accent?: string;
}

/** Matriz 2×2 compleja como `\begin{pmatrix}...\end{pmatrix}`. */
export const matrixToLatex = (
  m: Matrix2,
  { digits = 3, highlight = false, accent = "#0b7fd4" }: MatrixLatexOptions = {},
): string => {
  const cell = (c: Complex): string => {
    const latex = latexComplex(c, digits);
    const zero = Math.abs(c.re) < 1e-12 && Math.abs(c.im) < 1e-12;
    return highlight && !zero ? `\\textcolor{${accent}}{${latex}}` : latex;
  };
  return `\\begin{pmatrix}${cell(m[0][0])} & ${cell(m[0][1])} \\\\ ${cell(m[1][0])} & ${cell(m[1][1])}\\end{pmatrix}`;
};
