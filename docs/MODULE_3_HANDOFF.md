# Module 3 — Surface Code · Development Handoff

> For the second developer / AI agent building **Module 3 (Surface Code)** in
> parallel. This is an **integration** document, not a syllabus. It does not
> implement anything.

## 0. Stack decision (read first)

Module 2 is **vanilla HTML + JS** (`submission/module2/`), because the hackathon
submission requires plain `index.html` + `main.js` with **no build step and no JS
libraries**. Module 1 exists in two forms: the canonical **Next.js** app (`src/`)
and a legacy dark vanilla prototype (`submission/`, out of scope).

**Recommended for Module 3: build on Stack B (vanilla), mirroring Module 2.**
This keeps a single, submittable, dependency-free app and guarantees visual
consistency with the most recent work. (If the team later decides to ship only the
Next.js app, the same visual tokens/components map 1:1 — see §9.)

**Do not modify Modules 1 or 2.** Create everything new inside a new folder.

---

## 1. Recommended file layout (Stack B)

```
submission/module3/
├─ index.html      # shell + ALL CSS (copy the <style> block from module2/index.html)
├─ surface.js      # PURE surface-code math (window.Surface / module.exports)
├─ lattice.js      # OPTIONAL pure lattice helpers (topology, neighbors, decoding) — or fold into surface.js
├─ main.js         # rendering + hash router + lattice SVG
├─ tests.cjs       # Node tests:  node tests.cjs
└─ README.md       # optional: how to run
```

Load order in `index.html` (classic scripts, `defer`):

```html
<script src="surface.js" defer></script>
<script src="main.js" defer></script>
```

Hash router (same pattern as Module 2):

```js
var ROUTES = { "": "cover", "/": "cover",
  "/surface-basics": "basics", "/stabilizers": "stabilizers",
  "/syndromes": "syndromes", "/decoding": "decoding" /* … */ };
```

Each `renderX(root)` must **return a cleanup function** (stop any `requestAnimationFrame`
loop / `ResizeObserver`). `go()` clears `#app`, renders, and scrolls to top.

---

## 2. Creating the Module 3 cover

Copy the Module 2 cover structure (cover + roadmap). In `main.js`:

```js
function renderCover(root) {
  root.innerHTML =
    "<div class='container'>" +
      "<div class='cover'>" +
        "<div>" +
          "<div style='display:flex;align-items:center;gap:12px'>" +
            "<span style='height:1px;width:40px;background:var(--accent)'></span>" +
            "<span class='eyebrow'>Module 3 — Quantum Error Correction</span></div>" +
          "<h1 class='headline' style='margin-top:24px'>The Surface Code</h1>" +
          "<p class='sub'>How can a 2D grid of qubits correct errors that occur anywhere?</p>" +
          "<p class='dek' style='margin-top:16px'>…one short paragraph…</p>" +
          "<div class='cta'><a class='btn primary' href='#/surface-basics'>Start Experimenting →</a>" +
            "<span class='caption'>≈ 20 min · N lessons</span></div>" +
        "</div>" +
        "<div class='bloch-wrap' style='height:min(50vh,400px)'>" +
          "<canvas id='cover-canvas' aria-label='…'></canvas>" +
          "<div class='legend' id='cover-legend'></div>" +
          "<div class='bloch-hint'>drag to orbit</div></div>" +
      "</div>" +
      "<section aria-label='Module route' style='margin-top:64px'>" +
        "<div style='display:flex;align-items:center;gap:16px'>" +
          "<span class='eyebrow' style='color:var(--faint)'>The route</span>" +
          "<span class='rule' style='flex:1'></span></div>" +
        "<ol class='roadmap' style='margin-top:24px'>" + roadmapItems + "</ol>" +
      "</section>" +
    "</div>";
}
```

Roadmap item markup (copy from `submission/module2/main.js` `renderCover`):

```html
<li><a href="#/lesson-slug">
  <span class="n">01</span>
  <div class="t">Lesson title</div>
  <div class="l">One short line.</div>
</a></li>
<!-- unimplemented items: -->
<li><div style="opacity:.72">… <div class="caption" style="margin-top:6px">Coming soon</div></div></li>
```

If you want a hero motif other than a Bloch sphere, build a **small lattice SVG**
reusing the same palette (see §6) — keep it restrained and single-accent.

---

## 3. Creating lesson pages

