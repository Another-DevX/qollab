/*!
 * Automated tests for Module 2 quantum logic.  Run with:  node tests.cjs
 * Covers the bit-flip and phase-flip repetition codes, syndromes and correction.
 */
"use strict";
var assert = require("assert");
var Q = require("./quantum.js");
var Quiz = require("./quiz.js");

var pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name); }
}
function close(a, b, eps) { return Math.abs(a - b) <= (eps == null ? 1e-9 : eps); }
function approxReg(reg, expected, eps) {
  for (var i = 0; i < expected.length; i++) if (Math.abs(reg[i].re - expected[i]) > (eps || 1e-9) || Math.abs(reg[i].im) > (eps || 1e-9)) return false;
  return true;
}
function syndromeOf(reg, code) { return Q.measureSyndrome(reg, code).bits.join(""); }
function withError(preset, code, qubit, pauli) {
  var a = preset === "0" ? Q.C(1) : preset === "+" ? Q.C(Q.SQ) : Q.C(0);
  var b = preset === "1" ? Q.C(1) : preset === "+" ? Q.C(Q.SQ) : Q.C(0);
  var reg = code === "phase" ? Q.encodePhase(a, b) : Q.encodeRepetition(a, b);
  return pauli ? Q.applyPauliReg(reg, qubit, pauli) : reg;
}

console.log("Bit-flip repetition code");
ok("encoded |0⟩ is |000⟩", approxReg(withError("0", "bit"), [1, 0, 0, 0, 0, 0, 0, 0]));
ok("encoded |1⟩ is |111⟩", approxReg(withError("1", "bit"), [0, 0, 0, 0, 0, 0, 0, 1]));
ok("encoded |+⟩ is (|000⟩+|111⟩)/√2", approxReg(withError("+", "bit"), [Q.SQ, 0, 0, 0, 0, 0, 0, Q.SQ]));
ok("no error → syndrome 00", syndromeOf(withError("0", "bit"), "bit") === "00");
ok("X₁ → syndrome 10", syndromeOf(withError("0", "bit", 0, "X"), "bit") === "10");
ok("X₂ → syndrome 11", syndromeOf(withError("0", "bit", 1, "X"), "bit") === "11");
ok("X₃ → syndrome 01", syndromeOf(withError("0", "bit", 2, "X"), "bit") === "01");
ok("X₂ on |+⟩ → syndrome 11", syndromeOf(withError("+", "bit", 1, "X"), "bit") === "11");
ok("correct X₂ restores |+_L⟩", Q.regEqPhase(Q.correct(withError("+", "bit", 1, "X"), "bit", 1), withError("+", "bit")));

console.log("Phase errors vs the bit-flip code");
ok("Z on |+_L⟩ → syndrome 00", syndromeOf(withError("+", "bit", 0, "Z"), "bit") === "00");
ok("Z flips the logical relative phase", (function () {
  var s = withError("+", "bit", 0, "Z");
  return close(s[0].re, Q.SQ) && close(s[7].re, -Q.SQ);
})());

console.log("Phase-flip repetition code");
ok("encoded |0⟩_phase is |+++⟩", (function () {
  var r = withError("0", "phase");
  return close(r[0].re, Q.K8) && close(r[7].re, Q.K8) && Q.norm2(r) > 0.999;
})());
ok("no error → syndrome 00", syndromeOf(withError("0", "phase"), "phase") === "00");
ok("Z₁ → syndrome 10", syndromeOf(withError("0", "phase", 0, "Z"), "phase") === "10");
ok("Z₂ → syndrome 11", syndromeOf(withError("0", "phase", 1, "Z"), "phase") === "11");
ok("Z₃ → syndrome 01", syndromeOf(withError("0", "phase", 2, "Z"), "phase") === "01");
ok("X on phase code → syndrome 00", syndromeOf(withError("0", "phase", 0, "X"), "phase") === "00");
ok("correct Z₂ restores |0_L⟩", Q.regEqPhase(Q.correct(withError("0", "phase", 1, "Z"), "phase", 1), withError("0", "phase")));

