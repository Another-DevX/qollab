#!/usr/bin/env python3
"""Local smoke runner for the Qollab QEC circuits.

Inside Qollab the `backend` is injected by the runtime. Outside it, this script
stands in for it using Qiskit Aer, so you can exercise every circuit in
`qollab-js/quantum/` without Qollab.

Usage (from the repo root):

    python3 test-circuits.py                 # all models, 1024 shots
    python3 test-circuits.py --shots 4096
    python3 test-circuits.py --only repetition,shor

Requires:  pip install qiskit qiskit-aer
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "qollab-js"))

from qiskit_aer import AerSimulator  # noqa: E402

from quantum import bell, iceberg, phase_flip, repetition, shor, surface  # noqa: E402

# id -> (module, run() kwargs). One representative error per code.
CASES = [
    ("bell", bell, {}),
    ("repetition", repetition, {"error_qubit": 1, "error_pauli": "X"}),
    ("phase_flip", phase_flip, {"error_qubit": 1, "error_pauli": "Z"}),
    ("shor", shor, {"error_qubit": 0, "error_pauli": "X"}),
    ("surface", surface, {"error_qubit": 4, "error_pauli": "X"}),
    ("iceberg", iceberg, {"error_qubit": 0, "error_pauli": "X"}),
]


def main():
    ap = argparse.ArgumentParser(description="Run the QEC circuits on a local Aer simulator.")
    ap.add_argument("--shots", type=int, default=1024)
    ap.add_argument("--only", help="comma-separated model ids (default: all)")
    args = ap.parse_args()

    backend = AerSimulator()
    only = set(args.only.split(",")) if args.only else None
    failed = 0

    for mid, mod, opts in CASES:
        if only and mid not in only:
            continue
        try:
            out = mod.run(backend, shots=args.shots, **opts)
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"\n== {mid}: FAILED -> {type(exc).__name__}: {exc}")
            continue
        top = sorted(out["counts"].items(), key=lambda kv: -kv[1])[:3]
        err = "none" if not opts else f"q{opts['error_qubit']} {opts['error_pauli']}"
        print(f"\n== {out['model']} · {out['title']}")
        print(f"   qubits={out['qubits']}  shots={out['shots']}  error={err}")
        print("   top counts: " + ", ".join(f"{k}:{v}" for k, v in top))
        print("   summary:    " + json.dumps(out.get("summary", {})))

    print("\n" + ("all models ran." if not failed else f"{failed} model(s) failed."))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
