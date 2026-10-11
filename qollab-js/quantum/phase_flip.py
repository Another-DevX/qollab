"""Phase-flip code [[3,1,3]]: the X-basis twin of the repetition code.

It protects against Z errors. The logical states are the X-basis product states

    |0>_L = |+++>        |1>_L = |--->

so ``|0>_L`` is prepared with one Hadamard per data qubit, and the checks are
X-type:

    data:  q0 q1 q2        checks: a0 = X0 X1 , a1 = X1 X2
    prepare: H(0), H(1), H(2)
    error : optional Z on one data qubit
    checks: H(a); CX(a, i); CX(a, j); H(a)   (measure X_i X_j)

Data are read in the X basis (H before measuring), so a Z error shows up as a
flipped bit, and the syndrome is decoded classically.
"""

from qiskit import QuantumCircuit

from .common import DEFAULT_SHOTS, apply_pauli, bits_of, response, run_circuit

MODEL = "phase_flip"
TITLE = "Phase-flip code [[3,1,3]]"
QUBITS = 5  # q0 q1 q2 a0 a1

DIAGNOSIS = {(1, 0): 0, (1, 1): 1, (0, 1): 2, (0, 0): None}


def run(backend, shots=DEFAULT_SHOTS, error_qubit=None, error_pauli="Z"):
    qc = QuantumCircuit(QUBITS, QUBITS)
    qc.h(0)  # prepare |0>_L = |+++>
    qc.h(1)
    qc.h(2)
    if error_qubit is not None:
        apply_pauli(qc, error_pauli, error_qubit)
    _x_check(qc, 3, (0, 1))  # a0 = X0 X1
    _x_check(qc, 4, (1, 2))  # a1 = X1 X2
    qc.h(0)  # read data in the X basis
    qc.h(1)
    qc.h(2)
    qc.measure([0, 1, 2, 3, 4], [0, 1, 2, 3, 4])

    counts = run_circuit(backend, qc, shots)
    return response(MODEL, TITLE, QUBITS, shots, counts, _decode(counts))


def _x_check(qc, ancilla, qubits):
    qc.h(ancilla)
    qc.cx(ancilla, qubits[0])
    qc.cx(ancilla, qubits[1])
    qc.h(ancilla)


def _decode(counts):
    total = sum(counts.values()) or 1
    detected = 0
    correct = 0
    logical = {"0": 0, "1": 0}
    for key, n in counts.items():
        bits = bits_of(key)
        data = bits[:3]
        a0, a1 = bits[3:5]
        flaw = DIAGNOSIS[(a0, a1)]
        if flaw is not None:
            detected += n
            data[flaw] ^= 1  # a Z error flips the X-basis outcome
        bit = "1" if sum(data) >= 2 else "0"
        logical[bit] += n
        if bit == "0":
            correct += n
    return {
        "detected": detected / total,
        "logical": {k: v / total for k, v in logical.items()},
        "logical_correct": correct / total,
        "note": "A single Z error is caught by the X-basis checks.",
    }
