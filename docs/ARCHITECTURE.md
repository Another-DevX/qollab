# Architecture

> Describes the **actual** repository. Two stacks coexist; both are documented.

## 1. Repository layout

```
qollab/
├─ package.json                 # Stack A scripts + dependencies
├─ next.config.ts               # Next config (redirects, turbopack, cacheComponents)
├─ tsconfig.json                # TS config, path alias "@/*" -> "./src/*"
├─ eslint.config.mjs            # eslint-config-next; ignores submission/**
├─ vitest.config.mts            # Vitest (jsdom) for src/**
├─ vitest.setup.ts
├─ docs/                        # ← this documentation
│
├─ src/                         # STACK A — Next.js app (Module 1)
│  ├─ app/
│  │  ├─ globals.css            # design tokens, editorial classes, KaTeX, sliders
│  │  ├─ layout.tsx             # root: fonts (Geist/Source Serif 4), header, footer, theme init
│  │  └─ module/1/
│  │     ├─ layout.tsx          # shared page frame (max-w-5xl) + ScrollToTop
│  │     ├─ template.tsx        # opacity fade on navigation
│  │     ├─ page.tsx            # cover
│  │     ├─ pauli-errors/page.tsx
│  │     ├─ pauli-basis/page.tsx
│  │     ├─ challenge/page.tsx
│  │     └─ conclusion/page.tsx
│  ├─ components/
│  │  ├─ bloch/                 # BlochSphere, BlochScene, SceneArrow, types
│  │  ├─ math/                  # Tex, Equation, MathMatrix, latex
│  │  ├─ ui/                    # primitives, editorial, RangeSlider
│  │  ├─ experience/            # Module-1 lesson components + PageTransition/BackLink/ModuleHero
│  │  ├─ site/                  # SiteHeader, ScrollToTop
│  │  └─ theme/                 # ThemeToggle
│  └─ lib/
│     ├─ cn.ts
│     ├─ theme.ts               # PALETTES, useScheme, usePalette, toggleScheme
│     └─ quantum/               # pure math + Vitest tests
│        ├─ complex.ts matrix.ts pauli.ts state.ts rotations.ts challenge.ts format.ts index.ts
│        └─ __tests__/quantum.test.ts
│
└─ submission/                  # STACK B — no build, no libraries
   ├─ index.html  main.js       # (legacy) Module 1 vanilla — DARK theme, Spanish. Do not copy.
   └─ module2/                  # Module 2 vanilla (editorial light)
      ├─ index.html             # shell + ALL CSS (inline <style>)
      ├─ quantum.js             # pure math (window.Q / module.exports)
      ├─ detective.js           # pure game state machine (window.createDetective)
      ├─ main.js                # rendering + hash router
      └─ tests.cjs              # Node tests (node tests.cjs)
```

## 2. Stack A — Next.js app (Module 1)

### 2.1 Versions (from `package.json`)

