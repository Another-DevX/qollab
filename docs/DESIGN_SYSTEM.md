# Design System — Qollab (Quantum Error Correction)

> Generated from the **actual implemented code**. Nothing here is aspirational.
> Where a value comes from a specific file, the file is cited.

## 0. Two implementations coexist (read this first)

The repository contains **two working implementations of the same visual identity**:

| Stack | Location | Build | Used by | Math rendering | Bloch sphere |
|---|---|---|---|---|---|
| **A — Next.js** | `src/` | Next 16 + TS + Tailwind v4 + Turbopack | **Module 1** | KaTeX (`katex@0.19.0`) | React Three Fiber / Three.js |
| **B — Vanilla** | `submission/module2/` | none (`index.html` + `main.js`) | **Module 2** | HTML/CSS math (`.eq`, `.m`, `.state-eq`) | Canvas 2D |

Both use the **same editorial light theme and the same tokens**. Stack B was created
because the hackathon submission requires plain `index.html` + `main.js` with no
build step and no JS libraries. A third folder, `submission/` (Module 1 vanilla),
is an **older, dark-themed** prototype and is **not** part of the current visual
identity — do not copy from it.

**For Module 3 see `MODULE_3_HANDOFF.md`** (recommendation: build on **Stack B**,
mirroring Module 2, unless the team decides to move everything to Stack A).

---

## 1. Color system

### 1.1 Semantic tokens (light = default)

Source: `src/app/globals.css` (`:root`) and `submission/module2/index.html` (`:root`).

| Token | Light value | Dark value (`.dark` / `html.dark`) | Meaning |
|---|---|---|---|
| `--surface` | `#f6f5f1` | `#12141a` | Page background (paper) |
| `--surface-2` | `#ffffff` | `#191c24` | Cards / panels |
| `--surface-3` | `#efede7` | `#22262f` | Inset surfaces |
| `--ink` | `#16233c` | `#e9ecf2` | Primary text (deep navy) |
| `--muted` | `#4b5566` | `#a3aab8` | Secondary text |
| `--faint` | `#8b909b` | `#6f7688` | Captions / labels |
| `--line` | `#e2dfd8` | `#2b303b` | Borders / rules |
| `--accent` | `#2f5d8a` | `#7fb3e8` | **The single identity accent** (ink blue) |
| `--accent-2` | `#9a4f72` | `#d98fb6` | Data accent (muted plum) |
| `--amber` | `#a9762f` | `#d7b06a` | Caution / “undetected” |
| `--good` | `#2f7d55` | `#6fbf94` | Success |
| `--bad` | `#b0453c` | `#e08b84` | Error / failure |
| `--shadow` | `0 1px 2px rgba(22,35,60,.04), 0 10px 30px -22px rgba(22,35,60,.35)` | `0 1px 2px rgba(0,0,0,.4), 0 14px 34px -22px rgba(0,0,0,.8)` | Panel shadow (Stack A) |

Stack B uses the same names; its `--shadow` is
`0 1px 2px rgba(22,35,60,.05), 0 12px 30px -22px rgba(22,35,60,.35)` (light) /
`0 1px 2px rgba(0,0,0,.4), 0 16px 36px -22px rgba(0,0,0,.8)` (dark).

### 1.2 Tailwind tokens (Stack A only)

`src/app/globals.css` maps the CSS variables into Tailwind via `@theme inline`:

```css
@theme inline {
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-faint: var(--faint);
  --color-line: var(--line);
  --color-accent: var(--accent);
  --color-accent-2: var(--accent-2);
  --color-amber: var(--amber);
  --color-good: var(--good);
  --color-bad: var(--bad);
  --font-sans: var(--font-geist-sans);
  --font-serif: var(--font-source-serif);
  --font-mono: var(--font-geist-mono);
}
```

This yields utilities such as `bg-surface`, `bg-surface-2`, `bg-surface-3`,
`text-ink`, `text-muted`, `text-faint`, `border-line`, `bg-accent`,
`text-accent`, `border-accent/60`, `bg-accent/12`, `text-good`, `text-bad`,
`bg-amber/[0.07]`, plus `font-sans`, `font-serif`, `font-mono`.

Dark mode is opt-in via the `.dark` class on `<html>`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

### 1.3 Data palette (state vectors, axes, error) — Stack A

Source: `src/lib/theme.ts` (`PALETTES`). Used both in HTML and inside the 3D scene.

