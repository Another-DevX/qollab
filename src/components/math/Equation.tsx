import { cn } from "@/lib/cn";

import { Tex } from "./Tex";

/** Ecuación destacada en bloque, renderizada con KaTeX. */
export function Equation({
  tex,
  className,
}: {
  tex: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-line bg-surface-2 px-5 py-4 text-center",
        className,
      )}
    >
      <Tex tex={tex} display />
    </div>
  );
}

/** Fragmento matemático en línea, renderizado con KaTeX. */
export function MathInline({
  tex,
  className,
}: {
  tex: string;
  className?: string;
}) {
  return <Tex tex={tex} className={cn("text-ink", className)} />;
}
