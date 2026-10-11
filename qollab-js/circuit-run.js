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

  global.CircuitRun = {
    available: available,
    run: run,
    mount: mount,
    barsHTML: barsHTML,
    summaryLine: summaryLine,
  };
})(typeof window !== "undefined" ? window : globalThis);