Each lesson is its own hash route. Standard page skeleton (copy Module 2):

```js
function renderLesson(root) {
  root.innerHTML =
    "<div class='container'>" +
      backLink("#/", "Cover") +
      pageHead("01", "Section kicker", "Central question?", "One short dek.") +
      // short explanation (before the experiment)
      "<p class='dek' style='margin-top:12px'>…</p>" +
      // experiment: sticky visual + controls
      "<section class='grid-two' style='margin-top:32px'>" +
        "<div class='sticky-col'>" + latticePanel + "</div>" +
        "<div class='stack'>" + controls + observations + "</div>" +
      "</section>" +
      // maths reveal + optional challenge
      // transition to next page
      "<aside class='transition'>" +
        "<div class='big'>02</div><div>" +
          "<span class='eyebrow' style='color:var(--faint)'>Next</span>" +
          "<p class='q'>Question that opens the next lesson?</p>" +
          "<p class='teaser'>One-line teaser.</p>" +
          "<div style='margin-top:20px'><a class='btn primary' href='#/next-slug'>Next action →</a></div>" +
        "</div></aside>" +
    "</div>";
  // wire events; return cleanup
}
```

Helpers to copy verbatim from Module 2: `pageHead(num, kick, title, dek)`,
`backLink(href, label)`, `legendHTML(items)`, `$sel`, `$all`.

---

## 4. Reusing typography, math, buttons, navigation, experiment styles

**Reuse the Module 2 `<style>` block unchanged** (copy it into `module3/index.html`).
It already provides everything:

| Need | Class / element |
|---|---|
| Section header | `.page-head` (+ `.meta`, `.num`, `.kick`) |
| Display headline | `.headline` |
| Intro / lead | `.dek` |
| Small labels / captions | `.eyebrow`, `.caption` |
| Divider | `.rule` |
| Panels | `.panel`, `.quiet` |
| Buttons | `.btn`, `.btn.primary`, `.btn.ghost` |
| Selectable chips | `.chip`, `.chip.active`, `.chip-row`, `.toolbar` |
| Equations | `.eq`, `.m`, `.state-eq`, `.eq .op`, `.state-eq .coef` |
| Callouts | `.keyidea`, `.notice` |
| Progressive disclosure | `details.expand` (+ `.body`) |
| Page transition | `.transition` (`.big`, `.q`, `.teaser`) |
| Roadmap | `.roadmap` |
| Back link | `.backlink` |
| Feedback | `.feedback.ok`, `.feedback.no` |
| Comparison rows / tags | `.cmp-row`, `.result-tag.detected`, `.result-tag.undetected` |
| Sticky two-column layout | `.grid-two`, `.sticky-col`, `.stack` |
| Reveal animation | `.fade-in`, `.reveal` |

**Math:** Stack B uses the serif HTML system (no KaTeX). Write equations as HTML,
e.g. `"<span class='m'><i>Z</i><sub>1</sub><i>Z</i><sub>2</sub> = +1</span>"`.
Use `⟨…⟩`, `⊗`, `−` (U+2212), `<sub>`/`<sup>`. Keep coefficient/operator spans
muted via `.coef` / `.op`.

---

## 5. Reusing the Bloch sphere (optional)

If a lesson needs a single-qubit view, copy the `BlochSphere` class + vector
helpers from `submission/module2/main.js` into `module3/main.js` (or a small
`bloch.js`). **Critical rule:** build the container that holds the `<canvas>`
**once**; never rebuild its `innerHTML` on updates (that orphans the instance and
blanks the sphere). Update only the legend/arrows. See Module 2’s
`buildBasis()`/`updateBasis()` for the pattern.

---

## 6. Recommended lattice visualization architecture

Keep it **data-driven SVG** (no WebGL needed for a surface code), so it stays
dependency-free, responsive and crisp.

### 6.1 Data model (pure, in `surface.js`)

```js
// A lattice is a set of data qubits on integer coordinates + stabilizers.
Lattice = {
  size: 5,                       // e.g. 3, 5, 7 (distance d)
  data: [ { id:"d0", x:0, y:0 }, … ],           // data qubit coordinates
  stabilizers: [
    { id:"Z_0", type:"Z", qubits:["d0","d1","d4","d5"], x:0.5, y:0.5 }, // plaquette
    { id:"X_0", type:"X", qubits:["d1","d2","d5","d6"], x:1.5, y:0.5 }, // star/vertex
    …
  ],
};
```

