# Qollab — Platform (single-page app)

An interactive, dependency-free **single-page app** that unifies the whole
Quantum Error Correction feature behind one hash router:

- **Home** — module selection (the cover of the publication).
- **Module 1 · Understanding Quantum Errors** — Pauli errors, the Pauli basis,
  and the "name the error" challenge.
- **Module 2 · From Repetition to Shor Code** — the seven lessons and the final
  knowledge check.
- **Module 4 · Iceberg Code [[4,2,2]]** — detection without correction: the code
  space, syndromes, why location is hidden, postselection, and undetectable
  logical errors, plus a five-question knowledge check.

Everything is **vanilla HTML + JavaScript**: no build step, no libraries, no
network. This folder is self-contained and does not modify any existing app.

## Run

```bash
cd platform
python3 -m http.server 4500
# open http://localhost:4500/
```

Or open `index.html` through any static file server.

## Routes (hash router)

| Route | Page |
|---|---|
| `#/` | Home (module selection) |
| `#/module-1` | Module 1 cover |
| `#/module-1/pauli-errors` · `#/module-1/pauli-basis` · `#/module-1/challenge` · `#/module-1/conclusion` | Module 1 lessons |
| `#/module-2` | Module 2 cover |
| `#/module-2/repetition-code` · `#/module-2/syndrome` · `#/module-2/phase-flip` · `#/module-2/shor-code` · `#/module-2/shor-decoder` · `#/module-2/break-code` · `#/module-2/noise-lab` | Module 2 lessons (incl. the final quiz) |
| `#/module-4` | Module 4 cover |
| `#/module-4/four-physical-two-logical` · `#/module-4/detecting-errors` · `#/module-4/why-not-correct` · `#/module-4/postselection` · `#/module-4/break-the-code` | Module 4 lessons (incl. the final quiz) |

## Files

| File | Purpose |
|---|---|
| `index.html` | Shell + all CSS (light editorial design system) |
| `app.js` | Hash router, header, theme toggle |
| `home.js` | Home page + data-driven module registry |
| `module1.js` | Module 1 pages |
| `module2.js` | Module 2 pages (adapted from the standalone Module 2 app) |
| `module4.js` | Module 4 pages (Iceberg code) |
| `bloch.js` | Shared Canvas-2D Bloch sphere + data palette |
| `m1math.js` | Module 1 math (complex, matrices, Pauli, Bloch, rotations, challenge) |
| `ui.js` | Shared editorial HTML builders |
| `quantum.js`, `shor.js`, `noise.js`, `detective.js` | Module 2 math |
| `iceberg.js` | Module 4 math: the [[4,2,2]] Pauli-frame + state engine |
| `quizbase.js` | Generic quiz state machine (shared by Modules 2 and 4) |
| `quiz.js`, `icebergquiz.js` | Question sets for the Module 2 and Module 4 knowledge checks |
| `tests.cjs` | Node tests (`node tests.cjs`) |

## Tests

```bash
node tests.cjs
```

## Adding a module later

Append an entry to the registry in `home.js` (and wire its routes in `app.js`).
Only entries with `status: "ready"` are displayed, so future modules stay hidden
until they are implemented.

**Module 3 (Surface Code) — integration point.** Module 3 is developed in
parallel and is intentionally not shown yet. To publish it once it is ready:

1. Load its script in `index.html` (after `ui.js`, before `app.js`).
2. In `app.js`, register its routes:
   ```js
   Object.keys(global.Module3.routes).forEach(function (path) {
     ROUTES[path] = { fn: global.Module3.render[global.Module3.routes[path]],
                      note: "The Surface Code", title: "Module 3" };
   });
   ```
3. In `home.js`, add a `status: "ready"` entry:
   ```js
   { n: "03", href: "#/module-3", title: "The Surface Code",
     desc: "Protect quantum information on a two-dimensional lattice.", status: "ready" },
   ```
The Home page will then show four consistent cards (01, 02, 03, 04).
