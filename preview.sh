#!/usr/bin/env bash
# Refresh and serve the local preview of qollab-js at http://localhost:4123/.
#
# The Qollab runtime injects main.css and runs main.js, and resolves the bare
# `quantum.*` Python modules itself. A plain static server does none of that, so
# this script re-copies qollab-js/, wires main.css + main.js, maps three.js and
# the `quantum.*` modules (to a local stub) through an import map, and serves it.
#
# Usage: ./preview.sh
set -euo pipefail
cd "$(dirname "$0")"

PORT=4123
lsof -ti tcp:"$PORT" | xargs kill -9 2>/dev/null || true

rm -rf qollab-local
cp -R qollab-js qollab-local

python3 - <<'PY'
import json

p = "qollab-local/index.html"
s = open(p, encoding="utf-8").read()

imports = {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/",
}
# circuits.js imports these bare Python modules; Qollab resolves them, the
# static server does not, so point them all at a local stub.
for model in ("bell", "repetition", "phase_flip", "shor", "surface", "iceberg"):
    imports["quantum." + model] = "./quantum-stub.js"

inject = (
    '<link rel="stylesheet" href="main.css">\n'
    '<script type="importmap">\n'
    + json.dumps({"imports": imports}) + "\n"
    "</script>\n"
    '<script type="module" src="main.js"></script>\n'
)
open(p, "w", encoding="utf-8").write(inject + s)

# Stand-in for the Qollab-injected backend + Python modules. It lets the
# browser preview load and even run the circuit cards (with fake counts).
stub = '''\
// Local-preview stand-in for the Qollab `quantum.*` Python modules.
// Only used by preview.sh; Qollab resolves the real modules itself.
window.backend = window.backend || { name: "local-preview" };

export function run(backend, params) {
  const p = typeof params === "string" ? JSON.parse(params) : (params || {});
  const shots = p.shots || 1024;
  const half = Math.round(shots * 0.5);
  return JSON.stringify({
    model: "preview",
    title: "Local preview stub",
    qubits: 5,
    shots: shots,
    counts: { "00000": shots - half, "11010": half },
    summary: {
      detected: 1,
      logical_correct: 1,
      correlated: 1,
      note: "Local preview stub \u2014 not a real Qollab run.",
    },
  });
}
run.callPromising = function (backend, params) {
  return Promise.resolve(run(backend, params));
};
'''
open("qollab-local/quantum-stub.js", "w", encoding="utf-8").write(stub)
print("qollab-local refreshed")
PY

nohup python3 -m http.server "$PORT" --directory qollab-local >/dev/null 2>&1 &
sleep 1
echo "preview: http://localhost:$PORT/"
open "http://localhost:$PORT/" 2>/dev/null || true
