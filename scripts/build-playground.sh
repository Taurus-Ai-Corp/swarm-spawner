#!/usr/bin/env bash
set -euo pipefail

# Build the Swarm Spawner playground with inlined @noble/post-quantum bundle.
# Usage: ./scripts/build-playground.sh [--watch]
#
# Outputs: playground.html (self-contained, zero external dependencies)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENTRY_FILE="$(mktemp /tmp/noble-entry-XXXXXX.js)"
BUNDLE_FILE="$(mktemp /tmp/noble-bundle-XXXXXX.js)"
SRC_HTML="$ROOT_DIR/playground.src.html"
OUT_HTML="$ROOT_DIR/playground.html"

cd "$ROOT_DIR"

# 1. Create entry file for noble PQC subset
cat > "$ENTRY_FILE" <<'EOF'
export { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
export { sha256 } from "@noble/hashes/sha2.js";
export { bytesToHex } from "@noble/hashes/utils.js";
EOF

# 2. Bundle with esbuild (IIFE, minified, browser-ready)
NODE_PATH=./node_modules npx esbuild "$ENTRY_FILE" \
  --bundle \
  --format=iife \
  --global-name=Noble \
  --minify \
  --outfile="$BUNDLE_FILE" \
  --platform=browser \
  --log-level=warning

BUNDLE_SIZE=$(wc -c < "$BUNDLE_FILE" | tr -d ' ')
echo "Noble PQC bundle: ${BUNDLE_SIZE} bytes"

# 3. Splice bundle into playground HTML
python3 -c "
with open('$SRC_HTML', 'r') as f:
    html = f.read()
with open('$BUNDLE_FILE', 'r') as f:
    bundle = f.read()
if '/* NOBLE_BUNDLE_PLACEHOLDER */' not in html:
    print('ERROR: Placeholder not found in playground.src.html')
    exit(1)
html = html.replace('/* NOBLE_BUNDLE_PLACEHOLDER */', bundle.strip())
with open('$OUT_HTML', 'w') as f:
    f.write(html)
"

OUT_SIZE=$(wc -c < "$OUT_HTML" | tr -d ' ')
echo "Playground built: ${OUT_SIZE} bytes -> $OUT_HTML"

# 4. Cleanup
rm -f "$ENTRY_FILE" "$BUNDLE_FILE"

echo "Done."