### 6.2 Pure operations (in `surface.js`)

```js
buildLattice(size)                        // → Lattice
applyError(state, qubitId, pauli)         // 'X'|'Y'|'Z' on a data qubit
stabilizerValue(state, stabilizer)        // → +1 | -1  (eigenvalue)
measureSyndrome(state, lattice)           // → { defects:[stabId…], bits:{…} }
correct(state, lattice, correctionQubitId, pauli)
isRecovered(a, b)                         // equality up to global phase
codeDistance(lattice)                     // = size
correctableErrors(lattice)                // ⌊(d-1)/2⌋
```

Represent the multi-qubit state as a complex-amplitude vector over the data
qubits (same pattern as `submission/module2/quantum.js`: `C(re,im)`, index bit
ops, Pauli application, `regEqPhase`). For a 5×5 lattice a **full 2^N vector is
too large** — use one of:
1. **Stabilizer/Pauli-frame model** for teaching: track a *Pauli frame* (which
   data qubits carry X/Z errors) and compute stabilizer eigenvalues by counting
   anticommuting error operators. This is exact for Pauli errors and is what the
   lessons need (X errors flip Z-stabilizers; Z errors flip X-stabilizers).
2. **Small lattices only** (e.g. 2×2 / 3×3 data qubits ⇒ 4–9 qubits) if you want
   explicit amplitudes.

Prefer option 1 for clarity and testability; document that it is a Pauli-frame
simulation, **not** a universal simulator.

### 6.3 SVG renderer (in `main.js`)

```js
function latticeSVG(lattice, opts) {
  // opts: { errors:[{q,pauli}], defects:[stabId…], selected:[q], correction:[{q,pauli}] }
  // Draw: data qubit circles on a grid; stabilizer tiles (plaquette = Z, star = X)
  //       as semi-transparent squares/diamonds; edges; defect markers on flipped tiles;
  //       X/Z error badges on qubits; correction badges.
  // Return an SVG string. Classes: .lattice .lat-qubit .lat-qubit.sel .lat-tile
  //          .lat-tile.z .lat-tile.x .lat-defect .lat-badge.err .lat-badge.fix
}
```

Add matching CSS in `module3/index.html` (mirror the `.pq-*` conventions from
Module 2 so it feels identical):

```css
.lattice{width:100%;height:auto;display:block}
.lat-qubit{fill:var(--surface-2);stroke:var(--line);stroke-width:1.5}
.lat-qubit.sel{stroke:var(--accent);stroke-width:2.5}
.lat-tile{fill:none;stroke-width:1.5}
.lat-tile.z{stroke:var(--axis-z, #3f5f9a)}
.lat-tile.x{stroke:var(--accent-2)}
.lat-defect{fill:color-mix(in srgb,var(--bad) 18%,transparent);stroke:var(--bad);stroke-width:2}
.lat-badge.err rect{fill:color-mix(in srgb,var(--bad) 12%,transparent);stroke:var(--bad)}
.lat-badge.err text{fill:var(--bad)}
.lat-badge.fix rect{fill:color-mix(in srgb,var(--accent) 12%,transparent);stroke:var(--accent)}
.lat-badge.fix text{fill:var(--accent)}
```

**Rendering rule:** the renderer only *draws* the data it is given; all physics
(eigenvalues, defects, corrections, recovery) is computed in `surface.js`.

### 6.4 Interaction patterns to reuse

- Qubit selection: `.chip` row (`q1…qN`) or clickable SVG hit-areas
  (`class="lat-hit"`, `data-q="…"`).
- Error buttons: `Apply X` / `Apply Z` (`.btn`), `Measure syndrome` (`.btn.primary`),
  `Reset` (`.btn.ghost`).
- Feedback: `.feedback.ok/.no` + a one-line explanation; `.syndrome-strip` for the
  defect list.
- Progressive maths: `details.expand`.

---

## 7. Separation of simulation and rendering (required)

- **`surface.js`** — pure functions + data model. No DOM, no `window` writes except
  the `window.Surface`/`module.exports` export. Must be loadable in Node for tests.
- **`main.js`** — DOM, SVG strings, hash router, event wiring. Never computes
  physics; reads results from `Surface.*`.
- Mirror Module 2’s `quantum.js` + `detective.js` + `main.js` split.

---

## 8. Component reuse inventory

