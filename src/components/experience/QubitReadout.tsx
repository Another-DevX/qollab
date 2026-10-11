import { formatComplex, formatReal } from "@/lib/quantum/format";
import { blochVector, type Spinor } from "@/lib/quantum";

import { FieldRow } from "@/components/ui/primitives";

/** Panel compacto con amplitudes y coordenadas de Bloch de un estado. */
export function QubitReadout({
  title,
  state,
  color,
  showPhaseNote = false,
}: {
  title: string;
  state: Spinor;
  color: string;
  showPhaseNote?: boolean;
}) {
  const [alpha, beta] = state;
  const v = blochVector(state);
  return (
    <div className="rounded-xl border border-line bg-surface-3/40 p-3">
      <div className="mb-1 flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
        <span className="text-xs font-medium text-ink">{title}</span>
      </div>
      <div className="flex flex-col">
        <FieldRow label="α · |0⟩">{formatComplex(alpha, 3)}</FieldRow>
        <FieldRow label="β · |1⟩">{formatComplex(beta, 3)}</FieldRow>
        <FieldRow label="(x, y, z)">
          {`(${formatReal(v.x)}, ${formatReal(v.y)}, ${formatReal(v.z)})`}
        </FieldRow>
      </div>
      {showPhaseNote ? (
        <p className="mt-2 text-[11px] leading-snug text-faint">
          Amplitudes include the <em>global phase</em>, which is unobservable;
          the Bloch sphere keeps only the relative phase.
        </p>
      ) : null}
    </div>
  );
}
