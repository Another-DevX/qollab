"""Bit-flip code [[3,1,3]]: the repetition code, as a real circuit.

    |0>_L = (|000> + |111>)/sqrt(2)

    data:  q0 q1 q2        ancillas: a0 = Z0 Z1 , a1 = Z1 Z2
    encode: CX(0,1), CX(0,2)
    error : optional X on one data qubit (the "noise" we want to fix)
    checks: CX(0,a0) CX(1,a0) ; CX(1,a1) CX(2,a1)

The syndrome is decoded *classically* (measure, then correct): no in-circuit
feed-forward is needed, which keeps the circuit simple and works on every backend.
"""

from qiskit import QuantumCircuit

from .common import DEFAULT_SHOTS, apply_pauli, bits_of, response, run_circuit

MODEL = "repetition"
TITLE = "Bit-flip (repetition) code [[3,1,3]]"
QUBITS = 5  # q0 q1 q2 a0 a1

# (a0, a1) -> index of the data qubit to flip, or None when no error is seen.
DIAGNOSIS = {(1, 0): 0, (1, 1): 1, (0, 1): 2, (0, 0): None}


def run(backend, shots=DEFAULT_SHOTS, error_qubit=None, error_pauli="X"):
    qc = QuantumCircuit(QUBITS, QUBITS)
    qc.cx(0, 1)  # encode
    qc.cx(0, 2)
    if error_qubit is not None:
        apply_pauli(qc, error_pauli, error_qubit)
    qc.cx(0, 3)  # a0 = Z0 Z1
    qc.cx(1, 3)
    qc.cx(1, 4)  # a1 = Z1 Z2
    qc.cx(2, 4)
    qc.measure([0, 1, 2, 3, 4], [0, 1, 2, 3, 4])

    counts = run_circuit(backend, qc, shots)
    return response(MODEL, TITLE, QUBITS, shots, counts, _decode(counts))


def _decode(counts):
    total = sum(counts.values()) or 1
    detected = 0
    correct = 0
    logical = {"0": 0, "1": 0}
    for key, n in counts.items():
        data = bits_of(key)[:3]
        a0, a1 = bits_of(key)[3:5]
        flaw = DIAGNOSIS[(a0, a1)]
        if flaw is not None:
            detected += n
            data[flaw] ^= 1  # classical correction
        bit = "1" if sum(data) >= 2 else "0"
        logical[bit] += n
        if bit == "0":
            correct += n
    return {
        "detected": detected / total,
        "logical": {k: v / total for k, v in logical.items()},
        "logical_correct": correct / total,
        "note": "A single X error lights two alarms and is undone classically.",
    }
