#!/usr/bin/env bash
# Renders build/icon.icns from scripts/make_icon.py using the vendored Python.
set -euo pipefail

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="$DESKTOP_DIR/vendor/python/bin/python3"
ICONSET="$DESKTOP_DIR/build/icon.iconset"

if [[ ! -x "$PY" ]]; then
  echo "vendor/python missing - run scripts/vendor-python.sh first." >&2
  exit 1
fi

if [[ -f "$DESKTOP_DIR/build/icon.icns" && "$DESKTOP_DIR/build/icon.icns" -nt "${BASH_SOURCE[0]%/*}/make_icon.py" ]]; then
  echo "build/icon.icns is up to date."
  exit 0
fi

rm -rf "$ICONSET"
"$PY" "$DESKTOP_DIR/scripts/make_icon.py" "$ICONSET"
iconutil -c icns "$ICONSET" -o "$DESKTOP_DIR/build/icon.icns"
rm -rf "$ICONSET"
echo "==> build/icon.icns written"
