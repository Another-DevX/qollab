import { describe, expect, it } from "vitest";

import {
  AXIS_VECTORS,
  KET_0,
  KET_1,
  KET_MINUS,
  KET_MINUS_I,
  KET_PLUS,
  KET_PLUS_I,
  NAMED_STATES,
  PAULI_I,
  PAULI_MATRICES,
  PAULI_NAMES,
  PAULI_X,
  PAULI_Y,
  PAULI_Z,
  applyPauli,
  areEquivalentUpToPhase,
  blochEquals,
  blochToSpherical,
  blochVector,
  cAbs,
  checkAnswer,
  cleanNumber,
  composePauliSequence,
  createSeededRng,
  formatComplex,
  generateChallenge,
  globalPhaseBetween,
  isErrorDistinguishable,
  isNonDegenerate,
  ketState,
  matAdd,
  matDagger,
  matDet,
  matEquals,
  matMul,
  matScaleComplex,
  matTrace,
  matVec,
  normalizeSpinor,
  outcomeProbability,
  overlap,
  pauliDecomposition,
  reconstructFromPauli,
  rotateBloch,
  rotationOperator,
  rotationPauliCoefficients,
  stateFromBloch,
  type BlochVector,
  type Matrix2,
  type Spinor,
} from "../index";

/* ------------------------------------------------------------------ */
/* Utilidades de test                                                  */
/* ------------------------------------------------------------------ */

const APPROX = 1e-9;

/** ¿A y B representan el mismo operador salvo fase global? */
const equalUpToPhase = (a: Matrix2, b: Matrix2, eps = 1e-9): boolean => {
  const lambda = {
    re: matTrace(matMul(a, matDagger(b))).re / 2,
    im: matTrace(matMul(a, matDagger(b))).im / 2,
  };
  if (Math.abs(Math.hypot(lambda.re, lambda.im) - 1) > eps) return false;
  return matEquals(a, matScaleComplex(b, lambda), eps);
};

const expectMatrix = (a: Matrix2, b: Matrix2, eps = APPROX) =>
  expect(matEquals(a, b, eps)).toBe(true);

const randomSpinor = (rng: () => number): Spinor =>
  normalizeSpinor([
    { re: rng() - 0.5, im: rng() - 0.5 },
    { re: rng() - 0.5, im: rng() - 0.5 },
  ]);

const randomComplexMatrix = (rng: () => number): Matrix2 => [
  [
    { re: rng() * 2 - 1, im: rng() * 2 - 1 },
    { re: rng() * 2 - 1, im: rng() * 2 - 1 },
  ],
  [
    { re: rng() * 2 - 1, im: rng() * 2 - 1 },
    { re: rng() * 2 - 1, im: rng() * 2 - 1 },
  ],
];

/* ------------------------------------------------------------------ */
/* Números complejos                                                   */
/* ------------------------------------------------------------------ */

