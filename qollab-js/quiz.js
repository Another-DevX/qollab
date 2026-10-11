/*!
 * Qollab · Module 2 — final knowledge check.
 * Questions and scoring logic, kept separate from the UI.
 * Loadable as a classic script (window.Quiz) or in Node (module.exports).
 */
(function (global) {
  "use strict";

  var createQuiz = (typeof module !== "undefined" && module.exports) ? require("./quizbase.js") : global.createQuiz;

  var QUESTIONS = [
    {
      id: "rep-encoding",
      lesson: "The Repetition Code",
      href: "#/module-2/repetition-code",
      question: "In the three-qubit repetition code, what does the encoding <span class='m'>|<i>ψ</i><sub>L</sub>⟩ = <i>α</i>|000⟩ + <i>β</i>|111⟩</span> accomplish?",
      options: [
        "creates three independent copies of the qubit.",
        "encodes one logical qubit into an entangled three-qubit state.",
        "measures the qubit to learn its value.",
      ],
      correct: 1,
      explanation:
        "The encoder is a single unitary (two CNOT gates) acting on the qubit and two ancillas — it does not clone. It produces one entangled state whose amplitudes carry α and β.",
    },
    {
      id: "syn-what",
      lesson: "Discovering the Syndrome",
      href: "#/module-2/syndrome",
      question: "What does a stabilizer syndrome reveal?",
      options: [
        "The exact physical error that occurred.",
        "The logical amplitudes α and β.",
        "Information about an error without directly measuring the logical amplitudes.",
      ],
      correct: 2,
      explanation:
        "Stabilizer measurements are joint parity checks. They reveal relationships between qubits — not the encoded amplitudes, which they leave intact.",
    },
    {
      id: "syn-read",
      lesson: "Discovering the Syndrome",
      href: "#/module-2/syndrome",
      question: "The two ZZ checks return the syndrome <span class='m'><i>s</i> = (1, 1)</span>, i.e. <span class='m'><i>S</i>₁ = −1</span> and <span class='m'><i>S</i>₂ = −1</span>. What does this indicate?",
      options: [
        "A single X error on q1.",
        "A single X error on q2.",
        "A single Z error on q2.",
      ],
      correct: 1,
      explanation:
        "Z₁Z₂ flips only if q1 or q2 flipped; Z₂Z₃ only if q2 or q3 did. Both flipping points to the middle qubit, q2 — the bit-flip repetition code locates single X errors.",
    },
    {
      id: "phase-z",
      lesson: "The Phase-Flip Problem",
      href: "#/module-2/phase-flip",
      question: "Why does the bit-flip repetition code fail to detect a Z error?",
      options: [
        "Because Z changes the computational-basis populations.",
        "Because Z commutes with the ZZ stabilizers.",
        "Because Z is not a unitary operation.",
      ],
      correct: 1,
      explanation:
        "Z anticommutes with X but commutes with Z, so the ZZ checks still return +1: the syndrome stays 00 even though the relative phase changed.",
    },
    {
      id: "shor-basis",
      lesson: "Building the Shor Code",
      href: "#/module-2/shor-code",
      question: "What is the logical <span class='m'>|<i>0</i><sub>L</sub>⟩</span> of the Shor code?",
      options: [
        "<span class='m'>|000000000⟩</span>",
        "<span class='m'>|<i>G</i><sub>+</sub>⟩ ⊗ |<i>G</i><sub>+</sub>⟩ ⊗ |<i>G</i><sub>+</sub>⟩</span>",
        "<span class='m'>|+⟩ ⊗ |+⟩ ⊗ … (nine times)</span>",
      ],
      correct: 1,
      explanation:
        "The logical zero is the tensor product of three GHZ blocks |G+⟩ = (|000⟩ + |111⟩)/√2, written |G+⟩^⊗3.",
    },
    {
      id: "shor-ghz",
      lesson: "Building the Shor Code",
      href: "#/module-2/shor-code",
      question: "Which sequence prepares <span class='m'>|<i>G</i><sub>+</sub>⟩ = (|000⟩ + |111⟩)/√2</span> from <span class='m'>|000⟩</span>?",
      options: [
        "CNOT(q1,q2), CNOT(q1,q3), then H(q1).",
        "H(q1), then CNOT(q1,q2) and CNOT(q1,q3).",
        "H on all three qubits.",
      ],
      correct: 1,
      explanation:
        "Hadamard on q1 creates a superposition; the two CNOTs then spread the correlation to q2 and q3, producing the entangled GHZ state.",
    },
    {
      id: "shor-stabs",
      lesson: "Detecting and Correcting Errors",
      href: "#/module-2/shor-decoder",
      question: "How many stabilizers does the Shor code use to detect errors?",
      options: [
        "Two — one per GHZ block.",
        "Six — all of them of type Z.",
        "Eight — six Z-type and two X-type.",
      ],
      correct: 2,
      explanation:
        "Six ZZ checks detect bit flips within the blocks; two X-type checks compare neighboring blocks to detect phase flips.",
    },
    {
      id: "shor-logical",
      lesson: "Breaking the Code",
      href: "#/module-2/break-code",
      question: "Can a physical error produce the syndrome <span class='m'>00000000</span> and still change the logical state?",
      options: [
        "No — a zero syndrome means no error occurred.",
        "Yes — a nontrivial logical operator commutes with all stabilizers.",
        "Only if the error acts on the first physical qubit.",
      ],
      correct: 1,
      explanation:
        "Logical operators such as X̄ = Z₁Z₄Z₇ commute with every stabilizer, so the syndrome stays 00 while the encoded information changes.",
    },
    {
      id: "distance",
      lesson: "Breaking the Code",
      href: "#/module-2/break-code",
      question: "What does <span class='m'>[[9, 1, 3]]</span> represent?",
      options: [
        "Nine logical qubits, one physical qubit, three correctable errors.",
        "Nine physical qubits, one logical qubit, code distance three.",
        "Nine gates, one ancilla, three measurements.",
      ],
      correct: 1,
      explanation:
        "n = 9 physical qubits encode k = 1 logical qubit; the distance d = 3 is the minimum weight of a nontrivial logical operator, so any single-qubit error is guaranteed correctable.",
    },
    {
      id: "noise",
      lesson: "Noise Laboratory",
      href: "#/module-2/noise-lab",
      question: "Does using more physical qubits always reduce the logical failure probability?",
      options: [
        "Yes — more redundancy always helps.",
        "No — it depends on the noise model, the physical error rate, and the decoding procedure.",
        "Yes — as long as the code distance is odd.",
      ],
      correct: 1,
      explanation:
        "More qubits also expose more systems to noise. Error correction only helps when the protection outweighs the added exposure — it depends on the regime.",
    },
  ];

  var Quiz = createQuiz(QUESTIONS);

  if (typeof module !== "undefined" && module.exports) module.exports = Quiz;
  else global.Quiz = Quiz;
})(typeof window !== "undefined" ? window : globalThis);
