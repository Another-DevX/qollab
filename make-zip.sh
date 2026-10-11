#!/usr/bin/env bash
# Build the Qollab upload bundle (qollab-js.zip) from qollab-js/.
# Uses Python's zipfile module, so it needs no system `zip` binary.
# Usage: ./make-zip.sh
set -euo pipefail
cd "$(dirname "$0")"

python3 - <<'PY'
import os
import zipfile

root = "qollab-js"
out = "qollab-js.zip"

if not os.path.isdir(root):
    raise SystemExit(f"error: '{root}/' not found")

skip_dirs = {"__pycache__", ".git", "node_modules"}

count = 0
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith(".")]
        for fn in sorted(filenames):
            if fn.startswith("."):
                continue
            path = os.path.join(dirpath, fn)
            z.write(path, os.path.relpath(path, root))
            count += 1

print(f"built: {os.path.abspath(out)} ({count} files)")
PY
