/*!
 * Qollab · Module 4 — Iceberg code [[4,2,2]] mathematics.
 *
 * Pure, DOM-free logic for the four-qubit stabilizer code with generators
 *   S_X = X1 X2 X3 X4 ,   S_Z = Z1 Z2 Z3 Z4 .
 * The code space is their simultaneous +1 eigenspace (dimension 16/4 = 4), so
 * it encodes two logical qubits. Loadable as a classic script (window.Iceberg,
 * via window.createIceberg(Q)) or in Node (module.exports = createIceberg).
 *
 * Everything is exact: the four-qubit Pauli frame gives syndromes by
 * commutation rules, and the 16-dimensional state vector preserves logical
 * amplitudes and coherences. No universal simulator, no external execution.
 */
(function (global) {
  "use strict";

  function createIceberg(Q) {
    var N = 4;
    var ID = "IIII";
    var STAB = { X: "XXXX", Z: "ZZZZ" };
    var DISTANCE = 2;

    /* Logical basis (physical superpositions of two computational states). */
    var LOGICAL = [
      { key: "00", label: "|00⟩_L", terms: [["0000", 1], ["1111", 1]] },
      { key: "01", label: "|01⟩_L", terms: [["0011", 1], ["1100", 1]] },
      { key: "10", label: "|10⟩_L", terms: [["0101", 1], ["1010", 1]] },
      { key: "11", label: "|11⟩_L", terms: [["0110", 1], ["1001", 1]] },
    ];

    /* ---------- Pauli frame algebra (phases dropped) ---------- */
    var MUL = {
      I: { I: "I", X: "X", Y: "Y", Z: "Z" },
      X: { I: "X", X: "I", Y: "Z", Z: "Y" },
      Y: { I: "Y", X: "Z", Y: "I", Z: "X" },
      Z: { I: "Z", X: "Y", Y: "X", Z: "I" },
    };
    function pauliMul(a, b) {
      var out = "";
      for (var i = 0; i < N; i++) out += MUL[a[i]][b[i]];
      return out;
    }
    function frameFromErrors(errors) {
      var chars = ["I", "I", "I", "I"];
      for (var i = 0; i < errors.length; i++) {
        var e = errors[i];
        chars[e.q] = MUL[chars[e.q]][e.pauli];
      }
      return chars.join("");
    }
    function weight(frame) { var w = 0; for (var i = 0; i < N; i++) if (frame[i] !== "I") w++; return w; }
    function isFrame(frame) { return typeof frame === "string" && frame.length === N && /^[IXYZ]+$/.test(frame); }

    /* Syndrome from commutation rules with S_X (X⊗4) and S_Z (Z⊗4).
       A Pauli P anticommutes with S_X iff an odd number of qubits carry Y or Z;
       it anticommutes with S_Z iff an odd number carry X or Y. */
    function syndrome(frame) {
      var yz = 0, xy = 0;
      for (var i = 0; i < N; i++) {
        var c = frame[i];
        if (c === "Y" || c === "Z") yz++;
        if (c === "X" || c === "Y") xy++;
      }
      return { sx: (yz % 2 === 0) ? 1 : -1, sz: (xy % 2 === 0) ? 1 : -1 };
    }
    function syndromeBits(frame) { var s = syndrome(frame); return [s.sx === -1 ? 1 : 0, s.sz === -1 ? 1 : 0]; }

    function inStabilizer(frame) {
      return frame === "IIII" || frame === "XXXX" || frame === "ZZZZ" || frame === "YYYY";
    }
    /* The normalizer of the stabilizer group: every Pauli with trivial syndrome. */
    function inNormalizer(frame) { var s = syndrome(frame); return s.sx === 1 && s.sz === 1; }
    /* A nontrivial logical operator: commutes with both stabilizers but is not
       itself a stabilizer. It is invisible to the syndrome. */
    function isLogical(frame) { return inNormalizer(frame) && !inStabilizer(frame); }

    function classify(frame) {
      var detected = !inNormalizer(frame);
      var logical = isLogical(frame);
      var kind = frame === ID ? "identity" : inStabilizer(frame) ? "stabilizer" : logical ? "logical" : "detectable";
      var s = syndrome(frame);
      return {
        frame: frame, weight: weight(frame), sx: s.sx, sz: s.sz,
        detected: detected, logical: logical, kind: kind,
      };
    }

    function residual(errorFrame, correctionFrame) { return pauliMul(errorFrame, correctionFrame); }
    /* Recovery succeeds iff the residual acts as the identity on the code space,
       i.e. it is an element of the stabilizer group — NOT merely a trivial
       syndrome (a nontrivial logical operator also has a trivial syndrome). */
    function recovered(errorFrame, correctionFrame) { return inStabilizer(residual(errorFrame, correctionFrame)); }

    /* ---------- Exact four-qubit state vector ---------- */
    function encodeLogical(key) {
      var entry = null;
      for (var i = 0; i < LOGICAL.length; i++) if (LOGICAL[i].key === key) entry = LOGICAL[i];
      if (!entry) entry = LOGICAL[0];
      var reg = new Array(1 << N), i2;
      for (i2 = 0; i2 < reg.length; i2++) reg[i2] = Q.C(0);
      for (var t = 0; t < entry.terms.length; t++) {
        var idx = parseInt(entry.terms[t][0], 2);
        reg[idx] = Q.cAdd(reg[idx], Q.C(Q.SQ * entry.terms[t][1]));
      }
      return reg;
    }
    function applyFrame(state, frame) {
      var out = state.slice();
      for (var q = 0; q < N; q++) {
        var p = frame[q];
        if (p === "X") out = Q.applyPauliReg(out, q, "X", N);
        else if (p === "Z") out = Q.applyPauliReg(out, q, "Z", N);
        else if (p === "Y") { out = Q.applyPauliReg(out, q, "X", N); out = Q.applyPauliReg(out, q, "Z", N); }
      }
      return out;
    }
    function stabilizerOp(type) {
      var terms = [];
      for (var q = 0; q < N; q++) terms.push({ p: type, q: q });
      return Q.buildPauliOp(N, terms);
    }
    var OP_X = stabilizerOp("X"), OP_Z = stabilizerOp("Z");
    /* Eigenvalues (±1) of both stabilizers for a state, measured projectively. */
    function stabilizerValues(state) {
      var mx = Q.measureStabilizer(state, OP_X);
      var mz = Q.measureStabilizer(state, OP_Z);
      return { sx: mx.outcome, sz: mz.outcome, probability: mx.probability * mz.probability };
    }
    function isInCodeSpace(state) { var v = stabilizerValues(state); return v.sx === 1 && v.sz === 1; }
    function sameUpToPhase(a, b) { return Q.regEqPhase(a, b); }

    /* ---------- Noise models (per-qubit, independent) ---------- */
    var MODELS = {
      x: { key: "x", label: "X noise", hint: "Each qubit suffers a bit flip X with probability p." },
      z: { key: "z", label: "Z noise", hint: "Each qubit suffers a phase flip Z with probability p." },
      depol: { key: "depol", label: "Depolarizing", hint: "With probability p a qubit gets X, Y or Z, each with probability p/3." },
    };
    function perQubitDist(model, p) {
      if (model === "x") return { I: 1 - p, X: p, Y: 0, Z: 0 };
      if (model === "z") return { I: 1 - p, Z: p, X: 0, Y: 0 };
      return { I: 1 - p, X: p / 3, Y: p / 3, Z: p / 3 };
    }
    function sampleFrame(p, model, rng) {
      var d = perQubitDist(model, p), out = "";
      for (var q = 0; q < N; q++) {
        var r = rng(), acc = d.I;
        if (r < acc) { out += "I"; continue; }
        acc += d.X; if (r < acc) { out += "X"; continue; }
        acc += d.Y; if (r < acc) { out += "Y"; continue; }
        out += "Z";
      }
      return out;
    }
    function pickPauli(model, rng) {
      if (model === "x") return "X";
      if (model === "z") return "Z";
      var r = rng();
      return r < 1 / 3 ? "X" : r < 2 / 3 ? "Y" : "Z";
    }
    /* "independent": each qubit is hit independently (prob p per qubit).
       "single": at most one qubit is hit per trial (chosen uniformly). */
    function sampleFrameMode(p, model, mode, rng) {
      rng = rng || Math.random;
      if (mode === "single") {
        if (rng() >= p) return ID;
        var chars = ["I", "I", "I", "I"];
        chars[Math.floor(rng() * N)] = pickPauli(model, rng);
        return chars.join("");
      }
      return sampleFrame(p, model, rng);
    }

    /* A single run: detected if the syndrome is nontrivial; a logical error if
       the frame is a nontrivial logical operator (invisible to the syndrome). */
    function runTrial(frame, postselect) {
      var detected = !inNormalizer(frame);
      var accepted = postselect ? !detected : true;
      var logical = isLogical(frame);
      return { frame: frame, detected: detected, accepted: accepted, logical: logical };
    }

    function monteCarlo(p, model, trials, postselect, rng) {
      rng = rng || Math.random;
      var accepted = 0, rejected = 0, logicalAccepted = 0, logicalAll = 0, detected = 0;
      for (var t = 0; t < trials; t++) {
        var r = runTrial(sampleFrame(p, model, rng), postselect);
        if (r.detected) detected++;
        if (r.logical) logicalAll++;
        if (r.accepted) { accepted++; if (r.logical) logicalAccepted++; }
        else rejected++;
      }
      return {
        total: trials, accepted: accepted, rejected: rejected, detected: detected,
        pAccept: trials > 0 ? accepted / trials : 0,
        logicalRate: accepted > 0 ? logicalAccepted / accepted : 0,
        logicalAccepted: logicalAccepted, logicalAll: logicalAll,
      };
    }

    /* Exact expectation over all 4^N Pauli frames (used for validation). */
    function exact(p, model) {
      var d = perQubitDist(model, p), paulis = ["I", "X", "Y", "Z"];
      var pAccept = 0, logicalAll = 0, logicalAccepted = 0;
      for (var m = 0; m < (1 << (2 * N)); m++) {
        var frame = "", prob = 1, tmp = m;
        for (var q = 0; q < N; q++) { var pc = paulis[tmp & 3]; tmp >>= 2; frame += pc; prob *= d[pc]; }
        if (prob < 1e-15) continue;
        if (inNormalizer(frame)) {
          pAccept += prob;
          if (isLogical(frame)) logicalAccepted += prob;
        }
        if (isLogical(frame)) logicalAll += prob;
      }
      return {
        pAccept: pAccept, detectedRate: 1 - pAccept,
        logicalAll: logicalAll, logicalAccepted: logicalAccepted,
        logicalRate: pAccept > 0 ? logicalAccepted / pAccept : 0,
      };
    }

    /* Monte Carlo noise statistics (Page 5 · "Noise under the iceberg"). */
    function noiseStats(p, model, trials, mode, rng) {
      rng = rng || Math.random;
      var physical = 0, detected = 0, logicalUndetected = 0;
      for (var t = 0; t < trials; t++) {
        var frame = sampleFrameMode(p, model, mode, rng);
        if (frame !== ID) physical++;
        if (!inNormalizer(frame)) detected++;
        else if (isLogical(frame)) logicalUndetected++;
      }
      var undetected = trials - detected;
      return {
        total: trials, mode: mode,
        physical: physical, physicalRate: trials ? physical / trials : 0,
        detected: detected, detectedRate: trials ? detected / trials : 0,
        undetected: undetected, undetectedRate: trials ? undetected / trials : 0,
        logicalUndetected: logicalUndetected, logicalUndetectedRate: trials ? logicalUndetected / trials : 0,
        accepted: undetected, rejected: detected,
        acceptanceRate: trials ? undetected / trials : 0,
        rejectionRate: trials ? detected / trials : 0,
      };
    }
    /* Exact noise expectations (validation). */
    function exactNoise(p, model, mode) {
      if (mode === "single") {
        return { physicalRate: p, detectedRate: p, undetectedRate: 1 - p, logicalUndetectedRate: 0, acceptanceRate: 1 - p, rejectionRate: p };
      }
      var e = exact(p, model);
      var noErr = Math.pow(1 - p, N);
      return { physicalRate: 1 - noErr, detectedRate: e.detectedRate, undetectedRate: e.pAccept, logicalUndetectedRate: e.logicalAccepted, acceptanceRate: e.pAccept, rejectionRate: e.detectedRate };
    }

    /* ---------- Presentation helpers (pure strings) ---------- */
    function describeFrame(frame) {
      var subs = { 0: "₁", 1: "₂", 2: "₃", 3: "₄" }, parts = [];
      for (var i = 0; i < N; i++) if (frame[i] !== "I") parts.push(frame[i] + subs[i]);
      return parts.length ? parts.join(" ") : "I";
    }

    return {
      N: N, ID: ID, STAB: STAB, DISTANCE: DISTANCE, LOGICAL: LOGICAL, MODELS: MODELS,
      pauliMul: pauliMul, frameFromErrors: frameFromErrors, weight: weight, isFrame: isFrame,
      syndrome: syndrome, syndromeBits: syndromeBits,
      inStabilizer: inStabilizer, inNormalizer: inNormalizer, isLogical: isLogical, classify: classify,
      residual: residual, recovered: recovered,
      encodeLogical: encodeLogical, applyFrame: applyFrame,
      stabilizerValues: stabilizerValues, isInCodeSpace: isInCodeSpace, sameUpToPhase: sameUpToPhase,
      perQubitDist: perQubitDist, sampleFrame: sampleFrame, sampleFrameMode: sampleFrameMode, pickPauli: pickPauli, runTrial: runTrial,
      monteCarlo: monteCarlo, exact: exact, noiseStats: noiseStats, exactNoise: exactNoise, describeFrame: describeFrame,
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = createIceberg;
  else global.createIceberg = createIceberg;
})(typeof window !== "undefined" ? window : globalThis);
