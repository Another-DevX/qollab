/*!
 * Qollab · Module 2 — Shor code (9-qubit) mathematics.
 * Pure, DOM-free. Loadable as a classic script (window.Shor) or in Node.
 * Reuses the generic complex/register/stabilizer helpers from quantum.js (Q):
 *   Q.C, Q.cAdd, Q.cMul, Q.cScale, Q.cSub, Q.buildPauliOp, Q.measureStabilizer,
 *   Q.regEqPhase, Q.norm2, Q.bitsOf, Q.SQ
 *
 * Qubit indexing: 0..8 correspond to physical qubits q1..q9 (q1 is the MSB).
 * Blocks: A = q1,q2,q3 (0,1,2); B = q4,q5,q6 (3,4,5); C = q7,q8,q9 (6,7,8).
 */
(function (global) {
  "use strict";

  function createShor(Q) {
    var N = 9;
    var SIZE = 1 << N; // 512 complex amplitudes

    function ab(preset) {
      return {
        a: preset === "0" ? Q.C(1) : preset === "+" ? Q.C(Q.SQ) : Q.C(0),
        b: preset === "1" ? Q.C(1) : preset === "+" ? Q.C(Q.SQ) : Q.C(0),
      };
    }

    // α|0…0⟩ + β|1 0…0⟩  (input on q1, ancillas |0⟩)
    function inputReg(preset) {
      var s = ab(preset), reg = new Array(SIZE), i;
      for (i = 0; i < SIZE; i++) reg[i] = Q.C(0);
      reg[0] = s.a;               // q1 = 0
      reg[1 << (N - 1)] = s.b;    // q1 = 1
      return reg;
    }

    // Single-qubit gates on the 9-qubit register.
    function applyGate(reg, g) {
      var i, out = new Array(SIZE);
      if (g.type === "CNOT") {
        var ca = 1 << (N - 1 - g.a), tb = 1 << (N - 1 - g.b);
        for (i = 0; i < SIZE; i++) out[i] = reg[(i & ca) ? (i ^ tb) : i];
        return out;
      }
      if (g.type === "H") {
        var q = 1 << (N - 1 - g.q), inv = 1 / Math.SQRT2;
        for (i = 0; i < SIZE; i++) {
          if (i & q) out[i] = Q.cScale(Q.cSub(reg[i ^ q], reg[i]), inv);
          else out[i] = Q.cScale(Q.cAdd(reg[i], reg[i ^ q]), inv);
        }
        return out;
      }
      return reg.slice();
    }

    // Exact single-qubit Pauli on a 9-qubit register (X, Z, Y = iXZ, and I).
    function applyPauliN(reg, q, pauli) {
      if (pauli === "I") return reg.slice();
      var mask = 1 << (N - 1 - q), out = new Array(SIZE), i;
      for (i = 0; i < SIZE; i++) out[i] = Q.C(0);
      for (i = 0; i < SIZE; i++) {
        var bit = (i >> (N - 1 - q)) & 1, idx, factor;
        if (pauli === "X") { idx = i ^ mask; factor = Q.C(1); }
        else if (pauli === "Z") { idx = i; factor = Q.C(bit ? -1 : 1); }
        else { idx = i ^ mask; factor = Q.C(0, bit ? -1 : 1); } // Y
        out[idx] = Q.cAdd(out[idx], Q.cMul(reg[i], factor));
      }
      return out;
    }

    // Shor encoding circuit (gate order matters).
    var STAGE1 = [
      { type: "CNOT", a: 0, b: 3 }, { type: "CNOT", a: 0, b: 6 },
      { type: "H", q: 0 }, { type: "H", q: 3 }, { type: "H", q: 6 },
    ];
    var STAGE2 = [
      { type: "CNOT", a: 0, b: 1 }, { type: "CNOT", a: 0, b: 2 },
      { type: "CNOT", a: 3, b: 4 }, { type: "CNOT", a: 3, b: 5 },
      { type: "CNOT", a: 6, b: 7 }, { type: "CNOT", a: 6, b: 8 },
    ];

    // stage: 0 = raw input, 1 = after phase encoding, 2 = fully encoded (Shor).
    function stateAtStage(preset, stage) {
      var reg = inputReg(preset), i;
      if (stage >= 1) for (i = 0; i < STAGE1.length; i++) reg = applyGate(reg, STAGE1[i]);
      if (stage >= 2) for (i = 0; i < STAGE2.length; i++) reg = applyGate(reg, STAGE2[i]);
      return reg;
    }
    function encode(preset) { return stateAtStage(preset, 2); }

    // ---- Stabilizers (8) ----
    var Z = function (q) { return { p: "Z", q: q }; };
    var X = function (q) { return { p: "X", q: q }; };
    var STABILIZERS = [
      { id: "S1", type: "Z", terms: [Z(0), Z(1)] },
      { id: "S2", type: "Z", terms: [Z(1), Z(2)] },
      { id: "S3", type: "Z", terms: [Z(3), Z(4)] },
      { id: "S4", type: "Z", terms: [Z(4), Z(5)] },
      { id: "S5", type: "Z", terms: [Z(6), Z(7)] },
      { id: "S6", type: "Z", terms: [Z(7), Z(8)] },
      { id: "S7", type: "X", terms: [X(0), X(1), X(2), X(3), X(4), X(5)] },
      { id: "S8", type: "X", terms: [X(3), X(4), X(5), X(6), X(7), X(8)] },
    ];
    var STABILIZER_LABEL = {
      S1: "Z₁Z₂", S2: "Z₂Z₃", S3: "Z₄Z₅", S4: "Z₅Z₆", S5: "Z₇Z₈", S6: "Z₈Z₉",
      S7: "X₁X₂X₃X₄X₅X₆", S8: "X₄X₅X₆X₇X₈X₉",
    };

    function measureSyndrome(reg) {
      var state = reg, outcomes = [], bits = [];
      for (var i = 0; i < STABILIZERS.length; i++) {
        var op = Q.buildPauliOp(N, STABILIZERS[i].terms);
        var m = Q.measureStabilizer(state, op);
        outcomes.push(m.outcome);
        bits.push(m.outcome === -1 ? 1 : 0);
        state = m.state;
      }
      return { outcomes: outcomes, bits: bits, state: state };
    }

    // Expected syndrome bits for a single Pauli error from commutation algebra.
    function pauliAnticommutes(pauli, q, terms) {
      for (var i = 0; i < terms.length; i++) {
        if (terms[i].q === q && terms[i].p !== pauli) return true;
      }
      return false;
    }
    function syndromeOfPauli(error) {
      var bits = [];
      for (var i = 0; i < STABILIZERS.length; i++) {
        bits.push(error && pauliAnticommutes(error.pauli, error.q, STABILIZERS[i].terms) ? 1 : 0);
      }
      return bits;
    }

    // ---- Decoder (single-qubit Pauli) ----
    // From the six ZZ checks, locate the X-component exactly within a block.
    function localIndex(a, b) { return a === 1 && b === 0 ? 0 : a === 1 && b === 1 ? 1 : a === 0 && b === 1 ? 2 : -1; }
    function decode(bits) {
      var qx = -1, b;
      for (b = 0; b < 3; b++) {
        var li = localIndex(bits[b * 2], bits[b * 2 + 1]);
        if (li >= 0) qx = b * 3 + li;
      }
      var s7 = bits[6], s8 = bits[7];
      var qz = (s7 === 1 && s8 === 0) ? 0 : (s7 === 1 && s8 === 1) ? 3 : (s7 === 0 && s8 === 1) ? 6 : -1;
      if (qx >= 0 && qz >= 0) return [{ q: qx, pauli: "Y" }];
      if (qx >= 0) return [{ q: qx, pauli: "X" }];
      if (qz >= 0) return [{ q: qz, pauli: "Z" }];
      return [];
    }

    function applyCorrection(reg, corrections) {
      var r = reg;
      for (var i = 0; i < corrections.length; i++) r = applyPauliN(r, corrections[i].q, corrections[i].pauli);
      return r;
    }
    function recovered(a, b) { return Q.regEqPhase(a, b); }

    // Human-readable correction label, e.g. "X on q1" / "Z on q4" / "Y on q2" / "none".
    function correctionLabel(corrections) {
      if (!corrections.length) return "I (no correction)";
      return corrections.map(function (c) { return c.pauli + " on q" + (c.q + 1); }).join(" then ");
    }

    // Logical form (symbolic HTML) for the current encoded input.
    function logicalLabel(preset) {
      if (preset === "0") return "|0<sub>L</sub>⟩";
      if (preset === "1") return "|1<sub>L</sub>⟩";
      return "|+<sub>L</sub>⟩";
    }

    // ---- GHZ preparation (3 qubits) ----
    function applyH3(reg, q) {
      var n = 3, mask = 1 << (n - 1 - q), out = new Array(reg.length);
      for (var i = 0; i < reg.length; i++) {
        if (i & mask) out[i] = Q.cScale(Q.cSub(reg[i ^ mask], reg[i]), 1 / Math.SQRT2);
        else out[i] = Q.cScale(Q.cAdd(reg[i], reg[i ^ mask]), 1 / Math.SQRT2);
      }
      return out;
    }
    function applyCNOT3(reg, c, t) {
      var n = 3, cm = 1 << (n - 1 - c), tm = 1 << (n - 1 - t), out = new Array(reg.length);
      for (var i = 0; i < reg.length; i++) out[i] = reg[(i & cm) ? (i ^ tm) : i];
      return out;
    }
    function applyZ3(reg, q) {
      var n = 3, out = new Array(reg.length);
      for (var i = 0; i < reg.length; i++) out[i] = ((i >> (n - 1 - q)) & 1) ? Q.cScale(reg[i], -1) : reg[i];
      return out;
    }
    // step 0 = |000⟩; 1 = H(q1); 2 = CNOT(q1,q2); 3 = CNOT(q1,q3) → |G±⟩
    function ghzReg(step, minus) {
      var reg = Q.zeroReg(3);
      if (step >= 1) reg = applyH3(reg, 0);
      if (step >= 2) reg = applyCNOT3(reg, 0, 1);
      if (step >= 3) reg = applyCNOT3(reg, 0, 2);
      if (minus) reg = applyZ3(reg, 0);
      return reg;
    }

    return {
      N: N, SIZE: SIZE,
      ab: ab, inputReg: inputReg, applyGate: applyGate, applyPauliN: applyPauliN,
      STAGE1: STAGE1, STAGE2: STAGE2, stateAtStage: stateAtStage, encode: encode,
      STABILIZERS: STABILIZERS, STABILIZER_LABEL: STABILIZER_LABEL,
      measureSyndrome: measureSyndrome, syndromeOfPauli: syndromeOfPauli,
      decode: decode, applyCorrection: applyCorrection, recovered: recovered,
      correctionLabel: correctionLabel, logicalLabel: logicalLabel,
      ghzReg: ghzReg,
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = createShor;
  else global.createShor = createShor;
})(typeof window !== "undefined" ? window : globalThis);
