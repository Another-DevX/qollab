import { describe, expect, it } from "vitest";

import {
  CODE_DISTANCE,
  LOGICAL_BASIS,
  applyFrame,
  classify,
  describeFrame,
  encodeLogical,
  exact,
  frameFromErrors,
  inNormalizer,
  inStabilizer,
  isInCodeSpace,
  isLogical,
  monteCarlo,
  pauliMul,
  recovered,
  residual,
  sameUpToPhase,
  stabilizerValues,
  syndrome,
  syndromeBits,
  weight,
  type Frame,
  type State16,
} from "@/lib/quantum/iceberg";
import { cAdd, cConj, cMul } from "@/lib/quantum/complex";

function overlap(a: State16, b: State16): number {
  let acc = { re: 0, im: 0 };
  for (let i = 0; i < a.length; i++) acc = cAdd(acc, cMul(cConj(a[i]), b[i]));
  return Math.hypot(acc.re, acc.im);
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("Iceberg code [[4,2,2]]", () => {
  it("logical basis states are orthonormal", () => {
    for (const a of LOGICAL_BASIS) {
      expect(overlap(encodeLogical(a.key), encodeLogical(a.key))).toBeCloseTo(1, 9);
      for (const b of LOGICAL_BASIS) {
        if (a.key === b.key) continue;
        expect(overlap(encodeLogical(a.key), encodeLogical(b.key))).toBeLessThan(1e-9);
      }
    }
  });

  it("encodes the spec's physical superpositions", () => {
    const s00 = encodeLogical("00");
    expect(s00[0].re).toBeCloseTo(Math.SQRT1_2, 9);
    expect(s00[15].re).toBeCloseTo(Math.SQRT1_2, 9);
    const s01 = encodeLogical("01");
    expect(s01[3].re).toBeCloseTo(Math.SQRT1_2, 9);
    expect(s01[12].re).toBeCloseTo(Math.SQRT1_2, 9);
  });

  it("stabilizers commute", () => {
    expect(pauliMul("XXXX", "ZZZZ")).toBe("YYYY");
    expect(pauliMul("ZZZZ", "XXXX")).toBe("YYYY");
  });

  it("every logical basis state is in the +1 eigenspace of both stabilizers", () => {
    for (const l of LOGICAL_BASIS) {
      const v = stabilizerValues(encodeLogical(l.key));
      expect(v.sx).toBe(1);
      expect(v.sz).toBe(1);
      expect(isInCodeSpace(encodeLogical(l.key))).toBe(true);
    }
  });

  it("uses the correct syndrome table (I, X, Z, Y)", () => {
    expect(syndrome("IIII")).toEqual({ sx: 1, sz: 1 });
    expect(syndrome("XIII")).toEqual({ sx: 1, sz: -1 });
    expect(syndrome("ZIII")).toEqual({ sx: -1, sz: 1 });
    expect(syndrome("YIII")).toEqual({ sx: -1, sz: -1 });
  });

  it("detects every weight-one Pauli error", () => {
    const paulis = ["X", "Y", "Z"] as const;
    for (let q = 0; q < 4; q++) for (const p of paulis) {
      expect(classify(frameFromErrors([{ q, pauli: p }])).detected).toBe(true);
    }
  });

  it("gives the same syndrome for different locations of the same error", () => {
    const paulis = ["X", "Y", "Z"] as const;
    for (const p of paulis) {
      const ref = syndromeBits(frameFromErrors([{ q: 0, pauli: p }]));
      for (let q = 1; q < 4; q++) {
        expect(syndromeBits(frameFromErrors([{ q, pauli: p }]))).toEqual(ref);
      }
    }
  });

  it("has weight-two undetectable logical operators", () => {
    for (const f of ["XXII", "ZZII", "YYII"] as Frame[]) {
      expect(weight(f)).toBe(2);
      expect(inNormalizer(f)).toBe(true);
      expect(isLogical(f)).toBe(true);
    }
  });

  it("has code distance two", () => {
    let min = Infinity;
    for (let m = 0; m < 1 << 8; m++) {
      const paulis = ["I", "X", "Y", "Z"];
      let frame = "";
      let t = m;
      for (let q = 0; q < 4; q++) { frame += paulis[t & 3]; t >>= 2; }
      if (isLogical(frame)) min = Math.min(min, weight(frame));
    }
    expect(min).toBe(CODE_DISTANCE);
  });

  it("classifies identity, stabilizer, logical and detectable operators", () => {
    expect(classify("IIII").kind).toBe("identity");
    expect(classify("XXXX").kind).toBe("stabilizer");
    expect(classify("XXII").kind).toBe("logical");
    expect(classify("XIII").kind).toBe("detectable");
  });

  it("recovers iff the residual is a stabilizer", () => {
    expect(recovered("XIII", "XIII")).toBe(true);
    expect(recovered("XIII", "IXII")).toBe(false);
    expect(residual("XIII", "IXII")).toBe("XXII");
    expect(isLogical(residual("XIII", "IXII"))).toBe(true);
    // Correcting with the error times a stabilizer also recovers.
    expect(inStabilizer(residual("XIII", "IXXX"))).toBe(true);
    expect(recovered("XIII", "IXXX")).toBe(true);
  });

  it("preserves the logical state under a stabilizer and corrupts it under a logical operator", () => {
    expect(sameUpToPhase(encodeLogical("00"), applyFrame(encodeLogical("00"), "XXXX"))).toBe(true);
    expect(sameUpToPhase(encodeLogical("00"), applyFrame(encodeLogical("00"), "XXII"))).toBe(false);
  });

  it("matches the exact X-noise formula 6p²(1−p)² / P_accept", () => {
    const p = 0.05;
    const e = exact(p, "x");
    const pAccept = 0.5 * (1 + Math.pow(1 - 2 * p, 4));
    const logical = 6 * p * p * Math.pow(1 - p, 2);
    expect(e.pAccept).toBeCloseTo(pAccept, 9);
    expect(e.logicalRate).toBeCloseTo(logical / pAccept, 9);
  });

  it("Monte Carlo is consistent and converges toward the exact value", () => {
    const mc = monteCarlo(0.12, "x", 40000, true, seeded(11));
    const e = exact(0.12, "x");
    expect(mc.total).toBe(mc.accepted + mc.rejected);
    expect(mc.pAccept).toBeCloseTo(e.pAccept, 1);
    expect(Math.abs(mc.logicalRate - e.logicalRate)).toBeLessThan(0.05);
  });

  it("postselection never accepts more runs than it sees", () => {
    const mc = monteCarlo(0.2, "depol", 20000, true, seeded(5));
    expect(mc.accepted).toBeLessThanOrEqual(mc.total);
    expect(mc.logicalAccepted).toBeLessThanOrEqual(mc.accepted);
  });

  it("describes operators with subscripts", () => {
    expect(describeFrame("XXII")).toBe("X₁ X₂");
    expect(describeFrame("IIII")).toBe("I");
  });
});
