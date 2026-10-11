"""Rotated surface code, distance 3: one round of the Z-type checks.

This is the bit-flip half of the surface code (exactly the model Module 3 uses):
the 4 Z-type plaquettes of a d = 3 patch, each measured with one ancilla, detect
X errors on the data qubits. Because every Z-check is a product of Z operators,
``|0...0>`` is already a +1 eigenstate, so no encoding circuit is needed: the
round reads all +1 until we inject an X error.

Geometry (same as ``surface.js``):

* data qubit ``(r, c)`` -> index ``r * 3 + c`` on a 3x3 grid;
* face ``(i, j)`` touches ``(i-1, j-1), (i-1, j), (i, j-1), (i, j)``;
* type **Z** when ``i + j`` is odd;
* every bulk face is kept, plus Z faces on the left/right columns.

One round is 9 data + 4 ancilla = 13 qubits. The X-type checks (which would need
a properly prepared logical state) are intentionally left out.
"""

from qiskit import QuantumCircuit

from .common import apply_pauli, parse_options, probability, response, run_circuit

MODEL = "surface"
TITLE = "Surface code d = 3 (Z-checks, detects X errors)"
DISTANCE = 3
DATA_COUNT = DISTANCE * DISTANCE  # 9
QUBITS = DATA_COUNT + 4  # + 4 Z-check ancillas


def _z_checks(d):
    """Z-type plaquettes ``(i, j)`` of the kept faces, as in Module 3."""
    checks = []
    for i in range(d + 1):
        for j in range(d + 1):
            if (i + j) % 2 == 0:  # even faces are X-type
                continue
            bulk = 1 <= i <= d - 1 and 1 <= j <= d - 1
            left_right = (j in (0, d)) and 1 <= i <= d - 1
            if not (bulk or left_right):
                continue
            qubits = [
                r * d + c
                for (r, c) in ((i - 1, j - 1), (i - 1, j), (i, j - 1), (i, j))
                if 0 <= r < d and 0 <= c < d
            ]
            checks.append((i, j, qubits))
    return checks


def run(backend, params_json="{}"):
    shots, error_qubit, error_pauli = parse_options(params_json)
    checks = _z_checks(DISTANCE)
    qc = QuantumCircuit(QUBITS, len(checks))
    if error_qubit is not None:
        apply_pauli(qc, error_pauli, error_qubit)
    for k, (_i, _j, qubits) in enumerate(checks):
        ancilla = DATA_COUNT + k
        for q in qubits:
            qc.cx(q, ancilla)

    qc.measure(list(range(DATA_COUNT, QUBITS)), list(range(len(checks))))
    counts = run_circuit(backend, qc, shots)
    detected = probability(counts, lambda k: "1" in k)
    return response(
        MODEL, TITLE, QUBITS, shots, counts,
        {
            "detected": detected,
            "checks": [{"face": [i, j], "qubits": qubits} for (i, j, qubits) in checks],
            "note": "An X error lights the 1 or 2 Z-checks around it.",
        },
    )
