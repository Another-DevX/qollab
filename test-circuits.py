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

# id -> (module, run() options). One representative error per code.
CASES = [
    ("bell", bell, {}),
    ("repetition", repetition, {"errorQubit": 1, "errorPauli": "X"}),
    ("phase_flip", phase_flip, {"errorQubit": 1, "errorPauli": "Z"}),
    ("shor", shor, {"errorQubit": 0, "errorPauli": "X"}),
    ("surface", surface, {"errorQubit": 4, "errorPauli": "X"}),
    ("iceberg", iceberg, {"errorQubit": 0, "errorPauli": "X"}),
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
            params = dict(opts)
            params["shots"] = args.shots
            raw = mod.run(backend, json.dumps(params))
            out = json.loads(raw) if isinstance(raw, str) else raw
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"\n== {mid}: FAILED -> {type(exc).__name__}: {exc}")
            continue
        top = sorted(out["counts"].items(), key=lambda kv: -kv[1])[:3]
        eq = opts.get("errorQubit")
        err = "none" if eq is None else f"q{eq} {opts.get('errorPauli', 'X')}"
        print(f"\n== {out['model']} · {out['title']}")
        print(f"   qubits={out['qubits']}  shots={out['shots']}  error={err}")
        print("   top counts: " + ", ".join(f"{k}:{v}" for k, v in top))
        print("   summary:    " + json.dumps(out.get("summary", {})))

    print("\n" + ("all models ran." if not failed else f"{failed} model(s) failed."))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
