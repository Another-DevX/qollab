# Module Guidelines — Educational & UX Philosophy

> Derived from the **implemented** Modules 1 and 2. This is a guideline, not a
> rigid template, but new modules should feel like they were written by the same team.

## 1. The north star

The application is an **interactive science magazine / virtual laboratory**:
a guided story in which short explanations lead directly into experiments the
learner manipulates, and the mathematics is revealed *after* the phenomenon has
been observed.

The learner should **read a little, see a lot, and interact often.**

Concrete rules that the current modules follow:

- **Each lesson is a separate page** with its own route.
- **Navigation is by meaningful transition buttons** at the bottom of a page, not
  a navigation bar or a long scroll of stacked sections.
- The interface looks like an **editorial scientific publication**, not an AI
  dashboard: paper background, one accent, serif display type, restrained colour.
- **Experiments are the centrepiece**, not illustrations.
- **Explanations are short and purposeful** (usually one or two `.dek` sentences,
  or a `.keyidea`/`.notice`).
- **Important equations** use the project's math system (KaTeX in Stack A; the
  `.eq`/`.m`/`.state-eq` serif system in Stack B).
- **Progressive disclosure**: deeper maths lives behind `Expandable` (A) or
  `<details class="expand">` (B).
- **Light mode is the default**; dark mode is opt-in.
- **All educational content is in English.**

---

## 2. The typical lesson structure

A well-formed lesson page usually moves through these beats (adapt as needed):

1. **Section label and title** — a `PageHeader` (Stack A) / `pageHead()` (Stack B):
   a number + uppercase kicker + serif headline.
2. **Central conceptual question** — the title *is* usually the question
   (e.g. “Can You Protect a Qubit?”, “Which errors does each code detect?”).
3. **Short explanation when necessary** — one `.dek` or two at most, placed
   **before** the experiment so the learner knows what they are about to try.
4. **Interactive experiment** — the main visual + controls, in the two-column
   “sticky visual / controls” layout.
5. **Dynamic observations** — feedback that responds to what the learner did
   (`Notice`, `KeyIdea`, `.feedback`, `syndrome-strip`, live equations).
6. **Mathematical interpretation** — reveal the equations that explain the
   observed behaviour.
7. **Small challenge when useful** — a short interactive task (e.g. Syndrome
   Detective, “Choose Your Protection”).
8. **Transition to the next page** — a `PageTransition` posing the question that
   opens the next lesson, with the action button.

> The order is a rhythm, not a law. What matters: **question → experiment →
> observation → explanation → challenge → next page.**

---

## 3. How Modules 1 and 2 implement these patterns

### Module 1 (Stack A, `/module/1/*`)

- **Cover** (`/module/1`): `ModuleHero` (label, serif headline, subtitle, one
  short dek, one CTA, a rotating Bloch sphere) + a compact **“The route”** roadmap.
- **Pauli errors** (`/module/1/pauli-errors`): a prominent **“Read the
  transformation”** block with X/Y/Z **tabs** whose equations animate on switch;
  the Bloch experiment with state chips + sliders + Apply X/Y/Z; dynamic readouts.
- **Pauli basis** (`/module/1/pauli-basis`): compact comparison blocks
  (linear combination / sequential / mixture), an interactive rotation, and a
  short “operator vs channel” section.
- **Challenge** (`/module/1/challenge`): identify the hidden Pauli error on the
  Bloch sphere with score/streak.
- **Conclusion** (`/module/1/conclusion`): three short sentences + back-to-cover.
- Each lesson ends with `PageTransition`; each page starts with `BackLink`.

### Module 2 (Stack B, `#/…`)

- **Cover** (`#/`): same editorial cover + a 7-item roadmap (only implemented
  items are links; the rest show “Coming soon”).
- **The Repetition Code** (`#/repetition-code`): guided discovery — a single
  qubit, then **encode into 3 qubits**, then inject an error, then the maths
  (`α|000⟩+β|111⟩`) and a correction challenge.
- **Discovering the Syndrome** (`#/syndrome`): a parity diagram where the two
  links are clickable; a syndrome table that fills in as the learner discovers
  rows; a **Syndrome Detective** game (measure → diagnose → confirm → correct →
  verify, 3 rounds); a short “What did we actually measure?” reveal.
