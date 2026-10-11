/*!
 * Qollab · Module 2 — From Repetition to Shor Code
 * Vanilla HTML + JavaScript. No dependencies, no build step.
 * Entry points: index.html + main.js (quantum.js provides the mathematics).
 *
 * Pages (hash router):
 *   #/                  → Cover
 *   #/module-2/repetition-code   → 01 · The Repetition Code
 *   #/module-2/syndrome          → 02 · Discovering the Syndrome
 *   #/module-2/phase-flip        → 03 · The Phase-Flip Problem
 */
(function () {
  "use strict";

  var Q = window.Q;
  var Shor = window.createShor ? window.createShor(Q) : null;
  var Noise = (window.createNoise && Shor) ? window.createNoise(Q, Shor) : null;
  var Quiz = window.Quiz;

  // Debug helper (enable with: window.QC_DEBUG = true)
  function dbg() {
    if (window.QC_DEBUG && window.console && console.debug) {
      console.debug.apply(console, ["[bloch]"].concat(Array.prototype.slice.call(arguments)));
    }
  }
  function finiteVec(v) {
    return v && v.length === 3 && isFinite(v[0]) && isFinite(v[1]) && isFinite(v[2]);
  }

  /* ==================================================================
   * 1. Formatting helpers (rendering only)
   * ================================================================== */
  function fmtNum(n, d) {
    d = d == null ? 3 : d;
    var r = Number(n.toFixed(d));
    if (Object.is(r, -0)) r = 0;
    return String(r).replace("-", "−");
  }
  function ampHTML(c) {
    var eps = 1e-9, v = c.re, im = c.im;
    if (Math.abs(im) > eps) {
      var imS = Math.abs(Math.abs(im) - 1) < eps ? "i" : fmtNum(Math.abs(im)) + "i";
      if (Math.abs(v) < eps) return "<span class='coef'>" + (im < 0 ? "−" : "") + imS + "</span>";
      return "<span class='coef'>" + fmtNum(v) + (im < 0 ? " − " : " + ") + imS + "</span>";
    }
    if (Math.abs(v - 1) < eps) return "";
    if (Math.abs(v + 1) < eps) return "<span class='coef'>−</span>";
    if (Math.abs(v - Q.SQ) < eps) return "<span class='coef'>1/√2</span>";
    if (Math.abs(v + Q.SQ) < eps) return "<span class='coef'>−1/√2</span>";
    return "<span class='coef'>" + fmtNum(v) + "</span>";
  }
  function regHTML(reg, n) {
    var terms = [];
    for (var i = 0; i < reg.length; i++) {
      if (Q.cAbs(reg[i]) < 1e-9) continue;
      terms.push("<span class='term'>" + ampHTML(reg[i]) + "|" + Q.bitsOf(i, n) + "⟩</span>");
    }
    return terms.length ? terms.join(" <span class='op'>+</span> ") : "<span class='coef'>0</span>";
  }
  function legendHTML(items) {
    return items.map(function (it) { return "<span><span class='dot' style='background:" + it.c + "'></span>" + it.t + "</span>"; }).join("");
  }
  function $sel(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ==================================================================
   * 2. Shared diagrams
   * ================================================================== */
  function circuitSVG(opts) {
    var ys = [50, 110, 170], x0 = 92, x1 = 470;
    var s = "<svg class='circuit' viewBox='0 0 520 210' role='img' aria-label='Three-qubit repetition-code circuit'>";
    for (var q = 0; q < 3; q++) {
      s += "<line class='wire' x1='" + x0 + "' y1='" + ys[q] + "' x2='" + x1 + "' y2='" + ys[q] + "'/>";
      s += "<text class='qnum' x='18' y='" + (ys[q] + 4) + "'>q" + (q + 1) + "</text>";
    }
    s += "<text x='54' y='" + (ys[0] + 4) + "'>" + (opts.input0 || "|ψ⟩") + "</text>";
    s += "<text x='54' y='" + (ys[1] + 4) + "'>|0⟩</text>";
    s += "<text x='54' y='" + (ys[2] + 4) + "'>|0⟩</text>";
    function cnot(cx, t) {
      s += "<line class='gate' x1='" + cx + "' y1='" + ys[0] + "' x2='" + cx + "' y2='" + ys[t] + "'/>";
      s += "<circle class='ctl' cx='" + cx + "' cy='" + ys[0] + "' r='4'/>";
      s += "<circle class='gate' cx='" + cx + "' cy='" + ys[t] + "' r='9'/>";
      s += "<line class='gate' x1='" + (cx - 9) + "' y1='" + ys[t] + "' x2='" + (cx + 9) + "' y2='" + ys[t] + "'/>";
      s += "<line class='gate' x1='" + cx + "' y1='" + (ys[t] - 9) + "' x2='" + cx + "' y2='" + (ys[t] + 9) + "'/>";
    }
    if (opts.encoded) { cnot(180, 1); cnot(250, 2); }
    function gate(x, qi, cls, lblcls, label) {
      var y = ys[qi];
      s += "<rect class='" + cls + "' x='" + x + "' y='" + (y - 13) + "' width='26' height='26' rx='6'/>";
      s += "<text class='" + lblcls + "' x='" + (x + 13) + "' y='" + (y + 4) + "' text-anchor='middle'>" + label + "</text>";
    }
    if (opts.errorQubit != null) gate(340, opts.errorQubit, "err", "lbl-err", opts.errorPauli || "X");
    if (opts.correctionQubit != null) gate(392, opts.correctionQubit, "fix", "lbl-fix", opts.correctionPauli || "X");
    return s + "</svg>";
  }
  function badge(x, y, label, cls) {
    return "<g class='pq-badge " + cls + "'><rect x='" + (x - 14) + "' y='" + (y - 14) + "' width='28' height='28' rx='7'/>" +
      "<text x='" + x + "' y='" + (y + 5) + "' text-anchor='middle' style='font-family:var(--mono);font-size:13px;font-weight:600'>" + label + "</text></g>";
  }
  function paritySVG(o) {
    var xs = [110, 300, 490], y = 132, r = 30;
    var labels = o.linkLabels || ["Z₁Z₂", "Z₂Z₃"];
    var s = "<svg class='parity' viewBox='0 0 600 214' role='img' aria-label='Three-qubit register with parity checks'>";
    for (var i = 0; i < 2; i++) {
      var x1 = xs[i], x2 = xs[i + 1], mx = (x1 + x2) / 2;
      var out = o.outcomes ? o.outcomes[i] : null;
      var cls = out == null ? "" : (out === -1 ? "fail" : "ok");
      s += "<path class='pq-link " + cls + "' d='M " + x1 + " " + (y - r) + " Q " + mx + " 36 " + x2 + " " + (y - r) + "'/>";
      var label = out == null ? labels[i] : ("S" + (i + 1) + " = " + (out === 1 ? "+1" : "−1"));
      s += "<g class='pq-hit' data-link='" + i + "' role='button' tabindex='0' aria-label='Parity check " + (i + 1) + "'>" +
        "<rect class='pq-pill " + cls + "' x='" + (mx - 46) + "' y='46' width='92' height='26' rx='13'/>" +
        "<text class='pq-text' x='" + mx + "' y='63' text-anchor='middle'>" + label + "</text></g>";
    }
    for (var q = 0; q < 3; q++) {
      var selc = o.sel === q ? " sel" : "";
      s += "<circle class='pq-node" + selc + "' cx='" + xs[q] + "' cy='" + y + "' r='" + r + "'/>";
      s += "<text class='pq-q' x='" + xs[q] + "' y='" + (y + 5) + "' text-anchor='middle'>q" + (q + 1) + "</text>";
      var hasErr = o.errorQubit === q, hasFix = o.correctionQubit === q;
      if (hasErr) s += badge(xs[q] - (hasFix ? 18 : 0), y + r + 22, o.errorPauli || "X", "err");
      if (hasFix) s += badge(xs[q] + (hasErr ? 18 : 0), y + r + 22, o.correctionPauli || "X", "fix");
    }
    return s + "</svg>";
  }
  function syndromeHTML(bits) {
    return bits ? "<span class='m'>s = (" + bits[0] + ", " + bits[1] + ")</span>" : "<span class='coef'>—</span>";
  }

  /* ==================================================================
   * 3. Bloch sphere (Canvas 2D)
   * ================================================================== */
  function isDark() { return document.documentElement.classList.contains("dark"); }
  function palette() {
    return isDark()
      ? { original: "#7fb3e8", transformed: "#d98fb6", axisX: "#d08b84", axisY: "#7fbf9b", axisZ: "#8fb3e8", equator: "#c9cdd6" }
      : { original: "#2f5d8a", transformed: "#9a4f72", axisX: "#b0524a", axisY: "#4a7d5a", axisZ: "#3f5f9a", equator: "#4b5566" };
  }
  var BlochSphere = window.BlochSphere;

  /* ==================================================================
   * 4. Router
   * ================================================================== */
  var ROUTES = {
    "/module-2": "cover",
    "/module-2/repetition-code": "repetition", "/module-2/syndrome": "syndrome", "/module-2/phase-flip": "phaseflip",
    "/module-2/shor-code": "shorbuild", "/module-2/shor-decoder": "shordecoder",
    "/module-2/break-code": "breakcode", "/module-2/noise-lab": "noiselab",
  };


  function pageHead(num, kick, title, dek) {
    return "<header class='page-head'>" +
      "<div class='meta'><span class='num'>" + num + "</span><span class='kick'>" + kick + "</span></div>" +
      "<h2 class='headline'>" + title + "</h2>" +
      (dek ? "<p class='dek'>" + dek + "</p>" : "") + "</header>";
  }
  function backLink(href, label) { return "<a class='backlink' href='" + href + "'>← Previous · " + label + "</a>"; }

  /* ==================================================================
   * 5. Cover
   * ================================================================== */
  var ROADMAP = [
    ["01", "The Repetition Code", "Protect information against bit flips.", "#/module-2/repetition-code"],
    ["02", "Discovering the Syndrome", "Detect errors without reading the logical state.", "#/module-2/syndrome"],
    ["03", "The Phase-Flip Problem", "Discover why bit-flip protection is not enough.", "#/module-2/phase-flip"],
    ["04", "Building the Shor Code", "Combine protections using nine physical qubits.", "#/module-2/shor-code"],
    ["05", "Detecting and Correcting Errors", "Detect and correct any single-qubit error.", "#/module-2/shor-decoder"],
    ["06", "Breaking the Code", "Discover code distance and logical failures.", "#/module-2/break-code"],
    ["07", "Noise Laboratory", "Find out when error correction helps.", "#/module-2/noise-lab"],
  ];
  function shorCoverFig() {
    var bx = [24, 156, 288], w = 108, y = 60, h = 170, r = 22;
    var names = [["q1", "q2", "q3"], ["q4", "q5", "q6"], ["q7", "q8", "q9"]];
    var labels = ["Block A", "Block B", "Block C"];
    var body = "";
    for (var b = 0; b < 3; b++) {
      var x = bx[b], cx = x + w / 2;
      body += "<rect class='blk' x='" + x + "' y='" + y + "' width='" + w + "' height='" + h + "' rx='12'/>";
      body += "<line class='link' x1='" + cx + "' y1='" + (y + 22) + "' x2='" + cx + "' y2='" + (y + h - 22) + "'/>";
      body += "<text class='blk-label' x='" + cx + "' y='" + (y - 12) + "'>" + labels[b] + "</text>";
      for (var k = 0; k < 3; k++) {
        var cy = y + 38 + k * 47;
        body += "<circle class='node' cx='" + cx + "' cy='" + cy + "' r='" + r + "'/>";
        body += "<text class='q' x='" + cx + "' y='" + (cy + 5) + "'>" + names[b][k] + "</text>";
      }
    }
    var eq = "<div class='cover-eq'><span class='m'>|G<sub>+</sub>&rang;<sup>&otimes;3</sup> = |G<sub>+</sub>&rang; &otimes; |G<sub>+</sub>&rang; &otimes; |G<sub>+</sub>&rang;</span></div>";
    var svg = "<svg class='fig cover-svg cover-blocks' viewBox='0 0 420 252' role='img' aria-label='Shor code: three GHZ blocks, three physical qubits each'>" + body + "</svg>";
    return eq + svg;
  }

  function renderCover(root) {
    var UI = window.UI;
    root.innerHTML = UI.moduleCover({
      backHref: "#/", backLabel: "All modules",
      label: "Module 2 — Quantum Error Correction",
      title: "From Repetition to Shor Code",
      sub: "How can we protect quantum information from errors?",
      deks: [
        "A single physical qubit is fragile. But what if we could spread its information across several qubits?",
        "In this module, you\u2019ll build quantum codes, detect hidden errors, and discover how nine physical qubits can protect one logical qubit.",
      ],
      ctaHref: "#/module-2/repetition-code", ctaLabel: "Start Experimenting \u2192",
      meta: "\u2248 15 min \u00b7 7 lessons",
      figure: shorCoverFig(),
      lessons: ROADMAP.map(function (it) { return { num: it[0], title: it[1], desc: it[2], href: it[3] }; }),
    });
    return null;
  }

  /* ==================================================================
   * 6. Page 1 · The Repetition Code  (uses shared Q math)
   * ================================================================== */
  function abFromPreset(preset) {
    return {
      a: preset === "0" ? Q.C(1) : preset === "+" ? Q.C(Q.SQ) : Q.C(0),
      b: preset === "1" ? Q.C(1) : preset === "+" ? Q.C(Q.SQ) : Q.C(0),
    };
  }
  function renderRepetition(root) {
    var P = palette();
    var exp = { phase: "single", preset: "0", xApplied: false, hasAppliedX: false, encodedOnce: false, errorQubit: null, selQubit: 0 };

    root.innerHTML =
      "<div class='container'>" + backLink("#/module-2", "Cover") +
        pageHead("01", "The Repetition Code", "Can You Protect a Qubit?", "Start with one fragile qubit. Discover what redundancy can and cannot fix.") +
        "<section class='grid-two' style='margin-top:36px'>" +
          "<div class='sticky-col'>" +
            "<div id='visual-encoded'><div class='panel'><div id='circuit'></div></div><div class='quiet' style='margin-top:16px'><div class='caption' id='state-cap'>Input and ancillas</div><div class='state-eq' id='state-eq'></div></div></div>" +
          "</div>" +
          "<div class='stack'><div class='panel' id='stage-a'></div><div id='stage-b'></div><div id='stage-c'></div><div id='discovery'></div></div>" +
        "</section>" +
        "<section id='math' style='margin-top:64px'></section>" +
        "<aside class='transition'><div class='big'>02</div><div><span class='eyebrow' style='color:var(--faint)'>Next</span>" +
          "<p class='q'>How can we detect an error without reading the qubit?</p>" +
          "<p class='teaser'>The answer lies in measuring relationships between qubits rather than the logical information itself.</p>" +
          "<div style='margin-top:20px'><a class='btn primary' href='#/module-2/syndrome'>Discover the Syndrome →</a></div></div></aside>" +
      "</div>";

    function updateSingle() {
      var base = Q.KET[exp.preset], cur = exp.xApplied ? Q.applyX1(base) : base;
      var result = "";
      if (exp.xApplied) {
        result = "<div class='keyidea' style='margin-top:14px'><span class='eyebrow'>Result</span><p><span class='m'><i>X</i>" + Q.KET_LABEL[exp.preset] + " = " + Q.ketLabel(cur) + "</span></p></div>";
        result += exp.preset === "+"
          ? "<div class='notice' style='margin-top:12px'><p><i>X</i>|+⟩ = |+⟩: the vector did not move. An error does not always leave a visible trace.</p></div>"
          : "<div class='notice' style='margin-top:12px'><p>The qubit flipped. One bit of information is now wrong.</p></div>";
      } else result = "<p class='caption' style='margin-top:14px'>The qubit is in " + Q.KET_LABEL[exp.preset] + ".</p>";

      $sel("#stage-a", root).innerHTML = "<h3>A fragile qubit</h3><p class='caption'>Choose a state, then flip it.</p>" +
        "<div class='chip-row' style='margin-top:12px'>" + ["0", "1", "+"].map(function (k) { return "<button class='chip" + (exp.preset === k ? " active" : "") + "' data-preset='" + k + "'>" + Q.KET_LABEL[k] + "</button>"; }).join("") + "</div>" +
        "<div class='toolbar' style='margin-top:14px'><button class='btn' id='apply-x'" + (exp.xApplied ? " disabled" : "") + ">Apply X</button><button class='btn ghost' id='reset-single'" + (exp.xApplied ? "" : " disabled") + ">Reset</button></div>" + result;
      $all("#stage-a [data-preset]", root).forEach(function (b) { b.addEventListener("click", function () { exp.preset = b.getAttribute("data-preset"); exp.xApplied = false; updateSingle(); }); });
      var ax = $sel("#apply-x", root); if (ax) ax.addEventListener("click", function () { exp.xApplied = true; exp.hasAppliedX = true; updateSingle(); updateStageB(); });
      var rs = $sel("#reset-single", root); if (rs) rs.addEventListener("click", function () { exp.xApplied = false; updateSingle(); });
      renderRegister();
    }
    function renderRegister() {
      var input0 = Q.KET_LABEL[exp.preset];
      if (exp.phase === "single") {
        $sel("#circuit", root).innerHTML = circuitSVG({ encoded: false, input0: input0 });
        var cur = exp.xApplied ? Q.applyX1(Q.KET[exp.preset]) : Q.KET[exp.preset];
        $sel("#state-cap", root).textContent = "Input and ancillas";
        $sel("#state-eq", root).innerHTML = "<span class='m'>|<i>ψ</i>⟩ = " + Q.ketLabel(cur) + "</span>";
      } else {
        var base = baseReg(), reg = exp.errorQubit != null ? Q.applyPauliReg(base, exp.errorQubit, "X") : base;
        $sel("#circuit", root).innerHTML = circuitSVG({ encoded: true, input0: input0, errorQubit: exp.errorQubit, errorPauli: "X" });
        var eq = "<div>" + regHTML(reg, 3) + "</div>";
        if (exp.errorQubit != null) eq = "<div class='caption'>Original</div><div>" + regHTML(base, 3) + "</div><div class='caption' style='margin-top:10px'>After error</div><div>" + regHTML(reg, 3) + "</div>";
        $sel("#state-cap", root).textContent = "Encoded register";
        $sel("#state-eq", root).innerHTML = eq;
      }
    }
    function updateStageB() {
      var box = $sel("#stage-b", root);
      if (!exp.hasAppliedX || exp.phase !== "single") { box.innerHTML = ""; return; }
      box.innerHTML = "<div class='panel reveal'><h3>What if we could protect it with three qubits?</h3><p class='caption'>Spread the information so a single flip is not fatal.</p><div class='toolbar' style='margin-top:14px'><button class='btn primary' id='encode'>Encode into 3 Qubits</button></div></div>";
      $sel("#encode", root).addEventListener("click", function () {
        exp.phase = "encoded"; exp.encodedOnce = true; exp.errorQubit = null;
        updateEncoded(); updateStageB(); updateMath();
      });
    }
    function baseReg() { var ab = abFromPreset(exp.preset); return Q.encodeRepetition(ab.a, ab.b); }
    function updateEncoded() {
      renderRegister();
      $sel("#stage-c", root).innerHTML = "<div class='panel'><h3>Introduce an error</h3><p class='caption'>Select a physical qubit and flip it.</p>" +
        "<div class='chip-row' style='margin-top:12px'>" + [0, 1, 2].map(function (q) { return "<button class='chip" + (exp.selQubit === q ? " active" : "") + "' data-q='" + q + "'>qubit " + (q + 1) + "</button>"; }).join("") + "</div>" +
        "<div class='toolbar' style='margin-top:14px'><button class='btn' id='apply-err'>Apply X error</button><button class='btn ghost' id='reset-err'" + (exp.errorQubit != null ? "" : " disabled") + ">Reset</button></div></div>";
      $all("#stage-c [data-q]", root).forEach(function (b) { b.addEventListener("click", function () { exp.selQubit = Number(b.getAttribute("data-q")); updateEncoded(); }); });
      $sel("#apply-err", root).addEventListener("click", function () { exp.errorQubit = exp.selQubit; updateEncoded(); });
      $sel("#reset-err", root).addEventListener("click", function () { exp.errorQubit = null; updateEncoded(); });
      var disc = $sel("#discovery", root);
      disc.innerHTML = exp.errorQubit == null ? "" :
        "<div class='reveal'><div class='notice'><span class='eyebrow'>Observation</span><p>The encoded information is distributed across three qubits. A single bit flip does not necessarily destroy it.</p></div>" +
        "<div class='keyidea' style='margin-top:16px'><span class='eyebrow'>But how?</span><p>How can we determine which qubit flipped without measuring the logical information?</p></div></div>";
    }
    function updateMath() {
      var box = $sel("#math", root);
      if (!exp.encodedOnce) { box.innerHTML = ""; return; }
      box.innerHTML = "<div class='page-head'><div class='meta'><span class='kick'>The mathematics</span></div><h2 class='headline' style='font-size:1.7rem'>Encoding, not copying</h2></div>" +
        "<div style='display:grid;gap:16px;margin-top:20px'>" +
          "<div class='eq'><span class='m'>|<i>ψ</i>⟩ = <i>α</i>|0⟩ + <i>β</i>|1⟩</span></div><div style='text-align:center;color:var(--muted)' aria-hidden>↓</div>" +
          "<div class='eq'><span class='m'>|<i>ψ</i><sub>L</sub>⟩ = <i>α</i>|000⟩ + <i>β</i>|111⟩</span></div>" +
        "</div>" +
        "<p class='dek' style='margin-top:20px'>We haven't copied the qubit. We've encoded one logical qubit into an entangled three-qubit state.</p>" +
        "<details class='expand' style='margin-top:16px'><summary>Why isn't this quantum cloning?</summary><div class='body'>The no-cloning theorem forbids making independent copies of an unknown state. The encoder is a single <em>unitary</em> acting on the original qubit and two ancillas prepared in |0⟩ — two CNOT gates. It produces one entangled state whose amplitudes still carry <i>α</i> and <i>β</i>; it never creates three separate qubits each holding <i>α</i> and <i>β</i>.</div></details>";
    }
    updateSingle(); updateStageB(); updateMath();
    return null;
  }

  /* ==================================================================
   * 7. Page 2 · Discovering the Syndrome
   * ================================================================== */
  function renderSyndrome(root) {
    var P = palette();
    var sy = {
      preset: "0", sel: 0, errorQubit: null, outcomes: null, bits: null, discovered: {}, linkNote: null,
      concept: false,
    };
    var det = window.createDetective(Q);

    root.innerHTML =
      "<div class='container'>" + backLink("#/module-2/repetition-code", "The Repetition Code") +
        pageHead("02", "Detecting Errors", "Discovering the Syndrome", "How can we detect an error without measuring the quantum information?") +
        "<section class='grid-two' style='margin-top:36px'>" +
          "<div class='sticky-col'><div class='panel'><div id='parity'></div></div><div class='quiet' style='margin-top:16px'><div class='caption' id='state-cap'>Encoded register</div><div class='state-eq' id='state-eq'></div></div><div id='link-note' style='margin-top:12px'></div></div>" +
          "<div class='stack'><div class='panel' id='expA'></div><div id='revealA'></div></div>" +
        "</section>" +
        "<section id='detective' style='margin-top:64px'></section>" +
        "<section id='concept' style='margin-top:64px'></section>" +
        "<aside class='transition'><div class='big'>03</div><div><span class='eyebrow' style='color:var(--faint)'>Next</span>" +
          "<p class='q'>Can every quantum error be detected this way?</p>" +
          "<p class='teaser'>Our parity checks can find bit flips. But some errors leave every check unchanged.</p>" +
          "<div style='margin-top:20px'><a class='btn primary' href='#/module-2/phase-flip'>Explore Phase Errors →</a></div></div></aside>" +
      "</div>";

    function baseReg() { var ab = abFromPreset(sy.preset); return Q.encodeRepetition(ab.a, ab.b); }
    function reg() { return sy.errorQubit != null ? Q.applyPauliReg(baseReg(), sy.errorQubit, "X") : baseReg(); }

    function updateA() {
      $sel("#parity", root).innerHTML = paritySVG({ sel: sy.sel, errorQubit: sy.errorQubit, errorPauli: "X", outcomes: sy.outcomes, linkLabels: Q.STABILIZER_LABEL.bit });
      $all("#parity [data-link]", root).forEach(function (g) {
        function show() { sy.linkNote = Number(g.getAttribute("data-link")); updateA(); }
        g.addEventListener("click", show);
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); } });
      });
      var note = "";
      if (sy.linkNote != null) {
        var l = sy.linkNote;
        note = "<div class='notice'><p>Check " + (l + 1) + " measures the joint observable <span class='m'>Z<sub>" + (l + 1) + "</sub>Z<sub>" + (l + 2) + "</sub></span>. " +
          "It tells you whether the two qubits have the <strong>same</strong> or <strong>different</strong> computational-basis parity — never their individual values.</p></div>";
      }
      $sel("#link-note", root).innerHTML = note;
      var b = baseReg(), r = reg();
      $sel("#state-eq", root).innerHTML = sy.errorQubit == null ? "<div>" + regHTML(b, 3) + "</div>" : "<div class='caption'>Encoded</div><div>" + regHTML(b, 3) + "</div><div class='caption' style='margin-top:10px'>After error</div><div>" + regHTML(r, 3) + "</div>";

      $sel("#expA", root).innerHTML = "<h3>Compare without reading</h3><p class='caption'>Apply a bit flip, then check the two parities.</p>" +
        "<div class='chip-row' style='margin-top:12px'>" + ["0", "1", "+"].map(function (k) { return "<button class='chip" + (sy.preset === k ? " active" : "") + "' data-preset='" + k + "'>" + Q.KET_LABEL[k] + "</button>"; }).join("") + "</div>" +
        "<div class='caption' style='margin-top:14px'>Select a qubit</div>" +
        "<div class='chip-row' style='margin-top:8px'>" + [0, 1, 2].map(function (q) { return "<button class='chip" + (sy.sel === q ? " active" : "") + "' data-q='" + q + "'>q" + (q + 1) + "</button>"; }).join("") + "</div>" +
        "<div class='toolbar' style='margin-top:14px'><button class='btn' id='apply-x'>Apply X error</button><button class='btn primary' id='check'>Check Parity</button><button class='btn ghost' id='reset'" + (sy.errorQubit != null || sy.outcomes ? "" : " disabled") + ">Reset</button></div>" +
        (sy.outcomes ? "<div class='keyidea' style='margin-top:16px'><span class='eyebrow'>Syndrome</span><p>" + syndromeHTML(sy.bits) + " · " + (Q.qubitFromSyndrome(sy.bits) === -1 ? "no bit flip detected" : "flip located on q" + (Q.qubitFromSyndrome(sy.bits) + 1)) + "</p></div>" : "");
      $all("#expA [data-preset]", root).forEach(function (el) { el.addEventListener("click", function () { sy.preset = el.getAttribute("data-preset"); sy.outcomes = null; sy.bits = null; updateA(); }); });
      $all("#expA [data-q]", root).forEach(function (el) { el.addEventListener("click", function () { sy.sel = Number(el.getAttribute("data-q")); updateA(); }); });
      $sel("#apply-x", root).addEventListener("click", function () { sy.errorQubit = sy.sel; sy.outcomes = null; sy.bits = null; updateA(); });
      $sel("#check", root).addEventListener("click", function () {
        var m = Q.measureSyndrome(reg(), "bit");
        sy.outcomes = m.outcomes; sy.bits = m.bits; sy.discovered[m.bits.join("")] = true;
        sy.concept = true; updateA(); updateRevealA(); updateConcept();
      });
      $sel("#reset", root).addEventListener("click", function () { sy.errorQubit = null; sy.outcomes = null; sy.bits = null; updateA(); });

      updateRevealA();
    }

    function updateRevealA() {
      var box = $sel("#revealA", root);
      if (!sy.bits) { box.innerHTML = ""; return; }
      var table = [["None", "+1", "+1", "00", null], ["X₁", "−1", "+1", "10", 0], ["X₂", "−1", "−1", "11", 1], ["X₃", "+1", "−1", "01", 2]];
      box.innerHTML = "<div class='panel reveal'><h3>Two parity checks are enough</h3>" +
        "<p class='caption'>Each check is a stabilizer of the code:</p>" +
        "<div class='eq' style='margin-top:10px'><span class='m'>S<sub>1</sub> = Z<sub>1</sub>Z<sub>2</sub>, &nbsp; S<sub>2</sub> = Z<sub>2</sub>Z<sub>3</sub></span></div>" +
        "<p class='caption' style='margin-top:12px'>A stabilizer checks a property of the encoded state without revealing its logical amplitudes. Map the outcomes to bits: <span class='m'>+1 → 0</span>, <span class='m'>−1 → 1</span>.</p>" +
        "<div class='eq' style='margin-top:10px'><span class='m'>s = (s<sub>1</sub>, s<sub>2</sub>)</span></div>" +
        "<table style='width:100%;border-collapse:collapse;margin-top:14px;font-size:13px'>" +
          "<thead><tr style='color:var(--faint);text-align:left'><th style='padding:6px 8px'>Error</th><th style='padding:6px 8px'>S₁</th><th style='padding:6px 8px'>S₂</th><th style='padding:6px 8px'>Syndrome</th></tr></thead>" +
          "<tbody>" + table.map(function (row) {
            var discovered = sy.discovered[row[3]];
            var active = sy.bits.join("") === row[3];
            return "<tr style='border-top:1px solid var(--line)" + (active ? ";background:color-mix(in srgb,var(--accent) 8%,transparent)" : "") + "'>" +
              "<td style='padding:6px 8px'>" + row[0] + "</td><td style='padding:6px 8px'>" + row[1] + "</td><td style='padding:6px 8px'>" + row[2] + "</td>" +
              "<td style='padding:6px 8px' class='mono'>" + (discovered || active ? row[3] : "· ·") + "</td></tr>";
          }).join("") + "</tbody></table></div>";
    }

    /* ---------- Detective (Experiment B + 3-round challenge) ---------- */
    function updateDet() {
      var d = det.state();
      var showErr = d.diagnosisConfirmed ? d.hidden : null; // reveal only after confirmation
      var links = d.outcomes; // eigenvalues (+1/-1) — the SAME source as the syndrome

      var controls = "";
      if (d.hidden === null) {
        controls = "<div class='panel'><h3>Syndrome detective</h3>" +
          "<p class='caption'>A hidden error may or may not be present. The register stays hidden — measure the stabilizers to find out.</p>" +
          "<div class='toolbar' style='margin-top:14px'><button class='btn primary' id='inject'>Inject Hidden Error</button></div></div>";
      } else {
        var stepMeasure = !d.outcomes
          ? "<div class='toolbar'><button class='btn primary' id='measure'>Measure Stabilizers</button></div>"
          : "<p class='caption'>Syndrome measured. State your diagnosis.</p>";
        var diagnosisRow = d.outcomes && !d.diagnosisConfirmed
          ? "<div class='step'><div class='caption'>Diagnosis</div><div class='chip-row' style='margin-top:8px'>" +
              [0, 1, 2].map(function (i) { return "<button class='chip" + (d.diagnosis === i ? " active" : "") + "' data-gq='" + i + "'>q" + (i + 1) + "</button>"; }).join("") +
              "<button class='chip" + (d.diagnosis === -1 ? " active" : "") + "' data-gq='-1'>No error</button></div>" +
              "<div class='toolbar' style='margin-top:12px'><button class='btn primary' id='confirm'" + (d.diagnosis == null ? " disabled" : "") + ">Confirm diagnosis</button></div></div>"
          : "";
        var correctionBlock = d.diagnosisConfirmed
          ? "<div class='step'><div class='feedback' role='status' style='border-color:var(--line);color:var(--muted)'>" + d.explanation + "</div>" +
              "<div class='caption' style='margin-top:12px'>Proposed correction</div>" +
              "<div class='chip-row' style='margin-top:8px'>" +
                [0, 1, 2].map(function (i) { return "<button class='chip" + (d.correctionQubit === i ? " active" : "") + "' data-cq='" + i + "'>X" + (i + 1) + "</button>"; }).join("") +
                "<button class='chip" + (d.correctionQubit === -1 ? " active" : "") + "' data-cq='-1'>I (none)</button></div>" +
              "<div class='toolbar' style='margin-top:12px'><button class='btn primary' id='apply-corr'" + (d.correctionQubit == null ? " disabled" : "") + ">Apply correction</button></div>" +
              (d.corrected ? "<div class='feedback " + (d.recovered ? "ok" : "no") + "' style='margin-top:12px' role='status'>" + d.feedback + "</div>" : "") +
            "</div>"
          : "";
        var next = det.canNextRound()
          ? "<div class='toolbar' style='margin-top:14px'><button class='btn' id='next-round'>Next round →</button></div>"
          : "";
        controls = "<div class='panel'><h3>Round " + d.round + " of 3</h3>" +
          "<div class='step'>" + stepMeasure + "</div>" + diagnosisRow + correctionBlock + next + "</div>";
      }

      $sel("#detective", root).innerHTML = "<div class='page-head'><div class='meta'><span class='kick'>Experiment B · Syndrome detective</span></div><h2 class='headline' style='font-size:1.7rem'>Find the hidden error</h2>" +
        "<p class='dek' style='margin-top:12px'>Three rounds. At most one bit flip per round. Use the syndrome to choose the correction.</p></div>" +
        "<div class='grid-two' style='margin-top:24px'>" +
          "<div class='stack'>" +
            "<div class='panel'>" +
              paritySVG({ sel: (!d.diagnosisConfirmed && d.diagnosis != null && d.diagnosis >= 0) ? d.diagnosis : null, errorQubit: showErr, errorPauli: "X", correctionQubit: (d.corrected && d.correctionQubit >= 0) ? d.correctionQubit : null, correctionPauli: "X", outcomes: links, linkLabels: Q.STABILIZER_LABEL.bit }) +
              (d.outcomes
                ? "<div class='syndrome-strip'><span>S₁ = <b>" + (d.outcomes[0] === 1 ? "+1" : "−1") + "</b></span><span>S₂ = <b>" + (d.outcomes[1] === 1 ? "+1" : "−1") + "</b></span><span class='sy'>s = (" + d.bits[0] + ", " + d.bits[1] + ")</span></div>"
                : "<div class='caption' style='margin-top:14px'>Register contents stay hidden — only relationships are measured.</div>") +
            "</div>" +
            "<div class='quiet'><div class='caption'>Progress</div><div class='state-eq'>" + d.solved + " / 3 corrected</div></div>" +
          "</div>" +
          "<div class='stack'>" + controls + "</div>" +
        "</div>";

      var inj = $sel("#inject", root); if (inj) inj.addEventListener("click", function () { det.inject(); updateDet(); });
      var me = $sel("#measure", root); if (me) me.addEventListener("click", function () { det.measure(); sy.concept = true; updateDet(); updateConcept(); });
      $all("#detective [data-gq]", root).forEach(function (el) { el.addEventListener("click", function () { det.diagnose(Number(el.getAttribute("data-gq"))); updateDet(); }); });
      var cf = $sel("#confirm", root); if (cf) cf.addEventListener("click", function () { det.confirmDiagnosis(); updateDet(); });
      $all("#detective [data-cq]", root).forEach(function (el) { el.addEventListener("click", function () { det.setCorrection(Number(el.getAttribute("data-cq"))); updateDet(); }); });
      var ac = $sel("#apply-corr", root); if (ac) ac.addEventListener("click", function () { det.applyCorrection(); updateDet(); });
      var nx = $sel("#next-round", root); if (nx) nx.addEventListener("click", function () { det.nextRound(); updateDet(); });
    }

    function updateConcept() {
      var box = $sel("#concept", root);
      if (!sy.concept) { box.innerHTML = ""; return; }
      box.innerHTML = "<div class='page-head'><div class='meta'><span class='kick'>What did we actually measure?</span></div><h2 class='headline' style='font-size:1.7rem'>Relationships, not values</h2></div>" +
        "<p class='dek' style='margin-top:12px'>We measured relationships between qubits, not the logical value stored in them. For an ideal encoded state the outcomes are deterministic and leave <i>α</i> and <i>β</i> untouched.</p>" +
        "<details class='expand' style='margin-top:16px'><summary>Explore the mathematics</summary><div class='body'>The stabilizers <span class='m'>S<sub>1</sub>=Z<sub>1</sub>Z<sub>2</sub></span> and <span class='m'>S<sub>2</sub>=Z<sub>2</sub>Z<sub>3</sub></span> commute. Measuring them projects with <span class='m'>P<sub>±</sub>=(I±S)/2</span>; a single X error anticommutes with the checks it touches, flipping exactly those outcomes. This is a joint parity measurement — not a read-out of the individual data qubits.</div></details>";
    }

    updateA(); updateDet(); updateConcept();
    return null;
  }

  /* ==================================================================
   * 8. Page 3 · The Phase-Flip Problem
   * ================================================================== */
  function renderPhaseFlip(root) {
    var P = palette();
    var p3 = {
      basis: { which: "z", state: "0", applied: false },
      b: { code: "bit", preset: "0", sel: 0, pauli: null, outcomes: null, bits: null },
    };

    root.innerHTML =
      "<div class='container'>" + backLink("#/module-2/syndrome", "Discovering the Syndrome") +
        pageHead("03", "Changing the Basis", "The Phase-Flip Problem", "What happens when an error changes the phase instead of the bit?") +
        "<section id='compare' style='margin-top:40px'>" +
          "<h2 class='headline' style='font-size:1.7rem'>Why Isn't Repetition Enough?</h2>" +
          "<p class='dek' style='margin-top:12px'>Our repetition code can detect bit flips. But phase flips can go unnoticed.</p>" +
          "<div class='eq' style='margin-top:20px'><span class='m'>|+<sub>L</sub>⟩ = (|000⟩ + |111⟩)/√2</span></div>" +
          "<div class='grid-two' style='margin-top:20px'>" +
            "<div class='panel'><span class='eyebrow'>Case A · Bit flip</span>" +
              "<div class='eq' style='margin-top:12px'><span class='m'><i>X</i><sub>2</sub>|+<sub>L</sub>⟩ = (|010⟩ + |101⟩)/√2</span></div>" +
              "<div style='margin-top:14px'>" +
                "<div class='cmp-row'><span class='caption'>Stabilizers</span><span class='m'>(S<sub>1</sub>, S<sub>2</sub>) = (−1, −1)</span></div>" +
                "<div class='cmp-row'><span class='caption'>Syndrome</span><span class='m'>11</span></div>" +
                "<div class='cmp-row'><span class='caption'>Result</span><span class='result-tag detected'>Detected</span></div>" +
              "</div>" +
            "</div>" +
            "<div class='panel'><span class='eyebrow'>Case B · Phase flip</span>" +
              "<div class='eq' style='margin-top:12px'><span class='m'><i>Z</i><sub>2</sub>|+<sub>L</sub>⟩ = (|000⟩ − |111⟩)/√2</span></div>" +
              "<div style='margin-top:14px'>" +
                "<div class='cmp-row'><span class='caption'>Stabilizers</span><span class='m'>(S<sub>1</sub>, S<sub>2</sub>) = (+1, +1)</span></div>" +
                "<div class='cmp-row'><span class='caption'>Syndrome</span><span class='m'>00</span></div>" +
                "<div class='cmp-row'><span class='caption'>Result</span><span class='result-tag undetected'>Undetected</span></div>" +
              "</div>" +
              "<p class='caption' style='margin-top:12px'>The logical state becomes |−<sub>L</sub>⟩.</p>" +
            "</div>" +
          "</div>" +
          "<div class='notice' style='margin-top:20px'><p>The repetition code checks whether neighboring qubits have matching computational-basis values. A phase flip changes the relative phase without changing those parity relationships.</p></div>" +
          "<div class='eq' style='margin-top:14px'><span class='m'>[<i>Z</i><sub>i</sub>, <i>Z</i><sub>1</sub><i>Z</i><sub>2</sub>] = [<i>Z</i><sub>i</sub>, <i>Z</i><sub>2</sub><i>Z</i><sub>3</sub>] = 0</span></div>" +
          "<p class='caption' style='margin-top:10px'>Z errors commute with both stabilizers, so the measurements cannot detect them. Syndrome 00 does not guarantee that no physical error occurred. The comparison assumes an ideal encoded state and perfect stabilizer measurements.</p>" +
        "</section>" +
        "<section id='basis' style='margin-top:64px'></section>" +
        "<section id='expB' style='margin-top:64px'></section>" +
        "<aside class='transition'><div class='big'>04</div><div><span class='eyebrow' style='color:var(--faint)'>Next</span>" +
          "<p class='q'>Can we protect against both kinds of error at once?</p>" +
          "<p class='teaser'>Combining a bit-flip code and a phase-flip code takes nine physical qubits — the Shor code.</p>" +
          "<div style='margin-top:20px'><a class='btn primary' href='#/module-2/shor-code'>Building the Shor Code →</a></div></div></aside>" +
      "</div>";

    /* ---------- Experiment A · the basis matters (Bloch) ---------- */
    var basisSphere = null, basisBuilt = false;
    var BASIS_STATES = { z: [["0", "|0⟩"], ["1", "|1⟩"]], x: [["+", "|+⟩"], ["-", "|−⟩"]] };
    var BASIS_EQ = {
      z0: "<i>Z</i>|0⟩ = |0⟩", z1: "<i>Z</i>|1⟩ = −|1⟩",
      "x+": "<i>Z</i>|+⟩ = |−⟩", "x-": "<i>Z</i>|−⟩ = |+⟩",
    };
    var BASIS_OBS = {
      z0: "The vector stays at the north pole — |0⟩ is an eigenstate of Z.",
      z1: "The vector stays at the south pole — the minus sign is a global phase.",
      "x+": "The vector moves from +X to −X.",
      "x-": "The vector moves from −X to +X.",
    };
    function buildBasis() {
      $sel("#basis", root).innerHTML =
        "<div class='page-head'><div class='meta'><span class='kick'>Discovery · the basis matters</span></div><h2 class='headline' style='font-size:1.7rem'>A phase flip is a bit flip in the X basis</h2></div>" +
        "<p class='dek' style='margin-top:12px'>An error does not change when we switch bases — only how we describe its action does. In the Z basis, a phase flip changes the relative phase. In the X basis, the same Z operator exchanges |+⟩ and |−⟩.</p>" +
        "<p class='dek' style='margin-top:10px'>Switch between bases, apply Z, and compare the state before and after the error.</p>" +
        "<div class='grid-two' style='margin-top:24px'>" +
          "<div class='bloch-wrap'><canvas id='basis-canvas' aria-label='Bloch sphere showing the effect of Z'></canvas><div class='legend' id='basis-legend'></div><div class='bloch-hint'>drag to orbit</div></div>" +
          "<div class='stack'><div class='panel'><h3>Choose a basis</h3><div class='chip-row' style='margin-top:12px'>" +
            "<button class='chip' data-basis='z'>Z basis · |0⟩, |1⟩</button>" +
            "<button class='chip' data-basis='x'>X basis · |+⟩, |−⟩</button></div>" +
            "<p class='caption' style='margin-top:8px'>Selecting a basis chooses a representative initial state — it is not a gate.</p>" +
            "<div class='caption' style='margin-top:14px'>State</div><div class='chip-row' style='margin-top:8px' id='basis-state'></div>" +
            "<div class='toolbar' style='margin-top:14px'><button class='btn' id='basis-z'>Apply Z</button><button class='btn ghost' id='basis-reset'>Reset</button></div>" +
            "<div class='eq' id='basis-eq' style='margin-top:14px'></div><p class='caption' id='basis-note' style='margin-top:12px'></p></div></div>" +
        "</div>" +
        "<div class='keyidea' style='margin-top:24px'><span class='eyebrow'>Takeaway</span><p>The same Z error leaves computational-basis states unchanged up to global phase, but exchanges |+⟩ and |−⟩. A phase flip becomes a bit flip when described in the X basis.</p></div>";
      // The canvas is created ONCE. Later updates never touch it, so the
      // BlochSphere instance keeps pointing at a live element.
      basisSphere = new BlochSphere($sel("#basis-canvas", root));
      basisSphere.start();
      dbg("canvas mounted (#basis-canvas)");
      $all("#basis [data-basis]", root).forEach(function (el) {
        el.addEventListener("click", function () {
          p3.basis.which = el.getAttribute("data-basis");
          p3.basis.state = p3.basis.which === "z" ? "0" : "+";
          p3.basis.applied = false;
          updateBasis();
        });
      });
      $sel("#basis-z", root).addEventListener("click", function () { p3.basis.applied = true; updateBasis(); });
      $sel("#basis-reset", root).addEventListener("click", function () { p3.basis.applied = false; updateBasis(); });
      basisBuilt = true;
    }
    function updateBasis() {
      if (!basisBuilt) buildBasis();
      var b = p3.basis, key = b.which + b.state;
      var base = Q.KET[b.state];
      var cur = b.applied ? Q.applyZ1(base) : base;
      var v0 = Q.blochVector(base), v1 = Q.blochVector(cur);
      var label0 = Q.KET_LABEL[b.state], label1 = Q.ketLabel(cur);
      dbg("basis=" + b.which, "state=" + b.state, "applied=" + b.applied, "before=(" + v0.x.toFixed(2) + "," + v0.y.toFixed(2) + "," + v0.z.toFixed(2) + ")", "after=(" + v1.x.toFixed(2) + "," + v1.y.toFixed(2) + "," + v1.z.toFixed(2) + ")");
      basisSphere.setArrows([{ id: "base", color: P.original, vector: [v0.x, v0.y, v0.z] }, { id: "cur", color: P.transformed, vector: [v1.x, v1.y, v1.z] }]);
      $sel("#basis-legend", root).innerHTML = b.applied
        ? legendHTML([{ c: P.original, t: "Initial state: " + label0 }, { c: P.transformed, t: "After applying Z: " + label1 }])
        : legendHTML([{ c: P.original, t: "Initial state: " + label0 }]);
      $sel("#basis-eq", root).innerHTML = b.applied
        ? "<span class='m'>" + BASIS_EQ[key] + "</span>"
        : "<span class='m'>|ψ⟩ = " + label0 + "</span>";
      var overlap = b.applied && Q.eqPhase1(base, cur);
      $sel("#basis-note", root).textContent = !b.applied
        ? "Apply Z to see what happens."
        : (overlap ? BASIS_OBS[key] + " The Bloch vectors overlap because Z changes only the global phase of this basis state." : BASIS_OBS[key]);
      $all("#basis [data-basis]", root).forEach(function (el) { el.classList.toggle("active", el.getAttribute("data-basis") === b.which); });
      $sel("#basis-state", root).innerHTML = BASIS_STATES[b.which].map(function (s) {
        return "<button class='chip" + (b.state === s[0] ? " active" : "") + "' data-bstate='" + s[0] + "'>" + s[1] + "</button>";
      }).join("");
      $all("#basis-state [data-bstate]", root).forEach(function (el) {
        el.addEventListener("click", function () { p3.basis.state = el.getAttribute("data-bstate"); p3.basis.applied = false; updateBasis(); });
      });
    }

    /* ---------- Experiment B · which errors does each code detect? ---------- */
    function bBase() { var ab = abFromPreset(p3.b.preset); return p3.b.code === "phase" ? Q.encodePhase(ab.a, ab.b) : Q.encodeRepetition(ab.a, ab.b); }
    function bReg() { return p3.b.pauli ? Q.applyPauliReg(bBase(), p3.b.sel, p3.b.pauli) : bBase(); }
    function symbolicOriginal(code, preset) {
      if (code === "bit") return preset === "0" ? "|0<sub>L</sub>⟩ = |000⟩" : preset === "1" ? "|1<sub>L</sub>⟩ = |111⟩" : "|+<sub>L</sub>⟩ = (|000⟩ + |111⟩)/√2";
      return preset === "0" ? "|0<sub>L</sub>⟩ = |+++⟩" : preset === "1" ? "|1<sub>L</sub>⟩ = |−−−⟩" : "|+<sub>L</sub>⟩ = (|+++⟩ + |−−−⟩)/√2";
    }
    function flipBit(s, q) { var a = s.split(""); a[q] = a[q] === "1" ? "0" : "1"; return a.join(""); }
    function flipSign(s, q) { var a = s.split(""); a[q] = a[q] === "+" ? "−" : "+"; return a.join(""); }
    function symbolicAfter(code, preset, pauli, q) {
      if (code === "bit") {
        var a = "000", b2 = "111";
        if (pauli === "X") { a = flipBit(a, q); b2 = flipBit(b2, q); }
        if (preset === "0") return pauli === "Z" ? "|000⟩" : "|" + a + "⟩";
        if (preset === "1") return pauli === "Z" ? "−|111⟩" : "|" + b2 + "⟩";
        return pauli === "Z" ? "(|000⟩ − |111⟩)/√2" : "(|" + a + "⟩ + |" + b2 + "⟩)/√2";
      }
      var p0 = "+++", p1 = "−−−";
      if (pauli === "Z") { p0 = flipSign(p0, q); p1 = flipSign(p1, q); }
      if (preset === "0") return pauli === "Z" ? "|" + p0 + "⟩" : "|+++⟩";
      if (preset === "1") return pauli === "Z" ? "|" + p1 + "⟩" : "−|−−−⟩";
      return pauli === "Z" ? "(|" + p0 + "⟩ + |" + p1 + "⟩)/√2" : "(|+++⟩ − |−−−⟩)/√2";
    }
    function updateB() {
      var c = p3.b, labels = Q.STABILIZER_LABEL[c.code];
      var codeName = c.code === "phase" ? "Phase-flip code · XX checks" : "Bit-flip code · ZZ checks";
      var detected = c.bits ? c.bits.join("") !== "00" : null;
      var explanation;
      if (c.pauli == null) explanation = "Apply an error, then measure.";
      else if (c.code === "bit" && c.pauli === "X") explanation = "ZZ checks detect this bit flip because X changes computational-basis parity.";
      else if (c.code === "bit" && c.pauli === "Z") explanation = "ZZ checks cannot detect this phase flip. The syndrome remains 00.";
      else if (c.code === "phase" && c.pauli === "Z") explanation = "XX checks detect this phase flip because Z exchanges |+⟩ and |−⟩.";
      else explanation = "XX checks cannot detect this bit flip. The syndrome remains 00.";
      var results = c.bits
        ? "<div style='margin-top:12px'>" +
            "<div class='cmp-row'><span class='caption'>S₁</span><span class='m'>" + (c.outcomes[0] === 1 ? "+1" : "−1") + "</span></div>" +
            "<div class='cmp-row'><span class='caption'>S₂</span><span class='m'>" + (c.outcomes[1] === 1 ? "+1" : "−1") + "</span></div>" +
            "<div class='cmp-row'><span class='caption'>Syndrome</span><span class='m'>" + c.bits.join("") + "</span></div>" +
            "<div class='cmp-row'><span class='caption'>Result</span><span class='result-tag " + (detected ? "detected" : "undetected") + "'>" + (detected ? "Detected" : "Undetected") + "</span></div>" +
          "</div><p class='caption' style='margin-top:10px'>" + explanation + "</p>"
        : "<p class='caption' style='margin-top:10px'>" + explanation + "</p>";

      $sel("#expB", root).innerHTML =
        "<p class='dek'><strong>If Z acts like a bit flip in the X basis, can we use repetition to protect against it?</strong></p>" +
        "<p class='dek' style='margin-top:8px'>Let's encode the same logical information in two different ways and compare which errors each code can detect.</p>" +
        "<div class='page-head' style='margin-top:32px'><div class='meta'><span class='kick'>Experiment B · change the encoding</span></div><h2 class='headline' style='font-size:1.7rem'>Which errors does each code detect?</h2></div>" +
        "<p class='dek' style='margin-top:12px'><strong>Same information, different protection.</strong> The repetition code detects bit flips using ZZ parity checks. By encoding in the X basis instead, we can detect phase flips using XX checks.</p>" +
        "<p class='dek' style='margin-top:8px'>Choose an encoding, introduce an error, and measure the stabilizers.</p>" +

        "<div class='grid-two' style='margin-top:24px'>" +
          "<div><span class='eyebrow'>Bit-flip code</span>" +
            "<div class='eq' style='margin-top:10px'><span class='m'>|0<sub>L</sub>⟩ = |000⟩, &nbsp; |1<sub>L</sub>⟩ = |111⟩</span></div>" +
            "<div class='eq' style='margin-top:8px'><span class='m'>S<sub>1</sub> = Z<sub>1</sub>Z<sub>2</sub>, &nbsp; S<sub>2</sub> = Z<sub>2</sub>Z<sub>3</sub></span></div>" +
            "<p class='caption' style='margin-top:10px'><strong>Detects single X errors.</strong></p></div>" +
          "<div><span class='eyebrow'>Phase-flip code</span>" +
            "<div class='eq' style='margin-top:10px'><span class='m'>|0<sub>L</sub>⟩ = |+++⟩, &nbsp; |1<sub>L</sub>⟩ = |−−−⟩</span></div>" +
            "<div class='eq' style='margin-top:8px'><span class='m'>S<sub>1</sub> = X<sub>1</sub>X<sub>2</sub>, &nbsp; S<sub>2</sub> = X<sub>2</sub>X<sub>3</sub></span></div>" +
            "<p class='caption' style='margin-top:10px'><strong>Detects single Z errors.</strong></p></div>" +
        "</div>" +

        "<div class='grid-two' style='margin-top:32px'>" +
          "<div class='panel'>" + paritySVG({ sel: c.sel, errorQubit: c.pauli ? c.sel : null, errorPauli: c.pauli || "X", outcomes: c.outcomes, linkLabels: labels }) +
            "<div class='quiet' style='margin-top:16px'><div class='caption'>Encoded logical state — <strong>" + codeName + "</strong></div>" +
              "<div class='state-eq'>" + symbolicOriginal(c.code, c.preset) + "</div>" +
              (c.pauli ? "<div class='caption' style='margin-top:10px'>After applying " + c.pauli + " to q" + (c.sel + 1) + "</div><div class='state-eq'>" + symbolicAfter(c.code, c.preset, c.pauli, c.sel) + "</div>" : "") +
            "</div></div>" +
          "<div class='stack'>" +
            "<div class='panel'><h3>Choose an encoding</h3><div class='chip-row' style='margin-top:12px'>" +
              "<button class='chip" + (c.code === "bit" ? " active" : "") + "' data-code='bit'>Bit-flip protection · ZZ checks</button>" +
              "<button class='chip" + (c.code === "phase" ? " active" : "") + "' data-code='phase'>Phase-flip protection · XX checks</button></div>" +
              "<p class='caption' style='margin-top:8px'>This prepares a different physical encoding of the logical input — not a relabeling.</p>" +
              "<div class='caption' style='margin-top:14px'>Logical state to encode</div><div class='chip-row' style='margin-top:8px'>" +
              ["0", "1", "+"].map(function (k) { return "<button class='chip" + (c.preset === k ? " active" : "") + "' data-bpreset='" + k + "'>" + Q.KET_LABEL[k] + "</button>"; }).join("") + "</div>" +
              "<p class='caption' style='margin-top:6px'>Choose the state of the logical qubit before encoding.</p>" +
              "<div class='caption' style='margin-top:14px'>Choose a physical qubit and apply an error</div>" +
              "<div class='chip-row' style='margin-top:8px'>" + [0, 1, 2].map(function (q) { return "<button class='chip" + (c.sel === q ? " active" : "") + "' data-bq='" + q + "'>q" + (q + 1) + "</button>"; }).join("") + "</div>" +
              "<div class='toolbar' style='margin-top:10px'><button class='btn' id='b-x'>Apply X</button><button class='btn' id='b-z'>Apply Z</button><button class='btn primary' id='b-check'>Measure</button><button class='btn ghost' id='b-reset'>Reset</button></div></div>" +
            "<div class='panel'><h3>Stabilizer measurements</h3><div class='eq'>" +
              "<span class='m'>S<sub>1</sub> = " + labels[0] + ", &nbsp; S<sub>2</sub> = " + labels[1] + "</span></div>" + results + "</div>" +
          "</div>" +
        "</div>" +

        "<details class='expand' style='margin-top:24px'><summary>Why does changing the basis change the protection?</summary>" +
          "<div class='body'>The phase-flip repetition code is the bit-flip code conjugated by Hadamard on all three qubits: <span class='m'>|ψ<sub>L</sub><sup>(X)</sup>⟩ = H<sup>⊗3</sup>|ψ<sub>L</sub><sup>(Z)</sup>⟩</span>. Since <span class='m'>HZH = X</span>, the <span class='m'>ZZ</span> stabilizers become <span class='m'>XX</span> stabilizers. This changes which single-qubit Pauli errors anticommute with the stabilizers — and therefore which ones are detectable.</div></details>";

      $all("#expB [data-code]", root).forEach(function (el) { el.addEventListener("click", function () { p3.b.code = el.getAttribute("data-code"); p3.b.outcomes = null; p3.b.bits = null; updateB(); }); });
      $all("#expB [data-bpreset]", root).forEach(function (el) { el.addEventListener("click", function () { p3.b.preset = el.getAttribute("data-bpreset"); p3.b.outcomes = null; p3.b.bits = null; updateB(); }); });
      $all("#expB [data-bq]", root).forEach(function (el) { el.addEventListener("click", function () { p3.b.sel = Number(el.getAttribute("data-bq")); p3.b.outcomes = null; p3.b.bits = null; updateB(); }); });
      $sel("#b-x", root).addEventListener("click", function () { p3.b.pauli = "X"; p3.b.outcomes = null; p3.b.bits = null; updateB(); });
      $sel("#b-z", root).addEventListener("click", function () { p3.b.pauli = "Z"; p3.b.outcomes = null; p3.b.bits = null; updateB(); });
      $sel("#b-check", root).addEventListener("click", function () { var m = Q.measureSyndrome(bReg(), c.code); p3.b.outcomes = m.outcomes; p3.b.bits = m.bits; updateB(); });
      $sel("#b-reset", root).addEventListener("click", function () { p3.b.pauli = null; p3.b.outcomes = null; p3.b.bits = null; updateB(); });
    }

    updateBasis(); updateB();
    return function () { if (basisSphere) { basisSphere.stop(); dbg("canvas unmounted (#basis-canvas)"); } };
  }

  /* ==================================================================
   * 8b. Shor code · shared diagrams
   * ================================================================== */
  function shorBadge(x, y, label, cls) {
    return "<g class='shor-badge " + cls + "'><rect x='" + (x - 13) + "' y='" + (y - 13) + "' width='26' height='26' rx='7'/>" +
      "<text x='" + x + "' y='" + (y + 4) + "' text-anchor='middle' style='font-family:var(--mono);font-size:12px;font-weight:600'>" + label + "</text></g>";
  }
  function stabQubits(stab) { return stab.terms.map(function (t) { return t.q; }); }
  // Nine qubits grouped in three blocks of three (A: q1-3, B: q4-6, C: q7-9).
  function shorRegisterSVG(o) {
    o = o || {};
    var cols = [110, 300, 490], rows = [74, 136, 198], r = 22;
    var names = ["Block A", "Block B", "Block C"];
    var stage = o.stage; // undefined on Page 5 (encoded register, no stage framing)
    var enc = stage != null && stage >= 2;
    var s = "<svg class='shor' viewBox='0 0 600 268' role='img' aria-label='Nine-qubit Shor register grouped in three blocks'>";
    var b, k, q, x, y;
    for (b = 0; b < 3; b++) {
      s += "<rect class='shor-block" + (enc ? " enc" : "") + "' x='" + (cols[b] - 62) + "' y='34' width='124' height='196' rx='14'/>";
      s += "<text class='shor-block-label' x='" + cols[b] + "' y='24' text-anchor='middle'>" + names[b] + "</text>";
    }
    // Z-check links (within each block)
    for (b = 0; b < 3; b++) {
      for (k = 0; k < 2; k++) {
        var hl = o.highlight && o.highlight.type === "Z" && o.highlight.stab === ("S" + (b * 2 + k + 1));
        s += "<line class='shor-zlink" + (hl ? " hl" : "") + "' x1='" + cols[b] + "' y1='" + (rows[k] + r) + "' x2='" + cols[b] + "' y2='" + (rows[k + 1] - r) + "'/>";
        if (o.outcomes) {
          var val = o.outcomes[b * 2 + k];
          s += "<text class='shor-glabel' x='" + (cols[b] + 10) + "' y='" + ((rows[k] + rows[k + 1]) / 2 + 4) + "'>" + (val === 1 ? "+1" : "−1") + "</text>";
        }
      }
    }
    if (o.highlight && o.highlight.type === "X") {
      var xs = o.highlight.stab === "S7" ? [cols[0], cols[1]] : [cols[1], cols[2]];
      s += "<rect class='shor-xrect' x='" + (xs[0] - 62) + "' y='44' width='" + (xs[1] - xs[0] + 124) + "' height='176' rx='16'/>";
    }
    for (b = 0; b < 3; b++) {
      for (k = 0; k < 3; k++) {
        q = b * 3 + k; x = cols[b]; y = rows[k];
        var err = (o.errors || []).filter(function (e) { return e.q === q; })[0];
        var fix = (o.corrections || []).filter(function (c) { return c.q === q; })[0];
        var isHl = o.highlight && o.highlight.qubits.indexOf(q) >= 0;
        var stageCls = "";
        if (stage === 0) stageCls = q === 0 ? " input" : " ancilla";
        else if (stage === 1) stageCls = (q === 0 || q === 3 || q === 6) ? " hl" : " ancilla";
        else if (stage >= 2) stageCls = " hl";
        var cls = "shor-qubit" + (err ? " err" : fix ? " fix" : isHl ? " hl" : o.sel === q ? " sel" : stageCls);
        s += "<g class='shor-hit' data-q='" + q + "'><circle class='" + cls + "' cx='" + x + "' cy='" + y + "' r='" + r + "'/>" +
          "<text class='shor-q' x='" + x + "' y='" + (y + 4) + "' text-anchor='middle'>q" + (q + 1) + "</text></g>";
        if (err) s += shorBadge(x - (fix ? 18 : 0), y + r + 20, err.pauli, "err");
        if (fix) s += shorBadge(x + (err ? 18 : 0), y + r + 20, fix.pauli, "fix");
      }
    }
    if (stage === 0) s += "<text class='shor-input-label' x='" + cols[0] + "' y='" + (rows[0] - r - 8) + "' text-anchor='middle'>input</text>";
    return s + "</svg>";
  }
  // Encoding circuit. Each gate is "applied" (past), "active" (current step) or "dim" (future).
  function shorCircuitSVG(o) {
    o = o || {}; var step = o.step == null ? 3 : o.step;
    var y0 = 26, dy = 32, x0 = 76, x1 = 566, i;
    var ys = []; for (i = 0; i < 9; i++) ys.push(y0 + i * dy);
    var s = "<svg class='circuit' viewBox='0 0 620 330' role='img' aria-label='Shor encoding circuit'>";
    for (i = 0; i < 9; i++) {
      s += "<line class='shor-wire' x1='" + x0 + "' y1='" + ys[i] + "' x2='" + x1 + "' y2='" + ys[i] + "'/>";
      s += "<text class='shor-glabel' x='44' y='" + (ys[i] + 4) + "'>q" + (i + 1) + "</text>";
    }
    function st(g) { return g < step ? " applied" : g === step ? " active" : " dim"; }
    function cnot(x, a, b, g) {
      var d = st(g);
      s += "<line class='shor-gate" + d + "' x1='" + x + "' y1='" + ys[a] + "' x2='" + x + "' y2='" + ys[b] + "'/>";
      s += "<circle class='shor-ctl" + d + "' cx='" + x + "' cy='" + ys[a] + "' r='4'/>";
      s += "<circle class='shor-gate" + d + "' cx='" + x + "' cy='" + ys[b] + "' r='9'/>";
      s += "<line class='shor-gate" + d + "' x1='" + (x - 9) + "' y1='" + ys[b] + "' x2='" + (x + 9) + "' y2='" + ys[b] + "'/>";
      s += "<line class='shor-gate" + d + "' x1='" + x + "' y1='" + (ys[b] - 9) + "' x2='" + x + "' y2='" + (ys[b] + 9) + "'/>";
    }
    function hgate(x, q, g) {
      var d = st(g);
      var fill = d === " applied" ? "fill:var(--accent);" : d === " active" ? "fill:var(--accent-2);" : "opacity:.28;";
      s += "<rect class='shor-gate" + d + "' x='" + (x - 12) + "' y='" + (ys[q] - 12) + "' width='24' height='24' rx='5'/>";
      s += "<text class='shor-glabel' style='" + fill + "' x='" + x + "' y='" + (ys[q] + 4) + "' text-anchor='middle'>H</text>";
    }
    cnot(150, 0, 3, 1); cnot(210, 0, 6, 1);
    hgate(285, 0, 1); hgate(330, 3, 1); hgate(375, 6, 1);
    cnot(455, 0, 1, 2); cnot(500, 0, 2, 2);
    cnot(455, 3, 4, 2); cnot(500, 3, 5, 2);
    cnot(455, 6, 7, 2); cnot(500, 6, 8, 2);
    return s + "</svg>";
  }
  // Three-qubit GHZ register.
  function ghzRegisterSVG(o) {
    o = o || {};
    var xs = [150, 300, 450], y = 92, r = 26;
    var s = "<svg class='shor' viewBox='0 0 600 168' role='img' aria-label='Three-qubit GHZ register'>";
    for (var i = 0; i < 3; i++) {
      var on = o.active && o.active.indexOf(i) >= 0;
      s += "<circle class='shor-qubit" + (on ? " hl" : "") + "' cx='" + xs[i] + "' cy='" + y + "' r='" + r + "'/>";
      s += "<text class='shor-q' x='" + xs[i] + "' y='" + (y + 4) + "' text-anchor='middle'>q" + (i + 1) + "</text>";
    }
    return s + "</svg>";
  }
  // GHZ preparation circuit (H on q1, CNOT q1→q2, CNOT q1→q3).
  function ghzCircuitSVG(o) {
    o = o || {}; var step = o.step == null ? 0 : o.step;
    var y0 = 34, dy = 44, x0 = 80, x1 = 560;
    var ys = [y0, y0 + dy, y0 + 2 * dy];
    var s = "<svg class='circuit' viewBox='0 0 620 160' role='img' aria-label='GHZ preparation circuit'>";
    for (var i = 0; i < 3; i++) {
      s += "<line class='shor-wire' x1='" + x0 + "' y1='" + ys[i] + "' x2='" + x1 + "' y2='" + ys[i] + "'/>";
      s += "<text class='shor-glabel' x='50' y='" + (ys[i] + 4) + "'>q" + (i + 1) + "</text>";
    }
    function st(g) { return g < step ? " applied" : g === step ? " active" : " dim"; }
    function cnot(x, a, b, g) {
      var d = st(g);
      s += "<line class='shor-gate" + d + "' x1='" + x + "' y1='" + ys[a] + "' x2='" + x + "' y2='" + ys[b] + "'/>";
      s += "<circle class='shor-ctl" + d + "' cx='" + x + "' cy='" + ys[a] + "' r='4'/>";
      s += "<circle class='shor-gate" + d + "' cx='" + x + "' cy='" + ys[b] + "' r='9'/>";
      s += "<line class='shor-gate" + d + "' x1='" + (x - 9) + "' y1='" + ys[b] + "' x2='" + (x + 9) + "' y2='" + ys[b] + "'/>";
      s += "<line class='shor-gate" + d + "' x1='" + x + "' y1='" + (ys[b] - 9) + "' x2='" + x + "' y2='" + (ys[b] + 9) + "'/>";
    }
    function hgate(x, q, g) {
      var d = st(g);
      var fill = d === " applied" ? "fill:var(--accent);" : d === " active" ? "fill:var(--accent-2);" : "opacity:.28;";
      s += "<rect class='shor-gate" + d + "' x='" + (x - 12) + "' y='" + (ys[q] - 12) + "' width='24' height='24' rx='5'/>";
      s += "<text class='shor-glabel' style='" + fill + "' x='" + x + "' y='" + (ys[q] + 4) + "' text-anchor='middle'>H</text>";
    }
    hgate(220, 0, 1);
    cnot(340, 0, 1, 2);
    cnot(460, 0, 2, 3);
    return s + "</svg>";
  }
  function shorSymbolic(preset, step) {
    if (step === 0) return "<span class='m'>|ψ⟩ = " + Q.KET_LABEL[preset] + "</span>";
    if (step === 1) {
      var t = preset === "0" ? "|+++⟩" : preset === "1" ? "|−−−⟩" : "(|+++⟩ + |−−−⟩)/√2";
      return "<span class='m'>" + t + "</span>";
    }
    if (step === 2) {
      var t2 = preset === "0" ? "|G<sub>+</sub>⟩|G<sub>+</sub>⟩|G<sub>+</sub>⟩"
        : preset === "1" ? "|G<sub>−</sub>⟩|G<sub>−</sub>⟩|G<sub>−</sub>⟩"
        : "(|G<sub>+</sub>⟩<sup>⊗3</sup> + |G<sub>−</sub>⟩<sup>⊗3</sup>)/√2";
      return "<span class='m'>" + t2 + "</span>";
    }
    var t3 = preset === "0" ? "|0<sub>L</sub>⟩ = |G<sub>+</sub>⟩<sup>⊗3</sup>"
      : preset === "1" ? "|1<sub>L</sub>⟩ = |G<sub>−</sub>⟩<sup>⊗3</sup>"
      : "|+<sub>L</sub>⟩ = (|0<sub>L</sub>⟩ + |1<sub>L</sub>⟩)/√2";
    return "<span class='m'>" + t3 + "</span>";
  }
  function shorEncodedSymbolic(preset) {
    return preset === "0" ? "<span class='m'>|0<sub>L</sub>⟩ = |G<sub>+</sub>⟩|G<sub>+</sub>⟩|G<sub>+</sub>⟩</span>"
      : preset === "1" ? "<span class='m'>|1<sub>L</sub>⟩ = |G<sub>−</sub>⟩|G<sub>−</sub>⟩|G<sub>−</sub>⟩</span>"
      : "<span class='m'>|+<sub>L</sub>⟩ = (|0<sub>L</sub>⟩ + |1<sub>L</sub>⟩)/√2</span>";
  }

  /* ==================================================================
   * 8c. Page 4 · Building the Shor Code
   * ================================================================== */
  var SHOR_STAGES = [
    { name: "Unencoded state", title: "Start with one qubit",
      text: "Our information begins in q1. The remaining eight qubits are initialized to |0⟩.", ops: "" },
    { name: "Phase encoding", title: "Protect against phase flips",
      text: "First, we encode the information across three qubits in the X basis. These qubits will become the centers of three separate blocks. This resembles the phase-flip repetition code from the previous lesson.",
      ops: "CNOT(q1, q4) · CNOT(q1, q7) · H(q1), H(q4), H(q7)" },
    { name: "Bit encoding", title: "Protect each branch against bit flips",
      text: "Now we encode each of the three branches into a three-qubit block. Each block now contains a GHZ state; the correlations inside each block enable bit-flip error detection.",
      ops: "Block A: CNOT(q1,q2), CNOT(q1,q3) · Block B: CNOT(q4,q5), CNOT(q4,q6) · Block C: CNOT(q7,q8), CNOT(q7,q9)" },
    { name: "Shor code complete", title: "One logical qubit, nine physical qubits",
      text: "The nine qubits form one encoded logical qubit. Correlations within blocks protect against bit flips, while correlations across blocks provide phase-error protection.", ops: "" },
  ];
  function renderShorBuild(root) {
    var sb = { preset: "0", step: 0, showCircuit: true, inspect: false, quiz: { i: 0, chosen: null } };
    var NSTEPS = SHOR_STAGES.length;

    root.innerHTML =
      "<div class='container'>" + backLink("#/module-2/phase-flip", "The Phase-Flip Problem") +
        pageHead("04", "Combining Quantum Protection", "Building the Shor Code", "Can we protect against bit flips and phase flips at the same time?") +
        "<p class='dek' style='margin-top:12px'>We already know how to protect against bit flips or phase flips separately. Shor's code combines both strategies: first we encode against phase errors, then we protect each branch against bit flips.</p>" +
        "<div class='keyidea' style='margin-top:16px'><span class='eyebrow'>Central question</span><p>How can one logical qubit be distributed across nine physical qubits?</p></div>" +
        "<div class='grid-two' style='margin-top:20px'>" +
          "<div class='quiet'><span class='eyebrow'>Bit-flip repetition</span><p class='caption' style='margin-top:6px'>3 physical qubits · protects against a single X error.</p></div>" +
          "<div class='quiet'><span class='eyebrow'>Phase-flip repetition</span><p class='caption' style='margin-top:6px'>3 physical qubits · protects against a single Z error.</p></div>" +
        "</div>" +
        "<div class='eq' style='margin-top:16px'><span class='m'>Shor code &nbsp; [[9, 1, 3]]</span></div>" +
        "<div class='grid3' style='margin-top:14px'>" +
          "<div class='quiet'><span class='eyebrow'>9</span><p class='caption' style='margin-top:6px'>physical qubits</p></div>" +
          "<div class='quiet'><span class='eyebrow'>1</span><p class='caption' style='margin-top:6px'>logical qubit</p></div>" +
          "<div class='quiet'><span class='eyebrow'>3</span><p class='caption' style='margin-top:6px'>code distance</p></div>" +
        "</div>" +
        "<p class='caption' style='margin-top:10px'>Distance three means the code can correct any error acting on a single physical qubit.</p>" +
        "<section id='ghz' style='margin-top:48px'>" +
          "<div class='page-head'><div class='meta'><span class='kick'>Prerequisites · gates</span></div><h2 class='headline' style='font-size:1.7rem'>Hadamard and CNOT</h2></div>" +
          "<div class='grid-two' style='margin-top:20px'>" +
            "<div><span class='eyebrow'>Hadamard</span>" +
              "<div class='eq' style='margin-top:10px'><span class='m'>H|0⟩ = (|0⟩ + |1⟩)/√2</span></div>" +
              "<div class='eq' style='margin-top:8px'><span class='m'>H|1⟩ = (|0⟩ − |1⟩)/√2</span></div>" +
              "<p class='caption' style='margin-top:8px'>Hadamard maps computational-basis states into superpositions with different relative phases.</p></div>" +
            "<div><span class='eyebrow'>CNOT</span>" +
              "<div class='eq' style='margin-top:10px'><span class='m'>|00⟩ → |00⟩, &nbsp; |01⟩ → |01⟩</span></div>" +
              "<div class='eq' style='margin-top:8px'><span class='m'>|10⟩ → |11⟩, &nbsp; |11⟩ → |10⟩</span></div>" +
              "<p class='caption' style='margin-top:8px'>CNOT flips the target only when the control is |1⟩. Applied to a superposition, it can create entanglement.</p>" +
              "<p class='caption' style='margin-top:4px'>First qubit = control, second = target.</p></div>" +
          "</div>" +
          "<div class='page-head' style='margin-top:40px'><div class='meta'><span class='kick'>Interactive · build a GHZ state</span></div><h2 class='headline' style='font-size:1.7rem'>Build a GHZ State</h2><p class='dek' style='margin-top:8px'>Let's use Hadamard and CNOT gates to create a three-qubit entangled state.</p></div>" +
          "<div class='grid-two' style='margin-top:24px'>" +
            "<div class='sticky-col'><div class='panel' id='ghz-viz'></div><div id='ghz-circuit' style='margin-top:16px'></div></div>" +
            "<div class='stack' id='ghz-controls'></div>" +
          "</div>" +
          "<div id='ghz-extra' style='margin-top:24px'></div>" +
        "</section>" +
        "<section class='grid-two' style='margin-top:32px'>" +
          "<div class='sticky-col'><div class='panel' id='sb-viz'></div><div id='sb-circuit' style='margin-top:16px'></div></div>" +
          "<div class='stack' id='sb-controls'></div>" +
        "</section>" +
        "<section id='sb-math' style='margin-top:48px'></section>" +
        "<section id='sb-challenge' style='margin-top:48px'></section>" +
        "<aside class='transition'><div class='big'>05</div><div><span class='eyebrow' style='color:var(--faint)'>Next</span>" +
          "<p class='q'>We built the code. How do we know when an error occurs?</p>" +
          "<p class='teaser'>Eight stabilizer measurements reveal where errors occurred — without reading the logical information.</p>" +
          "<div style='margin-top:20px'><a class='btn primary' href='#/module-2/shor-decoder'>Detect and Correct Errors →</a></div></div></aside>" +
      "</div>";

    function stateLabel(step) {
      return step === 0 ? "Initial state"
        : step === 1 ? "Phase-encoded state — q1, q4, q7"
        : step === 2 ? "Completed Shor encoding — three GHZ blocks"
        : "Completed Shor encoding — logical basis";
    }
    function stateNote(step) {
      if (step === 0) return "q1 holds the input; q2–q9 are ancillas in |0⟩.";
      if (step === 1) return "The other six qubits (q2, q3, q5, q6, q8, q9) remain in |0⟩.";
      return "";
    }
    function update() {
      var reg = Shor.stateAtStage(sb.preset, sb.step);
      var st = SHOR_STAGES[sb.step];
      $sel("#sb-viz", root).innerHTML = shorRegisterSVG({ stage: sb.step });
      $sel("#sb-circuit", root).innerHTML = sb.showCircuit
        ? "<div class='panel'><div class='shor-step' style='margin-bottom:8px'>Step " + (sb.step + 1) + " of " + NSTEPS + " — " + st.name + "</div>" + shorCircuitSVG({ step: sb.step }) + "</div>"
        : "";
      var ops = st.ops ? "<div class='quiet' style='margin-top:10px'><div class='caption'>Operations</div><div class='mono' style='font-size:12px;margin-top:4px'>" + st.ops + "</div></div>" : "";
      $sel("#sb-controls", root).innerHTML =
        "<div class='panel'><div class='shor-step'>Step " + (sb.step + 1) + " of " + NSTEPS + " — " + st.name + "</div>" +
          "<h3 style='margin-top:6px'>" + st.title + "</h3>" +
          "<p class='caption' style='margin-top:2px'>" + st.text + "</p>" + ops +
          "<div class='caption' style='margin-top:14px'>Logical input</div>" +
          "<div class='chip-row' style='margin-top:8px'>" + ["0", "1", "+"].map(function (k) { return "<button class='chip" + (sb.preset === k ? " active" : "") + "' data-sp='" + k + "'>" + Q.KET_LABEL[k] + "</button>"; }).join("") + "</div>" +
          "<div class='toolbar' style='margin-top:14px'>" +
            "<button class='btn' id='sb-prev'" + (sb.step === 0 ? " disabled" : "") + ">← Previous Step</button>" +
            "<button class='btn primary' id='sb-next'" + (sb.step >= NSTEPS - 1 ? " disabled" : "") + ">Next Step →</button>" +
            "<button class='btn ghost' id='sb-reset'>Reset</button>" +
            "<button class='btn ghost' id='sb-cct'>" + (sb.showCircuit ? "Hide Circuit" : "Show Circuit") + "</button>" +
          "</div></div>" +
        "<div class='panel'><div class='caption'>" + stateLabel(sb.step) + "</div><div class='state-eq' style='margin-top:6px'>" + shorSymbolic(sb.preset, sb.step) + "</div>" +
          (stateNote(sb.step) ? "<p class='caption' style='margin-top:8px'>" + stateNote(sb.step) + "</p>" : "") +
          "<div class='toolbar' style='margin-top:12px'><button class='btn ghost' id='sb-inspect'>" + (sb.inspect ? "Hide amplitudes" : "Inspect mathematical state") + "</button></div>" +
          (sb.inspect ? "<div class='quiet' style='margin-top:12px'><div class='caption'>Nonzero amplitudes (computational basis)</div><div class='state-eq' style='font-size:.95rem;margin-top:6px'>" + regHTML(reg, 9) + "</div></div>" : "") +
        "</div>";
      $all("#sb-controls [data-sp]", root).forEach(function (el) { el.addEventListener("click", function () { sb.preset = el.getAttribute("data-sp"); sb.step = 0; update(); }); });
      $sel("#sb-next", root).addEventListener("click", function () { if (sb.step < NSTEPS - 1) { sb.step++; update(); } });
      $sel("#sb-prev", root).addEventListener("click", function () { if (sb.step > 0) { sb.step--; update(); } });
      $sel("#sb-reset", root).addEventListener("click", function () { sb.step = 0; update(); });
      $sel("#sb-cct", root).addEventListener("click", function () { sb.showCircuit = !sb.showCircuit; update(); });
      $sel("#sb-inspect", root).addEventListener("click", function () { sb.inspect = !sb.inspect; update(); });
      updateMath();
    }
    function updateMath() {
      var box = $sel("#sb-math", root);
      if (sb.step === 0) { box.innerHTML = "<p class='caption'>Press Next Step to reveal the mathematics of each encoding stage.</p>"; return; }
      var heading = sb.step === 1 ? "Phase-flip encoding" : sb.step === 2 ? "GHZ blocks" : "The logical basis";
      var parts = ["<div class='page-head'><div class='meta'><span class='kick'>The mathematics</span></div><h2 class='headline' style='font-size:1.6rem'>" + heading + "</h2></div>"];
      if (sb.step === 1) {
        parts.push("<div class='eq' style='margin-top:14px'><span class='m'>α|0⟩ + β|1⟩ &nbsp;→&nbsp; α|+++⟩ + β|−−−⟩</span></div>");
        parts.push("<p class='caption' style='margin-top:10px'>This is the phase-flip repetition code applied to q1, q4 and q7. The remaining six qubits stay in |0⟩.</p>");
      } else if (sb.step === 2) {
        parts.push("<div class='grid-two' style='margin-top:14px'>" +
          "<div class='eq'><span class='m'>|G<sub>+</sub>⟩ = (|000⟩ + |111⟩)/√2</span></div>" +
          "<div class='eq'><span class='m'>|G<sub>−</sub>⟩ = (|000⟩ − |111⟩)/√2</span></div></div>");
        parts.push("<div class='eq' style='margin-top:8px'><span class='m'>|+⟩|00⟩ → |G<sub>+</sub>⟩, &nbsp; |−⟩|00⟩ → |G<sub>−</sub>⟩</span></div>");
        parts.push("<p class='caption' style='margin-top:10px'>Each three-qubit block stores information in a shared quantum state rather than three independent copies. The correlations inside each block enable bit-flip error detection.</p>");
      } else {
        parts.push("<div class='eq' style='margin-top:14px'><span class='m'>|0<sub>L</sub>⟩ = |G<sub>+</sub>⟩<sup>⊗3</sup>, &nbsp; |1<sub>L</sub>⟩ = |G<sub>−</sub>⟩<sup>⊗3</sup></span></div>");
        parts.push("<div class='eq' style='margin-top:8px'><span class='m'>|ψ<sub>L</sub>⟩ = α|0<sub>L</sub>⟩ + β|1<sub>L</sub>⟩</span></div>");
        parts.push("<div class='page-head' style='margin-top:32px'><div class='meta'><span class='kick'>Conclusion</span></div><h2 class='headline' style='font-size:1.4rem'>Two layers of protection</h2></div>");
        parts.push("<div class='shor-layers' style='margin-top:14px'>" +
          "<div class='shor-layer'><div class='t'>Within each block</div><div class='d'>Bit-flip error detection, from the GHZ correlations inside each three-qubit block.</div></div>" +
          "<div class='shor-layer'><div class='t'>Between blocks</div><div class='d'>Phase-flip error detection, from the relationships across the three blocks.</div></div></div>");
        parts.push("<p class='caption' style='margin-top:12px'>This combination is what lets the Shor code correct an arbitrary single-qubit error. The protection comes from the encoded state and its stabilizer structure — not merely from grouping qubits into blocks.</p>");
      }
      box.innerHTML = parts.join("");
    }
    var QUIZ = [
      { q: "Which gate expands Block A into a GHZ block (after the H gates)?", opts: ["CNOT q1→q2", "CNOT q2→q3", "H on q2"], correct: 0, why: "The first fan-out copies q1 into q2, entangling the second qubit of the block." },
      { q: "Which pair does the second Block-A CNOT connect?", opts: ["q1→q3", "q1→q6", "q4→q3"], correct: 0, why: "Block A is q1, q2, q3, so the second CNOT is q1→q3." },
      { q: "Where are the Hadamards applied in the phase stage?", opts: ["q1, q4, q7", "q2, q5, q8", "q1, q2, q3"], correct: 0, why: "The three branch representatives are q1, q4 and q7." },
    ];
    function updateChallenge() {
      var it = QUIZ[sb.quiz.i];
      var fb = "";
      if (sb.quiz.chosen != null) {
        fb = "<div class='feedback " + (sb.quiz.chosen === it.correct ? "ok" : "no") + "' style='margin-top:12px' role='status'>" +
          (sb.quiz.chosen === it.correct ? "✓ Correct. " + it.why : "✗ Not quite. " + it.why) + "</div>";
      }
      $sel("#sb-challenge", root).innerHTML =
        "<div class='page-head'><div class='meta'><span class='kick'>Challenge · complete the encoding</span></div><h2 class='headline' style='font-size:1.6rem'>Which operation completes the next step?</h2></div>" +
        "<div class='panel' style='margin-top:16px'><p class='caption'>" + it.q + "</p>" +
          "<div class='chip-row' style='margin-top:10px'>" + it.opts.map(function (op, i) {
            return "<button class='chip" + (sb.quiz.chosen === i ? " active" : "") + "' data-quiz='" + i + "'>" + op + "</button>";
          }).join("") + "</div>" +
          fb +
          (sb.quiz.chosen != null ? "<div class='toolbar' style='margin-top:12px'><button class='btn' id='sb-quiz-next'>Next question →</button></div>" : "") +
        "</div>";
      $all("#sb-challenge [data-quiz]", root).forEach(function (el) { el.addEventListener("click", function () { sb.quiz.chosen = Number(el.getAttribute("data-quiz")); updateChallenge(); }); });
      var nx = $sel("#sb-quiz-next", root); if (nx) nx.addEventListener("click", function () { sb.quiz.i = (sb.quiz.i + 1) % QUIZ.length; sb.quiz.chosen = null; updateChallenge(); });
    }

    // ---- GHZ prerequisites (interactive) ----
    var gz = { step: 0, minus: false };
    var GHZ_STEPS = [
      { name: "Initial state", title: "Start from |000⟩", text: "Three qubits, all in |0⟩." },
      { name: "Hadamard on q1", title: "Create a superposition", text: "H on q1 gives (|000⟩ + |100⟩)/√2." },
      { name: "CNOT(q1, q2)", title: "Entangle q2 with q1", text: "CNOT entangles q2: (|000⟩ + |110⟩)/√2." },
      { name: "CNOT(q1, q3)", title: "Entangle q3 too", text: "CNOT entangles q3: (|000⟩ + |111⟩)/√2 = |G+⟩." },
    ];
    function ghzStateHTML() {
      if (gz.step === 0) return "<span class='m'>|000⟩</span>";
      if (gz.step === 1) return "<span class='m'>(|000⟩ + |100⟩)/√2</span>";
      if (gz.step === 2) return "<span class='m'>(|000⟩ + |110⟩)/√2</span>";
      return "<span class='m'>(|000⟩ " + (gz.minus ? "−" : "+") + " |111⟩)/√2 = " + (gz.minus ? "|G<sub>−</sub>⟩" : "|G<sub>+</sub>⟩") + "</span>";
    }
    function updateGhz() {
      var st = GHZ_STEPS[gz.step];
      $sel("#ghz-viz", root).innerHTML = ghzRegisterSVG({ active: [0, 1, 2].slice(0, gz.step) }) +
        "<div class='quiet' style='margin-top:12px'><div class='caption'>State</div><div class='state-eq'>" + ghzStateHTML() + "</div></div>";
      $sel("#ghz-circuit", root).innerHTML = "<div class='panel'><div class='shor-step' style='margin-bottom:8px'>Step " + (gz.step + 1) + " of 4 — " + st.name + "</div>" + ghzCircuitSVG({ step: gz.step }) + "</div>";
      $sel("#ghz-controls", root).innerHTML =
        "<div class='panel'><div class='shor-step'>Step " + (gz.step + 1) + " of 4 — " + st.name + "</div>" +
          "<h3 style='margin-top:6px'>" + st.title + "</h3>" +
          "<p class='caption' style='margin-top:2px'>" + st.text + "</p>" +
          "<div class='toolbar' style='margin-top:14px'>" +
            "<button class='btn' id='gz-prev'" + (gz.step === 0 ? " disabled" : "") + ">← Previous</button>" +
            "<button class='btn primary' id='gz-next'" + (gz.step >= 3 ? " disabled" : "") + ">Next →</button>" +
            "<button class='btn ghost' id='gz-reset'>Reset</button>" +
          "</div></div>" +
        (gz.step >= 3 ? "<div class='panel'><h3>GHZ phase</h3><div class='chip-row' style='margin-top:8px'>" +
            "<button class='chip" + (!gz.minus ? " active" : "") + "' data-gzp='plus'>G+</button>" +
            "<button class='chip" + (gz.minus ? " active" : "") + "' data-gzp='minus'>G−</button></div>" +
            "<div class='eq' style='margin-top:10px'><span class='m'>|G<sub>+</sub>⟩ = (|000⟩ + |111⟩)/√2</span></div>" +
            "<div class='eq' style='margin-top:6px'><span class='m'>|G<sub>−</sub>⟩ = (|000⟩ − |111⟩)/√2</span></div>" +
            "<p class='caption' style='margin-top:8px'>Applying Z to one physical qubit changes |G+⟩ into |G−⟩, flipping the relative sign (up to a global phase).</p></div>" : "") +
        (gz.step >= 3 ? "<div class='notice'><p>The three qubits are entangled. This state cannot be represented as three independent single-qubit states.</p><details class='expand' style='margin-top:10px'><summary>Why is it entangled?</summary><div class='body'>It is a single shared superposition of |000⟩ and |111⟩. Measuring one qubit instantly determines the other two, and the amplitudes cannot be factored into a product of three one-qubit states. It is not three copies of |+⟩.</div></details></div>" : "");
      $sel("#ghz-extra", root).innerHTML =
        "<div class='page-head'><div class='meta'><span class='kick'>Tensor product</span></div><h2 class='headline' style='font-size:1.4rem'>From one block to three</h2></div>" +
        "<div class='eq' style='margin-top:12px'><span class='m'>|G<sub>+</sub>⟩<sup>⊗3</sup> = |G<sub>+</sub>⟩ ⊗ |G<sub>+</sub>⟩ ⊗ |G<sub>+</sub>⟩</span></div>" +
        "<p class='caption' style='margin-top:8px'>The tensor product combines three GHZ blocks into a nine-qubit state — the logical |0<sub>L</sub>⟩ of the Shor code.</p>" +
        "<p class='dek' style='margin-top:16px'>One GHZ state entangles three qubits. Shor's code combines three GHZ blocks to protect one logical qubit.</p>";
      $all("#ghz-controls [data-gzp]", root).forEach(function (el) { el.addEventListener("click", function () { gz.minus = el.getAttribute("data-gzp") === "minus"; updateGhz(); }); });
      $sel("#gz-next", root).addEventListener("click", function () { if (gz.step < 3) { gz.step++; if (gz.step < 3) gz.minus = false; updateGhz(); } });
      $sel("#gz-prev", root).addEventListener("click", function () { if (gz.step > 0) { gz.step--; gz.minus = false; updateGhz(); } });
      $sel("#gz-reset", root).addEventListener("click", function () { gz.step = 0; gz.minus = false; updateGhz(); });
    }

    updateGhz(); update(); updateChallenge();
    return null;
  }

  /* ==================================================================
   * 8d. Page 5 · Detecting and Correcting Errors (Shor decoder)
   * ================================================================== */
  function renderShorDecoder(root) {
    var sd = {
      preset: "0", sel: 0, error: null, measured: null,
      stabView: "all", selStab: null, corrections: null, applied: false,
    };

    root.innerHTML =
      "<div class='container'>" + backLink("#/module-2/shor-code", "Building the Shor Code") +
        pageHead("05", "The Shor Decoder", "Detecting and Correcting Errors", "How can eight stabilizers protect one logical qubit?") +
        "<p class='dek' style='margin-top:12px'>Our nine qubits are encoded, but errors can still occur. Shor's code uses eight stabilizer measurements to detect errors without directly reading the logical information. Each measured eigenvalue is +1 or −1, giving an eight-bit syndrome.</p>" +
        "<div class='toolbar' style='margin-top:16px'>" +
          "<button class='chip' data-sv='z'>Bit-flip checks · ZZ</button>" +
          "<button class='chip' data-sv='x'>Phase-flip checks · X</button>" +
          "<button class='chip' data-sv='all'>All checks</button>" +
        "</div>" +
        "<p class='caption' style='margin-top:8px'><strong>Z-type checks</strong> detect bit flips inside each block. <strong>X-type checks</strong> detect phase flips by comparing neighboring blocks. Click a check to highlight its qubits.</p>" +
        "<div class='stabs' id='sd-stabs' style='margin-top:12px'></div>" +
        "<section class='grid-two' style='margin-top:32px'>" +
          "<div class='sticky-col'><div class='panel' id='sd-viz'></div><div class='quiet' style='margin-top:16px'><div class='caption'>Encoded logical state</div><div class='state-eq' id='sd-state'></div></div></div>" +
          "<div class='stack' id='sd-controls'></div>" +
        "</section>" +
        "<section id='sd-discovery' style='margin-top:48px'></section>" +
        "<aside class='transition'><div class='big'>06</div><div><span class='eyebrow' style='color:var(--faint)'>Next</span>" +
          "<p class='q'>What happens when more than one physical qubit is affected?</p>" +
          "<p class='teaser'>Beyond a single error, the code can fail — that is where code distance matters.</p>" +
          "<div style='margin-top:20px'><a class='btn primary' href='#/module-2/break-code'>Break the Code →</a></div></div></aside>" +
      "</div>";

    $all("[data-sv]", root).forEach(function (el) {
      el.addEventListener("click", function () { sd.stabView = el.getAttribute("data-sv"); update(); });
    });

    function stabHighlight() {
      if (!sd.selStab) return null;
      var st = Shor.STABILIZERS.filter(function (s) { return s.id === sd.selStab; })[0];
      return { type: st.type, stab: st.id, qubits: stabQubits(st) };
    }
    function updateStabs() {
      var list = Shor.STABILIZERS.filter(function (s) {
        return sd.stabView === "all" || (sd.stabView === "z" && s.type === "Z") || (sd.stabView === "x" && s.type === "X");
      });
      $sel("#sd-stabs", root).innerHTML = list.map(function (s) {
        var res = sd.measured ? (sd.measured.outcomes[Shor.STABILIZERS.indexOf(s)] === 1 ? "+1" : "−1") : "";
        return "<div class='stab" + (sd.selStab === s.id ? " active" : "") + "' data-stab='" + s.id + "'>" +
          "<span class='m'>" + s.id + " = " + Shor.STABILIZER_LABEL[s.id] + "</span>" +
          (res ? "<span class='res " + (res === "+1" ? "pos" : "neg") + "'>" + res + "</span>" : "") + "</div>";
      }).join("");
      $all("#sd-stabs [data-stab]", root).forEach(function (el) {
        el.addEventListener("click", function () { sd.selStab = (sd.selStab === el.getAttribute("data-stab")) ? null : el.getAttribute("data-stab"); update(); });
      });
      $all("[data-sv]", root).forEach(function (el) { el.classList.toggle("active", el.getAttribute("data-sv") === sd.stabView); });
    }
    function update() {
      var base = Shor.encode(sd.preset);
      var withErr = sd.error ? Shor.applyPauliN(base, sd.error.q, sd.error.pauli) : base;
      var corrected = (sd.applied && sd.corrections) ? Shor.applyCorrection(withErr, sd.corrections) : withErr;
      $sel("#sd-viz", root).innerHTML = shorRegisterSVG({
        sel: sd.sel, errors: sd.error ? [sd.error] : [], corrections: (sd.applied && sd.corrections) ? sd.corrections : [],
        highlight: stabHighlight(), outcomes: sd.measured ? sd.measured.outcomes : null,
      });
      $sel("#sd-state", root).innerHTML = shorEncodedSymbolic(sd.preset) +
        (sd.error ? "<div class='caption' style='margin-top:8px'>After applying " + sd.error.pauli + " to q" + (sd.error.q + 1) + "</div>" : "");

      var syndromeHTMLStr = "";
      if (sd.measured) {
        var bits = sd.measured.bits, detected = bits.join("") !== "00000000";
        syndromeHTMLStr = "<div style='margin-top:12px'>" +
          "<div class='cmp-row'><span class='caption'>Bit-flip checks (S₁–S₆)</span><span class='m'>" + bits.slice(0, 6).join(" ") + "</span></div>" +
          "<div class='cmp-row'><span class='caption'>Phase-flip checks (S₇–S₈)</span><span class='m'>" + bits.slice(6, 8).join(" ") + "</span></div>" +
          "<div class='cmp-row'><span class='caption'>Syndrome s</span><span class='m'>(" + bits.join(", ") + ")</span></div>" +
          "<div class='cmp-row'><span class='caption'>Result</span><span class='result-tag " + (detected ? "detected" : "undetected") + "'>" + (detected ? "Detected" : "No defect") + "</span></div>" +
        "</div>";
      }
      var suggested = sd.measured ? Shor.decode(sd.measured.bits) : null;
      var recovery = "";
      if (sd.applied) {
        var ok = Shor.recovered(corrected, base);
        recovery = "<div class='feedback " + (ok ? "ok" : "no") + "' style='margin-top:12px' role='status'>" + (ok ? "Logical state recovered." : "Logical recovery failed.") + "</div>";
      }
      $sel("#sd-controls", root).innerHTML =
        "<div class='panel'><h3>Shor error decoder</h3>" +
          "<div class='caption'>Encoded logical input</div>" +
          "<div class='chip-row' style='margin-top:8px'>" + ["0", "1", "+"].map(function (k) { return "<button class='chip" + (sd.preset === k ? " active" : "") + "' data-sd='" + k + "'>" + Q.KET_LABEL[k] + "</button>"; }).join("") + "</div>" +
          "<div class='caption' style='margin-top:14px'>Physical qubit</div>" +
          "<div class='chip-row' style='margin-top:8px'>" + [0,1,2,3,4,5,6,7,8].map(function (q) { return "<button class='chip" + (sd.sel === q ? " active" : "") + "' data-sq='" + q + "'>q" + (q + 1) + "</button>"; }).join("") + "</div>" +
          "<div class='caption' style='margin-top:14px'>Apply an error</div>" +
          "<div class='toolbar' style='margin-top:8px'><button class='btn' id='sd-x'>Apply X</button><button class='btn' id='sd-z'>Apply Z</button><button class='btn' id='sd-y'>Apply Y</button></div>" +
          "<div class='toolbar' style='margin-top:14px'><button class='btn primary' id='sd-measure'" + (sd.measured ? " disabled" : "") + ">Measure Stabilizers</button><button class='btn ghost' id='sd-reset'>Reset</button></div>" +
          syndromeHTMLStr +
          (suggested && !sd.applied ? "<div class='notice' style='margin-top:12px'><p>Suggested correction: <strong>" + Shor.correctionLabel(suggested) + "</strong>. " + (sd.error && sd.error.pauli === "Z" ? "A pure Z error is only located up to its block — any representative in that block works." : "") + "</p></div>" : "") +
          (suggested && !sd.applied ? "<div class='toolbar' style='margin-top:12px'><button class='btn' id='sd-apply'>Apply correction</button></div>" : "") +
          recovery +
        "</div>";
      $all("#sd-controls [data-sd]", root).forEach(function (el) { el.addEventListener("click", function () { sd.preset = el.getAttribute("data-sd"); sd.error = null; sd.measured = null; sd.corrections = null; sd.applied = false; update(); }); });
      $all("#sd-controls [data-sq]", root).forEach(function (el) { el.addEventListener("click", function () { sd.sel = Number(el.getAttribute("data-sq")); update(); }); });
      $sel("#sd-x", root).addEventListener("click", function () { setError("X"); });
      $sel("#sd-z", root).addEventListener("click", function () { setError("Z"); });
      $sel("#sd-y", root).addEventListener("click", function () { setError("Y"); });
      $sel("#sd-measure", root).addEventListener("click", function () {
        var reg = sd.error ? Shor.applyPauliN(Shor.encode(sd.preset), sd.error.q, sd.error.pauli) : Shor.encode(sd.preset);
        sd.measured = Shor.measureSyndrome(reg); updateStabs(); update();
      });
      $sel("#sd-reset", root).addEventListener("click", function () { sd.error = null; sd.measured = null; sd.corrections = null; sd.applied = false; updateStabs(); update(); });
      var ap = $sel("#sd-apply", root); if (ap) ap.addEventListener("click", function () { sd.corrections = Shor.decode(sd.measured.bits); sd.applied = true; update(); });
      updateStabs();
      updateDiscovery();
    }
    function setError(p) { sd.error = { q: sd.sel, pauli: p }; sd.measured = null; sd.corrections = null; sd.applied = false; update(); }

    function updateDiscovery() {
      $sel("#sd-discovery", root).innerHTML =
        "<div class='page-head'><div class='meta'><span class='kick'>The discovery · the syndrome is not always unique</span></div><h2 class='headline' style='font-size:1.6rem'>Different errors, same syndrome</h2></div>" +
        "<div class='eq' style='margin-top:14px'><span class='m'>Z<sub>1</sub>, &nbsp; Z<sub>2</sub>, &nbsp; Z<sub>3</sub></span></div>" +
        "<p class='dek' style='margin-top:12px'>These three physical phase errors produce the same syndrome because they occur within the same Shor block.</p>" +
        "<p class='caption' style='margin-top:8px'>Different physical errors can produce the same syndrome and still admit an equivalent logical correction.</p>";
    }

    update();
    return null;
  }

  /* ==================================================================
   * 8e. Page 6 · Breaking the Code
   * ================================================================== */
  function applyLetters(reg, letters) { var r = reg; for (var i = 0; i < letters.length; i++) if (letters[i] !== "I") r = Shor.applyPauliN(r, i, letters[i]); return r; }
  function patternFromLetters(letters) { var p = []; for (var i = 0; i < letters.length; i++) if (letters[i] !== "I") p.push({ q: i, pauli: letters[i] }); return p; }

  function renderBreakCode(root) {
    var bc = { preset: "0", letters: Noise.identity(9), sel: 0, measured: null, correction: null, applied: false };
    var MAXW = 3;

    root.innerHTML =
      "<div class='container'>" + backLink("#/module-2/shor-decoder", "Detecting and Correcting Errors") +
        pageHead("06", "The Limits of Protection", "Breaking the Code", "How many errors can Shor's code survive?") +
        "<p class='dek' style='margin-top:12px'>Shor's code can correct any error affecting a single physical qubit. But what happens when several qubits are affected? Let's push the code beyond its guaranteed protection.</p>" +
        "<section class='grid-two' style='margin-top:32px'>" +
          "<div class='sticky-col'><div class='panel' id='bc-viz'></div><div class='quiet' style='margin-top:16px'><div class='caption'>Pauli error — weight wt(E)</div><div class='state-eq' id='bc-error'></div></div></div>" +
          "<div class='stack' id='bc-controls'></div>" +
        "</section>" +
        "<section id='bc-discovery' style='margin-top:48px'></section>" +
        "<section id='bc-challenge' style='margin-top:48px'></section>" +
        "<aside class='transition'><div class='big'>07</div><div><span class='eyebrow' style='color:var(--faint)'>Next</span>" +
          "<p class='q'>A code has limits. But how often do those limits matter?</p>" +
          "<p class='teaser'>Realistic noise is probabilistic. Let's compare how often unprotected and encoded quantum information survives.</p>" +
          "<div style='margin-top:20px'><a class='btn primary' href='#/module-2/noise-lab'>Enter the Noise Laboratory →</a></div></div></aside>" +
      "</div>";

    function reset() { bc.letters = Noise.identity(9); bc.measured = null; bc.correction = null; bc.applied = false; }
    function update() {
      var base = Shor.encode(bc.preset);
      var reg = applyLetters(base, bc.letters);
      var bits = Noise.syndrome(Noise.CODES.shor, bc.letters);
      var w = Noise.weight(bc.letters);
      $sel("#bc-viz", root).innerHTML = shorRegisterSVG({
        sel: bc.sel, errors: patternFromLetters(bc.letters),
        corrections: (bc.applied && bc.correction) ? bc.correction : [],
        outcomes: bc.measured ? bc.measured.outcomes : null,
      });
      $sel("#bc-error", root).innerHTML = "<span class='m'>" + Noise.pauliLabel(bc.letters) + "</span> <span class='caption'>· weight " + w + "</span>";

      $sel("#bc-controls", root).innerHTML =
        "<div class='panel'><h3>Break Shor</h3>" +
          "<div class='caption'>Logical input</div>" +
          "<div class='chip-row' style='margin-top:8px'>" + ["0", "1", "+"].map(function (k) { return "<button class='chip" + (bc.preset === k ? " active" : "") + "' data-bcp='" + k + "'>" + Q.KET_LABEL[k] + "</button>"; }).join("") + "</div>" +
          "<div class='caption' style='margin-top:14px'>Physical qubit (up to three distinct)</div>" +
          "<div class='chip-row' style='margin-top:8px'>" + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (q) { return "<button class='chip" + (bc.sel === q ? " active" : "") + "' data-bcq='" + q + "'>q" + (q + 1) + "</button>"; }).join("") + "</div>" +
          "<div class='toolbar' style='margin-top:10px'><button class='btn' id='bc-x'>Apply X</button><button class='btn' id='bc-y'>Apply Y</button><button class='btn' id='bc-z'>Apply Z</button></div>" +
          "<div class='toolbar' style='margin-top:12px'><button class='btn primary' id='bc-measure'" + (bc.measured ? " disabled" : "") + ">Measure Stabilizers</button><button class='btn ghost' id='bc-clear'>Clear error</button><button class='btn ghost' id='bc-reset'>Reset</button></div>" +
          (bc.measured ? "<div class='toolbar' style='margin-top:12px'><button class='btn' id='bc-apply'" + (bc.applied ? " disabled" : "") + ">Apply decoder correction</button></div>" : "") +
        "</div>" +
        "<div class='panel'><h3>Result</h3><div id='bc-summary'></div></div>";

      var summary = "<div class='cmp-row'><span class='caption'>Error weight</span><span class='m'>" + w + "</span></div>" +
        "<div class='cmp-row'><span class='caption'>Syndrome</span><span class='m'>" + (bc.measured ? "(" + bits.join(", ") + ")" : "not measured") + "</span></div>";
      if (bc.applied) {
        var correctedReg = Shor.applyCorrection(reg, bc.correction);
        var cls = Noise.classify(Noise.CODES.shor, bc.letters, true);
        var stateOk = Shor.recovered(correctedReg, base);
        var logicalTxt = cls.stabilizer ? "No logical change" : "Logical error " + (cls.logical === "X" ? "X̄" : cls.logical === "Z" ? "Z̄" : cls.logical === "Y" ? "Ȳ" : "(nontrivial)");
        summary += "<div class='cmp-row'><span class='caption'>Logical result</span><span class='result-tag " + (cls.stabilizer ? "detected" : "undetected") + "'>" + logicalTxt + "</span></div>";
        summary += "<div class='cmp-row'><span class='caption'>Selected-input state</span><span class='m'>" + (stateOk ? "recovered" : "differs") + "</span></div>";
        if (w >= 2 && !cls.stabilizer) summary += "<p class='caption' style='margin-top:10px'>" + w + " physical errors occurred. This pattern is outside the guaranteed correction range.</p>";
        else if (cls.stabilizer && w >= 2) summary += "<p class='caption' style='margin-top:10px'>This error is equivalent to a stabilizer and does not damage the encoded information.</p>";
      }
      $sel("#bc-summary", root).innerHTML = summary;

      $all("#bc-controls [data-bcp]", root).forEach(function (el) { el.addEventListener("click", function () { bc.preset = el.getAttribute("data-bcp"); reset(); update(); }); });
      $all("#bc-controls [data-bcq]", root).forEach(function (el) { el.addEventListener("click", function () { bc.sel = Number(el.getAttribute("data-bcq")); update(); }); });
      function apply(pauli) {
        if (bc.letters[bc.sel] === "I" && Noise.weight(bc.letters) >= MAXW) return;
        bc.letters = bc.letters.slice();
        bc.letters[bc.sel] = Noise.mulLetters(bc.letters[bc.sel], pauli);
        bc.measured = null; bc.correction = null; bc.applied = false; update();
      }
      $sel("#bc-x", root).addEventListener("click", function () { apply("X"); });
      $sel("#bc-y", root).addEventListener("click", function () { apply("Y"); });
      $sel("#bc-z", root).addEventListener("click", function () { apply("Z"); });
      $sel("#bc-clear", root).addEventListener("click", function () { bc.letters = Noise.identity(9); bc.measured = null; bc.correction = null; bc.applied = false; update(); });
      $sel("#bc-reset", root).addEventListener("click", function () { reset(); bc.preset = "0"; bc.sel = 0; update(); });
      $sel("#bc-measure", root).addEventListener("click", function () { bc.measured = Shor.measureSyndrome(reg); update(); updateChallenge(); });
      var ap = $sel("#bc-apply", root); if (ap) ap.addEventListener("click", function () { bc.correction = Shor.decode(bits); bc.applied = true; update(); });
      updateChallenge();
    }
    function updateDiscovery() {
      $sel("#bc-discovery", root).innerHTML =
        "<div class='page-head'><div class='meta'><span class='kick'>Discovery · code distance</span></div><h2 class='headline' style='font-size:1.6rem'>What is code distance?</h2></div>" +
        "<p class='dek' style='margin-top:12px'>A code is described by [[n, k, d]]: n physical qubits, k encoded logical qubits, and distance d — the minimum weight of a nontrivial logical Pauli operator.</p>" +
        "<div class='eq' style='margin-top:12px'><span class='m'>Shor: [[9, 1, 3]], &nbsp; t = ⌊(d−1)/2⌋ = 1</span></div>" +
        "<p class='caption' style='margin-top:8px'>A distance-three code guarantees correction of any single-qubit error. Some weight-two errors may still be corrected, but not all.</p>" +
        "<div class='grid-two' style='margin-top:16px'>" +
          "<div class='eq'><span class='m'>X̄ = Z<sub>1</sub>Z<sub>4</sub>Z<sub>7</sub></span></div>" +
          "<div class='eq'><span class='m'>Z̄ = X<sub>1</sub>X<sub>2</sub>X<sub>3</sub></span></div></div>" +
        "<p class='caption' style='margin-top:8px'>These logical operators commute with every stabilizer but are not themselves stabilizers: they act nontrivially on the code space.</p>";
    }
    function updateChallenge() {
      var bits = Noise.syndrome(Noise.CODES.shor, bc.letters);
      var cls = Noise.classify(Noise.CODES.shor, bc.letters, false);
      var logicalZero = bits.every(function (b) { return b === 0; });
      var success = logicalZero && !cls.stabilizer;
      var fb = success
        ? "<div class='feedback ok' style='margin-top:12px' role='status'>✓ No stabilizer detected the error, yet the logical information changed. This is a nontrivial logical operator (" + (cls.logical === "X" ? "X̄" : cls.logical === "Z" ? "Z̄" : "Ȳ") + ").</div><p class='caption' style='margin-top:10px'>The code distance is three because a nontrivial logical operator can act on only three physical qubits, but none can act on fewer than three.</p>"
        : "<div class='caption' style='margin-top:12px'>Current error: weight " + Noise.weight(bc.letters) + (logicalZero ? " · syndrome 00000000." : " · syndrome non-zero (detectable).") + "</div>";
      $sel("#bc-challenge", root).innerHTML =
        "<div class='page-head'><div class='meta'><span class='kick'>Challenge · break Shor without an alarm</span></div><h2 class='headline' style='font-size:1.6rem'>Can you break Shor without triggering an alarm?</h2></div>" +
        "<p class='dek' style='margin-top:12px'>Construct a weight-three error whose syndrome is 00000000 and that changes the logical state. One valid answer is Z₁Z₄Z₇.</p>" + fb;
    }
    update(); updateDiscovery();
    return null;
  }

  /* ==================================================================
   * 8f. Page 7 · Noise Laboratory
   * ================================================================== */
  var CHART_COLORS = { single: "#9aa0aa", rep3: "#9a4f72", shor: "#2f5d8a" };
  function chartSVG(series, pNow) {
    var W = 640, H = 320, mL = 58, mR = 16, mT = 16, mB = 44, pw = W - mL - mR, ph = H - mT - mB;
    function X(p) { return mL + (p / 0.5) * pw; }
    function Y(v) { return mT + (1 - Math.max(0, Math.min(1, v))) * ph; }
    var s = "<svg class='chart' viewBox='0 0 " + W + " " + H + "' role='img' aria-label='Logical failure probability versus physical error probability'>";
    for (var gi = 0; gi <= 5; gi++) { var v = gi / 5, y = Y(v); s += "<line class='ch-grid' x1='" + mL + "' y1='" + y + "' x2='" + (W - mR) + "' y2='" + y + "'/><text class='ch-lbl' x='" + (mL - 8) + "' y='" + (y + 4) + "' text-anchor='end'>" + v.toFixed(1) + "</text>"; }
    for (var pi = 0; pi <= 5; pi++) { var pv = pi / 10, x = X(pv); s += "<line class='ch-grid' x1='" + x + "' y1='" + mT + "' x2='" + x + "' y2='" + (H - mB) + "'/><text class='ch-lbl' x='" + x + "' y='" + (H - mB + 16) + "' text-anchor='middle'>" + pv.toFixed(1) + "</text>"; }
    s += "<text class='ch-lbl' x='" + (mL + pw / 2) + "' y='" + (H - 6) + "' text-anchor='middle'>Physical error probability p</text>";
    s += "<text class='ch-lbl' x='16' y='" + (mT + ph / 2) + "' text-anchor='middle' transform='rotate(-90 16 " + (mT + ph / 2) + ")'>Logical failure probability</text>";
    s += "<line class='ch-cursor' x1='" + X(pNow) + "' y1='" + mT + "' x2='" + X(pNow) + "' y2='" + (H - mB) + "'/>";
    series.forEach(function (ser) {
      var d = ser.points.map(function (pt, i) { return (i ? "L" : "M") + X(pt.x).toFixed(1) + " " + Y(pt.y).toFixed(1); }).join(" ");
      s += "<path class='ch-line' d='" + d + "' style='stroke:" + ser.color + "'/>";
      var at = ser.points.reduce(function (best, pt) { return Math.abs(pt.x - pNow) < Math.abs(best.x - pNow) ? pt : best; }, ser.points[0]);
      s += "<circle class='ch-dot' cx='" + X(at.x) + "' cy='" + Y(at.y) + "' r='3.5' style='fill:" + ser.color + "'/>";
    });
    return s + "</svg>";
  }

  function renderNoiseLab(root) {
    var nl = { model: "x", p: 0.05, trials: 1000, correction: true, mc: null };
    var quiz = Quiz.createState();

    root.innerHTML =
      "<div class='container'>" + backLink("#/module-2/break-code", "Breaking the Code") +
        pageHead("07", "Quantum Reliability", "Noise Laboratory", "Does quantum error correction always improve reliability?") +
        "<p class='dek' style='margin-top:12px'>Encoding information across multiple qubits can protect against errors, but it also exposes more physical qubits to noise. Does the protection outweigh the risk? Let's find out experimentally.</p>" +
        "<section style='margin-top:32px'><div class='stack' id='nl-controls'></div></section>" +
        "<section style='margin-top:24px'><div class='panel'><div class='caption'>Logical failure probability vs physical error rate</div><div id='nl-chart' style='margin-top:8px'></div><div class='legend-chart' id='nl-legend'></div></div></section>" +
        "<section id='nl-summary' style='margin-top:24px'></section>" +
        "<section id='nl-discovery' style='margin-top:48px'></section>" +
        "<section id='nl-quiz' style='margin-top:64px'></section>" +
        "<aside class='transition'><div class='big'>M3</div><div><span class='eyebrow' style='color:var(--faint)'>Next module</span>" +
          "<p class='q'>Can a code detect errors it cannot correct — and still be useful?</p>" +
          "<p class='teaser'>The Iceberg code shows detection without correction — the next module.</p>" +
          "<div style='margin-top:20px'><a class='btn primary' href='#/module-4'>Explore the Iceberg Code →</a></div></div></aside>" +
      "</div>";

    function systems() {
      return [
        { key: "single", code: Noise.CODES.single, color: CHART_COLORS.single, correction: false },
        { key: "rep3", code: Noise.CODES.rep3, color: CHART_COLORS.rep3, correction: nl.correction },
        { key: "shor", code: Noise.CODES.shor, color: CHART_COLORS.shor, correction: nl.correction },
      ];
    }
    function curve(sys) { var pts = []; for (var i = 0; i <= 50; i++) { var p = i / 100; pts.push({ x: p, y: Noise.exactPL(sys.code, nl.model, p, sys.correction) }); } return pts; }
    function update() {
      var sys = systems();
      $sel("#nl-chart", root).innerHTML = chartSVG(sys.map(function (s) { return { color: s.color, points: curve(s) }; }), nl.p);
      $sel("#nl-legend", root).innerHTML = sys.map(function (s) { return "<span><i style='background:" + s.color + "'></i>" + s.code.label + (s.correction ? " · corrected" : " · uncorrected") + "</span>"; }).join("");
      var pct = (nl.p / 0.5) * 100;
      $sel("#nl-controls", root).innerHTML =
        "<div class='panel'><h3>Noise Laboratory</h3>" +
          "<div class='caption'>Noise model</div><div class='chip-row' style='margin-top:8px'>" +
            [["x", "Bit flip (X)"], ["z", "Phase flip (Z)"], ["depol", "Pauli depolarizing"]].map(function (m) { return "<button class='chip" + (nl.model === m[0] ? " active" : "") + "' data-nlm='" + m[0] + "'>" + m[1] + "</button>"; }).join("") + "</div>" +
          "<div class='slider' style='margin-top:14px'><div class='slider-head'><label for='nl-p'>Physical error probability p</label><span class='val'>" + nl.p.toFixed(3) + "</span></div>" +
            "<input id='nl-p' class='range' type='range' min='0' max='0.5' step='0.005' value='" + nl.p + "' aria-label='Physical error probability' style='--range-progress:" + pct + "%'></div>" +
          "<div class='caption' style='margin-top:14px'>Simulation trials</div><div class='chip-row' style='margin-top:8px'>" +
            [100, 1000, 10000].map(function (t) { return "<button class='chip" + (nl.trials === t ? " active" : "") + "' data-nlt='" + t + "'>" + t.toLocaleString() + "</button>"; }).join("") + "</div>" +
          "<div class='caption' style='margin-top:14px'>Error correction</div><div class='chip-row' style='margin-top:8px'>" +
            "<button class='chip" + (nl.correction ? " active" : "") + "' data-nlc='on'>Enabled</button>" +
            "<button class='chip" + (!nl.correction ? " active" : "") + "' data-nlc='off'>Disabled</button></div>" +
          "<p class='caption' style='margin-top:8px'>Disabled means no syndrome-based recovery is applied: the residual is the raw physical error.</p>" +
          "<div class='toolbar' style='margin-top:14px'><button class='btn primary' id='nl-run'>Run simulation</button></div>" +
          (nl.mc ? "<p class='caption' style='margin-top:10px'>Sampled with " + nl.trials.toLocaleString() + " trials — a statistical estimate.</p>" : "") +
        "</div>";
      $all("#nl-controls [data-nlm]", root).forEach(function (el) { el.addEventListener("click", function () { nl.model = el.getAttribute("data-nlm"); nl.mc = null; update(); }); });
      $all("#nl-controls [data-nlt]", root).forEach(function (el) { el.addEventListener("click", function () { nl.trials = Number(el.getAttribute("data-nlt")); update(); }); });
      $all("#nl-controls [data-nlc]", root).forEach(function (el) { el.addEventListener("click", function () { nl.correction = el.getAttribute("data-nlc") === "on"; nl.mc = null; update(); }); });
      var slider = $sel("#nl-p", root); if (slider) slider.addEventListener("input", function () { nl.p = Number(slider.value); update(); });
      $sel("#nl-run", root).addEventListener("click", function () { nl.mc = systems().map(function (s) { return { key: s.key, value: Noise.monteCarlo(s.code, nl.model, nl.p, s.correction, nl.trials, Math.random) }; }); update(); });
      updateSummary();
    }
    function updateSummary() {
      var sys = systems();
      var base = Noise.exactPL(Noise.CODES.single, nl.model, nl.p, false);
      var rows = sys.map(function (s) {
        var ex = Noise.exactPL(s.code, nl.model, nl.p, s.correction);
        var mc = nl.mc ? (nl.mc.filter(function (m) { return m.key === s.key; })[0] || {}).value : null;
        var verdict = s.key === "single" ? "baseline" : (ex < base - 1e-9 ? "better" : "worse");
        return "<div class='cmp-row'><span class='caption'>" + s.code.label + " · " + s.code.qubits + "q · " + (s.correction ? "corrected" : "uncorrected") + "</span>" +
          "<span class='m'>exact " + ex.toFixed(4) + (mc != null ? " · MC " + mc.toFixed(4) : "") + " · " + verdict + "</span></div>";
      }).join("");
      $sel("#nl-summary", root).innerHTML =
        "<div class='panel'><h3>Comparison at p = " + nl.p.toFixed(3) + "</h3>" + rows +
        "<p class='caption' style='margin-top:10px'>The Monte Carlo value is a statistical estimate; close results may be inconclusive. All three systems use the same per-qubit noise channel.</p></div>";
    }
    $sel("#nl-discovery", root).innerHTML =
      "<div class='page-head'><div class='meta'><span class='kick'>Discovery · why more qubits can be worse</span></div><h2 class='headline' style='font-size:1.6rem'>When does correction help?</h2></div>" +
      "<p class='dek' style='margin-top:12px'>Encoding introduces redundancy, but also increases the number of physical systems exposed to noise. Whether error correction helps depends on the noise model, physical error rate, and recovery procedure.</p>" +
      "<p class='caption' style='margin-top:10px'>This experiment assumes perfect encoding, syndrome measurements and correction, so it does not include errors introduced by faulty gates or measurements. It is an idealized code-performance comparison, not a complete hardware fault-tolerance simulation — and it does not establish a practical threshold.</p>";
    function updateQuiz() {
      var box = $sel("#nl-quiz", root);
      var total = Quiz.total();
      if (quiz.done) {
        var sc = Quiz.score(quiz), pct = Math.round((sc / total) * 100);
        var review = quiz.answers.map(function (a) {
          var q = Quiz.QUESTIONS[a.q];
          return "<div class='quiz-review'><div class='q'>" + (a.q + 1) + ". " + q.question + "</div>" +
            "<div class='a'>Your answer: <span style='color:" + (a.correct ? "var(--good)" : "var(--bad)") + "'>" + q.options[a.selected] + "</span></div>" +
            "<div class='a'>Correct answer: <span style='color:var(--good)'>" + q.options[q.correct] + "</span></div>" +
            "<div class='a'>" + q.explanation + "</div>" +
            "<div class='a'><a href='" + q.href + "'>" + q.lesson + " →</a></div></div>";
        }).join("");
        box.innerHTML =
          "<div class='page-head'><div class='meta'><span class='kick'>Final knowledge check</span></div><h2 class='headline' style='font-size:1.6rem'>Module 2 Complete</h2></div>" +
          "<div class='panel' style='margin-top:16px'>" +
            "<div class='cmp-row'><span class='caption'>Score</span><span class='m'>" + sc + " / " + total + "</span></div>" +
            "<div class='cmp-row'><span class='caption'>Percentage</span><span class='m'>" + pct + "%</span></div>" +
            "<div class='cmp-row'><span class='caption'>Assessment</span><span class='m'>" + Quiz.message(sc) + "</span></div></div>" +
          "<div class='toolbar' style='margin-top:14px'><button class='btn' id='quiz-retry'>Retry Quiz</button><button class='btn ghost' id='quiz-review'>Review Answers</button></div>" +
          "<div id='quiz-review-box' style='margin-top:16px; display:none'><div class='panel'>" + review + "</div></div>";
        $sel("#quiz-retry", root).addEventListener("click", function () { quiz = Quiz.restart(); updateQuiz(); });
        $sel("#quiz-review", root).addEventListener("click", function () { var b = $sel("#quiz-review-box", root); b.style.display = b.style.display === "none" ? "block" : "none"; });
        return;
      }
      var q = Quiz.QUESTIONS[quiz.index], sc2 = Quiz.score(quiz);
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
          "<p class='dek' style='margin-top:8px'>Seven lessons. One final challenge. How much have you learned about quantum error correction?</p></div>" +
        "<div class='panel' style='margin-top:16px'>" +
          "<div class='quiz-prog'><span class='shor-step'>Question " + (quiz.index + 1) + " of " + total + "</span><span class='m'>Score " + sc2 + " / " + total + "</span></div>" +
          "<h3 style='margin-top:12px'>" + q.question + "</h3>" + opts + fb +
          "<div class='toolbar' style='margin-top:14px'>" +
            "<button class='btn primary' id='quiz-confirm'" + (quiz.selected == null || quiz.confirmed ? " disabled" : "") + ">Confirm</button>" +
            "<button class='btn' id='quiz-next'" + (quiz.confirmed ? "" : " disabled") + ">" + (quiz.index + 1 >= total ? "See results →" : "Next Question →") + "</button>" +
          "</div></div>";
      $all("#nl-quiz [data-qi]", root).forEach(function (el) { el.addEventListener("click", function () { quiz = Quiz.select(quiz, Number(el.getAttribute("data-qi"))); updateQuiz(); }); });
      $sel("#quiz-confirm", root).addEventListener("click", function () { quiz = Quiz.confirm(quiz); updateQuiz(); });
      $sel("#quiz-next", root).addEventListener("click", function () { quiz = Quiz.next(quiz); updateQuiz(); });
    }
    update(); updateQuiz();
    return null;
  }

  /* ==================================================================
   * 9. Platform export (the platform router calls these render functions)
   * ================================================================== */
  window.Module2 = {
    routes: ROUTES,
    render: {
      cover: renderCover, repetition: renderRepetition, syndrome: renderSyndrome,
      phaseflip: renderPhaseFlip, shorbuild: renderShorBuild, shordecoder: renderShorDecoder,
      breakcode: renderBreakCode, noiselab: renderNoiseLab,
    },
  };
})();
