/*!
 * Qollab · Platform — shared editorial UI helpers (Home + Module 1).
 * Pure HTML-string builders, no dependencies. Exposes window.UI.
 */
(function (global) {
  "use strict";

  function $sel(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s); }

  function pageHead(num, kick, title, dek) {
    return "<header class='page-head'>" +
      "<div class='meta'><span class='num'>" + num + "</span><span class='kick'>" + kick + "</span></div>" +
      "<h2 class='headline'>" + title + "</h2>" +
      (dek ? "<p class='dek'>" + dek + "</p>" : "") + "</header>";
  }
  function backLink(href, label) { return "<a class='backlink' href='" + href + "'>← Previous · " + label + "</a>"; }
  function legendHTML(items) {
    return items.map(function (it) { return "<span><span class='dot' style='background:" + it.c + "'></span>" + it.t + "</span>"; }).join("");
  }
  function panel(inner, cls) { return "<div class='panel" + (cls ? " " + cls : "") + "'>" + inner + "</div>"; }
  function keyIdea(label, body) {
    return "<div class='keyidea'><span class='eyebrow'>" + label + "</span><p>" + body + "</p></div>";
  }
  function notice(label, body) {
    return "<div class='notice'><span class='eyebrow'>" + label + "</span><p>" + body + "</p></div>";
  }
  function expandable(label, body, open) {
    return "<details class='expand'" + (open ? " open" : "") + "><summary>" + label + "</summary><div class='body'>" + body + "</div></details>";
  }
  function eq(html, cls) { return "<div class='eq" + (cls ? " " + cls : "") + "'>" + html + "</div>"; }
  function m(html) { return "<span class='m'>" + html + "</span>"; }
  function stat(label, value, hint, tone) {
    return "<div class='stat'><span class='lbl'>" + label + "</span><span class='val'" + (tone ? " style='color:" + tone + "'" : "") + ">" + value + "</span>" +
      (hint ? "<span class='hint'>" + hint + "</span>" : "") + "</div>";
  }
  function fieldRow(label, value) {
    return "<div class='fieldrow'><span class='fl'>" + label + "</span><span class='fv'>" + value + "</span></div>";
  }
  function transition(num, question, teaser, href, action) {
    return "<aside class='transition'><div class='big'>" + num + "</div><div>" +
      "<span class='eyebrow' style='color:var(--faint)'>Next</span>" +
      "<p class='q'>" + question + "</p>" +
      "<p class='teaser'>" + teaser + "</p>" +
      (href ? "<div style='margin-top:20px'><a class='btn primary' href='" + href + "'>" + action + "</a></div>" : "") +
      "</div></aside>";
  }
  function chip(label, active, attrs) {
    return "<button class='chip" + (active ? " active" : "") + "' type='button' " + (attrs || "") + ">" + label + "</button>";
  }

  /* Shared module cover: 40% editorial introduction + 60% lesson index ("The route"). */
  function moduleCover(o) {
    var deks = (o.deks || []).map(function (d) { return "<p class='dek cover-dek'>" + d + "</p>"; }).join("");
    var route = o.lessons.map(function (l) {
      return "<li><a class='route-item' href='" + l.href + "'>" +
        "<span class='route-num'>" + l.num + "</span>" +
        "<span class='route-body'><span class='route-title'>" + l.title + "</span>" +
        (l.hw ? "<span class='hw-badge' style='margin-top:6px' title='Runs a circuit on the Qollab backend you pick'><span class='dot2' aria-hidden='true'></span>Backend</span>" : "") +
        (l.desc ? "<span class='route-desc'>" + l.desc + "</span>" : "") + "</span>" +
        "<span class='route-arrow' aria-hidden='true'>&rarr;</span></a></li>";
    }).join("");
    return "<div class='container cover-page'>" +
      backLink(o.backHref || "#/", o.backLabel || "All modules") +
      "<div class='module-cover'>" +
        "<section class='cover-intro'>" +
          "<div style='display:flex;align-items:center;gap:12px'><span style='height:1px;width:40px;background:var(--accent)'></span><span class='eyebrow'>" + o.label + "</span></div>" +
          "<h1 class='headline cover-title'>" + o.title + "</h1>" +
          "<p class='sub cover-sub'>" + o.sub + "</p>" + deks +
          "<div class='cover-cta'><a class='btn primary' href='" + o.ctaHref + "'>" + o.ctaLabel + "</a>" +
            (o.meta ? "<span class='caption'>" + o.meta + "</span>" : "") + "</div>" +
          (o.figure ? "<div class='cover-figure'>" + o.figure + "</div>" : "") +
        "</section>" +
        "<section class='cover-route' aria-label='Module route'>" +
          "<div class='route-head'><span class='eyebrow' style='color:var(--faint)'>The route</span><span class='rule' style='flex:1'></span></div>" +
          "<ol class='route-list'>" + route + "</ol>" +
        "</section>" +
      "</div></div>";
  }
  function rangeSlider(o) {
    var progress = o.max > o.min ? ((o.value - o.min) / (o.max - o.min)) * 100 : 0;
    return "<div class='slider'>" +
      "<div class='slider-top'><label for='" + o.id + "'>" + o.label + "</label>" +
      (o.display != null ? "<span class='slider-val'>" + o.display + "</span>" : "") + "</div>" +
      "<input id='" + o.id + "' class='range' type='range' min='" + o.min + "' max='" + o.max + "' step='" + o.step + "' value='" + o.value + "' " +
      "style='--range-progress:" + progress + "%' aria-label='" + (o.ariaLabel || o.label) + "'/>" +
      (o.hint ? "<p class='caption' style='margin-top:4px'>" + o.hint + "</p>" : "") + "</div>";
  }

  /* 2×2 complex matrix with brackets. */
  function matrixHTML(matrix, opts) {
    opts = opts || {};
    var digits = opts.digits == null ? 3 : opts.digits;
    var fmt = global.M1.formatComplex;
    function cell(c) {
      var text = fmt(c, digits).replace(/-/g, "−");
      var zero = Math.abs(c.re) < 1e-12 && Math.abs(c.im) < 1e-12;
      if (opts.highlight && !zero) return "<span style='color:" + (opts.accent || "var(--accent)") + "'>" + text + "</span>";
      return text;
    }
    var rows = "<span class='mx-row'><span class='mx-cell'>" + cell(matrix[0][0]) + "</span><span class='mx-cell'>" + cell(matrix[0][1]) + "</span></span>" +
      "<span class='mx-row'><span class='mx-cell'>" + cell(matrix[1][0]) + "</span><span class='mx-cell'>" + cell(matrix[1][1]) + "</span></span>";
    var body = "<span class='matrix'>" + rows + "</span>";
    return opts.label ? "<span class='matrix-wrap'><span class='mx-label'>" + opts.label + "</span>" + body + "</span>" : body;
  }

  global.UI = {
    $sel: $sel, $all: $all, esc: esc,
    pageHead: pageHead, backLink: backLink, legendHTML: legendHTML, panel: panel,
    keyIdea: keyIdea, notice: notice, expandable: expandable, eq: eq, m: m,
    stat: stat, fieldRow: fieldRow, transition: transition, chip: chip,
    moduleCover: moduleCover,
    rangeSlider: rangeSlider, matrixHTML: matrixHTML,
  };
})(typeof window !== "undefined" ? window : globalThis);
