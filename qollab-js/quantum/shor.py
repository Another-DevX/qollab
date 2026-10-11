"""Shor code [[9,1,3]]: bit-flip and phase-flip protection at once.

Encoding (the 9 qubits live in three bit-flip blocks of three)::

    H(0); H(3); H(6)               # outer phase-flip code: leaders in |+>
    CX(0,1); CX(0,2)               # inner bit-flip block 0
    CX(3,4); CX(3,5)               # inner bit-flip block 1
    CX(6,7); CX(6,8)               # inner bit-flip block 2

so ``|0>_L = (|000> + |111>)^3 / 2*sqrt(2)``.

One syndrome round measures the 8 stabilizers (6 Z-type inside the blocks, 2
X-type across them) with 8 ancillas. This file reports *detection*: which
stabilizers fire. (Full decoding of Shor uses the same two-level logic and is
left out on purpose, to keep the file short.)
"""

from qiskit import QuantumCircuit

from .common import DEFAULT_SHOTS, apply_pauli, probability, response, run_circuit

MODEL = "shor"
TITLE = "Shor code [[9,1,3]]"
QUBITS = 17  # 9 data + 8 ancillas

DATA = range(0, 9)
ANCILLAS = range(9, 17)
Z_PAIRS = [(0, 1), (1, 2), (3, 4), (4, 5), (6, 7), (7, 8)]
X_BLOCKS = [range(0, 6), range(3, 9)]


def run(backend, shots=DEFAULT_SHOTS, error_qubit=None, error_pauli="X"):
    qc = QuantumCircuit(QUBITS, 8)
    qc.h(0)  # encode: outer phase-flip code -> the three block leaders in |+>
    qc.h(3)
    qc.h(6)
    qc.cx(0, 1)  # inner bit-flip code in each block
    qc.cx(0, 2)
    qc.cx(3, 4)
    qc.cx(3, 5)
    qc.cx(6, 7)
    qc.cx(6, 8)
    if error_qubit is not None:
        apply_pauli(qc, error_pauli, error_qubit)

    for k, (a, b) in enumerate(Z_PAIRS):  # Z-type: CX(data, ancilla)
        qc.cx(a, 9 + k)
        qc.cx(b, 9 + k)
    for k, block in enumerate(X_BLOCKS):  # X-type: H, CX(ancilla, data), H
        ancilla = 15 + k
        qc.h(ancilla)
        for q in block:
            qc.cx(ancilla, q)
        qc.h(ancilla)

    qc.measure(list(ANCILLAS), list(range(8)))
    counts = run_circuit(backend, qc, shots)
    detected = probability(counts, lambda k: "1" in k)
    return response(
        MODEL, TITLE, QUBITS, shots, counts,
        {"detected": detected, "note": "Any lit stabilizer means an error was caught."},
    )
