/*!
 * Qollab · Module 4 — Iceberg Code [[4,2,2]] · "Detecting Errors Without
 * Correcting Them". Vanilla rendering + hash routes for the unified platform.
 * Exposes window.Module4 = { routes, render }.
 *
 * Central learning outcome: error detection and error correction are not the
 * same thing. All physics comes from the pure engine in iceberg.js.
 */
(function (global) {
  "use strict";

  var UI = global.UI;
  var createIceberg = global.createIceberg;
  if (typeof createIceberg !== "function" && typeof require === "function") {
    createIceberg = require("./iceberg.js");
  }
  if (typeof createIceberg !== "function") {
    throw new Error("Module 4 requires iceberg.js to expose createIceberg before initialization.");
  }
  var Q = global.Q;
  if ((!Q || typeof Q.buildPauliOp !== "function") && typeof require === "function") {
    Q = require("./quantum.js");
  }
  if (!Q || typeof Q.buildPauliOp !== "function") {
    throw new Error("Module 4 requires quantum.js to expose the Q API before initialization.");
  }
  var Ice = createIceberg(Q);
  var IQ = global.IcebergQuiz;
  if (!IQ && typeof require === "function") IQ = require("./icebergquiz.js");
  if (!IQ) throw new Error("Module 4 requires icebergquiz.js before initialization.");

  var SUB = ["₁", "₂", "₃", "₄"];
  var PAULI_CLASS = { X: "pX", Y: "pY", Z: "pZ", I: "" };
  function mx(html) { return UI.m(html); }
  function lsub(s) { return String(s).replace(/_L/g, "<sub>L</sub>"); }

  function frameHTML(frame) {
    var parts = [];
    for (var i = 0; i < Ice.N; i++) if (frame[i] !== "I") parts.push("<span class='" + PAULI_CLASS[frame[i]] + "'>" + frame[i] + "</span><sub>" + SUB[i] + "</sub>");
    return "<span class='m'>" + (parts.length ? parts.join("") : "I") + "</span>";
  }
  function syndromeHTML(frame) {
    var s = Ice.syndrome(frame);
    return "<span class='m'><i>S</i><sub>X</sub> = " + (s.sx === 1 ? "+1" : "−1") + ", <i>S</i><sub>Z</sub> = " + (s.sz === 1 ? "+1" : "−1") + "</span>";
  }
  function logicalExprHTML(entry) {
    var parts = entry.terms.map(function (t) { return "|" + t[0] + "⟩"; });
    return "<span class='m'>" + lsub(entry.label) + " = (" + parts.join(" + ") + ")/√2</span>";
  }
  function logicalByKey(key) { for (var i = 0; i < Ice.LOGICAL.length; i++) if (Ice.LOGICAL[i].key === key) return Ice.LOGICAL[i]; return Ice.LOGICAL[0]; }

  /* Why a syndrome maps to an error type (commutation reasoning). */
  function typeFromSyndrome(sx, sz) { return (sx === 1 && sz === 1) ? "I" : (sx === 1) ? "X" : (sz === 1) ? "Z" : "Y"; }
  var COMM_EXPLAIN = {
    X: "X commutes with the XXXX check but anticommutes with ZZZZ. The Z-type check detects it.",
    Y: "Y anticommutes with both checks. Both stabilizer signs flip.",
    Z: "Z anticommutes with XXXX but commutes with ZZZZ. The X-type check detects it.",
  };
  function commutationReason(sx, sz) {
    if (sx === 1 && sz === 1) return "No error is detected under the single-Pauli-error assumptions of this challenge. A trivial syndrome does not rule out more general or multiple-qubit errors.";
    if (sx === 1 && sz === -1) return "X anticommutes with the Z-type stabilizer, so S_Z flips to −1. It commutes with the X-type stabilizer, leaving S_X at +1.";
    if (sx === -1 && sz === 1) return "Z anticommutes with the X-type stabilizer, so S_X flips to −1. It commutes with the Z-type stabilizer, leaving S_Z at +1.";
    return "Y anticommutes with both stabilizers, so both signs flip to −1.";
  }
  function commTag(commutes) {
    return UI.m(commutes ? "commutes" : "anticommutes") + " <span class='faint'>→</span> " + UI.m(commutes ? "+1" : "−1");
  }

  function badge(x, y, label, cls) {
    return "<g class='ice-badge " + cls + "'><rect x='" + (x - 14) + "' y='" + (y - 14) + "' width='28' height='28' rx='7'/>" +
      "<text x='" + x + "' y='" + (y + 5) + "' text-anchor='middle' style='font-family:var(--mono);font-size:13px;font-weight:600'>" + label + "</text></g>";
  }
  function registerSVG(o) {
    o = o || {};
    var xs = [130, 270, 410, 550], y = 120, r = 34;
    var s = "<svg class='ice' viewBox='0 0 680 240' role='img' aria-label='Four-qubit register with the two stabilizers'>";
    // stabilizer links
    s += "<line class='ice-link sz' x1='" + xs[0] + "' y1='" + (y - r - 18) + "' x2='" + xs[3] + "' y2='" + (y - r - 18) + "'/>";
    s += "<text class='ice-lbl sz' x='" + (xs[0] - 54) + "' y='" + (y - r - 14) + "'>S_Z</text>";
    s += "<line class='ice-link sx' x1='" + xs[0] + "' y1='" + (y + r + 18) + "' x2='" + xs[3] + "' y2='" + (y + r + 18) + "'/>";
    s += "<text class='ice-lbl sx' x='" + (xs[0] - 54) + "' y='" + (y + r + 22) + "'>S_X</text>";
    for (var q = 0; q < 4; q++) {
      s += "<line class='ice-link sz' x1='" + xs[q] + "' y1='" + (y - r) + "' x2='" + xs[q] + "' y2='" + (y - r - 18) + "'/>";
      s += "<line class='ice-link sx' x1='" + xs[q] + "' y1='" + (y + r) + "' x2='" + xs[q] + "' y2='" + (y + r + 18) + "'/>";
    }
    for (q = 0; q < 4; q++) {
      var sel = o.sel === q ? " sel" : "";
      var hl = (o.highlight && o.highlight.indexOf(q) >= 0) ? " hl" : "";
      s += "<circle class='ice-node" + sel + hl + "' cx='" + xs[q] + "' cy='" + y + "' r='" + r + "'/>";
      s += "<text class='ice-q' x='" + xs[q] + "' y='" + (y + 5) + "' text-anchor='middle'>q" + (q + 1) + "</text>";
      if (o.errors && o.errors[q]) s += badge(xs[q], y - r - 40, o.errors[q], "err");
      if (o.correction && o.correction[q]) s += badge(xs[q], y + r + 40, o.correction[q], "fix");
    }
    return s + "</svg>";
  }

  /* Compact editorial bar chart (rates in 0..1). */
  function barsSVG(items) {
    var W = 560, H = 230, pad = { l: 46, r: 16, t: 22, b: 46 };
    var plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
    var s = "<svg class='ice-bars' viewBox='0 0 " + W + " " + H + "' role='img' aria-label='Rate comparison chart'>";
    for (var g = 0; g <= 4; g++) {
      var y = pad.t + plotH * (1 - g / 4);
      s += "<line class='ice-bars-grid' x1='" + pad.l + "' y1='" + y + "' x2='" + (W - pad.r) + "' y2='" + y + "'/>";
      s += "<text class='ice-bars-lbl' x='" + (pad.l - 8) + "' y='" + (y + 4) + "' text-anchor='end'>" + (g * 25) + "%</text>";
    }
    var n = items.length, bw = Math.min(90, plotW / n * 0.5);
    items.forEach(function (it, i) {
      var cx = pad.l + plotW * (i + 0.5) / n, x = cx - bw / 2;
      var v = Math.max(0, Math.min(1, it.value)), h = v * plotH, y = pad.t + plotH - h;
      s += "<rect class='ice-bars-bar' x='" + x + "' y='" + y + "' width='" + bw + "' height='" + h + "' fill='" + it.color + "'/>";
      s += "<text class='ice-bars-val' x='" + cx + "' y='" + (y - 6) + "' text-anchor='middle'>" + (v * 100).toFixed(1) + "%</text>";
      s += "<text class='ice-bars-name' x='" + cx + "' y='" + (H - pad.b + 20) + "' text-anchor='middle'>" + it.label + "</text>";
    });
    return s + "</svg>";
  }

  /* ==================================================================
   * Cover
   * ================================================================== */
  var ROADMAP = [
    ["01", "Four Physical, Two Logical", "See how 16 physical states collapse to 4 code states.", "#/module-4/four-physical-two-logical"],
    ["02", "Detecting Quantum Errors", "Read the syndrome produced by a single error.", "#/module-4/detecting-errors"],
    ["03", "Why Can't We Correct Them?", "Detect an error and discover why its location is hidden.", "#/module-4/why-not-correct"],
    ["04", "The Postselection Experiment", "Discard detected runs and measure what survives.", "#/module-4/postselection"],
    ["05", "Break the Iceberg Code", "Find an undetectable logical error with two qubits.", "#/module-4/break-the-code"],
  ];
  function renderCover(root) {
    root.innerHTML = UI.moduleCover({
      backHref: "#/", backLabel: "All modules",
      label: "Module 3 — Quantum Error Correction",
      title: "Iceberg Code",
      sub: "Detecting Errors Without Correcting Them",
      deks: [
        "What if a quantum code can detect errors but cannot tell us how to correct them? Explore how four physical qubits can protect two logical qubits through error detection and postselection.",
        "The stabilizer code <span class='m'>[[4, 2, 2]]</span> shows the hidden part of the iceberg: an error can be visible yet leave its location below the waterline.",
      ],
      ctaHref: "#/module-4/four-physical-two-logical", ctaLabel: "Start Exploring \u2192",
      meta: "\u2248 15 min \u00b7 5 lessons, 1 challenge",
      figure: "<div class='cover-figure-panel'>" + registerSVG({}) + "</div>",
      lessons: ROADMAP.map(function (it) { return { num: it[0], title: it[1], desc: it[2], href: it[3] }; }),
    });
    return null;
  }

  /* ==================================================================
   * 01 · Four Physical, Two Logical
   * ================================================================== */
  function renderP1(root) {
    var sel = "00";
    root.innerHTML =
      "<div class='container'>" +
        UI.backLink("#/module-4", "Cover") +
        UI.pageHead("01", "The code space", "Four Physical, Two Logical", "How can four physical qubits encode two logical qubits?") +
        "<p class='dek' style='margin-top:16px'>Four physical qubits live in a 16-dimensional space. Two stabilizer constraints cut that down to four states — exactly enough for two logical qubits. Each logical basis state is a two-term superposition, not a copy of a physical qubit.</p>" +
        "<div class='grid-two' style='margin-top:32px'>" +
          "<div class='stack'>" +
            "<div class='panel'><h3>Choose a logical basis state</h3><div class='chip-row' id='m4-p1-states'></div>" +
              "<div style='margin-top:16px' id='m4-p1-expr'></div></div>" +
            "<div class='panel'><h3>Stabilizer check</h3><div id='m4-p1-stab'></div></div>" +
          "</div>" +
          "<div class='stack'>" +
            "<div class='panel'><h3>Register</h3><div id='m4-p1-reg'></div>" +
              "<p class='caption' style='margin-top:12px'>The two stabilizers act on all four qubits at once.</p></div>" +
            "<div class='panel'><h3>Hilbert-space dimension</h3><div class='grid3' id='m4-p1-dim'></div>" +
              "<p class='caption' style='margin-top:12px'>Each stabilizer halves the space; two constraints leave 2² = 4 code states.</p></div>" +
          "</div>" +
        "</div>" +
        UI.transition("02", "How can two stabilizers detect errors across four qubits?", "Each stabilizer is a parity check over all four qubits. Their joint outcome is the syndrome.", "#/module-4/detecting-errors", "Detect an error →") +
      "</div>";

    function update() {
      var entry = logicalByKey(sel);
      var state = Ice.encodeLogical(sel);
      var vals = Ice.stabilizerValues(state);
      UI.$sel("#m4-p1-states", root).innerHTML = Ice.LOGICAL.map(function (l) {
        return "<button class='chip" + (sel === l.key ? " active" : "") + "' type='button' data-k='" + l.key + "'>" + lsub(l.label) + "</button>";
      }).join("");
      UI.$sel("#m4-p1-expr", root).innerHTML =
        "<div class='eqbox'>" + logicalExprHTML(entry) + "</div>" +
        "<p class='caption' style='margin-top:10px'>Two computational states with equal amplitude. The logical value is stored in the <em>relationship</em> between qubits, not in any single one.</p>";
      UI.$sel("#m4-p1-stab", root).innerHTML =
        "<div class='cmp-row'><span class='caption'>S_X = X₁X₂X₃X₄</span>" + UI.m("<i>S</i><sub>X</sub> = " + (vals.sx === 1 ? "+1" : "−1")) + "</div>" +
        "<div class='cmp-row'><span class='caption'>S_Z = Z₁Z₂Z₃Z₄</span>" + UI.m("<i>S</i><sub>Z</sub> = " + (vals.sz === 1 ? "+1" : "−1")) + "</div>" +
        "<div style='margin-top:14px'>" + UI.notice("In the code space", (vals.sx === 1 && vals.sz === 1) ? "Both stabilizers return +1: this state lies in the code space." : "Not in the code space.") + "</div>";
      UI.$sel("#m4-p1-reg", root).innerHTML = registerSVG({});
      UI.$sel("#m4-p1-dim", root).innerHTML =
        UI.stat("Physical", "2⁴ = 16", "All four-qubit states") +
        UI.stat("S_X = +1", "16 / 2 = 8", "First constraint") +
        UI.stat("S_Z = +1", "8 / 2 = 4", "Two logical qubits");
      UI.$all("#m4-p1-states [data-k]", root).forEach(function (b) { b.addEventListener("click", function () { sel = b.getAttribute("data-k"); update(); }); });
    }
    update();
    return null;
  }

  /* ==================================================================
   * 02 · Detecting Quantum Errors
   * ================================================================== */
  function renderP2(root) {
    var st = { selQ: 0, error: "I", measured: false, ch: null, chChosen: null, chRevealed: false, expError: "X" };
    root.innerHTML =
      "<div class='container'>" +
        UI.backLink("#/module-4/four-physical-two-logical", "Four Physical, Two Logical") +
        UI.pageHead("02", "Error detection", "Detecting Quantum Errors", "How can two stabilizers detect errors across four qubits?") +
        "<p class='dek' style='margin-top:16px'>Measure the two stabilizers and read the syndrome. It is computed from Pauli commutation rules: <i>S</i><sub>X</sub> = X₁X₂X₃X₄ anticommutes with Y and Z, <i>S</i><sub>Z</sub> = Z₁Z₂Z₃Z₄ anticommutes with X and Y.</p>" +
        "<section class='grid-two' style='margin-top:32px'>" +
          "<div class='sticky-col'><div class='panel'><div id='m4-p2-reg'></div>" +
            "<div class='syndrome-strip' id='m4-p2-syn'></div></div></div>" +
          "<div class='stack'>" +
            "<div class='panel'><h3>Inject an error</h3><div class='chip-row' id='m4-p2-qubits'></div>" +
              "<div class='chip-row' id='m4-p2-paulis' style='margin-top:12px'></div>" +
              "<div class='toolbar' style='margin-top:14px'><button class='btn primary' id='m4-p2-measure'>Measure syndrome</button><button class='btn ghost' id='m4-p2-random'>Random error</button><button class='btn ghost' id='m4-p2-reset'>Reset</button></div></div>" +
            "<div class='panel'><h3>Read the syndrome</h3><div id='m4-p2-read'></div></div>" +
            "<div class='panel'><h3>Run on the backend</h3><div id='m4-p2-run'></div></div>" +
          "</div>" +
        "</section>" +
        "<div style='margin-top:64px'>" +
          "<h3 class='headline' style='font-size:1.5rem'>Why Does a Z Stabilizer Detect an X Error?</h3>" +
          "<p class='dek' style='margin-top:8px'>Stabilizers detect errors through commutation. If an error commutes with a stabilizer, its measurement sign stays the same. If it anticommutes, the sign flips.</p>" +
          "<div class='grid2' style='margin-top:20px'>" +
            "<div class='eqbox'>" + mx("[S, E] = 0 &nbsp;→&nbsp; sign unchanged") + "</div>" +
            "<div class='eqbox'>" + mx("{S, E} = 0 &nbsp;→&nbsp; sign flips") + "</div>" +
          "</div>" +
          "<p class='caption' style='margin-top:10px'>Every code state starts with stabilizer eigenvalue +1. An anticommuting error turns that sign into −1 — and that flipped sign <em>is</em> the syndrome.</p>" +
          "<div style='margin-top:20px'>" + UI.expandable("Step-by-step: X₁ against the Z-type stabilizer",
            "<div class='derive'>" +
              "<div class='cmp-row'><span class='caption'>1 · The Z-type stabilizer</span>" + mx("<i>S</i><sub>Z</sub> = Z₁Z₂Z₃Z₄") + "</div>" +
              "<div class='cmp-row'><span class='caption'>2 · Code state</span>" + mx("<i>S</i><sub>Z</sub>|ψ<sub>L</sub>⟩ = |ψ<sub>L</sub>⟩") + "</div>" +
              "<div class='cmp-row'><span class='caption'>3 · Apply the error</span>" + mx("|ψ′⟩ = X₁|ψ<sub>L</sub>⟩") + "</div>" +
              "<div class='cmp-row'><span class='caption'>4 · Anticommutation</span>" + mx("Z X = −X Z") + "</div>" +
              "<div class='cmp-row'><span class='caption'>5 · Push X₁ through</span>" + mx("<i>S</i><sub>Z</sub> X₁|ψ<sub>L</sub>⟩ = −X₁ <i>S</i><sub>Z</sub>|ψ<sub>L</sub>⟩") + "</div>" +
              "<div class='cmp-row'><span class='caption'>6 · Result</span>" + mx("<i>S</i><sub>Z</sub>|ψ′⟩ = −|ψ′⟩") + "</div>" +
              "<div style='margin-top:12px'>" + UI.keyIdea("Conclusion", "The Z-type stabilizer detects X because X anticommutes with Z. The negative sign is the error syndrome.") + "</div>" +
            "</div>") + "</div>" +
          "<div class='panel' style='margin-top:24px'><h3>Commutation explorer</h3>" +
            "<p class='caption'>Pick an error and watch which stabilizer sign flips.</p>" +
            "<div class='chip-row' id='m4-p2-exp-paulis' style='margin-top:12px'></div>" +
            "<div id='m4-p2-exp-out' style='margin-top:16px'></div>" +
          "</div>" +
          "<div style='margin-top:16px'>" + UI.notice("Terminology",
            "The <em>Z-type</em> stabilizer is built from Z operators and detects any error that anticommutes with it — such as a single X or Y error. Likewise, the <em>X-type</em> stabilizer detects errors that contain a Z component.") + "</div>" +
        "</div>" +
        "<div style='margin-top:64px'><h3 class='headline' style='font-size:1.5rem'>Challenge · identify the error type</h3>" +
          "<p class='dek' style='margin-top:8px'>A hidden error acts on one qubit. From the syndrome alone, name its <em>type</em>.</p>" +
          "<div class='panel' style='margin-top:24px'><div id='m4-p2-challenge'></div></div></div>" +
        UI.transition("03", "If we can detect an error, why can't we always correct it?", "The syndrome reveals the type of error — but not where it happened.", "#/module-4/why-not-correct", "Confront the wall →") +
      "</div>";

    function frame() { return Ice.frameFromErrors(st.error === "I" ? [] : [{ q: st.selQ, pauli: st.error }]); }

    function update() {
      UI.$sel("#m4-p2-qubits", root).innerHTML = [0, 1, 2, 3].map(function (q) {
        return "<button class='chip" + (st.selQ === q ? " active" : "") + "' type='button' data-q='" + q + "'>q" + (q + 1) + "</button>";
      }).join("");
      UI.$sel("#m4-p2-paulis", root).innerHTML = ["I", "X", "Y", "Z"].map(function (p) {
        return "<button class='chip" + (st.error === p ? " active" : "") + "' type='button' data-p='" + p + "'>" + (p === "I" ? "none" : p) + "</button>";
      }).join("");
      UI.$sel("#m4-p2-reg", root).innerHTML = registerSVG({ sel: st.selQ, errors: st.measured ? (function () { var e = []; if (st.error !== "I") e[st.selQ] = st.error; return e; })() : null });
      var f = frame();
      UI.$sel("#m4-p2-syn", root).innerHTML = st.measured
        ? "<b>Syndrome</b> " + syndromeHTML(f) + "<span class='sy'>" + (Ice.inNormalizer(f) ? "no error detected" : "error detected") + "</span>"
        : "<span class='caption'>Press “Measure syndrome”.</span>";
      if (st.measured) {
        var c = Ice.classify(f);
        var t = typeFromSyndrome(c.sx, c.sz);
        var typeText = t === "I" ? "none" : t + " error";
        var byCheck = t === "X" ? "Z-type check" : t === "Z" ? "X-type check" : t === "Y" ? "both checks" : "—";
        UI.$sel("#m4-p2-read", root).innerHTML =
          "<div class='cmp-row'><span class='caption'>Syndrome</span>" + syndromeHTML(f) + "</div>" +
          "<div class='cmp-row'><span class='caption'>Detected</span>" + UI.m(c.detected ? "yes" : "no") + "</div>" +
          "<div class='cmp-row'><span class='caption'>Error type</span>" + UI.m(typeText) + "</div>" +
          (t === "I" ? "" : "<div class='cmp-row'><span class='caption'>Sign flipped by</span>" + UI.m(byCheck) + "</div>") +
          UI.notice("What the syndrome tells you", "It reveals the error <em>type</em>, never the location: every qubit carrying the same Pauli yields this identical syndrome.");
      } else {
        UI.$sel("#m4-p2-read", root).innerHTML = "<p class='caption'>No measurement yet.</p>";
      }
      UI.$all("#m4-p2-qubits [data-q]", root).forEach(function (b) { b.addEventListener("click", function () { st.selQ = Number(b.getAttribute("data-q")); st.measured = false; update(); }); });
      UI.$all("#m4-p2-paulis [data-p]", root).forEach(function (b) { b.addEventListener("click", function () { st.error = b.getAttribute("data-p"); st.measured = false; update(); }); });
      updateExplorer();
      updateChallenge();
    }

    function updateExplorer() {
      UI.$sel("#m4-p2-exp-paulis", root).innerHTML = ["X", "Y", "Z"].map(function (p) {
        return "<button class='chip" + (st.expError === p ? " active" : "") + "' type='button' data-exp='" + p + "'>" + p + " error</button>";
      }).join("");
      var f = Ice.frameFromErrors([{ q: 0, pauli: st.expError }]);
      var s = Ice.syndrome(f);
      UI.$sel("#m4-p2-exp-out", root).innerHTML =
        "<div class='cmp-row'><span class='caption'>" + mx("<i>S</i><sub>X</sub> = X₁X₂X₃X₄") + "</span>" + commTag(s.sx === 1) + "</div>" +
        "<div class='cmp-row'><span class='caption'>" + mx("<i>S</i><sub>Z</sub> = Z₁Z₂Z₃Z₄") + "</span>" + commTag(s.sz === 1) + "</div>" +
        "<div style='margin-top:12px'>" + UI.keyIdea("Why", COMM_EXPLAIN[st.expError]) + "</div>";
      UI.$all("#m4-p2-exp-paulis [data-exp]", root).forEach(function (b) {
        b.addEventListener("click", function () { st.expError = b.getAttribute("data-exp"); updateExplorer(); });
      });
    }

    function updateChallenge() {
      if (!st.ch) return;
      var f = Ice.frameFromErrors(st.ch.error === "I" ? [] : [{ q: st.ch.q, pauli: st.ch.error }]);
      var s = Ice.syndrome(f);
      var cap = commutationReason(s.sx, s.sz) + ((s.sx === 1 && s.sz === 1) ? "" : " The syndrome fixes the type, not the qubit.");
      UI.$sel("#m4-p2-challenge", root).innerHTML =
        "<div style='display:flex;flex-direction:column;gap:6px'>" +
          "<span class='caption'>Measured syndrome</span>" +
          "<span style='font-size:1.05rem'>" + syndromeHTML(f) + "</span>" +
        "</div>" +
        "<p class='caption' style='margin:16px 0 8px'>Which type of error produced it?</p>" +
        "<div class='chip-row'>" + ["I", "X", "Y", "Z"].map(function (p) {
          var active = st.chChosen === p;
          var cls = "chip" + (active ? " active" : "");
          if (st.chRevealed) {
            if (p === st.ch.error) cls = "chip active";
          }
          return "<button class='" + cls + "' type='button' data-ch='" + p + "'" + (st.chRevealed ? " disabled" : "") + ">" + (p === "I" ? "none" : p) + "</button>";
        }).join("") + "</div>" +
        (st.chRevealed
          ? "<div class='feedback " + (st.chChosen === st.ch.error ? "ok" : "no") + "' style='margin-top:14px'>" + (st.chChosen === st.ch.error ? "✓ Correct." : "✗ Not quite.") +
            "<span class='cap'>" + cap + "</span></div>" +
            "<div class='toolbar' style='margin-top:12px'><button class='btn' id='m4-p2-ch-new'>New challenge</button></div>"
          : "") ;
      UI.$all("#m4-p2-challenge [data-ch]", root).forEach(function (b) {
        b.addEventListener("click", function () {
          if (st.chRevealed) return;
          st.chChosen = b.getAttribute("data-ch"); st.chRevealed = true; updateChallenge();
        });
      });
      var nb = UI.$sel("#m4-p2-ch-new", root); if (nb) nb.addEventListener("click", newChallenge);
    }
    function newChallenge() {
      var paulis = ["I", "X", "Y", "Z"];
      st.ch = { q: Math.floor(Math.random() * 4), error: paulis[Math.floor(Math.random() * 4)] };
      st.chChosen = null; st.chRevealed = false; updateChallenge();
    }

    UI.$sel("#m4-p2-measure", root).addEventListener("click", function () { st.measured = true; update(); });
    UI.$sel("#m4-p2-random", root).addEventListener("click", function () {
      st.selQ = Math.floor(Math.random() * 4);
      st.error = ["X", "Y", "Z"][Math.floor(Math.random() * 3)];
      st.measured = true; update();
    });
    UI.$sel("#m4-p2-reset", root).addEventListener("click", function () { st.error = "I"; st.measured = false; update(); });
    newChallenge();

    /* Run the real [[4,2,2]] detection circuit for the error chosen above. */
    function dominantBits(counts) {
      var best = null, bestN = -1;
      Object.keys(counts || {}).forEach(function (k) { if (counts[k] > bestN) { bestN = counts[k]; best = k; } });
      return best ? best.split("").reverse().map(Number) : [];
    }
    function mountIcebergRun() {
      var host = UI.$sel("#m4-p2-run", root);
      host.innerHTML =
        "<p class='caption'>The code state is the four-qubit GHZ (|0000⟩ + |1111⟩)/√2, a +1 eigenstate of both checks. Run the real circuit with the error you selected and read S_X and S_Z.</p>" +
        "<div id='m4-p2-run-card' style='margin-top:12px'></div>";
      window.CircuitRun.mount(UI.$sel("#m4-p2-run-card", root), {
        model: "iceberg",
        label: "Run one job",
        options: function () {
          return st.error === "I" ? {} : { errorQubit: st.selQ, errorPauli: st.error };
        },
        onResult: function (result, out) {
          var bits = dominantBits(result.counts);
          if (bits.length < 6) return;
          var sx = bits[4], sz = bits[5];
          var msg = (sx && sz) ? "Both checks fired — a Y-type error."
            : sz ? "S_Z fired — an X-type error (Z commutes with X, but S_Z anticommutes)."
            : sx ? "S_X fired — a Z-type error."
            : "No check fired: the error is undetectable at this level (or none was injected).";
          out.insertAdjacentHTML("beforeend",
            "<div class='cmp-row' style='margin-top:10px'><span class='caption'>Measured checks</span>" +
            UI.m("S_X = " + (sx ? "−1" : "+1") + ", S_Z = " + (sz ? "−1" : "+1")) + "</div>" +
            "<p class='caption' style='margin-top:6px'>" + msg + "</p>");
        }
      });
    }

    update();
    mountIcebergRun();
    return null;
  }

  /* ==================================================================
   * 03 · Why Can't We Correct Them?
   * ================================================================== */
  function renderP3(root) {
    var st = { hidden: Math.floor(Math.random() * 4), chosen: null, applied: false, ok: false, residual: null, score: { correct: 0, total: 0 } };
    root.innerHTML =
      "<div class='container'>" +
        UI.backLink("#/module-4/detecting-errors", "Detecting Quantum Errors") +
        UI.pageHead("03", "The decoding wall", "Why Can't We Correct Them?", "If we can detect an error, why can't we always correct it?") +
        "<p class='dek' style='margin-top:16px'>A hidden X error is injected into one of the four qubits. All four possible locations produce the <em>same</em> syndrome, so the syndrome cannot tell you where the error is. Choose a correction and find out what happens.</p>" +
        "<section class='grid-two' style='margin-top:32px'>" +
          "<div class='sticky-col'><div class='panel'><div id='m4-p3-reg'></div>" +
            "<div class='syndrome-strip' id='m4-p3-syn'></div></div></div>" +
          "<div class='stack'>" +
            "<div class='panel'><h3>Choose a correction</h3><div class='chip-row' id='m4-p3-corrections'></div>" +
              "<div class='toolbar' style='margin-top:14px'><button class='btn primary' id='m4-p3-apply' disabled>Apply correction</button><button class='btn ghost' id='m4-p3-new'>New error</button></div></div>" +
            "<div id='m4-p3-result'></div>" +
          "</div>" +
        "</section>" +
        "<div class='panel' style='margin-top:24px'><h3>All four locations, one syndrome</h3>" +
          "<div id='m4-p3-table'></div>" +
          "<p class='caption' style='margin-top:10px'>X₁, X₂, X₃ and X₄ are indistinguishable from the syndrome. A single-qubit correction is therefore a guess.</p></div>" +
        UI.transition("04", "What if we discard runs where errors are detected?", "Postselection keeps only the runs that stay in the code space — at the cost of throwing data away.", "#/module-4/postselection", "Run the experiment →") +
      "</div>";

    function errorFrame() { return Ice.frameFromErrors([{ q: st.hidden, pauli: "X" }]); }

    function update() {
      var err = errorFrame();
      UI.$sel("#m4-p3-reg", root).innerHTML = registerSVG({
        sel: st.applied ? st.chosen : null,
        errors: st.applied ? (function () { var e = []; e[st.hidden] = "X"; return e; })() : null,
        correction: st.applied && st.chosen != null ? (function () { var c = []; c[st.chosen] = "X"; return c; })() : null,
      });
      UI.$sel("#m4-p3-syn", root).innerHTML = "<b>Syndrome</b> " + syndromeHTML(err) + "<span class='sy'>error detected</span>";
      UI.$sel("#m4-p3-corrections", root).innerHTML = [0, 1, 2, 3].map(function (q) {
        return "<button class='chip" + (st.chosen === q ? " active" : "") + "' type='button' data-c='" + q + "'" + (st.applied ? " disabled" : "") + ">Correct with X" + SUB[q] + "</button>";
      }).join("");
      UI.$sel("#m4-p3-apply", root).disabled = st.chosen == null || st.applied;
      UI.$all("#m4-p3-corrections [data-c]", root).forEach(function (b) { b.addEventListener("click", function () { if (!st.applied) { st.chosen = Number(b.getAttribute("data-c")); update(); } }); });

      if (st.applied) {
        var corrFrame = Ice.frameFromErrors([{ q: st.chosen, pauli: "X" }]);
        var res = Ice.residual(err, corrFrame);
        var recovered = Ice.recovered(err, corrFrame);
        var cls = Ice.classify(res);
        st.residual = res; st.ok = recovered;
        var stateA = Ice.applyFrame(Ice.encodeLogical("00"), err);
        var stateB = Ice.applyFrame(stateA, corrFrame);
        var stateCheck = Ice.sameUpToPhase(Ice.encodeLogical("00"), stateB);
        UI.$sel("#m4-p3-result", root).innerHTML =
          "<div class='panel' style='border-color:" + (recovered ? "var(--good)" : "var(--bad)") + "'>" +
            "<p role='status' style='margin:0 0 12px;font-weight:600;color:" + (recovered ? "var(--good)" : "var(--bad)") + "'>" + (recovered ? "✓ Recovered" : "✗ Logical failure") + "</p>" +
            UI.fieldRow("Actual error (revealed)", frameHTML(err)) +
            UI.fieldRow("Applied correction", frameHTML(corrFrame)) +
            UI.fieldRow("Residual operator", frameHTML(res)) +
            UI.fieldRow("Residual kind", UI.m(cls.kind)) +
            UI.fieldRow("Logical state |00⟩<sub>L</sub>", UI.m(stateCheck ? "preserved" : "corrupted")) +
            "<p class='caption' style='margin-top:12px'>" + (recovered
              ? "The applied X cancels the original X (X" + SUB[st.chosen] + " X" + SUB[st.hidden] + " = I). The residual is the identity, so the logical information is recovered."
              : "The stabilizers return +1, but a nontrivial logical operation " + Ice.describeFrame(res) + " remains. The logical information was not recovered.") + "</p>" +
            "<div style='margin-top:16px'>" + UI.notice("The fundamental limitation",
              "The syndrome is identical for X₁, X₂, X₃ and X₄. No correction location can be inferred from these measurements alone.") + "</div>" +
            "<ul class='bullets' style='margin-top:12px'>" +
              "<li>The syndrome identifies the error <em>type</em> under the single-error assumption.</li>" +
              "<li>It does not identify the affected qubit.</li>" +
              "<li>Choosing a correction is therefore a guess.</li>" +
              "<li>An incorrect correction can leave an undetectable logical error.</li>" +
            "</ul>" +
            "<div class='toolbar' style='margin-top:14px'><button class='btn primary' id='m4-p3-next'>New error</button></div>" +
          "</div>";
        UI.$sel("#m4-p3-next", root).addEventListener("click", newError);
      } else {
        UI.$sel("#m4-p3-result", root).innerHTML = "";
      }

      UI.$sel("#m4-p3-table", root).innerHTML = [0, 1, 2, 3].map(function (q) {
        var f = Ice.frameFromErrors([{ q: q, pauli: "X" }]);
        return "<div class='cmp-row'><span class='caption'>X" + SUB[q] + " on q" + (q + 1) + "</span>" + syndromeHTML(f) + "</div>";
      }).join("");
    }

    function newError() { st.hidden = Math.floor(Math.random() * 4); st.chosen = null; st.applied = false; st.ok = false; update(); }
    UI.$sel("#m4-p3-apply", root).addEventListener("click", function () {
      if (st.chosen == null || st.applied) return;
      st.applied = true;
      st.score.total++;
      update();
      if (st.ok) st.score.correct++;
    });
    UI.$sel("#m4-p3-new", root).addEventListener("click", newError);
    update();
    return null;
  }

  /* ==================================================================
   * 04 · The Postselection Experiment
   * ================================================================== */
  function renderP4(root) {
    var st = { p: 0.1, model: "x", trials: 1000, postselect: true, result: null };
    root.innerHTML =
      "<div class='container'>" +
        UI.backLink("#/module-4/why-not-correct", "Why Can't We Correct Them?") +
        UI.pageHead("04", "Postselection", "The Postselection Experiment", "What if we discard runs where errors are detected?") +
        "<p class='dek' style='margin-top:16px'>Run a local Monte Carlo experiment on the code. Each trial applies independent Pauli noise to the four qubits. If postselection is on, runs with a detected error are discarded; we then look at the logical error rate among the runs that survive.</p>" +
        "<section class='grid-two' style='margin-top:32px'>" +
          "<div class='sticky-col'><div class='panel'><h3>Setup</h3><div id='m4-p4-controls'></div></div></div>" +
          "<div class='stack'><div class='panel'><h3>Results</h3><div class='grid2' id='m4-p4-stats'></div>" +
            "<div id='m4-p4-extra' style='margin-top:16px'></div>" +
            "<div id='m4-p4-aer-out' style='margin-top:16px'></div></div></div>" +
        "</section>" +
        "<div style='margin-top:24px' id='m4-p4-note'></div>" +
        UI.transition("05", "Can an error change logical information without being detected?", "If detection is not correction, some errors must slip through unseen. Find one.", "#/module-4/break-the-code", "Break the code →") +
      "</div>";

    function controls() {
      return UI.rangeSlider({ id: "m4-p4-p", label: "Physical error probability p", value: st.p, min: 0, max: 0.5, step: 0.01, display: st.p.toFixed(2) }) +
        "<div class='step'><span class='caption'>Noise model</span><div class='chip-row' style='margin-top:8px'>" +
          ["x", "z", "depol"].map(function (m) { return "<button class='chip" + (st.model === m ? " active" : "") + "' type='button' data-model='" + m + "'>" + Ice.MODELS[m].label + "</button>"; }).join("") + "</div>" +
          "<p class='caption' style='margin-top:8px'>" + Ice.MODELS[st.model].hint + "</p></div>" +
        "<div class='step'><span class='caption'>Trials</span><div class='chip-row' style='margin-top:8px'>" +
          [200, 1000, 5000].map(function (t) { return "<button class='chip" + (st.trials === t ? " active" : "") + "' type='button' data-trials='" + t + "'>" + t + "</button>"; }).join("") + "</div></div>" +
        "<div class='step'><span class='caption'>Postselection</span><div class='chip-row' style='margin-top:8px'>" +
          "<button class='chip" + (st.postselect ? " active" : "") + "' type='button' data-ps='on'>On</button>" +
          "<button class='chip" + (!st.postselect ? " active" : "") + "' type='button' data-ps='off'>Off</button></div></div>" +
        "<div class='toolbar' style='margin-top:16px'><button class='btn primary' id='m4-p4-run'>Run experiment</button><button class='btn' id='m4-p4-aer'>Run on a backend (in-circuit noise)</button></div>";
    }

    function statsHTML() {
      if (!st.result) return "<div class='caption' style='grid-column:1/-1'>Run the experiment to collect statistics.</div>";
      var r = st.result;
      return UI.stat("Total runs", String(r.total), "Trials simulated") +
        UI.stat("Accepted", String(r.accepted), r.rejected + " rejected") +
        UI.stat("Acceptance", (r.pAccept * 100).toFixed(1) + "%", "N_accepted / N_total", "var(--accent)") +
        UI.stat("Detected", (100 * r.detected / r.total).toFixed(1) + "%", "Runs with a syndrome") +
        UI.stat("Logical errors (accepted)", String(r.logicalAccepted), "Undetectable logical ops") +
        UI.stat("Logical error rate", (r.logicalRate * 100).toFixed(2) + "%", "Among accepted runs", "var(--bad)");
    }

    function update() {
      UI.$sel("#m4-p4-controls", root).innerHTML = controls();
      UI.$sel("#m4-p4-stats", root).innerHTML = statsHTML();
      UI.$sel("#m4-p4-extra", root).innerHTML = st.result
        ? "<div class='cmp-row'><span class='caption'>Exact expectation (all 4⁴ frames)</span><span class='m'>accept " + (100 * Ice.exact(st.p, st.model).pAccept).toFixed(1) + "% · logical|accepted " + (100 * Ice.exact(st.p, st.model).logicalRate).toFixed(2) + "%</span></div>"
        : "";
      UI.$sel("#m4-p4-note", root).innerHTML = UI.keyIdea("Read carefully",
        "Postselection keeps only runs whose state stays in the code space — a real improvement in sample quality — but it throws data away. An accepted run is <em>not</em> a guarantee of success: a weight-two logical operator has a trivial syndrome and slips through unnoticed.");
      // wiring
      var p = UI.$sel("#m4-p4-p", root); if (p) p.addEventListener("input", function (e) { st.p = Number(e.target.value); update(); });
      UI.$all("#m4-p4-controls [data-model]", root).forEach(function (b) { b.addEventListener("click", function () { st.model = b.getAttribute("data-model"); update(); }); });
      UI.$all("#m4-p4-controls [data-trials]", root).forEach(function (b) { b.addEventListener("click", function () { st.trials = Number(b.getAttribute("data-trials")); update(); }); });
      UI.$all("#m4-p4-controls [data-ps]", root).forEach(function (b) { b.addEventListener("click", function () { st.postselect = b.getAttribute("data-ps") === "on"; update(); }); });
      UI.$sel("#m4-p4-run", root).addEventListener("click", function () { st.result = Ice.monteCarlo(st.p, st.model, st.trials, st.postselect); update(); });
      UI.$sel("#m4-p4-aer", root).addEventListener("click", runAerP4);
    }
    /* One real backend job using the noise model and p chosen above. */
    function runAerP4() {
      var out = UI.$sel("#m4-p4-aer-out", root);
      var btn = UI.$sel("#m4-p4-aer", root);
      if (!window.CircuitRun.available()) {
        out.innerHTML = "<div class='notice'><p>Run inside Qollab to execute this circuit on a backend.</p></div>";
        return;
      }
      btn.disabled = true;
      out.innerHTML = "<p class='caption'>Submitting…</p>";
      window.CircuitRun.runNoisy({ model: "iceberg", channel: st.model, p: st.p, shots: 2048 }).then(function (res) {
        var ex = Ice.exact(res.p, res.channel);
        out.innerHTML =
          "<div class='notice' style='margin-top:12px'><p><b>Protected:</b> " + res.protected + "</p></div>" +
          "<p class='caption' style='margin-top:8px'>Ran on the Qollab backend" + (res.backend ? " (" + res.backend + ")" : "") + " · " +
            (res.mode === "backend" ? "device noise model" : "ideal circuit, noise injected with Aer") + ".</p>" +
          "<div class='grid-two' style='margin-top:12px'>" +
            "<div><div class='caption'>" + (res.mode === "backend" ? "Noise-free reference (Aer)" : "Noise-free circuit (Qollab)") + " · detected " + Math.round(100 * res.ideal.detected) + "%</div>" + window.CircuitRun.barsHTML(res.ideal.counts, 4) + "</div>" +
            "<div><div class='caption'>" + (res.mode === "backend" ? "Noisy circuit (device)" : "Noisy circuit (injected)") + " · detected " + Math.round(100 * res.noisy.detected) + "%</div>" + window.CircuitRun.barsHTML(res.noisy.counts, 4) + "</div>" +
          "</div>" +
          "<div class='cmp-row' style='margin-top:12px'><span class='caption'>Postselection acceptance</span><span class='m'>" + (100 * ex.pAccept).toFixed(1) + "%</span></div>" +
          "<div class='cmp-row'><span class='caption'>Logical error among accepted</span><span class='m'>" + (100 * ex.logicalRate).toFixed(2) + "%</span></div>" +
          (res.citations && res.citations.length
            ? "<details class='expand' style='margin-top:12px'><summary>Noise models &amp; references</summary><div>" + res.citations.map(function (c) { return "<div class='caption' style='margin-top:4px'>" + c + "</div>"; }).join("") + "</div></details>"
            : "");
      }).catch(function (err) {
        out.innerHTML = "<div class='notice'><p>" + ((err && err.message) || err) + "</p></div>";
      }).then(function () { btn.disabled = false; });
    }
    update();
    return null;
  }

  /* ==================================================================
   * 05 · Break the Iceberg Code (+ final knowledge check)
   * ================================================================== */
  function renderP5(root) {
    var st = { frame: "IIII" };
    var quiz = IQ.createState();

    root.innerHTML =
      "<div class='container'>" +
        UI.backLink("#/module-4/postselection", "The Postselection Experiment") +
        UI.pageHead("05", "Code distance", "Break the Iceberg Code", "Can an error change logical information without being detected?") +
        "<p class='dek' style='margin-top:16px'>First build a specific Pauli operator and inspect it. Then let random noise act, and compare what the code <em>sees</em> with what actually happened. The code distance is <span class='m'>d = 2</span>: the lightest nontrivial logical operator touches two qubits — light enough to be invisible to the syndrome.</p>" +
        "<div style='margin-top:40px'><span class='eyebrow' style='color:var(--faint)'>Part A · A specific operator</span>" +
          "<h3 class='headline' style='margin-top:8px;font-size:1.5rem'>Construct a specific operator</h3></div>" +
        "<section class='grid-two' style='margin-top:24px'>" +
          "<div class='sticky-col'><div class='panel'><h3>Operator</h3><div id='m4-p5-reg'></div>" +
            "<div id='m4-p5-frame' style='margin-top:14px'></div>" +
            "<div id='m4-p5-stab' style='margin-top:12px'></div>" +
            "<div class='grid2' style='margin-top:12px' id='m4-p5-class'></div>" +
            "<div id='m4-p5-interp' style='margin-top:12px'></div></div></div>" +
          "<div class='stack'>" +
            "<div class='panel'><h3>Build the operator</h3><div id='m4-p5-controls'></div>" +
              "<div class='toolbar' style='margin-top:14px'><button class='btn ghost' id='m4-p5-example'>Example: X₁X₂</button><button class='btn ghost' id='m4-p5-clear'>Clear</button></div></div>" +
            "<div class='panel'><h3>Challenge</h3><div id='m4-p5-challenge'></div></div>" +
          "</div>" +
        "</section>" +
        "<div style='margin-top:64px'><span class='eyebrow' style='color:var(--faint)'>Part B · Random noise</span>" +
          "<h3 class='headline' style='margin-top:8px;font-size:1.5rem'>Noise under the iceberg</h3>" +
          "<p class='dek' style='margin-top:8px'>If physical errors happen at random, how often does the code actually detect them?</p></div>" +
        "<section class='grid-two' style='margin-top:24px'>" +
          "<div class='sticky-col'><div class='panel'><h3>Setup</h3><div id='m4-p5-noise-controls'></div></div></div>" +
          "<div class='stack'><div class='panel'><h3>Results</h3><div class='grid2' id='m4-p5-noise-stats'></div>" +
            "<div id='m4-p5-noise-chart' style='margin-top:16px'></div></div></div>" +
        "</section>" +
        "<div style='margin-top:16px' id='m4-p5-noise-note'></div>" +
        "<section id='m4-p5-quiz' style='margin-top:64px'></section>" +
        UI.transition("M2", "Where does this go next?", "You have seen detection without correction. Larger codes trade qubits for distance, and decoding becomes a real optimisation problem.", "#/module-2", "Revisit the Shor code →") +
      "</div>";

    function updateControls() {
      UI.$sel("#m4-p5-controls", root).innerHTML = [0, 1, 2, 3].map(function (q) {
        return "<div class='step'><span class='caption'>qubit q" + (q + 1) + "</span><div class='chip-row' style='margin-top:8px'>" +
          ["I", "X", "Y", "Z"].map(function (p) {
            return "<button class='chip" + (st.frame[q] === p ? " active" : "") + "' type='button' data-q='" + q + "' data-p='" + p + "'>" + (p === "I" ? "I" : p) + "</button>";
          }).join("") + "</div></div>";
      }).join("");
      UI.$all("#m4-p5-controls [data-q]", root).forEach(function (b) {
        b.addEventListener("click", function () {
          var q = Number(b.getAttribute("data-q")), p = b.getAttribute("data-p");
          var arr = st.frame.split(""); arr[q] = p; st.frame = arr.join(""); update();
        });
      });
    }

    function update() {
      updateControls();
      var f = st.frame, c = Ice.classify(f), s = Ice.syndrome(f);
      var affected = [], badges = [];
      for (var q = 0; q < 4; q++) if (f[q] !== "I") { affected.push(q); badges[q] = f[q]; }
      UI.$sel("#m4-p5-reg", root).innerHTML = registerSVG({ errors: badges.length ? badges : null, highlight: affected });
      UI.$sel("#m4-p5-frame", root).innerHTML =
        "<div class='eqbox'>" + frameHTML(f) + "</div>" +
        "<div class='cmp-row' style='margin-top:12px'><span class='caption'>Weight</span>" + UI.m(String(c.weight)) + "</div>" +
        "<div class='cmp-row'><span class='caption'>Syndrome</span>" + syndromeHTML(f) + "</div>";
      UI.$sel("#m4-p5-stab", root).innerHTML =
        "<div class='cmp-row'><span class='caption'>" + mx("<i>S</i><sub>X</sub> = X₁X₂X₃X₄") + "</span>" + commTag(s.sx === 1) + "</div>" +
        "<div class='cmp-row'><span class='caption'>" + mx("<i>S</i><sub>Z</sub> = Z₁Z₂Z₃Z₄") + "</span>" + commTag(s.sz === 1) + "</div>";
      UI.$sel("#m4-p5-class", root).innerHTML =
        UI.stat("Detected", c.detected ? "yes" : "no", c.detected ? "nontrivial syndrome" : "trivial syndrome", c.detected ? "var(--amber)" : "var(--good)") +
        UI.stat("Nontrivial logical", c.logical ? "yes" : "no", c.logical ? "invisible logical op" : "—", c.logical ? "var(--bad)" : undefined);
      UI.$sel("#m4-p5-interp", root).innerHTML =
        c.kind === "identity" ? UI.notice("Neutral · identity", "No operator applied. The register is untouched.")
        : c.kind === "stabilizer" ? UI.notice("Stabilizer", "An element of the stabilizer group: it acts as the identity on the code space.")
        : c.kind === "logical" ? UI.notice("Undetectable logical operator", "A trivial syndrome, yet it changes the logical information — a weight-" + c.weight + " logical error, invisible to both stabilizers.")
        : UI.notice("Detected physical error", "The syndrome is nontrivial, so the error is detected — but its location is still hidden.");

      var found = c.weight === 2 && c.logical;
      UI.$sel("#m4-p5-challenge", root).innerHTML =
        "<p class='caption'>Find an undetectable logical error using only <strong>two</strong> physical qubits.</p>" +
        "<div class='feedback " + (found ? "ok" : "") + "' style='margin-top:12px'>" + (found
          ? "✓ Found one: " + frameHTML(f) + " has weight 2, a trivial syndrome, and acts nontrivially on the logical qubits."
          : "Not yet. Try two Paulis of the same type on two different qubits — for instance X₁X₂, Z₁Z₂ or Y₁Y₂.") + "</div>";
    }

    UI.$sel("#m4-p5-example", root).addEventListener("click", function () { st.frame = "XXII"; update(); });
    UI.$sel("#m4-p5-clear", root).addEventListener("click", function () { st.frame = "IIII"; update(); });
    update();

    /* ---- Part B · Random noise explorer ---- */
    var nz = { p: 0.1, model: "x", trials: 1000, mode: "independent", result: null };

    function noiseControlsHTML() {
      return UI.rangeSlider({ id: "m4-p5-nz-p", label: "Physical error probability p", value: nz.p, min: 0, max: 0.5, step: 0.01, display: nz.p.toFixed(2) }) +
        "<div class='step'><span class='caption'>Noise model</span><div class='chip-row' style='margin-top:8px'>" +
          ["x", "z", "depol"].map(function (m) { return "<button class='chip" + (nz.model === m ? " active" : "") + "' type='button' data-nzmodel='" + m + "'>" + Ice.MODELS[m].label + "</button>"; }).join("") +
        "</div><p class='caption' style='margin-top:8px'>" + Ice.MODELS[nz.model].hint + "</p></div>" +
        "<div class='step'><span class='caption'>Simulation size</span><div class='chip-row' style='margin-top:8px'>" +
          [100, 1000, 10000].map(function (t) { return "<button class='chip" + (nz.trials === t ? " active" : "") + "' type='button' data-nztrials='" + t + "'>" + t.toLocaleString("en-US") + "</button>"; }).join("") +
        "</div></div>" +
        "<div class='step'><span class='caption'>Noise mode</span><div class='chip-row' style='margin-top:8px'>" +
          "<button class='chip" + (nz.mode === "independent" ? " active" : "") + "' type='button' data-nzmode='independent'>Independent qubits</button>" +
          "<button class='chip" + (nz.mode === "single" ? " active" : "") + "' type='button' data-nzmode='single'>Single qubit</button></div>" +
          "<p class='caption' style='margin-top:8px'>" + (nz.mode === "independent" ? "Each of the four qubits is hit independently with probability p." : "At most one qubit is hit per trial (chosen uniformly).") + "</p></div>" +
        "<div class='toolbar' style='margin-top:16px'><button class='btn primary' id='m4-p5-nz-run'>Run simulation</button></div>";
    }
    function noiseStatsHTML() {
      if (!nz.result) return "<div class='caption' style='grid-column:1/-1'>Run the simulation to collect statistics.</div>";
      var r = nz.result;
      return UI.stat("Physical error events", (r.physicalRate * 100).toFixed(1) + "%", r.physical + " of " + r.total + " trials") +
        UI.stat("Detected syndrome rate", (r.detectedRate * 100).toFixed(1) + "%", "P_det · " + r.detected + " trials", "var(--accent)") +
        UI.stat("Undetected rate", (r.undetectedRate * 100).toFixed(1) + "%", "P_undet · trivial syndrome") +
        UI.stat("Undetected logical error rate", (r.logicalUndetectedRate * 100).toFixed(2) + "%", r.logicalUndetected + " trials", "var(--bad)");
    }
    function noiseNoteHTML() {
      var ex = Ice.exactNoise(nz.p, nz.model, nz.mode);
      return UI.keyIdea("Physical error rate vs detected rate",
        "The physical error rate tells us how often noise hits the qubits. The detected rate tells us how often the stabilizers raise an alarm. These are not the same thing.") +
        "<ul class='bullets' style='margin-top:12px'>" +
          "<li>A nontrivial syndrome means the code <em>detected</em> an error.</li>" +
          "<li>A trivial syndrome does not always mean no physical error occurred.</li>" +
          "<li>Some multi-qubit physical errors remain invisible to the syndrome.</li>" +
          "<li>Because d = 2, all single-qubit Pauli errors are detectable, but some weight-2 operators are undetectable logical errors.</li>" +
        "</ul>" +
        "<div class='cmp-row' style='margin-top:14px'><span class='caption'>Exact expectation</span><span class='m'>physical " +
          (ex.physicalRate * 100).toFixed(1) + "% · detected " + (ex.detectedRate * 100).toFixed(1) + "% · undetected logical " + (ex.logicalUndetectedRate * 100).toFixed(2) + "%</span></div>";
    }
    function renderResults() {
      UI.$sel("#m4-p5-noise-stats", root).innerHTML = noiseStatsHTML();
      UI.$sel("#m4-p5-noise-chart", root).innerHTML = nz.result ? barsSVG([
        { label: "Physical", value: nz.result.physicalRate, color: "var(--accent-2)" },
        { label: "Detected", value: nz.result.detectedRate, color: "var(--accent)" },
        { label: "Undetected logical", value: nz.result.logicalUndetectedRate, color: "var(--bad)" },
      ]) : "";
      UI.$sel("#m4-p5-noise-note", root).innerHTML = noiseNoteHTML();
    }
    function runNoise() { nz.result = Ice.noiseStats(nz.p, nz.model, nz.trials, nz.mode); renderResults(); }
    function renderControls() {
      UI.$sel("#m4-p5-noise-controls", root).innerHTML = noiseControlsHTML();
      var p = UI.$sel("#m4-p5-nz-p", root);
      if (p) p.addEventListener("input", function (e) {
        nz.p = Number(e.target.value);
        var slider = p.closest(".slider");
        if (slider) { var v = slider.querySelector(".slider-val"); if (v) v.textContent = nz.p.toFixed(2); }
        p.style.setProperty("--range-progress", (nz.p / 0.5 * 100) + "%");
        runNoise();
      });
      UI.$all("#m4-p5-noise-controls [data-nzmodel]", root).forEach(function (b) { b.addEventListener("click", function () { nz.model = b.getAttribute("data-nzmodel"); renderControls(); runNoise(); }); });
      UI.$all("#m4-p5-noise-controls [data-nztrials]", root).forEach(function (b) { b.addEventListener("click", function () { nz.trials = Number(b.getAttribute("data-nztrials")); renderControls(); runNoise(); }); });
      UI.$all("#m4-p5-noise-controls [data-nzmode]", root).forEach(function (b) { b.addEventListener("click", function () { nz.mode = b.getAttribute("data-nzmode"); renderControls(); runNoise(); }); });
      UI.$sel("#m4-p5-nz-run", root).addEventListener("click", runNoise);
    }
    renderControls();
    runNoise();

    /* ---- Final knowledge check (shared design with Module 2) ---- */
    function updateQuiz() {
      var box = UI.$sel("#m4-p5-quiz", root);
      var total = IQ.total();
      if (quiz.done) {
        var sc = IQ.score(quiz), pct = Math.round((sc / total) * 100);
        var review = quiz.answers.map(function (a) {
          var q = IQ.QUESTIONS[a.q];
          return "<div class='quiz-review'><div class='q'>" + (a.q + 1) + ". " + q.question + "</div>" +
            "<div class='a'>Your answer: <span style='color:" + (a.correct ? "var(--good)" : "var(--bad)") + "'>" + q.options[a.selected] + "</span></div>" +
            "<div class='a'>Correct answer: <span style='color:var(--good)'>" + q.options[q.correct] + "</span></div>" +
            "<div class='a'>" + q.explanation + "</div>" +
            "<div class='a'><a href='" + q.href + "'>" + q.lesson + " →</a></div></div>";
        }).join("");
        box.innerHTML =
          "<div class='page-head'><div class='meta'><span class='kick'>Final knowledge check</span></div><h2 class='headline' style='font-size:1.6rem'>Module 3 Complete</h2></div>" +
          "<div class='panel' style='margin-top:16px'>" +
            "<div class='cmp-row'><span class='caption'>Score</span><span class='m'>" + sc + " / " + total + "</span></div>" +
            "<div class='cmp-row'><span class='caption'>Percentage</span><span class='m'>" + pct + "%</span></div>" +
            "<div class='cmp-row'><span class='caption'>Assessment</span><span class='m'>" + IQ.message(sc) + "</span></div></div>" +
          "<div class='toolbar' style='margin-top:14px'><button class='btn' id='m4-q-retry'>Retry Quiz</button><button class='btn ghost' id='m4-q-review'>Review Answers</button></div>" +
          "<div id='m4-q-review-box' style='margin-top:16px; display:none'><div class='panel'>" + review + "</div></div>";
        UI.$sel("#m4-q-retry", root).addEventListener("click", function () { quiz = IQ.restart(); updateQuiz(); });
        UI.$sel("#m4-q-review", root).addEventListener("click", function () { var b = UI.$sel("#m4-q-review-box", root); b.style.display = b.style.display === "none" ? "block" : "none"; });
        return;
      }
      var q = IQ.QUESTIONS[quiz.index], sc2 = IQ.score(quiz);
      var opts = q.options.map(function (op, i) {
        var cls = "quiz-opt";
        if (quiz.confirmed) { if (i === q.correct) cls += " correct"; else if (i === quiz.selected) cls += " wrong"; }
        else if (quiz.selected === i) cls += " selected";
        return "<button class='" + cls + "' data-qi='" + i + "'" + (quiz.confirmed ? " disabled" : "") + ">" + op + "</button>";
      }).join("");
      var fb = "";
      if (quiz.confirmed) {
        var ok = quiz.selected === q.correct;
        fb = "<div class='feedback " + (ok ? "ok" : "no") + "' style='margin-top:12px' role='status'>" +
          (ok ? "✓ Correct." : "✗ Not quite. The correct answer is: " + q.options[q.correct]) +
          "<span class='cap'>" + q.explanation + "</span></div>";
      }
      box.innerHTML =
        "<div class='page-head'><div class='meta'><span class='kick'>Final knowledge check</span></div><h2 class='headline' style='font-size:1.7rem'>Test Your Understanding</h2>" +
          "<p class='dek' style='margin-top:8px'>Five questions on detection, correction and the iceberg below the surface.</p></div>" +
        "<div class='panel' style='margin-top:16px'>" +
          "<div class='quiz-prog'><span class='shor-step'>Question " + (quiz.index + 1) + " of " + total + "</span><span class='m'>Score " + sc2 + " / " + total + "</span></div>" +
          "<h3 style='margin-top:12px'>" + q.question + "</h3>" + opts + fb +
          "<div class='toolbar' style='margin-top:14px'>" +
            "<button class='btn primary' id='m4-q-confirm'" + (quiz.selected == null || quiz.confirmed ? " disabled" : "") + ">Confirm</button>" +
            "<button class='btn' id='m4-q-next'" + (quiz.confirmed ? "" : " disabled") + ">" + (quiz.index + 1 >= total ? "See results →" : "Next Question →") + "</button>" +
          "</div></div>";
      UI.$all("#m4-p5-quiz [data-qi]", root).forEach(function (el) { el.addEventListener("click", function () { quiz = IQ.select(quiz, Number(el.getAttribute("data-qi"))); updateQuiz(); }); });
      UI.$sel("#m4-q-confirm", root).addEventListener("click", function () { quiz = IQ.confirm(quiz); updateQuiz(); });
      UI.$sel("#m4-q-next", root).addEventListener("click", function () { quiz = IQ.next(quiz); updateQuiz(); });
    }
    updateQuiz();
    return null;
  }

  global.Module4 = {
    routes: {
      "/module-4": "cover",
      "/module-4/four-physical-two-logical": "p1",
      "/module-4/detecting-errors": "p2",
      "/module-4/why-not-correct": "p3",
      "/module-4/postselection": "p4",
      "/module-4/break-the-code": "p5",
    },
    render: { cover: renderCover, p1: renderP1, p2: renderP2, p3: renderP3, p4: renderP4, p5: renderP5 },
  };
})(typeof window !== "undefined" ? window : globalThis);
