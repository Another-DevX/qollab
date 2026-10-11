import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("panel p-5", className)}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Botones                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-surface font-semibold hover:brightness-110 active:brightness-95",
  secondary:
    "border border-line bg-surface-3 text-ink hover:border-accent/60 hover:bg-surface-3/70",
  ghost: "text-muted hover:bg-white/5 hover:text-ink",
  danger:
    "border border-bad/40 bg-bad/10 text-bad hover:bg-bad/20 hover:border-bad/70",
  success:
    "border border-good/40 bg-good/10 text-good hover:bg-good/20 hover:border-good/70",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  active = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      data-active={active || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
        "disabled:pointer-events-none disabled:opacity-45",
        sizeClasses[size],
        variantClasses[variant],
        // Estado seleccionado para botones "chip"
        active &&
          variant !== "primary" &&
          "border-accent/70 bg-accent/12 text-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Chip seleccionable                                                  */
/* ------------------------------------------------------------------ */

export function Chip({
  children,
  selected,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border px-3 py-2 font-mono text-sm transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        selected
          ? "border-accent/70 bg-accent/12 text-accent shadow-[0_0_20px_-8px_var(--color-accent)]"
          : "border-line bg-surface-3/60 text-muted hover:border-accent/40 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Callout / nota                                                      */
/* ------------------------------------------------------------------ */

type CalloutTone = "info" | "insight" | "warning" | "success";

const toneClasses: Record<CalloutTone, string> = {
  info: "border-accent/30 bg-accent/[0.06]",
  insight: "border-accent-2/30 bg-accent-2/[0.06]",
  warning: "border-amber/30 bg-amber/[0.07]",
  success: "border-good/30 bg-good/[0.07]",
};

const toneLabel: Record<CalloutTone, string> = {
  info: "Context",
  insight: "Key idea",
  warning: "Note",
  success: "Check",
};

export function Callout({
  title,
  children,
  tone = "info",
  className,
}: {
  title?: string;
  children: ReactNode;
  tone?: CalloutTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed text-muted",
        toneClasses[tone],
        className,
      )}
    >
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-faint">
        {title ?? toneLabel[tone]}
      </p>
      <div className="text-ink/90 [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Encabezado de sección                                               */
/* ------------------------------------------------------------------ */

export function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("max-w-3xl", className)}>
      {eyebrow ? (
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.25em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      {lead ? (
        <p className="mt-3 text-base leading-relaxed text-muted">{lead}</p>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Estadística / KPI                                                   */
/* ------------------------------------------------------------------ */

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-3/50 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
        {label}
      </p>
      <p
        className="mt-1 font-mono text-lg font-semibold tabular-nums"
        style={{ color: tone }}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fila de dato (label → valor)                                        */
/* ------------------------------------------------------------------ */

export function FieldRow({
  label,
  children,
  mono = true,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2 last:border-0">
      <span className="text-xs text-faint">{label}</span>
      <span
        className={cn(
          "text-right text-sm text-ink",
          mono && "font-mono tabular-nums",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Leyenda                                                             */
/* ------------------------------------------------------------------ */

export function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface/60 px-3 py-1 backdrop-blur">
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
      />
      <span className="text-xs text-muted">{label}</span>
    </span>
  );
}
