"""In-circuit noise for the QEC circuits, via Qiskit Aer.

When the selected backend is *ideal* (Qollab's built-in or AWS Braket
simulator), this builds the exact circuit and attaches a standard noise channel
to every gate, then runs it on a local Aer simulator and compares the ideal and
noisy measurement distributions.

Noise models used here are the standard, simple ones:

  * Depolarizing channel — Nielsen & Chuang, "Quantum Computation and Quantum
    Information" (Cambridge, 2000).
  * Independent X / Z error model for QEC — Dennis, Kitaev, Landahl & Preskill,
    "Topological quantum memory", J. Math. Phys. 43, 4452 (2002).

Code references:
  * Shor — P. W. Shor, Phys. Rev. A 52, R2493 (1995).
  * Surface code — A. G. Fowler et al., Phys. Rev. A 86, 032324 (2012).
  * Iceberg [[4,2,2]] — error detection with postselection (see Module 4).
"""

import json

from . import iceberg as iceberg_mod
from . import shor as shor_mod
from . import surface as surface_mod
from .common import DEFAULT_SHOTS, bits_of, probability, run_circuit


def _aer():
    """Import the Aer simulator lazily.

    Qollab does not expose `qiskit_aer` to project code, and importing it at the
    top of this file would make the whole module fail to load — which also stops
    the runtime from remapping `quantum.noise` (and would break the page). So we
    only reach for it when a run actually asks for injected noise.
    """
    try:
        from qiskit_aer import AerSimulator
        from qiskit_aer.noise import NoiseModel, depolarizing_error, pauli_error
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            "In-circuit noise needs the Aer simulator, which this runtime does not expose. "
            "Pick a Qollab noise-model backend instead (IBM local or IonQ remote)."
        ) from exc
    return AerSimulator, NoiseModel, depolarizing_error, pauli_error

CHANNELS = ("x", "z", "depol")

BASE_CITATIONS = [
    "Nielsen & Chuang (2000) — the depolarizing channel",
    "Dennis, Kitaev, Landahl & Preskill, J. Math. Phys. 43, 4452 (2002) — independent X/Z errors",
]


def _any_ancilla(k):
    """Shor / surface measure only ancillas, so any '1' is an alarm."""
    return "1" in k


def _iceberg_ancillas(k):
    """Iceberg also measures the data; only the S_X, S_Z ancillas are checks."""
    b = bits_of(k)
    return bool(b[4] or b[5])


MODELS = {
    "shor": {
        "module": shor_mod,
        "title": "Shor code [[9,1,3]] under in-circuit noise",
        "protected": "one logical qubit (memory) — Shor code [[9,1,3]]",
        "cite": "Shor, Phys. Rev. A 52, R2493 (1995) — the [[9,1,3]] code",
        "detector": _any_ancilla,
    },
    "surface": {
        "module": surface_mod,
        "title": "Surface code d = 3 under in-circuit noise",
        "protected": "one logical qubit (memory) — surface code d = 3 (Z-checks)",
        "cite": "Fowler et al., Phys. Rev. A 86, 032324 (2012) — surface codes",
        "detector": _any_ancilla,
    },
    "iceberg": {
        "module": iceberg_mod,
        "title": "Iceberg code [[4,2,2]] under in-circuit noise",
        "protected": "two logical qubits (detection only) — Iceberg code [[4,2,2]]",
        "cite": "Error detection with the [[4,2,2]] code (see Module 4)",
        "detector": _iceberg_ancillas,
    },
}


def _errors(channel, p, deps):
    """One- and two-qubit error operators for the chosen channel."""
    _, _, depolarizing_error, pauli_error = deps
    if channel == "depol":
        return depolarizing_error(p, 1), depolarizing_error(p, 2)
    gate = "X" if channel == "x" else "Z"
    e1 = pauli_error([(gate, p), ("I", 1.0 - p)])
    return e1, e1.tensor(e1)


def _noise_model(channel, p, deps):
    _, NoiseModel, _, _ = deps
    nm = NoiseModel()
    e1, e2 = _errors(channel, p, deps)
    nm.add_all_qubit_quantum_error(e1, ["h", "x", "z"])
    nm.add_all_qubit_quantum_error(e2, ["cx"])
    return nm


def _backend_has_noise(backend):
    """True when the injected backend already carries a device noise model."""
    try:
        name = str(getattr(backend, "name", "") or "").lower()
    except Exception:  # noqa: BLE001
        name = ""
    return any(k in name for k in ("ibm", "ionq", "fake", "noise"))


def run(backend, params_json="{}"):
    try:
        opts = json.loads(params_json or "{}")
    except (TypeError, ValueError):
        opts = {}
    if not isinstance(opts, dict):
        opts = {}

    model_id = str(opts.get("model") or "shor")
    if model_id not in MODELS:
        model_id = "shor"
    spec = MODELS[model_id]

    channel = str(opts.get("channel") or "x")
    if channel not in CHANNELS:
        channel = "x"
    p = float(opts.get("p") or 0.0)
    shots = int(opts.get("shots") or DEFAULT_SHOTS)
    error_qubit = opts.get("errorQubit", None)
    error_qubit = None if error_qubit is None else int(error_qubit)
    error_pauli = str(opts.get("errorPauli") or "X")

    deps = _aer()
    AerSimulator = deps[0]
    qc = spec["module"].build(error_qubit, error_pauli)

    # Run a real circuit on the Qollab backend in every case. On an ideal backend
    # (built-in / AWS Braket) we add our own noise channel with Aer; on a
    # noise-model backend we use the backend's own job and show a noiseless Aer
    # reference next to it.
    try:
        backend_name = str(getattr(backend, "name", "") or "")
    except Exception:  # noqa: BLE001
        backend_name = ""

    if backend is not None and _backend_has_noise(backend):
        noisy = run_circuit(backend, qc, shots)
        ideal = run_circuit(AerSimulator(), qc, shots)
        mode = "backend"
    elif backend is not None:
        ideal = run_circuit(backend, qc, shots)
        noisy = run_circuit(AerSimulator(noise_model=_noise_model(channel, p, deps)), qc, shots)
        mode = "injected"
    else:  # no backend (local tests): Aer for both
        ideal = run_circuit(AerSimulator(), qc, shots)
        noisy = run_circuit(AerSimulator(noise_model=_noise_model(channel, p, deps)), qc, shots)
        mode = "local"

    ideal = {str(k): int(v) for k, v in ideal.items()}
    noisy = {str(k): int(v) for k, v in noisy.items()}

    detect = spec["detector"]
    return json.dumps({
        "model": model_id,
        "title": spec["title"],
        "protected": spec["protected"],
        "channel": channel,
        "p": p,
        "mode": mode,
        "backend": backend_name,
        "qubits": spec["module"].QUBITS,
        "shots": shots,
        "ideal": {"counts": ideal, "detected": probability(ideal, detect)},
        "noisy": {"counts": noisy, "detected": probability(noisy, detect)},
        "citations": [spec["cite"]] + BASE_CITATIONS,
    }, ensure_ascii=False, separators=(",", ":"))
