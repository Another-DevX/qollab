"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/cn";
import { usePalette } from "@/lib/theme";
import type { BlochSphereProps } from "./types";

const BlochScene = dynamic(() => import("./BlochScene"), {
  ssr: false,
  loading: () => <BlochLoader />,
});

function BlochLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-faint">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
        <span className="text-xs">Preparing the Bloch sphere…</span>
      </div>
    </div>
  );
}

/**
 * Contenedor interactivo de la esfera de Bloch.
 *
 * - La escena 3D se carga sólo en el cliente (Three.js no corre en el servidor).
 * - El contenedor usa `touch-action: none` para que el arrastre (ratón y táctil)
 *   rote la cámara en lugar de desplazar la página.
 * - Las capas HTML superpuestas (leyenda, pista) son `pointer-events-none`, así
 *   que NUNCA interceptan el arrastre: todos los gestos llegan al lienzo.
 * - Orbitar la cámara jamás modifica el estado cuántico; los vectores se animan
 *   de forma independiente según las matrices calculadas.
 */
export function BlochSphere({
  arrows,
  className,
  showLabels = true,
  autoRotate = false,
  ariaLabel,
  overlay,
}: BlochSphereProps) {
  const palette = usePalette();
  return (
    <div
      role="group"
      aria-label={
        ariaLabel ??
        "Interactive 3D Bloch sphere. Drag to orbit the camera."
      }
      className={cn(
        "bloch-surface relative isolate overflow-hidden rounded-2xl border border-line bg-surface-2",
        className,
      )}
    >
      <div className="absolute inset-0">
        <BlochScene
          arrows={arrows}
          showLabels={showLabels}
          autoRotate={autoRotate}
          palette={palette}
        />
      </div>

      {overlay ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          {overlay}
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full border border-line/70 bg-surface-2/80 px-3 py-1 text-[10px] uppercase tracking-widest text-faint backdrop-blur">
        drag to orbit
      </div>
    </div>
  );
}
