#!/usr/bin/env bash
# Downloads a relocatable CPython build and installs the backend runtime
# dependencies into it. The result (desktop/vendor/python) is embedded in the
# macOS app bundle, so the app runs without a system Python installation.
set -euo pipefail

PYTHON_VERSION="3.11.16"
PBS_TAG="20260814"
ARCH="$(uname -m)"
case "$ARCH" in
  arm64) PBS_ARCH="aarch64" ;;
  x86_64) PBS_ARCH="x86_64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DIR="$DESKTOP_DIR/vendor"
PYTHON_DIR="$VENDOR_DIR/python"
STAMP_FILE="$PYTHON_DIR/.dressup-stamp"
STAMP_VALUE="$PYTHON_VERSION+$PBS_TAG+$PBS_ARCH+$(shasum -a 256 "$DESKTOP_DIR/requirements-desktop.txt" | cut -d' ' -f1)"

if [[ -f "$STAMP_FILE" && "$(cat "$STAMP_FILE")" == "$STAMP_VALUE" ]]; then
  echo "vendor/python is up to date."
  exit 0
fi

ARCHIVE_NAME="cpython-${PYTHON_VERSION}+${PBS_TAG}-${PBS_ARCH}-apple-darwin-install_only.tar.gz"
URL="https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_TAG}/${ARCHIVE_NAME//+/%2B}"

echo "==> Downloading $ARCHIVE_NAME"
rm -rf "$PYTHON_DIR"
mkdir -p "$VENDOR_DIR"
TMP_ARCHIVE="$VENDOR_DIR/$ARCHIVE_NAME"
curl -fL --retry 3 -o "$TMP_ARCHIVE" "$URL"

echo "==> Extracting"
tar -xzf "$TMP_ARCHIVE" -C "$VENDOR_DIR"
rm -f "$TMP_ARCHIVE"
# The archive extracts to vendor/python already.

PY="$PYTHON_DIR/bin/python3"
echo "==> Installing backend dependencies ($("$PY" --version))"
"$PY" -m pip install --upgrade pip wheel --no-warn-script-location
"$PY" -m pip install -r "$DESKTOP_DIR/requirements-desktop.txt" --no-warn-script-location

echo "==> Pruning build artefacts"
find "$PYTHON_DIR" -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true
find "$PYTHON_DIR" -type d -name "tests" -path "*/site-packages/*" -prune -exec rm -rf {} + 2>/dev/null || true
rm -rf "$PYTHON_DIR/lib/python3.11/test" "$PYTHON_DIR/lib/python3.11/idlelib" \
       "$PYTHON_DIR/lib/python3.11/tkinter" "$PYTHON_DIR/lib/python3.11/turtledemo" 2>/dev/null || true

echo "$STAMP_VALUE" > "$STAMP_FILE"
echo "==> Done: $(du -sh "$PYTHON_DIR" | cut -f1) in $PYTHON_DIR"
