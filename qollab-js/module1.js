/*!
 * Qollab · Platform — Module 1 "Understanding Quantum Errors" (vanilla port of
 * the Next.js Module 1). Exposes window.Module1 = { routes, render }.
 */
(function (global) {
  "use strict";

  var M = global.M1, UI = global.UI, BlochSphere = global.BlochSphere;

  function P() { return global.qcPalette(); }
  function arrow(v) { return [v.x, v.y, v.z]; }
  function paletteColor(name, P) { return name === "X" ? P.axisX : name === "Y" ? P.axisY : name === "Z" ? P.axisZ : P.grid; }
  function fmtPi(x) { return M.formatPi(x); }
  function deg(x) { return M.radToDeg(x).toFixed(0); }
  function mx(html) { return "<span class='m'>" + html + "</span>"; }

  var PAULI_INFO = {
    I: { title: "Identity", effect: "Applies no change — the state is left untouched.", map: "(x, y, z) ↦ (x, y, z)", note: "Represents the absence of an error." },
    X: { title: "Bit flip", effect: "Swaps |0⟩ and |1⟩ — a π rotation about the X axis.", map: "(x, y, z) ↦ (x, −y, −z)", note: "The quantum analogue of flipping a classical bit." },
    Y: { title: "Bit + phase flip", effect: "Flips the bit and the phase at once — a π rotation about Y.", map: "(x, y, z) ↦ (−x, y, −z)", note: "Y = iXZ: equivalent to X then Z, up to a global phase." },
    Z: { title: "Phase flip", effect: "Flips the sign of the |1⟩ component — a π rotation about Z.", map: "(x, y, z) ↦ (−x, −y, z)", note: "Leaves measurement probabilities unchanged — only the phase moves." },
  };

  var DEMOS = {
    X: {
      line: "X swaps the two basis states — a bit flip.",
      basis: [["X|0⟩", "|1⟩"], ["X|1⟩", "|0⟩"]],
      super: [["X|+⟩", "|+⟩"], ["X|−⟩", "−|−⟩"]],
      why: { q: "Why are |+⟩ and |−⟩ unchanged?", a: "They are the eigenstates of X. Applying X to an eigenstate only adds a global phase, so the point on the sphere stays put." },
    },
    Y: {
      line: "Y flips the bit and the phase together.",
      basis: [["Y|0⟩", "i|1⟩"], ["Y|1⟩", "−i|0⟩"]],
      super: [["Y|+i⟩", "|+i⟩"], ["Y|−i⟩", "−|−i⟩"]],
      why: { q: "Why is Y = iXZ?", a: "Multiplying the matrices gives XY = iZ, hence Y = iXZ up to a global phase. Geometrically, Y is a π rotation that combines the X and Z motions." },
    },
    Z: {
      line: "Z keeps the populations; it flips the relative phase.",
      basis: [["Z|0⟩", "|0⟩"], ["Z|1⟩", "−|1⟩"]],
      super: [["Z|+⟩", "|−⟩"], ["Z|−⟩", "|+⟩"]],
      why: { q: "Why is a lone minus sign invisible?", a: "On a basis state, −|1⟩ and |1⟩ differ only by a global phase, which no measurement can detect. In a superposition the same minus sign becomes a relative phase — and that is observable, as |+⟩ → |−⟩ shows." },
    },
  };

  function readout(title, state, color) {
    var v = M.blochVector(state);
    return "<div class='readout'><div class='readout-head'><span class='dot' style='background:" + color + ";box-shadow:0 0 10px " + color + "'></span><span>" + title + "</span></div>" +
      UI.fieldRow("α · |0⟩", M.formatComplex(state[0], 3)) +
      UI.fieldRow("β · |1⟩", M.formatComplex(state[1], 3)) +
      UI.fieldRow("(x, y, z)", "(" + M.formatReal(v.x) + ", " + M.formatReal(v.y) + ", " + M.formatReal(v.z) + ")") +
      "</div>";
  }

  function blochBlock(canvasId, legendItems, height) {
    return "<div class='bloch-wrap'" + (height ? " style='height:" + height + "'" : "") + ">" +
      "<canvas id='" + canvasId + "' aria-label='Bloch sphere'></canvas>" +
      "<div class='legend' id='" + canvasId + "-legend'>" + UI.legendHTML(legendItems) + "</div>" +
      "<div class='bloch-hint'>drag to orbit</div></div>";
  }

  /* ==================================================================
   * Cover
   * ================================================================== */
  var M1_ROUTE = [
    { n: "01", href: "#/module-1/pauli-errors", title: "Pauli errors", line: "What X, Y and Z do to a qubit." },
    { n: "02", href: "#/module-1/pauli-basis", title: "Pauli basis", line: "Why four matrices describe every operator." },
    { n: "03", href: "#/module-1/challenge", title: "Challenge", line: "Identify the error behind an outcome." },
  ];

  function renderM1Cover(root) {
    var pal = P();
    root.innerHTML = UI.moduleCover({
      backHref: "#/", backLabel: "All modules",
      label: "Module 1 — Quantum Error Correction",
      title: "Understanding quantum errors",
      sub: "A qubit is fragile. To protect it, we first need to see how it fails.",
      deks: ["Follow a single qubit across the Bloch sphere: how the Pauli errors X, Y and Z move it, why they form a complete basis, and how to identify the error behind a given outcome."],
      ctaHref: "#/module-1/pauli-errors", ctaLabel: "Start reading \u2192",
      meta: "\u2248 10 min \u00b7 3 experiments, 1 challenge",
      figure: blochBlock("m1-cover-canvas", [{ c: pal.original, t: "State |+i\u27e9" }]),
      lessons: M1_ROUTE.map(function (it) { return { num: it.n, title: it.title, desc: it.line, href: it.href }; }),
    });
    var sphere = new BlochSphere(UI.$sel("#m1-cover-canvas", root));
    var b = M.blochVector(M.KET_PLUS_I);
    sphere.setArrows([{ id: "s", color: pal.original, vector: [b.x, b.y, b.z] }]);
    sphere.start();
    return function () { sphere.stop(); };
  }

  /* ==================================================================
   * 01 · Pauli errors
   * ================================================================== */
  var ERROR_ORDER = ["X", "Y", "Z"];

  function renderM1PauliErrors(root) {
    var pal = P();
    var st = { baseKey: "0", theta: 0, phi: 0, ops: [], selectedOp: "X" };

    function initialState() { return st.baseKey === "custom" ? M.ketState(st.theta, st.phi) : (M.namedStateByKey(st.baseKey) || { state: M.KET_0 }).state; }

    root.innerHTML =
      "<div class='container'>" +
        UI.backLink("#/module-1", "Cover") +
        UI.pageHead("01", "Pauli errors", "What X, Y and Z do", "Three operators, three rotations. Switch between them and watch the qubit move.") +
        "<div style='margin-top:24px'>" + UI.eq(mx("|ψ⟩ = cos(θ/2) |0⟩ + e<sup>iφ</sup> sin(θ/2) |1⟩")) +
          "<p class='caption' style='margin-top:8px'>A pure state is a point on the sphere, fixed by (θ, φ).</p></div>" +
        "<div style='margin-top:32px'><div class='chip-row' id='m1-op-row'></div><div id='m1-demo'></div></div>" +
        "<div style='margin-top:64px'><h3 class='headline' style='font-size:1.5rem'>Explore</h3>" +
          "<p class='dek' style='margin-top:8px'>Pick a state, apply an error, and confirm the rotation you just read.</p>" +
          "<section class='grid-two' style='margin-top:24px'>" +
            "<div class='sticky-col'>" + blochBlock("m1-pe-canvas", [{ c: pal.original, t: "Initial" }, { c: pal.transformed, t: "Current" }]) + "</div>" +
            "<div class='stack'>" +
              "<div class='panel'><h3>Initial state</h3><div class='chip-row' id='m1-preset-row'></div>" +
                "<div class='step' id='m1-custom'></div></div>" +
              "<div class='panel'><h3>Apply an error</h3><div class='grid3' id='m1-apply-row'></div>" +
                "<div class='step' style='display:flex;align-items:center;justify-content:space-between;gap:12px'><p class='caption' id='m1-seq'></p><button class='btn ghost' id='m1-reset'>Reset</button></div></div>" +
            "</div>" +
          "</section>" +
          "<div class='grid2' style='margin-top:24px'><div id='m1-read-init'></div><div id='m1-read-cur'></div></div>" +
          "<div style='margin-top:16px' id='m1-notice'></div>" +
        "</div>" +
        UI.transition("02", "Are X, Y and Z all there is?", "They are just π rotations. Any rotation, and in fact any single-qubit operator, can be written as a combination of I, X, Y and Z.", "#/module-1/pauli-basis", "See the Pauli basis →") +
      "</div>";

    var sphere = new BlochSphere(UI.$sel("#m1-pe-canvas", root));

    function updateDemo() {
      var name = st.selectedOp, demo = DEMOS[name], info = PAULI_INFO[name], color = paletteColor(name, pal);
      var initial = initialState();
      var demoResult = M.matVec(M.pauliMatrix(name), initial);
      function ampRow(label, index) {
        var from = initial[index], to = demoResult[index];
        var changed = Math.abs(from.re - to.re) > 1e-9 || Math.abs(from.im - to.im) > 1e-9;
        return "<div class='amprow'" + (changed ? " style='border-color:" + color + ";background:color-mix(in srgb," + color + " 8%,transparent)'" : "") + ">" +
          "<span class='m'>" + label + " = " + M.formatComplex(from, 3) + "</span><span class='faint'>→</span>" +
          "<span class='m'" + (changed ? " style='font-weight:600'" : "") + ">" + M.formatComplex(to, 3) + "</span></div>";
      }
      UI.$sel("#m1-op-row", root).innerHTML = ERROR_ORDER.map(function (n) {
        var active = n === name, c = paletteColor(n, pal);
        return "<button class='chip" + (active ? " active" : "") + "' type='button' data-op='" + n + "' style='" + (active ? "border-color:" + c + ";color:" + c : "") + "'><span class='mono' style='font-weight:600'>" + n + "</span> " + PAULI_INFO[n].title + "</button>";
      }).join("");
      UI.$sel("#m1-demo", root).innerHTML =
        "<div class='grid-two' style='margin-top:24px'>" +
          "<div class='stack'>" +
            "<div class='quiet'><p class='caption' style='margin-bottom:12px'>Matrix</p>" + UI.matrixHTML(M.pauliMatrix(name), { label: name + " =", digits: 0, highlight: true, accent: color }) + "</div>" +
            "<div class='quiet'><p class='caption' style='margin-bottom:12px'>Effect on your state</p><div class='grid2'>" + ampRow("α", 0) + ampRow("β", 1) + "</div></div>" +
          "</div>" +
          "<div class='stack'>" +
            "<div class='grid2'>" +
              "<div><p class='caption' style='margin-bottom:8px'>On basis states</p>" + demo.basis.map(function (b) { return "<div class='eqbox'>" + mx(b[0] + " = " + b[1]) + "</div>"; }).join("") + "</div>" +
              "<div><p class='caption' style='margin-bottom:8px'>On superpositions</p>" + demo.super.map(function (b) { return "<div class='eqbox'>" + mx(b[0] + " = " + b[1]) + "</div>"; }).join("") + "</div>" +
            "</div>" +
            "<div class='blochrow'><span class='caption'>On the Bloch sphere</span>" + mx(info.map) + "<span class='caption'>π about " + name + "</span></div>" +
            UI.keyIdea("Key idea", demo.line) +
            (name === "Z"
              ? UI.expandable("Global vs relative phase", "On a basis state, " + mx("Z|1⟩ = −|1⟩") + " hides the minus in a global phase. In a superposition the same sign is relative — observable, as " + mx("Z|+⟩ = |−⟩") + " shows.")
              : UI.expandable("Why? — " + demo.why.q, demo.why.a)) +
          "</div>" +
        "</div>";
      UI.$all("#m1-op-row [data-op]", root).forEach(function (b) { b.addEventListener("click", function () { st.selectedOp = b.getAttribute("data-op"); updateDemo(); }); });
    }

    function updatePresets() {
      UI.$sel("#m1-preset-row", root).innerHTML = M.NAMED_STATES.map(function (s) {
        return "<button class='chip" + (st.baseKey === s.key ? " active" : "") + "' type='button' data-preset='" + s.key + "'>" + s.label + "</button>";
      }).join("") + "<button class='chip" + (st.baseKey === "custom" ? " active" : "") + "' type='button' data-preset='custom'>Custom</button>";
      UI.$sel("#m1-custom", root).innerHTML =
        UI.rangeSlider({ id: "m1-theta", label: "θ · polar", value: st.theta, min: 0, max: Math.PI, step: 0.01, display: fmtPi(st.theta) + " (" + deg(st.theta) + "°)" }) +
        UI.rangeSlider({ id: "m1-phi", label: "φ · azimuthal", value: st.phi, min: 0, max: 2 * Math.PI, step: 0.01, display: fmtPi(st.phi) + " (" + deg(st.phi) + "°)" });
      UI.$all("#m1-preset-row [data-preset]", root).forEach(function (b) {
        b.addEventListener("click", function () {
          var key = b.getAttribute("data-preset");
          st.baseKey = key; st.ops = [];
          var named = M.namedStateByKey(key);
          if (named) { var sp = M.blochToSpherical(named.bloch); st.theta = sp.theta; st.phi = sp.phi; }
          updatePresets(); updateExperiment();
        });
      });
      UI.$sel("#m1-theta", root).addEventListener("input", function (e) { st.baseKey = "custom"; st.theta = Number(e.target.value); st.ops = []; updatePresets(); updateExperiment(); });
      UI.$sel("#m1-phi", root).addEventListener("input", function (e) { st.baseKey = "custom"; st.phi = Number(e.target.value); st.ops = []; updatePresets(); updateExperiment(); });
    }

    function updateExperiment() {
      var initial = initialState();
      var current = M.matVec(M.composePauliSequence(st.ops), initial);
      var noChange = st.ops.length > 0 && M.areEquivalentUpToPhase(initial, current, 1e-6);
      UI.$sel("#m1-apply-row", root).innerHTML = ERROR_ORDER.map(function (n) {
        var c = paletteColor(n, pal);
        return "<button class='applybtn' type='button' data-apply='" + n + "'><span style='font-size:1.6rem;font-weight:600;color:" + c + "'>" + n + "</span><span class='caption'>" + PAULI_INFO[n].title + "</span></button>";
      }).join("");
      UI.$sel("#m1-seq", root).innerHTML = "Sequence: <span class='mono'>" + (st.ops.length ? st.ops.slice().reverse().join(" ∘ ") + " |ψ⟩" : "|ψ⟩") + "</span>";
      UI.$sel("#m1-reset", root).disabled = st.ops.length === 0;
      UI.$sel("#m1-read-init", root).innerHTML = readout("Initial state", initial, pal.original);
      UI.$sel("#m1-read-cur", root).innerHTML = readout("Current state", current, pal.transformed);
      UI.$sel("#m1-notice", root).innerHTML = noChange
        ? UI.notice("What to notice", "Both arrows overlap: the state changed only by a <strong>global phase</strong>, which is unobservable.")
        : UI.notice("What to notice", "Each click is a π rotation. Two clicks on the same axis cancel out; two different axes compose into a third Pauli.");
      UI.$all("#m1-apply-row [data-apply]", root).forEach(function (b) {
        b.addEventListener("click", function () { st.selectedOp = b.getAttribute("data-apply"); st.ops.push(st.selectedOp); updateDemo(); updateExperiment(); });
      });
      UI.$sel("#m1-reset", root).addEventListener("click", function () { st.ops = []; updateExperiment(); });
      sphere.setArrows([
        { id: "original", vector: arrow(M.blochVector(initial)), color: pal.original },
        { id: "current", vector: arrow(M.blochVector(current)), color: pal.transformed },
      ]);
    }

    updateDemo(); updatePresets(); updateExperiment();
    sphere.start();
    return function () { sphere.stop(); };
  }

  /* ==================================================================
   * 02 · Pauli basis
   * ================================================================== */
  var PRESET_AXES = [{ key: "x", label: "X" }, { key: "y", label: "Y" }, { key: "z", label: "Z" }, { key: "custom", label: "Custom" }];
  var ANGLE_SHORTCUTS = [{ label: "0", value: 0 }, { label: "π/2", value: Math.PI / 2 }, { label: "π", value: Math.PI }, { label: "3π/2", value: (3 * Math.PI) / 2 }, { label: "2π", value: 2 * Math.PI }];
  var COMPARISON = [
    { title: "Linear combination", tex: "E = a I + b X + c Y + d Z", line: "One operator, built from complex coefficients." },
    { title: "Sequential application", tex: "X Y = iZ ≠ X + Y", line: "Applying operators in turn is a product, not a sum." },
    { title: "Probabilistic mixture", tex: "ρ′ = Σ<sub>k</sub> p<sub>k</sub> E<sub>k</sub> ρ E<sub>k</sub><sup>†</sup>", line: "“X with probability p” is a channel, not an operator." },
  ];
  function axisFromSpherical(theta, phi) { return { x: Math.sin(theta) * Math.cos(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(theta) }; }

  function renderM1PauliBasis(root) {
    var pal = P();
    var st = { baseKey: "plus", axisKey: "z", axisTheta: Math.PI / 3, axisPhi: Math.PI / 4, angle: Math.PI / 2 };

    root.innerHTML =
      "<div class='container'>" +
        UI.backLink("#/module-1/pauli-errors", "Pauli errors") +
        UI.pageHead("02", "Pauli basis", "Four matrices are enough", "Any single-qubit operator is a combination of I, X, Y and Z.") +
        "<div class='grid-two' style='margin-top:32px;align-items:center'>" +
          "<div>" + UI.eq(mx("E = a I + b X + c Y + d Z, &nbsp; a, b, c, d ∈ ℂ")) +
            "<p class='dek' style='margin-top:12px'>Here, " + mx("E") + " represents a quantum error operator acting on a single qubit. Even though quantum errors can take infinitely many forms, any such operator can be written as a linear combination of " + mx("I") + ", " + mx("X") + ", " + mx("Y") + ", and " + mx("Z") + ".</p>" +
          "</div>" +
          "<div class='grid2'>" + ["I", "X", "Y", "Z"].map(function (n) { return "<div class='quiet' style='display:flex;align-items:center;justify-content:center;min-height:64px'>" + UI.matrixHTML(M.PAULI_MATRICES[n], { label: n + " =", digits: 0, highlight: true, accent: pal.original }) + "</div>"; }).join("") + "</div>" +
        "</div>" +
        "<div class='grid3' style='margin-top:40px'>" + COMPARISON.map(function (b) { return "<div class='cmpblock'><p class='ct'>" + b.title + "</p><div class='eqbox'>" + mx(b.tex) + "</div><p class='cl'>" + b.line + "</p></div>"; }).join("") + "</div>" +
        "<div style='margin-top:64px'><h3 class='headline' style='font-size:1.5rem'>Rotations live in the basis too</h3>" +
          "<p class='dek' style='margin-top:8px'>A rotation of angle α about the unit axis " + mx("<b>n</b>") + " is a Pauli combination.</p>" +
          "<div style='margin-top:24px'>" + UI.eq(mx("R<sub><b>n</b></sub>(α) = cos(α/2) I − i sin(α/2) (n<sub>x</sub> X + n<sub>y</sub> Y + n<sub>z</sub> Z)")) + "</div>" +
          "<section class='grid-two' style='margin-top:24px'>" +
            "<div class='sticky-col'>" + blochBlock("m1-pb-canvas", [{ c: pal.original, t: "Base" }, { c: pal.transformed, t: "Rotated" }, { c: pal.grid, t: "Axis" }]) + "</div>" +
            "<div class='stack'>" +
              "<div class='panel'><h3>Base state</h3><div class='chip-row' id='m1-pb-states'></div></div>" +
              "<div class='panel'><h3>Axis and angle</h3><div class='chip-row' id='m1-pb-axes'></div><div class='step' id='m1-pb-custom'></div><div class='step' id='m1-pb-angle'></div></div>" +
            "</div>" +
          "</section>" +
          "<div class='grid2' style='margin-top:24px'>" +
            "<div class='panel'><h3>Rotation operator</h3><div id='m1-pb-matrix'></div></div>" +
            "<div class='panel'><h3>Pauli coefficients</h3><div class='grid2' id='m1-pb-coef'></div><p class='caption' style='margin-top:12px'>Move the axis or angle and watch a, b, c, d change.</p></div>" +
          "</div>" +
          "<div id='m1-pb-notes' style='margin-top:20px'></div>" +
        "</div>" +
        "<div style='margin-top:64px;border-top:1px solid var(--line);padding-top:32px'><h3 class='headline' style='font-size:1.5rem'>An operator is not a channel</h3>" +
          "<p class='dek' style='margin-top:8px'>Unitaries move pure states around the surface. Real noise can do more.</p>" +
          "<div class='grid2' style='margin-top:24px'>" +
            "<div class='panel'><p class='ct'>Unitary operator</p><div class='eqbox' style='margin-top:12px'>" + mx("|ψ⟩ ↦ U |ψ⟩") + "</div><ul class='bullets'><li>Pure states stay pure.</li><li>Bloch vector keeps length 1.</li><li>A Pauli error, or any rotation.</li></ul></div>" +
            "<div class='panel'><p class='ct'>Quantum channel</p><div class='eqbox' style='margin-top:12px'>" + mx("ρ ↦ Σ<sub>k</sub> E<sub>k</sub> ρ E<sub>k</sub><sup>†</sup>") + "</div><ul class='bullets'><li>Pure states can become mixed.</li><li>Bloch vector can shrink: " + mx("|<b>r</b>| < 1") + ".</li><li>Models decoherence and probabilistic noise.</li></ul></div>" +
          "</div>" +
          "<div style='margin-top:16px'>" + UI.expandable("Why? — Kraus operators and completeness", "A channel is written with operators " + mx("E<sub>k</sub>") + " that need not be unitary. The condition " + mx("Σ<sub>k</sub> E<sub>k</sub><sup>†</sup> E<sub>k</sub> = I") + " keeps probabilities summing to one. With a single term, " + mx("E<sub>1</sub> = U") + " recovers the unitary case — which is why one arrow on the sphere cannot capture every kind of noise.") + "</div>" +
        "</div>" +
        UI.transition("03", "If we know the errors, can we identify them?", "Knowing what X, Y and Z do is the first step. The next is to read the error off the outcome — the challenge.", "#/module-1/challenge", "Take the challenge →") +
      "</div>";

    var sphere = new BlochSphere(UI.$sel("#m1-pb-canvas", root));

    function axisVector() {
      if (st.axisKey === "custom") return M.normalizeAxis(axisFromSpherical(st.axisTheta, st.axisPhi));
      if (st.axisKey === "x") return { x: 1, y: 0, z: 0 };
      if (st.axisKey === "y") return { x: 0, y: 1, z: 0 };
      return { x: 0, y: 0, z: 1 };
    }

    function update() {
      var baseState = (M.namedStateByKey(st.baseKey) || { state: M.ketState(0, 0) }).state;
      var axis = axisVector();
      var operator = M.rotationOperator(axis, st.angle);
      var coeffs = M.pauliDecomposition(operator);
      var rotated = M.matVec(operator, baseState);
      var baseB = M.blochVector(baseState), rotB = M.blochVector(rotated);
      var delta = Math.hypot(baseB.x - rotB.x, baseB.y - rotB.y, baseB.z - rotB.z);
      var isEigen = st.angle > 1e-3 && delta < 1e-6;
      var nearPi = Math.abs(st.angle - Math.PI) < 0.02;

      UI.$sel("#m1-pb-states", root).innerHTML = M.NAMED_STATES.map(function (s) { return "<button class='chip" + (st.baseKey === s.key ? " active" : "") + "' type='button' data-state='" + s.key + "'>" + s.label + "</button>"; }).join("");
      UI.$sel("#m1-pb-axes", root).innerHTML = PRESET_AXES.map(function (a) { return "<button class='chip" + (st.axisKey === a.key ? " active" : "") + "' type='button' data-axis='" + a.key + "'>" + a.label + "</button>"; }).join("");
      UI.$sel("#m1-pb-custom", root).innerHTML = st.axisKey === "custom"
        ? UI.rangeSlider({ id: "m1-pb-at", label: "Axis θ", value: st.axisTheta, min: 0, max: Math.PI, step: 0.01, display: fmtPi(st.axisTheta) + " (" + deg(st.axisTheta) + "°)" }) +
          UI.rangeSlider({ id: "m1-pb-ap", label: "Axis φ", value: st.axisPhi, min: 0, max: 2 * Math.PI, step: 0.01, display: fmtPi(st.axisPhi) + " (" + deg(st.axisPhi) + "°)" })
        : "";
      UI.$sel("#m1-pb-angle", root).innerHTML = UI.rangeSlider({ id: "m1-pb-angle", label: "α · rotation angle", value: st.angle, min: 0, max: 2 * Math.PI, step: 0.005, display: fmtPi(st.angle) + " (" + deg(st.angle) + "°)" }) +
        "<div class='chip-row' style='margin-top:10px'>" + ANGLE_SHORTCUTS.map(function (s) { return "<button class='chip" + (Math.abs(st.angle - s.value) < 0.01 ? " active" : "") + "' type='button' data-angle='" + s.value + "'>" + s.label + "</button>"; }).join("") + "</div>";
      UI.$sel("#m1-pb-matrix", root).innerHTML = UI.matrixHTML(operator, { label: "U =", digits: 3, highlight: true, accent: pal.transformed });
      var coefs = [["a", coeffs.a, "I"], ["b", coeffs.b, "X"], ["c", coeffs.c, "Y"], ["d", coeffs.d, "Z"]];
      UI.$sel("#m1-pb-coef", root).innerHTML = coefs.map(function (c) {
        return "<div class='coefrow'><span class='mono caption'>" + c[2] + "</span><span class='m'>" + c[0] + " = " + M.formatComplex(c[1], 3) + "</span></div>";
      }).join("");
      UI.$sel("#m1-pb-notes", root).innerHTML =
        (nearPi ? UI.keyIdea("Discrete case", "At " + mx("α = π") + " the rotation becomes " + mx("−i (n<sub>x</sub>X + n<sub>y</sub>Y + n<sub>z</sub>Z)") + ": a Pauli, up to the global phase " + mx("−i") + ".") : "") +
        (isEigen ? UI.notice("No visible change", "The base state is an eigenstate here: the rotation only adds a global phase, so the vector stays put. Try another state or axis.") : "");

      UI.$all("#m1-pb-states [data-state]", root).forEach(function (b) { b.addEventListener("click", function () { st.baseKey = b.getAttribute("data-state"); update(); }); });
      UI.$all("#m1-pb-axes [data-axis]", root).forEach(function (b) { b.addEventListener("click", function () { st.axisKey = b.getAttribute("data-axis"); update(); }); });
      UI.$all("#m1-pb-angle [data-angle]", root).forEach(function (b) { b.addEventListener("click", function () { st.angle = Number(b.getAttribute("data-angle")); update(); }); });
      var at = UI.$sel("#m1-pb-at", root); if (at) at.addEventListener("input", function (e) { st.axisTheta = Number(e.target.value); update(); });
      var ap = UI.$sel("#m1-pb-ap", root); if (ap) ap.addEventListener("input", function (e) { st.axisPhi = Number(e.target.value); update(); });
      UI.$sel("#m1-pb-angle", root).addEventListener("input", function (e) { st.angle = Number(e.target.value); update(); });

      sphere.setArrows([
        { id: "axis", vector: arrow(axis), color: pal.grid, opacity: 0.5 },
        { id: "base", vector: arrow(baseB), color: pal.original },
        { id: "rotated", vector: arrow(rotB), color: pal.transformed },
      ]);
    }

    update();
    sphere.start();
    return function () { sphere.stop(); };
  }

  /* ==================================================================
   * 03 · Challenge
   * ================================================================== */
  function renderM1Challenge(root) {
    var pal = P();
    var st = { challenge: M.generateChallenge(), chosen: null, revealed: false, result: null, round: 0, score: { correct: 0, total: 0 }, streak: 0 };

    root.innerHTML =
      "<div class='container'>" +
        UI.backLink("#/module-1/pauli-basis", "Pauli basis") +
        UI.pageHead("03", "Challenge", "Name the error", "A secret Pauli error acts on a random state. Compare the two vectors and identify it.") +
        "<div class='grid3' style='margin-top:24px' id='m1-ch-stats'></div>" +
        "<section class='grid-two' style='margin-top:24px'>" +
          "<div class='sticky-col'>" + blochBlock("m1-ch-canvas", [{ c: pal.original, t: "Initial" }, { c: pal.error, t: "Final" }]) + "</div>" +
          "<div class='stack'>" +
            "<div class='panel'><div style='display:flex;align-items:center;justify-content:space-between;gap:12px'><h3 style='margin:0'>Which error hit this qubit?</h3><button class='btn ghost' id='m1-ch-reset'>Reset</button></div>" +
              "<div class='grid4' style='margin-top:12px' id='m1-ch-answers'></div>" +
              "<p class='caption' id='m1-ch-hint' style='margin-top:16px'></p>" +
              "<div id='m1-ch-new'></div></div>" +
            "<div id='m1-ch-result'></div>" +
          "</div>" +
        "</section>" +
        UI.transition("04", "What comes next?", "You can read the three errors, write any operator in the Pauli basis, and name the error behind an outcome. The next step is decoherence and error-correcting codes.", "#/module-1/conclusion", "Continue to the conclusion →") +
      "</div>";

    var sphere = new BlochSphere(UI.$sel("#m1-ch-canvas", root));

    function update() {
      var ch = st.challenge, accuracy = st.score.total > 0 ? Math.round((st.score.correct / st.score.total) * 100) : 0;
      UI.$sel("#m1-ch-stats", root).innerHTML =
        UI.stat("Correct", st.score.correct + " / " + st.score.total, "Right answers", pal.original) +
        UI.stat("Accuracy", accuracy + "%", "Across all tries") +
        UI.stat("Streak", String(st.streak), "Consecutive correct", pal.error);
      UI.$sel("#m1-ch-answers", root).innerHTML = M.PAULI_NAMES.map(function (name) {
        var isCorrect = st.revealed && name === ch.error;
        var isWrong = st.revealed && st.chosen === name && name !== ch.error;
        var c = paletteColor(name, pal);
        var cls = isCorrect ? "style='border-color:var(--good);background:color-mix(in srgb,var(--good) 12%,transparent);color:var(--good)'"
          : isWrong ? "style='border-color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,transparent);color:var(--bad)'"
          : st.revealed ? "style='opacity:.55'"
          : "";
        return "<button class='applybtn' type='button' data-ans='" + name + "'" + (st.revealed ? " disabled" : "") + " " + cls + ">" +
          "<span style='font-size:1.6rem;font-weight:600" + (st.revealed ? "" : ";color:" + c) + "'>" + name + "</span><span class='caption'>" + PAULI_INFO[name].title + "</span></button>";
      }).join("");
      UI.$sel("#m1-ch-hint", root).innerHTML = !st.revealed ? "Each error is a π rotation about one axis. Watch where the point lands." : "";
      UI.$sel("#m1-ch-new", root).innerHTML = st.revealed ? "<button class='btn primary' id='m1-ch-next' style='width:100%;margin-top:16px'>New challenge →</button>" : "";
      if (st.revealed) {
        var info = PAULI_INFO[ch.error];
        var v0 = M.blochVector(ch.initial), v1 = M.blochVector(ch.final);
        UI.$sel("#m1-ch-result", root).innerHTML =
          "<div class='panel' style='border-color:" + (st.result.correct ? "var(--good)" : "var(--bad)") + "'>" +
            "<p role='status' style='margin:0 0 12px;font-weight:600;color:" + (st.result.correct ? "var(--good)" : "var(--bad)") + "'>" + (st.result.correct ? "✓ Correct" : "✗ Not quite") + "</p>" +
            "<p class='caption' style='font-size:.95rem'>" + (st.result.correct
              ? "The error was <strong style='color:" + paletteColor(ch.error, pal) + "'>" + ch.error + "</strong> — " + info.title.toLowerCase() + "."
              : "You chose <strong>" + st.chosen + "</strong>, but the error was <strong style='color:" + paletteColor(ch.error, pal) + "'>" + ch.error + "</strong> — " + info.title.toLowerCase() + ".") + "</p>" +
            "<div style='margin-top:16px;display:flex;flex-wrap:wrap;align-items:center;gap:16px'>" + UI.matrixHTML(M.pauliMatrix(ch.error), { label: ch.error + " =", digits: 0, highlight: true, accent: paletteColor(ch.error, pal) }) + "<span class='m caption'>" + info.map + "</span></div>" +
            UI.fieldRow("Initial (x, y, z)", "(" + M.formatReal(v0.x) + ", " + M.formatReal(v0.y) + ", " + M.formatReal(v0.z) + ")") +
            UI.fieldRow("Final (x, y, z)", "(" + M.formatReal(v1.x) + ", " + M.formatReal(v1.y) + ", " + M.formatReal(v1.z) + ")") +
            UI.fieldRow("Check", mx(ch.error + "|ψ⟩ = |ψ′⟩")) +
            "<p class='caption' style='margin-top:12px'>" + (ch.error === "I" ? "The vector never moved: the identity applies no change." : info.effect) + "</p>" +
          "</div>";
        UI.$sel("#m1-ch-next", root).addEventListener("click", newChallenge);
      }
      UI.$all("#m1-ch-answers [data-ans]", root).forEach(function (b) { b.addEventListener("click", function () { answer(b.getAttribute("data-ans")); }); });

      var initVec = arrow(M.blochVector(ch.initial)), finVec = arrow(M.blochVector(ch.final));
      sphere.setArrows([
        { id: "initial", vector: initVec, color: pal.original },
        { id: st.revealed ? "final-" + st.round : "final-preview", vector: finVec, color: pal.error, opacity: st.revealed ? 1 : 0.85, from: st.revealed ? initVec : undefined },
      ]);
    }

    function answer(name) {
      if (st.revealed) return;
      var outcome = M.checkAnswer(st.challenge, name);
      st.chosen = name; st.revealed = true; st.result = outcome;
      st.score = { correct: st.score.correct + (outcome.correct ? 1 : 0), total: st.score.total + 1 };
      st.streak = outcome.correct ? st.streak + 1 : 0;
      update();
    }
    function newChallenge() { st.challenge = M.generateChallenge(); st.chosen = null; st.revealed = false; st.result = null; st.round++; update(); }
    function reset() { st.score = { correct: 0, total: 0 }; st.streak = 0; newChallenge(); }

    UI.$sel("#m1-ch-reset", root).addEventListener("click", reset);
    update();
    sphere.start();
    return function () { sphere.stop(); };
  }

  /* ==================================================================
   * Conclusion
   * ================================================================== */
  function renderM1Conclusion(root) {
    root.innerHTML =
      "<div class='container'>" +
        UI.backLink("#/module-1/challenge", "Challenge") +
        "<section style='border-top:1px solid var(--line);padding-top:32px'>" +
          "<span class='eyebrow' style='color:var(--faint)'>Next</span>" +
          "<h2 class='headline' style='margin-top:12px;font-size:clamp(1.9rem,4vw,2.4rem)'>Where this goes</h2>" +
          "<p class='dek' style='margin-top:16px'>You can now read the three Pauli errors, write any operator as a Pauli combination, and recognize an error from its outcome.</p>" +
          "<p class='dek' style='margin-top:12px'>Next: decoherence — how the environment turns a pure state mixed — and the first quantum error-correcting codes.</p>" +
          "<div style='margin-top:32px;display:flex;flex-wrap:wrap;gap:12px'>" +
            "<a class='btn primary' href='#/module-2'>Continue to Module 2 — Repetition to Shor →</a>" +
            "<a class='btn' href='#/module-1'>↑ Back to the cover</a>" +
          "</div>" +
        "</section>" +
      "</div>";
    return null;
  }

  global.Module1 = {
    routes: {
      "/module-1": "cover",
      "/module-1/pauli-errors": "pauliErrors",
      "/module-1/pauli-basis": "pauliBasis",
      "/module-1/challenge": "challenge",
      "/module-1/conclusion": "conclusion",
    },
    render: {
      cover: renderM1Cover, pauliErrors: renderM1PauliErrors, pauliBasis: renderM1PauliBasis,
      challenge: renderM1Challenge, conclusion: renderM1Conclusion,
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
