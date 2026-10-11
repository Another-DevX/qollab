"""In-circuit noise for the QEC circuits, via Qiskit Aer.

When the selected backend is *not* Qollab's noisy simulator, this builds the
exact circuit and attaches a standard noise channel to every gate, then runs it
on a local Aer simulator and compares the ideal and noisy measurement
distributions.

Noise models used here are the standard, simple ones:

  * Depolarizing channel — Nielsen & Chuang, "Quantum Computation and Quantum
    Information" (Cambridge, 2000).
  * Independent X / Z error model for QEC — Dennis, Kitaev, Landahl & Preskill,
    "Topological quantum memory", J. Math. Phys. 43, 4452 (2002).
  * The code protected here — P. W. Shor, "Scheme for reducing decoherence in
    quantum computer memory", Phys. Rev. A 52, R2493 (1995).

The JS side only calls this when the backend is not the noisy one; otherwise it
uses the backend's own noise model through the plain runner.
"""

import json

from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error, pauli_error

from . import shor as shor_mod
from .common import DEFAULT_SHOTS, probability, run_circuit

MODEL = "shor"
TITLE = "Shor code [[9,1,3]] under in-circuit noise"
PROTECTED = "one logical qubit (memory) — Shor code [[9,1,3]]"
CHANNELS = ("x", "z", "depol")

CITATIONS = [
    "Shor, Phys. Rev. A 52, R2493 (1995) — the [[9,1,3]] code",
    "Nielsen & Chuang (2000) — the depolarizing channel",
    "Dennis, Kitaev, Landahl & Preskill, J. Math. Phys. 43, 4452 (2002) — independent X/Z errors",
]


def _errors(channel, p):
    """One- and two-qubit error operators for the chosen channel."""
    if channel == "depol":
        return depolarizing_error(p, 1), depolarizing_error(p, 2)
    gate = "X" if channel == "x" else "Z"
    e1 = pauli_error([(gate, p), ("I", 1.0 - p)])
    return e1, e1.tensor(e1)


def _noise_model(channel, p):
    nm = NoiseModel()
    e1, e2 = _errors(channel, p)
    nm.add_all_qubit_quantum_error(e1, ["h", "x", "z"])
    nm.add_all_qubit_quantum_error(e2, ["cx"])
    return nm


def run(backend, params_json="{}"):
    try:
        opts = json.loads(params_json or "{}")
    except (TypeError, ValueError):
        opts = {}
    if not isinstance(opts, dict):
        opts = {}

    channel = str(opts.get("channel") or "x")
    if channel not in CHANNELS:
        channel = "x"
    p = float(opts.get("p") or 0.0)
    shots = int(opts.get("shots") or DEFAULT_SHOTS)
    error_qubit = opts.get("errorQubit", None)
    error_qubit = None if error_qubit is None else int(error_qubit)
    error_pauli = str(opts.get("errorPauli") or "X")

    qc = shor_mod.build(error_qubit, error_pauli)

    ideal = run_circuit(AerSimulator(), qc, shots)
    noisy = run_circuit(AerSimulator(noise_model=_noise_model(channel, p)), qc, shots)
    ideal = {str(k): int(v) for k, v in ideal.items()}
    noisy = {str(k): int(v) for k, v in noisy.items()}

    return json.dumps({
        "model": MODEL,
        "title": TITLE,
        "protected": PROTECTED,
        "channel": channel,
        "p": p,
        "qubits": shor_mod.QUBITS,
        "shots": shots,
        "ideal": {"counts": ideal, "detected": probability(ideal, lambda k: "1" in k)},
        "noisy": {"counts": noisy, "detected": probability(noisy, lambda k: "1" in k)},
        "citations": CITATIONS,
    }, ensure_ascii=False, separators=(",", ":"))
