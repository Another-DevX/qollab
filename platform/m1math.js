/*!
 * Qollab · Platform — Module 1 pure math (vanilla port of src/lib/quantum/*).
 * Complex numbers, 2×2 matrices, Pauli operators, Bloch states, rotations and
 * the challenge generator. No DOM. Exposes window.M1 / module.exports.
 */
(function (global) {
  "use strict";

  /* ---------------- Complex numbers ---------------- */
  var C_ZERO = { re: 0, im: 0 }, C_ONE = { re: 1, im: 0 }, C_I = { re: 0, im: 1 };
  function complex(re, im) { return { re: re, im: im == null ? 0 : im }; }
  function cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
  function cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
  function cMul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
  function cScale(a, s) { return { re: a.re * s, im: a.im * s }; }
  function cNeg(a) { return { re: -a.re, im: -a.im }; }
  function cConj(a) { return { re: a.re, im: -a.im }; }
  function cAbs2(a) { return a.re * a.re + a.im * a.im; }
  function cAbs(a) { return Math.sqrt(cAbs2(a)); }
  function cExpI(phi) { return { re: Math.cos(phi), im: Math.sin(phi) }; }
  function cPolar(r, phi) { return { re: r * Math.cos(phi), im: r * Math.sin(phi) }; }
  function cArg(a) { return Math.atan2(a.im, a.re); }
  function cEquals(a, b, eps) { eps = eps == null ? 1e-9 : eps; return Math.abs(a.re - b.re) <= eps && Math.abs(a.im - b.im) <= eps; }

  /* ---------------- Matrices 2×2 and spinors ---------------- */
  var IDENTITY_2 = [[C_ONE, C_ZERO], [C_ZERO, C_ONE]];
  function matMul(a, b) {
    function cell(i, j) { return cAdd(cMul(a[i][0], b[0][j]), cMul(a[i][1], b[1][j])); }
    return [[cell(0, 0), cell(0, 1)], [cell(1, 0), cell(1, 1)]];
  }
  function matVec(m, v) {
    return [cAdd(cMul(m[0][0], v[0]), cMul(m[0][1], v[1])), cAdd(cMul(m[1][0], v[0]), cMul(m[1][1], v[1]))];
  }
  function matAdd(a, b) {
    return [[cAdd(a[0][0], b[0][0]), cAdd(a[0][1], b[0][1])], [cAdd(a[1][0], b[1][0]), cAdd(a[1][1], b[1][1])]];
  }
  function matScale(a, s) {
    return [[cScale(a[0][0], s), cScale(a[0][1], s)], [cScale(a[1][0], s), cScale(a[1][1], s)]];
  }
  function matScaleComplex(a, s) {
    return [[cMul(a[0][0], s), cMul(a[0][1], s)], [cMul(a[1][0], s), cMul(a[1][1], s)]];
  }
  function matDagger(a) { return [[cConj(a[0][0]), cConj(a[1][0])], [cConj(a[0][1]), cConj(a[1][1])]]; }
  function matTrace(a) { return cAdd(a[0][0], a[1][1]); }
  function matDet(a) { return cSub(cMul(a[0][0], a[1][1]), cMul(a[0][1], a[1][0])); }
  function matEquals(a, b, eps) {
    eps = eps == null ? 1e-9 : eps;
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      if (Math.abs(a[i][j].re - b[i][j].re) > eps || Math.abs(a[i][j].im - b[i][j].im) > eps) return false;
    }
    return true;
  }

  /* ---------------- Pauli operators ---------------- */
  var PAULI_I = [[C_ONE, C_ZERO], [C_ZERO, C_ONE]];
  var PAULI_X = [[C_ZERO, C_ONE], [C_ONE, C_ZERO]];
  var PAULI_Y = [[C_ZERO, { re: 0, im: -1 }], [{ re: 0, im: 1 }, C_ZERO]];
  var PAULI_Z = [[C_ONE, C_ZERO], [C_ZERO, { re: -1, im: 0 }]];
  var PAULI_MATRICES = { I: PAULI_I, X: PAULI_X, Y: PAULI_Y, Z: PAULI_Z };
  var PAULI_NAMES = ["I", "X", "Y", "Z"];
  function pauliMatrix(name) { return PAULI_MATRICES[name]; }
  function applyPauli(name, state) { return matVec(PAULI_MATRICES[name], state); }
  function composePauliSequence(names) {
    var result = PAULI_I;
    for (var i = 0; i < names.length; i++) result = matMul(PAULI_MATRICES[names[i]], result);
    return result;
  }

  /* ---------------- States and the Bloch sphere ---------------- */
  var S = 1 / Math.SQRT2;
  var KET_0 = [C_ONE, C_ZERO];
  var KET_1 = [C_ZERO, C_ONE];
  var KET_PLUS = [{ re: S, im: 0 }, { re: S, im: 0 }];
  var KET_MINUS = [{ re: S, im: 0 }, { re: -S, im: 0 }];
  var KET_PLUS_I = [{ re: S, im: 0 }, { re: 0, im: S }];
  var KET_MINUS_I = [{ re: S, im: 0 }, { re: 0, im: -S }];
  var KET = { "0": KET_0, "1": KET_1, "+": KET_PLUS, "−": KET_MINUS, "+i": KET_PLUS_I, "−i": KET_MINUS_I };

  var NAMED_STATES = [
    { key: "0", label: "|0⟩", state: KET_0, bloch: { x: 0, y: 0, z: 1 }, description: "North pole: the classical 0." },
    { key: "1", label: "|1⟩", state: KET_1, bloch: { x: 0, y: 0, z: -1 }, description: "South pole: the classical 1." },
    { key: "plus", label: "|+⟩", state: KET_PLUS, bloch: { x: 1, y: 0, z: 0 }, description: "Equal superposition on the equator (+X)." },
    { key: "minus", label: "|−⟩", state: KET_MINUS, bloch: { x: -1, y: 0, z: 0 }, description: "Equal superposition on the equator (−X)." },
    { key: "plus_i", label: "|+i⟩", state: KET_PLUS_I, bloch: { x: 0, y: 1, z: 0 }, description: "Superposition with relative phase +π/2 (+Y)." },
    { key: "minus_i", label: "|−i⟩", state: KET_MINUS_I, bloch: { x: 0, y: -1, z: 0 }, description: "Superposition with relative phase −π/2 (−Y)." },
  ];
  function namedStateByKey(key) { for (var i = 0; i < NAMED_STATES.length; i++) if (NAMED_STATES[i].key === key) return NAMED_STATES[i]; return undefined; }
  function ketState(theta, phi) { return [{ re: Math.cos(theta / 2), im: 0 }, cScale(cExpI(phi), Math.sin(theta / 2))]; }
  function stateFromBloch(x, y, z) {
    var r = Math.hypot(x, y, z);
    if (r < 1e-12) return KET_0;
    var theta = Math.acos(Math.max(-1, Math.min(1, z / r)));
    var phi = (x === 0 && y === 0) ? 0 : Math.atan2(y, x);
    return ketState(theta, phi);
  }
  function blochVector(state) {
    var a = state[0], b = state[1], norm2 = cAbs2(a) + cAbs2(b);
    if (norm2 < 1e-15) return { x: 0, y: 0, z: 0 };
    var ab = cMul(cConj(a), b);
    return { x: (2 * ab.re) / norm2, y: (2 * ab.im) / norm2, z: (cAbs2(a) - cAbs2(b)) / norm2 };
  }
  function blochTuple(v) { return [v.x, v.y, v.z]; }
  function normalizeSpinor(state) {
    var norm = Math.sqrt(cAbs2(state[0]) + cAbs2(state[1]));
    if (norm < 1e-15) return KET_0;
    return [cScale(state[0], 1 / norm), cScale(state[1], 1 / norm)];
  }
  function innerProduct(a, b) { return cAdd(cMul(cConj(a[0]), b[0]), cMul(cConj(a[1]), b[1])); }
  function overlap(a, b) { var ip = innerProduct(normalizeSpinor(a), normalizeSpinor(b)); return Math.hypot(ip.re, ip.im); }
  function areEquivalentUpToPhase(a, b, eps) { eps = eps == null ? 1e-6 : eps; return 1 - overlap(a, b) <= eps; }
  function globalPhaseBetween(a, b) { return cArg(innerProduct(normalizeSpinor(a), normalizeSpinor(b))); }
  function outcomeProbability(state, outcome) {
    var norm2 = cAbs2(state[0]) + cAbs2(state[1]);
    if (norm2 < 1e-15) return outcome === 0 ? 1 : 0;
    return cAbs2(state[outcome]) / norm2;
  }
  function blochToSpherical(v) {
    var r = Math.hypot(v.x, v.y, v.z);
    if (r < 1e-12) return { theta: 0, phi: 0 };
    var theta = Math.acos(Math.max(-1, Math.min(1, v.z / r)));
    var phi = (v.x === 0 && v.y === 0) ? 0 : Math.atan2(v.y, v.x);
    if (phi < 0) phi += 2 * Math.PI;
    return { theta: theta, phi: phi };
  }
  function rotateBloch(v, axis, angle) {
    var n = Math.hypot(axis.x, axis.y, axis.z) || 1;
    var nx = axis.x / n, ny = axis.y / n, nz = axis.z / n;
    var cos = Math.cos(angle), sin = Math.sin(angle);
    var dot = nx * v.x + ny * v.y + nz * v.z;
    var crossX = ny * v.z - nz * v.y, crossY = nz * v.x - nx * v.z, crossZ = nx * v.y - ny * v.x;
    return {
      x: v.x * cos + crossX * sin + nx * dot * (1 - cos),
      y: v.y * cos + crossY * sin + ny * dot * (1 - cos),
      z: v.z * cos + crossZ * sin + nz * dot * (1 - cos),
    };
  }

  /* ---------------- Rotations and the Pauli basis ---------------- */
  function normalizeAxis(axis) {
    var n = Math.hypot(axis.x, axis.y, axis.z);
    if (n < 1e-12) return { x: 1, y: 0, z: 0 };
    return { x: axis.x / n, y: axis.y / n, z: axis.z / n };
  }
  function dotPauli(axis) {
    var n = normalizeAxis(axis);
    return matAdd(matAdd(matScale(PAULI_X, n.x), matScale(PAULI_Y, n.y)), matScale(PAULI_Z, n.z));
  }
  function rotationOperator(axis, angle) {
    var half = angle / 2, n = normalizeAxis(axis);
    return matAdd(matScale(PAULI_I, Math.cos(half)), matScaleComplex(dotPauli(n), { re: 0, im: -Math.sin(half) }));
  }
  function coefficient(operator, basis) { return cScale(matTrace(matMul(matDagger(basis), operator)), 1 / 2); }
  function pauliDecomposition(operator) {
    return {
      a: coefficient(operator, PAULI_I), b: coefficient(operator, PAULI_X),
      c: coefficient(operator, PAULI_Y), d: coefficient(operator, PAULI_Z),
    };
  }
  function reconstructFromPauli(coeffs) {
    return matAdd(matAdd(matScaleComplex(PAULI_I, coeffs.a), matScaleComplex(PAULI_X, coeffs.b)),
      matAdd(matScaleComplex(PAULI_Y, coeffs.c), matScaleComplex(PAULI_Z, coeffs.d)));
  }

  /* ---------------- Challenge generator ---------------- */
  function createSeededRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var DEFAULT_MARGIN = 0.08;
  function pauliImages(state) {
    return { I: applyPauli("I", state), X: applyPauli("X", state), Y: applyPauli("Y", state), Z: applyPauli("Z", state) };
  }
  function isNonDegenerate(state, margin) {
    margin = margin == null ? DEFAULT_MARGIN : margin;
    var images = pauliImages(state);
    for (var i = 0; i < PAULI_NAMES.length; i++) for (var j = i + 1; j < PAULI_NAMES.length; j++) {
      if (overlap(images[PAULI_NAMES[i]], images[PAULI_NAMES[j]]) > 1 - margin) return false;
    }
    return true;
  }
  function isErrorDistinguishable(state, error, margin) {
    margin = margin == null ? DEFAULT_MARGIN : margin;
    if (error === "I") return true;
    return overlap(state, applyPauli(error, state)) < 1 - margin;
  }
  function generateInitialState(rng, options) {
    rng = rng || Math.random; options = options || {};
    var margin = options.margin == null ? DEFAULT_MARGIN : options.margin;
    var maxAttempts = options.maxAttempts == null ? 100 : options.maxAttempts;
    for (var i = 0; i < maxAttempts; i++) {
      var theta = Math.PI * (0.18 + 0.64 * rng()), phi = 2 * Math.PI * rng();
      var state = ketState(theta, phi);
      if (isNonDegenerate(state, margin)) return { theta: theta, phi: phi, state: state };
    }
    var t2 = Math.PI * 0.42, p2 = Math.PI * 0.31;
    return { theta: t2, phi: p2, state: ketState(t2, p2) };
  }
  function pickHiddenError(rng) { rng = rng || Math.random; return PAULI_NAMES[Math.floor(rng() * PAULI_NAMES.length) % PAULI_NAMES.length]; }
  function generateChallenge(rng, options) {
    rng = rng || Math.random;
    var init = generateInitialState(rng, options);
    var error = pickHiddenError(rng);
    return {
      id: Math.floor(rng() * 1e9).toString(36) + "-" + Math.floor(rng() * 1e9).toString(36),
      theta: init.theta, phi: init.phi, initial: init.state, error: error, final: applyPauli(error, init.state),
    };
  }
  function checkAnswer(challenge, chosen, eps) {
    eps = eps == null ? 1e-6 : eps;
    var correct = chosen === challenge.error;
    var equivalentOtherwise = !correct && 1 - overlap(applyPauli(chosen, challenge.initial), challenge.final) <= eps;
    return { correct: correct, chosen: chosen, expected: challenge.error, equivalentOtherwise: equivalentOtherwise };
  }

  /* ---------------- Formatting ---------------- */
  function cleanNumber(n, digits) {
    digits = digits == null ? 3 : digits;
    var rounded = Number(n.toFixed(digits));
    return Object.is(rounded, -0) ? 0 : rounded;
  }
  function formatNumber(n, digits) { return String(cleanNumber(n, digits)); }
  function imaginaryUnit(im, digits) {
    var v = cleanNumber(im, digits);
    if (v === 1) return "i";
    if (v === -1) return "−i";
    return formatNumber(v, digits) + "i";
  }
  function formatComplex(c, digits) {
    digits = digits == null ? 3 : digits;
    var re = cleanNumber(c.re, digits), im = cleanNumber(c.im, digits);
    if (im === 0) return formatNumber(re, digits);
    if (re === 0) return imaginaryUnit(im, digits);
    var sign = im > 0 ? "+" : "−";
    return formatNumber(re, digits) + " " + sign + " " + imaginaryUnit(Math.abs(im), digits);
  }
  function formatReal(n, digits) { return formatNumber(n, digits).replace("-", "−"); }
  function formatPi(radians, digits) {
    digits = digits == null ? 2 : digits;
    var ratio = cleanNumber(radians / Math.PI, digits);
    if (ratio === 0) return "0";
    if (ratio === 1) return "π";
    if (ratio === -1) return "−π";
    return formatReal(ratio, digits) + "π";
  }
  function radToDeg(radians) { return (radians * 180) / Math.PI; }
  function degToRad(degrees) { return (degrees * Math.PI) / 180; }

  var M1 = {
    C: complex, C_ZERO: C_ZERO, C_ONE: C_ONE, C_I: C_I,
    cAdd: cAdd, cSub: cSub, cMul: cMul, cScale: cScale, cNeg: cNeg, cConj: cConj,
    cAbs2: cAbs2, cAbs: cAbs, cExpI: cExpI, cPolar: cPolar, cArg: cArg, cEquals: cEquals,
    IDENTITY_2: IDENTITY_2, matMul: matMul, matVec: matVec, matAdd: matAdd, matScale: matScale,
    matScaleComplex: matScaleComplex, matDagger: matDagger, matTrace: matTrace, matDet: matDet, matEquals: matEquals,
    PAULI_I: PAULI_I, PAULI_X: PAULI_X, PAULI_Y: PAULI_Y, PAULI_Z: PAULI_Z,
    PAULI_MATRICES: PAULI_MATRICES, PAULI_NAMES: PAULI_NAMES, pauliMatrix: pauliMatrix,
    applyPauli: applyPauli, composePauliSequence: composePauliSequence,
    KET_0: KET_0, KET_1: KET_1, KET_PLUS: KET_PLUS, KET_MINUS: KET_MINUS, KET_PLUS_I: KET_PLUS_I, KET_MINUS_I: KET_MINUS_I, KET: KET,
    NAMED_STATES: NAMED_STATES, namedStateByKey: namedStateByKey, ketState: ketState, stateFromBloch: stateFromBloch,
    blochVector: blochVector, blochTuple: blochTuple, normalizeSpinor: normalizeSpinor, innerProduct: innerProduct,
    overlap: overlap, areEquivalentUpToPhase: areEquivalentUpToPhase, globalPhaseBetween: globalPhaseBetween,
    outcomeProbability: outcomeProbability, blochToSpherical: blochToSpherical, rotateBloch: rotateBloch,
    normalizeAxis: normalizeAxis, dotPauli: dotPauli, rotationOperator: rotationOperator,
    pauliDecomposition: pauliDecomposition, reconstructFromPauli: reconstructFromPauli,
    createSeededRng: createSeededRng, DEFAULT_MARGIN: DEFAULT_MARGIN, pauliImages: pauliImages,
    isNonDegenerate: isNonDegenerate, isErrorDistinguishable: isErrorDistinguishable,
    generateInitialState: generateInitialState, pickHiddenError: pickHiddenError,
    generateChallenge: generateChallenge, checkAnswer: checkAnswer,
    cleanNumber: cleanNumber, formatNumber: formatNumber, formatComplex: formatComplex,
    formatReal: formatReal, formatPi: formatPi, radToDeg: radToDeg, degToRad: degToRad,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = M1;
  global.M1 = M1;
})(typeof window !== "undefined" ? window : globalThis);
