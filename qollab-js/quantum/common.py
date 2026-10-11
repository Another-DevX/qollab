"""Shared helpers for the Qollab error-correction circuit set.

Kept deliberately tiny: submit one job, turn the result into a plain dict, and
package a uniform response. No Qiskit UI, no printing, no global state.
"""

import json

DEFAULT_SHOTS = 1024


def run_circuit(backend, circuit, shots=DEFAULT_SHOTS):
    """Submit exactly one job and return plain ``{bitstring: count}``.

    Using one call per ``run`` keeps the set compatible with IonQ, where only a
    single job is allowed per code execution.
    """
    result = backend.run(circuit, shots=shots).result()
    return {str(bits): int(n) for bits, n in dict(result.get_counts()).items()}


def response(model, title, qubits, shots, counts, summary=None):
    """Package the uniform response as a JSON **string**.

    The JavaScript side calls ``run`` through Qollab's ``.callPromising`` and
    reads ``.toString()``. Returning JSON text here avoids depending on how
    Pyodide converts a Python ``dict`` (dict -> Map), so the bridge is just
    ``JSON.parse`` — the same contract the working Qollab projects use.
    """
    out = {
        "model": model,
        "title": title,
        "qubits": int(qubits),
        "shots": int(shots),
        "counts": {str(k): int(v) for k, v in dict(counts).items()},
    }
    if summary is not None:
        out["summary"] = summary
    return json.dumps(out, ensure_ascii=False, separators=(",", ":"))


def bits_of(key):
    """Counts key -> classical bits in register order ``[c0, c1, ...]``.

    Qiskit prints a result with the highest classical-bit index on the left, so
    we reverse it to line the bits up with ``measure`` order.
    """
    return [int(ch) for ch in reversed(key)]


def probability(counts, predicate):
    """Fraction of shots whose key satisfies ``predicate``."""
    total = sum(counts.values())
    if total == 0:
        return 0.0
    good = sum(n for key, n in counts.items() if predicate(key))
    return good / total


def apply_pauli(circuit, pauli, qubit):
    """Apply the named Pauli (``x``/``y``/``z``) to one qubit."""
    getattr(circuit, str(pauli).lower())(int(qubit))
