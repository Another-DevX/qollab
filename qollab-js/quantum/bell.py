"""Baseline: a Bell pair. No error correction — just proves the pipeline.

    H ──●──      measure both qubits
        │
        X
"""

from qiskit import QuantumCircuit

from .common import DEFAULT_SHOTS, apply_pauli, probability, response, run_circuit

MODEL = "bell"
TITLE = "Bell state (baseline)"
QUBITS = 2


def run(backend, shots=DEFAULT_SHOTS, error_qubit=None, error_pauli="X"):
    qc = QuantumCircuit(2, 2)
    qc.h(0)
    qc.cx(0, 1)
    if error_qubit is not None:  # a deliberate Pauli to break the correlation
        apply_pauli(qc, error_pauli, error_qubit)
    qc.measure([0, 1], [0, 1])

    counts = run_circuit(backend, qc, shots)
    correlated = probability(counts, lambda k: len(set(k)) == 1)
    return response(
        MODEL, TITLE, QUBITS, shots, counts,
        {"correlated": correlated, "note": "The two bits always agree: 00 or 11."},
    )
