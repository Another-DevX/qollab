"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/* Page header — editorial spread label                                */
/* ------------------------------------------------------------------ */

export function PageHeader({
  number,
  kicker,
  title,
  dek,
  className,
}: {
  number: string;
  kicker: string;
  title: string;
  dek?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-t border-line pt-6", className)}>
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-xs tracking-[0.2em] text-accent">
          {number}
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.24em] text-faint">
          {kicker}
        </span>
      </div>
      <h2 className="headline mt-4 text-3xl sm:text-4xl">{title}</h2>
      {dek ? <p className="dek mt-3">{dek}</p> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Expandable note — progressive disclosure ("Why?")                   */
/* ------------------------------------------------------------------ */

export function Expandable({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-xl border border-line bg-surface-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <span>{label}</span>
        <span
          aria-hidden
          className={cn(
            "font-mono text-xs text-faint transition-transform",
            open && "rotate-45",
          )}
        >
          +
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-4 py-3 text-sm leading-relaxed text-muted">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Key idea / Notice — short editorial callouts                        */
/* ------------------------------------------------------------------ */

export function KeyIdea({
  children,
  label = "Key idea",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="border-l-2 border-accent pl-4">
      <p className="eyebrow text-faint">{label}</p>
      <div className="mt-1.5 text-[0.95rem] leading-relaxed text-ink/90">
        {children}
      </div>
    </div>
  );
}

export function Notice({
  children,
  label = "What to notice",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-3/50 px-4 py-3">
      <p className="eyebrow text-faint">{label}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}
