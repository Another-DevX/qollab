/*!
 * Qollab · Módulo 1 — Entendiendo los errores cuánticos
 * Versión estática autónoma: HTML + JavaScript puro, sin dependencias.
 * La esfera de Bloch se dibuja con Canvas 2D y toda la matemática cuántica
 * (estados, operadores de Pauli, rotaciones, retos) se calcula aquí.
 *
 * Puntos de entrada: index.html + main.js
 */
(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var PALETTE = { original: "#56e1ff", transformed: "#ff6fb5", error: "#ffc857" };

  /* ==================================================================
   * 1. Matemática cuántica (independiente del render)
   * ================================================================== */

  // --- Números complejos ---
  function cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
  function cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
  function cMul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
  function cScale(a, s) { return { re: a.re * s, im: a.im * s }; }
  function cConj(a) { return { re: a.re, im: -a.im }; }
  function cAbs(a) { return Math.hypot(a.re, a.im); }
  function cAbs2(a) { return a.re * a.re + a.im * a.im; }
  function cExpI(p) { return { re: Math.cos(p), im: Math.sin(p) }; }
  var C0 = { re: 0, im: 0 };
  var C1 = { re: 1, im: 0 };

  // --- Matrices 2×2 y espinores ---
  function matMul(A, B) {
    return [
      [cAdd(cMul(A[0][0], B[0][0]), cMul(A[0][1], B[1][0])), cAdd(cMul(A[0][0], B[0][1]), cMul(A[0][1], B[1][1]))],
      [cAdd(cMul(A[1][0], B[0][0]), cMul(A[1][1], B[1][0])), cAdd(cMul(A[1][0], B[0][1]), cMul(A[1][1], B[1][1]))],
    ];
  }
  function matVec(M, v) {
    return [cAdd(cMul(M[0][0], v[0]), cMul(M[0][1], v[1])), cAdd(cMul(M[1][0], v[0]), cMul(M[1][1], v[1]))];
  }
  function matTrace(M) { return cAdd(M[0][0], M[1][1]); }
  function matDagger(M) { return [[cConj(M[0][0]), cConj(M[1][0])], [cConj(M[0][1]), cConj(M[1][1])]]; }
  function matScaleC(M, s) { return [[cMul(M[0][0], s), cMul(M[0][1], s)], [cMul(M[1][0], s), cMul(M[1][1], s)]]; }
  function matScaleR(M, s) { return [[cScale(M[0][0], s), cScale(M[0][1], s)], [cScale(M[1][0], s), cScale(M[1][1], s)]]; }
  function matAddM(A, B) { return [[cAdd(A[0][0], B[0][0]), cAdd(A[0][1], B[0][1])], [cAdd(A[1][0], B[1][0]), cAdd(A[1][1], B[1][1])]]; }

  // --- Operadores de Pauli ---
  var PAULI = {
    I: [[C1, C0], [C0, C1]],
    X: [[C0, C1], [C1, C0]],
    Y: [[C0, { re: 0, im: -1 }], [{ re: 0, im: 1 }, C0]],
    Z: [[C1, C0], [C0, { re: -1, im: 0 }]],
  };
  var PAULI_NAMES = ["I", "X", "Y", "Z"];
  function applyPauli(name, v) { return matVec(PAULI[name], v); }
  function composeOperator(ops) {
    var R = PAULI.I;
    for (var i = 0; i < ops.length; i++) R = matMul(PAULI[ops[i]], R);
    return R;
  }

  // --- Estados ---
  var SQ = 1 / Math.SQRT2;
  var KET = {
    "0": [C1, C0],
    "1": [C0, C1],
    "+": [{ re: SQ, im: 0 }, { re: SQ, im: 0 }],
    "-": [{ re: SQ, im: 0 }, { re: -SQ, im: 0 }],
    "+i": [{ re: SQ, im: 0 }, { re: 0, im: SQ }],
    "-i": [{ re: SQ, im: 0 }, { re: 0, im: -SQ }],
  };
  var STATE_LABELS = { "0": "|0⟩", "1": "|1⟩", "+": "|+⟩", "-": "|−⟩", "+i": "|+i⟩", "-i": "|−i⟩" };

  function ketState(theta, phi) { return [{ re: Math.cos(theta / 2), im: 0 }, cScale(cExpI(phi), Math.sin(theta / 2))]; }
  function blochVector(v) {
    var norm2 = cAbs2(v[0]) + cAbs2(v[1]);
    if (norm2 < 1e-15) return { x: 0, y: 0, z: 0 };
    var ab = cMul(cConj(v[0]), v[1]);
    return { x: (2 * ab.re) / norm2, y: (2 * ab.im) / norm2, z: (cAbs2(v[0]) - cAbs2(v[1])) / norm2 };
  }
  function stateFromBloch(x, y, z) {
    var r = Math.hypot(x, y, z);
    if (r < 1e-12) return KET["0"];
    var theta = Math.acos(Math.max(-1, Math.min(1, z / r)));
    var phi = x === 0 && y === 0 ? 0 : Math.atan2(y, x);
    return ketState(theta, phi);
  }
  function normalizeSpinor(s) {
    var k = Math.sqrt(cAbs2(s[0]) + cAbs2(s[1]));
    if (k < 1e-15) return KET["0"];
    return [cScale(s[0], 1 / k), cScale(s[1], 1 / k)];
  }
  function innerProduct(a, b) { return cAdd(cMul(cConj(a[0]), b[0]), cMul(cConj(a[1]), b[1])); }
  function overlap(a, b) { return cAbs(innerProduct(normalizeSpinor(a), normalizeSpinor(b))); }
  function equivalent(a, b, eps) { return 1 - overlap(a, b) <= (eps == null ? 1e-6 : eps); }
  function blochToSpherical(v) {
    var r = Math.hypot(v.x, v.y, v.z);
    if (r < 1e-12) return { theta: 0, phi: 0 };
    var theta = Math.acos(Math.max(-1, Math.min(1, v.z / r)));
    var phi = v.x === 0 && v.y === 0 ? 0 : Math.atan2(v.y, v.x);
    if (phi < 0) phi += TAU;
    return { theta: theta, phi: phi };
  }

  // --- Rotaciones y base de Pauli ---
  function normalizeAxis(a) {
    var n = Math.hypot(a.x, a.y, a.z) || 1;
    return { x: a.x / n, y: a.y / n, z: a.z / n };
  }
  function dotPauli(axis) {
    var n = normalizeAxis(axis);
    return matAddM(matAddM(matScaleR(PAULI.X, n.x), matScaleR(PAULI.Y, n.y)), matScaleR(PAULI.Z, n.z));
  }
  function rotationOperator(axis, angle) {
    var h = angle / 2;
    return matAddM(matScaleR(PAULI.I, Math.cos(h)), matScaleC(dotPauli(axis), { re: 0, im: -Math.sin(h) }));
  }
  function coefficient(M, B) { return cScale(matTrace(matMul(matDagger(B), M)), 0.5); }
  function pauliDecomposition(M) {
    return { a: coefficient(M, PAULI.I), b: coefficient(M, PAULI.X), c: coefficient(M, PAULI.Y), d: coefficient(M, PAULI.Z) };
  }

  // --- Retos ---
  function createSeededRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function isNonDegenerate(state, margin) {
    margin = margin == null ? 0.08 : margin;
    var imgs = PAULI_NAMES.map(function (n) { return applyPauli(n, state); });
    for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (overlap(imgs[i], imgs[j]) > 1 - margin) return false;
    return true;
  }
  function generateInitialState(rng) {
    for (var k = 0; k < 100; k++) {
      var theta = Math.PI * (0.18 + 0.64 * rng());
      var phi = TAU * rng();
      var state = ketState(theta, phi);
      if (isNonDegenerate(state)) return { theta: theta, phi: phi, state: state };
    }
    var t = Math.PI * 0.42, p = Math.PI * 0.31;
    return { theta: t, phi: p, state: ketState(t, p) };
  }
  function generateChallenge(rng) {
    var s = generateInitialState(rng);
    var error = PAULI_NAMES[Math.floor(rng() * 4) % 4];
    return { theta: s.theta, phi: s.phi, initial: s.state, error: error, final: applyPauli(error, s.state) };
  }

  // --- Formato ---
  function clean(n, d) {
    d = d == null ? 3 : d;
    var r = Number(n.toFixed(d));
    return Object.is(r, -0) ? 0 : r;
  }
  function fmtNum(n, d) { return String(clean(n, d)); }
  function fmtIm(im, d) {
    var v = clean(im, d);
    if (v === 1) return "i";
    if (v === -1) return "−i";
    return fmtNum(v, d) + "i";
  }
  function fmtC(c, d) {
    d = d == null ? 3 : d;
    var re = clean(c.re, d), im = clean(c.im, d);
    if (im === 0) return fmtNum(re, d);
    if (re === 0) return fmtIm(im, d);
    return fmtNum(re, d) + (im > 0 ? " + " : " − ") + fmtIm(Math.abs(im), d);
  }
  function fmtReal(n, d) { return fmtNum(n, d).replace("-", "−"); }
  function fmtPi(rad, d) {
    var r = clean(rad / Math.PI, d == null ? 2 : d);
    if (r === 0) return "0";
    if (r === 1) return "π";
    if (r === -1) return "−π";
    return fmtReal(r, d) + "π";
  }
  function radToDeg(r) { return (r * 180) / Math.PI; }
  function coordText(v) { return "(" + fmtReal(v.x) + ", " + fmtReal(v.y) + ", " + fmtReal(v.z) + ")"; }

  /* ==================================================================
   * 2. Utilidades de vectores 3D + interpolación en la esfera
   * ================================================================== */
  function vAdd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function vScale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function vDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vCross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function vLen(a) { return Math.hypot(a[0], a[1], a[2]); }
  function vNorm(a) { var l = vLen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function slerp(a, b, t) {
    var d = clamp(vDot(a, b), -1, 1);
    if (d > 0.9995) return vNorm([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    var th = Math.acos(d), s = Math.sin(th);
    var w1 = Math.sin((1 - t) * th) / s, w2 = Math.sin(t * th) / s;
    return vNorm(vAdd(vScale(a, w1), vScale(b, w2)));
  }
  var REDUCE_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ==================================================================
   * 3. Esfera de Bloch (Canvas 2D)
   * ================================================================== */
  function BlochSphere(canvas, options) {
    options = options || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.view = { azim: 0.95, elev: 0.36, dist: 3.2 };
    this.arrows = [];
    this.autoRotate = !!options.autoRotate;
    this.showLabels = options.showLabels !== false;
    this.running = false;
    this._attached = false;
    this._dragging = false;
    this._last = [0, 0];
    this._raf = 0;
    var self = this;
    this._onDown = function (e) { self._down(e); };
    this._onMove = function (e) { self._move(e); };
    this._onUp = function () { self._dragging = false; };
    this._onWheel = function (e) { self._wheel(e); };
    this._tick = function (now) { self._frame(now); };
    this.resize();
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(function () { self.resize(); });
      this._ro.observe(canvas);
    }
  }
  BlochSphere.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = this.canvas.getBoundingClientRect();
    var w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    this.w = w; this.h = h; this.dpr = dpr;
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) { this.canvas.width = pw; this.canvas.height = ph; }
  };
  BlochSphere.prototype.setArrows = function (arrows) {
    var prev = {};
    for (var i = 0; i < this.arrows.length; i++) prev[this.arrows[i].id] = this.arrows[i];
    var next = [];
    for (var k = 0; k < arrows.length; k++) {
      var a = arrows[k];
      var target = vNorm([a.vector[0], a.vector[1], a.vector[2]]);
      var old = prev[a.id];
      var current = a.from ? vNorm([a.from[0], a.from[1], a.from[2]]) : (old ? old.current : target);
      next.push({ id: a.id, color: a.color, opacity: a.opacity == null ? 1 : a.opacity, current: current, target: target });
    }
    this.arrows = next;
  };
  BlochSphere.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    if (!this._attached) {
      this._attached = true;
      this.canvas.addEventListener("pointerdown", this._onDown);
      window.addEventListener("pointermove", this._onMove);
      window.addEventListener("pointerup", this._onUp);
      this.canvas.addEventListener("wheel", this._onWheel, { passive: false });
    }
    this.resize();
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  };
  BlochSphere.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    if (this._attached) {
      this._attached = false;
      this.canvas.removeEventListener("pointerdown", this._onDown);
      window.removeEventListener("pointermove", this._onMove);
      window.removeEventListener("pointerup", this._onUp);
      this.canvas.removeEventListener("wheel", this._onWheel);
    }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
  };
  BlochSphere.prototype._down = function (e) {
    this._dragging = true;
    this._last = [e.clientX, e.clientY];
    if (this.canvas.setPointerCapture) { try { this.canvas.setPointerCapture(e.pointerId); } catch (err) {} }
  };
  BlochSphere.prototype._move = function (e) {
    if (!this._dragging) return;
    var dx = e.clientX - this._last[0], dy = e.clientY - this._last[1];
    this._last = [e.clientX, e.clientY];
    this.view.azim -= dx * 0.008;
    this.view.elev = clamp(this.view.elev + dy * 0.008, -1.35, 1.35);
  };
  BlochSphere.prototype._wheel = function (e) {
    e.preventDefault();
    this.view.dist = clamp(this.view.dist + e.deltaY * 0.0015, 2.3, 5.5);
  };
  BlochSphere.prototype._basis = function () {
    var v = this.view;
    var ce = Math.cos(v.elev), se = Math.sin(v.elev), ca = Math.cos(v.azim), sa = Math.sin(v.azim);
    var zAxis = vNorm([v.dist * ce * ca, v.dist * ce * sa, v.dist * se]);
    var xAxis = vCross([0, 0, 1], zAxis);
    if (vLen(xAxis) < 1e-6) xAxis = [1, 0, 0];
    xAxis = vNorm(xAxis);
    var yAxis = vNorm(vCross(zAxis, xAxis));
    return { xAxis: xAxis, yAxis: yAxis, zAxis: zAxis };
  };
  BlochSphere.prototype._project = function (p) {
    var b = this._basis();
    var X = vDot(p, b.xAxis), Y = vDot(p, b.yAxis), Z = vDot(p, b.zAxis);
    var persp = this.view.dist / Math.max(this.view.dist - Z, 0.25);
    var r = Math.min(this.w, this.h) * 0.34;
    return { x: this.w / 2 + X * persp * r, y: this.h / 2 - Y * persp * r, z: Z };
  };
  BlochSphere.prototype._frame = function (now) {
    var dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    if (this.autoRotate) this.view.azim += dt * 0.25;
    var t = REDUCE_MOTION ? 1 : 1 - Math.exp(-dt * 7);
    for (var i = 0; i < this.arrows.length; i++) {
      var a = this.arrows[i];
      a.current = slerp(a.current, a.target, t);
    }
    this._draw();
    if (this.running) this._raf = requestAnimationFrame(this._tick);
  };
  BlochSphere.prototype._strokeRun = function (run, front, back, width, sign) {
    if (run.length < 2) return;
    var ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(run[0].x, run[0].y);
    for (var j = 1; j < run.length; j++) ctx.lineTo(run[j].x, run[j].y);
    ctx.strokeStyle = sign >= 0 ? front : back;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  BlochSphere.prototype._loop = function (points, front, back, width) {
    var proj = [];
    for (var i = 0; i < points.length; i++) proj.push(this._project(points[i]));
    proj.push(proj[0]); // cierra el círculo
    var run = [], sign = null;
    for (var k = 0; k < proj.length; k++) {
      var s = proj[k].z >= 0 ? 1 : -1;
      if (sign === null) {
        sign = s;
        run.push(proj[k]);
      } else if (s !== sign) {
        run.push(proj[k]); // cierra el arco anterior justo en el borde
        this._strokeRun(run, front, back, width, sign);
        run = [proj[k]]; // el nuevo arco arranca en el borde
        sign = s;
      } else {
        run.push(proj[k]);
      }
    }
    this._strokeRun(run, front, back, width, sign);
  };
  BlochSphere.prototype._draw = function () {
    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    var cx = this.w / 2, cy = this.h / 2, r = Math.min(this.w, this.h) * 0.34;

    // Halo
    var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.55);
    halo.addColorStop(0, "rgba(86,225,255,0.07)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.55, 0, TAU); ctx.fill();

    // Bola translúcida
    var ball = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    ball.addColorStop(0, "rgba(96,128,210,0.18)");
    ball.addColorStop(0.7, "rgba(40,55,100,0.10)");
    ball.addColorStop(1, "rgba(12,16,34,0.30)");
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = ball; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(150,175,255,0.22)"; ctx.stroke();

    this._graticule();
    this._axes(r);
    this._arrows();
  };
  BlochSphere.prototype._circlePoints = function (mode, value, segs) {
    var pts = [], i, a;
    if (mode === "lat") {
      var rr = Math.sqrt(Math.max(0, 1 - value * value));
      for (i = 0; i <= segs; i++) { a = (i / segs) * TAU; pts.push([Math.cos(a) * rr, Math.sin(a) * rr, value]); }
    } else {
      for (i = 0; i <= segs; i++) { a = (i / segs) * TAU; pts.push([Math.cos(a) * Math.cos(value), Math.cos(a) * Math.sin(value), Math.sin(a)]); }
    }
    return pts;
  };
  BlochSphere.prototype._graticule = function () {
    var lats = [-0.66, -0.33, 0.33, 0.66], i;
    for (i = 0; i < lats.length; i++) this._loop(this._circlePoints("lat", lats[i], 72), "rgba(150,175,255,0.30)", "rgba(100,120,170,0.10)", 0.8);
    // Ecuador destacado
    this._loop(this._circlePoints("lat", 0, 96), "rgba(180,200,240,0.62)", "rgba(120,140,190,0.16)", 1.1);
    // Meridianos
    for (i = 0; i < 6; i++) this._loop(this._circlePoints("lon", (i * Math.PI) / 6, 96), "rgba(140,165,225,0.22)", "rgba(90,110,160,0.09)", 0.7);
  };
  BlochSphere.prototype._axes = function (r) {
    var ctx = this.ctx;
    var axes = [
      { d: [1, 0, 0], c: "#ff6b6b", l: "X" },
      { d: [0, 1, 0], c: "#5ee9a3", l: "Y" },
      { d: [0, 0, 1], c: "#7f9dff", l: "Z" },
    ];
    for (var i = 0; i < axes.length; i++) {
      var a = axes[i];
      var p0 = this._project(vScale(a.d, -1.02));
      var p1 = this._project(vScale(a.d, 1.02));
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = a.c; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = 1;
      if (this.showLabels) {
        var lp = this._project(vScale(a.d, 1.3));
        ctx.font = "600 13px " + "ui-monospace, Menlo, monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = a.c;
        ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 8;
        ctx.fillText(a.l, lp.x, lp.y);
        ctx.shadowBlur = 0;
      }
    }
    // Origen
    var o = this._project([0, 0, 0]);
    ctx.beginPath(); ctx.arc(o.x, o.y, 2, 0, TAU); ctx.fillStyle = "rgba(200,215,255,0.6)"; ctx.fill();
  };
  BlochSphere.prototype._arrows = function () {
    var ctx = this.ctx;
    var o = this._project([0, 0, 0]);
    for (var i = 0; i < this.arrows.length; i++) {
      var a = this.arrows[i];
      var dir = vNorm(a.current);
      var tip = this._project(dir);
      var depth = (tip.z + 1) / 2; // 0 atrás, 1 delante
      var alpha = a.opacity * (0.5 + 0.5 * depth);
      var dx = tip.x - o.x, dy = tip.y - o.y;
      var len = Math.hypot(dx, dy) || 1;
      var ux = dx / len, uy = dy / len;

      ctx.globalAlpha = alpha;
      // Eje de la flecha
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(tip.x, tip.y);
      ctx.strokeStyle = a.color; ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.stroke();
      // Punta (triángulo)
      var hl = 11, hw = 5.5;
      var baseX = tip.x - ux * hl, baseY = tip.y - uy * hl;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(baseX - uy * hw, baseY + ux * hw);
      ctx.lineTo(baseX + uy * hw, baseY - ux * hw);
      ctx.closePath();
      ctx.fillStyle = a.color; ctx.fill();
      // Brillo en la punta
      ctx.beginPath(); ctx.arc(tip.x, tip.y, 3.2, 0, TAU); ctx.fillStyle = a.color; ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  /* ==================================================================
   * 4. Contenido educativo
   * ================================================================== */
  var PAULI_INFO = {
    I: { title: "Identidad", effect: "No aplica ningún cambio: el estado permanece igual.", map: "(x, y, z) → (x, y, z)", note: "Representa la ausencia de error sobre el cúbit.", color: "#9aa3b8" },
    X: { title: "Bit flip", effect: "Intercambia |0⟩ con |1⟩; el vector de Bloch gira π alrededor del eje X.", map: "(x, y, z) → (x, −y, −z)", note: "Es el análogo cuántico de invertir un bit clásico.", color: "#ff6b6b" },
    Y: { title: "Bit + phase flip", effect: "Combina el volteo de bit con el de fase; gira π alrededor del eje Y.", map: "(x, y, z) → (−x, y, −z)", note: "Y = iXZ: equivale a aplicar X y Z (salvo fase global).", color: "#5ee9a3" },
    Z: { title: "Phase flip", effect: "Cambia el signo de la componente |1⟩ sin alterar probabilidades; gira π alrededor del eje Z.", map: "(x, y, z) → (−x, −y, z)", note: "No cambia la probabilidad de medir 0 o 1, sólo la fase relativa.", color: "#7f9dff" },
  };
  var BASIS_DESCRIPTION = { I: "Identidad: deja todo igual.", X: "Volteo de bit.", Y: "Volteo de bit y fase.", Z: "Volteo de fase." };

  /* ==================================================================
   * 5. Helpers de DOM
   * ================================================================== */
  function qs(root, sel) { return root.querySelector(sel); }
  function qsa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function matrixHTML(m, label, opts) {
    opts = opts || {};
    var d = opts.digits == null ? 3 : opts.digits;
    var cells = [m[0][0], m[0][1], m[1][0], m[1][1]].map(function (c) {
      var zero = Math.abs(c.re) < 1e-12 && Math.abs(c.im) < 1e-12;
      var hl = opts.highlight && !zero && opts.color;
      var style = hl ? ' style="color:' + opts.color + '"' : "";
      var cls = hl ? ' class="nz"' : "";
      return "<span" + cls + style + ">" + fmtC(c, d) + "</span>";
    }).join("");
    var lbl = label ? '<span class="mono" style="color:var(--muted)">' + label + "</span>" : "";
    return '<div class="matrix">' + lbl + '<div class="matrix-body"><span class="bracket left"></span><div class="matrix-grid">' + cells + '</div><span class="bracket right"></span></div></div>';
  }
  function readoutHTML(title, state, color, note) {
    var v = blochVector(state);
    return '<div class="readout">' +
      '<div class="readout-title"><span class="dot" style="background:' + color + ";box-shadow:0 0 10px " + color + '"></span>' + title + "</div>" +
      '<div class="kv"><span>α · |0⟩</span><b>' + fmtC(state[0]) + "</b></div>" +
      '<div class="kv"><span>β · |1⟩</span><b>' + fmtC(state[1]) + "</b></div>" +
      '<div class="kv"><span>(x, y, z)</span><b>' + coordText(v) + "</b></div>" +
      (note ? '<p class="faint" style="font-size:11px;margin:8px 0 0;line-height:1.5">' + note + "</p>" : "") +
      "</div>";
  }
  function legendHTML(items) {
    return items.map(function (it) {
      return '<span class="legend-item"><span class="dot" style="background:' + it.color + ";box-shadow:0 0 10px " + it.color + '"></span>' + it.label + "</span>";
    }).join("");
  }
  function sliderHTML(id, label, min, max, step, value, display) {
    var p = ((value - min) / (max - min)) * 100;
    return '<div class="slider" style="margin-top:4px">' +
      '<div class="slider-head"><label for="' + id + '">' + label + '</label><span class="val" id="' + id + '-val">' + display + "</span></div>" +
      '<input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '" aria-label="' + label.replace(/<[^>]*>/g, "") + '" style="--p:' + p + '%">' +
      "</div>";
  }
  function setSlider(input, value, display) {
    var min = parseFloat(input.min), max = parseFloat(input.max);
    input.value = value;
    input.style.setProperty("--p", (((value - min) / (max - min)) * 100) + "%");
    if (display != null) {
      var el = document.getElementById(input.id + "-val");
      if (el) el.textContent = display;
    }
  }

  /* ==================================================================
   * 6. Vista: Inicio
   * ================================================================== */
  function renderInicio(root) {
    var heroVec = blochVector(KET["+i"]);
    root.innerHTML =
      '<div class="container">' +
        '<div class="hero">' +
          "<div>" +
            '<span class="pill">Módulo 1 · Hackathon Quantum Unlocked</span>' +
            '<h1 class="title" style="margin-top:18px">Entendiendo los <span class="grad">errores cuánticos</span></h1>' +
            '<p class="lead">Un recorrido visual y matemáticamente riguroso por los errores de Pauli: cómo transforman un cúbit, por qué forman una base completa y cómo reconocerlos sobre la esfera de Bloch.</p>' +
            '<div class="cta" style="margin-top:22px">' +
              '<a class="btn primary" href="#/errores">Empezar el módulo →</a>' +
              '<a class="btn" href="#/reto">Ir directo al reto</a>' +
            "</div>" +
          "</div>" +
          '<div class="bloch-wrap" style="height:min(52vh,440px)"><canvas id="hero-canvas" aria-label="Esfera de Bloch mostrando el estado |+i⟩"></canvas><div class="bloch-legend">' + legendHTML([{ color: PALETTE.original, label: "Estado |+i⟩" }]) + '</div><div class="bloch-hint">arrastra para rotar</div></div>' +
        "</div>" +

        '<div class="section-title">Recorrido del módulo</div>' +
        '<div class="cards">' +
          '<a class="card" href="#/errores"><span class="mono" style="color:#56e1ff;font-size:12px;letter-spacing:.16em">01</span><h3>Errores de Pauli</h3><p class="muted" style="font-size:14px;line-height:1.6;margin:0">Explora un cúbit sobre la esfera de Bloch y aplica los errores X, Y y Z. Cada operador es una rotación de π.</p><span style="color:var(--accent);font-size:13px">Abrir sección →</span></a>' +
          '<a class="card" href="#/base"><span class="mono" style="color:#7f9dff;font-size:12px;letter-spacing:.16em">02</span><h3>La base de Pauli</h3><p class="muted" style="font-size:14px;line-height:1.6;margin:0">Comprueba por qué cuatro matrices bastan para escribir cualquier operador de un cúbit.</p><span style="color:var(--accent);font-size:13px">Abrir sección →</span></a>' +
          '<a class="card" href="#/reto"><span class="mono" style="color:#ffc857;font-size:12px;letter-spacing:.16em">03</span><h3>Reto interactivo</h3><p class="muted" style="font-size:14px;line-height:1.6;margin:0">Se aplica un error secreto a un estado aleatorio. ¿Puedes deducir cuál fue?</p><span style="color:var(--accent);font-size:13px">Abrir sección →</span></a>' +
        "</div>" +

        '<div class="section-title">¿Qué aprenderás?</div>' +
        '<div class="notes two">' +
          '<div><ul class="check">' +
            "<li>Qué es un estado puro y cómo se representa en la esfera de Bloch.</li>" +
            "<li>Cómo actúan los operadores X, Y y Z como rotaciones de π.</li>" +
            "<li>Por qué {I, X, Y, Z} es una base de todos los operadores de un cúbit.</li>" +
            "<li>La diferencia entre una fase global (inobservable) y una fase relativa.</li>" +
            "<li>Cómo distinguir errores discretos de un canal de ruido general.</li>" +
          "</ul></div>" +
          "<div class=\"stack\">" +
            '<div class="note insight"><span class="tag">Rigor primero</span>Cada animación se calcula a partir del operador real sobre el estado. La esfera no dibuja resultados “a mano”: renderiza el vector de Bloch que se obtiene de aplicar la matriz.</div>' +
            '<div class="note info"><span class="tag">Pensado para aprender</span>La interfaz está completamente en español y funciona con ratón, teclado y pantalla táctil. Arrastra la esfera para rotarla.</div>' +
          "</div>" +
        "</div>" +
      "</div>";

    var canvas = qs(root, "#hero-canvas");
    var bs = new BlochSphere(canvas, { autoRotate: true });
    bs.setArrows([{ id: "hero", color: PALETTE.original, vector: [heroVec.x, heroVec.y, heroVec.z] }]);
    bs.start();
    return function () { bs.stop(); };
  }

  /* ==================================================================
   * 7. Vista: Errores de Pauli (Sección 1)
   * ================================================================== */
  function renderErrores(root) {
    var presets = ["0", "1", "+", "-", "+i", "-i"];
    var state = { baseKey: "0", theta: 0, phi: 0, ops: [] };

    root.innerHTML =
      '<div class="container">' +
        '<p class="eyebrow">Sección 1 · Errores de Pauli</p>' +
        '<h1 class="title">Entendiendo los errores de Pauli</h1>' +
        '<p class="lead">Un cúbit vive en una esfera. Antes de corregir errores hay que entender qué le hacen: cada error de Pauli es una <strong style="color:var(--ink)">rotación de π</strong> de la esfera alrededor de un eje.</p>' +
        '<div class="equation">|ψ⟩ = cos(θ/2) |0⟩ + e<sup>iφ</sup> sin(θ/2) |1⟩</div>' +
        '<div class="grid-2" style="margin-top:8px">' +
          '<div class="sticky-col"><div class="bloch-wrap"><canvas id="s1-canvas" aria-label="Esfera de Bloch con el estado original y el transformado"></canvas><div class="bloch-legend" id="s1-legend"></div><div class="bloch-hint">arrastra para rotar</div></div></div>' +
          '<div class="stack">' +
            '<div class="panel"><h2>1. Elige el estado inicial</h2>' +
              '<div class="chip-row" id="s1-presets">' +
                presets.map(function (k) { return '<button class="chip" data-state="' + k + '">' + STATE_LABELS[k] + "</button>"; }).join("") +
                '<button class="chip" data-state="custom">Personalizado</button>' +
              "</div>" +
              '<div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px" id="s1-sliders"></div>' +
            "</div>" +
            '<div class="panel"><h2>2. Aplica un error de Pauli</h2>' +
              '<div class="err-grid" id="s1-errors">' +
                ["X", "Y", "Z"].map(function (n) { return '<button class="err-btn" data-error="' + n + '"><span class="sym" style="color:' + PAULI_INFO[n].color + '">' + n + '</span><span class="sub">' + PAULI_INFO[n].title + "</span></button>"; }).join("") +
              "</div>" +
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--line);margin-top:14px;padding-top:14px">' +
                '<p class="faint" style="font-size:12px;margin:0">Operador compuesto: <span class="mono muted" id="s1-history">|ψ⟩</span></p>' +
                '<button class="btn ghost" id="s1-reset">Reiniciar</button>' +
              "</div>" +
            "</div>" +
            '<div class="panel"><h2>3. Lee la transformación</h2><div id="s1-matrix"></div></div>' +
          "</div>" +
        "</div>" +
        '<div class="section-title">Comparación de estados</div>' +
        '<div class="notes two"><div id="s1-readout-initial"></div><div id="s1-readout-current"></div></div>' +
        '<div id="s1-note" style="margin-top:16px"></div>' +
        '<div class="notes two" style="margin-top:16px">' +
          '<div class="note insight"><span class="tag">Idea clave</span>Los operadores X, Y y Z son unitarios y hermíticos. Aplicarlos equivale a girar el vector de Bloch π radianes alrededor del eje X, Y o Z. Estas cuatro matrices forman una base de <em>todos</em> los operadores de un cúbit.</div>' +
          '<div class="note info"><span class="tag">Fases globales</span>La esfera de Bloch no distingue fases globales: si dos estados sólo difieren en un factor e<sup>iγ</sup>, ocupan el mismo punto. Por eso, aplicar Z a |0⟩ no cambia nada visible.</div>' +
        "</div>" +
      "</div>";

    // Sliders (creados una vez)
    qs(root, "#s1-sliders").innerHTML =
      sliderHTML("s1-theta", "θ · polar [0, π]", 0, Math.PI, 0.01, 0, "0 (0°)") +
      sliderHTML("s1-phi", "φ · azimutal [0, 2π]", 0, TAU, 0.01, 0, "0 (0°)");

    var thetaInput = qs(root, "#s1-theta");
    var phiInput = qs(root, "#s1-phi");
    var canvas = qs(root, "#s1-canvas");
    var bs = new BlochSphere(canvas);
    var current = { initial: null, photo: null };

    function presetSpherical(key) {
      var bl = blochVector(KET[key]);
      return blochToSpherical(bl);
    }
    function selectPreset(key) {
      state.baseKey = key;
      state.ops = [];
      if (key !== "custom") {
        var sp = presetSpherical(key);
        state.theta = sp.theta;
        state.phi = sp.phi;
      }
      update();
    }
    function update() {
      var initial = state.baseKey === "custom" ? ketState(state.theta, state.phi) : KET[state.baseKey];
      var totalOp = composeOperator(state.ops);
      var cur = matVec(totalOp, initial);
      var vI = blochVector(initial), vC = blochVector(cur);
      bs.setArrows([
        { id: "original", color: PALETTE.original, vector: [vI.x, vI.y, vI.z] },
        { id: "current", color: PALETTE.transformed, vector: [vC.x, vC.y, vC.z] },
      ]);
      qs(root, "#s1-legend").innerHTML = legendHTML([{ color: PALETTE.original, label: "Estado original" }, { color: PALETTE.transformed, label: "Estado actual" }]);

      qsa(root, "#s1-presets .chip").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-state") === state.baseKey);
      });
      setSlider(thetaInput, state.theta, fmtPi(state.theta) + " (" + radToDeg(state.theta).toFixed(0) + "°)");
      setSlider(phiInput, state.phi, fmtPi(state.phi) + " (" + radToDeg(state.phi).toFixed(0) + "°)");

      var last = state.ops.length ? state.ops[state.ops.length - 1] : null;
      var box = qs(root, "#s1-matrix");
      if (last) {
        var info = PAULI_INFO[last];
        var html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span class="mono" style="font-size:18px;font-weight:600;color:' + info.color + '">' + last + '</span><span class="muted" style="font-size:14px">' + info.title + "</span></div>";
        html += matrixHTML(PAULI[last], last + " =", { digits: 0, highlight: true, color: info.color });
        html += '<p class="muted" style="font-size:14px;line-height:1.6;margin-top:12px">' + info.effect + "</p>";
        html += '<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:12px;background:rgba(7,9,18,.5)">' +
          '<div class="kv"><span>En la esfera</span><b style="color:' + info.color + '">' + info.map + "</b></div>" +
          '<div class="kv"><span>Tipo de rotación</span><b>π alrededor del eje ' + last + "</b></div></div>";
        if (state.ops.length > 1) {
          html += '<div style="margin-top:14px"><span class="faint" style="font-size:10px;text-transform:uppercase;letter-spacing:.16em">operador compuesto</span><div style="margin-top:6px">' + matrixHTML(totalOp, "", { digits: 3 }) + "</div></div>";
        }
        box.innerHTML = html;
      } else {
        box.innerHTML = '<p class="muted" style="font-size:14px;line-height:1.7;margin:0">Aún no has aplicado ningún error. Cada botón aplica un operador unitario y hermítico sobre el estado actual.</p>';
      }

      qs(root, "#s1-history").textContent = state.ops.length ? state.ops.slice().reverse().join(" ∘ ") + " |ψ⟩" : "|ψ⟩";
      qs(root, "#s1-reset").disabled = state.ops.length === 0;

      qs(root, "#s1-readout-initial").innerHTML = readoutHTML("Estado original", initial, PALETTE.original, "Las amplitudes incluyen la fase global, que no se observa.");
      qs(root, "#s1-readout-current").innerHTML = readoutHTML("Estado actual", cur, PALETTE.transformed, null);

      var noChange = state.ops.length > 0 && equivalent(initial, cur);
      qs(root, "#s1-note").innerHTML = noChange
        ? '<div class="note warn"><span class="tag">Mismo estado físico</span>El vector de Bloch no cambió: el estado actual difiere del original sólo en una <strong>fase global</strong>, que no es observable. Por eso la esfera muestra ambos vectores superpuestos.</div>'
        : "";
    }

    qsa(root, "#s1-presets .chip").forEach(function (b) {
      b.addEventListener("click", function () { selectPreset(b.getAttribute("data-state")); });
    });
    qsa(root, "#s1-errors .err-btn").forEach(function (b) {
      b.addEventListener("click", function () { state.ops.push(b.getAttribute("data-error")); update(); });
    });
    qs(root, "#s1-reset").addEventListener("click", function () { state.ops = []; update(); });
    thetaInput.addEventListener("input", function () { state.baseKey = "custom"; state.theta = parseFloat(thetaInput.value); update(); });
    phiInput.addEventListener("input", function () { state.baseKey = "custom"; state.phi = parseFloat(phiInput.value); update(); });

    bs.start();
    selectPreset("0");
    return function () { bs.stop(); };
  }

  /* ==================================================================
   * 8. Vista: Base de Pauli (Sección 2)
   * ================================================================== */
  function renderBase(root) {
    var angles = [
      { label: "0", v: 0 }, { label: "π/2", v: Math.PI / 2 }, { label: "π", v: Math.PI },
      { label: "3π/2", v: (3 * Math.PI) / 2 }, { label: "2π", v: TAU },
    ];
    var state = { baseKey: "+", axisKey: "z", axisTheta: Math.PI / 3, axisPhi: Math.PI / 4, angle: Math.PI / 2 };

    root.innerHTML =
      '<div class="container">' +
        '<p class="eyebrow">Sección 2 · Base de Pauli</p>' +
        '<h1 class="title">Por qué los operadores de Pauli forman una base</h1>' +
        '<p class="lead">No hace falta un catálogo infinito de errores: <em>cualquier</em> operador sobre un cúbit se escribe como combinación de sólo cuatro matrices.</p>' +
        '<div class="equation">E = a·I + b·X + c·Y + d·Z</div>' +
        '<div class="basis-grid">' +
          ["I", "X", "Y", "Z"].map(function (n) {
            return '<div class="panel basis-card">' + matrixHTML(PAULI[n], n + " =", { digits: 0, highlight: true }) + "<small>" + BASIS_DESCRIPTION[n] + "</small></div>";
          }).join("") +
        "</div>" +
        '<div class="notes" style="margin-top:18px"><div class="note insight"><span class="tag">¿Por qué cuatro?</span>Las matrices de Pauli son ortogonales bajo el producto interno de Hilbert–Schmidt Tr(σᵢσⱼ) = 2δᵢⱼ y tienen traza nula (salvo I). Eso las convierte en una base del espacio de matrices 2×2, que es 4-dimensional.</div></div>' +
        '<div class="grid-2" style="margin-top:24px">' +
          '<div class="sticky-col"><div class="bloch-wrap"><canvas id="s2-canvas" aria-label="Esfera de Bloch con el estado base, el rotado y el eje de rotación"></canvas><div class="bloch-legend" id="s2-legend"></div><div class="bloch-hint">arrastra para rotar</div></div></div>' +
          '<div class="stack">' +
            '<div class="panel"><h2>1. Estado base</h2><div class="chip-row" id="s2-base">' +
              ["0", "1", "+", "-", "+i", "-i"].map(function (k) { return '<button class="chip" data-state="' + k + '">' + STATE_LABELS[k] + "</button>"; }).join("") +
            "</div></div>" +
            '<div class="panel"><h2>2. Eje y ángulo de rotación</h2>' +
              '<div class="chip-row" id="s2-axes">' +
                [["x", "X"], ["y", "Y"], ["z", "Z"], ["custom", "Personalizado"]].map(function (a) { return '<button class="chip" data-axis="' + a[0] + '">' + a[1] + "</button>"; }).join("") +
              "</div>" +
              '<div id="s2-axis-custom" style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px"></div>' +
              '<div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px" id="s2-angle-wrap"></div>' +
              '<div class="chip-row" id="s2-shortcuts" style="margin-top:10px">' +
                angles.map(function (a) { return '<button class="chip" data-angle="' + a.v + '">' + a.label + "</button>"; }).join("") +
              "</div>" +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="grid-2" style="margin-top:22px">' +
          '<div class="panel"><h2>Operador de rotación</h2><div id="s2-op"></div><p class="muted" style="font-size:14px;line-height:1.6;margin:14px 0 0">Con el eje unitario n = (nₓ, n_y, n_z):</p><div class="equation">U = cos(α/2)·I − i·sin(α/2)·(nₓX + n_y Y + n_z Z)</div></div>' +
          '<div class="panel"><h2>Descomposición en la base de Pauli</h2><div id="s2-coefs"></div><p class="faint" style="font-size:12px;line-height:1.6;margin-top:12px">Para una rotación, a = cos(α/2) y b, c, d = −i·sin(α/2)·n. A α = π sólo sobrevive el término del eje elegido: recuperamos un Pauli salvo fase global.</p></div>' +
        "</div>" +
        '<div id="s2-note" class="notes" style="margin-top:16px"></div>' +
        '<div class="notes two" style="margin-top:16px">' +
          '<div class="note insight"><span class="tag">Combinación ≠ aplicación</span><strong>E = aI + bX + cY + dZ</strong> es una suma de operadores (combinación lineal). Aplicar operadores <em>en secuencia</em> es un producto: X·Y = iZ ≠ X + Y.</div>' +
          '<div class="note info"><span class="tag">Operadores vs. canales</span>Un único Pauli describe un error discreto y coherente. El ruido real suele ser un <em>canal cuántico</em> (mezcla probabilística de Paulis). La base de Pauli permite describirlo, pero un solo Pauli no modela todo el ruido.</div>' +
        "</div>" +
      "</div>";

    qs(root, "#s2-axis-custom").innerHTML =
      sliderHTML("s2-ax-theta", "θ del eje", 0, Math.PI, 0.01, state.axisTheta, fmtPi(state.axisTheta)) +
      sliderHTML("s2-ax-phi", "φ del eje", 0, TAU, 0.01, state.axisPhi, fmtPi(state.axisPhi));
    qs(root, "#s2-angle-wrap").innerHTML = sliderHTML("s2-angle", "α · ángulo de rotación", 0, TAU, 0.005, state.angle, fmtPi(state.angle));

    var axTheta = qs(root, "#s2-ax-theta"), axPhi = qs(root, "#s2-ax-phi"), angleInput = qs(root, "#s2-angle");
    var canvas = qs(root, "#s2-canvas");
    var bs = new BlochSphere(canvas);

    function axisVector() {
      if (state.axisKey === "x") return { x: 1, y: 0, z: 0 };
      if (state.axisKey === "y") return { x: 0, y: 1, z: 0 };
      if (state.axisKey === "z") return { x: 0, y: 0, z: 1 };
      return normalizeAxis({ x: Math.sin(state.axisTheta) * Math.cos(state.axisPhi), y: Math.sin(state.axisTheta) * Math.sin(state.axisPhi), z: Math.cos(state.axisTheta) });
    }
    function update() {
      var axis = axisVector();
      var baseState = KET[state.baseKey];
      var op = rotationOperator(axis, state.angle);
      var coeffs = pauliDecomposition(op);
      var rotated = matVec(op, baseState);
      var vB = blochVector(baseState), vR = blochVector(rotated);
      bs.setArrows([
        { id: "axis", color: "#94a3b8", opacity: 0.5, vector: [axis.x, axis.y, axis.z] },
        { id: "base", color: PALETTE.original, vector: [vB.x, vB.y, vB.z] },
        { id: "rotated", color: PALETTE.transformed, vector: [vR.x, vR.y, vR.z] },
      ]);
      qs(root, "#s2-legend").innerHTML = legendHTML([{ color: PALETTE.original, label: "Estado base" }, { color: PALETTE.transformed, label: "Estado rotado" }, { color: "#94a3b8", label: "Eje de rotación" }]);

      qsa(root, "#s2-base .chip").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-state") === state.baseKey); });
      qsa(root, "#s2-axes .chip").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-axis") === state.axisKey); });
      qsa(root, "#s2-shortcuts .chip").forEach(function (b) { b.classList.toggle("active", Math.abs(parseFloat(b.getAttribute("data-angle")) - state.angle) < 0.01); });
      qs(root, "#s2-axis-custom").style.display = state.axisKey === "custom" ? "block" : "none";
      setSlider(axTheta, state.axisTheta, fmtPi(state.axisTheta) + " (" + radToDeg(state.axisTheta).toFixed(0) + "°)");
      setSlider(axPhi, state.axisPhi, fmtPi(state.axisPhi) + " (" + radToDeg(state.axisPhi).toFixed(0) + "°)");
      setSlider(angleInput, state.angle, fmtPi(state.angle) + " (" + radToDeg(state.angle).toFixed(0) + "°)");

      qs(root, "#s2-op").innerHTML = matrixHTML(op, "U =", { digits: 3, highlight: true, color: PALETTE.transformed });
      qs(root, "#s2-coefs").innerHTML =
        '<div class="coef-box">' +
          '<div><span class="label">a = </span>' + fmtC(coeffs.a) + "</div>" +
          '<div><span class="label">b = </span>' + fmtC(coeffs.b) + "</div>" +
          '<div><span class="label">c = </span>' + fmtC(coeffs.c) + "</div>" +
          '<div><span class="label">d = </span>' + fmtC(coeffs.d) + "</div>" +
          '<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px;font-size:12px;color:var(--muted)">E = a·I + b·X + c·Y + d·Z</div>' +
        "</div>";

      var delta = Math.hypot(vB.x - vR.x, vB.y - vR.y, vB.z - vR.z);
      var isEigen = state.angle > 1e-3 && delta < 1e-6;
      var nearPi = Math.abs(state.angle - Math.PI) < 0.02;
      var notes = "";
      if (nearPi) notes += '<div class="note good"><span class="tag">Caso discreto</span>Con α = π, la rotación es U = −i(nₓX + n_y Y + n_z Z). Contiene toda la información de un Pauli, pero aparece con la fase global −i.</div>';
      if (isEigen) notes += '<div class="note warn"><span class="tag">Sin cambio visible</span>El estado base es un autoestado para este eje y ángulo: la rotación sólo añade una fase global y el vector de Bloch no se mueve.</div>';
      qs(root, "#s2-note").innerHTML = notes;
    }

    qsa(root, "#s2-base .chip").forEach(function (b) { b.addEventListener("click", function () { state.baseKey = b.getAttribute("data-state"); update(); }); });
    qsa(root, "#s2-axes .chip").forEach(function (b) { b.addEventListener("click", function () { state.axisKey = b.getAttribute("data-axis"); update(); }); });
    qsa(root, "#s2-shortcuts .chip").forEach(function (b) { b.addEventListener("click", function () { state.angle = parseFloat(b.getAttribute("data-angle")); update(); }); });
    axTheta.addEventListener("input", function () { state.axisTheta = parseFloat(axTheta.value); update(); });
    axPhi.addEventListener("input", function () { state.axisPhi = parseFloat(axPhi.value); update(); });
    angleInput.addEventListener("input", function () { state.angle = parseFloat(angleInput.value); update(); });

    bs.start();
    update();
    return function () { bs.stop(); };
  }

  /* ==================================================================
   * 9. Vista: Reto de errores (Sección 3)
   * ================================================================== */
  function renderReto(root) {
    var game = { challenge: null, chosen: null, revealed: false, correct: 0, total: 0, streak: 0, round: 0 };

    root.innerHTML =
      '<div class="container">' +
        '<p class="eyebrow">Sección 3 · Reto interactivo</p>' +
        '<h1 class="title">¿Qué error sufrió este qubit?</h1>' +
        '<p class="lead">Se genera un estado puro aleatorio y se le aplica un error <em>secreto</em> entre I, X, Y o Z. Compara el estado inicial (cian) con el final (ámbar) y deduce qué operador actuó.</p>' +
        '<div class="stats" style="margin-top:22px">' +
          '<div class="stat"><div class="k">Aciertos</div><div class="v" id="r-score" style="color:#56e1ff">0 / 0</div><div class="h">Respuestas correctas</div></div>' +
          '<div class="stat"><div class="k">Precisión</div><div class="v" id="r-acc">0%</div><div class="h">Sobre el total</div></div>' +
          '<div class="stat"><div class="k">Racha</div><div class="v" id="r-streak" style="color:#ffc857">0</div><div class="h">Aciertos consecutivos</div></div>' +
        "</div>" +
        '<div class="grid-2" style="margin-top:22px">' +
          '<div class="sticky-col"><div class="bloch-wrap" style="height:min(58vh,540px)"><canvas id="r-canvas" aria-label="Esfera de Bloch con el estado inicial y el final"></canvas><div class="bloch-legend" id="r-legend"></div><div class="bloch-hint">arrastra para rotar</div></div></div>' +
          '<div class="stack">' +
            '<div class="panel"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px"><h2 style="margin:0">¿Qué error sufrió este qubit?</h2><button class="btn ghost" id="r-restart">Reiniciar</button></div>' +
              '<div class="answers" id="r-answers">' +
                PAULI_NAMES.map(function (n) { return '<button class="answer" data-answer="' + n + '"><span class="sym">' + n + '</span><span class="sub">' + PAULI_INFO[n].title + "</span></button>"; }).join("") +
              "</div>" +
              '<p class="faint" id="r-hint" style="font-size:12px;line-height:1.6;margin:14px 0 0">Pista: cada error de Pauli gira el vector π radianes alrededor de un eje. Observa hacia dónde saltó el punto.</p>' +
              '<div id="r-next" style="margin-top:14px"></div>' +
            "</div>" +
            '<div id="r-feedback"></div>' +
          "</div>" +
        "</div>" +
      "</div>";

    var canvas = qs(root, "#r-canvas");
    var bs = new BlochSphere(canvas);

    function arrows() {
      var c = game.challenge;
      if (!c) return [];
      var vI = blochVector(c.initial), vF = blochVector(c.final);
      var iv = [vI.x, vI.y, vI.z], fv = [vF.x, vF.y, vF.z];
      return [
        { id: "initial", color: PALETTE.original, vector: iv },
        {
          id: game.revealed ? "final-" + game.round : "final",
          color: PALETTE.error,
          opacity: game.revealed ? 1 : 0.85,
          vector: fv,
          from: game.revealed ? iv : null,
        },
      ];
    }
    function update() {
      bs.setArrows(arrows());
      qs(root, "#r-legend").innerHTML = legendHTML([{ color: PALETTE.original, label: "Estado inicial" }, { color: PALETTE.error, label: "Estado final" }]);
      qs(root, "#r-score").textContent = game.correct + " / " + game.total;
      qs(root, "#r-acc").textContent = (game.total ? Math.round((game.correct / game.total) * 100) : 0) + "%";
      qs(root, "#r-streak").textContent = String(game.streak);
      qsa(root, "#r-answers .answer").forEach(function (b) {
        var n = b.getAttribute("data-answer");
        b.disabled = game.revealed;
        b.classList.remove("correct", "wrong", "dim");
        if (game.revealed) {
          if (n === game.challenge.error) b.classList.add("correct");
          else if (n === game.chosen) b.classList.add("wrong");
          else b.classList.add("dim");
        }
      });
      qs(root, "#r-hint").style.display = game.revealed ? "none" : "block";
      qs(root, "#r-next").innerHTML = game.revealed ? '<button class="btn primary" id="r-next-btn" style="width:100%">Otro reto →</button>' : "";
      if (game.revealed) qs(root, "#r-next-btn").addEventListener("click", newChallenge);

      var fb = qs(root, "#r-feedback");
      if (game.revealed) {
        var info = PAULI_INFO[game.challenge.error];
        var vI = blochVector(game.challenge.initial), vF = blochVector(game.challenge.final);
        var ok = game.chosen === game.challenge.error;
        var head = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:17px;font-weight:600;color:' + (ok ? "var(--good)" : "var(--bad)") + '">' + (ok ? "✓ ¡Correcto!" : "✗ Casi…") + "</div>";
        var text = ok
          ? "Identificaste bien el error: fue <strong style=\"color:" + info.color + '">' + game.challenge.error + "</strong> (" + info.title + ")."
          : "Elegiste <strong>" + game.chosen + "</strong>, pero el error fue <strong style=\"color:" + info.color + '">' + game.challenge.error + "</strong> (" + info.title + ").";
        fb.innerHTML = '<div class="panel" style="border-color:' + (ok ? "rgba(74,222,128,.4)" : "rgba(248,113,113,.4)") + '">' + head +
          '<p class="muted" style="font-size:14px;line-height:1.6;margin:0">' + text + "</p>" +
          '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-top:16px">' +
            matrixHTML(PAULI[game.challenge.error], game.challenge.error + " =", { digits: 0, highlight: true, color: info.color }) +
            '<span class="mono" style="font-size:12px;border:1px solid var(--line);border-radius:8px;padding:8px 12px;background:rgba(7,9,18,.5);color:' + info.color + '">' + info.map + "</span>" +
          "</div>" +
          '<div style="margin-top:16px">' +
            '<div class="kv"><span>Estado inicial (x, y, z)</span><b>' + coordText(vI) + "</b></div>" +
            '<div class="kv"><span>Estado final (x, y, z)</span><b>' + coordText(vF) + "</b></div>" +
            '<div class="kv"><span>Verificación</span><b>' + game.challenge.error + "|ψ⟩ = |ψ′⟩</b></div>" +
          "</div>" +
          '<p class="faint" style="font-size:12px;line-height:1.6;margin:12px 0 0">' + (game.challenge.error === "I" ? "El vector no se movió: la identidad no aplica ningún cambio." : info.effect) + "</p>" +
        "</div>";
      } else fb.innerHTML = "";
    }
    function answer(n) {
      if (game.revealed || !game.challenge) return;
      game.chosen = n;
      game.revealed = true;
      game.round += 1;
      if (n === game.challenge.error) { game.correct += 1; game.streak += 1; } else { game.streak = 0; }
      game.total += 1;
      update();
    }
    function newChallenge() {
      game.challenge = generateChallenge(Math.random);
      game.chosen = null;
      game.revealed = false;
      game.round += 1;
      update();
    }
    function restart() {
      game.correct = 0; game.total = 0; game.streak = 0;
      newChallenge();
    }

    qsa(root, "#r-answers .answer").forEach(function (b) { b.addEventListener("click", function () { answer(b.getAttribute("data-answer")); }); });
    qs(root, "#r-restart").addEventListener("click", restart);

    bs.start();
    newChallenge();
    return function () { bs.stop(); };
  }

  /* ==================================================================
   * 10. Router (hash)
   * ================================================================== */
  var ROUTES = { "/": renderInicio, "/errores": renderErrores, "/base": renderBase, "/reto": renderReto };
  var cleanup = null;
  var app = document.getElementById("app");

  function updateNav(path) {
    qsa(document, "nav.main a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === path);
    });
  }
  function navigate() {
    if (cleanup) { cleanup(); cleanup = null; }
    var hash = (location.hash || "").replace(/^#/, "");
    var path = ROUTES[hash] ? hash : "/";
    updateNav(path);
    app.innerHTML = "";
    cleanup = ROUTES[path](app) || null;
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  window.addEventListener("hashchange", navigate);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", navigate);
  else navigate();
})();
