"use client";

import katex from "katex";

import { cn } from "@/lib/cn";

export interface TexProps {
  /** Expresión LaTeX sin delimitadores, p. ej. "\\frac{a}{b}". */
  tex: string;
  /** Modo display (bloque centrado) o inline. */
  display?: boolean;
  className?: string;
}

/**
 * Renderiza LaTeX con KaTeX. `katex.renderToString` es determinista, por lo
 * que el HTML generado en el servidor y en el cliente coincide (sin errores
 * de hidratación).
 */
export function Tex({ tex, display = false, className }: TexProps) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: false,
    output: "html",
  });
  return (
    <span
      className={cn(display && "block w-full", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