```ts
export const PALETTES = {
  light: { original:"#2f5d8a", transformed:"#9a4f72", error:"#a9762f",
           axisX:"#b0524a", axisY:"#4a7d5a", axisZ:"#3f5f9a",
           grid:"#9aa0aa", equator:"#4b5566", shell:"#3f5f9a", wire:"#bcbfc7" },
  dark:  { original:"#7fb3e8", transformed:"#d98fb6", error:"#d7b06a",
           axisX:"#d08b84", axisY:"#7fbf9b", axisZ:"#8fb3e8",
           grid:"#7d8494", equator:"#c9cdd6", shell:"#8fb3e8", wire:"#525a6b" },
};
```

Stack B defines the equivalent object inline in `main.js` (`palette()`), reading
`document.documentElement.classList.contains("dark")`.

### 1.4 Essential colour rules

- **One identity accent only** (`--accent`). Data colours (`accent-2`, `amber`,
  `good`, `bad`) are for *physics/feedback*, not decoration.
- **No multicolour gradients** as identity. The only gradient is a very subtle
  single-accent radial tint on `body`:
  `radial-gradient(90rem 44rem at 50% -20%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 60%)`.
- **Light mode is the default.** Dark is opt-in and persisted in `localStorage`
  under the key `qc-theme`.
- Mixed/soft values are produced with `color-mix(in srgb, var(--x) N%, transparent)`.

---

## 2. Typography

### 2.1 Font families

| Role | Stack A (`src/app/layout.tsx`, `next/font/google`) | Stack B (`submission/module2/index.html`) |
|---|---|---|
| Sans (body/UI) | **Geist** → `--font-geist-sans` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (`--sans`) |
| Serif (display) | **Source Serif 4** → `--font-source-serif` | `Georgia, "Iowan Old Style", "Times New Roman", Times, serif` (`--serif`) |
| Mono (labels/code) | **Geist Mono** → `--font-geist-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace` (`--mono`) |

`body` uses the sans family; `--font-serif` is exposed as Tailwind `font-serif`
and the `.serif` class.

### 2.2 Classes and hierarchy (defined in `globals.css` / Stack B `<style>`)

| Class | Spec | Use |
|---|---|---|
| `.serif` | serif family | Numeric “page number” in transitions/roadmap |
| `.eyebrow` | mono, `0.72rem`, `letter-spacing:.22em`, `uppercase`, `color:var(--accent)` | Small uppercase labels |
| `.headline` | serif, `font-weight:600`, `letter-spacing:-.015em`, `line-height:1.08`, `color:var(--ink)`, `text-wrap:balance` | Section / page headlines |
| `.dek` | `1.0625rem`, `line-height:1.6`, `color:var(--muted)`, `max-width:46ch` (A) / `52ch` (B) | Intro / lead paragraph |
| `.caption` | `0.75rem`, `line-height:1.5`, `color:var(--faint)` | Captions, hints |
| `.rule` | `height:1px; background:var(--line)` | Editorial divider |
| `.article-prose` (A) / `.prose` (B) | `1.0625rem`, `line-height:1.7`, `color:var(--muted)`; `p{max-width:62ch}`; `strong{color:var(--ink)}` | Long-form prose |

**Heading usage in practice** (from the components):
- Page title (cover): `<h1 className="headline ... text-[2.75rem] leading-[1.04] sm:text-6xl">` (`ModuleHero.tsx`).
- Page title (lesson): `PageHeader` renders `<h2 className="headline mt-4 text-3xl sm:text-4xl">` (`ui/editorial.tsx`).
- In-page sub-headings: `text-2xl`/`font-size:1.7rem` on `.headline`.
- Panel headings: `text-sm font-semibold` (A) / `.panel h3 { font-size:14px; font-weight:600 }` (B).

### 2.3 Mathematical typography

- **Stack A:** KaTeX. `.katex{font-size:1.02em}`, `.katex-display{margin:0;padding:.3rem 0;overflow-x:auto}`.
- **Stack B:** serif HTML math. `.eq` (block equation), `.m` (inline), `.state-eq`
  (register expressions), `.eq .op` (operators in muted), `.state-eq .coef`
  (coefficients in muted), `<i>` renders italic serif.

Both use Unicode kets (`|0⟩`, `|+⟩`), `√2`, `−` (U+2212 minus), subscripts via `<sub>`.

### 2.4 Weights & tracking

- Body: 400; strong: 600; headings: 600.
- Mono labels: `letter-spacing .18em–.25em`, uppercase.
- `body { font-feature-settings:"kern","liga" }` (Stack A).

---

## 3. Layout

### 3.1 Content width & page frame

| | Stack A | Stack B |
|---|---|---|
| Module frame | `mx-auto w-full max-w-5xl px-4 pb-24 pt-12 sm:px-6` (`src/app/module/1/layout.tsx`) | `.container { max-width:1040px; margin:0 auto; padding:48px 20px 96px }` |
| Header | `max-w-5xl` (root layout) | `.header-inner { max-width:1040px; height:64px; padding:0 20px }` |
| Footer | `max-w-5xl`, `py-8` | `.footer-inner { max-width:1040px; padding:28px 20px }` |

