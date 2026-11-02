#!/usr/bin/env bash
# Build resources/js/lab/runtime/dist from first-party Lab runtime source.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/resources/js/lab/runtime"
CONFIG="$RUNTIME/vite.lib.config.js"

cd "$ROOT"

has_pkg() {
  local pkg="$1"
  [[ -f "node_modules/${pkg}/package.json" ]]
}

install_pkg() {
  local pkg="$1"
  if has_pkg "$pkg"; then
    echo "  ✓ ${pkg} (present)"
    return 0
  fi
  echo "  → ${pkg}"
  if ! npm install --no-save "$pkg"; then
    rm -rf "node_modules/${pkg}"
    rm -rf node_modules/."${pkg//\//-}"* 2>/dev/null || true
    npm install --no-save "$pkg"
  fi
}

RUNTIME_DEPS=(
  vite-plugin-wasm
  vite-plugin-top-level-await
  esbuild
  "@noble/hashes@1.8.0"
  acorn
  acorn-jsx
  brotli
  comlink
  pako
  resolve.exports
  set-cookie-parser
  wa-sqlite
)

echo "→ Installing runtime lib build deps (no-save)…"
for pkg in "${RUNTIME_DEPS[@]}"; do
  install_pkg "$pkg"
done

# Rollup native binding (vite lib build on Linux/WSL).
if ! has_pkg "@rollup/rollup-linux-x64-gnu"; then
  install_pkg "@rollup/rollup-linux-x64-gnu"
fi

echo "→ Building Lab runtime bundle…"
npx vite build --config "$CONFIG"

echo "→ Publishing worker asset…"
if [[ -f "$RUNTIME/dist/__worker__.js" ]]; then
  cp -f "$RUNTIME/dist/__worker__.js" "$ROOT/public/__worker__.js"
fi

echo "✓ Lab runtime dist rebuilt at $RUNTIME/dist"