- **next** `16.4.0` (App Router, Turbopack by default)
- **react / react-dom** `19.3.0`
- **typescript** `^5`
- **tailwindcss** `^4` + **@tailwindcss/turbopack** `^4` (PostCSS-less; wired via `next.config.ts` `turbopack.rules` for `*.css`)
- **framer-motion** `^14.1.0` (animation)
- **three** `^0.186.1`, **@react-three/fiber** `^9.8.1`, **@react-three/drei** `^10.7.9` (Bloch sphere)
- **katex** `^0.19.0` (math), **@types/katex** `^0.16.8`
- **vitest** `^5.0.3`, **@vitejs/plugin-react** `^6.1.2`, **jsdom** `^29.1.1`, **@testing-library/*** , **vite-tsconfig-paths** `^6.1.1`
- **eslint** `^9`, **eslint-config-next** `16.4.0`

### 2.2 Routing

- App Router under `src/app/`. Module 1 lives at `/module/1/*`.
- `next.config.ts` redirects `/` → `/module/1` (`permanent:false`).
- Per-route `metadata` exported from each `page.tsx`.
- `src/app/module/1/layout.tsx` provides the page frame; `template.tsx` provides a
  short opacity fade that re-mounts on navigation (keeps `sticky` working because
  it animates **opacity only**, no transform).

### 2.3 TypeScript

- `strict: true`, `noEmit: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`.
- Path alias `@/*` → `./src/*` (used everywhere, e.g. `@/components/ui/primitives`).
- `tsconfig.json` includes `.next/types/**` (generated). If you delete `.next`,
  run a build before `tsc` so generated route types exist.

### 2.4 State management

No global store. Patterns:

- **`useState` / `useMemo`** inside lesson components (Stack A).
- **`useSyncExternalStore`** for theme (`src/lib/theme.ts`) — `useScheme()` and
  `usePalette()`, backed by a `Set` of listeners and the `.dark` class.
- Pure simulation math is computed with `useMemo` from React state and passed to
  renderers (the renderer never computes physics).

### 2.5 Math rendering

- `src/components/math/Tex.tsx` → `katex.renderToString` (deterministic → SSR-safe).
- `Equation` (block) and `MathInline` wrap `Tex`.
- `MathMatrix` + `src/components/math/latex.ts` (`latexComplex`, `matrixToLatex`).
- KaTeX CSS is imported once in `src/app/layout.tsx`
  (`import "katex/dist/katex.min.css"`).

### 2.6 Bloch sphere (3D)

- `BlochSphere.tsx` is a client component that `dynamic(() => import("./BlochScene"), { ssr:false })`.
- `BlochScene.tsx` renders the R3F `<Canvas>` + `OrbitControls`
  (`enablePan={false}`, damping, `minDistance 2.6`, `maxDistance 5.2`,
  polar clamps `0.18…π−0.18`, `camera.up=[0,0,1]`).
- `SceneArrow.tsx` slerps the tip along the geodesic (no collapse through origin).
- The wrapper uses `.bloch-surface` (`touch-action:none`) and overlays are
  `pointer-events-none`, so dragging never conflicts with page scroll.

### 2.7 Quantum simulation utilities

`src/lib/quantum/*` — pure, DOM-free, React-free:

- `complex.ts` (Complex ops), `matrix.ts` (2×2 matrices, `matVec`, `matMul`, `matDagger`…),
- `pauli.ts` (I/X/Y/Z, `applyPauli`, `composePauliSequence`),
- `state.ts` (`ketState`, `blochVector`, `stateFromBloch`, `overlap`, `areEquivalentUpToPhase`, `globalPhaseBetween`, `rotateBloch`…),
- `rotations.ts` (`rotationOperator`, `pauliDecomposition`, `reconstructFromPauli`),
- `challenge.ts` (seeded RNG, `generateChallenge`, `checkAnswer`),
- `format.ts` (display helpers), `index.ts` (barrel).

**Testing:** `src/lib/quantum/__tests__/quantum.test.ts` — 29 Vitest tests.

## 3. Stack B — Vanilla app (Module 2)

### 3.1 Structure

- `index.html` — the shell **and all CSS** (`<style>`), plus `<script defer>` tags
  for `quantum.js`, `detective.js`, `main.js`. No build, no npm dependencies.
- `quantum.js` — pure math, exposed as `window.Q` in the browser and
  `module.exports` in Node.
- `detective.js` — pure game state machine (`window.createDetective(Q, rng)`).
- `main.js` — rendering, SVG/Canvas diagrams, and the **hash router**.
- `tests.cjs` — Node tests (`node tests.cjs`), 72 assertions.

### 3.2 Routing

Hash router in `main.js`:

```js
var ROUTES = { "": "cover", "/": "cover",
  "/repetition-code": "repetition", "/syndrome": "syndrome", "/phase-flip": "phaseflip" };
```

- `#/` cover, `#/repetition-code`, `#/syndrome`, `#/phase-flip`.
- `go()` clears `#app`, runs the render function, calls `window.scrollTo(0,0)`.
- Each render function returns a **cleanup** (stops the Canvas sphere, disconnects
  the `ResizeObserver`) that `go()` invokes before the next render.

### 3.3 State management

- Plain module-scoped objects per page (`sy`, `p3`, `exp`) plus `p3.basis`, etc.
- The **Detective** uses a dedicated pure state machine (`detective.js`); rendering
  reads `det.state()` and only calls actions (`inject`, `measure`, `diagnose`,
  `confirmDiagnosis`, `setCorrection`, `applyCorrection`, `nextRound`).
- **Rule discovered while building Module 2:** never rebuild a container that holds
  a `<canvas>` on update — build it once and update only the dynamic parts. The
  Canvas sphere keeps a reference to its element; re-creating the element orphans
  the instance and the sphere goes blank. See `buildBasis()` / `updateBasis()`.

### 3.4 Rendering primitives (Stack B)

- **SVG builders** return HTML strings: `circuitSVG(opts)`, `paritySVG(opts)`,
  `badge()`, plus CSS classes `.pq-*`, `.circuit`.
- **Canvas 2D** `BlochSphere` class (drag/wheel/pinch via pointer events).
- **HTML math** helpers: `ampHTML`, `regHTML`, `syndromeHTML`, `symbolicOriginal`,
  `symbolicAfter`.

### 3.5 Testing (Stack B)

```bash
cd submission/module2 && node tests.cjs
```
Covers: bit-flip/phase-flip encodings, syndromes (00/10/11/01), correction,
normalization, stabilizer measurement, the detective state machine (scoring,
gating, retries), the syndrome→qubit mapping, and superposition states.

## 4. Scripts (Stack A)

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Dev server (Turbopack) |
| `build` | `next build` | Production build + typecheck |
| `start` | `next start` | Serve the build |
| `lint` | `eslint` | Lint (`submission/**` ignored) |
| `typecheck` | `tsc --noEmit` | Types only |
| `test` | `vitest run` | Unit tests |
| `test:watch` | `vitest` | Watch mode |

## 5. How to add a new module without touching existing ones

**Stack A (Next.js):**
1. Create `src/app/module/<N>/layout.tsx` (copy the `max-w-5xl` frame) and
   `template.tsx` (the opacity fade). Add `page.tsx` (cover) and one `page.tsx`
   per lesson.
2. Put module-specific lesson components under
   `src/components/experience/<moduleN>/` and module-specific math under
   `src/lib/quantum/<moduleN>.ts`.
3. Reuse `@/components/ui/*`, `@/components/math/*`, `@/components/experience/PageTransition`,
   `@/components/experience/BackLink`, `@/lib/theme`, `@/lib/cn` **without editing them**.
4. Add a redirect only if you want a new default entry (coordinate `next.config.ts`).

**Stack B (Vanilla):**
1. Create `submission/module<N>/index.html` (copy the `<style>` from `module2/index.html`),
   `quantum.js` (module math), and `main.js` (rendering + hash router).
2. Add `tests.cjs`. Run `node tests.cjs`.
3. Do **not** edit `submission/module2/*`.

**Reusable infrastructure vs module-specific**

| Reusable (shared) | Module-specific (do not share blindly) |
|---|---|
| `src/components/ui/*`, `src/components/math/*` | `src/components/experience/PauliErrorsExperience.tsx` etc. |
| `src/components/bloch/*` | `src/lib/quantum/*` (Module 1 domain) |
| `PageTransition`, `BackLink`, `SiteHeader`, `ThemeToggle`, `ScrollToTop` | `src/components/experience/pauliInfo.ts` |
| `src/lib/theme.ts`, `src/lib/cn.ts` | `submission/module2/{quantum,detective}.js` |
| Stack B: CSS classes in `index.html`, `pageHead`, `backLink`, `legendHTML`, `BlochSphere` | `paritySVG`, `symbolicAfter`, per-page render functions |

## 6. Import paths (Stack A)

```ts
import { Panel, Button, Chip, Callout, Stat, FieldRow, LegendItem } from "@/components/ui/primitives";
import { PageHeader, Expandable, KeyIdea, Notice } from "@/components/ui/editorial";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { Tex } from "@/components/math/Tex";
import { Equation, MathInline } from "@/components/math/Equation";
import { MathMatrix } from "@/components/math/MathMatrix";
import { PageTransition } from "@/components/experience/PageTransition";
import { BackLink } from "@/components/experience/BackLink";
import { BlochSphere } from "@/components/bloch/BlochSphere";
import { usePalette, useScheme } from "@/lib/theme";
import { cn } from "@/lib/cn";
```

## 7. Known technical notes / constraints

- **Next 16:** Turbopack is the default builder; `cacheComponents:true` and
  `partialPrefetching:true` are enabled. Deleted routes leave stale types in
  `.next/types` — clear `.next` (or rebuild) before `tsc`.
- **Three.js:** the browser logs a benign `THREE.Clock … deprecated` warning from
  `@react-three/fiber`.
- **KaTeX** exists only in Stack A. Stack B intentionally has **no** math library
  (submission constraint: no JS libraries, no build).
- **`submission/` (Module 1 vanilla)** is legacy/dark/Spanish — treat as out of
  scope for the current identity.
