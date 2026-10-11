/*!
 * Qollab · Module 4 — Iceberg code final knowledge check (5 questions).
 * Reuses the shared quiz state machine (createQuiz) so the assessment design is
 * identical to Module 2. Loadable as a classic script (window.IcebergQuiz) or
 * in Node (module.exports).
 */
(function (global) {
  "use strict";

  var createQuiz = (typeof module !== "undefined" && module.exports) ? require("./quizbase.js") : global.createQuiz;

  var QUESTIONS = [
    {
      id: "notation",
      lesson: "Four Physical, Two Logical",
      href: "#/module-4/four-physical-two-logical",
      question: "What does the notation <span class='m'>[[4, 2, 2]]</span> mean for the Iceberg code?",
      options: [
        "Four physical qubits, two logical qubits, code distance two.",
        "Four logical qubits, two physical qubits, two stabilizers.",
        "Four stabilizers, two correctable errors, distance two.",
      ],
      correct: 0,
      explanation:
        "n = 4 physical qubits encode k = 2 logical qubits, because the two stabilizers leave 2⁴ / 2² = 4 code states. The distance d = 2 is the minimum weight of a nontrivial logical operator.",
    },
    {
      id: "syndrome",
      lesson: "Detecting Quantum Errors",
      href: "#/module-4/detecting-errors",
      question: "A single-qubit error gives the syndrome <span class='m'><i>S</i><sub>X</sub> = −1</span>, <span class='m'><i>S</i><sub>Z</sub> = +1</span>. What does this tell you?",
      options: [
        "A Z-type error occurred — but not on which qubit.",
        "An X-type error occurred on qubit 1.",
        "No error occurred.",
      ],
      correct: 0,
      explanation:
        "The syndrome reveals the error <em>type</em>: a Z error anticommutes with S_X. It does not reveal the <em>location</em> — every Z_i gives this same syndrome.",
    },
    {
      id: "detect-vs-correct",
      lesson: "Why Can't We Correct Them?",
      href: "#/module-4/why-not-correct",
      question: "Why can the [[4,2,2]] code detect every single-qubit error but not correct it?",
      options: [
        "Because detection and correction are unrelated ideas.",
        "Because all four locations of the same error share one syndrome, so the location cannot be identified.",
        "Because the two stabilizers do not commute.",
      ],
      correct: 1,
      explanation:
        "A single X error is detected, but X₁, X₂, X₃ and X₄ all produce the same syndrome. Without knowing the location, any correction is a guess.",
    },
    {
      id: "postselection",
      lesson: "The Postselection Experiment",
      href: "#/module-4/postselection",
      question: "In the postselection experiment, what does discarding detected runs achieve?",
      options: [
        "It guarantees the accepted runs contain no logical errors.",
        "It keeps only runs whose state lies in the code space, at the cost of discarding data — accepted runs can still hide a logical error.",
        "It removes the need for stabilizer measurements.",
      ],
      correct: 1,
      explanation:
        "Postselection rejects runs where an error was detected, so the retained sample stays in the code space — but a trivial syndrome does not exclude an undetectable logical error.",
    },
    {
      id: "logical",
      lesson: "Break the Iceberg Code",
      href: "#/module-4/break-the-code",
      question: "The operator <span class='m'><i>X</i><sub>1</sub><i>X</i><sub>2</sub></span> has syndrome <span class='m'>+1, +1</span> — no error detected. What is it?",
      options: [
        "A stabilizer, so it acts as the identity on the code space.",
        "A nontrivial logical operator of weight two, invisible to the syndrome.",
        "An undetectable physical X error on a single qubit.",
      ],
      correct: 1,
      explanation:
        "X₁X₂ commutes with both stabilizers but is not a stabilizer, so it acts nontrivially on the logical qubits. Its weight 2 equals the code distance — the smallest undetectable logical error.",
    },
  ];

  var Quiz = createQuiz(QUESTIONS);

  if (typeof module !== "undefined" && module.exports) module.exports = Quiz;
  else global.IcebergQuiz = Quiz;
})(typeof window !== "undefined" ? window : globalThis);
