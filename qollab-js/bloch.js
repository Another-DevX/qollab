/*!
 * Qollab · Platform — shared Bloch sphere (Canvas 2D) + data palette.
 * No dependencies. Exposes window.BlochSphere and window.qcPalette().
 */
(function (global) {
  "use strict";

  function isDark() { return document.documentElement.classList.contains("dark"); }

  /* Data palette (state vectors, axes, error). Mirrors the Module 1 palette. */
  function qcPalette() {
    return isDark()
      ? {
          original: "#7fb3e8", transformed: "#d98fb6", error: "#d7b06a",
          axisX: "#d08b84", axisY: "#7fbf9b", axisZ: "#8fb3e8",
          grid: "#7d8494", equator: "#c9cdd6", shell: "#8fb3e8", wire: "#525a6b",
        }
      : {
          original: "#2f5d8a", transformed: "#9a4f72", error: "#a9762f",
          axisX: "#b0524a", axisY: "#4a7d5a", axisZ: "#3f5f9a",
          grid: "#9aa0aa", equator: "#4b5566", shell: "#3f5f9a", wire: "#bcbfc7",
        };
  }

  function vAdd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function vScale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function vDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vCross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function vLen(a) { return Math.hypot(a[0], a[1], a[2]); }
  function vNorm(a) { var l = vLen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function finiteVec(v) { return v && v.length === 3 && isFinite(v[0]) && isFinite(v[1]) && isFinite(v[2]); }
  function slerp(a, b, t) {
    var d = clamp(vDot(a, b), -1, 1);
    if (d > 0.9995) return vNorm([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    var th = Math.acos(d), s = Math.sin(th);
    return vNorm(vAdd(vScale(a, Math.sin((1 - t) * th) / s), vScale(b, Math.sin(t * th) / s)));
  }
  var REDUCE = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function BlochSphere(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.view = { azim: 0.95, elev: 0.36, dist: 3.2 };
    this.arrows = []; this.running = false; this._attached = false; this._drag = false; this._last = [0, 0]; this._raf = 0;
    /* Caches so a frame never rebuilds static geometry, the camera basis or the
       sphere gradient; `_dirty` skips drawing entirely while nothing changes. */
    this._geo = {}; this._grad = null; this._gradKey = ""; this._dirty = true;
    var self = this;
    this._down = function (e) { self._drag = true; self._last = [e.clientX, e.clientY]; if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (x) {} } };
    this._move = function (e) { if (!self._drag) return; var dx = e.clientX - self._last[0], dy = e.clientY - self._last[1]; self._last = [e.clientX, e.clientY]; self.view.azim -= dx * 0.008; self.view.elev = clamp(self.view.elev + dy * 0.008, -1.35, 1.35); self._dirty = true; };
    this._up = function () { self._drag = false; };
    this._wheel = function (e) { e.preventDefault(); self.view.dist = clamp(self.view.dist + e.deltaY * 0.0015, 2.3, 5.5); self._dirty = true; };
    this._tick = function (now) { self._frame(now); };
    this.resize();
    if (global.ResizeObserver) { this._ro = new ResizeObserver(function () { self.resize(); }); this._ro.observe(canvas); }
  }
  BlochSphere.prototype.resize = function () {
    var dpr = Math.min(global.devicePixelRatio || 1, 2), r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height); this.dpr = dpr;
    var pw = Math.round(this.w * dpr), ph = Math.round(this.h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) { this.canvas.width = pw; this.canvas.height = ph; }
    this._dirty = true;
  };
  BlochSphere.prototype.setArrows = function (arrows) {
    var prev = {}, i; for (i = 0; i < this.arrows.length; i++) prev[this.arrows[i].id] = this.arrows[i];
    var next = [];
    for (i = 0; i < arrows.length; i++) {
      var a = arrows[i], old = prev[a.id];
      var tv = [a.vector && a.vector[0], a.vector && a.vector[1], a.vector && a.vector[2]];
      if (!finiteVec(tv) || vLen(tv) < 1e-9) tv = [0, 0, 1];
      var target = vNorm(tv);
      var current = (a.from && finiteVec(a.from) && vLen(a.from) > 1e-9) ? vNorm(a.from) : (old ? old.current : target);
      next.push({ id: a.id, color: a.color, opacity: a.opacity == null ? 1 : a.opacity, current: current, target: target });
    }
    this.arrows = next;
    this._dirty = true;
  };
  BlochSphere.prototype.start = function () {
    if (this.running) return; this.running = true;
    if (!this._attached) {
      this._attached = true;
      this.canvas.addEventListener("pointerdown", this._down);
      global.addEventListener("pointermove", this._move);
      global.addEventListener("pointerup", this._up);
      this.canvas.addEventListener("wheel", this._wheel, { passive: false });
    }
    this.resize(); this._last = performance.now(); this._raf = requestAnimationFrame(this._tick);
  };
  BlochSphere.prototype.stop = function () {
    this.running = false; if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0;
    if (this._attached) {
      this._attached = false;
      this.canvas.removeEventListener("pointerdown", this._down);
      global.removeEventListener("pointermove", this._move);
      global.removeEventListener("pointerup", this._up);
      this.canvas.removeEventListener("wheel", this._wheel);
    }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
  };
  BlochSphere.prototype._basis = function () {
    var v = this.view, ce = Math.cos(v.elev), se = Math.sin(v.elev), ca = Math.cos(v.azim), sa = Math.sin(v.azim);
    var z = vNorm([v.dist * ce * ca, v.dist * ce * sa, v.dist * se]);
    var x = vCross([0, 0, 1], z); if (vLen(x) < 1e-6) x = [1, 0, 0]; x = vNorm(x);
    return { x: x, y: vNorm(vCross(z, x)), z: z };
  };
  BlochSphere.prototype._project = function (p, b) {
    b = b || this._basis();
    var X = vDot(p, b.x), Y = vDot(p, b.y), Z = vDot(p, b.z);
    var persp = this.view.dist / Math.max(this.view.dist - Z, 0.25), r = Math.min(this.w, this.h) * 0.34;
    return { x: this.w / 2 + X * persp * r, y: this.h / 2 - Y * persp * r, z: Z };
  };
  BlochSphere.prototype._frame = function (now) {
    var dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    var t = REDUCE ? 1 : 1 - Math.exp(-dt * 7);
    var moving = false;
    for (var i = 0; i < this.arrows.length; i++) {
      var a = this.arrows[i];
      if (vLen([a.current[0] - a.target[0], a.current[1] - a.target[1], a.current[2] - a.target[2]]) > 1e-4) { a.current = slerp(a.current, a.target, t); moving = true; }
    }
    if (moving || this._dirty) { this._draw(); this._dirty = false; }
    if (this.running) this._raf = requestAnimationFrame(this._tick);
  };
  BlochSphere.prototype._strokeRun = function (run, front, back, width, sign) {
    if (run.length < 2) return;
    var c = this.ctx; c.beginPath(); c.moveTo(run[0].x, run[0].y);
    for (var j = 1; j < run.length; j++) c.lineTo(run[j].x, run[j].y);
    c.strokeStyle = sign >= 0 ? front : back; c.lineWidth = width; c.stroke();
  };
  BlochSphere.prototype._loop = function (pts, front, back, width, b) {
    var proj = [], i; for (i = 0; i < pts.length; i++) proj.push(this._project(pts[i], b)); proj.push(proj[0]);
    var run = [], sign = null;
    for (i = 0; i < proj.length; i++) {
      var s = proj[i].z >= 0 ? 1 : -1;
      if (sign === null) { sign = s; run.push(proj[i]); }
      else if (s !== sign) { run.push(proj[i]); this._strokeRun(run, front, back, width, sign); run = [proj[i]]; sign = s; }
      else run.push(proj[i]);
    }
    this._strokeRun(run, front, back, width, sign);
  };
  BlochSphere.prototype._circle = function (mode, value, segs) {
    var key = mode + value + "_" + segs, cached = this._geo[key];
    if (cached) return cached;
    var pts = [], i, a;
    if (mode === "lat") { var rr = Math.sqrt(Math.max(0, 1 - value * value)); for (i = 0; i <= segs; i++) { a = i / segs * Math.PI * 2; pts.push([Math.cos(a) * rr, Math.sin(a) * rr, value]); } }
    else for (i = 0; i <= segs; i++) { a = i / segs * Math.PI * 2; pts.push([Math.cos(a) * Math.cos(value), Math.cos(a) * Math.sin(value), Math.sin(value)]); }
    this._geo[key] = pts;
    return pts;
  };
  BlochSphere.prototype._draw = function () {
    var c = this.ctx, P = qcPalette();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    var cx = this.w / 2, cy = this.h / 2, r = Math.min(this.w, this.h) * 0.34;
    var b = this._basis();
    var gkey = this.dpr + "|" + Math.round(cx) + "," + Math.round(cy) + "," + Math.round(r);
    if (this._gradKey !== gkey) {
      var ball = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      ball.addColorStop(0, "rgba(150,175,225,0.14)"); ball.addColorStop(0.72, "rgba(150,175,225,0.05)"); ball.addColorStop(1, "rgba(150,175,225,0.10)");
      this._grad = ball; this._gradKey = gkey;
    }
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fillStyle = this._grad; c.fill();
    c.lineWidth = 1; c.strokeStyle = "rgba(140,160,200,0.35)"; c.stroke();
    var lats = [-0.66, -0.33, 0.33, 0.66], i;
    for (i = 0; i < lats.length; i++) this._loop(this._circle("lat", lats[i], 56), "rgba(140,160,200,0.30)", "rgba(140,160,200,0.10)", 0.8, b);
    this._loop(this._circle("lat", 0, 72), P.equator, "rgba(140,160,200,0.14)", 1.1, b);
    for (i = 0; i < 6; i++) this._loop(this._circle("lon", i * Math.PI / 6, 56), "rgba(140,160,200,0.22)", "rgba(140,160,200,0.08)", 0.7, b);
    var axes = [{ d: [1, 0, 0], c: P.axisX, l: "X" }, { d: [0, 1, 0], c: P.axisY, l: "Y" }, { d: [0, 0, 1], c: P.axisZ, l: "Z" }];
    for (i = 0; i < axes.length; i++) {
      var a = axes[i], p0 = this._project(vScale(a.d, -1.02), b), p1 = this._project(vScale(a.d, 1.02), b);
      c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y);
      c.strokeStyle = a.c; c.globalAlpha = 0.6; c.lineWidth = 1.3; c.stroke(); c.globalAlpha = 1;
      var lp = this._project(vScale(a.d, 1.3), b);
      c.font = "600 13px ui-monospace, Menlo, monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = a.c; c.fillText(a.l, lp.x, lp.y);
    }
    var o = this._project([0, 0, 0], b);
    c.beginPath(); c.arc(o.x, o.y, 2, 0, Math.PI * 2); c.fillStyle = "rgba(120,140,180,0.7)"; c.fill();
    for (i = 0; i < this.arrows.length; i++) {
      var ar = this.arrows[i], dir = vNorm(ar.current), tip = this._project(dir, b);
      var depth = (tip.z + 1) / 2, alpha = (ar.opacity == null ? 1 : ar.opacity) * (0.55 + 0.45 * depth);
      var dx = tip.x - o.x, dy = tip.y - o.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      c.globalAlpha = alpha;
      c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(tip.x, tip.y); c.strokeStyle = ar.color; c.lineWidth = 2.6; c.lineCap = "round"; c.stroke();
      var hl = 11, hw = 5.5, bx = tip.x - ux * hl, by = tip.y - uy * hl;
      c.beginPath(); c.moveTo(tip.x, tip.y); c.lineTo(bx - uy * hw, by + ux * hw); c.lineTo(bx + uy * hw, by - ux * hw); c.closePath(); c.fillStyle = ar.color; c.fill();
      c.beginPath(); c.arc(tip.x, tip.y, 3.2, 0, Math.PI * 2); c.fillStyle = ar.color; c.fill();
      c.globalAlpha = 1;
    }
  };

  global.BlochSphere = BlochSphere;
  global.qcPalette = qcPalette;
})(typeof window !== "undefined" ? window : globalThis);
