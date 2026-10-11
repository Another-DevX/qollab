"""Iceberg code [[4,2,2]] (Module 4): detection without correction.

Four data qubits with two stabilizers::

    S_X = X0 X1 X2 X3      S_Z = Z0 Z1 Z2 Z3

Each stabilizer is measured with one ancilla (X with ``H, CX(anc, q), H``, Z with
``CX(q, anc)``). The code state is the 4-qubit GHZ ``(|0000> + |1111>) / sqrt(2)``,
which is a +1 eigenstate of both stabilizers. An X error flips ``S_Z``; a Z error
flips ``S_X``. This is detection only: the code cannot say *where* the error is,
so it cannot correct it — the point of Module 4.
"""

from qiskit import QuantumCircuit

from .common import apply_pauli, bits_of, parse_options, probability, response, run_circuit

MODEL = "iceberg"
TITLE = "Iceberg code [[4,2,2]] (detection)"
QUBITS = 6  # 4 data + S_X ancilla + S_Z ancilla
SX_ANCILLA = 4
SZ_ANCILLA = 5


def build(error_qubit=None, error_pauli="X"):
    """Prepare the GHZ code state and measure both checks (shared with quantum.noise)."""
    qc = QuantumCircuit(QUBITS, QUBITS)
    qc.h(0)  # prepare a codestate: |0000> + |1111> (a 4-qubit GHZ)
    qc.cx(0, 1)
    qc.cx(0, 2)
    qc.cx(0, 3)
    if error_qubit is not None:
        apply_pauli(qc, error_pauli, error_qubit)

    qc.h(SX_ANCILLA)  # S_X = X0 X1 X2 X3
    for q in range(4):
        qc.cx(SX_ANCILLA, q)
    qc.h(SX_ANCILLA)
    for q in range(4):  # S_Z = Z0 Z1 Z2 Z3
        qc.cx(q, SZ_ANCILLA)

    qc.measure([0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5])
    return qc


def run(backend, params_json="{}"):
    shots, error_qubit, error_pauli = parse_options(params_json)
    qc = build(error_qubit, error_pauli)
    counts = run_circuit(backend, qc, shots)
    return response(MODEL, TITLE, QUBITS, shots, counts, _decode(counts))


def _decode(counts):
    detected = probability(counts, lambda k: bits_of(k)[4] or bits_of(k)[5])
    return {
        "detected": detected,
        "note": "S_Z fires for an X error, S_X fires for a Z error; location stays hidden.",
    }
