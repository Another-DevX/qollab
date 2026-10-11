#!/usr/bin/env bash
# Build the Qollab upload bundle (qollab-js.zip) from qollab-js/.
# Usage: ./make-zip.sh
set -euo pipefail
cd "$(dirname "$0")"

rm -f qollab-js.zip
( cd qollab-js && zip -qr ../qollab-js.zip . -x '.*' -x '*/__pycache__/*' )

echo "built: $(pwd)/qollab-js.zip"
