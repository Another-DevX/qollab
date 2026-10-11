/*!
 * Qollab · Module 2 — quantum-state mathematics.
 * Pure, DOM-free logic: complex numbers, single-qubit states, 3-qubit
 * registers, repetition encodings, stabilizer measurements, syndromes and
 * correction. Loadable as a classic script (window.Q) or in Node (module).
 *
 * Three qubits need only eight complex amplitudes — no universal simulator.
 */
(function (global) {
  "use strict";

  /* ---------- Complex numbers ---------- */
  function C(re, im) { return { re: re, im: im == null ? 0 : im }; }
  function cAdd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function cSub(a, b) { return C(a.re - b.re, a.im - b.im); }
  function cMul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function cScale(a, s) { return C(a.re * s, a.im * s); }
  function cConj(a) { return C(a.re, -a.im); }
  function cAbs(a) { return Math.hypot(a.re, a.im); }
  function cDiv(a, b) { var d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); }

  var SQ = 1 / Math.SQRT2;
  var K8 = 1 / Math.sqrt(8);

  /* ---------- Single-qubit states ---------- */
  var KET = { "0": [C(1), C(0)], "1": [C(0), C(1)], "+": [C(SQ), C(SQ)], "-": [C(SQ), C(-SQ)] };
  var KET_LABEL = { "0": "|0⟩", "1": "|1⟩", "+": "|+⟩", "-": "|−⟩" };

  function applyX1(v) { return [v[1], v[0]]; }
  function applyZ1(v) { return [v[0], cScale(v[1], -1)]; }
  function applyPauli1(v, p) { return p === "Z" ? applyZ1(v) : p === "X" ? applyX1(v) : [v[0], v[1]]; }
  function blochVector(v) {
    var n2 = cAbs(v[0]) * cAbs(v[0]) + cAbs(v[1]) * cAbs(v[1]);
    var ab = cMul(cConj(v[0]), v[1]);
    return { x: 2 * ab.re / n2, y: 2 * ab.im / n2, z: (cAbs(v[0]) * cAbs(v[0]) - cAbs(v[1]) * cAbs(v[1])) / n2 };
  }
  function eqPhase1(a, b, eps) {
    eps = eps == null ? 1e-6 : eps;
    var ip = cAdd(cMul(cConj(a[0]), b[0]), cMul(cConj(a[1]), b[1]));
    return 1 - cAbs(ip) <= eps;
  }
  function ketLabel(v) {
    for (var k in KET) if (eqPhase1(v, KET[k])) return KET_LABEL[k];
    return "|ψ⟩";
  }

  /* ---------- Registers (n qubits, 2^n amplitudes) ---------- */
  function zeroReg(n) { var a = new Array(1 << n); for (var i = 0; i < a.length; i++) a[i] = C(0); a[0] = C(1); return a; }
  function norm2(reg) { var s = 0; for (var i = 0; i < reg.length; i++) s += reg[i].re * reg[i].re + reg[i].im * reg[i].im; return s; }
  function popcount(i) { var c = 0; while (i) { c += i & 1; i >>>= 1; } return c; }
  function bitsOf(i, n) { var s = ""; for (var b = n - 1; b >= 0; b--) s += ((i >> b) & 1) ? "1" : "0"; return s; }

  // Bit-flip repetition code: α|000⟩ + β|111⟩
  function encodeRepetition(alpha, beta) { var r = zeroReg(3); r[0] = alpha; r[7] = beta; return r; }
  // Phase-flip repetition code: α|+++⟩ + β|−−−⟩
  function encodePhase(alpha, beta) {
    var r = new Array(8);
    for (var i = 0; i < 8; i++) {
      var s = (popcount(i) % 2 === 0) ? 1 : -1;
      r[i] = cScale(cAdd(alpha, cScale(beta, s)), K8);
    }
    return r;
  }

  // Apply a Pauli (X or Z) to physical qubit q of an n-qubit register.
  function applyPauliReg(reg, q, p, n) {
    n = n || 3;
    var mask = 1 << (n - 1 - q), out = new Array(reg.length), i;
    if (p === "X") { for (i = 0; i < reg.length; i++) out[i ^ mask] = reg[i]; return out; }
    if (p === "Z") { for (i = 0; i < reg.length; i++) out[i] = ((i >> (n - 1 - q)) & 1) ? cScale(reg[i], -1) : reg[i]; return out; }
    return reg.slice();
  }

  /* ---------- Stabilizers (Pauli strings) ---------- */
  // Operator S: S|i⟩ = coef[i]·|perm[i]⟩
  function buildPauliOp(n, terms) {
    var N = 1 << n, perm = new Array(N), coef = new Array(N), xmask = 0, k, t;
    for (k = 0; k < terms.length; k++) { t = terms[k]; if (t.p === "X") xmask |= 1 << (n - 1 - t.q); }
    for (var i = 0; i < N; i++) {
      var c = 1;
      for (k = 0; k < terms.length; k++) { t = terms[k]; if (t.p === "Z") { if ((i >> (n - 1 - t.q)) & 1) c = -c; } }
      perm[i] = i ^ xmask; coef[i] = c;
    }
    return { n: n, perm: perm, coef: coef };
  }
  function applyOp(reg, op) {
    var out = new Array(reg.length);
    for (var i = 0; i < reg.length; i++) out[i] = C(0);
    for (var j = 0; j < reg.length; j++) out[op.perm[j]] = cAdd(out[op.perm[j]], cScale(reg[j], op.coef[j]));
    return out;
  }

  // Projective measurement of a ±1 stabilizer: P± = (I ± S)/2.
  function measureStabilizer(reg, op) {
    var s = applyOp(reg, op), plus = new Array(reg.length), minus = new Array(reg.length), i;
    for (i = 0; i < reg.length; i++) { plus[i] = cScale(cAdd(reg[i], s[i]), 0.5); minus[i] = cScale(cSub(reg[i], s[i]), 0.5); }
    var pp = norm2(plus), pm = norm2(minus);
    var outcome = pp >= pm ? 1 : -1;
    var prob = outcome === 1 ? pp : pm;
    var state = outcome === 1 ? plus : minus;
    if (prob > 1e-12) { var inv = 1 / Math.sqrt(prob); for (i = 0; i < reg.length; i++) state[i] = cScale(state[i], inv); }
    return { outcome: outcome, probability: prob, state: state };
  }

  var STABILIZERS = {
    bit: [[{ p: "Z", q: 0 }, { p: "Z", q: 1 }], [{ p: "Z", q: 1 }, { p: "Z", q: 2 }]],
    phase: [[{ p: "X", q: 0 }, { p: "X", q: 1 }], [{ p: "X", q: 1 }, { p: "X", q: 2 }]],
  };
  var STABILIZER_LABEL = {
    bit: ["Z₁Z₂", "Z₂Z₃"],
    phase: ["X₁X₂", "X₂X₃"],
  };

  // Measure both stabilizers in sequence, returning outcomes and post state.
  function measureSyndrome(reg, code, n) {
    n = n || 3;
    var ops = STABILIZERS[code], state = reg, outcomes = [];
    for (var i = 0; i < ops.length; i++) {
      var m = measureStabilizer(state, buildPauliOp(n, ops[i]));
      outcomes.push(m.outcome);
      state = m.state;
    }
    return { outcomes: outcomes, bits: outcomes.map(function (o) { return o === -1 ? 1 : 0; }), state: state };
  }

  function correct(reg, code, q) { return applyPauliReg(reg, q, code === "phase" ? "Z" : "X"); }

  // Single source of truth: which physical qubit (0,1,2) or -1 (none) an
  // X-error syndrome points to, under the single-X assumption.
  function qubitFromSyndrome(bits) {
    var key = bits[0] + "" + bits[1];
    return key === "10" ? 0 : key === "11" ? 1 : key === "01" ? 2 : -1;
  }

  function regEqPhase(a, b, eps) {
    eps = eps == null ? 1e-6 : eps;
    var idx = -1, i;
    for (i = 0; i < a.length; i++) if (cAbs(a[i]) > 1e-9) { idx = i; break; }
    if (idx < 0) return false;
    var lam = cDiv(b[idx], a[idx]);
    for (i = 0; i < a.length; i++) if (cAbs(cSub(b[i], cMul(lam, a[i]))) > eps) return false;
    return true;
  }

  // Logical amplitudes (α, β) recovered from a code state (bit or phase code).
  function logicalAmplitudes(reg, code) {
    if (code === "phase") {
      // α|+++⟩+β|−−−⟩ = K8 Σ (α + β·(−1)^pc)|i⟩  → even/odd partial sums of real parts.
      var even = 0, odd = 0;
      for (var i = 0; i < 8; i++) { if (popcount(i) % 2 === 0) even += reg[i].re; else odd += reg[i].re; }
      return { alpha: (even + odd) / (8 * K8), beta: (even - odd) / (8 * K8) };
    }
    return { alpha: reg[0], beta: reg[7] };
  }

  var Q = {
    C: C, cAdd: cAdd, cSub: cSub, cMul: cMul, cScale: cScale, cConj: cConj, cAbs: cAbs, cDiv: cDiv,
    SQ: SQ, K8: K8, KET: KET, KET_LABEL: KET_LABEL,
    applyX1: applyX1, applyZ1: applyZ1, applyPauli1: applyPauli1, blochVector: blochVector, eqPhase1: eqPhase1, ketLabel: ketLabel,
    zeroReg: zeroReg, norm2: norm2, popcount: popcount, bitsOf: bitsOf,
    encodeRepetition: encodeRepetition, encodePhase: encodePhase, applyPauliReg: applyPauliReg,
    buildPauliOp: buildPauliOp, applyOp: applyOp, measureStabilizer: measureStabilizer,
    STABILIZERS: STABILIZERS, STABILIZER_LABEL: STABILIZER_LABEL, measureSyndrome: measureSyndrome,
    correct: correct, regEqPhase: regEqPhase, logicalAmplitudes: logicalAmplitudes,
    qubitFromSyndrome: qubitFromSyndrome,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Q;
  global.Q = Q;
})(typeof window !== "undefined" ? window : globalThis);
