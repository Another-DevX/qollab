/*!
 * Qollab · Module 2 — Syndrome Detective game logic.
 * Pure, DOM-free state machine so the whole flow (measure → diagnose →
 * confirm → correct → verify → next) is testable and has ONE source of truth.
 * The hidden-error generation is unchanged: 25% chance of "no error", else a
 * uniformly random qubit q1..q3.
 */
(function (global) {
  "use strict";

  function createDetective(Q, rng) {
    rng = rng || Math.random;
    var s = {
      hidden: null,           // -1 none, 0..2 qubit  (null = not injected yet)
      outcomes: null,         // [+1|-1, +1|-1]  (stabilizer eigenvalues)
      bits: null,             // [0|1, 0|1]       (binary syndrome, from outcomes)
      diagnosis: null,        // user's chosen qubit (-1..2)
      diagnosisConfirmed: false,
      correctionQubit: null,  // proposed correction qubit (-1 = identity)
      corrected: false,       // correction step completed
      recovered: null,        // boolean after applying correction
      scored: false,          // round already counted
      feedback: "",
      explanation: "",
      round: 1,
      solved: 0,
    };

    function baseReg() { return Q.encodeRepetition(Q.C(Q.SQ), Q.C(Q.SQ)); } // logical |+⟩
    function regWithError() { return s.hidden >= 0 ? Q.applyPauliReg(baseReg(), s.hidden, "X") : baseReg(); }

    function inject(hiddenOverride) {
      s.hidden = hiddenOverride === undefined ? (rng() < 0.25 ? -1 : Math.floor(rng() * 3)) : hiddenOverride;
      s.outcomes = null; s.bits = null; s.diagnosis = null; s.diagnosisConfirmed = false;
      s.correctionQubit = null; s.corrected = false; s.recovered = null; s.scored = false;
      s.feedback = ""; s.explanation = "";
      return s;
    }

    function measure() {
      var m = Q.measureSyndrome(regWithError(), "bit");
      s.outcomes = m.outcomes; s.bits = m.bits;
      return s;
    }

    function expectedQubit() { return s.bits ? Q.qubitFromSyndrome(s.bits) : null; }

    function explain(bits) {
      var key = bits.join("");
      if (key === "10") return "S₁ changed, but S₂ did not. The error is on q1.";
      if (key === "11") return "Both parity checks changed. The error is on q2.";
      if (key === "01") return "Only S₂ changed. The error is on q3.";
      return "Neither parity check changed. No bit flip was detected.";
    }

    function diagnose(q) { s.diagnosis = q; return s; }

    function confirmDiagnosis() {
      if (s.bits == null || s.diagnosis == null) return s;
      s.diagnosisConfirmed = true;
      s.correctionQubit = s.diagnosis;         // proposed correction = diagnosis
      s.explanation = explain(s.bits);
      s.feedback = "";
      return s;
    }

    function setCorrection(q) { s.correctionQubit = q; return s; }

    function applyCorrection() {
      if (!s.diagnosisConfirmed || s.correctionQubit == null) return s;
      var base = baseReg(), withErr = regWithError();
      var fixed = s.correctionQubit === -1 ? withErr : Q.correct(withErr, "bit", s.correctionQubit);
      s.corrected = true;
      s.recovered = Q.regEqPhase(fixed, base);
      if (s.recovered && !s.scored) { s.solved = Math.min(3, s.solved + 1); s.scored = true; }
      s.feedback = s.recovered ? "Logical state recovered." : "Recovery failed. Try another correction.";
      return s;
    }

    function canNextRound() { return s.corrected; }

    function nextRound() {
      if (!s.corrected) return s;               // gated on the correction step
      if (s.round >= 3) { s.round = 1; s.solved = 0; } else { s.round += 1; }
      // Preserve the original behaviour: the next round starts at the
      // "inject" step, so the user clicks "Inject Hidden Error" again.
      s.hidden = null; s.outcomes = null; s.bits = null; s.diagnosis = null;
      s.diagnosisConfirmed = false; s.correctionQubit = null; s.corrected = false;
      s.recovered = null; s.scored = false; s.feedback = ""; s.explanation = "";
      return s;
    }

    return {
      state: function () { return s; },
      inject: inject, measure: measure, expectedQubit: expectedQubit,
      diagnose: diagnose, confirmDiagnosis: confirmDiagnosis, setCorrection: setCorrection,
      applyCorrection: applyCorrection, canNextRound: canNextRound, nextRound: nextRound,
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = createDetective;
  global.createDetective = createDetective;
})(typeof window !== "undefined" ? window : globalThis);
