/*
 * mock.js — Illustrative model for the Distance lab. Pure functions, no DOM.
 *
 * This is NOT a decoder or a Monte Carlo of the surface code. It draws
 * pass/fail counts from the textbook scaling law
 *
 *   p_L(p, d) = min(0.5, A · (p / P_TH)^((d + 1) / 2))
 *
 * so every curve crosses at p = P_TH, larger d wins below it and loses above,
 * and the rate saturates at 0.5 (a coin flip). For a real decoder run see
 * decoder.js (lesson 06).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Mock = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var P_TH = 0.10;
  var A = 0.10;

  function logicalRate(p, d) {
    if (!(p > 0)) return 0;
    return Math.min(0.5, A * Math.pow(p / P_TH, (d + 1) / 2));
  }

  // Binomial(n, q) by n Bernoulli draws: exact, and fast enough for n ≤ a few thousand.
  function binomial(n, q, rng) {
    var k = 0;
    for (var i = 0; i < n; i++) if (rng() < q) k++;
    return k;
  }

  function mockRun(p, d, trials, rng) {
    var failures = binomial(trials, logicalRate(p, d), rng);
    var f = trials ? failures / trials : 0;
    return { failures: failures, trials: trials, rate: f, errorBar: trials ? Math.sqrt(f * (1 - f) / trials) : 0 };
  }

  function mockSweep(d, pValues, trials, rng) {
    return pValues.map(function (p) {
      var r = mockRun(p, d, trials, rng);
      r.p = p;
      r.d = d;
      return r;
    });
  }

  // Errors a distance-d code always corrects.
  function correctable(d) { return Math.floor((d - 1) / 2); }
  // Rotated surface code: d² data qubits + d² − 1 measurement qubits.
  function totalQubits(d) { return 2 * d * d - 1; }

  return {
    P_TH: P_TH,
    A: A,
    logicalRate: logicalRate,
    binomial: binomial,
    mockRun: mockRun,
    mockSweep: mockSweep,
    correctable: correctable,
    totalQubits: totalQubits
  };
});