console.log("General checks");
ok("states stay normalized", (function () {
  var cases = [withError("+", "bit", 2, "X"), withError("+", "bit", 0, "Z"), withError("+", "phase", 1, "Z"), withError("1", "phase", 0, "X")];
  return cases.every(function (r) { return close(Q.norm2(r), 1, 1e-9); });
})());
ok("syndrome measurement preserves the post-error state", (function () {
  var reg = withError("+", "bit", 1, "X");
  var m = Q.measureSyndrome(reg, "bit");
  return m.bits.join("") === "11" && Q.regEqPhase(m.state, reg);
})());
ok("stabilizers leave the ideal code state intact", (function () {
  var reg = withError("+", "bit");
  var m = Q.measureSyndrome(reg, "bit");
  return m.bits.join("") === "00" && Q.regEqPhase(m.state, reg);
})());
ok("phase-code logical amplitudes recover (α,β)", (function () {
  var a = Q.logicalAmplitudes(withError("+", "phase"), "phase");
  return close(a.alpha, Q.SQ, 1e-9) && close(a.beta, Q.SQ, 1e-9);
})());
ok("Z errors and X errors are detected by the opposite codes", (function () {
  return syndromeOf(withError("0", "bit", 0, "X"), "bit") !== "00" &&
    syndromeOf(withError("0", "bit", 0, "Z"), "bit") === "00" &&
    syndromeOf(withError("0", "phase", 0, "Z"), "phase") !== "00" &&
    syndromeOf(withError("0", "phase", 0, "X"), "phase") === "00";
})());

console.log("Syndrome → qubit mapping (single source of truth)");
ok("00 → none", Q.qubitFromSyndrome([0, 0]) === -1);
ok("10 → q1", Q.qubitFromSyndrome([1, 0]) === 0);
ok("11 → q2", Q.qubitFromSyndrome([1, 1]) === 1);
ok("01 → q3", Q.qubitFromSyndrome([0, 1]) === 2);

console.log("Syndrome Detective flow");
var createDetective = require("./detective.js");
var EXPECT = { "-1": [1, 1], "0": [-1, 1], "1": [-1, -1], "2": [1, -1] };
var BITS = { "-1": "00", "0": "10", "1": "11", "2": "01" };
[["no error", -1], ["X₁", 0], ["X₂", 1], ["X₃", 2]].forEach(function (pair) {
  var name = pair[0], hidden = pair[1];
  var det = createDetective(Q);
  ok(name + ": Next Round gated before correction", det.canNextRound() === false);
  det.inject(hidden);
  det.measure();
  var s = det.state();
  ok(name + ": eigenvalues " + JSON.stringify(s.outcomes), s.outcomes[0] === EXPECT[hidden][0] && s.outcomes[1] === EXPECT[hidden][1]);
  ok(name + ": binary syndrome " + s.bits.join(""), s.bits.join("") === BITS[hidden]);
  ok(name + ": expected diagnosis q" + (det.expectedQubit() + 1), det.expectedQubit() === hidden);
  det.diagnose(det.expectedQubit());
  det.confirmDiagnosis();
  ok(name + ": Next Round still gated before correction", det.canNextRound() === false);
  det.applyCorrection();
  ok(name + ": logical state recovered", det.state().recovered === true);
  ok(name + ": scored once", det.state().solved === 1);
  det.applyCorrection();
  ok(name + ": retry does not double-count", det.state().solved === 1);
  ok(name + ": Next Round enabled after correction", det.canNextRound() === true);
  det.nextRound();
  ok(name + ": next round advances & re-hides", det.state().round === 2 && det.state().hidden === null && det.canNextRound() === false);
});
ok("wrong diagnosis but correct correction recovers & scores", (function () {
  var d = createDetective(Q); d.inject(1); d.measure(); d.diagnose(0); d.confirmDiagnosis(); d.setCorrection(1); d.applyCorrection();
  return d.state().recovered === true && d.state().solved === 1;
})());
ok("correct diagnosis but wrong correction → no recovery, no score", (function () {
  var d = createDetective(Q); d.inject(1); d.measure(); d.diagnose(1); d.confirmDiagnosis(); d.setCorrection(0); d.applyCorrection();
  return d.state().recovered === false && d.state().solved === 0;
})());
ok("hidden-error generation unchanged (domain)", (function () {
  var d = createDetective(Q);
  for (var i = 0; i < 60; i++) { d.inject(); if ([-1, 0, 1, 2].indexOf(d.state().hidden) < 0) return false; }
  return true;
})());

