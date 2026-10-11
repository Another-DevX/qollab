import type { PauliName } from "@/lib/quantum";
import type { Palette } from "@/lib/theme";

export interface PauliInfo {
  readonly title: string;
  /** One concise line about what the operator does. */
  readonly effect: string;
  /** Geometric transformation on the Bloch sphere, in LaTeX. */
  readonly mapTex: string;
  /** Short teaching note. */
  readonly note: string;
  readonly tone: "x" | "y" | "z" | "neutral";
}

export const PAULI_INFO: Record<PauliName, PauliInfo> = {
  I: {
    title: "Identity",
    effect: "Applies no change — the state is left untouched.",
    mapTex: "(x,y,z)\\mapsto(x,y,z)",
    note: "Represents the absence of an error.",
    tone: "neutral",
  },
  X: {
    title: "Bit flip",
    effect: "Swaps |0⟩ and |1⟩ — a π rotation about the X axis.",
    mapTex: "(x,y,z)\\mapsto(x,\\,-y,\\,-z)",
    note: "The quantum analogue of flipping a classical bit.",
    tone: "x",
  },
  Y: {
    title: "Bit + phase flip",
    effect: "Flips the bit and the phase at once — a π rotation about Y.",
    mapTex: "(x,y,z)\\mapsto(-x,\\,y,\\,-z)",
    note: "Y = iXZ: equivalent to X then Z, up to a global phase.",
    tone: "y",
  },
  Z: {
    title: "Phase flip",
    effect: "Flips the sign of the |1⟩ component — a π rotation about Z.",
    mapTex: "(x,y,z)\\mapsto(-x,\\,-y,\\,z)",
    note: "Leaves measurement probabilities unchanged — only the phase moves.",
    tone: "z",
  },
};

/** Colour associated with an operator in the active palette. */
export function pauliColor(name: PauliName, palette: Palette): string {
  switch (name) {
    case "X":
      return palette.axisX;
    case "Y":
      return palette.axisY;
    case "Z":
      return palette.axisZ;
    default:
      return palette.grid;
  }
}