describe("números complejos", () => {
  it("calcula el módulo", () => {
    expect(cAbs({ re: 3, im: 4 })).toBeCloseTo(5, 12);
  });

  it("formatea valores complejos legibles", () => {
    expect(formatComplex({ re: 0, im: 0 })).toBe("0");
    expect(formatComplex({ re: 1, im: 0 })).toBe("1");
    expect(formatComplex({ re: 0, im: 1 })).toBe("i");
    expect(formatComplex({ re: 0, im: -1 })).toBe("−i");
    expect(formatComplex({ re: 2, im: -1 })).toBe("2 − i");
    expect(cleanNumber(-0)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Propiedades de las matrices de Pauli                                */
/* ------------------------------------------------------------------ */

describe("matrices de Pauli", () => {
  it("son hermíticas (σ† = σ)", () => {
    for (const name of PAULI_NAMES) {
      expectMatrix(matDagger(PAULI_MATRICES[name]), PAULI_MATRICES[name]);
    }
  });

  it("son unitarias (σ†σ = I)", () => {
    for (const name of PAULI_NAMES) {
      const sigma = PAULI_MATRICES[name];
      expectMatrix(matMul(matDagger(sigma), sigma), PAULI_I);
      expectMatrix(matMul(sigma, matDagger(sigma)), PAULI_I);
    }
  });

  it("son involuciones (σ² = I) y tienen determinante 1", () => {
    for (const name of PAULI_NAMES) {
      const sigma = PAULI_MATRICES[name];
      expectMatrix(matMul(sigma, sigma), PAULI_I);
      expect(cAbs(matDet(sigma))).toBeCloseTo(1, 12);
    }
  });

  it("X, Y, Z tienen traza nula", () => {
    for (const sigma of [PAULI_X, PAULI_Y, PAULI_Z]) {
      expect(cAbs(matTrace(sigma))).toBeCloseTo(0, 12);
    }
  });

  it("son ortogonales bajo Tr(A†B) = 2δ", () => {
    for (const a of PAULI_NAMES) {
      for (const b of PAULI_NAMES) {
        const inner = matTrace(matMul(matDagger(PAULI_MATRICES[a]), PAULI_MATRICES[b]));
        expect(inner.re).toBeCloseTo(a === b ? 2 : 0, 12);
        expect(inner.im).toBeCloseTo(0, 12);
      }
    }
  });

  it("actúan correctamente sobre los estados base", () => {
    expect(areEquivalentUpToPhase(applyPauli("X", KET_0), KET_1)).toBe(true);
    expect(areEquivalentUpToPhase(applyPauli("X", KET_1), KET_0)).toBe(true);
    expect(areEquivalentUpToPhase(applyPauli("Z", KET_0), KET_0)).toBe(true);
    expect(areEquivalentUpToPhase(applyPauli("Z", KET_1), KET_1)).toBe(true);
    expect(areEquivalentUpToPhase(applyPauli("Y", KET_0), KET_1)).toBe(true);
    expect(areEquivalentUpToPhase(applyPauli("Y", KET_1), KET_0)).toBe(true);
    // Y|0⟩ = i|1⟩ ⇒ fase global π/2 respecto de |1⟩
    expect(globalPhaseBetween(KET_1, applyPauli("Y", KET_0))).toBeCloseTo(
      Math.PI / 2,
      9,
    );
  });

  it("la composición X·Y = iZ difiere de la combinación lineal X+Y", () => {
    expect(equalUpToPhase(matMul(PAULI_X, PAULI_Y), PAULI_Z)).toBe(true);
    // X+Y no es proporcional a Z (ni a ningún otro escalar de X·Y)
    const combined = matAdd(PAULI_X, PAULI_Y);
    expect(equalUpToPhase(combined, PAULI_Z)).toBe(false);
    expect(equalUpToPhase(combined, matMul(PAULI_X, PAULI_Y))).toBe(false);
  });

  it("compone secuencias respetando el orden (X y luego Y ⇒ iZ)", () => {
    const total = composePauliSequence(["X", "Y"]);
    expect(equalUpToPhase(total, PAULI_Z)).toBe(true);
    // names[0] actúa primero: ["Y","X"] aplica Y y después X ⇒ X·Y
    const applied = composePauliSequence(["Y", "X"]);
    expect(
      areEquivalentUpToPhase(
        applyPauli("X", applyPauli("Y", KET_0)),
        applyMat(applied, KET_0),
      ),
    ).toBe(true);
  });
});

// helper local para aplicar una matriz a un estado
const applyMat = (m: Matrix2, s: Spinor): Spinor => matVec(m, s);

/* ------------------------------------------------------------------ */
/* Esfera de Bloch y fases globales                                    */
/* ------------------------------------------------------------------ */

describe("esfera de Bloch", () => {
  it("ubica correctamente los estados nombrados", () => {
    expect(blochVector(KET_0)).toEqual({ x: 0, y: 0, z: 1 });
    expect(blochVector(KET_1)).toEqual({ x: 0, y: 0, z: -1 });
    expect(blochEquals(blochVector(KET_PLUS), { x: 1, y: 0, z: 0 })).toBe(true);
    expect(blochEquals(blochVector(KET_MINUS), { x: -1, y: 0, z: 0 })).toBe(true);
    expect(blochEquals(blochVector(KET_PLUS_I), { x: 0, y: 1, z: 0 })).toBe(true);
    expect(blochEquals(blochVector(KET_MINUS_I), { x: 0, y: -1, z: 0 })).toBe(true);
    for (const named of NAMED_STATES) {
      expect(blochEquals(blochVector(named.state), named.bloch, 1e-9)).toBe(true);
    }
  });

  it("(|0⟩, |1⟩) están en los polos y |+⟩ en el ecuador", () => {
    expect(blochVector(KET_0).z).toBeCloseTo(1, 12);
    expect(blochVector(KET_1).z).toBeCloseTo(-1, 12);
    expect(Math.hypot(...Object.values(blochVector(KET_PLUS)))).toBeCloseTo(1, 12);
  });

  it("blochVector y stateFromBloch son inversas en estados puros", () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 50; i++) {
      const state = randomSpinor(rng);
      const v = blochVector(state);
      const back = stateFromBloch(v.x, v.y, v.z);
      expect(areEquivalentUpToPhase(state, back, 1e-7)).toBe(true);
    }
  });

  it("los estados puros viven en la superficie (norma 1)", () => {
    const rng = createSeededRng(11);
    for (let i = 0; i < 50; i++) {
      const v = blochVector(randomSpinor(rng));
      expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 9);
    }
  });

  it("normaliza el estado al construir desde ángulos", () => {
    const state = ketState(1.1, 2.3);
    expect(
      outcomeProbability(state, 0) + outcomeProbability(state, 1),
    ).toBeCloseTo(1, 12);
    expect(blochToSpherical(blochVector(state)).theta).toBeCloseTo(1.1, 9);
  });

  it("las fases globales no son observables en la esfera de Bloch", () => {
    const cases: Array<[Spinor, Spinor]> = [
      [KET_1, applyPauli("Z", KET_1)], // Z|1⟩ = −|1⟩
      [KET_0, applyPauli("Z", KET_0)], // Z|0⟩ = |0⟩
    ];
    for (const [a, b] of cases) {
      expect(areEquivalentUpToPhase(a, b)).toBe(true);
      expect(blochEquals(blochVector(a), blochVector(b))).toBe(true);
      expect(overlap(a, b)).toBeCloseTo(1, 9);
    }
    expect(Math.abs(globalPhaseBetween(KET_1, applyPauli("Z", KET_1)))).toBeCloseTo(
      Math.PI,
      9,
    );
  });

  it("distingue estados que no son equivalentes", () => {
    expect(areEquivalentUpToPhase(KET_0, KET_1)).toBe(false);
    expect(areEquivalentUpToPhase(KET_PLUS, KET_PLUS_I)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Correspondencia Pauli ↔ rotación de π en la esfera de Bloch         */
/* ------------------------------------------------------------------ */

describe("acción de Pauli sobre el vector de Bloch", () => {
  it("coincide con una rotación de π en el eje correspondiente", () => {
    const rng = createSeededRng(42);
    const axisFor: Record<string, BlochVector> = {
      X: AXIS_VECTORS.x,
      Y: AXIS_VECTORS.y,
      Z: AXIS_VECTORS.z,
    };
    for (let i = 0; i < 100; i++) {
      const state = randomSpinor(rng);
      const v = blochVector(state);
      for (const pauli of ["X", "Y", "Z"] as const) {
        const transformed = blochVector(applyPauli(pauli, state));
        const rotated = rotateBloch(v, axisFor[pauli], Math.PI);
        expect(blochEquals(transformed, rotated, 1e-9)).toBe(true);
      }
    }
  });

  it("verifica las transformaciones explícitas pedidas", () => {
    const v: BlochVector = { x: 0.3, y: -0.5, z: 0.81 };
    const x = rotateBloch(v, AXIS_VECTORS.x, Math.PI);
    const y = rotateBloch(v, AXIS_VECTORS.y, Math.PI);
    const z = rotateBloch(v, AXIS_VECTORS.z, Math.PI);
    expect(blochEquals(x, { x: v.x, y: -v.y, z: -v.z })).toBe(true);
    expect(blochEquals(y, { x: -v.x, y: v.y, z: -v.z })).toBe(true);
    expect(blochEquals(z, { x: -v.x, y: -v.y, z: v.z })).toBe(true);
  });

  it("el mismo estado físico no cambia por aplicar Z a |0⟩", () => {
    expect(blochEquals(blochVector(KET_0), blochVector(applyPauli("Z", KET_0)))).toBe(
      true,
    );
  });
});

/* ------------------------------------------------------------------ */
/* Base de Pauli y rotaciones                                          */
/* ------------------------------------------------------------------ */

describe("base de Pauli y rotaciones", () => {
  it("descompone I, X, Y, Z en sus propios coeficientes", () => {
    expect(pauliDecomposition(PAULI_I)).toEqual({
      a: { re: 1, im: 0 },
      b: { re: 0, im: 0 },
      c: { re: 0, im: 0 },
      d: { re: 0, im: 0 },
    });
    const decX = pauliDecomposition(PAULI_X);
    expect(decX.b.re).toBeCloseTo(1, 12);
    expect(cAbs(decX.a)).toBeCloseTo(0, 12);
  });

  it("reconstruye cualquier matriz 2×2 desde la base {I, X, Y, Z}", () => {
    const rng = createSeededRng(2024);
    for (let i = 0; i < 50; i++) {
      const m = randomComplexMatrix(rng);
      const rebuilt = reconstructFromPauli(pauliDecomposition(m));
      expectMatrix(rebuilt, m, 1e-9);
    }
  });

  it("la descomposición de una rotación coincide con la fórmula analítica", () => {
    const rng = createSeededRng(99);
    for (let i = 0; i < 50; i++) {
      const axis = {
        x: rng() * 2 - 1,
        y: rng() * 2 - 1,
        z: rng() * 2 - 1,
      };
      const angle = rng() * 2 * Math.PI;
      const decomposed = pauliDecomposition(rotationOperator(axis, angle));
      const analytic = rotationPauliCoefficients(axis, angle);
      for (const key of ["a", "b", "c", "d"] as const) {
        expect(decomposed[key].re).toBeCloseTo(analytic[key].re, 9);
        expect(decomposed[key].im).toBeCloseTo(analytic[key].im, 9);
      }
      // a = cos(α/2)
      expect(decomposed.a.re).toBeCloseTo(Math.cos(angle / 2), 9);
      expect(decomposed.a.im).toBeCloseTo(0, 9);
    }
  });

  it("una rotación de π alrededor de un eje equivale al Pauli salvo fase global", () => {
    expect(equalUpToPhase(rotationOperator(AXIS_VECTORS.x, Math.PI), PAULI_X)).toBe(
      true,
    );
    expect(equalUpToPhase(rotationOperator(AXIS_VECTORS.y, Math.PI), PAULI_Y)).toBe(
      true,
    );
    expect(equalUpToPhase(rotationOperator(AXIS_VECTORS.z, Math.PI), PAULI_Z)).toBe(
      true,
    );
  });

  it("aplicar la rotación a un estado mueve el vector de Bloch como una rotación geométrica", () => {
    const rng = createSeededRng(5);
    for (let i = 0; i < 40; i++) {
      const state = randomSpinor(rng);
      const axis = { x: rng() * 2 - 1, y: rng() * 2 - 1, z: rng() * 2 - 1 };
      const angle = rng() * 2 * Math.PI;
      const v = blochVector(state);
      const rotatedState = matVec(rotationOperator(axis, angle), state);
      const expected = rotateBloch(v, axis, angle);
      expect(blochEquals(blochVector(rotatedState), expected, 1e-7)).toBe(true);
    }
  });

  it("las rotaciones son unitarias (preservan la norma)", () => {
    const rng = createSeededRng(3);
    for (let i = 0; i < 30; i++) {
      const axis = { x: rng() * 2 - 1, y: rng() * 2 - 1, z: rng() * 2 - 1 };
      const angle = rng() * 2 * Math.PI;
      const u = rotationOperator(axis, angle);
      expectMatrix(matMul(matDagger(u), u), PAULI_I, 1e-9);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Retos del juego                                                     */
/* ------------------------------------------------------------------ */

describe("reto de errores", () => {
  it("genera estados iniciales no degenerados y finales exactos", () => {
    const rng = createSeededRng(12345);
    for (let i = 0; i < 200; i++) {
      const challenge = generateChallenge(rng);
      expect(isNonDegenerate(challenge.initial)).toBe(true);
      // El estado final es exactamente E|ψ⟩
      const expected = applyPauli(challenge.error, challenge.initial);
      expect(areEquivalentUpToPhase(challenge.final, expected)).toBe(true);
      // Y cada error alternativo es distinguible del inicial
      for (const error of PAULI_NAMES) {
        expect(isErrorDistinguishable(challenge.initial, error)).toBe(true);
      }
    }
  });

  it("valida las respuestas correctas e incorrectas", () => {
    const rng = createSeededRng(777);
    for (let i = 0; i < 100; i++) {
      const challenge = generateChallenge(rng);
      const good = checkAnswer(challenge, challenge.error);
      expect(good.correct).toBe(true);
      expect(good.equivalentOtherwise).toBe(false);
      for (const wrong of PAULI_NAMES) {
        if (wrong === challenge.error) continue;
        const bad = checkAnswer(challenge, wrong);
        expect(bad.correct).toBe(false);
        expect(bad.equivalentOtherwise).toBe(false);
      }
    }
  });

  it("detecta degeneraciones en los estados cardinales", () => {
    // |+⟩ es autoestado de X ⇒ X|+⟩ = |+⟩, no distinguible
    expect(isNonDegenerate(KET_PLUS)).toBe(false);
    expect(isErrorDistinguishable(KET_PLUS, "X")).toBe(false);
    expect(isNonDegenerate(KET_0)).toBe(false); // polo: Z|0⟩ = |0⟩
  });
});
