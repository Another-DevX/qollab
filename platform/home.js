/*!
 * Qollab · Platform — Home page (module selection).
 * Exposes window.Home.render(root). The module registry is data-driven so new
 * modules can be added without touching the markup.
 */
(function (global) {
  "use strict";

  /* Typed module registry. Only entries with status "ready" are shown. */
  var MODULES = [
    {
      n: "01",
      href: "#/module-1",
      title: "Understanding Quantum Errors",
      desc: "Explore Pauli errors, the Bloch sphere, and quantum transformations.",
      status: "ready",
    },
    {
      n: "02",
      href: "#/module-2",
      title: "From Repetition to Shor Code",
      desc: "Build quantum codes, measure syndromes, and correct logical errors.",
      status: "ready",
    },
    {
      n: "04",
      href: "#/module-4",
      title: "Iceberg Code",
      desc: "Explore how four physical qubits detect quantum errors, why some errors cannot be corrected, and how postselection can help.",
      status: "ready",
    },
    /* Future modules — not displayed until implemented:
     * { n: "03", href: "#/module-3", title: "The Surface Code",
     *   desc: "Protect quantum information on a two-dimensional lattice.", status: "soon" },
     */
  ];

  function card(mod) {
    return "<li>" +
      "<a class='modcard' href='" + mod.href + "' aria-label='Explore Module " + mod.n + ": " + mod.title + "'>" +
        "<span class='modcard-label'>Module " + mod.n + "</span>" +
        "<span class='modcard-title'>" + mod.title + "</span>" +
        "<span class='modcard-desc'>" + mod.desc + "</span>" +
        "<span class='modcard-action'>Explore Module <span aria-hidden class='modcard-arrow'>→</span></span>" +
      "</a>" +
    "</li>";
  }

  function render(root) {
    var ready = MODULES.filter(function (mod) { return mod.status === "ready"; });
    root.innerHTML =
      "<div class='container'>" +
        "<header class='home-hero'>" +
          "<div class='eyebrow'>Interactive quantum learning</div>" +
          "<h1 class='headline home-title'>Quantum Error Correction</h1>" +
          "<p class='home-sub'>Explore quantum errors, build codes, and discover how quantum information can be protected.</p>" +
        "</header>" +
        "<section aria-label='Modules' class='modsection'>" +
          "<div class='modsection-head'><span class='eyebrow' style='color:var(--faint)'>Modules</span><span class='rule' style='flex:1'></span></div>" +
          "<ol class='modgrid'>" + ready.map(card).join("") + "</ol>" +
        "</section>" +
      "</div>";
    return null;
  }

  global.Home = { render: render, MODULES: MODULES };
})(typeof window !== "undefined" ? window : globalThis);
