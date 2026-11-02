#!/usr/bin/env bash
# Sync Lab runtime engine source from ye42/deepthought into resources/js/lab/runtime.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/resources/js/lab/runtime"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Cloning ye42/deepthought…"
gh repo clone ye42/deepthought "$TMP/deepthought" -- --depth 1

SRC="$TMP/deepthought"

if [[ -f "$SRC/package.json" ]]; then
  echo "→ Syncing package root…"
  rsync -a --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude pnpm-lock.yaml \
    "$SRC/" "$TARGET/"
elif [[ -d "$SRC/api" && -f "$SRC/api/package.json" ]]; then
  echo "→ Syncing api/ package…"
  rsync -a --delete \
    --exclude node_modules \
    --exclude .git \
    "$SRC/api/" "$TARGET/"
else
  echo "Could not locate a package.json in ye42/deepthought root or api/." >&2
  exit 1
fi

echo "→ Building static assets (if script exists)…"
(
  cd "$TARGET"
  if [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null; then
    pnpm install --frozen-lockfile
    pnpm run build:lib
  elif [[ -f package-lock.json ]]; then
    npm ci
    npm run build:lib --if-present
  else
    npm install --no-audit --no-fund
    npm run build:lib --if-present
  fi
)

echo "→ Removing upstream npm package manifest (core source only)…"
rm -f "$TARGET/package.json" "$TARGET/package-lock.json" "$TARGET/pnpm-lock.yaml"
rm -rf "$TARGET/node_modules"

echo "→ Publishing static assets to public/…"
publish_sw() {
  local src="$1"
  if [[ -f "$src" ]]; then
    cp -f "$src" "$ROOT/public/__krikkit_lab_sw__.js"
    cp -f "$src" "$ROOT/public/__deepthought_sw__.js"
  fi
}
if [[ -f "$TARGET/dist/__krikkit_lab_sw__.js" ]]; then
  publish_sw "$TARGET/dist/__krikkit_lab_sw__.js"
elif [[ -f "$TARGET/dist/__deepthought_sw__.js" ]]; then
  publish_sw "$TARGET/dist/__deepthought_sw__.js"
elif [[ -f "$TARGET/static/__deepthought_sw__.js" ]]; then
  publish_sw "$TARGET/static/__deepthought_sw__.js"
fi
if [[ -f "$TARGET/dist/__worker__.js" ]]; then
  cp -f "$TARGET/dist/__worker__.js" "$ROOT/public/__worker__.js"
fi

echo "✓ Lab runtime synced at $TARGET (core source, no npm package)"