console.log("Superposition states");
ok("encoded (0.6|000⟩+0.8|111⟩): X₂ → 11 and correction recovers", (function () {
  var base = Q.encodeRepetition(Q.C(0.6), Q.C(0.8)), err = Q.applyPauliReg(base, 1, "X");
  if (Q.measureSyndrome(err, "bit").bits.join("") !== "11") return false;
  return Q.regEqPhase(Q.correct(err, "bit", 1), base);
})());
ok("encoded superposition: no error → 00", (function () {
  return Q.measureSyndrome(Q.encodeRepetition(Q.C(0.6), Q.C(0.8)), "bit").bits.join("") === "00";
})());

console.log("Shor code (9 qubits)");
var createShor = require("./shor.js");
var Shor = createShor(Q);
var E0 = Shor.encode("0"), E1 = Shor.encode("1"), EP = Shor.encode("+");
function inner(a, b) { var s = Q.C(0); for (var i = 0; i < a.length; i++) s = Q.cAdd(s, Q.cMul(Q.cConj(a[i]), b[i])); return s; }
function closeC(c, v, eps) { return Math.abs(c.re - v) <= (eps || 1e-9) && Math.abs(c.im) <= (eps || 1e-9); }
function bitsOfPauli(q, p) { return Shor.syndromeOfPauli({ q: q, pauli: p }).join(""); }
function measuredBits(q, p) { return Shor.measureSyndrome(Shor.applyPauliN(Shor.encode("0"), q, p)).bits.join(""); }

ok("input |0⟩ → |0_L⟩ = |G₊⟩^⊗3 (all stabilizers +1)", Shor.measureSyndrome(E0).bits.join("") === "00000000" && closeC(E0[0], 1 / Math.sqrt(8)) && closeC(E0[511], 1 / Math.sqrt(8)));
ok("input |1⟩ → |1_L⟩ = |G₋⟩^⊗3 (sign flipped at |111…⟩)", closeC(E1[0], 1 / Math.sqrt(8)) && closeC(E1[511], -1 / Math.sqrt(8)) && Shor.measureSyndrome(E1).bits.join("") === "00000000");
ok("input |+⟩ → (|0_L⟩+|1_L⟩)/√2", closeC(EP[0], 0.5) && closeC(EP[511], 0));
ok("encoded states normalized", Math.abs(Q.norm2(E0) - 1) < 1e-9 && Math.abs(Q.norm2(E1) - 1) < 1e-9 && Math.abs(Q.norm2(EP) - 1) < 1e-9);
ok("|0_L⟩ ⟂ |1_L⟩", Math.abs(inner(E0, E1).re) < 1e-9 && Math.abs(inner(E0, E1).im) < 1e-9);
ok("encoding is linear in α, β", (function () { var sum = E0.map(function (a, i) { return Q.cScale(Q.cAdd(a, E1[i]), Q.SQ); }); return Q.regEqPhase(sum, EP); })());

