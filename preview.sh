#!/usr/bin/env bash
# Refresh and serve the local preview of qollab-js at http://localhost:4123/.
#
# The Qollab runtime injects main.css and runs main.js; a plain static server
# does not, so this script re-copies qollab-js/ and wires those two plus an
# import map for three.js (the same 0.186.1 the platform provides).
#
# Usage: ./preview.sh
set -euo pipefail
cd "$(dirname "$0")"

PORT=4123
lsof -ti tcp:"$PORT" | xargs kill -9 2>/dev/null || true

rm -rf qollab-local
cp -R qollab-js qollab-local

python3 - <<'PY'
p = "qollab-local/index.html"
s = open(p, encoding="utf-8").read()
inject = (
    '<link rel="stylesheet" href="main.css">\n'
    '<script type="importmap">\n'
    '{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",'
    '"three/addons/":"https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"}}\n'
    '</script>\n'
    '<script type="module" src="main.js"></script>\n'
)
open(p, "w", encoding="utf-8").write(inject + s)
print("qollab-local refreshed")
PY

nohup python3 -m http.server "$PORT" --directory qollab-local >/dev/null 2>&1 &
sleep 1
echo "preview: http://localhost:$PORT/"
open "http://localhost:$PORT/" 2>/dev/null || true
