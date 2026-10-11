/*
 * surface.js — Rotated surface code, Pauli-frame model. Pure physics, no DOM.
 *
 * The model stores, for every data qubit, two bits (x, z): the Pauli error on
 * that qubit is I (0,0), X (1,0), Z (0,1) or Y (1,1), up to a global phase.
 * Multiplying Paulis is XOR of the bits. Measuring a stabilizer only needs the
 * parity of anticommuting bits on its support.
 *
 * This is EXACT for Pauli errors and Pauli corrections (which is all this
 * module uses), but it is NOT a universal quantum simulator: it does not track
 * amplitudes, superpositions of errors or non-Clifford gates. It runs locally
 * in the browser; nothing here runs on quantum hardware.
 *
 * Geometry (d odd):
 *   data qubit (r, c), 0 <= r, c <= d-1, index q = r*d + c
 *   face (i, j), 0 <= i, j <= d, touches the existing qubits among
 *     (i-1, j-1), (i-1, j), (i, j-1), (i, j)
 *   face type: X if (i + j) even, Z if odd
 *   kept: bulk faces (1 <= i, j <= d-1) of both types,
 *         top/bottom rows (i = 0 or d): X faces with 1 <= j <= d-1,
 *         left/right columns (j = 0 or d): Z faces with 1 <= i <= d-1.
 *   => d^2 - 1 stabilizers, half X and half Z.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Surface = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DISTANCES = [3, 5, 7];
  var latticeCache = {};

  function faceKept(d, i, j, type) {
    var bulk = i >= 1 && i <= d - 1 && j >= 1 && j <= d - 1;
    if (bulk) return true;
    if ((i === 0 || i === d) && j >= 1 && j <= d - 1) return type === 'X';
    if ((j === 0 || j === d) && i >= 1 && i <= d - 1) return type === 'Z';
    return false;
  }

  function buildLattice(d) {
    if (d % 2 !== 1 || d < 3) throw new Error('Distance must be an odd integer >= 3');
    if (latticeCache[d]) return latticeCache[d];

    var data = [];
    for (var r = 0; r < d; r++) {
      for (var c = 0; c < d; c++) data.push({ id: 'q' + (r * d + c), q: r * d + c, r: r, c: c });
    }

    var stabilizers = [];
    for (var i = 0; i <= d; i++) {
      for (var j = 0; j <= d; j++) {
        var type = (i + j) % 2 === 0 ? 'X' : 'Z';
        if (!faceKept(d, i, j, type)) continue;
        var qubits = [];
        [[i - 1, j - 1], [i - 1, j], [i, j - 1], [i, j]].forEach(function (rc) {
          if (rc[0] >= 0 && rc[0] < d && rc[1] >= 0 && rc[1] < d) qubits.push(rc[0] * d + rc[1]);
        });
        stabilizers.push({
          id: type + i + '_' + j,
          type: type,
          i: i,
          j: j,
          qubits: qubits,
          boundary: qubits.length === 2
        });
      }
    }

    // Logical operators through the middle of the patch (they cross on the centre qubit).
    var mid = (d - 1) / 2;
    var logicalX = [];
    var logicalZ = [];
    for (var k = 0; k < d; k++) {
      logicalX.push(k * d + mid); // X̄: one column, top -> bottom
      logicalZ.push(mid * d + k); // Z̄: one row, left -> right
    }

    var byId = {};
    stabilizers.forEach(function (s) { byId[s.id] = s; });

    var lattice = {
      d: d,
      n: d * d,
      data: data,
      stabilizers: stabilizers,
      byId: byId,
      logicalX: logicalX,
      logicalZ: logicalZ
    };
    latticeCache[d] = lattice;
    return lattice;
  }

  function emptyFrame(d) {
    return { x: new Uint8Array(d * d), z: new Uint8Array(d * d) };
  }

  function copyFrame(f) {
    return { x: new Uint8Array(f.x), z: new Uint8Array(f.z) };
  }

  var PAULI_BITS = { I: [0, 0], X: [1, 0], Y: [1, 1], Z: [0, 1] };

  // Multiply qubit q by Pauli P (XOR of bits). Returns a new frame.
  function applyPauli(frame, q, P) {
    var bits = PAULI_BITS[P];
    if (!bits) throw new Error('Unknown Pauli ' + P);
    var f = copyFrame(frame);
    f.x[q] ^= bits[0];
    f.z[q] ^= bits[1];
    return f;
  }

  function applyChain(frame, qs, P) {
    var f = frame;
    for (var k = 0; k < qs.length; k++) f = applyPauli(f, qs[k], P);
    return f;
  }

  // Replace the Pauli on qubit q (used by "erase" / "set" tools in the UI).
  function setPauli(frame, q, P) {
    var bits = PAULI_BITS[P];
    var f = copyFrame(frame);
    f.x[q] = bits[0];
    f.z[q] = bits[1];
    return f;
  }

  function pauliAt(frame, q) {
    var x = frame.x[q], z = frame.z[q];
    return x && z ? 'Y' : x ? 'X' : z ? 'Z' : 'I';
  }

  function compose(a, b) {
    var f = copyFrame(a);
    for (var q = 0; q < f.x.length; q++) {
      f.x[q] ^= b.x[q];
      f.z[q] ^= b.z[q];
    }
    return f;
  }

  function weight(frame) {
    var w = 0;
    for (var q = 0; q < frame.x.length; q++) if (frame.x[q] || frame.z[q]) w++;
    return w;
  }

  function isTrivial(frame) {
    return weight(frame) === 0;
  }

  // A Z-type face anticommutes with x bits, an X-type face with z bits.
  function syndrome(lattice, frame) {
    var values = {};
    var counts = {};
    var defects = [];
    lattice.stabilizers.forEach(function (s) {
      var bits = s.type === 'Z' ? frame.x : frame.z;
      var n = 0;
      for (var k = 0; k < s.qubits.length; k++) n += bits[s.qubits[k]];
      counts[s.id] = n;
      values[s.id] = n % 2 ? -1 : 1;
      if (n % 2) defects.push(s.id);
    });
    return { values: values, counts: counts, defects: defects };
  }

  // One tile's parity check, spelled out: which qubits it touches, the error
  // bit it reads on each (x bits for a Z-tile, z bits for an X-tile), their
  // sum, and the sum mod 2 (1 = alarm). Same rule as syndrome(), for teaching.
  function tileCount(lattice, frame, stabId) {
    var s = lattice.byId[stabId];
    if (!s) throw new Error('Unknown stabilizer ' + stabId);
    var src = s.type === 'Z' ? frame.x : frame.z;
    var bits = s.qubits.map(function (q) { return src[q]; });
    var sum = bits.reduce(function (a, b) { return a + b; }, 0);
    return { qubits: s.qubits.slice(), bits: bits, sum: sum, parity: sum % 2 };
  }

  // For a residual with zero syndrome: did it flip the logical qubit?
  // X̄ is flipped (an X-type logical acted) iff the x bits overlap Z̄ oddly;
  // Z̄ is flipped iff the z bits overlap X̄ oddly.
  function logicalStatus(lattice, residual) {
    var xo = 0, zo = 0;
    lattice.logicalZ.forEach(function (q) { xo += residual.x[q]; });
    lattice.logicalX.forEach(function (q) { zo += residual.z[q]; });
    return { xFlip: xo % 2 === 1, zFlip: zo % 2 === 1 };
  }

  // a and b differ by a product of stabilizers (same syndrome, same logical class).
  function isStabilizerEquivalent(lattice, a, b) {
    var r = compose(a, b);
    if (syndrome(lattice, r).defects.length) return false;
    var ls = logicalStatus(lattice, r);
    return !ls.xFlip && !ls.zFlip;
  }

  function stabilizerFrame(lattice, stab) {
    var f = emptyFrame(lattice.d);
    return applyChain(f, stab.qubits, stab.type);
  }

  function codeDistance(d) { return d; }
  function correctable(d) { return Math.floor((d - 1) / 2); }

  // Orthogonal neighbours of a data qubit.
  function neighbors(d, q) {
    var r = Math.floor(q / d), c = q % d, out = [];
    if (r > 0) out.push(q - d);
    if (r < d - 1) out.push(q + d);
    if (c > 0) out.push(q - 1);
    if (c < d - 1) out.push(q + 1);
    return out;
  }

  // Z-type faces shared by consecutive qubits of row r: the "ZZ parity checks"
  // that make a row look like a repetition code against X errors.
  function rowChecks(lattice, r) {
    var d = lattice.d, out = [];
    for (var c = 0; c < d - 1; c++) {
      var a = r * d + c, b = a + 1;
      lattice.stabilizers.forEach(function (s) {
        if (s.type === 'Z' && s.qubits.indexOf(a) >= 0 && s.qubits.indexOf(b) >= 0) out.push(s.id);
      });
    }
    return out;
  }

  // The 3-qubit repetition code of Module 2: checks Z1Z2 and Z2Z3 on x bits.
  function repetitionChecks(bits) {
    return [bits[0] ^ bits[1], bits[1] ^ bits[2]];
  }

  // Deterministic PRNG (mulberry32). Returns a function () -> [0, 1).
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Independent noise on every data qubit.
  //   'bitflip'      : X with probability p
  //   'depolarizing' : X, Y or Z each with probability p/3
  function sampleNoise(d, p, rng, model) {
    rng = rng || Math.random;
    model = model || 'bitflip';
    var f = emptyFrame(d);
    for (var q = 0; q < d * d; q++) {
      if (rng() >= p) continue;
      if (model === 'bitflip') {
        f.x[q] = 1;
      } else if (model === 'depolarizing') {
        var k = Math.floor(rng() * 3);
        if (k === 0) f.x[q] = 1;
        else if (k === 1) { f.x[q] = 1; f.z[q] = 1; }
        else f.z[q] = 1;
      } else {
        throw new Error('Unknown noise model ' + model);
      }
    }
    return f;
  }

  return {
    DISTANCES: DISTANCES,
    buildLattice: buildLattice,
    emptyFrame: emptyFrame,
    copyFrame: copyFrame,
    applyPauli: applyPauli,
    applyChain: applyChain,
    setPauli: setPauli,
    pauliAt: pauliAt,
    compose: compose,
    weight: weight,
    isTrivial: isTrivial,
    syndrome: syndrome,
    tileCount: tileCount,
    logicalStatus: logicalStatus,
    isStabilizerEquivalent: isStabilizerEquivalent,
    stabilizerFrame: stabilizerFrame,
    codeDistance: codeDistance,
    correctable: correctable,
    neighbors: neighbors,
    rowChecks: rowChecks,
    repetitionChecks: repetitionChecks,
    makeRng: makeRng,
    sampleNoise: sampleNoise
  };
});
