/*!
 * Qollab · Platform — router, header and theme.
 * Unifies the Home page, Module 1 and Module 2 behind one hash router.
 * No dependencies, no build step.
 */
(function (global) {
  "use strict";

  var app = document.getElementById("app");
  var headerNote = document.getElementById("header-note");
  var cleanup = null;

  /* Build the route table from the data-driven module registries. */
  var ROUTES = {};
  ROUTES[""] = ROUTES["/"] = { fn: global.Home.render, note: "", title: "Quantum Error Correction" };

  [
    ["Module1", "Understanding quantum errors", "Module 1"],
    ["Module2", "From Repetition to Shor Code", "Module 2"],
    ["Module3", "The Surface Code", "Module 3"],
    ["Module4", "Iceberg Code · [[4,2,2]]", "Module 4"],
    ["ErrorsLab", "Systematic gate errors · one qubit", "Lab"],
  ].forEach(function (def) {
    var mod = global[def[0]];
    if (!mod) return;
    Object.keys(mod.routes).forEach(function (path) {
      ROUTES[path] = { fn: mod.render[mod.routes[path]], note: def[1], title: def[2] };
    });
  });

  function go() {
    if (cleanup) { cleanup(); cleanup = null; }
    var hash = (location.hash || "").replace(/^#/, "");
    var entry = ROUTES[hash] || ROUTES["/"];
    app.innerHTML = "";
    cleanup = entry.fn(app) || null;
    if (headerNote) headerNote.textContent = entry.note || "";
    document.title = "Qollab · " + entry.title;
    global.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  global.addEventListener("hashchange", go);

  /* Theme toggle */
  function isDark() { return document.documentElement.classList.contains("dark"); }
  var themeBtn = document.getElementById("theme-toggle");
  function syncThemeBtn() {
    var dark = isDark();
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    themeBtn.setAttribute("title", dark ? "Light theme" : "Dark theme");
    themeBtn.innerHTML = dark
      ? "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'><circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/></svg>"
      : "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z'/></svg>";
  }
  themeBtn.addEventListener("click", function () {
    document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("qc-theme", isDark() ? "dark" : "light"); } catch (e) {}
    syncThemeBtn(); go();
  });
  try { if (localStorage.getItem("qc-theme") === "dark") document.documentElement.classList.add("dark"); } catch (e) {}
  syncThemeBtn();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
  else go();
})(typeof window !== "undefined" ? window : globalThis);