ok("X₁ → 10000000", bitsOfPauli(0, "X") === "10000000" && measuredBits(0, "X") === "10000000");
ok("X₂ → 11000000", bitsOfPauli(1, "X") === "11000000" && measuredBits(1, "X") === "11000000");
ok("X₃ → 01000000", bitsOfPauli(2, "X") === "01000000" && measuredBits(2, "X") === "01000000");
ok("Z in the same block shares the syndrome (Z₁,Z₂,Z₃ → 00000010)", ["00000010", "00000010", "00000010"].join() === [bitsOfPauli(0, "Z"), bitsOfPauli(1, "Z"), bitsOfPauli(2, "Z")].join());
ok("Y activates both X-type and Z-type checks (Y₁ → 10000010)", bitsOfPauli(0, "Y") === "10000010" && measuredBits(0, "Y") === "10000010");
ok("every single-qubit X, Y, Z gives the commutation-predicted syndrome", (function () {
  var paulis = ["X", "Y", "Z"];
  for (var q = 0; q < 9; q++) for (var k = 0; k < 3; k++) if (bitsOfPauli(q, paulis[k]) !== measuredBits(q, paulis[k])) return false;
  return true;
})());

ok("every single-qubit X, Y, Z is correctable (logical recovery)", (function () {
  var paulis = ["X", "Y", "Z"];
  for (var q = 0; q < 9; q++) for (var k = 0; k < 3; k++) {
    var withErr = Shor.applyPauliN(E0, q, paulis[k]);
    var bits = Shor.measureSyndrome(withErr).bits;
    var fixed = Shor.applyCorrection(withErr, Shor.decode(bits));
    if (!Shor.recovered(fixed, E0)) return false;
  }
  return true;
})());
ok("Z-error representative correction works (Z₂ corrected with Z₁)", (function () {
  var withErr = Shor.applyPauliN(E0, 1, "Z");
  var bits = Shor.measureSyndrome(withErr).bits;
  var corr = Shor.decode(bits);
  // decoder picks a block representative, not necessarily q2
  return Shor.recovered(Shor.applyCorrection(withErr, corr), E0);
})());
ok("decoder does not assume the exact Z location", (function () {
  var c1 = Shor.decode(Shor.measureSyndrome(Shor.applyPauliN(E0, 0, "Z")).bits);
  var c2 = Shor.decode(Shor.measureSyndrome(Shor.applyPauliN(E0, 1, "Z")).bits);
  return c1.length === 1 && c2.length === 1 && c1[0].q === c2[0].q && c1[0].pauli === "Z";
})());
ok("global phase never causes a false recovery failure", (function () {
  var withErr = Shor.applyPauliN(E0, 3, "Y");
  var fixed = Shor.applyCorrection(withErr, Shor.decode(Shor.measureSyndrome(withErr).bits));
  return Shor.recovered(fixed, Q.cScale(E0[0], -1) === E0[0] ? E0 : E0.map(function (a) { return Q.cScale(a, -1); }));
})());