| Component | File path | Purpose | Reusable in Module 3? | Example usage |
|---|---|---|---|---|
| `Panel` | `src/components/ui/primitives.tsx` | Card container | ✅ (Stack A) | `<Panel>…</Panel>` |
| `Button` | `src/components/ui/primitives.tsx` | Buttons (variants/sizes) | ✅ | `<Button variant="primary">Measure</Button>` |
| `Chip` | `src/components/ui/primitives.tsx` | Selectable pill | ✅ | `<Chip selected={sel===i} onClick=…>q{i+1}</Chip>` |
| `Callout` | `src/components/ui/primitives.tsx` | Tone callout | ✅ | `<Callout tone="warning">…</Callout>` |
| `Stat` | `src/components/ui/primitives.tsx` | KPI | ✅ | `<Stat label="Correct" value="2/3" />` |
| `FieldRow` | `src/components/ui/primitives.tsx` | label→value | ✅ | `<FieldRow label="Syndrome">…</FieldRow>` |
| `LegendItem` | `src/components/ui/primitives.tsx` | Vector legend | ✅ | `<LegendItem color={c} label="Error" />` |
| `PageHeader` | `src/components/ui/editorial.tsx` | Lesson header | ✅ | `<PageHeader number="01" kicker="…" title="…" dek="…" />` |
| `Expandable` | `src/components/ui/editorial.tsx` | Progressive disclosure | ✅ | `<Expandable label="Why?">…</Expandable>` |
| `KeyIdea` / `Notice` | `src/components/ui/editorial.tsx` | Short callouts | ✅ | `<Notice>…</Notice>` |
| `RangeSlider` | `src/components/ui/RangeSlider.tsx` | Slider | ✅ | `<RangeSlider id="d" label="Distance" … />` |
| `Tex` | `src/components/math/Tex.tsx` | KaTeX render | ✅ (Stack A) | `<Tex tex="X_1X_2" />` |
| `Equation` | `src/components/math/Equation.tsx` | Block equation | ✅ | `<Equation tex="…" />` |
| `MathMatrix` | `src/components/math/MathMatrix.tsx` | 2×2 matrices | ⚠️ adapt (2×2 only) | — |
| `BlochSphere` | `src/components/bloch/BlochSphere.tsx` | 3D sphere | ✅ (single-qubit views) | `<BlochSphere arrows={[…]} />` |
| `PageTransition` | `src/components/experience/PageTransition.tsx` | Next-page block | ✅ | see DESIGN_SYSTEM §4.3 |
| `BackLink` | `src/components/experience/BackLink.tsx` | Previous link | ✅ | `<BackLink href="/module/3" label="Cover" />` |
| `SiteHeader` / `ThemeToggle` / `ScrollToTop` | `src/components/site/*`, `theme/*` | Global chrome | ✅ (shared, don’t edit) | — |
| `usePalette` | `src/lib/theme.ts` | Data colours | ✅ | `const palette = usePalette();` |
| Module 1 quantum math | `src/lib/quantum/*` | Single-qubit math | ⚠️ adapt | reuse complex/matrix, add surface module |
| **Stack B CSS classes** | `submission/module2/index.html` | Full visual kit | ✅ copy verbatim | `.btn.primary`, `.chip`, `.eq`, `.notice`, `.transition` |
| **Stack B helpers** | `submission/module2/main.js` | `pageHead`, `backLink`, `legendHTML`, `paritySVG`, `circuitSVG`, `BlochSphere` | ✅ copy (don’t import) | `pageHead("01","…","…","…")` |
| **Stack B math** | `submission/module2/quantum.js` | Complex/register/stabilizer math | ✅ adapt into `surface.js` | `Q.C`, `Q.measureSyndrome` |
| **Stack B game SM** | `submission/module2/detective.js` | Pure game state machine | ✅ pattern to copy | `createDetective(Q, rng)` |

**Patterns currently trapped inside module-specific files (recommend extraction
later, do not refactor now):**
- `paritySVG` / `circuitSVG` (Stack B) — generic SVG builders; Module 3 will want a
  sibling `latticeSVG`. Consider extracting a shared `submission/shared/svg.js`
  **after** Module 3 lands, not during parallel work.
- `symbolicOriginal`/`symbolicAfter` (Stack B) — state-to-HTML formatters.
- The `BlochSphere` Canvas class is duplicated conceptually between the legacy
  `submission/main.js` and `submission/module2/main.js`.

