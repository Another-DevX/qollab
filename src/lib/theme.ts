"use client";

import { useSyncExternalStore } from "react";

export type Scheme = "light" | "dark";

export interface Palette {
  original: string;
  transformed: string;
  error: string;
  axisX: string;
  axisY: string;
  axisZ: string;
  grid: string;
  equator: string;
  shell: string;
  wire: string;
}

/**
 * Paletas de "datos" (state vectors, axes, error). Usadas tanto por la
 * interfaz HTML como dentro de la escena 3D, de modo que coincidan.
 */
export const PALETTES: Record<Scheme, Palette> = {
  light: {
    original: "#2f5d8a",
    transformed: "#9a4f72",
    error: "#a9762f",
    axisX: "#b0524a",
    axisY: "#4a7d5a",
    axisZ: "#3f5f9a",
    grid: "#9aa0aa",
    equator: "#4b5566",
    shell: "#3f5f9a",
    wire: "#bcbfc7",
  },
  dark: {
    original: "#7fb3e8",
    transformed: "#d98fb6",
    error: "#d7b06a",
    axisX: "#d08b84",
    axisY: "#7fbf9b",
    axisZ: "#8fb3e8",
    grid: "#7d8494",
    equator: "#c9cdd6",
    shell: "#8fb3e8",
    wire: "#525a6b",
  },
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getScheme(): Scheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyScheme(scheme: Scheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", scheme === "dark");
  try {
    localStorage.setItem("qc-theme", scheme);
  } catch {
    /* almacenamiento no disponible */
  }
  listeners.forEach((listener) => listener());
}

export function toggleScheme(): Scheme {
  const next: Scheme = getScheme() === "dark" ? "light" : "dark";
  applyScheme(next);
  return next;
}

/** Esquema actual (reactivo). En SSR asume "light". */
export function useScheme(): Scheme {
  return useSyncExternalStore(subscribe, getScheme, () => "light");
}

export function usePalette(): Palette {
  return PALETTES[useScheme()];
}