console.log("GHZ prerequisites (3 qubits)");
var G = [0, 1, 2, 3].map(function (s) { return Shor.ghzReg(s, false); });
ok("GHZ step 0 = |000⟩", approxReg(G[0], [1, 0, 0, 0, 0, 0, 0, 0]));
ok("GHZ step 1 = (|000⟩+|100⟩)/√2 (H on q1)", approxReg(G[1], [Q.SQ, 0, 0, 0, Q.SQ, 0, 0, 0]));
ok("GHZ step 2 = (|000⟩+|110⟩)/√2 (CNOT q1→q2)", approxReg(G[2], [Q.SQ, 0, 0, 0, 0, 0, Q.SQ, 0]));
ok("GHZ step 3 = (|000⟩+|111⟩)/√2 = |G+⟩ (CNOT q1→q3)", approxReg(G[3], [Q.SQ, 0, 0, 0, 0, 0, 0, Q.SQ]));
ok("GHZ states normalized at every step", G.every(function (r) { return Math.abs(Q.norm2(r) - 1) < 1e-9; }));
var Gm = Shor.ghzReg(3, true);
ok("G− = (|000⟩−|111⟩)/√2", approxReg(Gm, [Q.SQ, 0, 0, 0, 0, 0, 0, -Q.SQ]));
ok("GHZ is entangled (not a product state: exactly two nonzero terms)", (function () { var c = 0; for (var i = 0; i < 8; i++) if (Math.abs(G[3][i].re) > 1e-9) c++; return c === 2; })());
ok("G+ and G− differ by a relative phase, not a global one", (function () { var ip = 0; for (var i = 0; i < 8; i++) ip += G[3][i].re * Gm[i].re; return Math.abs(ip) < 1e-9; })());
ok("Z on one qubit maps G+ to G−", Q.regEqPhase(Q.applyPauliReg(G[3], 0, "Z", 3), Gm) && approxReg(Q.applyPauliReg(G[3], 0, "Z", 3), Gm));
ok("|G+⟩^⊗3 equals the Shor |0_L⟩ (tensor-product convention)", (function () {
  var g = G[3], out = new Array(512);
  for (var i = 0; i < 512; i++) out[i] = Q.C(0);
  for (var a = 0; a < 8; a++) for (var b = 0; b < 8; b++) for (var c = 0; c < 8; c++) {
    var idx = (a << 6) | (b << 3) | c;
    out[idx] = Q.cMul(Q.cMul(g[a], g[b]), g[c]);
  }
  return Q.regEqPhase(out, E0);
})());

console.log("Breaking the Code (Page 6)");
var createNoise = require("./noise.js");
var Noise = createNoise(Q, Shor);
var SCODE = Noise.CODES.shor;
function L(pat) { return Noise.lettersFromPattern(pat, 9); }
ok("every weight-one Pauli error is corrected (code-wide)", (function () {
  var paulis = ["X", "Y", "Z"];
  for (var q = 0; q < 9; q++) for (var k = 0; k < 3; k++) if (!Noise.classify(SCODE, L([{ q: q, pauli: paulis[k] }]), true).stabilizer) return false;
  return true;
})());
ok("weight composes same-qubit Paulis (X then Z on q1 = Y, weight 1)", (function () {
  var l = Noise.identity(9); l[0] = Noise.mulLetters(l[0], "X"); l[0] = Noise.mulLetters(l[0], "Z");
  return l[0] === "Y" && Noise.weight(l) === 1;
})());
ok("Z1Z4Z7 has zero syndrome and acts as logical X", (function () { var c = Noise.classify(SCODE, L([{ q: 0, pauli: "Z" }, { q: 3, pauli: "Z" }, { q: 6, pauli: "Z" }]), false); return c.bits.every(function (b) { return b === 0; }) && !c.stabilizer && c.logical === "X"; })());
ok("X1X2X3 has zero syndrome and acts as logical Z", (function () { var c = Noise.classify(SCODE, L([{ q: 0, pauli: "X" }, { q: 1, pauli: "X" }, { q: 2, pauli: "X" }]), false); return c.bits.every(function (b) { return b === 0; }) && !c.stabilizer && c.logical === "Z"; })());
ok("stabilizer operators are not logical operators (Z1Z2 → I)", (function () { var c = Noise.classify(SCODE, L([{ q: 0, pauli: "Z" }, { q: 1, pauli: "Z" }]), true); return c.stabilizer && c.logical === "I"; })());
ok("weight-two: Z1Z2 is stabilizer-equivalent, X1X2 is a logical failure", (function () {
  var zz = Noise.classify(SCODE, L([{ q: 0, pauli: "Z" }, { q: 1, pauli: "Z" }]), true);
  var xx = Noise.classify(SCODE, L([{ q: 0, pauli: "X" }, { q: 1, pauli: "X" }]), true);
  return zz.stabilizer === true && xx.stabilizer === false;
})());
ok("some weight-two patterns fail under the standard decoder", (function () {
  var fail = 0;
  for (var i = 0; i < 9; i++) for (var j = i + 1; j < 9; j++) { var l = Noise.identity(9); l[i] = "X"; l[j] = "X"; if (!Noise.classify(SCODE, l, true).stabilizer) fail++; }
  return fail > 0;
})());
ok("classification is independent of the selected logical input", (function () {
  return Noise.classify(SCODE, L([{ q: 0, pauli: "Z" }, { q: 3, pauli: "Z" }, { q: 6, pauli: "Z" }]), true).logical === "X";
})());

