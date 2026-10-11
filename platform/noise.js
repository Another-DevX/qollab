/*!
 * Qollab · Module 2 — code utilities + noise simulation (Pages 6 & 7).
 * Pure, DOM-free. Depends on quantum.js (Q) and shor.js (Shor).
 *
 * Pauli-frame model: a Pauli operator is a string of letters I/X/Y/Z per
 * physical qubit (global phase is irrelevant and ignored). Stabilizer
 * membership is decided by enumerating the stabilizer group.
 */
(function (global) {
  "use strict";

  var LETTERS = "IXYZ";
  function mulLetters(a, b) {
    if (a === "I") return b;
    if (b === "I") return a;
    if (a === b) return "I";
    return LETTERS[6 - LETTERS.indexOf(a) - LETTERS.indexOf(b)];
  }
  function compose(a, b) { var out = new Array(a.length); for (var i = 0; i < a.length; i++) out[i] = mulLetters(a[i], b[i]); return out; }
  function weight(a) { var w = 0; for (var i = 0; i < a.length; i++) if (a[i] !== "I") w++; return w; }
  function anticommute(a, b) { var c = 0; for (var i = 0; i < a.length; i++) if (a[i] !== "I" && b[i] !== "I" && a[i] !== b[i]) c++; return c % 2 === 1; }
  function decodeIndex(idx, n) { var a = new Array(n); for (var i = n - 1; i >= 0; i--) { a[i] = LETTERS[idx % 4]; idx = Math.floor(idx / 4); } return a; }
  function identity(n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = "I"; return a; }
  function groupSet(gens) {
    var n = gens[0].length;
    var set = new Set([identity(n).join("")]);
    for (var g = 0; g < gens.length; g++) {
      var add = [];
      set.forEach(function (e) { add.push(compose(e.split(""), gens[g].split("")).join("")); });
      for (var k = 0; k < add.length; k++) set.add(add[k]);
    }
    return set;
  }
  function lettersFromPattern(pattern, n) {
    var a = identity(n);
    for (var i = 0; i < pattern.length; i++) a[pattern[i].q] = mulLetters(a[pattern[i].q], pattern[i].pauli);
    return a;
  }
  function pauliLabel(letters) {
    var parts = [];
    for (var i = 0; i < letters.length; i++) if (letters[i] !== "I") parts.push(letters[i] + "<sub>" + (i + 1) + "</sub>");
    return parts.length ? parts.join("") : "I";
  }

  function createNoise(Q, Shor) {
    var SHOR_GENS = ["ZZIIIIIII", "IZZIIIIII", "IIIZZIIII", "IIIIZZIII", "IIIIIIZZI", "IIIIIIIZZ", "XXXXXXIII", "IIIXXXXXX"];
    function shorDecode(bits) { return lettersFromPattern(Shor.decode(bits), 9); }

    var CODES = {
      single: { key: "single", n: 1, gens: [], label: "Unprotected qubit", qubits: 1,
        set: groupSet(["I"]), decode: function () { return "I"; }, logicals: [] },
      rep3: { key: "rep3", n: 3, gens: ["ZZI", "IZZ"], label: "3-qubit repetition", qubits: 3,
        set: groupSet(["ZZI", "IZZ"]),
        decode: function (b) { var k = b.join(""); return k === "10" ? "XII" : k === "11" ? "IXI" : k === "01" ? "IIX" : "III"; },
        logicals: [] },
      shor: { key: "shor", n: 9, gens: SHOR_GENS, label: "9-qubit Shor", qubits: 9,
        set: groupSet(SHOR_GENS), decode: shorDecode, logicals: [] },
    };
    CODES.rep3.logicals = [{ name: "X", letters: "XXX" }, { name: "Z", letters: "ZII" }, { name: "Y", letters: compose("XXX".split(""), "ZII".split("")).join("") }];
    CODES.shor.logicals = [{ name: "X", letters: "ZIIZIIZII" }, { name: "Z", letters: "XXXIIIIII" }, { name: "Y", letters: compose("ZIIZIIZII".split(""), "XXXIIIIII".split("")).join("") }];

    function syndrome(code, letters) { return code.gens.map(function (g) { return anticommute(letters, g.split("")) ? 1 : 0; }); }
    function fails(code, letters, correction) {
      if (code.n === 1) return letters[0] !== "I";
      var residual = correction ? compose(code.decode(syndrome(code, letters)), letters) : letters;
      return !code.set.has(residual.join(""));
    }
    // Rigorous classification of R·E on the code space.
    function classify(code, letters, correction) {
      var bits = syndrome(code, letters);
      var residual = correction ? compose(code.decode(bits), letters) : letters;
      var stabilizer = code.set.has(residual.join(""));
      var logical = "I";
      if (!stabilizer) {
        logical = "?";
        for (var i = 0; i < code.logicals.length; i++) {
          if (code.set.has(compose(residual, code.logicals[i].letters.split("")).join(""))) { logical = code.logicals[i].name; break; }
        }
      }
      return { bits: bits, residual: residual, stabilizer: stabilizer, logical: logical };
    }

    // ---- Exact logical failure probability via weight-grouped counts ----
    var countsCache = {};
    function counts(code) {
      if (countsCache[code.key]) return countsCache[code.key];
      var n = code.n, total = Math.pow(4, n);
      var on = { byX: z(n + 1), byZ: z(n + 1), byW: z(n + 1) };
      var off = { byX: z(n + 1), byZ: z(n + 1), byW: z(n + 1) };
      for (var idx = 0; idx < total; idx++) {
        var letters = decodeIndex(idx, n), w = weight(letters);
        var fOn = fails(code, letters, true), fOff = fails(code, letters, false);
        if (fOn) on.byW[w]++;
        if (fOff) off.byW[w]++;
        var xOnly = true, zOnly = true;
        for (var i = 0; i < n; i++) { if (letters[i] === "Y" || letters[i] === "Z") xOnly = false; if (letters[i] === "X" || letters[i] === "Y") zOnly = false; }
        if (xOnly) { if (fOn) on.byX[w]++; if (fOff) off.byX[w]++; }
        if (zOnly) { if (fOn) on.byZ[w]++; if (fOff) off.byZ[w]++; }
      }
      countsCache[code.key] = { on: on, off: off };
      return countsCache[code.key];
    }
    function z(k) { var a = new Array(k); for (var i = 0; i < k; i++) a[i] = 0; return a; }

    function exactPL(code, model, p, correction) {
      var c = counts(code), n = code.n;
      var by = model === "x" ? c.on.byX : model === "z" ? c.on.byZ : c.on.byW;
      var byOff = model === "x" ? c.off.byX : model === "z" ? c.off.byZ : c.off.byW;
      var table = correction ? by : byOff;
      var q = model === "depol" ? p / 3 : p;
      var s = 0;
      for (var k = 0; k <= n; k++) s += table[k] * Math.pow(q, k) * Math.pow(1 - p, n - k);
      return s;
    }

    function samplePattern(n, model, p, rng) {
      var letters = new Array(n);
      for (var i = 0; i < n; i++) {
        if (rng() < p) {
          if (model === "x") letters[i] = "X";
          else if (model === "z") letters[i] = "Z";
          else { var s = rng(); letters[i] = s < 1 / 3 ? "X" : s < 2 / 3 ? "Y" : "Z"; }
        } else letters[i] = "I";
      }
      return letters;
    }
    function monteCarlo(code, model, p, correction, trials, rng) {
      var f = 0;
      for (var t = 0; t < trials; t++) if (fails(code, samplePattern(code.n, model, p, rng), correction)) f++;
      return f / trials;
    }

    return {
      CODES: CODES, LETTERS: LETTERS,
      mulLetters: mulLetters, compose: compose, weight: weight, anticommute: anticommute,
      identity: identity, lettersFromPattern: lettersFromPattern, pauliLabel: pauliLabel,
      syndrome: syndrome, fails: fails, classify: classify,
      counts: counts, exactPL: exactPL, samplePattern: samplePattern, monteCarlo: monteCarlo,
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = createNoise;
  global.createNoise = createNoise;
})(typeof window !== "undefined" ? window : globalThis);
