import { cn } from "@/lib/cn";
import type { Matrix2 } from "@/lib/quantum";

import { Tex } from "./Tex";
import { matrixToLatex } from "./latex";

export interface MathMatrixProps {
  /** Matriz compleja 2×2. */
  matrix: Matrix2;
  /** Etiqueta LaTeX a la izquierda, p. ej. "X =" o "U =". */
  label?: string;
  /** Encabezado pequeño encima. */
  caption?: string;
  digits?: number;
  className?: string;
  /** Colorea las entradas no nulas. */
  highlight?: boolean;
  accent?: string;
}

/** Muestra una matriz 2×2 de números complejos renderizada con KaTeX. */
export function MathMatrix({
  matrix,
  label,
  caption,
  digits = 3,
  className,
  highlight = false,
  accent,
}: MathMatrixProps) {
  const body = matrixToLatex(matrix, { digits, highlight, accent });
  const tex = label ? `${label} ${body}` : body;
  return (
    <figure className={cn("inline-flex flex-col gap-1.5", className)}>
      {caption ? (
        <figcaption className="font-mono text-[10px] uppercase tracking-widest text-faint">
          {caption}
        </figcaption>
      ) : null}
      <Tex tex={tex} />
    </figure>
  );
}
