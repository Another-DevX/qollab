/*
 * game.js — "Be the decoder": a pure state machine (reducer), no DOM.
 *
 *   state' = Game.reduce(state, action)      (never mutates state)
 *   Game.view(state)                         derived values for rendering
 *
 * Phases: 'building' (hidden errors, visible alarms, player builds a
 * correction) -> 'revealed' (errors, correction and outcome are shown).
 * Randomness comes from a seeded generator, so rounds are reproducible.
 */
(function (root, factory) {
  // Prefer the globals set by surface.js / decoder.js (see decoder.js).
  var Surface = root.Surface, Decoder = root.Decoder;
  if ((!Surface || !Decoder) && typeof require === 'function' && typeof module === 'object' && module.exports) {
    Surface = Surface || require('./surface.js');
    Decoder = Decoder || require('./decoder.js');
  }
  var Game = factory(Surface, Decoder);
  if (typeof module === 'object' && module.exports) module.exports = Game;
  root.Game = Game;
})(typeof self !== 'undefined' ? self : globalThis, function (Surface, Decoder) {
  'use strict';

  var LEVELS = [
    { name: 'One error', d: 3, gen: 'single', hint: 'A single X or Z error is hiding somewhere.' },
    { name: 'Two errors', d: 3, gen: 'double', hint: 'Two errors. Careful: two can imitate one.' },
    { name: 'Short chains', d: 5, gen: 'chain', hint: 'Short strings of errors on a bigger grid.' },
    { name: 'Random noise', d: 5, gen: 'noise', p: 0.05, hint: 'Every qubit failed with probability 5%.' },
    { name: 'The big grid', d: 7, gen: 'noise', p: 0.05, hint: 'Distance 7, 5% noise on every qubit.' }
  ];

  var OUTCOME_TEXT = {
    corrected: 'Corrected',
    loop: 'Corrected up to a loop',
    logical: 'Logical error',
    uncleared: 'Syndrome not cleared'
  };

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  function randomWalk(d, len, rng) {
    var q = Math.floor(rng() * d * d);
    var path = [q];
    while (path.length < len) {
      var options = Surface.neighbors(d, q).filter(function (n) { return path.indexOf(n) < 0; });
      if (!options.length) break;
      q = pick(rng, options);
      path.push(q);
    }
    return path;
  }

  function generateErrors(level, rng) {
    var d = level.d;
    var f = Surface.emptyFrame(d);
    if (level.gen === 'single') {
      f = Surface.applyPauli(f, Math.floor(rng() * d * d), pick(rng, ['X', 'Z']));
    } else if (level.gen === 'double') {
      var a = Math.floor(rng() * d * d);
      var b = a;
      while (b === a) b = Math.floor(rng() * d * d);
      f = Surface.applyPauli(f, a, pick(rng, ['X', 'Z']));
      f = Surface.applyPauli(f, b, pick(rng, ['X', 'Z']));
    } else if (level.gen === 'chain') {
      f = Surface.applyChain(f, randomWalk(d, 2 + Math.floor(rng() * 2), rng), 'X');
      if (rng() < 0.6) f = Surface.applyChain(f, randomWalk(d, 1 + Math.floor(rng() * 2), rng), 'Z');
    } else {
      f = Surface.sampleNoise(d, level.p, rng, 'depolarizing');
    }
    return f;
  }

  function freshRound(state) {
    var counter = state.counter + 1;
    var rng = Surface.makeRng((state.seed * 7919 + counter * 104729) >>> 0);
    var level = LEVELS[state.levelIndex];
    var lattice = Surface.buildLattice(level.d);
    var errors;
    // A round with no alarms would be meaningless: resample.
    for (var tries = 0; tries < 200; tries++) {
      errors = generateErrors(level, rng);
      if (Surface.syndrome(lattice, errors).defects.length) break;
    }
    return Object.assign({}, state, {
      counter: counter,
      d: level.d,
      phase: 'building',
      errors: errors,
      correction: Surface.emptyFrame(level.d),
      selected: null,
      computer: null,
      outcome: null,
      message: null
    });
  }

  function initGame(opts) {
    opts = opts || {};
    var s = {
      seed: opts.seed === undefined ? Math.floor(Math.random() * 1e9) : opts.seed,
      counter: 0,
      levelIndex: opts.level || 0,
      tool: 'X',
      score: { solved: 0, rounds: 0 },
      d: 3
    };
    return freshRound(s);
  }

  function classify(lattice, errors, correction) {
    var residual = Surface.compose(errors, correction);
    if (Surface.syndrome(lattice, residual).defects.length) return { kind: 'uncleared', residual: residual };
    if (Surface.isTrivial(residual)) return { kind: 'corrected', residual: residual };
    var ls = Surface.logicalStatus(lattice, residual);
    if (ls.xFlip || ls.zFlip) return { kind: 'logical', residual: residual, xFlip: ls.xFlip, zFlip: ls.zFlip };
    return { kind: 'loop', residual: residual };
  }

  function remainingDefects(state) {
    var lattice = Surface.buildLattice(state.d);
    return Surface.syndrome(lattice, Surface.compose(state.errors, state.correction)).defects;
  }

  function with_(state, patch) { return Object.assign({}, state, patch); }

  function reduce(state, action) {
    var lattice = Surface.buildLattice(state.d);
    switch (action.type) {
      case 'newRound':
        return freshRound(state);

      case 'setLevel':
        if (action.level < 0 || action.level >= LEVELS.length) return state;
        return freshRound(with_(state, { levelIndex: action.level }));

      case 'setTool':
        return with_(state, { tool: action.tool });

      case 'toggle':
        if (state.phase !== 'building') return state;
        return with_(state, {
          correction: Surface.applyPauli(state.correction, action.q, action.pauli || state.tool),
          message: null,
          outcome: null
        });

      case 'select': {
        if (state.phase !== 'building') return state;
        var lit = remainingDefects(state);
        if (lit.indexOf(action.stab) < 0) return with_(state, { selected: null });
        if (!state.selected) return with_(state, { selected: action.stab, message: null });
        if (state.selected === action.stab) return with_(state, { selected: null });
        var a = lattice.byId[state.selected], b = lattice.byId[action.stab];
        if (a.type !== b.type) {
          return with_(state, {
            selected: action.stab,
            message: 'Pair alarms of the same kind: X-tiles with X-tiles, Z-tiles with Z-tiles.'
          });
        }
        var path = Decoder.shortestPath(lattice, a.id, b.id);
        return with_(state, {
          correction: Surface.applyChain(state.correction, path, a.type === 'Z' ? 'X' : 'Z'),
          selected: null,
          message: null,
          outcome: null
        });
      }

      case 'toBoundary': {
        if (state.phase !== 'building' || !state.selected) return state;
        var s = lattice.byId[state.selected];
        var bpath = Decoder.shortestPath(lattice, s.id, 'boundary');
        return with_(state, {
          correction: Surface.applyChain(state.correction, bpath, s.type === 'Z' ? 'X' : 'Z'),
          selected: null,
          message: null,
          outcome: null
        });
      }

      case 'clear':
        if (state.phase !== 'building') return state;
        return with_(state, { correction: Surface.emptyFrame(state.d), selected: null, message: null, outcome: null });

      case 'askComputer':
        // The decoder sees only the alarms, exactly like the player.
        return with_(state, {
          computer: Decoder.decodeSyndrome(lattice, Surface.syndrome(lattice, state.errors).defects)
        });

      case 'adoptComputer':
        if (state.phase !== 'building' || !state.computer) return state;
        return with_(state, { correction: Surface.copyFrame(state.computer.correction), selected: null, message: null, outcome: null });

      case 'apply': {
        if (state.phase !== 'building') return state;
        var res = classify(lattice, state.errors, state.correction);
        if (res.kind === 'uncleared') {
          return with_(state, {
            message: 'Some alarms are still on. A correction must silence every alarm before you apply it.',
            outcome: { kind: 'uncleared' }
          });
        }
        var computer = state.computer ||
          Decoder.decodeSyndrome(lattice, Surface.syndrome(lattice, state.errors).defects);
        var comp = classify(lattice, state.errors, computer.correction);
        var won = res.kind !== 'logical';
        return with_(state, {
          phase: 'revealed',
          selected: null,
          computer: computer,
          outcome: { kind: res.kind, residual: res.residual, computerKind: comp.kind },
          message: null,
          score: { solved: state.score.solved + (won ? 1 : 0), rounds: state.score.rounds + 1 }
        });
      }

      default:
        return state;
    }
  }

  // Everything the renderer needs, derived from the state.
  function view(state) {
    var lattice = Surface.buildLattice(state.d);
    var initial = Surface.syndrome(lattice, state.errors);
    var remaining = remainingDefects(state);
    var residualQubits = [];
    if (state.outcome && state.outcome.residual) {
      for (var q = 0; q < lattice.n; q++) {
        if (state.outcome.residual.x[q] || state.outcome.residual.z[q]) residualQubits.push(q);
      }
    }
    return {
      lattice: lattice,
      level: LEVELS[state.levelIndex],
      initialDefects: initial.defects,
      remainingDefects: remaining,
      correctionWeight: Surface.weight(state.correction),
      canApply: state.phase === 'building' && remaining.length === 0,
      residualQubits: residualQubits
    };
  }

  return {
    LEVELS: LEVELS,
    OUTCOME_TEXT: OUTCOME_TEXT,
    initGame: initGame,
    reduce: reduce,
    view: view,
    classify: classify,
    generateErrors: generateErrors
  };
});