- **The Phase-Flip Problem** (`#/phase-flip`): a compact **Case A / Case B**
  comparison, a Bloch basis-change experiment, a **Change the Encoding**
  experiment (ZZ vs XX), the Hadamard connection, and a “Choose Your Protection”
  challenge.
- Each page ends with the `.transition` block; each starts with a `.backlink`.

---

## 4. Examples of successful interactive components

| Pattern | Where | Why it works |
|---|---|---|
| Animated equation on tab switch | `PauliErrorsExperience` (A) | Links the operator to its matrix and effect instantly. |
| Amplitude before/after with highlighting | `PauliErrorsExperience` (A) | Makes “which amplitude changed” visible. |
| Parity links showing ±1 | `paritySVG` (B) | Turns an abstract stabilizer into a clickable, readable object. |
| Syndrome table revealed row-by-row | `updateRevealA` (B) | Rewards exploration instead of dumping a table. |
| Measure → diagnose → correct state machine | `detective.js` (B) | One source of truth; teaches the real workflow. |
| ZZ vs XX side-by-side | `updateB` (B) | Makes “the basis changes what you detect” concrete. |
| Basis toggle on a Bloch sphere | `updateBasis` (B) | Shows the same Z acting differently in two bases. |
| Expandable “Why …?” | `Expandable` (A) / `details.expand` (B) | Keeps the page light while preserving depth. |

---

## 5. Content-length & visual-density recommendations

- **One idea per block.** One equation, one visual, one interaction.
- **No paragraph longer than ~3 short lines on desktop.** Move anything longer
  into an `Expandable`/`details` or split it.
- Prefer **`.dek` (1–2 sentences)** and **`.caption`** over prose paragraphs.
- **Move explanations above the experiment**; keep only short dynamic feedback
  below it.
- Aim to **reduce visible text ~35–50%** versus a textbook treatment.
- Whitespace is a feature: `mt-16`/`mt-24` between spreads, generous panel padding.
- Use **at most one accent colour**; colour is reserved for meaning (original vs
  transformed vector, detected vs undetected, correct vs wrong).

---

## 6. What to avoid (observed as failure modes)

- ❌ **Long scrolling articles** that stack many sections in one document.
- ❌ **Generic AI-generated aesthetics**: rainbow/neon gradients, glassmorphism,
  giant hero cards, emoji-laden copy.
- ❌ **Excessive cards/containers** — prefer borders, rules and whitespace.
- ❌ **Redundant experiments** that repeat what a previous page already taught
  (this is why Module 2 Page 3’s first experiment was replaced by a comparison).
- ❌ **Overcomplicated navigation** (tab bars, sidebars, breadcrumbs). Navigation
  is: cover → lesson → transition → lesson → conclusion, plus a subtle “Previous”.
- ❌ **Inaccurate quantum visualisations**: never imply cloning, never treat
  entangled qubits as independent copies, never claim a single Pauli models all
  noise, never read out logical amplitudes from a syndrome, never ignore global
  phase equivalence.
- ❌ **Disconnected simulations**: every experiment must connect to the concept
  that precedes it and the question that follows it.

---

## 7. Voice & tone

- Concise, intelligent, elegant, accessible, editorial. Not robotic, not
  overexcited, no motivational filler.
- Prefer **questions** as titles (“Can You Protect a Qubit?”).
- Prefer **specific, physical language** (“the vector moves from +X to −X”).
- Keep the scientific distinctions explicit but brief (see §6 inaccuracy list).

## 8. Scientific-correctness checklist (carried from M1/M2)

- Global phase is never observable on the Bloch sphere.
- Pauli operators are unitary and Hermitian; X/Y/Z = π rotations.
- `{I, X, Y, Z}` spans all 2×2 complex matrices.
- Sequential application (product) ≠ linear combination ≠ probabilistic mixture.
- A unitary maps pure→pure; a channel (Kraus `ρ' = Σ E_k ρ E_k†`,
  `Σ E_k†E_k = I`) can map pure→mixed.
- Bit-flip repetition code: ZZ stabilizers detect single X errors.
- Phase-flip repetition code: XX stabilizers detect single Z errors.
- Syndrome 00 means “undetected by these checks”, **not** “no error occurred”.
