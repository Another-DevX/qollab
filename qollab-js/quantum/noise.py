"""Noise for the QEC circuits.

Qollab's runtime ships a `qiskit_aer` that fails to load (`ImportError: dynamic
module does not define PyInit_controller_wrappers`), so we cannot inject
in-circuit noise with Aer there. Instead we run the **ideal** circuit on the
Qollab backend (a real job) and add the noise **classically**: we sample a
per-qubit Pauli error from the chosen channel and recompute the stabilizer
checks — the standard independent error model used in QEC simulations.

Noise models:

  * Depolarizing channel — Nielsen & Chuang, "Quantum Computation and Quantum
    Information" (Cambridge, 2000).
  * Independent X / Z error model — Dennis, Kitaev, Landahl & Preskill,
    "Topological quantum memory", J. Math. Phys. 43, 4452 (2002).

Code references:

  * Shor — P. W. Shor, Phys. Rev. A 52, R2493 (1995).
  * Surface code — A. G. Fowler et al., Phys. Rev. A 86, 032324 (2012).
  * Iceberg [[4,2,2]] — error detection with postselection (see Module 4).
"""

import json
import random

from . import iceberg as iceberg_mod
from . import shor as shor_mod
from . import surface as surface_mod
from .common import DEFAULT_SHOTS, probability, run_circuit

CHANNELS = ("x", "z", "depol")

BASE_CITATIONS = [
    "Nielsen & Chuang (2000) — the depolarizing channel",
    "Dennis, Kitaev, Landahl & Preskill, J. Math. Phys. 43, 4452 (2002) — independent X/Z errors",
]


def _any_ancilla(k):
    return "1" in k


def _iceberg_ancillas(k):
    b = [int(ch) for ch in reversed(k)]
    return bool(b[4] or b[5])


MODELS = {
    "repetition": {
        "title": "Bit-flip code [[3,1,3]] under noise",
        "protected": "one logical qubit (memory) — bit-flip code [[3,1,3]]",
        "cite": "Repetition code (see Module 2)",
        "detector": _any_ancilla,
    },
    "shor": {
        "title": "Shor code [[9,1,3]] under noise",
        "protected": "one logical qubit (memory) — Shor code [[9,1,3]]",
        "cite": "Shor, Phys. Rev. A 52, R2493 (1995) — the [[9,1,3]] code",
        "detector": _any_ancilla,
    },
    "surface": {
        "title": "Surface code under noise",
        "protected": "one logical qubit (memory) — surface code (Z-checks)",
        "cite": "Fowler et al., Phys. Rev. A 86, 032324 (2012) — surface codes",
        "detector": _any_ancilla,
    },
    "iceberg": {
        "title": "Iceberg code [[4,2,2]] under noise",
        "protected": "two logical qubits (detection only) — Iceberg code [[4,2,2]]",
        "cite": "Error detection with the [[4,2,2]] code (see Module 4)",
        "detector": _iceberg_ancillas,
    },
}


def _checks(model_id, d):
    """(number of data qubits, list of (type, qubits), data measured?)."""
    if model_id == "repetition":
        return 3, [("Z", [0, 1]), ("Z", [1, 2])], False
    if model_id == "shor":
        return 9, [
            ("Z", [0, 1]), ("Z", [1, 2]), ("Z", [3, 4]), ("Z", [4, 5]), ("Z", [6, 7]), ("Z", [7, 8]),
            ("X", [0, 1, 2, 3, 4, 5]), ("X", [3, 4, 5, 6, 7, 8]),
        ], False
    if model_id == "iceberg":
        return 4, [("X", [0, 1, 2, 3]), ("Z", [0, 1, 2, 3])], True
    if model_id == "surface":
        return d * d, [("Z", list(qs)) for (_i, _j, qs) in surface_mod._z_checks(d)], False
    return 0, [], False


def _sample_pauli(channel, p, rng):
    r = rng.random()
    if channel == "x":
        return "X" if r < p else "I"
    if channel == "z":
        return "Z" if r < p else "I"
    if r < p:
        q = rng.random()
        return "X" if q < 1 / 3 else ("Y" if q < 2 / 3 else "Z")
    return "I"


