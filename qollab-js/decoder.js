/*
 * decoder.js — Minimum-weight perfect matching (MWPM) decoder for the rotated
 * surface code. Pure functions, no DOM.
 *
 * X errors are decoded from Z-type defects and Z errors from X-type defects,
 * independently, with the same routine (Y = X and Z together).
 *
 * Decoding graph for one face type T:
 *   nodes = faces of type T, plus one virtual "boundary" node;
 *   edges = data qubits. A qubit inside two T-faces joins them; a qubit inside
 *           only one T-face joins that face to the boundary. Every edge has weight 1.
 * A set of errors lights exactly the faces at the ends of its paths, so the
 * decoder pairs up the lit faces (or sends them to the boundary) as cheaply as
 * possible and flips the qubits along the chosen paths.
 */
(function (root, factory) {
  var Decoder = typeof module === 'object' && module.exports && typeof require === 'function'
    ? factory(require('./surface.js'))
    : factory(root.Surface);
  if (typeof module === 'object' && module.exports) module.exports = Decoder;
  root.Decoder = Decoder;
})(typeof self !== 'undefined' ? self : globalThis, function (Surface) {
  'use strict';

  var EXACT_LIMIT = 14; // bitmask DP up to 2^14 states per decode
  var graphCache = {};

  // ---------------------------------------------------------------- graph

  function buildDecodingGraph(lattice, faceType) {
    var key = lattice.d + faceType;
    if (graphCache[key]) return graphCache[key];

    var faces = lattice.stabilizers.filter(function (s) { return s.type === faceType; });
    var index = {};
    faces.forEach(function (s, k) { index[s.id] = k; });
    var B = faces.length; // boundary node
    var adj = [];
    for (var k = 0; k <= B; k++) adj.push([]);
    var edges = [];

    for (var q = 0; q < lattice.n; q++) {
      var touching = [];
      faces.forEach(function (s, k2) { if (s.qubits.indexOf(q) >= 0) touching.push(k2); });
      if (touching.length === 0 || touching.length > 2) {
        throw new Error('Qubit ' + q + ' is in ' + touching.length + ' ' + faceType + '-faces');
      }
      var a = touching[0];
      var b = touching.length === 2 ? touching[1] : B;
      edges.push({ a: a, b: b, q: q });
      adj[a].push({ to: b, q: q });
      adj[b].push({ to: a, q: q });
    }

    // All-pairs shortest paths by BFS (unit weights, tiny graphs).
    var N = B + 1;
    var dist = [], prevNode = [], prevQ = [];
    for (var s = 0; s < N; s++) {
      var ds = new Int32Array(N).fill(-1);
      var pn = new Int32Array(N).fill(-1);
      var pq = new Int32Array(N).fill(-1);
      ds[s] = 0;
      var queue = [s];
      for (var h = 0; h < queue.length; h++) {
        var u = queue[h];
        for (var e = 0; e < adj[u].length; e++) {
          var v = adj[u][e].to;
          if (ds[v] >= 0) continue;
          ds[v] = ds[u] + 1;
          pn[v] = u;
          pq[v] = adj[u][e].q;
          queue.push(v);
        }
      }
      dist.push(ds);
      prevNode.push(pn);
      prevQ.push(pq);
    }

    var g = {
      faceType: faceType,
      faces: faces,
      index: index,
      boundary: B,
      edges: edges,
      dist: dist,
      prevNode: prevNode,
      prevQ: prevQ
    };
    graphCache[key] = g;
    return g;
  }

  // Qubits along a shortest path from node s to node t, in order from s.
  function pathBetween(g, s, t) {
    var out = [];
    var v = t;
    while (v !== s) {
      out.push(g.prevQ[s][v]);
      v = g.prevNode[s][v];
      if (v < 0) throw new Error('Disconnected decoding graph');
    }
    return out.reverse();
  }

  // Public helper: shortest correction path between two faces of the same
  // type, or from a face to the boundary (b = 'boundary').
  function shortestPath(lattice, a, b) {
    var sa = lattice.byId[a];
    if (!sa) throw new Error('Unknown stabilizer ' + a);
    var g = buildDecodingGraph(lattice, sa.type);
    var t;
    if (b === 'boundary') t = g.boundary;
    else {
      var sb = lattice.byId[b];
      if (!sb || sb.type !== sa.type) throw new Error('Can only pair faces of the same type');
      t = g.index[b];
    }
    return pathBetween(g, g.index[a], t);
  }

  // Graph distance between two faces of the same type (or to 'boundary').
  function distance(lattice, a, b) {
    var sa = lattice.byId[a];
    var g = buildDecodingGraph(lattice, sa.type);
    var t = b === 'boundary' ? g.boundary : g.index[b];
    if (t === undefined) return Infinity;
    return g.dist[g.index[a]][t];
  }

  // ------------------------------------------------------------- matching
  // Both matchers take node indices of the defects and return
  // { pairs: [[i, j | -1]], cost } where i, j index into `nodes` and -1 = boundary.

  function matchExact(nodes, g) {
    var k = nodes.length;
    var size = 1 << k;
    var memo = new Float64Array(size).fill(-1);
    var choice = new Int8Array(size);
    var B = g.boundary;

    function solve(mask) {
      if (mask === 0) return 0;
      if (memo[mask] >= 0) return memo[mask];
      var i = 31 - Math.clz32(mask & -mask); // lowest unmatched defect
      var rest = mask & ~(1 << i);
      var best = g.dist[nodes[i]][B] + solve(rest);
      var ch = -1;
      for (var j = i + 1; j < k; j++) {
        if (!(rest & (1 << j))) continue;
        var c = g.dist[nodes[i]][nodes[j]] + solve(rest & ~(1 << j));
        if (c < best) { best = c; ch = j; }
      }
      memo[mask] = best;
      choice[mask] = ch;
      return best;
    }

    var full = size - 1;
    var cost = solve(full);
    var pairs = [];
    var mask = full;
    while (mask) {
      var i = 31 - Math.clz32(mask & -mask);
      var j = choice[mask];
      pairs.push([i, j]);
      mask &= ~(1 << i);
      if (j >= 0) mask &= ~(1 << j);
    }
    return { pairs: pairs, cost: cost };
  }

  function matchGreedy(nodes, g) {
    var B = g.boundary;
    var alive = nodes.map(function () { return true; });
    var left = nodes.length;
    var pairs = [];
    var cost = 0;
    while (left > 0) {
      var best = Infinity, bi = -1, bj = -1;
      for (var i = 0; i < nodes.length; i++) {
        if (!alive[i]) continue;
        var db = g.dist[nodes[i]][B];
        if (db < best) { best = db; bi = i; bj = -1; }
        for (var j = i + 1; j < nodes.length; j++) {
          if (!alive[j]) continue;
          var dij = g.dist[nodes[i]][nodes[j]];
          if (dij < best) { best = dij; bi = i; bj = j; }
        }
      }
      alive[bi] = false;
      left--;
      if (bj >= 0) { alive[bj] = false; left--; }
      pairs.push([bi, bj]);
      cost += best;
    }
    return { pairs: pairs, cost: cost };
  }

  // ------------------------------------------------------------- decoding

  // Decode the defects of one face type. Returns pairs with their paths.
  function decodeType(lattice, defectIds, faceType, forceGreedy) {
    var g = buildDecodingGraph(lattice, faceType);
    var nodes = defectIds.map(function (id) { return g.index[id]; });
    var exact = !forceGreedy && nodes.length <= EXACT_LIMIT;
    var m = exact ? matchExact(nodes, g) : matchGreedy(nodes, g);
    var pauli = faceType === 'Z' ? 'X' : 'Z';
    var pairs = m.pairs.map(function (p) {
      var a = nodes[p[0]];
      var b = p[1] >= 0 ? nodes[p[1]] : g.boundary;
      return {
        a: defectIds[p[0]],
        b: p[1] >= 0 ? defectIds[p[1]] : 'boundary',
        path: pathBetween(g, a, b),
        pauli: pauli
      };
    });
    return { pairs: pairs, cost: m.cost, algorithm: exact ? 'exact' : 'greedy' };
  }

  // Decode from the syndrome alone (list of lit stabilizer ids).
  function decodeSyndrome(lattice, defects, opts) {
    var forceGreedy = !!(opts && opts.greedy);
    var zDef = defects.filter(function (id) { return lattice.byId[id].type === 'Z'; });
    var xDef = defects.filter(function (id) { return lattice.byId[id].type === 'X'; });
    var rx = decodeType(lattice, zDef, 'Z', forceGreedy); // X corrections
    var rz = decodeType(lattice, xDef, 'X', forceGreedy); // Z corrections
    var correction = Surface.emptyFrame(lattice.d);
    var pairs = rx.pairs.concat(rz.pairs);
    pairs.forEach(function (p) { correction = Surface.applyChain(correction, p.path, p.pauli); });
    return {
      correction: correction,
      pairs: pairs,
      cost: rx.cost + rz.cost,
      algorithm: rx.algorithm === 'exact' && rz.algorithm === 'exact' ? 'exact' : 'greedy'
    };
  }

  function decode(lattice, frame, opts) {
    return decodeSyndrome(lattice, Surface.syndrome(lattice, frame).defects, opts);
  }

  // --------------------------------------------------------- Monte Carlo

  // n trials of: sample noise -> decode -> check the residual's logical class.
  function runTrials(d, p, model, n, rng) {
    var lattice = Surface.buildLattice(d);
    var failures = 0, greedy = 0, last = null;
    for (var t = 0; t < n; t++) {
      var errors = Surface.sampleNoise(d, p, rng, model);
      var dec = decode(lattice, errors);
      var residual = Surface.compose(errors, dec.correction);
      var ls = Surface.logicalStatus(lattice, residual);
      var failed = ls.xFlip || ls.zFlip;
      if (failed) failures++;
      if (dec.algorithm === 'greedy') greedy++;
      if (t === n - 1) last = { errors: errors, decoded: dec, residual: residual, failed: failed };
    }
    return { trials: n, failures: failures, greedy: greedy, last: last };
  }

  // Binomial standard error of a measured rate.
  function stdError(failures, trials) {
    if (!trials) return 0;
    var f = failures / trials;
    return Math.sqrt(f * (1 - f) / trials);
  }

  // Where does the larger code start losing? Series are [{p, f, se?}].
  // Returns the interpolated crossing p, or null if none is seen.
  // Differences are weighted by their standard error (when given), so noisy
  // points count less.
  function estimateCrossing(small, large) {
    var byP = {};
    small.forEach(function (s) { byP[s.p] = s; });
    var pts = large
      .filter(function (l) { return byP[l.p] !== undefined && (l.f > 0 || byP[l.p].f > 0); })
      .map(function (l) {
        var s = byP[l.p];
        var se = Math.sqrt((l.se || 0) * (l.se || 0) + (s.se || 0) * (s.se || 0));
        return { p: l.p, g: (l.f - s.f) / (se > 0 ? se : 1), raw: l.f - s.f };
      })
      .sort(function (a, b) { return a.p - b.p; });
    // Change-point estimate, robust to noise at both ends: choose the split k
    // that maximises (how much the larger code wins at p <= p_k) + (how much
    // it loses at p > p_k), then interpolate inside that interval.
    var best = -Infinity, bk = -1, left = 0, right = 0;
    var total = pts.reduce(function (s, x) { return s + x.g; }, 0);
    var prefix = 0;
    for (var k = 0; k < pts.length - 1; k++) {
      prefix += pts[k].g;
      var win = -prefix, lose = total - prefix;
      if (win + lose > best) { best = win + lose; bk = k; left = win; right = lose; }
    }
    if (bk < 0 || left <= 0 || right <= 0) return null;
    var a = pts[bk], b = pts[bk + 1];
    if (a.raw < 0 && b.raw >= 0) return a.p + (b.p - a.p) * (-a.raw) / (b.raw - a.raw);
    return (a.p + b.p) / 2;
  }

  return {
    EXACT_LIMIT: EXACT_LIMIT,
    buildDecodingGraph: buildDecodingGraph,
    shortestPath: shortestPath,
    distance: distance,
    matchExact: matchExact,
    matchGreedy: matchGreedy,
    decodeType: decodeType,
    decodeSyndrome: decodeSyndrome,
    decode: decode,
    runTrials: runTrials,
    stdError: stdError,
    estimateCrossing: estimateCrossing
  };
});
