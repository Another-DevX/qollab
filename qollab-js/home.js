/*!
 * Qollab · Platform — Home page (module selection).
 * Exposes window.Home.render(root).
 *
 * Layout: a split editorial cover — a scientific introduction with a Bloch-sphere
 * illustration on the left and the four module cards (2 × 2) on the right.
 * The module registry is data-driven; only entries with status "ready" are shown.
 */
(function (global) {
  "use strict";

  var MODULES = [
    {
      n: "01",
      href: "#/module-1",
      title: "Understanding Quantum Errors",
      desc: "Pauli operators and the Bloch sphere.",
      status: "ready",
    },
    {
      n: "02",
      href: "#/module-2",
      title: "From Repetition to Shor Code",
      desc: "Encoding, syndromes, and recovery.",
      status: "ready",
    },
    {
      n: "03",
      href: "#/module-3",
      title: "Surface Code",
      desc: "Protecting quantum information on a lattice.",
      status: "ready",
    },
    {
      n: "04",
      href: "#/module-4",
      title: "Iceberg Code",
      desc: "Error detection and postselection.",
      status: "ready",
    },
  ];

  /* ------------------------------------------------------------------ figures */
  /* Inline SVGs. All strokes/fills come from CSS classes so light and dark mode
     share one drawing. Entities keep the text charset-safe. */

  function svg(viewBox, body, cls) {
    return "<svg class='fig" + (cls ? " " + cls : "") + "' viewBox='" + viewBox + "' role='img' aria-hidden='true' focusable='false'>" + body + "</svg>";
  }

  /* Hero: a Bloch sphere with axes, one state |psi>, and construction lines. */
  function heroBloch() {
    var cx = 110, cy = 110, R = 74;
    var tx = 150, ty = 49; // tip of the state vector (on the surface)
    return svg("0 0 220 220",
      "<circle class='bl-sphere' cx='110' cy='110' r='74'/>" +
      "<ellipse class='bl-line' cx='110' cy='110' rx='74' ry='25'/>" +
      "<ellipse class='bl-line' cx='110' cy='110' rx='25' ry='74'/>" +
      "<line class='bl-axis' x1='110' y1='30' x2='110' y2='190'/>" +
      "<line class='bl-axis' x1='46' y1='150' x2='174' y2='70'/>" +
      "<line class='bl-axis' x1='46' y1='70' x2='174' y2='150'/>" +
      "<line class='bl-guide' x1='" + tx + "' y1='" + ty + "' x2='" + tx + "' y2='112'/>" +
      "<line class='bl-vec' x1='110' y1='110' x2='" + tx + "' y2='" + ty + "'/>" +
      "<circle class='bl-tip' cx='" + tx + "' cy='" + ty + "' r='3.6'/>" +
      "<text class='bl-lab' x='110' y='20' text-anchor='middle'>|0&rang;</text>" +
      "<text class='bl-lab' x='110' y='210' text-anchor='middle'>|1&rang;</text>" +
      "<text class='bl-ax' x='116' y='40'>z</text>" +
      "<text class='bl-ax' x='178' y='68'>x</text>" +
      "<text class='bl-ax' x='178' y='154'>y</text>" +
      "<text class='bl-key' x='157' y='45'>|&psi;&rang;</text>"
    );
  }

  /* 01 · a small Bloch sphere with one vector. */
  function blochMini() {
    return svg("0 0 60 60",
      "<circle class='mini-sphere' cx='30' cy='30' r='17'/>" +
      "<ellipse class='mini-line' cx='30' cy='30' rx='17' ry='6'/>" +
      "<line class='mini-line' x1='30' y1='13' x2='30' y2='47'/>" +
      "<line class='mini-vec' x1='30' y1='30' x2='42' y2='15'/>" +
      "<circle class='mini-tip' cx='42' cy='15' r='2.4'/>"
    );
  }

  /* 02 · the three-qubit repetition code with two parity checks. */
  function repetitionMini() {
    var dot = function (x) { return "<circle class='mini-node' cx='" + x + "' cy='36' r='3.4'/>"; };
    return svg("0 0 108 52",
      "<line class='mini-line' x1='10' y1='36' x2='98' y2='36'/>" +
      dot(24) + dot(54) + dot(84) +
      "<rect class='mini-tile' x='20' y='10' width='26' height='14' rx='3'/>" +
      "<rect class='mini-tile' x='62' y='10' width='26' height='14' rx='3'/>" +
      "<line class='mini-line' x1='24' y1='24' x2='24' y2='33'/>" +
      "<line class='mini-line' x1='42' y1='24' x2='42' y2='33'/>" +
      "<line class='mini-line' x1='66' y1='24' x2='66' y2='33'/>" +
      "<line class='mini-line' x1='84' y1='24' x2='84' y2='33'/>" +
      "<text class='mini-label' x='33' y='20' text-anchor='middle'>Z</text>" +
      "<text class='mini-label' x='75' y='20' text-anchor='middle'>Z</text>"
    );
  }

  /* 03 · a small surface-code lattice with X- and Z-type tiles. */
  function latticeMini() {
    var xs = [22, 54, 86], ys = [16, 34, 52];
    var edges = "";
    for (var a = 0; a < 3; a++) {
      for (var b = 0; b < 3; b++) {
        if (b < 2) edges += "<line class='mini-line' x1='" + xs[b] + "' y1='" + ys[a] + "' x2='" + xs[b + 1] + "' y2='" + ys[a] + "'/>";
        if (a < 2) edges += "<line class='mini-line' x1='" + xs[b] + "' y1='" + ys[a] + "' x2='" + xs[b] + "' y2='" + ys[a + 1] + "'/>";
      }
    }
    var nodes = "";
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) nodes += "<circle class='mini-node' cx='" + xs[j] + "' cy='" + ys[i] + "' r='3'/>";
    return svg("0 0 108 66",
      edges +
      "<rect class='mini-tile' x='33' y='22' width='30' height='20' rx='2'/>" +
      "<rect class='mini-tile z' x='57' y='22' width='30' height='20' rx='2'/>" +
      nodes
    );
  }

  /* 04 · the four-qubit [[4,2,2]] code: one X-type and one Z-type stabilizer. */
  function icebergMini() {
    var dot = function (x) { return "<circle class='mini-node' cx='" + x + "' cy='28' r='3.4'/>"; };
    return svg("0 0 108 52",
      dot(20) + dot(42) + dot(66) + dot(88) +
      "<line class='mini-dash' x1='20' y1='12' x2='88' y2='12'/>" +
      "<line class='mini-line' x1='20' y1='44' x2='88' y2='44'/>" +
      "<line class='mini-line' x1='20' y1='15' x2='20' y2='25'/>" +
      "<line class='mini-line' x1='88' y1='15' x2='88' y2='25'/>" +
      "<line class='mini-line' x1='20' y1='31' x2='20' y2='41'/>" +
      "<line class='mini-line' x1='88' y1='31' x2='88' y2='41'/>" +
      "<text class='mini-label' x='10' y='15' text-anchor='end'>S</text>" +
      "<text class='mini-label' x='10' y='47' text-anchor='end'>S</text>"
    );
  }

  var FIGS = { "01": blochMini, "02": repetitionMini, "03": latticeMini, "04": icebergMini };

  /* -------------------------------------------------------------------- cards */

  function card(mod) {
    return "<li>" +
      "<a class='modcard' href='" + mod.href + "' aria-label='Explore Module " + mod.n + ": " + mod.title + "'>" +
        "<span class='modcard-head'><span class='modcard-label'>Module</span><span class='modcard-num'>" + mod.n + "</span></span>" +
        "<span class='modcard-fig'>" + (FIGS[mod.n] ? FIGS[mod.n]() : "") + "</span>" +
        "<span class='modcard-title'>" + mod.title + "</span>" +
        "<span class='modcard-desc'>" + mod.desc + "</span>" +
        "<span class='modcard-action'>Explore Module <span aria-hidden class='modcard-arrow'>&rarr;</span></span>" +
      "</a>" +
    "</li>";
  }

  function render(root) {
    var ready = MODULES.filter(function (mod) { return mod.status === "ready"; });
    root.innerHTML =
      "<div class='container home'>" +
        "<div class='home-split'>" +
          "<section class='home-cover' aria-label='Introduction'>" +
            "<p class='eyebrow'>Interactive quantum learning</p>" +
            "<h1 class='headline home-title'>Quantum<br>Error Correction</h1>" +
            "<p class='home-sub'>Explore quantum errors, build codes, and learn how quantum information survives noise.</p>" +
            "<figure class='home-figure'>" + heroBloch() +
              "<figcaption class='home-figure-cap'><span class='m'>|&psi;&rang; = &alpha;|0&rang; + &beta;|1&rang;</span></figcaption>" +
            "</figure>" +
          "</section>" +
          "<section class='home-modules' aria-label='Modules'>" +
            "<div class='modsection-head'><span class='eyebrow' style='color:var(--faint)'>Modules</span><span class='rule' style='flex:1'></span></div>" +
            "<ol class='modgrid'>" + ready.map(card).join("") + "</ol>" +
          "</section>" +
        "</div>" +
      "</div>";
    return null;
  }

  global.Home = { render: render, MODULES: MODULES };
})(typeof window !== "undefined" ? window : globalThis);