console.log("Noise Laboratory (Page 7)");
ok("p = 0 → zero failures for all systems", (function () {
  return ["x", "z", "depol"].every(function (m) { return Noise.exactPL(Noise.CODES.single, m, 0, false) === 0 && Noise.exactPL(Noise.CODES.rep3, m, 0, true) === 0 && Noise.exactPL(Noise.CODES.shor, m, 0, true) === 0; });
})());
ok("single qubit: Pauli failure = p under X, Z, depolarizing", (function () {
  return ["x", "z", "depol"].every(function (m) { return Math.abs(Noise.exactPL(Noise.CODES.single, m, 0.13, false) - 0.13) < 1e-9; });
})());
ok("3-qubit repetition under X noise reproduces 3p²(1−p)+p³", (function () {
  for (var p = 0.05; p <= 0.5 + 1e-9; p += 0.05) if (Math.abs(Noise.exactPL(Noise.CODES.rep3, "x", p, true) - (3 * p * p * (1 - p) + p * p * p)) > 1e-9) return false;
  return true;
})());
ok("disabling correction is well-defined (rep3 X: 1−(1−p)³)", Math.abs(Noise.exactPL(Noise.CODES.rep3, "x", 0.1, false) - (1 - Math.pow(0.9, 3))) < 1e-9);
ok("all exact probabilities lie in [0,1]", (function () {
  var codes = [Noise.CODES.single, Noise.CODES.rep3, Noise.CODES.shor], models = ["x", "z", "depol"];
  for (var ci = 0; ci < codes.length; ci++) for (var mi = 0; mi < models.length; mi++) for (var p = 0; p <= 0.5 + 1e-9; p += 0.1) { var v = Noise.exactPL(codes[ci], models[mi], p, true); if (v < -1e-12 || v > 1 + 1e-12) return false; }
  return true;
})());
ok("changing the noise model changes the results", (function () {
  var x = Noise.exactPL(Noise.CODES.shor, "x", 0.1, true), z = Noise.exactPL(Noise.CODES.shor, "z", 0.1, true), d = Noise.exactPL(Noise.CODES.shor, "depol", 0.1, true);
  return Math.abs(x - z) > 1e-6 || Math.abs(x - d) > 1e-6;
})());
ok("Monte Carlo converges toward the exact value", (function () {
  var rng = (function (s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })(7);
  var exact = Noise.exactPL(Noise.CODES.rep3, "x", 0.2, true);
  return Math.abs(Noise.monteCarlo(Noise.CODES.rep3, "x", 0.2, true, 20000, rng) - exact) < 0.02;
})());
ok("physical qubits are sampled independently (2-qubit X ≈ 3p²)", (function () {
  var rng = (function (s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })(3);
  var N = 40000, c = 0;
  for (var t = 0; t < N; t++) { var l = Noise.samplePattern(2, "x", 0.1, rng); if (l[0] === "X" && l[1] === "X") c++; }
  return Math.abs(c / N - 0.01) < 0.005;
})());

