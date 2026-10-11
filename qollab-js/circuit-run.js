/*!
 * Qollab · CircuitRun — embed a real circuit run into the platform pages.
 *
 * The heavy lifting lives in `circuits.js` (the Python <-> JS bridge). This
 * module is only the shared UI: it renders a compact "run" control inside an
 * existing page, submits exactly one job through `QollabCircuits.runModel`, and
 * hands the returned counts/summary back to the page so it can drive its own
 * animation or simulation.
 *
 * Nothing here imports `circuits.js` at load time. Inside Qollab the bare
 * `quantum.*` modules resolve; in a plain browser / local preview they do not,
 * so the import is deferred until the user actually presses Run and the card
 * degrades to a notice when there is no `backend`.
 *
 * Exposes: window.CircuitRun = { available, run, mount, barsHTML }.
 */
(function (global) {
  "use strict";

  var runner = null;

  /* The Qollab runtime injects a `backend` into every JS file of the project. */
  function available() {
    try { return typeof backend !== "undefined" && !!backend; } catch (e) { return false; }
  }

  /* Backend name from the injected object (string or function, per Qollab). */
  function backendName() {
    try {
      if (typeof backend === "undefined" || !backend) return "";
      var n = backend.name;
      return String(typeof n === "function" ? n() : (n || ""));
    } catch (e) { return ""; }
  }

  /* Per Qollab's "Compute backends" docs, the noise-model backends are the IBM
   * local simulators and the IonQ remote simulators (plus IonQ hardware); the
   * built-in and AWS Braket simulators are ideal. We only inject our own noise
   * on the ideal ones. */
  function backendHasNoise() {
    var low = backendName().toLowerCase();
    if (/braket|built-?in|ideal/.test(low)) return false;
    if (/ibm|ionq/.test(low)) return true;
    try { return !!(typeof backend !== "undefined" && backend && backend.hardware); } catch (e) { return false; }
  }

  /* The runner is exposed by circuits.js, which main.js imports statically so
   * Qollab's bundler ships it. No dynamic import here: `import()` resolved to
   * /_nuxt/circuits.js and 404'd because the file was never bundled. */
  function load() {
    if (runner) return Promise.resolve(runner);
    if (global.QollabCircuits && global.QollabCircuits.runModel) {
      runner = global.QollabCircuits;
      return Promise.resolve(runner);
    }
    return Promise.reject(new Error("The circuit runner (circuits.js) is not loaded."));
  }

  function run(modelId, options) {
    return load().then(function (mod) { return mod.runModel(modelId, options || {}); });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* A small horizontal-bar histogram of the shot counts. */
  function barsHTML(counts, limit) {
    var entries = Object.keys(counts || {}).map(function (k) { return [k, counts[k]]; });
    if (!entries.length) return "";
    entries.sort(function (a, b) { return b[1] - a[1]; });
    var shown = entries.slice(0, limit || 6);
    var max = shown[0][1] || 1;
    return "<div class='crun-bars'>" + shown.map(function (e) {
      var pct = Math.max(2, Math.round(100 * e[1] / max));
      return "<div class='crun-bar'>" +
        "<span class='crun-key mono'>" + esc(e[0]) + "</span>" +
        "<span class='crun-track'><span class='crun-fill' style='width:" + pct + "%'></span></span>" +
        "<span class='crun-count mono'>" + e[1] + "</span></div>";
    }).join("") + "</div>";
  }

  /* One-line summary built from whatever the Python model returned. */
  function summaryLine(result) {
    var s = (result && result.summary) || {};
    var parts = [];
    if (typeof s.detected === "number") parts.push("detected in " + Math.round(100 * s.detected) + "% of shots");
    if (typeof s.logical_correct === "number") parts.push("logical |0⟩ in " + Math.round(100 * s.logical_correct) + "%");
    if (typeof s.correlated === "number") parts.push("correlated in " + Math.round(100 * s.correlated) + "%");
    return parts.join(" · ");
  }

  /* Human labels for the injected noise channels. */
  function channelLabel(ch) {
    return ch === "x" ? "bit-flip X" : ch === "z" ? "phase-flip Z" : ch === "depol" ? "depolarizing" : String(ch == null ? "" : ch);
  }
  function bitsIn(counts) { var k = counts && Object.keys(counts)[0]; return k ? k.length : 0; }

  /* A clear report for a noisy circuit run: the real backend result first, then
     an optional analytical model estimate, kept visually distinct so the two
     never get confused. Shared by every "run on a backend" card. */
  function noisyReportHTML(res, opts) {
    opts = opts || {}; res = res || {};
    var ideal = res.ideal || {}, noisy = res.noisy || {};
    var bits = bitsIn(ideal.counts) || bitsIn(noisy.counts);
    var isLocal = res.mode === "local";
    function hist(title, side, cls) {
      return "<div><div class='crun-hist-head'><span>" + title + "</span>" +
        "<span class='crun-pill" + (cls ? " " + cls : "") + "'>alarms in " + pct(side.detected) + " of shots</span></div>" +
        barsHTML(side.counts, 4) + "</div>";
    }
    var html =
      "<div class='crun-report'>" +
        "<div class='crun-meta'><span class='crun-tag'>" + (isLocal ? "Local run" : "Backend run") + "</span>" +
          "<span class='caption'>" + (res.shots != null ? res.shots + " shots · " : "") + esc(res.backend || (isLocal ? "local simulator" : "backend")) +
            " · " + esc(channelLabel(res.channel)) + " @ p = " + res.p + "</span></div>" +
        runLine(res) +
        "<div class='crun-protect'><span class='crun-tag alt'>Protected</span><span>" + esc(res.protected || "") + "</span></div>" +
        "<div class='crun-block'>" +
          "<div class='crun-block-head'>" + (isLocal ? "What the simulation returned" : "What the backend returned") + "</div>" +
          "<p class='caption'>Each bar is one outcome of the " + (bits ? bits + "-bit " : "") + "<b>stabilizer</b> register of the code: a 1 marks a check that read −1 (an alarm).</p>" +
          "<div class='grid-two'>" + hist("Noise-free", ideal, "") + hist("With noise", noisy, "bad") + "</div>" +
        "</div>";
    if (opts.rows && opts.rows.length) {
      html += "<div class='crun-block'>" +
        "<div class='crun-block-head'>Model estimate <span class='crun-sub'>idealized · independent of the counts above</span></div>" +
        "<table class='crun-table'><thead><tr><th>Scenario</th><th>Logical failure rate</th></tr></thead><tbody>" +
        opts.rows.map(function (r, i) { return "<tr" + (i === opts.rows.length - 1 && opts.rows.length > 1 ? " class='good'" : "") + "><td>" + esc(r.label) + "</td><td>" + r.value + "</td></tr>"; }).join("") +
        "</tbody></table>" +
        "<p class='caption' style='margin-top:8px'>Analytical <em>code-capacity</em> estimate for the " + esc(channelLabel(res.channel)) + " channel at p = " + res.p +
          (opts.factor && isFinite(opts.factor) ? ". Correction lowers the failure rate by ≈" + opts.factor.toFixed(1) + "×." : ".") +
          " Not decoded from the counts above.</p>" +
        "</div>";
    }
    if (res.citations && res.citations.length) {
      html += "<details class='expand' style='margin-top:12px'><summary>Noise models &amp; references</summary><div>" +
        res.citations.map(function (c) { return "<div class='caption' style='margin-top:4px'>" + esc(c) + "</div>"; }).join("") + "</div></details>";
    }
    return html + "</div>";
  }

  /**
   * Mount a run card into `host`.
   *
   * @param {Element} host
   * @param {object} opts
   * @param {string} opts.model       model id from circuits.js MODELS
   * @param {string} [opts.label]     button label
   * @param {object|function} [opts.options]  run options (or a fn returning them)
   * @param {function} [opts.onResult] (result, outEl) => void, to drive the page
   */
  function mount(host, opts) {
    if (!host) return null;
    opts = opts || {};
    host.innerHTML =
      "<div class='crun'>" +
        "<div class='crun-bar-row'>" +
          "<button class='btn primary' data-crun>" + esc(opts.label || "Run on Qollab") + "</button>" +
          hwBadge() +
          "<span class='caption' data-crun-status></span>" +
        "</div>" +
        "<div class='crun-out' data-crun-out></div>" +
      "</div>";

    var btn = host.querySelector("[data-crun]");
    var status = host.querySelector("[data-crun-status]");
    var out = host.querySelector("[data-crun-out]");
    var ready = available();

    if (!ready) {
      btn.disabled = true;
      status.textContent = "Run inside Qollab to execute this circuit on a backend.";
    }

    btn.addEventListener("click", function () {
      btn.disabled = true;
      status.textContent = "Submitting one job…";
      out.innerHTML = "";
      var model = typeof opts.model === "function" ? opts.model() : opts.model;
      var options = typeof opts.options === "function" ? opts.options() : opts.options;
      run(model, options).then(function (result) {
        status.textContent = result.shots + " shots · " + result.qubits + " qubits";
        out.innerHTML =
          barsHTML(result.counts) +
          (summaryLine(result) ? "<p class='caption crun-sum'>" + esc(summaryLine(result)) + "</p>" : "") +
          (result.summary && result.summary.note ? "<p class='caption crun-note'>" + esc(result.summary.note) + "</p>" : "");
        if (opts.onResult) opts.onResult(result, out);
      }).catch(function (err) {
        status.textContent = "";
        out.innerHTML = "<div class='notice'><p>" + esc((err && err.message) || err) + "</p></div>";
      }).then(function () {
        btn.disabled = !available();
      });
    });

    return { element: host };
  }

  function runNoisy(options) {
    return load().then(function (mod) {
      if (!mod.runNoisy) throw new Error("The noisy circuit runner is not loaded.");
      return mod.runNoisy(options || {});
    });
  }

  function pct(x) { return Math.round(100 * (x || 0)) + "%"; }

  /* A small pill that flags a section which submits a circuit to a backend. */
  function hwBadge(label) {
    return "<span class='hw-badge' title='This section runs a circuit on the Qollab backend you pick in the Select QPU dialog'>" +
      "<span class='dot2' aria-hidden='true'></span>" + esc(label || "Backend job") + "</span>";
  }

  /* One line describing where a run happened (backend job, or local fallback). */
  function runLine(res) {
    if (res.mode === "backend") {
      return "<p class='caption' style='margin-top:8px'>Ran on the Qollab backend" +
        (res.backend ? " (" + esc(res.backend) + ")" : "") + " · device noise model.</p>";
    }
    if (res.mode === "local") {
      return "<div class='notice' style='margin-top:8px'><p><b>Local simulation.</b> " +
        esc(res.note || "This circuit does not fit on the backend, so it was simulated locally, not on hardware.") + "</p></div>";
    }
    return "<p class='caption' style='margin-top:8px'>Ran on the Qollab backend" +
      (res.backend ? " (" + esc(res.backend) + ")" : "") + " · ideal circuit, noise injected classically.</p>";
  }

  /**
   * Mount a "run the circuit with in-circuit noise" card.
   *
   * Used when the backend is not Qollab's noisy simulator: we attach a standard
   * channel (bit-flip X / phase-flip Z / depolarizing) to every gate at
   * probability p and compare the ideal and noisy distributions.
   *
   * @param {Element} host
   * @param {object} [opts]
   * @param {string} [opts.channel='x']
   * @param {number} [opts.p=0.05]
   * @param {number} [opts.shots=2048]
   * @param {function} [opts.onResult] (result, outEl) => void
   */
  function mountNoise(host, opts) {
    if (!host) return null;
    opts = opts || {};
    var state = { channel: opts.channel || "x", p: opts.p != null ? opts.p : 0.05 };
    var model = opts.model || "shor";
    var CHAN = [["x", "Bit-flip X"], ["z", "Phase-flip Z"], ["depol", "Depolarizing"]];
    var PROTECTED = {
      shor: "one logical qubit (memory) — Shor code [[9,1,3]]",
      surface: "one logical qubit (memory) — surface code d = 3",
      iceberg: "two logical qubits (detection only) — Iceberg code [[4,2,2]]",
    };

    host.innerHTML =
      "<div class='cnoise'>" +
        "<div class='chip-row' data-ch>" +
          CHAN.map(function (c) {
            return "<button class='chip" + (state.channel === c[0] ? " active" : "") + "' type='button' data-chn='" + c[0] + "'>" + c[1] + "</button>";
          }).join("") +
        "</div>" +
        "<div class='slider' style='margin-top:12px'><div class='slider-head'><label for='cn-p'>Noise per gate · p</label>" +
          "<span class='val' data-pval>" + state.p.toFixed(2) + "</span></div>" +
          "<input id='cn-p' class='range' type='range' min='0' max='0.2' step='0.01' value='" + state.p + "' data-prange style='--range-progress:" + (100 * state.p / 0.2) + "%'></div>" +
        "<div class='crun-bar-row' style='margin-top:12px'>" +
          "<button class='btn primary' data-nrun>Run noisy circuit</button>" +
          hwBadge() +
          "<span class='caption' data-cn-status></span>" +
        "</div>" +
        "<p class='caption' data-cn-mode style='margin-top:8px'></p>" +
        "<div data-nout></div>" +
      "</div>";

    var btn = host.querySelector("[data-nrun]");
    var status = host.querySelector("[data-cn-status]");
    var out = host.querySelector("[data-nout]");
    var range = host.querySelector("[data-prange]");

    host.querySelectorAll("[data-chn]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.channel = el.getAttribute("data-chn");
        host.querySelectorAll("[data-chn]").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-chn") === state.channel);
        });
      });
    });
    range.addEventListener("input", function () {
      state.p = Number(range.value);
      host.querySelector("[data-pval]").textContent = state.p.toFixed(2);
      range.style.setProperty("--range-progress", (100 * state.p / 0.2) + "%");
    });

    if (!available()) {
      btn.disabled = true;
      status.textContent = "Run inside Qollab to execute this circuit.";
    }
    var modeEl = host.querySelector("[data-cn-mode]");
    if (available()) {
      modeEl.textContent = backendHasNoise()
        ? "This backend already applies a noise model (" + (backendName() || "device") + "); the run uses it directly — no noise is injected."
        : "This backend is ideal; the circuit will get the injected noise channel below.";
    }

    btn.addEventListener("click", function () {
      btn.disabled = true;
      out.innerHTML = "";
      status.textContent = "Running on the Qollab backend…";
      runNoisy({ model: model, channel: state.channel, p: state.p, shots: opts.shots || 2048 }).then(function (res) {
        status.textContent = res.shots + " shots · " + res.channel + " @ p = " + res.p + (res.backend ? " · " + res.backend : "");
        out.innerHTML = noisyReportHTML(res);
        if (opts.onResult) opts.onResult(res, out);
      }).catch(function (err) {
        status.textContent = "";
        out.innerHTML = "<div class='notice'><p>" + esc((err && err.message) || err) + "</p></div>";
      }).then(function () {
        btn.disabled = !available();
      });
    });

    return { element: host };
  }

  global.CircuitRun = {
    available: available,
    run: run,
    runNoisy: runNoisy,
    mount: mount,
    mountNoise: mountNoise,
    backendHasNoise: backendHasNoise,
    backendName: backendName,
    hwBadge: hwBadge,
    runLine: runLine,
    barsHTML: barsHTML,
    summaryLine: summaryLine,
    channelLabel: channelLabel,
    noisyReportHTML: noisyReportHTML,
  };
})(typeof window !== "undefined" ? window : globalThis);
