"use client";

import type { CSSProperties, ReactNode } from "react";

export interface RangeSliderProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Texto a mostrar junto a la etiqueta (valor formateado). */
  display?: ReactNode;
  /** Ayuda opcional bajo el control. */
  hint?: string;
  id?: string;
  ariaLabel?: string;
}

export function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  hint,
  id,
  ariaLabel,
}: RangeSliderProps) {
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const fallbackLabel =
    ariaLabel ?? (typeof label === "string" ? label : "Control deslizante");
  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
        {display != null ? (
          <span className="font-mono text-xs tabular-nums text-accent">
            {display}
          </span>
        ) : null}
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={fallbackLabel}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--range-progress": `${progress}%` } as CSSProperties}
      />
      {hint ? <p className="mt-1 text-[11px] text-faint">{hint}</p> : null}
    </div>
  );
}