console.log("\nFinal knowledge check (quiz.js)");
ok("exactly 10 questions are defined", Quiz.total() === 10 && Quiz.QUESTIONS.length === 10);
ok("every question has 3–4 options and a valid correct index", Quiz.QUESTIONS.every(function (q) {
  return q.options.length >= 3 && q.options.length <= 4 && q.correct >= 0 && q.correct < q.options.length;
}));
ok("every question carries an explanation and a lesson link", Quiz.QUESTIONS.every(function (q) {
  return typeof q.explanation === "string" && q.explanation.length > 0 && typeof q.href === "string" && typeof q.lesson === "string";
}));
ok("correct answer earns exactly one point", (function () {
  var s = Quiz.createState();
  s = Quiz.select(s, Quiz.QUESTIONS[0].correct); s = Quiz.confirm(s);
  return Quiz.score(s) === 1;
})());
ok("incorrect answer earns zero points", (function () {
  var s = Quiz.createState();
  var wrong = (Quiz.QUESTIONS[0].correct + 1) % Quiz.QUESTIONS[0].options.length;
  s = Quiz.select(s, wrong); s = Quiz.confirm(s);
  return Quiz.score(s) === 0;
})());
ok("a question cannot be scored twice", (function () {
  var s = Quiz.createState();
  s = Quiz.select(s, Quiz.QUESTIONS[0].correct); s = Quiz.confirm(s);
  s = Quiz.confirm(s); s = Quiz.select(s, Quiz.QUESTIONS[0].correct); s = Quiz.confirm(s);
  return Quiz.score(s) === 1 && s.answers.length === 1;
})());
ok("selection is locked after confirmation", (function () {
  var s = Quiz.createState();
  s = Quiz.select(s, Quiz.QUESTIONS[0].correct); s = Quiz.confirm(s);
  var locked = Quiz.select(s, 0);
  return locked.selected === s.selected;
})());
ok("next advances and clears the selection", (function () {
  var s = Quiz.createState();
  s = Quiz.select(s, 0); s = Quiz.confirm(s); s = Quiz.next(s);
  return s.index === 1 && s.selected === null && s.confirmed === false;
})());
ok("next before confirmation does nothing", (function () {
  var s = Quiz.createState();
  var s2 = Quiz.next(s);
  return s2.index === 0 && s2.confirmed === false;
})());
ok("completing all questions sets done and totals 10", (function () {
  var s = Quiz.createState();
  for (var i = 0; i < Quiz.total(); i++) {
    s = Quiz.select(s, Quiz.QUESTIONS[i].correct); s = Quiz.confirm(s); s = Quiz.next(s);
  }
  return s.done === true && Quiz.score(s) === 10 && s.answers.length === 10;
})());
ok("percentage is score/10 × 100", (function () {
  var s = Quiz.createState();
  for (var i = 0; i < Quiz.total(); i++) {
    var pick = i < 7 ? Quiz.QUESTIONS[i].correct : (Quiz.QUESTIONS[i].correct + 1) % Quiz.QUESTIONS[i].options.length;
    s = Quiz.select(s, pick); s = Quiz.confirm(s); s = Quiz.next(s);
  }
  return Quiz.score(s) === 7 && Math.round((Quiz.score(s) / Quiz.total()) * 100) === 70;
})());
ok("restart resets all quiz state", (function () {
  var s = Quiz.createState();
  s = Quiz.select(s, 0); s = Quiz.confirm(s); s = Quiz.next(s);
  var r = Quiz.restart();
  return r.index === 0 && r.selected === null && r.confirmed === false && r.answers.length === 0 && r.done === false;
})());
ok("performance messages follow the score bands", (function () {
  return Quiz.message(10) === "Excellent understanding." && Quiz.message(9) === "Excellent understanding." &&
    Quiz.message(8) === "Strong understanding." && Quiz.message(7) === "Strong understanding." &&
    Quiz.message(6) === "Good progress. Review a few concepts." && Quiz.message(5) === "Good progress. Review a few concepts." &&
    Quiz.message(4) === "Revisit the experiments and try again." && Quiz.message(0) === "Revisit the experiments and try again.";
})());

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