def _classical_counts(model_id, d, channel, p, shots, rng):
    """Sample Pauli errors and recompute the measured bits, per shot."""
    n_data, checks, measure_data = _checks(model_id, d)
    counts = {}
    for _ in range(shots):
        err = [_sample_pauli(channel, p, rng) for _ in range(n_data)]
        if measure_data:  # iceberg: 4 data + S_X + S_Z
            code = 1 if rng.random() < 0.5 else 0
            data_bits = [code ^ (1 if err[q] in ("X", "Y") else 0) for q in range(n_data)]
            sx = sum(1 for e in err if e in ("Z", "Y")) % 2
            sz = sum(1 for e in err if e in ("X", "Y")) % 2
            bits = data_bits + [sx, sz]
        else:
            bits = []
            for (t, qs) in checks:
                if t == "Z":
                    bits.append(sum(1 for q in qs if err[q] in ("X", "Y")) % 2)
                else:
                    bits.append(sum(1 for q in qs if err[q] in ("Z", "Y")) % 2)
        key = "".join(str(b) for b in reversed(bits))
        counts[key] = counts.get(key, 0) + 1
    return counts


def _backend_has_noise(backend):
    """True when the injected backend already carries a device noise model."""
    try:
        name = str(getattr(backend, "name", "") or "").lower()
    except Exception:  # noqa: BLE001
        name = ""
    return any(k in name for k in ("ibm", "ionq", "fake", "noise"))


def _build(model_id, d, error_qubit, error_pauli):
    if model_id == "surface":
        return surface_mod.build(d, error_qubit, error_pauli)
    if model_id == "repetition":
        from . import repetition as repetition_mod
        return repetition_mod.build(error_qubit, error_pauli)
    if model_id == "shor":
        return shor_mod.build(error_qubit, error_pauli)
    if model_id == "iceberg":
        return iceberg_mod.build(error_qubit, error_pauli)
    return None


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

    d = int(opts.get("d") or 3)
    if model_id == "surface":
        if d < 3:
            d = 3
        if d % 2 == 0:
            d -= 1  # surface codes are odd-distance

    qc = _build(model_id, d, error_qubit, error_pauli)
    n_q = qc.num_qubits if qc is not None else 0

    try:
        backend_name = str(getattr(backend, "name", "") or "")
    except Exception:  # noqa: BLE001
        backend_name = ""
    try:
        backend_qubits = int(getattr(backend, "num_qubits", 0) or 0)
    except Exception:  # noqa: BLE001
        backend_qubits = 0

    # A real job only if the backend can hold the circuit (the built-in simulator
    # tops out at 24 qubits). Otherwise the whole run is local.
    has_device = _backend_has_noise(backend) if backend is not None else False
    fits = backend is not None and qc is not None and (backend_qubits == 0 or n_q <= backend_qubits)

    if fits and has_device:
        noisy = run_circuit(backend, qc, shots)   # the device noise model is the noise
        ideal = _classical_counts(model_id, d, "x", 0.0, shots, random.Random(0))
        mode = "backend"
    elif fits:
        ideal = run_circuit(backend, qc, shots)    # ideal backend: the job is the noise-free run
        noisy = _classical_counts(model_id, d, channel, p, shots, random.Random())
        mode = "injected"
    else:
        ideal = _classical_counts(model_id, d, "x", 0.0, shots, random.Random(0))
        noisy = _classical_counts(model_id, d, channel, p, shots, random.Random())
        mode = "local"

    ideal = {str(k): int(v) for k, v in ideal.items()}
    noisy = {str(k): int(v) for k, v in noisy.items()}

    note = None
    if not fits and backend is not None and backend_qubits:
        note = ("This circuit needs " + str(n_q) + " qubits, more than the backend's " +
                str(backend_qubits) + " — simulated locally, not on hardware.")

    detect = spec["detector"]
    return json.dumps({
        "model": model_id,
        "title": spec["title"] + (" · d = " + str(d) if model_id == "surface" else ""),
        "protected": spec["protected"],
        "channel": channel,
        "p": p,
        "d": d,
        "mode": mode,
        "backend": backend_name,
        "backend_qubits": backend_qubits,
        "qubits": n_q,
        "needs_local": not fits,
        "note": note,
        "shots": shots,
        "ideal": {"counts": ideal, "detected": probability(ideal, detect)},
        "noisy": {"counts": noisy, "detected": probability(noisy, detect)},
        "citations": [spec["cite"]] + BASE_CITATIONS,
    }, ensure_ascii=False, separators=(",", ":"))