---

## 9. If the team chooses Stack A (Next.js) instead

Create `src/app/module/3/{layout,template,page}.tsx` + one `page.tsx` per lesson,
mirroring `src/app/module/1/*`. Put lessons under
`src/components/experience/surface/*.tsx` and math under
`src/lib/quantum/surface.ts`. Reuse `@/components/ui/*`, `@/components/math/*`,
`PageTransition`, `BackLink`, `usePalette`. Add `vitest` tests next to the math.
Use **KaTeX** for equations. The colour tokens and classes are identical to
Stack B, so the visual result matches.

---

## 10. Integration checklist

- [ ] **Dependencies:** none required (Stack B). If Stack A: no new deps needed.
- [ ] **Folder structure:** everything new under `submission/module3/` (or `src/app/module/3` + `src/components/experience/surface`).
- [ ] **Routing:** hash router `#/…` (Stack B) / App Router `module/3/*` (Stack A). Cover first, then lessons.
- [ ] **Shared style imports:** Stack B copies the `<style>` block; Stack A imports `globals.css` already (via root layout) — do not re-import.
- [ ] **Naming conventions:** Stack B files `index.html`, `surface.js`, `main.js`, `tests.cjs`; render functions `renderCover`, `render<Lesson>`; CSS classes kebab-case, SVG classes prefixed (`lat-`).
- [ ] **Testing:** `node submission/module3/tests.cjs` (Stack B) or `npm test` (Stack A). Cover stabilizer eigenvalues, syndromes, correction, recovery (up to global phase), and code distance.
- [ ] **Avoid conflicting changes:** do not edit `submission/module2/*`, `src/components/**` shared files, `globals.css`, `next.config.ts`, or `package.json` without coordination.
- [ ] **Responsiveness:** verify `.grid-two` stacks below 960px; the lattice SVG scales via `width:100%;height:auto`.
- [ ] **Theme:** use the tokens (`var(--…)`); light default, `.dark` opt-in; add the theme toggle button in the header exactly as Module 2.
- [ ] **Math notation:** Unicode kets + `<sub>`/`<sup>` + `.eq`/`.m` (Stack B) or KaTeX `Tex` (Stack A).

---

## 11. Parallel-development strategy (low conflict)

- Work in a **separate branch or git worktree** (e.g. `module-3` / `../qollab-m3`).
- **Create new files only.** The Module 3 folder is self-contained; it shares the
  repo but not the code paths.
- **Do not modify** these shared files (coordinate before touching):
  - `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`,
    `vitest.config.mts`
  - `src/app/layout.tsx`, `src/app/globals.css`
  - `src/components/**` (all shared UI/math/bloch/experience)
  - `src/lib/**`
  - `submission/module2/**`
- **Integration points that may need a *small* final change when merged:**
  1. A link from a top-level entry (e.g. Module 2 cover) or the root redirect to
     Module 3, if the team wants a single navigable app.
  2. If you later extract shared SVG helpers (`submission/shared/svg.js`), that
     touches Module 2 — do it in a dedicated, coordinated PR **after** both
     branches merge.
  3. If a shared `submission/index.html` launcher is added, that is a new file,
     not a modification.
- Keep commits small and inside `submission/module3/` so the merge is trivial.

---

## 12. Surface-code scientific checklist (for correctness)

- Data qubits on a 2D lattice; **Z-type (plaquette)** stabilizers are products of
  `Z` on the 4 surrounding data qubits; **X-type (star/vertex)** stabilizers are
  products of `X` on the 4 surrounding data qubits.
- Stabilizers **commute**; measuring them does not reveal logical amplitudes.
- A **single X error** flips the two adjacent **Z** stabilizers → two syndrome
  defects; a **single Z error** flips the two adjacent **X** stabilizers.
- A **Y error** flips both an X and a Z stabilizer (equivalently X and Z defects).
- Decoding pairs defects and corrects the shortest path (minimum-weight matching
  in general; a simple/greedy pairing is acceptable for teaching — state that it
  is a simplification).
- Code distance `d`; corrects up to `⌊(d−1)/2⌋` errors.
- **Syndrome 00 / no defects does not guarantee no error occurred** (logical
  errors are invisible to the stabilizers).
- Never claim a real-device execution; the simulation is local. Never imply
  entangled data qubits are independent copies.