### 3.2 Responsive breakpoints

- **Stack A:** Tailwind defaults — `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`.
- **Stack B:** custom media queries at `640px` (transition), `680px` (roadmap),
  `960px` (`.grid-two`, `.sticky-col`, `.cover`).

### 3.3 Grids & experiment layout

The standard “experiment spread” is a two-column grid: **sticky visual on the left,
controls on the right**; stacked on mobile.

- Stack A: `grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]` with the visual in `<div className="lg:sticky lg:top-24">`.
- Stack B: `.grid-two { display:grid; gap:32px; grid-template-columns:1fr }` → `@media(min-width:960px){ grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) }`; `.sticky-col { position:sticky; top:88px }` at ≥960px.

Cover layout: Stack A `grid gap-12 lg:grid-cols-[1.12fr_1fr] lg:items-center`;
Stack B `.cover { grid-template-columns:1.1fr 1fr }` at ≥960px.

### 3.4 Spacing rhythm

- Section separation: `mt-16` / `mt-24` (A); `margin-top:64px` (B).
- Transition block: `mt-16 border-t border-line pt-8` (A) / `.transition{margin-top:64px;border-top:1px solid var(--line);padding-top:32px}` (B).
- Panel padding: `p-5` (A `Panel`) / `18px` (B `.panel`).
- Stack gaps: `space-y-5`, `gap-6` (A) / `.stack{gap:18px}` (B).

### 3.5 Radius & shadow

| Element | Radius | Shadow |
|---|---|---|
| `.panel` | `0.9rem` (A) / `14px` (B) | `var(--shadow)` |
| `.panel-quiet` / `.quiet` | `0.75rem` (A) / `11px` (B) | none |
| Buttons | `rounded-lg`/`rounded-xl` (A) / `9px` (B) | none |
| Chips | `rounded-lg` (A) / `9px` (B) | selected: `shadow-[0_0_20px_-8px_var(--color-accent)]` (A) |
| Equation block | `rounded-xl` (A) / `12px` (B) | none |
| Bloch container | `rounded-2xl` (A `BlochSphere`) / `16px` (B `.bloch-wrap`) | `--shadow` on A, border on B |

---

## 4. UI components

### 4.1 Stack A (Next.js) — files & reuse

| Component | File | Notes / reuse |
|---|---|---|
| `Panel` | `src/components/ui/primitives.tsx` | `<div className="panel p-5">` wrapper. Use for control groups. |
| `Button` | `src/components/ui/primitives.tsx` | `variant: primary\|secondary\|ghost\|danger\|success`, `size: sm\|md\|lg`, `active`. |
| `Chip` | `src/components/ui/primitives.tsx` | Selectable pill; `selected` prop; `aria-pressed`. |
| `Callout` | `src/components/ui/primitives.tsx` | `tone: info\|insight\|warning\|success`; mono uppercase label. |
| `SectionHeading` | `src/components/ui/primitives.tsx` | `eyebrow`, `title`, `lead`. |
| `Stat` | `src/components/ui/primitives.tsx` | KPI box (label/value/hint). |
| `FieldRow` | `src/components/ui/primitives.tsx` | label → value row. |
| `LegendItem` | `src/components/ui/primitives.tsx` | dot + label for vector legends. |
| `PageHeader` | `src/components/ui/editorial.tsx` | `number`, `kicker`, `title`, `dek`; renders `border-t` + `.headline`. |
| `Expandable` | `src/components/ui/editorial.tsx` | Progressive disclosure (“Why?”); animated with framer-motion. |
| `KeyIdea` / `Notice` | `src/components/ui/editorial.tsx` | Short editorial callouts. |
| `RangeSlider` | `src/components/ui/RangeSlider.tsx` | Label + value + `input.range`; sets `--range-progress`. |
| `Tex` | `src/components/math/Tex.tsx` | `katex.renderToString` (SSR-safe). |
| `Equation` / `MathInline` | `src/components/math/Equation.tsx` | Block equation / inline math. |
| `MathMatrix` | `src/components/math/MathMatrix.tsx` | 2×2 complex matrix in KaTeX (`\begin{pmatrix}`), optional highlight. |
| `latexComplex`, `matrixToLatex` | `src/components/math/latex.ts` | Complex/matrix → LaTeX. |
| `BlochSphere` | `src/components/bloch/BlochSphere.tsx` | Canvas wrapper (`dynamic ssr:false`), palette-aware, `arrows` prop. |
| `BlochScene` | `src/components/bloch/BlochScene.tsx` | R3F scene + `OrbitControls`. |
| `SceneArrow` | `src/components/bloch/SceneArrow.tsx` | Animated slerped arrow. |
| `PageTransition` | `src/components/experience/PageTransition.tsx` | “Next” block with `nextNumber`, `question`, `teaser`, `href`, `action`. |
| `BackLink` | `src/components/experience/BackLink.tsx` | “← Previous · …”. |
| `ModuleHero` | `src/components/experience/ModuleHero.tsx` | Cover (label/title/subtitle/dek/CTA + hero Bloch sphere). |
| `SiteHeader` / `ThemeToggle` / `ScrollToTop` | `src/components/site/*`, `src/components/theme/*` | Masthead, theme toggle, scroll reset. |
| `usePalette`, `useScheme`, `toggleScheme` | `src/lib/theme.ts` | Theme + data palette. |
| `cn` | `src/lib/cn.ts` | class joiner. |

