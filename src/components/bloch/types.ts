import type { ReactNode } from "react";

/** Flecha (vector de estado) dibujada sobre la esfera de Bloch. */
export interface BlochArrow {
  /** Identificador estable (clave de React). */
  id: string;
  /** Dirección del vector de Bloch [x, y, z]. */
  vector: [number, number, number];
  /** Color CSS/hex de la flecha. */
  color: string;
  /** Opacidad (0–1). */
  opacity?: number;
  /**
   * Si se especifica, la flecha arranca en esta dirección y anima hasta
   * `vector` al montarse. Útil para reproducir una transformación.
   */
  from?: [number, number, number];
  /** Etiqueta opcional junto a la punta. */
  label?: string;
}

export interface BlochSphereProps {
  arrows: BlochArrow[];
  className?: string;
  /** Muestra las etiquetas X, Y, Z. */
  showLabels?: boolean;
  /** Rota automáticamente la cámara. */
  autoRotate?: boolean;
  /** Texto accesible para lectores de pantalla. */
  ariaLabel?: string;
  /** Superposición HTML en la esquina inferior del lienzo. */
  overlay?: ReactNode;
}
