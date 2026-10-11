/*!
 * Qollab · Module 3 — Surface Code final knowledge check (7 questions).
 * Reuses the shared quiz state machine (createQuiz) so the assessment design is
 * identical to Modules 2 and 4. Loadable as a classic script (window.SurfaceQuiz)
 * or in Node (module.exports).
 */
(function (global) {
  "use strict";

  var createQuiz = (typeof module !== "undefined" && module.exports) ? require("./quizbase.js") : global.createQuiz;

  var QUESTIONS = [
    {
      id: "physical-logical",
      lesson: "From a line to a grid",
      href: "#/module-3/grid",
      question: "A distance-<span class='m'>d</span> surface code uses <span class='m'>d²</span> physical qubits. How many logical qubits does it encode?",
      options: [
        "Exactly one logical qubit.",
        "<span class='m'>d</span> logical qubits.",
        "<span class='m'>d²</span> logical qubits.",
      ],
      correct: 0,
      explanation:
        "The <span class='m'>d² − 1</span> independent tile checks remove all but two states of the register, so any distance protects a single logical qubit.",
    },
    {
      id: "stabilizer-purpose",
      lesson: "Stabilizers as tiles",
      href: "#/module-3/stabilizers",
      question: "What do the recurring stabilizer measurements actually give you?",
      options: [
        "The exact physical error that occurred.",
        "The logical amplitudes <span class='m'><i>α</i></span> and <span class='m'><i>β</i></span>.",
        "A syndrome — which tiles read <span class='m'>−1</span> — without measuring the encoded information.",
      ],
      correct: 2,
      explanation:
        "Each tile measures a joint Pauli product on its corners. The outcomes (the syndrome) reveal where error strings end; the logical state itself is never read.",
    },
    {
      id: "xz-checks",
      lesson: "Stabilizers as tiles",
      href: "#/module-3/stabilizers",
      question: "A single <span class='m'>X</span> error hits one data qubit. Which tiles raise an alarm?",
      options: [
        "The X-type tiles around it.",
        "The Z-type tiles whose corners hold that qubit.",
        "No tile: <span class='m'>X</span> errors are invisible to the surface code.",
      ],
      correct: 1,
      explanation:
        "An <span class='m'>X</span> anticommutes with <span class='m'>Z</span>, so it flips the sign of the nearby Z-tiles. X-tiles are the ones that check for <span class='m'>Z</span> errors.",
    },
    {
      id: "syndrome-shape",
      lesson: "Errors are strings, syndromes are endpoints",
      href: "#/module-3/strings",
      question: "An <span class='m'>X</span> error lands in the bulk of a distance-<span class='m'>5</span> lattice. What does the syndrome look like?",
      options: [
        "One lit Z-tile at the centre.",
        "Two lit Z-tiles, at the two ends of a short error string.",
        "Every Z-tile lights up.",
        "Nothing lights up.",
      ],
      correct: 1,
      explanation:
        "Interior tiles see two errors and stay silent (even parity). Only the endpoints are left with an odd count, so exactly two tiles light up — the string boundary.",
    },
    {
      id: "decoder-matching",
      lesson: "Be the decoder",
      href: "#/module-3/decoder",
      question: "How does a minimum-weight matching decoder read the lit tiles?",
      options: [
        "As physical errors to be reported to the user.",
        "As endpoints to be paired by the shortest connecting strings, or sent to the nearest boundary.",
        "As a request to re-measure the logical qubit directly.",
      ],
      correct: 1,
      explanation:
        "Matching treats lit tiles as endpoints and finds the cheapest pairing (or boundary connection), then flips the qubits along those paths. Any loops it closes are harmless stabilizers.",
    },
    {
      id: "code-distance",
      lesson: "The logical qubit",
      href: "#/module-3/logical",
      question: "For a code with signature <span class='m'>[[d², 1, d]]</span>, how many errors are guaranteed to be corrected?",
      options: [
        "<span class='m'>d</span> errors.",
        "<span class='m'>⌊(d − 1)/2⌋</span> errors.",
        "<span class='m'>d²</span> errors.",
      ],
      correct: 1,
      explanation:
        "Any error of weight below half the distance sits closer to “no error” than to a logical flip, so matching undoes it: one error for <span class='m'>d = 3</span>, two for <span class='m'>d = 5</span>.",
    },
    {
      id: "logical-error",
      lesson: "The logical qubit",
      href: "#/module-3/logical",
      question: "How can an error chain become a logical error?",
      options: [
        "Whenever two errors happen on the same qubit.",
        "When the errors, plus the decoder’s correction, leave a string running from one boundary to the opposite one — no tile alarms, yet the logical qubit flips.",
        "When a Z-tile measures <span class='m'>+1</span>.",
      ],
      correct: 1,
      explanation:
        "A silent chain that spans the whole patch commutes with every stabilizer but anticommutes with the logical operator. Its shortest possible weight is the code distance <span class='m'>d</span>.",
    },
  ];

  var Quiz = createQuiz(QUESTIONS);

  if (typeof module !== "undefined" && module.exports) module.exports = Quiz;
  else global.SurfaceQuiz = Quiz;
})(typeof window !== "undefined" ? window : globalThis);
