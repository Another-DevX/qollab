/*
 * main.js — DOM, SVG rendering, hash router and events for Module 3.
 * No physics here: every number shown comes from surface.js, decoder.js or game.js.
 */
(function (global) {
  'use strict';

  var S = window.Surface;
  var D = window.Decoder;
  var G = window.Game;
  var UI = global.UI;
  var Quiz = global.SurfaceQuiz;

  var BASE = '#/module-3';

  // ================================================================ utils

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function pct(f, digits) {
    return (100 * f).toFixed(digits === undefined ? 1 : digits).replace(/\.0+$/, '') + '%';
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function storageGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function storageSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  // Theme is handled by the host app (the platform toggles the .dark class).

  // =============================================================== routes

  var LESSONS = [
    { path: '/grid', num: '01', short: 'From a line to a grid', q: 'What if the repetition code grew in two directions?', render: renderGrid },
    { path: '/stabilizers', num: '02', short: 'Stabilizers as tiles', q: 'Which tiles notice which errors?', render: renderStabilizers },
    { path: '/strings', num: '03', short: 'Errors are strings, syndromes are endpoints', q: 'Why do only the ends of an error light up?', render: renderStrings },
    { path: '/decoder', num: '04', short: 'Be the decoder', q: 'Can you fix errors you cannot see?', render: renderDecoder },
    { path: '/logical', num: '05', short: 'The logical qubit', q: 'How many errors does it take to fool the code?', render: renderLogical },
    { path: '/threshold', num: '06', short: 'The threshold', q: 'Does a bigger grid always help?', render: renderThreshold },
    { path: '/lab', num: '07', short: 'Distance lab', q: 'How much does a bigger grid buy you?', render: renderLab, hw: true },
    { path: '/conclusion', num: 'End', short: 'Conclusion', q: 'What did the grid teach us?', render: renderConclusion }
  ];

  function lessonIndex(path) {
    for (var k = 0; k < LESSONS.length; k++) if (LESSONS[k].path === path) return k;
    return -1;
  }

  // The platform owns the hash router; we expose render functions instead.
  function makeRender(path, fn) {
    return function (root) {
      var page = document.createElement('div');
      page.className = 'm3 page';
      root.appendChild(page);
      return fn(page) || null;
    };
  }

  // ============================================================ components

  function backLink() { return UI.backLink(BASE, 'Cover'); }

  function pageHead(num, kicker, title, dek) {
    return backLink() + UI.pageHead(num, kicker, title, dek);
  }

  function transitionBlock(question, path, label) {
    var k = lessonIndex(path);
    var next = k >= 0 ? LESSONS[k] : null;
    return UI.transition(next ? next.num : '→', question, next ? next.short : '', BASE + path, label);
  }

  function chipGroup(name, label, options, current) {
    return '<div class="chip-row" role="group" aria-label="' + esc(label) + '">' + options.map(function (o) {
      var active = String(o.value) === String(current);
      return '<button type="button" class="chip' + (active ? ' active' : '') + '" data-chip="' + name + '" data-value="' + esc(o.value) + '"' +
        ' aria-pressed="' + (active ? 'true' : 'false') + '"' +
        (o.disabled ? ' disabled' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' + o.label + '</button>';
    }).join('') + '</div>';
  }

  function setPressed(root, name, value) {
    root.querySelectorAll('[data-chip="' + name + '"]').forEach(function (b) {
      var active = b.getAttribute('data-value') === String(value);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
      b.classList.toggle('active', active);
    });
  }

  function distanceChips(current) {
    return chipGroup('d', 'Code distance', S.DISTANCES.map(function (d) {
      return { value: d, label: '<span class="m">d</span> = ' + d };
    }), current);
  }

  function synStrip(lattice, syn) {
    return '<ul class="syn-strip" aria-label="Syndrome: ' + syn.defects.length + ' of ' + lattice.stabilizers.length + ' tiles read −1">' +
      lattice.stabilizers.map(function (s) {
        var bad = syn.values[s.id] < 0;
        return '<li class="' + s.type.toLowerCase() + (bad ? ' bad' : '') + '" title="' + s.type + '-tile ' + s.id.slice(1).replace('_', ',') + '">' +
          '<b>' + s.type + '</b>' + (bad ? '−1 !' : '+1') + '</li>';
      }).join('') + '</ul>';
  }

  var SWATCH = {
    x: '<svg width="18" height="18" aria-hidden="true"><rect x="1" y="1" width="16" height="16" fill="var(--x-tile)" stroke="var(--x)" stroke-width="1.5"/></svg>',
    z: '<svg width="18" height="18" aria-hidden="true"><defs><pattern id="sw-h" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--z-tile)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--z)" stroke-width="1.4" opacity=".5"/></pattern></defs><rect x="1" y="1" width="16" height="16" fill="url(#sw-h)" stroke="var(--z)" stroke-width="1.5" stroke-dasharray="4 2"/></svg>',
    alarm: '<svg width="18" height="18" aria-hidden="true"><path d="M9 1 L17 9 L9 17 L1 9Z" fill="var(--defect)"/><text x="9" y="13" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">!</text></svg>',
    err: '<svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="8" fill="var(--err)"/><text x="9" y="13" text-anchor="middle" font-size="10" font-weight="700" fill="var(--err-ink)">X</text></svg>',
    fix: '<svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="8" fill="var(--fix)"/><text x="9" y="13" text-anchor="middle" font-size="10" font-weight="700" fill="var(--fix-ink)">X</text></svg>',
    pair: '<svg width="24" height="18" aria-hidden="true"><line x1="2" y1="9" x2="22" y2="9" stroke="var(--fix)" stroke-width="2.5" stroke-dasharray="5 4"/></svg>',
    hl: '<svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="var(--hl)" stroke-width="4"/></svg>'
  };

  function legend(items) {
    var text = {
      x: 'X-tile (checks for Z errors)',
      z: 'Z-tile (checks for X errors)',
      alarm: 'Alarm: tile reads −1',
      err: 'Error (X, Y or Z)',
      fix: 'Your correction',
      pair: 'Matching',
      hl: 'Highlighted string'
    };
    return '<div class="legend">' + items.map(function (k) {
      return '<span>' + SWATCH[k] + (typeof text[k] === 'string' ? text[k] : '') + '</span>';
    }).join('') + '</div>';
  }

  // ======================================================= lattice drawing

  var uidCounter = 0;
  var CELL = 60;

  function geometry(lattice, o) {
    var d = lattice.d;
    var pad = 44 + (o.edgeLabels ? 30 : 0);
    return {
      d: d,
      pad: pad,
      W: 2 * pad + (d - 1) * CELL,
      X: function (c) { return pad + c * CELL; },
      Y: function (r) { return pad + r * CELL; }
    };
  }

  function tileShape(st, g) {
    var d = g.d, i = st.i, j = st.j, R = CELL / 2, X = g.X, Y = g.Y;
    if (!st.boundary) return 'M' + X(j - 1) + ' ' + Y(i - 1) + 'h' + CELL + 'v' + CELL + 'h' + (-CELL) + 'Z';
    var a, b;
    if (i === 0) { a = [X(j - 1), Y(0)]; b = [X(j), Y(0)]; }
    else if (i === d) { a = [X(j), Y(d - 1)]; b = [X(j - 1), Y(d - 1)]; }
    else if (j === 0) { a = [X(0), Y(i)]; b = [X(0), Y(i - 1)]; }
    else { a = [X(d - 1), Y(i - 1)]; b = [X(d - 1), Y(i)]; }
    return 'M' + a[0] + ' ' + a[1] + 'A' + R + ' ' + R + ' 0 0 1 ' + b[0] + ' ' + b[1] + 'Z';
  }

  function faceCenter(st, g) {
    var d = g.d, i = st.i, j = st.j, off = 0.24 * CELL;
    if (!st.boundary) return [g.X(j - 0.5), g.Y(i - 0.5)];
    if (i === 0) return [g.X(j - 0.5), g.Y(0) - off];
    if (i === d) return [g.X(j - 0.5), g.Y(d - 1) + off];
    if (j === 0) return [g.X(0) - off, g.Y(i - 0.5)];
    return [g.X(d - 1) + off, g.Y(i - 0.5)];
  }

  function tileLabel(st) {
    return st.type + '-tile ' + (st.boundary ? 'on the edge ' : '') + 'at corner ' + st.i + ',' + st.j;
  }

  var QUBIT_R = 11;
  var BADGE_R = 13;

  // Error / correction badge(s), always centred on the qubit's own (0, 0).
  //   error only -> dark disc; fix only -> purple disc (same size);
  //   both       -> one pill split in two halves: error | fix.
  function badgeSVG(err, fix) {
    var R = BADGE_R;
    if (err !== 'I' && fix !== 'I') {
      var w = 7; // half-width of the straight part of the pill
      return '<g class="lat-badge both" aria-hidden="true">' +
        '<path class="half-err" d="M0 ' + (-R) + 'H' + (-w) + 'A' + R + ' ' + R + ' 0 0 0 ' + (-w) + ' ' + R + 'H0Z"/>' +
        '<path class="half-fix" d="M0 ' + (-R) + 'H' + w + 'A' + R + ' ' + R + ' 0 0 1 ' + w + ' ' + R + 'H0Z"/>' +
        '<text class="t-err" x="' + (-w - 1) + '">' + err + '</text><text class="t-fix" x="' + (w + 1) + '">' + fix + '</text></g>';
    }
    if (err !== 'I') return '<g class="lat-badge err" aria-hidden="true"><circle r="' + R + '"/><text>' + err + '</text></g>';
    if (fix !== 'I') return '<g class="lat-badge fix" aria-hidden="true"><circle r="' + R + '"/><text>' + fix + '</text></g>';
    return '';
  }

  // One qubit: highlight ring, qubit disc, badge, hit area, focus ring.
  // All concentric; the focus ring follows the hit area via :focus-visible.
  function qubitSVG(x, y, q) {
    var both = q.err !== 'I' && q.fix !== 'I';
    var s = '<g class="lat-q" transform="translate(' + x + ' ' + y + ')">';
    if (q.highlight) s += '<circle class="lat-hl" r="18"/>';
    s += '<circle class="lat-qubit' + (q.selected ? ' sel' : '') + '" r="' + QUBIT_R + '"/>';
    s += badgeSVG(q.err, q.fix);
    if (q.hit) {
      s += '<circle class="lat-hit" data-q="' + q.hit.q + '" r="22" tabindex="0" role="button" aria-label="' + esc(q.hit.label) + '"/>';
      s += '<circle class="lat-focus" r="' + ((both ? 20 : BADGE_R) + 4) + '"/>';
    }
    return s + '</g>';
  }

  /*
   * opts: { errors, correction, defects, selected, pairs, highlightQubits,
   *         highlightTiles, silentTiles, selectedQubits, showTiles, showDefects,
   *         hideErrors, interactive, clickTiles, edgeLabels, logicalLines, cls, label }
   */
  function latticeSVG(lattice, o) {
    o = o || {};
    var g = geometry(lattice, o);
    var uid = 'lat' + (++uidCounter);
    var has = function (arr, v) { return !!arr && arr.indexOf(v) >= 0; };
    var showTiles = o.showTiles !== false;
    var showDefects = o.showDefects !== false;
    var interactive = o.interactive !== false;
    var out = [];

    out.push('<svg class="lat-svg ' + (o.cls || '') + '" viewBox="0 0 ' + g.W + ' ' + g.W + '" role="group" aria-label="' +
      esc(o.label || 'Surface code lattice, distance ' + lattice.d) + '">');
    out.push('<defs><pattern id="' + uid + '-hz" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">' +
      '<rect width="8" height="8" class="lat-hatch-bg"/><line x1="0" y1="0" x2="0" y2="8" class="lat-hatch-line"/></pattern></defs>');

    // tiles
    lattice.stabilizers.forEach(function (st) {
      var lit = showDefects && has(o.defects, st.id);
      if (!showTiles && !lit) return;
      var cls = ['lat-tile', st.type.toLowerCase()];
      if (lit) cls.push('defect');
      if (has(o.highlightTiles, st.id)) cls.push('hl');
      if (has(o.silentTiles, st.id)) cls.push('silent');
      if (has(o.dimTiles, st.id)) cls.push('dim');
      if (o.selected === st.id) cls.push('sel');
      var attrs = '';
      if (interactive && has(o.clickTiles, st.id)) {
        attrs = ' data-stab="' + st.id + '" tabindex="0" role="button" aria-pressed="' + (o.selected === st.id) + '" aria-label="' +
          esc('Alarm on ' + tileLabel(st) + (o.selected === st.id ? ', selected' : '')) + '"';
      }
      out.push('<path d="' + tileShape(st, g) + '" class="' + cls.join(' ') + '"' +
        (st.type === 'Z' ? ' fill="url(#' + uid + '-hz)"' : '') + attrs + '><title>' + esc(tileLabel(st)) + '</title></path>');
    });

    // grid edges between neighbouring qubits
    for (var r = 0; r < g.d; r++) {
      for (var c = 0; c < g.d; c++) {
        if (c < g.d - 1) out.push('<line class="lat-edge" x1="' + g.X(c) + '" y1="' + g.Y(r) + '" x2="' + g.X(c + 1) + '" y2="' + g.Y(r) + '"/>');
        if (r < g.d - 1) out.push('<line class="lat-edge" x1="' + g.X(c) + '" y1="' + g.Y(r) + '" x2="' + g.X(c) + '" y2="' + g.Y(r + 1) + '"/>');
      }
    }

    // logical operators as thick highlighted lines
    if (o.logicalLines) {
      var mid = (g.d - 1) / 2;
      out.push('<line class="lat-hl-line" x1="' + g.X(mid) + '" y1="' + (g.Y(0) - 18) + '" x2="' + g.X(mid) + '" y2="' + (g.Y(g.d - 1) + 18) + '"/>');
      out.push('<line class="lat-hl-line" x1="' + (g.X(0) - 18) + '" y1="' + g.Y(mid) + '" x2="' + (g.X(g.d - 1) + 18) + '" y2="' + g.Y(mid) + '"/>');
    }

    // edge labels: which strings may end silently where
    if (o.edgeLabels) {
      var cx = g.W / 2, top = 16, bottom = g.W - 8;
      out.push('<text class="lat-edge-label x" x="' + cx + '" y="' + top + '">X-strings can end here</text>');
      out.push('<text class="lat-edge-label x" x="' + cx + '" y="' + bottom + '">X-strings can end here</text>');
      out.push('<text class="lat-edge-label z" transform="translate(14 ' + cx + ') rotate(-90)">Z-strings can end here</text>');
      out.push('<text class="lat-edge-label z" transform="translate(' + (g.W - 10) + ' ' + cx + ') rotate(90)">Z-strings can end here</text>');
    }

    // "checked twice -> silent" marks
    if (o.silentTiles) {
      o.silentTiles.forEach(function (id) {
        var p = faceCenter(lattice.byId[id], g);
        out.push('<text class="lat-silent-mark" x="' + p[0] + '" y="' + (p[1] + 4) + '">×2 ✓</text>');
      });
    }

    // matching pairs
    if (o.pairs) {
      o.pairs.forEach(function (pr) {
        var pts = [faceCenter(lattice.byId[pr.a], g)];
        pr.path.forEach(function (q) { pts.push([g.X(q % g.d), g.Y(Math.floor(q / g.d))]); });
        if (pr.b === 'boundary') {
          var lq = pr.path[pr.path.length - 1], lr = Math.floor(lq / g.d), lc = lq % g.d;
          var end = pr.pauli === 'X'
            ? [g.X(lc), g.Y(lr) + (lr === 0 ? -34 : 34)]
            : [g.X(lc) + (lc === 0 ? -34 : 34), g.Y(lr)];
          pts.push(end);
          out.push('<polyline class="lat-pair" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>');
          out.push('<rect class="lat-pair-end" x="' + (end[0] - 4) + '" y="' + (end[1] - 4) + '" width="8" height="8"/>');
        } else {
          pts.push(faceCenter(lattice.byId[pr.b], g));
          out.push('<polyline class="lat-pair" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>');
        }
      });
    }

    // defect markers (shape + colour)
    if (showDefects && o.defects) {
      o.defects.forEach(function (id) {
        var p = faceCenter(lattice.byId[id], g);
        out.push('<g class="lat-defect" transform="translate(' + p[0] + ' ' + p[1] + ')" aria-hidden="true">' +
          '<path d="M0 -10 L10 0 L0 10 L-10 0Z"/><text y="4">!</text></g>');
      });
    }

    // qubits: everything for one qubit lives in a group centred on (0, 0)
    lattice.data.forEach(function (dq) {
      var P = o.errors ? S.pauliAt(o.errors, dq.q) : 'I';
      var F = o.correction ? S.pauliAt(o.correction, dq.q) : 'I';
      var desc = null;
      if (interactive) {
        desc = 'Data qubit row ' + (dq.r + 1) + ', column ' + (dq.c + 1);
        if (P !== 'I' && !o.hideErrors) desc += ', ' + P + ' error';
        if (F !== 'I') desc += ', ' + F + ' correction';
      }
      out.push(qubitSVG(g.X(dq.c), g.Y(dq.r), {
        err: o.hideErrors ? 'I' : P,
        fix: F,
        highlight: has(o.highlightQubits, dq.q),
        selected: has(o.selectedQubits, dq.q),
        hit: interactive ? { q: dq.q, label: desc } : null
      }));
    });

    out.push('</svg>');
    return out.join('');
  }

  /*
   * Mount a lattice host with delegated events.
   * handlers: { onQubit(q), onTile(id), paint: bool, onPaint(q, first) } — may be mutated later.
   */
  function mountLattice(host, handlers) {
    host.classList.add('lat-host');
    var painting = false, last = -1;

    function qOf(node) {
      var n = node && node.closest ? node.closest('[data-q]') : null;
      return n && host.contains(n) ? +n.getAttribute('data-q') : -1;
    }
    function stabOf(node) {
      var n = node && node.closest ? node.closest('[data-stab]') : null;
      return n && host.contains(n) ? n.getAttribute('data-stab') : null;
    }

    host.addEventListener('click', function (e) {
      var q = qOf(e.target);
      if (q >= 0) {
        if (!handlers.paint && handlers.onQubit) handlers.onQubit(q);
        return;
      }
      var id = stabOf(e.target);
      if (id && handlers.onTile) handlers.onTile(id);
    });
    host.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var q = qOf(e.target);
      if (q >= 0 && handlers.onQubit) { e.preventDefault(); handlers.onQubit(q); return; }
      var id = stabOf(e.target);
      if (id && handlers.onTile) { e.preventDefault(); handlers.onTile(id); }
    });
    host.addEventListener('pointerdown', function (e) {
      if (!handlers.paint) return;
      var q = qOf(e.target);
      if (q < 0) return;
      e.preventDefault();
      painting = true;
      last = q;
      handlers.onPaint(q, true);
    });
    host.addEventListener('pointermove', function (e) {
      if (!painting) return;
      var q = qOf(document.elementFromPoint(e.clientX, e.clientY));
      if (q >= 0 && q !== last) { last = q; handlers.onPaint(q, false); }
    });
    function stop() { painting = false; last = -1; }
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);

    return {
      update: function (svg) {
        // keep keyboard focus on the same qubit/tile across re-renders
        var a = document.activeElement, sel = null;
        if (a && host.contains(a)) {
          if (a.hasAttribute('data-q')) sel = '[data-q="' + a.getAttribute('data-q') + '"]';
          else if (a.hasAttribute('data-stab')) sel = '[data-stab="' + a.getAttribute('data-stab') + '"]';
        }
        host.innerHTML = svg;
        if (sel) {
          var n = host.querySelector(sel);
          if (n) n.focus({ preventScroll: true });
        }
      },
      setPaint: function (on) {
        handlers.paint = on;
        host.classList.toggle('paint', !!on);
      },
      destroy: function () {
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
      }
    };
  }

  function bindChips(root, fn) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-chip]');
      if (!b || b.disabled) return;
      fn(b.getAttribute('data-chip'), b.getAttribute('data-value'));
    });
  }

  function bindActions(root, actions) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-action]');
      if (!b || b.disabled) return;
      var f = actions[b.getAttribute('data-action')];
      if (f) f(b);
    });
  }

  function obsList(items) {
    return '<ul class="observations">' + items.map(function (it) {
      return '<li class="' + (it.seen ? 'seen' : '') + '"><span class="tick" aria-hidden="true">' + (it.seen ? '✓' : '') + '</span>' +
        '<span>' + (it.seen ? it.done || it.text : it.text) + '<span class="visually-hidden">' + (it.seen ? ' (done)' : ' (not yet)') + '</span></span></li>';
    }).join('') + '</ul>';
  }

  // ================================================================ cover

  function renderCover(page) {
    page.innerHTML = UI.moduleCover({
      bare: true,
      backHref: "#/", backLabel: "All modules",
      label: "Module 4 — Quantum Error Correction",
      title: "The Surface Code",
      sub: "How can a 2D grid of qubits correct errors that occur anywhere?",
      deks: [
        "In Module 2, the Shor code guarded one qubit with nine in a line — but its checks reach across the whole register.",
        "Real chips can only wire neighbours. What if every check were local: a small tile on a grid?",
      ],
      ctaHref: BASE + "/grid", ctaLabel: "Start Experimenting \u2192",
      meta: "\u2248 20 min \u00b7 " + LESSONS.length + " lessons",
      figure: "<div class='cover-hero' id='hero'></div>",
      lessons: LESSONS.map(function (l) { return { num: l.num, title: l.short, desc: l.q, href: BASE + l.path, hw: l.hw }; }),
    });

    var hero = page.querySelector('#hero');
    var L = S.buildLattice(5);
    var rng = S.makeRng(7);
    var timer = null;
    var phase = 0, errors = null, dec = null;
    var label = 'Animation: an error string appears on a distance-5 surface code, its two end tiles raise alarms, and a decoder matches them.';

    function draw(o) {
      hero.innerHTML = latticeSVG(L, Object.assign({ interactive: false, cls: 'muted', label: label }, o));
    }
    // Only show rounds the decoder wins: the hero is a calm illustration, not a quiz.
    function newErrors() {
      for (;;) {
        errors = G.generateErrors({ d: 5, gen: 'chain' }, rng);
        if (!S.syndrome(L, errors).defects.length) continue;
        dec = D.decode(L, errors);
        if (S.isStabilizerEquivalent(L, errors, dec.correction)) return;
      }
    }
    function step() {
      var syn = S.syndrome(L, errors);
      if (phase === 0) draw({ errors: errors, defects: syn.defects });
      else if (phase === 1) draw({ errors: errors, defects: syn.defects, pairs: dec.pairs });
      else if (phase === 2) draw({ defects: [] });
      phase = (phase + 1) % 3;
      if (phase === 0) newErrors();
      timer = setTimeout(step, phase === 1 ? 1800 : 1400);
    }
    newErrors();
    if (reducedMotion) draw({ errors: errors, defects: S.syndrome(L, errors).defects, pairs: dec.pairs });
    else step();

    return function () { clearTimeout(timer); };
  }

  // ===================================================== 01 · line → grid

  function lineSVG(bits) {
    var checks = S.repetitionChecks(bits);
    var xs = [60, 180, 300];
    var out = ['<svg class="line-svg" viewBox="0 0 360 150" role="group" aria-label="Three-qubit repetition code with two parity checks">'];
    out.push('<line class="rep-wire" x1="60" y1="96" x2="300" y2="96"/>');
    [0, 1].forEach(function (k) {
      var cx = (xs[k] + xs[k + 1]) / 2;
      out.push('<rect class="rep-check' + (checks[k] ? ' defect' : '') + '" x="' + (cx - 34) + '" y="22" width="68" height="34" rx="8"/>');
      out.push('<text class="rep-label" x="' + cx + '" y="44">Z<tspan baseline-shift="sub" font-size="10">' + (k + 1) + '</tspan>Z<tspan baseline-shift="sub" font-size="10">' + (k + 2) + '</tspan></text>');
      out.push('<line class="rep-wire" x1="' + (cx - 20) + '" y1="56" x2="' + xs[k] + '" y2="84"/>');
      out.push('<line class="rep-wire" x1="' + (cx + 20) + '" y1="56" x2="' + xs[k + 1] + '" y2="84"/>');
      if (checks[k]) {
        out.push('<g class="lat-defect" transform="translate(' + (cx + 34) + ' 22)"><path d="M0 -10 L10 0 L0 10 L-10 0Z"/><text y="4">!</text></g>');
      }
    });
    xs.forEach(function (x, k) {
      out.push('<text class="rep-label" x="' + x + '" y="136">q<tspan baseline-shift="sub" font-size="10">' + (k + 1) + '</tspan></text>');
      out.push(qubitSVG(x, 96, { err: bits[k] ? 'X' : 'I', fix: 'I', hit: { q: k, label: 'Qubit ' + (k + 1) + (bits[k] ? ', X error' : '') } }));
    });
    out.push('</svg>');
    return out.join('');
  }

  function renderGrid(page) {
    var st = { view: 'grid', d: 3, errors: S.emptyFrame(3), line: [0, 0, 0] };

    page.innerHTML =
      pageHead('01', 'From a line to a grid', 'What if the repetition code grew in two directions?',
        'The repetition code compares neighbours in a line. Let the line become a row — and stack rows into a grid.') +
      '<div class="grid-two">' +
      '<div class="sticky-col panel">' +
      chipGroup('view', 'View', [{ value: 'line', label: 'Line' }, { value: 'grid', label: 'Grid' }], st.view) +
      '<div id="g-host" style="margin-top:12px"></div>' +
      '<div id="g-legend"></div>' +
      '</div>' +
      '<div class="stack">' +
      '<div class="panel"><h3>Grow the grid</h3>' + distanceChips(st.d) +
      '<div class="counters" id="g-counters"></div>' +
      '<p class="small">The distance <span class="m">d</span> is the side of the grid.</p></div>' +
      '<div class="panel" id="g-obs" aria-live="polite"></div>' +
      '<div class="keyidea">Every check only touches neighbours — exactly what a real chip can wire.</div>' +
      '</div>' +
      '</div>' +
      '<section class="math-section">' +
      '<h2>Counting the grid</h2>' +
      '<p>A <span class="m">d</span> × <span class="m">d</span> grid has <span class="m">n = d²</span> data qubits and <span class="m">d² − 1</span> independent tile checks. ' +
      'Each check splits the space of states in half and keeps one half, so what is left is</p>' +
      '<div class="eq"><span class="frac"><span>2<sup>d²</sup></span><span>2<sup>d² − 1</sup></span></span> = 2   ⇒   <span class="up">one logical qubit</span><span class="note">A two-dimensional space is exactly one qubit.</span></div>' +
      '<details class="expand"><summary>Why must checks be local?</summary><div>' +
      '<p>On superconducting chips each qubit is wired to its nearest neighbours only. A check that compares qubits far apart needs long chains of gates, and every gate adds new errors. ' +
      'The surface code needs only 4-qubit checks between neighbours, and its tiles all overlap in a regular pattern — which is why it is the leading design for real hardware.</p>' +
      '</div></details>' +
      '</section>' +
      transitionBlock('Every tile checks its corners. But which tiles notice which errors?', '/stabilizers', 'Meet the tiles');

    var host = page.querySelector('#g-host');
    var lat = mountLattice(host, {
      onQubit: function (q) {
        if (st.view === 'line') st.line[q] ^= 1;
        else st.errors = S.applyPauli(st.errors, q, 'X');
        draw(false);
      }
    });

    function draw(anim) {
      var L = S.buildLattice(st.d);
      var obs = page.querySelector('#g-obs');
      if (st.view === 'line') {
        lat.update(lineSVG(st.line));
        page.querySelector('#g-legend').innerHTML = legend(['z', 'alarm', 'err']);
        var ch = S.repetitionChecks(st.line);
        obs.innerHTML = '<h3>Module 2, revisited</h3>' +
          '<p>Click a qubit to flip it (an <span class="m">X</span> error). Each check compares two neighbours and raises an alarm when they disagree.</p>' +
          '<p class="small">Checks: <span class="m">Z<sub>1</sub>Z<sub>2</sub></span> = ' + (ch[0] ? '−1 (alarm)' : '+1') +
          ', <span class="m">Z<sub>2</sub>Z<sub>3</sub></span> = ' + (ch[1] ? '−1 (alarm)' : '+1') + '</p>' +
          '<p>Now switch to <strong>Grid</strong>.</p>';
      } else {
        var mid = (st.d - 1) / 2;
        var row = [];
        for (var c = 0; c < st.d; c++) row.push(mid * st.d + c);
        var syn = S.syndrome(L, st.errors);
        lat.update(latticeSVG(L, {
          errors: st.errors,
          defects: syn.defects,
          highlightTiles: S.rowChecks(L, mid),
          highlightQubits: row,
          cls: anim ? 'fade-in' : '',
          label: 'Surface code, distance ' + st.d + '. The middle row is highlighted; ' + syn.defects.length + ' tiles raise an alarm.'
        }));
        page.querySelector('#g-legend').innerHTML = legend(['x', 'z', 'alarm', 'err', 'hl']);
        obs.innerHTML = '<h3>One row = one repetition code</h3>' +
          '<p>Along the highlighted row, each pair of neighbours shares a Z-tile (outlined in yellow) that compares them — like <span class="m">Z<sub>1</sub>Z<sub>2</sub></span> and <span class="m">Z<sub>2</sub>Z<sub>3</sub></span> in the line.</p>' +
          '<p>Click qubits to flip them. ' + (syn.defects.length ? '<strong>' + plural(syn.defects.length, 'tile') + '</strong> raised an alarm.' : 'No alarms yet.') + '</p>' +
          '<p class="small">But a grid has more: the other tiles check the other kind of error. That is lesson 02.</p>';
      }
      var n = st.d * st.d;
      page.querySelector('#g-counters').innerHTML =
        '<div class="counter"><b>' + n + '</b><span>data qubits <span class="m">d²</span></span></div>' +
        '<div class="counter"><b>' + (n - 1) + '</b><span>tile checks <span class="m">d² − 1</span></span></div>' +
        '<div class="counter"><b>1</b><span>logical qubit</span></div>' +
        '<div class="counter"><b>' + S.correctable(st.d) + '</b><span>errors always fixed <span class="m">⌊(d−1)/2⌋</span></span></div>';
    }

    bindChips(page, function (name, value) {
      if (name === 'view') { st.view = value; setPressed(page, 'view', value); draw(true); }
      if (name === 'd') {
        st.d = +value; st.errors = S.emptyFrame(st.d); st.view = 'grid';
        setPressed(page, 'd', value); setPressed(page, 'view', 'grid'); draw(true);
      }
    });
    draw(false);
    return function () { lat.destroy(); };
  }

  // =================================================== 02 · stabilizers

  function renderStabilizers(page) {
    var L = S.buildLattice(3);
    var st = { errors: S.emptyFrame(3), tool: 'X', seen: { x: false, z: false, y: false, cancel: false }, note: null };

    page.innerHTML =
      pageHead('02', 'Stabilizers as tiles', 'Which tiles notice which errors?',
        'Each tile multiplies Pauli checks on its corners. Place errors and watch which tiles raise an alarm.') +
      '<div class="grid-two">' +
      '<div class="sticky-col panel"><div id="s-host"></div>' + legend(['x', 'z', 'alarm', 'err']) +
      '<h3 style="margin-top:14px">Syndrome</h3><div id="s-syn"></div></div>' +
      '<div class="stack">' +
      '<div class="panel"><h3>Tool</h3>' +
      chipGroup('tool', 'Error to place', [
        { value: 'X', label: '<span class="m">X</span> error' },
        { value: 'Y', label: '<span class="m">Y</span> error' },
        { value: 'Z', label: '<span class="m">Z</span> error' },
        { value: 'I', label: 'Erase' }
      ], st.tool) +
      '<p class="small" style="margin-top:8px">Click (or press Enter on) a qubit to toggle the chosen error.</p>' +
      '<div class="btn-row"><button class="btn" type="button" data-action="clear">Clear errors</button></div>' +
      '<div id="s-note" aria-live="polite"></div></div>' +
      '<div class="panel"><h3>What did you notice?</h3><div id="s-obs"></div></div>' +
      '</div></div>' +
      '<section class="math-section" id="s-math"></section>' +
      transitionBlock('One error lights up to two tiles. What happens when errors line up?', '/strings', 'Draw error strings');

    var lat = mountLattice(page.querySelector('#s-host'), {
      onQubit: function (q) {
        var before = S.pauliAt(st.errors, q);
        if (st.tool === 'I') {
          st.errors = S.setPauli(st.errors, q, 'I');
          st.note = before === 'I' ? null : { cls: 'ok', title: 'Error removed.', text: '' };
        } else {
          st.errors = before === st.tool ? S.setPauli(st.errors, q, 'I') : S.setPauli(st.errors, q, st.tool);
          if (before !== st.tool) observe(q, st.tool);
          else st.note = null;
        }
        draw();
      }
    });

    function observe(q, P) {
      var single = S.syndrome(L, S.applyPauli(S.emptyFrame(3), q, P)).defects;
      var syn = S.syndrome(L, st.errors);
      var cancel = L.stabilizers.filter(function (s) { return syn.counts[s.id] >= 2 && syn.counts[s.id] % 2 === 0; });
      if (cancel.length) {
        st.seen.cancel = true;
        st.note = { cls: 'ok', title: 'They cancel.', text: 'A tile sees two errors: its parity is even, so it reads +1 and stays silent.' };
        return;
      }
      if (P === 'X') {
        st.seen.x = true;
        st.note = { cls: 'ok', title: 'Only Z-tiles lit up (' + single.length + ').', text: 'Z-tiles are the ones that check for X errors.' };
      } else if (P === 'Z') {
        st.seen.z = true;
        st.note = { cls: 'ok', title: 'Only X-tiles lit up (' + single.length + ').', text: 'X-tiles check for Z errors.' };
      } else {
        st.seen.y = true;
        st.note = { cls: 'ok', title: 'Both kinds lit up (' + single.length + ').', text: 'A Y error is an X and a Z at once (Y = iXZ).' };
      }
    }

    function draw() {
      var syn = S.syndrome(L, st.errors);
      lat.update(latticeSVG(L, {
        errors: st.errors,
        defects: syn.defects,
        label: 'Distance-3 surface code with ' + S.weight(st.errors) + ' errors and ' + syn.defects.length + ' alarms'
      }));
      page.querySelector('#s-syn').innerHTML = synStrip(L, syn);
      page.querySelector('#s-note').innerHTML = st.note
        ? '<div class="feedback ' + st.note.cls + ' fade-in"><strong>' + st.note.title + '</strong>' + st.note.text + '</div>' : '';
      page.querySelector('#s-obs').innerHTML = obsList([
        { seen: st.seen.x, text: 'Place an X error.', done: 'An X error lights only Z-tiles.' },
        { seen: st.seen.z, text: 'Place a Z error.', done: 'A Z error lights only X-tiles.' },
        { seen: st.seen.y, text: 'Place a Y error.', done: 'A Y error lights both kinds.' },
        { seen: st.seen.cancel, text: 'Put two X errors on the same Z-tile.', done: 'Two errors on one tile cancel there.' }
      ]);
      var any = st.seen.x || st.seen.z || st.seen.y;
      var math = page.querySelector('#s-math');
      if (any && !math.dataset.open) {
        math.dataset.open = '1';
        math.classList.add('fade-in');
        math.innerHTML =
          '<h2>What a tile measures</h2>' +
          '<p>Each tile is a <em>stabilizer</em>: a product of Paulis on its corners. A Z-tile is</p>' +
          '<div class="eq">S<sub>Z</sub> = Z<sub>a</sub> Z<sub>b</sub> Z<sub>c</sub> Z<sub>d</sub>,   S<sub>Z</sub> |ψ⟩ = +|ψ⟩' +
          '<span class="note">Every code state reads +1 on every tile.</span></div>' +
          '<p>An <span class="m">X</span> on one corner anticommutes with that corner\'s <span class="m">Z</span>, so it flips the sign:</p>' +
          '<div class="eq">S<sub>Z</sub> (X<sub>a</sub>|ψ⟩) = −X<sub>a</sub> S<sub>Z</sub>|ψ⟩ = −(X<sub>a</sub>|ψ⟩)' +
          '<span class="note">The tile now reads −1: an alarm. The encoded information itself is never measured.</span></div>' +
          '<details class="expand"><summary>Why all tiles commute</summary><div>' +
          '<p>An X-tile and a Z-tile share either 0 or 2 qubits. Each shared qubit contributes a sign, since <span class="m">XZ = −ZX</span>; two shared qubits give <span class="m">(−1)² = +1</span>. ' +
          'So every tile can be measured at the same time without disturbing the others.</p></div></details>';
      } else if (!any && !math.dataset.open) {
        math.classList.add('locked');
        math.innerHTML = '<h2>What a tile measures</h2><p class="small">Place your first error — the maths behind it will appear here.</p>';
      }
      if (any) math.classList.remove('locked');
    }

    bindChips(page, function (name, value) {
      if (name === 'tool') { st.tool = value; setPressed(page, 'tool', value); }
    });
    bindActions(page, { clear: function () { st.errors = S.emptyFrame(3); st.note = null; draw(); } });
    draw();
    return function () { lat.destroy(); };
  }

  // ======================================================== 03 · strings

  function renderStrings(page) {
    var d = 5, L = S.buildLattice(d);
    var st = { errors: S.emptyFrame(d), saved: null, savedDefects: null, done: { a: false, b: false, c: false }, note: null, paintMode: 'add', exKind: 'mid' };

    page.innerHTML =
      pageHead('03', 'Errors are strings, syndromes are endpoints', 'Why do only the ends of an error light up?',
        'Drag across neighbouring qubits to paint a string of X errors. On touch screens, tap qubits one by one.') +
      '<div class="grid-two">' +
      '<div class="sticky-col panel"><div id="t-host"></div>' + legend(['z', 'alarm', 'err', 'hl']) +
      '<p class="small" style="margin-top:6px">“×2 ✓” marks a tile that sees two errors: it checked twice, so it stays silent.</p></div>' +
      '<div class="stack">' +
      '<div class="panel"><h3>Your string</h3><div id="t-status" aria-live="polite"></div>' +
      '<div class="btn-row"><button class="btn" type="button" data-action="clear">Clear</button>' +
      '<button class="btn" type="button" data-action="save">Remember this string</button></div>' +
      '<div id="t-note" aria-live="polite"></div></div>' +
      '<div class="panel"><h3>Mini-challenges</h3><div id="t-obs"></div></div>' +
      '<div class="keyidea">The syndrome tells you where strings end, not where they went.</div>' +
      '</div></div>' +
      '<section class="math-section">' +
      '<h2>The syndrome is a boundary</h2>' +
      '<p>For X errors, the syndrome is the parity of errors seen by each Z-tile. Writing the errors as a bit vector <span class="m">e</span> and the tile checks as a matrix <span class="m">H</span>:</p>' +
      '<div class="eq"><i>s</i> = <i>H</i> <i>e</i>  <span class="up">(mod 2)</span>' +
      '<span class="note">Bits and signs say the same thing: <i>s</i> = 0 ↔ the tile reads +1, <i>s</i> = 1 ↔ it reads −1. ' +
      'A middle tile sees two errors: 1 + 1 = 0 (mod 2), or (−1)² = +1. Only the ends are left with an odd count.</span></div>' +
      '<p>Each tile simply counts how many of its qubits have an error. Odd → alarm. Even → silence.</p>' +
      '<dl class="sym-legend">' +
      '<dt><i>e</i></dt><dd><strong>the error list:</strong> one bit per data qubit. 1 = this qubit has an X error, 0 = it doesn\'t.</dd>' +
      '<dt><i>H</i></dt><dd><strong>the check table:</strong> one row per Z-tile. A row has a 1 under each qubit that tile touches (4 in the bulk, 2 on the edge).</dd>' +
      '<dt><i>s</i></dt><dd><strong>the syndrome:</strong> one bit per tile. 1 = alarm (the tile reads −1), 0 = quiet (+1).</dd>' +
      '<dt class="up">mod 2</dt><dd>only odd vs. even matters: 1 + 1 = 0.</dd>' +
      '</dl>' +
      '<div class="tile-sum" id="t-example" aria-live="polite"></div>' +
      '<details class="expand"><summary>Degeneracy: different errors, same effect</summary><div>' +
      '<p>If two error strings <span class="m">E</span> and <span class="m">E′</span> differ by a closed loop — a product of tiles <span class="m">S</span> — then <span class="m">E′ = E S</span> and</p>' +
      '<div class="eq">E′|ψ⟩ = E S|ψ⟩ = E|ψ⟩</div>' +
      '<p>Same alarms, same damage. A decoder does not need the exact path, only the right <em>family</em> of paths.</p></div></details>' +
      '</section>' +
      transitionBlock('Alarms show where strings end, never where they went. Can you still fix them?', '/decoder', 'Play the decoder');

    var lat = mountLattice(page.querySelector('#t-host'), {
      paint: true,
      onQubit: function (q) { st.errors = S.applyPauli(st.errors, q, 'X'); afterEdit(); },
      onPaint: function (q, first) {
        if (first) st.paintMode = st.errors.x[q] ? 'erase' : 'add';
        st.errors = S.setPauli(st.errors, q, st.paintMode === 'add' ? 'X' : 'I');
        afterEdit();
      }
    });
    lat.setPaint(true);

    // Worked example: prefer a "checked twice" middle tile, else a lit end tile.
    function exampleTile(silent, lit) {
      var kind = st.exKind;
      if (kind === 'mid' && !silent.length) kind = 'end';
      if (kind === 'end' && !lit.length) kind = 'mid';
      var id = kind === 'mid' ? silent[0] : lit[0];
      return { id: id || null, kind: kind };
    }

    function drawExample(ex, both) {
      var box = page.querySelector('#t-example');
      var head = '<p class="tile-sum-head">Worked example · live</p>';
      if (!ex.id) {
        box.innerHTML = head + '<p class="small">Paint a string to see a tile do the sum.</p>';
        return;
      }
      var tc = S.tileCount(L, st.errors, ex.id);
      // list qubits with an error first (qubits and bits stay paired)
      var order = tc.qubits.map(function (q, k) { return k; })
        .sort(function (i, j) { return tc.bits[j] - tc.bits[i] || i - j; });
      var qs = order.map(function (k) {
        var q = tc.qubits[k];
        return 'q<sub>' + (Math.floor(q / d) + 1) + ',' + (q % d + 1) + '</sub>';
      }).join(' ');
      var bits = order.map(function (k) {
        var b = tc.bits[k];
        return '<span class="ts-bit' + (b ? ' on' : '') + '">' + b + '</span>';
      }).join(' + ');
      var out = tc.parity
        ? '<span class="ts-out alarm">! alarm</span>'
        : '<span class="ts-out quiet">✓ quiet</span>';
      box.innerHTML = head +
        (both ? chipGroup('ex', 'Example tile', [{ value: 'mid', label: 'Middle tile' }, { value: 'end', label: 'End tile' }], ex.kind) : '') +
        '<p class="tile-sum-row"><strong>' + (ex.kind === 'mid' ? 'Middle' : 'End') + ' Z-tile</strong> (outlined in yellow): touches ' + qs +
        ' → errors ' + bits + ' = ' + tc.sum + ' → <span class="m ts-math">' + tc.sum + ' mod 2 = ' + tc.parity + '</span> → ' + out + '</p>';
    }

    function sameSet(a, b) {
      return a.length === b.length && a.every(function (x) { return b.indexOf(x) >= 0; });
    }

    function afterEdit() {
      var syn = S.syndrome(L, st.errors);
      var w = S.weight(st.errors);
      st.note = null;
      if (syn.defects.length === 2 && D.distance(L, syn.defects[0], syn.defects[1]) >= 3) {
        if (!st.done.a) st.note = { cls: 'ok', title: 'Two alarms, far apart.', text: 'A long string, but only its two ends light up.' };
        st.done.a = true;
      }
      if (w > 0 && syn.defects.length === 0) {
        var ls = S.logicalStatus(L, st.errors);
        if (ls.xFlip) {
          st.note = { cls: 'warn', title: 'Silent — but not a loop.', text: 'This string runs from edge to edge. It lights nothing, yet it is not harmless. Hold that thought until lesson 05.' };
        } else {
          if (!st.done.b) st.note = { cls: 'ok', title: 'A closed loop: zero alarms.', text: 'Every tile sees an even number of errors. A loop is a product of tiles — a stabilizer — so it does nothing to the encoded qubit.' };
          st.done.b = true;
        }
      }
      if (st.saved && syn.defects.length && sameSet(syn.defects, st.savedDefects)) {
        var differs = S.weight(S.compose(st.saved, st.errors)) > 0;
        if (differs) {
          st.done.c = true;
          st.note = S.isStabilizerEquivalent(L, st.saved, st.errors)
            ? { cls: 'ok', title: 'Same endpoints, different string.', text: 'The alarms cannot tell them apart — and they don\'t need to: the two strings differ by a loop. This is degeneracy.' }
            : { cls: 'warn', title: 'Same endpoints, different string…', text: 'but these two differ by a string that crosses the grid. A decoder seeing these alarms must guess between them.' };
        }
      }
      draw();
    }

    function draw() {
      var syn = S.syndrome(L, st.errors);
      var silent = L.stabilizers.filter(function (s) {
        return s.type === 'Z' && syn.counts[s.id] > 0 && syn.counts[s.id] % 2 === 0;
      }).map(function (s) { return s.id; });
      var ex = exampleTile(silent, syn.defects);
      lat.update(latticeSVG(L, {
        errors: st.errors,
        defects: syn.defects,
        silentTiles: silent,
        highlightTiles: (st.savedDefects || []).concat(ex.id ? [ex.id] : []),
        highlightQubits: ex.id ? S.tileCount(L, st.errors, ex.id).qubits : null,
        dimTiles: L.stabilizers.filter(function (s) { return s.type === 'X'; }).map(function (s) { return s.id; }),
        label: 'Distance-5 surface code with an X error string of ' + S.weight(st.errors) + ' qubits and ' + syn.defects.length + ' alarms'
      }));
      page.querySelector('#t-status').innerHTML =
        '<dl class="status-grid"><dt>Errors</dt><dd>' + S.weight(st.errors) + '</dd><dt>Lit tiles</dt><dd>' + syn.defects.length + '</dd>' +
        '<dt>Silent “checked twice”</dt><dd>' + silent.length + '</dd></dl>' +
        (st.saved ? '<p class="small">String A is saved: its alarms are outlined in yellow. Draw a <em>different</em> string with the same endpoints.</p>' : '');
      page.querySelector('#t-note').innerHTML = st.note
        ? '<div class="feedback ' + st.note.cls + ' fade-in"><strong>' + st.note.title + '</strong>' + st.note.text + '</div>' : '';
      page.querySelector('[data-action="save"]').disabled = syn.defects.length === 0;
      drawExample(ex, silent.length > 0 && syn.defects.length > 0);
      page.querySelector('#t-obs').innerHTML = obsList([
        { seen: st.done.a, text: '(a) Make an error that lights exactly 2 tiles far apart.', done: '(a) Long string, two alarms: only the ends light up.' },
        { seen: st.done.b, text: '(b) Make a closed loop. How many tiles light?', done: '(b) A loop lights 0 tiles: it is a stabilizer, harmless.' },
        { seen: st.done.c, text: '(c) Remember a string, then draw a different one with the same endpoints.', done: '(c) Same alarms from different strings: degeneracy.' }
      ]);
    }

    bindActions(page, {
      clear: function () { st.errors = S.emptyFrame(d); st.note = null; draw(); },
      save: function () {
        st.saved = S.copyFrame(st.errors);
        st.savedDefects = S.syndrome(L, st.errors).defects;
        st.errors = S.emptyFrame(d);
        st.note = { cls: 'ok', title: 'String A remembered.', text: 'Its alarms are outlined. Now draw a different string that ends on the same tiles.' };
        draw();
      }
    });
    bindChips(page, function (name, value) {
      if (name === 'ex') { st.exKind = value; draw(); }
    });
    draw();
    return function () { lat.destroy(); };
  }

  // ====================================================== 04 · decoder game

  function renderDecoder(page) {
    var state = G.initGame({});
    var showComputer = false;

    page.innerHTML =
      pageHead('04', 'Be the decoder', 'Can you fix errors you cannot see?',
        'Errors are hidden. You only see the alarms. Build a correction that silences them all — then see whether you saved the qubit.') +
      '<div class="grid-two">' +
      '<div class="sticky-col panel"><div id="d-host"></div>' + legend(['x', 'z', 'alarm', 'fix', 'pair', 'err']) + '</div>' +
      '<div class="stack">' +
      '<div class="panel"><h3>Level</h3>' +
      chipGroup('level', 'Level', G.LEVELS.map(function (lv, k) { return { value: k, label: (k + 1) + ' · ' + lv.name }; }), state.levelIndex) +
      '<p class="small" id="d-hint" style="margin-top:8px"></p>' +
      '<p class="score" id="d-score"></p></div>' +
      '<div class="panel" id="d-play"></div>' +
      '</div></div>' +
      '<section class="math-section">' +
      '<h2>Decoding is matching</h2>' +
      '<p>Each alarm is the end of an error string. If errors are rare, short strings are more likely than long ones, so the best guess pairs the alarms — or sends one to a matching edge — with the smallest total length:</p>' +
      '<div class="eq">min <span class="up">over pairings</span>  Σ<sub>(a,b)</sub> dist(a, b)' +
      '<span class="note">Minimum-weight perfect matching (MWPM). X-alarms and Z-alarms are matched separately.</span></div>' +
      '<details class="expand"><summary>How the computer finds the best pairing</summary><div>' +
      '<p>It builds a graph whose nodes are the tiles of one kind plus a virtual “edge” node, and whose links are the data qubits. Shortest distances come from a breadth-first search. ' +
      'With up to 14 alarms of one kind it tries every pairing exactly (dynamic programming over subsets); with more, it falls back to a greedy “closest pair first” rule.</p></div></details>' +
      '<details class="expand"><summary>Why you can win without finding the real errors</summary><div>' +
      '<p>If your correction and the real errors together form a closed loop, that loop is a product of tiles — it acts as the identity on the code. Only a string that crosses from one edge to the opposite one does damage.</p></div></details>' +
      '</section>' +
      transitionBlock('Two errors on a d = 3 grid can fool everyone. How many does it take to fool the code on purpose?', '/logical', 'Fool the code');

    var lat = mountLattice(page.querySelector('#d-host'), {
      onQubit: function (q) { dispatch({ type: 'toggle', q: q }); },
      onTile: function (id) { dispatch({ type: 'select', stab: id }); }
    });

    function dispatch(action) {
      state = G.reduce(state, action);
      draw();
    }

    var OUTCOME = {
      corrected: { cls: 'ok', icon: '✅', text: 'Your correction undid exactly the errors that happened.' },
      loop: { cls: 'ok', icon: '✅', text: 'Your correction is not the real error, but together they form a closed loop (highlighted) — a stabilizer. The logical qubit is untouched.' },
      logical: { cls: 'no', icon: '❌', text: 'Errors plus correction form a string from one edge to the other (highlighted). It lights no alarm, but it flips the logical qubit.' }
    };

    function draw() {
      var v = G.view(state);
      var L = v.lattice;
      var revealed = state.phase === 'revealed';
      lat.update(latticeSVG(L, revealed ? {
        errors: state.errors,
        correction: state.correction,
        defects: [],
        highlightQubits: v.residualQubits,
        pairs: showComputer && state.computer ? state.computer.pairs : null,
        label: 'Revealed: errors, your correction and the outcome'
      } : {
        errors: state.errors,
        hideErrors: true,
        correction: state.correction,
        defects: v.remainingDefects,
        clickTiles: v.remainingDefects,
        selected: state.selected,
        pairs: showComputer && state.computer ? state.computer.pairs : null,
        label: 'Hidden errors. ' + v.remainingDefects.length + ' alarms are on.'
      }));

      page.querySelector('#d-hint').textContent = v.level.hint + ' (d = ' + v.level.d + ')';
      page.querySelector('#d-score').innerHTML = 'Solved <b>' + state.score.solved + '</b> / ' + state.score.rounds + ' rounds';

      var html = '';
      if (!revealed) {
        html += '<h3>Your correction</h3>' +
          '<p class="small">Click a qubit to place a fix. Or click two alarms of the same kind to join them with the shortest string, or one alarm and then “Send to edge”.</p>' +
          chipGroup('tool', 'Correction type', [
            { value: 'X', label: '<span class="m">X</span> fix <span class="small">(silences Z-tiles)</span>' },
            { value: 'Z', label: '<span class="m">Z</span> fix <span class="small">(silences X-tiles)</span>' }
          ], state.tool) +
          '<dl class="status-grid" style="margin-top:10px"><dt>Alarms still on</dt><dd>' + v.remainingDefects.length + '</dd>' +
          '<dt>Fixes placed</dt><dd>' + v.correctionWeight + '</dd></dl>' +
          (state.selected ? '<p class="notice">Alarm selected. Click another alarm of the same kind, or send it to the nearest matching edge.</p>' : '') +
          (state.message ? '<div class="feedback warn fade-in"><strong>' + (state.outcome && state.outcome.kind === 'uncleared' ? '⚠️ ' + G.OUTCOME_TEXT.uncleared : 'Not that way') + '</strong>' + esc(state.message) + '</div>' : '') +
          '<div class="btn-row">' +
          '<button class="btn" type="button" data-action="boundary"' + (state.selected ? '' : ' disabled') + '>Send to edge</button>' +
          '<button class="btn" type="button" data-action="clear"' + (v.correctionWeight ? '' : ' disabled') + '>Clear fixes</button>' +
          '<button class="btn" type="button" data-action="ask">' + (showComputer ? 'Hide' : 'Ask') + ' the computer</button>' +
          (showComputer ? '<button class="btn" type="button" data-action="adopt">Use its answer</button>' : '') +
          '</div>' +
          (showComputer ? '<p class="small">Dashed lines: the computer\'s minimum-weight matching (' + state.computer.algorithm + ').</p>' : '') +
          '<div class="btn-row"><button class="btn primary" type="button" data-action="apply">Apply correction</button></div>';
      } else {
        var o = OUTCOME[state.outcome.kind];
        html += '<h3>Outcome</h3>' +
          '<div class="feedback ' + o.cls + ' fade-in" role="status"><strong>' + o.icon + ' ' + G.OUTCOME_TEXT[state.outcome.kind] + '</strong>' + o.text + '</div>' +
          '<p class="small">Dark badges: the real errors. Purple badges: your correction. ' +
          'The computer\'s matching would have given: <strong>' + G.OUTCOME_TEXT[state.outcome.computerKind] + '</strong>.</p>' +
          (state.outcome.kind === 'logical' && state.outcome.computerKind === 'logical'
            ? '<p class="small">Even the optimal guess failed here: with this many errors, the most likely explanation was the wrong one.</p>' : '') +
          '<div class="btn-row"><button class="btn" type="button" data-action="ask">' + (showComputer ? 'Hide' : 'Show') + ' computer\'s matching</button>' +
          '<button class="btn primary" type="button" data-action="next">Next round &rarr;</button></div>';
      }
      page.querySelector('#d-play').innerHTML = html;
    }

    bindChips(page, function (name, value) {
      if (name === 'level') { setPressed(page, 'level', value); showComputer = false; dispatch({ type: 'setLevel', level: +value }); }
      if (name === 'tool') dispatch({ type: 'setTool', tool: value });
    });
    bindActions(page, {
      boundary: function () { dispatch({ type: 'toBoundary' }); },
      clear: function () { dispatch({ type: 'clear' }); },
      ask: function () {
        showComputer = !showComputer;
        if (showComputer && !state.computer) dispatch({ type: 'askComputer' });
        else draw();
      },
      adopt: function () { dispatch({ type: 'adoptComputer' }); },
      apply: function () { dispatch({ type: 'apply' }); },
      next: function () { showComputer = false; dispatch({ type: 'newRound' }); }
    });
    draw();
    return function () { lat.destroy(); };
  }

  // =================================================== 05 · logical qubit

  function renderLogical(page) {
    var st = { d: 3, errors: S.emptyFrame(3), tool: 'X', reveal: false, best: {} };

    page.innerHTML =
      pageHead('05', 'The logical qubit', 'How many errors does it take to fool the code?',
        'Challenge: flip the logical qubit without lighting a single alarm — using as few errors as possible.') +
      '<div class="grid-two">' +
      '<div class="sticky-col panel"><div id="l-host"></div>' + legend(['x', 'z', 'alarm', 'err', 'hl']) + '</div>' +
      '<div class="stack">' +
      '<div class="panel"><h3>Your attack</h3>' +
      '<div class="ctrl-row">' + distanceChips(st.d) + '</div>' +
      chipGroup('tool', 'Error to place', [
        { value: 'X', label: '<span class="m">X</span> error' },
        { value: 'Z', label: '<span class="m">Z</span> error' }
      ], st.tool) +
      '<div class="counters" id="l-counters" style="grid-template-columns:repeat(2,minmax(0,1fr))"></div>' +
      '<div id="l-note" aria-live="polite"></div>' +
      '<div class="btn-row"><button class="btn" type="button" data-action="clear">Clear</button>' +
      '<button class="btn" type="button" data-action="reveal" id="l-reveal"></button></div>' +
      '</div>' +
      '<div class="panel" id="l-explain" hidden></div>' +
      '</div></div>' +
      '<section class="math-section">' +
      '<h2>Distance</h2>' +
      '<p>The <em>code distance</em> <span class="m">d</span> is the weight of the smallest silent error that flips the logical qubit. ' +
      'Any error with fewer than <span class="m">d/2</span> flips sits closer to “no error” than to a logical flip, so matching undoes it:</p>' +
      '<div class="eq">[[ n, k, d ]] = [[ d², 1, d ]],    t = ⌊(d − 1)/2⌋' +
      '<span class="note">n data qubits, k logical qubits, distance d; t errors are always corrected.</span></div>' +
      '<details class="expand"><summary>Why <span class="ov">X</span> and <span class="ov">Z</span> make a qubit</summary><div>' +
      '<p>The column <span class="m"><span class="ov">X</span></span> and the row <span class="m"><span class="ov">Z</span></span> cross on exactly one qubit. There a single <span class="m">X</span> meets a single <span class="m">Z</span>, and <span class="m">XZ = −ZX</span>. Everywhere else they don\'t touch. So, for the whole strings:</p>' +
      '<div class="eq"><span class="ov">X</span> <span class="ov">Z</span> = −<span class="ov">Z</span> <span class="ov">X</span></div>' +
      '<p>— the same algebra as the Pauli <span class="m">X</span> and <span class="m">Z</span> of a single qubit. This is what makes it a qubit rather than a classical bit: no state can have a definite value for both, so it can hold superpositions. ' +
      'Both commute with every tile, so they act on the encoded qubit without raising alarms — and measuring the tiles never reveals the logical value.</p></div></details>' +
      '</section>' +
      transitionBlock('A bigger grid needs more errors to fool it. So does bigger always win?', '/threshold', 'Find the threshold');

    var lat = mountLattice(page.querySelector('#l-host'), {
      onQubit: function (q) { st.errors = S.applyPauli(st.errors, q, st.tool); draw(); }
    });

    function draw() {
      var L = S.buildLattice(st.d);
      var syn = S.syndrome(L, st.errors);
      var w = S.weight(st.errors);
      var ls = S.logicalStatus(L, st.errors);
      var success = w > 0 && syn.defects.length === 0 && (ls.xFlip || ls.zFlip);
      if (success) st.best[st.d] = Math.min(st.best[st.d] || Infinity, w);

      lat.update(latticeSVG(L, {
        errors: st.errors,
        defects: syn.defects,
        logicalLines: st.reveal,
        edgeLabels: st.reveal,
        label: 'Distance-' + st.d + ' code with ' + w + ' errors and ' + syn.defects.length + ' alarms'
      }));
      page.querySelector('#l-counters').innerHTML =
        '<div class="counter"><b>' + w + '</b><span>errors used</span></div>' +
        '<div class="counter"><b>' + syn.defects.length + '</b><span>alarms on</span></div>';

      var note;
      if (w === 0) note = '<p class="notice">Place errors. Goal: change the logical qubit while every tile still reads +1.</p>';
      else if (syn.defects.length) note = '<div class="feedback warn"><strong>' + plural(syn.defects.length, 'alarm') + ' ringing.</strong>The code would notice this. Try extending your string until its ends reach an edge.</div>';
      else if (!success) note = '<div class="feedback warn"><strong>Silent, but harmless.</strong>Your errors form a closed loop — a stabilizer. The logical qubit is untouched.</div>';
      else {
        var which = ls.xFlip && ls.zFlip ? 'Both <span class="ov">X</span> and <span class="ov">Z</span> were applied' :
          ls.xFlip ? 'You applied <span class="ov">X</span>: a logical bit flip' : 'You applied <span class="ov">Z</span>: a logical phase flip';
        note = '<div class="feedback ok fade-in" role="status"><strong>🎉 Logical qubit flipped — silently, with ' + plural(w, 'error') + '.</strong>' + which + '. ' +
          (w === st.d ? 'That is the minimum: exactly <span class="m">d</span> = ' + st.d + '. No shorter silent string crosses the grid.' : 'Can you do it with fewer?') + '</div>';
      }
      page.querySelector('#l-note').innerHTML = note;
      page.querySelector('#l-reveal').textContent = st.reveal ? 'Hide X̄ and Z̄' : success || st.best[st.d] ? 'Show X̄ and Z̄' : 'Reveal the answer';

      var ex = page.querySelector('#l-explain');
      ex.hidden = !st.reveal;
      if (st.reveal) {
        ex.innerHTML = '<h3>The logical operators</h3>' +
          '<p><span class="m"><span class="ov">X</span></span> = X on one <strong>column</strong>: an X-string from the top edge to the bottom edge. ' +
          '<span class="m"><span class="ov">Z</span></span> = Z on one <strong>row</strong>, from left to right.</p>' +
          '<p class="small">X-strings can end silently on the top and bottom edges, where there are no Z-tiles to notice them. Z-strings end silently on the left and right edges. ' +
          'Any string from one such edge to the opposite one is a logical operator; the shortest has length <span class="m">d</span>.</p>';
      }
    }

    bindChips(page, function (name, value) {
      if (name === 'd') { st.d = +value; st.errors = S.emptyFrame(st.d); setPressed(page, 'd', value); draw(); }
      if (name === 'tool') { st.tool = value; setPressed(page, 'tool', value); }
    });
    bindActions(page, {
      clear: function () { st.errors = S.emptyFrame(st.d); draw(); },
      reveal: function () { st.reveal = !st.reveal; draw(); }
    });
    draw();
    return function () { lat.destroy(); };
  }

  // ===================================================== 06 · threshold

  var SWEEP = [0.005, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13, 0.14, 0.16, 0.18, 0.20];
  var MARK = {
    3: function (x, y, hollow) { return '<circle cx="' + x + '" cy="' + y + '" r="4.5"' + (hollow ? ' fill="var(--card)"' : '') + '/>'; },
    5: function (x, y, hollow) { return '<rect x="' + (x - 4.5) + '" y="' + (y - 4.5) + '" width="9" height="9"' + (hollow ? ' fill="var(--card)"' : '') + '/>'; },
    4: function (x, y, hollow) { return '<path d="M' + x + ' ' + (y - 6) + 'L' + (x + 6) + ' ' + y + 'L' + x + ' ' + (y + 6) + 'L' + (x - 6) + ' ' + y + 'Z"' + (hollow ? ' fill="var(--card)"' : '') + '/>'; },
    7: function (x, y, hollow) { return '<path d="M' + x + ' ' + (y - 6) + 'L' + (x + 5.5) + ' ' + (y + 4) + 'L' + (x - 5.5) + ' ' + (y + 4) + 'Z"' + (hollow ? ' fill="var(--card)"' : '') + '/>'; }
  };

  function chartSVG(series, o) {
    var W = 640, H = 380, ml = 60, mr = 18, mt = 16, mb = 50;
    var pw = W - ml - mr, ph = H - mt - mb;
    var xMax = 0.2;
    var xOf = function (p) { return ml + (p / xMax) * pw; };
    var maxF = 0;
    series.forEach(function (s) { s.points.forEach(function (pt) { maxF = Math.max(maxF, pt.f + pt.se); }); });
    (o.curves || []).forEach(function (c) { c.points.forEach(function (pt) { maxF = Math.max(maxF, pt.f); }); });
    var yMax = Math.min(1, Math.max(0.05, Math.ceil(maxF * 1.15 * 20) / 20));
    var LOGMIN = 1e-4;
    var yOf = o.log
      ? function (f) { return mt + ph * (1 - (Math.log10(Math.max(f, LOGMIN)) - Math.log10(LOGMIN)) / (0 - Math.log10(LOGMIN))); }
      : function (f) { return mt + ph * (1 - f / yMax); };

    var out = ['<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label) + '">'];
    // grid + ticks
    var yt = o.log ? [1e-4, 1e-3, 1e-2, 1e-1, 1] : [0, 1, 2, 3, 4, 5].map(function (k) { return yMax * k / 5; });
    yt.forEach(function (f) {
      var y = yOf(f);
      out.push('<line class="chart-grid" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y + '" y2="' + y + '"/>');
      out.push('<text class="chart-tick" x="' + (ml - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (o.log ? (f >= 0.01 ? pct(f, 0) : pct(f, 2)) : pct(f, yMax < 0.2 ? 1 : 0)) + '</text>');
    });
    [0, 0.05, 0.1, 0.15, 0.2].forEach(function (p) {
      var x = xOf(p);
      out.push('<line class="chart-grid" x1="' + x + '" x2="' + x + '" y1="' + mt + '" y2="' + (H - mb) + '"/>');
      out.push('<text class="chart-tick" x="' + x + '" y="' + (H - mb + 18) + '" text-anchor="middle">' + pct(p, 0) + '</text>');
    });
    out.push('<line class="chart-axis" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + (H - mb) + '" y2="' + (H - mb) + '"/>');
    out.push('<line class="chart-axis" x1="' + ml + '" x2="' + ml + '" y1="' + mt + '" y2="' + (H - mb) + '"/>');
    out.push('<text class="chart-title" x="' + (ml + pw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">Physical error rate p (per qubit)</text>');
    out.push('<text class="chart-title" transform="translate(14 ' + (mt + ph / 2) + ') rotate(-90)" text-anchor="middle">Logical error rate p<tspan baseline-shift="sub" font-size="9">L</tspan></text>');

    // current p
    out.push('<line class="chart-p" x1="' + xOf(o.p) + '" x2="' + xOf(o.p) + '" y1="' + mt + '" y2="' + (H - mb) + '"/>');
    // crossings
    (o.crossings || []).forEach(function (c, k) {
      var x = xOf(c.p);
      out.push('<line class="chart-cross" x1="' + x + '" x2="' + x + '" y1="' + mt + '" y2="' + (H - mb) + '"/>');
      out.push('<text class="chart-cross-label" x="' + (x + 5) + '" y="' + (mt + 14 + 14 * k) + '">' + c.label + '</text>');
    });

    // optional model curves (dashed), drawn under the data
    (o.curves || []).forEach(function (c) {
      out.push('<polyline class="chart-model d' + c.d + '" points="' + c.points.map(function (pt) { return xOf(pt.p) + ',' + yOf(pt.f); }).join(' ') + '"/>');
    });

    series.forEach(function (s) {
      var pts = s.points;
      if (!pts.length) return;
      out.push('<g class="d' + s.d + '">');
      out.push('<polyline class="chart-line" points="' + pts.map(function (pt) { return xOf(pt.p) + ',' + yOf(pt.f); }).join(' ') + '"/>');
      pts.forEach(function (pt) {
        var x = xOf(pt.p);
        if (pt.se > 0) {
          out.push('<line class="chart-err" x1="' + x + '" x2="' + x + '" y1="' + yOf(Math.max(pt.f - pt.se, o.log ? LOGMIN : 0)) + '" y2="' + yOf(pt.f + pt.se) + '"/>');
        }
        out.push(MARK[s.d](x, yOf(pt.f), pt.f === 0));
      });
      out.push('</g>');
    });
    if (!series.some(function (s) { return s.points.length; })) {
      out.push('<text class="chart-tick" x="' + (ml + pw / 2) + '" y="' + (mt + ph / 2) + '" text-anchor="middle">' + (o.empty || 'Run an experiment to see points here.') + '</text>');
    }
    out.push('</svg>');
    return out.join('');
  }

  /* Shared "run the surface code on a backend" panel: a distance selector plus
   * a run button that uses the lab's physical error rate p and noise model. */
  function surfaceNoisePanel(page, hostSel, opts) {
    var host = page.querySelector(hostSel);
    if (!host) return;
    var ds = opts.distances || [3, 5, 7];
    var state = { d: ds[0] };
    host.innerHTML =
      '<p class="caption">Pick a code distance. The circuit uses the physical error rate p and the noise model chosen above, and runs on the Qollab backend you selected.</p>' +
      '<div class="chip-row" style="margin-top:8px" data-sd>' + ds.map(function (d) {
        return '<button class="chip' + (state.d === d ? ' active' : '') + '" type="button" data-d="' + d + '"><span class="m">d</span> = ' + d + '</button>';
      }).join('') + '</div>' +
      '<div class="toolbar" style="margin-top:12px"><button class="btn primary" data-srun>Run this distance on a backend</button>' +
        window.CircuitRun.hwBadge() + '<span class="caption" data-sstatus></span></div>' +
      '<div data-sout></div>';
    var out = host.querySelector('[data-sout]');
    var status = host.querySelector('[data-sstatus]');
    var btn = host.querySelector('[data-srun]');
    function paint() {
      Array.prototype.slice.call(host.querySelectorAll('[data-sd] [data-d]')).forEach(function (b) {
        b.classList.toggle('active', Number(b.getAttribute('data-d')) === state.d);
      });
    }
    Array.prototype.slice.call(host.querySelectorAll('[data-sd] [data-d]')).forEach(function (b) {
      b.addEventListener('click', function () { state.d = Number(b.getAttribute('data-d')); paint(); });
    });
    if (!window.CircuitRun.available()) status.textContent = 'Run inside Qollab.';
    btn.addEventListener('click', function () {
      var p = opts.p(), channel = opts.channel();
      btn.disabled = true;
      out.innerHTML = '<p class="caption">Submitting…</p>';
      window.CircuitRun.runNoisy({ model: 'surface', d: state.d, channel: channel, p: p, shots: 2048 }).then(function (res) {
        var dm = channel === 'depol' ? 'depolarizing' : 'bitflip';
        var r = D.runTrials(state.d, p, dm, 2000, Math.random);
        var pl = r.trials ? r.failures / r.trials : 0;
        status.textContent = res.shots + ' shots · d = ' + state.d + ' · ' + channel + ' @ p = ' + res.p + (res.backend ? ' · ' + res.backend : '');
        out.innerHTML =
          '<div class="notice" style="margin-top:12px"><p><b>Protected:</b> ' + res.protected + ' · <span class="m">d</span> = ' + state.d + '</p></div>' +
          '<p class="caption" style="margin-top:8px">Ran on the Qollab backend' + (res.backend ? ' (' + res.backend + ')' : '') + ' · ' +
            (res.mode === 'backend' ? 'device noise model' : 'ideal circuit, noise injected classically') + '.</p>' +
          '<div class="grid-two" style="margin-top:12px">' +
            '<div><div class="caption">' + (res.mode === 'backend' ? 'Noise-free reference (Aer)' : 'Noise-free circuit (Qollab)') + ' · detected ' + Math.round(100 * res.ideal.detected) + '%</div>' + window.CircuitRun.barsHTML(res.ideal.counts, 4) + '</div>' +
            '<div><div class="caption">' + (res.mode === 'backend' ? 'Noisy circuit (device)' : 'Noisy circuit (injected)') + ' · detected ' + Math.round(100 * res.noisy.detected) + '%</div>' + window.CircuitRun.barsHTML(res.noisy.counts, 4) + '</div>' +
          '</div>' +
          '<div class="cmp-row" style="margin-top:12px"><span class="caption">Logical failure after decoding (<span class="m">d</span> = ' + state.d + ', p = ' + res.p + ')</span><span class="m">' + (100 * pl).toFixed(2) + '%</span></div>' +
          '<p class="caption" style="margin-top:8px">Below threshold a bigger <span class="m">d</span> lowers the logical failure — the same decoder the chart above uses.</p>';
      }).catch(function (err) {
        status.textContent = '';
        out.innerHTML = '<div class="notice"><p>' + ((err && err.message) || err) + '</p></div>';
      }).then(function () { btn.disabled = false; });
    });
  }

  function renderThreshold(page) {
    var st = {
      p: 0.05, model: 'bitflip', ds: { 3: true, 5: true, 7: true }, trials: 1000, log: false,
      data: { bitflip: {}, depolarizing: {} }, queue: [], done: 0, total: 0, last: null
    };
    var timer = null;

    page.innerHTML =
      pageHead('06', 'The threshold', 'Does a bigger grid always help?',
        'Hit every qubit with random noise, let the decoder fix it, and count how often the logical qubit is lost. Then compare grid sizes.') +
      '<div class="grid-two">' +
      '<div class="sticky-col panel">' +
      '<div id="c-chart"></div>' +
      '<div class="legend">' +
      '<span><svg width="14" height="14" class="d3"><circle cx="7" cy="7" r="4.5"/></svg><span class="m">d</span> = 3</span>' +
      '<span><svg width="14" height="14" class="d5"><rect x="2.5" y="2.5" width="9" height="9"/></svg><span class="m">d</span> = 5</span>' +
      '<span><svg width="14" height="14" class="d7"><path d="M7 1L12.5 11H1.5Z"/></svg><span class="m">d</span> = 7</span>' +
      '<span>Bars: ±1 standard error · hollow: no failures seen</span></div>' +
      '<div class="ctrl-row"><label><input type="checkbox" id="c-log"> Log scale</label></div>' +
      '</div>' +
      '<div class="stack">' +
      '<div class="panel"><h3>Experiment</h3>' +
      '<div class="slider-label"><label for="c-p">Physical error rate <span class="m">p</span></label><output id="c-pout"></output></div>' +
      '<input type="range" class="range" id="c-p" min="0.005" max="0.2" step="0.005">' +
      '<div class="ctrl-row">' + chipGroup('model', 'Noise model', [
        { value: 'bitflip', label: 'Bit-flip (X)' }, { value: 'depolarizing', label: 'Depolarizing' }], st.model) + '</div>' +
      '<div class="ctrl-row" role="group" aria-label="Distances">' + S.DISTANCES.map(function (d) {
        return '<label><input type="checkbox" data-d="' + d + '" checked> <span class="m">d</span> = ' + d + '</label>';
      }).join('') + '</div>' +
      '<div class="ctrl-row"><span class="small">Trials per point</span>' + chipGroup('trials', 'Trials per point', [
        { value: 200, label: '200' }, { value: 1000, label: '1000' }], st.trials) + '</div>' +
      '<div class="btn-row"><button class="btn primary" type="button" data-action="run">Run at this p</button>' +
      '<button class="btn" type="button" data-action="sweep">Sweep p</button>' +
      '<button class="btn" type="button" data-action="stop">Stop</button>' +
      '<button class="btn" type="button" data-action="reset">Reset</button></div>' +
      '<div class="progressbar" aria-hidden="true"><div id="c-bar"></div></div>' +
      '<p class="small" id="c-progress" aria-live="polite"></p>' +
      '</div>' +
      '<div class="panel"><h3>Observations</h3><div id="c-obs" aria-live="polite"></div></div>' +
      '<div class="panel"><h3>Last trial</h3><div id="c-live" class="lat-host" style="max-width:260px"></div><p class="small" id="c-live-cap"></p></div>' +
      '</div></div>' +
      '<section class="math-section">' +
      '<h2>Below threshold, size wins exponentially</h2>' +
      '<p>To fool the decoder, roughly half a code distance of errors must line up. For small <span class="m">p</span> that gives</p>' +
      '<div class="eq">p<sub>L</sub> ≈ A · (p / p<sub>th</sub>)<sup>(d+1)/2</sup>' +
      '<span class="note">If p &lt; p<sub>th</sub>, each step d → d + 2 multiplies p<sub>L</sub> by the small factor p/p<sub>th</sub>. If p &gt; p<sub>th</sub>, bigger grids only make things worse.</span></div>' +
      '<details class="expand"><summary>How realistic is this threshold?</summary><div>' +
      '<p>This lab uses a simplified <em>code-capacity</em> model: errors hit only the data qubits, and every tile is measured perfectly. With exact matching, the bit-flip threshold of this model is close to 10%. ' +
      'For depolarizing noise the curves cross at a higher total p, because each kind of error (X or Z) appears with only 2p/3 and the decoder handles X and Z separately.</p>' +
      '<p>On real hardware, the measurement circuits themselves fail too, and the threshold drops to roughly 1%. In 2024 Google\'s “Willow” chip showed logical error rates decreasing from <span class="m">d</span> = 3 to 5 to 7 — the first clear demonstration of operating below threshold.</p>' +
      '<p>Everything here is a classical simulation in your browser (Pauli frames + matching), not a run on quantum hardware.</p></div></details>' +
      '</section>' +
      transitionBlock('The threshold exists. How much does each step in d actually buy?', '/lab', 'Open the distance lab');

    var slider = page.querySelector('#c-p');
    slider.value = st.p;
    var liveHost = page.querySelector('#c-live');

    function key(p) { return p.toFixed(3); }

    function series() {
      var tab = st.data[st.model];
      return S.DISTANCES.filter(function (d) { return st.ds[d]; }).map(function (d) {
        var m = tab[d] || {};
        var pts = Object.keys(m).map(function (k) {
          var r = m[k];
          return { p: +k, f: r.failures / r.trials, se: D.stdError(r.failures, r.trials), n: r.trials };
        }).sort(function (a, b) { return a.p - b.p; });
        return { d: d, points: pts };
      });
    }

    function draw() {
      var ser = series();
      var crossings = [];
      for (var k = 1; k < ser.length; k++) {
        var a = ser[k - 1].points.filter(function (pt) { return pt.n >= 200; });
        var b = ser[k].points.filter(function (pt) { return pt.n >= 200; });
        var c = D.estimateCrossing(a, b);
        var rough = a.concat(b).some(function (pt) { return pt.n < 1000; });
        if (c !== null) crossings.push({ p: c, label: 'd=' + ser[k - 1].d + '/' + ser[k].d + ' cross ≈ ' + pct(c) + (rough ? ' (rough)' : '') });
      }
      page.querySelector('#c-chart').innerHTML = chartSVG(ser, {
        log: st.log, p: st.p, crossings: crossings,
        label: 'Logical error rate versus physical error rate for distances ' + ser.map(function (s) { return s.d; }).join(', ') + '. ' +
          (crossings.length ? 'Estimated crossing near ' + pct(crossings[0].p) + '.' : '')
      });
      page.querySelector('#c-pout').textContent = pct(st.p);

      // observations at the current p
      var here = ser.map(function (s) {
        var pt = s.points.filter(function (x) { return x.p.toFixed(3) === key(st.p); })[0];
        return { d: s.d, pt: pt };
      }).filter(function (h) { return h.pt; });
      var obs = '';
      if (here.length) {
        obs += '<dl class="status-grid">' + here.map(function (h) {
          return '<dt><span class="m">d</span> = ' + h.d + '</dt><dd>p<sub>L</sub> = ' + pct(h.pt.f, 2) + ' ± ' + pct(h.pt.se, 2) + ' <span class="small">(' + h.pt.n + ' trials)</span></dd>';
        }).join('') + '</dl>';
        if (here.length >= 2) {
          var dec = true, inc = true;
          for (var i = 1; i < here.length; i++) {
            var a1 = here[i - 1].pt, b1 = here[i].pt, tol = Math.sqrt(a1.se * a1.se + b1.se * b1.se);
            if (!(b1.f < a1.f - tol)) dec = false;
            if (!(b1.f > a1.f + tol)) inc = false;
          }
          obs += dec ? '<div class="feedback ok"><strong>Bigger is better here.</strong>At p = ' + pct(st.p) + ' you are below threshold: every step up in d lowers the logical error rate.</div>'
            : inc ? '<div class="feedback no"><strong>Bigger is worse here.</strong>At p = ' + pct(st.p) + ' you are above threshold: more qubits mean more ways to fail.</div>'
            : '<div class="feedback warn"><strong>Too close to call.</strong>The curves are within statistical noise — you may be near the crossing. Add trials or move p.</div>';
        }
      } else {
        obs += '<p class="small">No data at p = ' + pct(st.p) + ' yet. Press “Run at this p”, or “Sweep p” to scan the whole range.</p>';
      }
      if (crossings.length) {
        obs += '<p>The point where the curves cross is the <strong>threshold</strong>. Measured: ' + crossings.map(function (c) { return c.label; }).join('; ') + '.' +
          (crossings.some(function (c) { return /rough/.test(c.label); }) ? ' <span class="small">Rough: fewer than 1000 trials per point. Use 1000 for a steadier estimate.</span>' : '') + '</p>';
      }
      var tot = 0, gr = 0;
      Object.keys(st.data[st.model]).forEach(function (d) {
        var m = st.data[st.model][d];
        Object.keys(m).forEach(function (k) { tot += m[k].trials; gr += m[k].greedy; });
      });
      if (gr) obs += '<p class="small">Exact matching ran in ' + pct(1 - gr / tot, 2) + ' of decodes; the rest had more than ' + D.EXACT_LIMIT + ' alarms of one kind and used the greedy fallback.</p>';
      page.querySelector('#c-obs').innerHTML = obs;

      var running = st.queue.length > 0;
      page.querySelector('#c-bar').style.width = st.total ? (100 * st.done / st.total) + '%' : '0';
      page.querySelector('#c-progress').textContent = running
        ? 'Running… ' + st.done + ' / ' + st.total + ' trials'
        : st.total ? 'Done: ' + st.total + ' trials.' : '';
      page.querySelector('[data-action="stop"]').disabled = !running;

      if (st.last) {
        var L = S.buildLattice(st.last.d), lt = st.last.r.last;
        liveHost.innerHTML = latticeSVG(L, {
          errors: lt.errors, defects: S.syndrome(L, lt.errors).defects, pairs: lt.decoded.pairs,
          interactive: false, label: 'Last simulated trial'
        });
        page.querySelector('#c-live-cap').innerHTML = '<span class="m">d</span> = ' + st.last.d + ', p = ' + pct(st.last.p) + ' — ' +
          (lt.failed ? '<strong style="color:var(--no)">logical error</strong>' : '<strong style="color:var(--ok)">decoded correctly</strong>');
      } else {
        page.querySelector('#c-live-cap').textContent = 'A sample trial will appear here while experiments run.';
      }
    }

    function tick() {
      timer = null;
      var t0 = performance.now();
      while (st.queue.length && performance.now() - t0 < 14) {
        var job = st.queue[0];
        var n = Math.min(50, job.left);
        var r = D.runTrials(job.d, job.p, job.model, n, Math.random);
        var tab = st.data[job.model];
        tab[job.d] = tab[job.d] || {};
        var cell = tab[job.d][key(job.p)] || (tab[job.d][key(job.p)] = { trials: 0, failures: 0, greedy: 0 });
        cell.trials += r.trials; cell.failures += r.failures; cell.greedy += r.greedy;
        st.done += n;
        job.left -= n;
        st.last = { d: job.d, p: job.p, r: r };
        if (!job.left) st.queue.shift();
      }
      draw();
      if (st.queue.length) timer = setTimeout(tick, 0);
    }

    function schedule(ps) {
      var ds = S.DISTANCES.filter(function (d) { return st.ds[d]; });
      if (!ds.length) return;
      if (!st.queue.length) { st.done = 0; st.total = 0; }
      ps.forEach(function (p) {
        ds.forEach(function (d) {
          st.queue.push({ d: d, p: p, model: st.model, left: st.trials });
          st.total += st.trials;
        });
      });
      if (!timer) timer = setTimeout(tick, 0);
    }

    function stop() {
      clearTimeout(timer); timer = null;
      st.queue = []; st.done = 0; st.total = 0;
    }

    slider.addEventListener('input', function () { st.p = +slider.value; draw(); });
    page.querySelector('#c-log').addEventListener('change', function (e) { st.log = e.target.checked; draw(); });
    page.querySelectorAll('[data-d]').forEach(function (cb) {
      cb.addEventListener('change', function () { st.ds[cb.getAttribute('data-d')] = cb.checked; draw(); });
    });
    bindChips(page, function (name, value) {
      if (name === 'model') { stop(); st.model = value; setPressed(page, 'model', value); draw(); }
      if (name === 'trials') { st.trials = +value; setPressed(page, 'trials', value); }
    });
    bindActions(page, {
      run: function () { schedule([st.p]); },
      sweep: function () { schedule(SWEEP); },
      stop: function () { stop(); draw(); },
      reset: function () { stop(); st.data[st.model] = {}; st.last = null; draw(); }
    });

    draw();
    return function () { clearTimeout(timer); timer = null; };
  }

  // ===================================================== 07 · distance lab

  var LAB_DS = [3, 4, 5];

  // Decorative d×d grid of data qubits. Plain geometry (works for even d too):
  // it does not call buildLattice and shows no stabilizers.
  function miniGridSVG(d, hits) {
    var step = 40, pad = 22, W = 2 * pad + (d - 1) * step;
    var s = '<svg class="mini-grid" viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="' + d + ' by ' + d + ' grid of data qubits' +
      (hits ? ', ' + plural(hits.filter(Boolean).length, 'random error') + ' shown' : '') + '">';
    for (var k = 0; k < d; k++) {
      var c = pad + k * step;
      s += '<line class="mini-edge" x1="' + pad + '" x2="' + (W - pad) + '" y1="' + c + '" y2="' + c + '"/>';
      s += '<line class="mini-edge" y1="' + pad + '" y2="' + (W - pad) + '" x1="' + c + '" x2="' + c + '"/>';
    }
    for (var q = 0; q < d * d; q++) {
      var x = pad + (q % d) * step, y = pad + Math.floor(q / d) * step;
      s += '<circle class="lat-qubit" cx="' + x + '" cy="' + y + '" r="10"/>';
      if (hits && hits[q]) s += '<circle class="mini-err" cx="' + x + '" cy="' + y + '" r="6"/>';
    }
    return s + '</svg>';
  }

  function labLegend() {
    return '<div class="legend">' +
      '<span><svg width="14" height="14" class="d3"><circle cx="7" cy="7" r="4.5"/></svg><span class="m">d</span> = 3</span>' +
      '<span><svg width="14" height="14" class="d4"><path d="M7 1.5L12.5 7L7 12.5L1.5 7Z"/></svg><span class="m">d</span> = 4</span>' +
      '<span><svg width="14" height="14" class="d5"><rect x="2.5" y="2.5" width="9" height="9"/></svg><span class="m">d</span> = 5</span>' +
      '<span>Dashed: model curve · bars: ±1 standard error</span></div>';
  }

  function renderLab(page) {
    var st = { d: 3, all: false, p: 0.05, trials: 1000, log: false, data: { 3: {}, 4: {}, 5: {} }, queue: [], done: 0, total: 0, hits: null };
    var timer = null;
    var CHUNK_MS = 30;

    page.innerHTML =
      pageHead('07', 'Distance lab', 'How much does a bigger grid buy you?',
        'Switch between d = 3, 4 and 5 and watch how the logical error rate responds — far below, near, and above the threshold.') +
      '<div class="grid-two">' +
      '<div class="sticky-col panel">' +
      '<div id="m-chart"></div>' +
      labLegend() +
      '<p class="small lab-caption" id="m-caption">Illustrative model: curves follow p<sub>L</sub> ≈ A·(p/p<sub>th</sub>)<sup>(d+1)/2</sup> with p<sub>th</sub> = 10%, plus random sampling noise. ' +
      'For a real decoder run, see <a href="' + BASE + '/threshold">lesson 06</a>.</p>' +
      '<div class="ctrl-row"><label><input type="checkbox" id="m-log"> Log scale</label></div>' +
      '<div class="mini-wrap"><div id="m-mini" class="mini-host"></div><p class="small" id="m-mini-cap"></p></div>' +
      '</div>' +
      '<div class="stack">' +
      '<div class="panel"><h3>Experiment</h3>' +
      '<div class="ctrl-row">' + chipGroup('d', 'Code distance', LAB_DS.map(function (d) {
        return { value: d, label: '<span class="m">d</span> = ' + d };
      }), st.d) +
      '<button type="button" class="chip" id="m-all" aria-pressed="false">Compare all</button></div>' +
      '<div class="slider-label"><label for="m-p">Physical error rate <span class="m">p</span></label><output id="m-pout"></output></div>' +
      '<input type="range" class="range" id="m-p" min="0.005" max="0.2" step="0.005">' +
      '<div class="ctrl-row"><span class="small">Trials per point</span>' + chipGroup('trials', 'Trials per point', [
        { value: 200, label: '200' }, { value: 1000, label: '1000' }], st.trials) + '</div>' +
      '<div class="btn-row"><button class="btn primary" type="button" data-action="run">Run at this p</button>' +
      '<button class="btn" type="button" data-action="sweep">Sweep p</button>' +
      '<button class="btn" type="button" data-action="reset">Reset</button></div>' +
      '<div class="progressbar" aria-hidden="true"><div id="m-bar"></div></div>' +
      '<p class="small" id="m-progress" aria-live="polite"></p>' +
      '<div id="m-aer-host" style="margin-top:18px"></div>' +
      '</div>' +
      '<div class="panel"><h3>Readouts</h3><div id="m-read" aria-live="polite"></div></div>' +
      '<div class="panel"><h3>Observations</h3><div id="m-obs" aria-live="polite"></div></div>' +
      '</div></div>' +
      '<section class="math-section">' +
      '<h2>One more step in <span class="m">d</span>, one more factor of <span class="m">p/p<sub>th</sub></span></h2>' +
      '<p>The curves in this lab follow the standard scaling law for surface codes below threshold:</p>' +
      '<div class="eq">p<sub>L</sub> ≈ A · (p / p<sub>th</sub>)<sup>(d+1)/2</sup>' +
      '<span class="note">capped at 50% — at that point the logical qubit is a coin flip.</span></div>' +
      '<details class="expand"><summary>What A, the threshold and the exponent mean</summary><div>' +
      '<p><strong><span class="m">p<sub>th</sub></span> (threshold)</strong> is where all curves meet. Here it is set to 10%, close to what lesson 06 measures for bit-flip noise with a perfect read-out.</p>' +
      '<p><strong><span class="m">A</span></strong> is the logical error rate right at the threshold — a prefactor that depends on the code and decoder. Here <span class="m">A</span> = 10%.</p>' +
      '<p><strong>The exponent <span class="m">(d+1)/2</span></strong> counts how many errors it takes to fool the decoder. Matching pairs alarms by the shortest strings, so it only goes wrong when errors cover about half the grid\'s width: then the shortest fix closes the string the wrong way across the grid. ' +
      'Each of those errors happens with probability about <span class="m">p</span>, so the chance falls like <span class="m">p</span> to that power. A wider grid needs more errors at once.</p>' +
      '<p>Below threshold <span class="m">p/p<sub>th</sub> &lt; 1</span>, so a bigger exponent means a smaller number. Above threshold the same power makes the number grow — bigger grids lose faster.</p>' +
      '<p>For even <span class="m">d</span>, ⌊(d−1)/2⌋ is the same as for <span class="m">d − 1</span>: <span class="m">d</span> = 4 still guarantees to fix only one error. The formula still gives it a curve in between.</p>' +
      '<p>This page samples the formula; it does not simulate qubits or run a decoder. Lesson 06 does both, locally in your browser.</p></div></details>' +
      '</section>' +
      transitionBlock('Ready to wrap up what the grid taught us?', '/conclusion', 'Conclusion');

    var slider = page.querySelector('#m-p');
    slider.value = st.p;
    var M = window.Mock;

    function key(p) { return p.toFixed(3); }
    function shown() { return st.all ? LAB_DS : [st.d]; }

    function point(d, p) {
      var r = st.data[d][key(p)];
      if (!r) return null;
      var f = r.failures / r.trials;
      return { p: p, f: f, se: Math.sqrt(f * (1 - f) / r.trials), n: r.trials };
    }

    function series() {
      return shown().map(function (d) {
        var pts = Object.keys(st.data[d]).map(function (k) { return point(d, +k); })
          .sort(function (a, b) { return a.p - b.p; });
        return { d: d, points: pts };
      });
    }

    function modelCurves() {
      return shown().map(function (d) {
        var pts = [];
        for (var p = 0.0025; p <= 0.2001; p += 0.0025) pts.push({ p: p, f: M.logicalRate(p, d) });
        return { d: d, points: pts };
      });
    }

    function drawMini() {
      page.querySelector('#m-mini').innerHTML = miniGridSVG(st.d, st.hits);
      page.querySelector('#m-mini-cap').innerHTML = st.hits
        ? 'Decorative: random error dots at density ≈ p, on the <span class="m">' + st.d + ' × ' + st.d + '</span> data qubits.'
        : 'The <span class="m">' + st.d + ' × ' + st.d + '</span> data qubits. Error dots flash here during a run (decorative).';
    }

    function draw() {
      var ser = series();
      page.querySelector('#m-chart').innerHTML = chartSVG(ser, {
        log: st.log, p: st.p, curves: modelCurves(),
        crossings: st.all ? [{ p: M.P_TH, label: 'model p_th = ' + pct(M.P_TH, 0) }] : [],
        empty: 'Press “Run at this p” or “Sweep p”.',
        label: 'Illustrative logical error rate versus physical error rate for d = ' + shown().join(', ') + '. Model curves cross at ' + pct(M.P_TH, 0) + '.'
      });
      page.querySelector('#m-pout').textContent = pct(st.p);

      // readouts for the selected d
      var d = st.d, here = point(d, st.p);
      page.querySelector('#m-read').innerHTML = '<dl class="status-grid">' +
        '<dt>Data qubits</dt><dd><span class="m">d²</span> = ' + d * d + '</dd>' +
        '<dt>Total qubits</dt><dd><span class="m">2d² − 1</span> = ' + M.totalQubits(d) + '</dd>' +
        '<dt>Always corrected</dt><dd>' + plural(M.correctable(d), 'error') + ' <span class="small">(⌊(d−1)/2⌋)</span></dd>' +
        '<dt>p<sub>L</sub> at p = ' + pct(st.p) + '</dt><dd>' + pct(M.logicalRate(st.p, d), 2) + ' <span class="small">model</span>' +
        (here ? '<br>' + pct(here.f, 2) + ' ± ' + pct(here.se, 2) + ' <span class="small">sampled, ' + here.n + ' trials</span>' : '') + '</dd>' +
        '</dl>';

      // observations
      var obs = '', p = st.p, ratio = p / M.P_TH;
      if (Math.abs(p - M.P_TH) < 1e-9) {
        obs += '<div class="feedback warn"><strong>Right at the threshold.</strong>Every distance gives the same logical error rate: adding qubits neither helps nor hurts.</div>';
      } else if (p < M.P_TH) {
        var r3 = M.logicalRate(p, 3), r5 = M.logicalRate(p, 5);
        obs += '<div class="feedback ok"><strong>Below threshold: bigger is better.</strong>Going from <span class="m">d</span> = 3 to <span class="m">d</span> = 5 cuts the logical error rate by about ' +
          '<span class="m">(p/p<sub>th</sub>)<sup>1</sup></span> = ' + ratio.toFixed(2) + ' (from ' + pct(r3, 2) + ' to ' + pct(r5, 2) + ') — and costs ' +
          (M.totalQubits(5) / M.totalQubits(3)).toFixed(1) + '× more qubits (' + M.totalQubits(5) + ' instead of ' + M.totalQubits(3) + ').</div>';
      } else {
        obs += '<div class="feedback no"><strong>Above threshold, a bigger grid makes things worse.</strong>Here <span class="m">p/p<sub>th</sub></span> = ' + ratio.toFixed(2) +
          ' &gt; 1, so every extra power in the formula raises <span class="m">p<sub>L</sub></span> instead of lowering it.</div>';
      }
      if (d === 4) {
        obs += '<p class="notice">Even distances help less: <span class="m">d</span> = 4 still corrects only 1 error, like <span class="m">d</span> = 3. That is why surface codes are usually built with odd <span class="m">d</span>.</p>';
      }
      var sampled = shown().map(function (k) { return { d: k, pt: point(k, p) }; }).filter(function (h) { return h.pt; });
      if (sampled.length >= 2) {
        obs += '<p class="small">Sampled at this p: ' + sampled.map(function (h) { return 'd = ' + h.d + ': ' + pct(h.pt.f, 2); }).join(' · ') +
          '. The scatter comes from drawing a finite number of trials.</p>';
      } else if (!sampled.length) {
        obs += '<p class="small">No samples at p = ' + pct(p) + ' yet. ' + (st.all ? 'Press “Run at this p” to sample all three distances here.' : 'Turn on “Compare all” to run the three distances side by side.') + '</p>';
      }
      page.querySelector('#m-obs').innerHTML = obs;

      var running = st.queue.length > 0;
      page.querySelector('#m-bar').style.width = st.total ? (100 * st.done / st.total) + '%' : '0';
      page.querySelector('#m-progress').textContent = running
        ? 'Running… ' + st.done + ' / ' + st.total + ' trials'
        : st.total ? 'Done: ' + st.total + ' trials (illustrative model).' : '';
      drawMini();
    }

    function tick() {
      timer = null;
      var job = st.queue[0];
      var n = Math.min(Math.max(40, Math.ceil(st.trials / 5)), job.left);
      var r = M.mockRun(job.p, job.d, n, Math.random);
      var cell = st.data[job.d][key(job.p)] || (st.data[job.d][key(job.p)] = { trials: 0, failures: 0 });
      cell.trials += r.trials; cell.failures += r.failures;
      st.done += n;
      job.left -= n;
      if (!job.left) st.queue.shift();
      if (job.d === st.d) {
        st.hits = [];
        for (var q = 0; q < st.d * st.d; q++) st.hits.push(Math.random() < job.p);
      }
      draw();
      if (st.queue.length) timer = setTimeout(tick, reducedMotion ? 0 : CHUNK_MS);
    }

    function schedule(ps) {
      if (!st.queue.length) { st.done = 0; st.total = 0; }
      ps.forEach(function (p) {
        shown().forEach(function (d) {
          st.queue.push({ d: d, p: p, left: st.trials });
          st.total += st.trials;
        });
      });
      if (!timer) timer = setTimeout(tick, 0);
      draw();
    }

    function stop() {
      clearTimeout(timer); timer = null;
      st.queue = []; st.done = 0; st.total = 0;
    }

    slider.addEventListener('input', function () { st.p = +slider.value; draw(); });
    page.querySelector('#m-log').addEventListener('change', function (e) { st.log = e.target.checked; draw(); });
    page.querySelector('#m-all').addEventListener('click', function (e) {
      st.all = !st.all;
      e.currentTarget.setAttribute('aria-pressed', st.all ? 'true' : 'false');
      draw();
    });
    bindChips(page, function (name, value) {
      if (name === 'd') { st.d = +value; st.hits = null; setPressed(page, 'd', value); draw(); }
      if (name === 'trials') { st.trials = +value; setPressed(page, 'trials', value); }
    });
    bindActions(page, {
      run: function () { schedule([st.p]); },
      sweep: function () { schedule(SWEEP); },
      reset: function () { stop(); st.data = { 3: {}, 4: {}, 5: {} }; st.hits = null; draw(); }
    });

    draw();
    surfaceNoisePanel(page, '#m-aer-host', {
      p: function () { return st.p; },
      channel: function () { return 'x'; },
      distances: [3, 5],
    });
    return function () { clearTimeout(timer); timer = null; };
  }

  // ======================================================== conclusion

  function renderConclusion(page) {
    var quiz = Quiz.createState();

    page.innerHTML =
      pageHead('End', 'Conclusion', 'What did the grid teach us?',
        'Four ideas carry the surface code from a toy grid to real quantum chips.') +
      '<ol class="takeaways" style="margin-top:24px">' +
      '<li><strong>Local checks are enough.</strong> Every tile touches at most four neighbouring qubits, yet together the <span class="m">d² − 1</span> tiles protect one logical qubit.</li>' +
      '<li><strong>Alarms mark the ends of strings.</strong> A tile sees the parity of errors on its corners, so only the endpoints of an error string light up — and closed loops are silent and harmless.</li>' +
      '<li><strong>Decoding is matching.</strong> Pair the alarms with the shortest strings. The code fails only when errors plus correction stretch across the grid: at least <span class="m">d</span> flips.</li>' +
      '<li><strong>Below threshold, bigger wins.</strong> When <span class="m">p &lt; p<sub>th</sub></span>, each step <span class="m">d → d + 2</span> suppresses logical errors by another factor of <span class="m">p/p<sub>th</sub></span>.</li>' +
      '</ol>' +
      "<section style='margin-top:56px'>" +
      "<div class='page-head'><div class='meta'><span class='kick'>What’s next</span></div><h2 class='headline' style='font-size:1.6rem'>From a toy grid to real hardware</h2></div>" +
      "<p class='dek' style='margin-top:12px'><strong>Measurement errors.</strong> Here every tile was read perfectly. On hardware the alarms themselves can lie, so tiles are measured again and again, and the decoder matches alarms in space <em>and</em> time — a 3D version of the same matching problem.</p>" +
      "<p class='dek' style='margin-top:12px'><strong>Real hardware.</strong> Superconducting chips such as Google’s Willow already run surface codes below threshold. The next steps are logical gates between patches (lattice surgery) and many logical qubits at once.</p>" +
      "</section>" +
      "<section id='m3-quiz' style='margin-top:64px'></section>";

    function updateQuiz() {
      var box = page.querySelector('#m3-quiz');
      var total = Quiz.total();
      if (quiz.done) {
        var sc = Quiz.score(quiz), pctv = Math.round((sc / total) * 100);
        var review = quiz.answers.map(function (a) {
          var q = Quiz.QUESTIONS[a.q];
          return "<div class='quiz-review'><div class='q'>" + (a.q + 1) + ". " + q.question + "</div>" +
            "<div class='a'>Your answer: <span style='color:" + (a.correct ? "var(--good)" : "var(--bad)") + "'>" + q.options[a.selected] + "</span></div>" +
            "<div class='a'>Correct answer: <span style='color:var(--good)'>" + q.options[q.correct] + "</span></div>" +
            "<div class='a'>" + q.explanation + "</div>" +
            "<div class='a'><a href='" + q.href + "'>" + q.lesson + " →</a></div></div>";
        }).join("");
        box.innerHTML =
          "<div class='page-head'><div class='meta'><span class='kick'>Final knowledge check</span></div><h2 class='headline' style='font-size:1.6rem'>Module 4 Complete</h2></div>" +
          "<div class='panel' style='margin-top:16px'>" +
            "<div class='cmp-row'><span class='caption'>Score</span><span class='m'>" + sc + " / " + total + "</span></div>" +
            "<div class='cmp-row'><span class='caption'>Percentage</span><span class='m'>" + pctv + "%</span></div>" +
            "<div class='cmp-row'><span class='caption'>Assessment</span><span class='m'>" + Quiz.message(sc) + "</span></div></div>" +
          "<div class='toolbar' style='margin-top:14px'><button class='btn' id='m3-q-retry'>Retry Quiz</button><button class='btn ghost' id='m3-q-review'>Review Answers</button></div>" +
          "<div id='m3-q-review-box' style='margin-top:16px; display:none'><div class='panel'>" + review + "</div></div>";
        page.querySelector('#m3-q-retry').addEventListener('click', function () { quiz = Quiz.restart(); updateQuiz(); });
        page.querySelector('#m3-q-review').addEventListener('click', function () { var b = page.querySelector('#m3-q-review-box'); b.style.display = b.style.display === 'none' ? 'block' : 'none'; });
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
          "<p class='dek' style='margin-top:8px'>Explore what you’ve learned about surface codes, stabilizers, and logical errors.</p></div>" +
        "<div class='panel' style='margin-top:16px'>" +
          "<div class='quiz-prog'><span class='shor-step'>Question " + (quiz.index + 1) + " of " + total + "</span><span class='m'>Score " + sc2 + " / " + total + "</span></div>" +
          "<h3 style='margin-top:12px'>" + q.question + "</h3>" + opts + fb +
          "<div class='toolbar' style='margin-top:14px'>" +
            "<button class='btn primary' id='m3-q-confirm'" + (quiz.selected == null || quiz.confirmed ? " disabled" : "") + ">Confirm</button>" +
            "<button class='btn' id='m3-q-next'" + (quiz.confirmed ? "" : " disabled") + ">" + (quiz.index + 1 >= total ? "See results →" : "Next Question →") + "</button>" +
          "</div></div>";
      page.querySelectorAll("#m3-quiz [data-qi]").forEach(function (el) { el.addEventListener('click', function () { quiz = Quiz.select(quiz, Number(el.getAttribute('data-qi'))); updateQuiz(); }); });
      page.querySelector('#m3-q-confirm').addEventListener('click', function () { quiz = Quiz.confirm(quiz); updateQuiz(); });
      page.querySelector('#m3-q-next').addEventListener('click', function () { quiz = Quiz.next(quiz); updateQuiz(); });
    }
    updateQuiz();
    return null;
  }

  // ------------------------------------------------ public interface
  var render = { cover: makeRender('/', renderCover) };
  var routes = { '/module-3': 'cover' };
  LESSONS.forEach(function (l) {
    var key = l.path.slice(1);
    render[key] = makeRender(l.path, l.render);
    routes['/module-3' + l.path] = key;
  });
  global.Module3 = { routes: routes, render: render, LESSONS: LESSONS };
})(typeof window !== 'undefined' ? window : globalThis);