### 4.2 Stack B (Vanilla) — CSS classes + JS functions

CSS classes (in `submission/module2/index.html`):
`.btn`, `.btn.primary`, `.btn.ghost`, `.chip`, `.chip.active`, `.chip-row`, `.toolbar`,
`.panel`, `.quiet`, `.grid-two`, `.stack`, `.sticky-col`, `.eq`, `.m`, `.state-eq`,
`.keyidea`, `.notice`, `details.expand`, `.bloch-wrap`, `.legend`, `.bloch-hint`,
`.circuit`, `.parity` (`.pq-*`), `.syndrome-strip`, `.cmp-row`, `.result-tag`,
`.transition`, `.roadmap`, `.backlink`, `.pill`, `.cover`, `.feedback`, `.step`.

JS functions (in `submission/module2/main.js`):
`pageHead()`, `backLink()`, `legendHTML()`, `circuitSVG()`, `paritySVG()`,
`syndromeHTML()`, `regHTML()`/`ampHTML()`, `symbolicOriginal()`/`symbolicAfter()`,
`BlochSphere` (Canvas 2D class), `renderCover()`, `renderRepetition()`,
`renderSyndrome()`, `renderPhaseFlip()`, and the hash router (`go()`).

### 4.3 Code examples (copied from the codebase)

**Button (Stack A):**
```tsx
<Button variant="primary" onClick={newChallenge} className="w-full">
  New challenge →
</Button>
```

**Chip selector (Stack A):**
```tsx
<Chip selected={baseKey === named.key} onClick={() => selectPreset(named.key)}>
  {named.label}
</Chip>
```

**Equation (Stack A):**
```tsx
<Equation tex="|\psi\rangle = \cos(\theta/2)\,|0\rangle + e^{i\varphi}\sin(\theta/2)\,|1\rangle" />
```

**Page transition (Stack A):**
```tsx
<PageTransition
  nextNumber="02"
  question="Are X, Y and Z all there is?"
  teaser={<>They are just π rotations…</>}
  href="/module/1/pauli-basis"
  action="See the Pauli basis"
/>
```

**Button / chip / panel (Stack B):**
```html
<button class="btn primary" id="check">Check Parity</button>
<button class="chip active" data-q="1">q2</button>
<div class="panel"><h3>Round 1 of 3</h3> … </div>
```

**Bloch sphere (Stack A):**
```tsx
<BlochSphere
  arrows={[
    { id: "base", vector: blochTuple(baseBloch), color: palette.original },
    { id: "cur",  vector: blochTuple(curBloch),  color: palette.transformed },
  ]}
  className="h-[380px] w-full sm:h-[480px]"
  ariaLabel="Bloch sphere with the initial and current state vectors"
  overlay={<LegendItem color={palette.original} label="Initial" />}
/>
```

---

## 5. Motion

- **Stack A:** `framer-motion@14.1.0`. Page fade uses opacity only (no transform)
  so sticky columns keep working (`src/app/module/1/template.tsx`). `Expandable`
  animates height/opacity. `animate-float` keyframe for the cover sphere.
- **Stack B:** `@keyframes qc-fade` + `.fade-in` / `.reveal` classes; the Canvas
  sphere interpolates with `slerp`.
- Both honour `prefers-reduced-motion`.

## 6. Accessibility conventions already in use

- Interactive elements have `aria-label` / `aria-pressed` / `aria-expanded`.
- Focus rings: `focus-visible:ring-2 focus-visible:ring-accent/60` (A) /
  `outline:2px solid color-mix(in srgb, var(--accent) 60%, transparent)` (B).
- The Bloch canvas uses `touch-action:none` and `cursor:grab` (`.bloch-surface`).
