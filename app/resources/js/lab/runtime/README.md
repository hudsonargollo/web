# Lab runtime engine

First-party Krikkit Lab core: in-browser Node.js runtime for preview and guest workspaces.

## Layout

- `src/` — TypeScript source
- `static/` — service worker source (`__krikkit_lab_sw__.js`, legacy `__deepthought_sw__.js` alias)
- `dist/` — prebuilt worker/SW bundles copied to `public/` during sync

## Imports

Lab code imports the runtime via `resources/js/lab/lib/labRuntimeEngine.js`, which re-exports from `../runtime/dist/index.mjs`.

The Vite plugin is wired in the root `vite.config.js` (serves `/__krikkit_lab_sw__.js` in dev, legacy path aliased).

## Syncing upstream

```bash
./scripts/sync-lab-runtime.sh
```

Pulls from `ye42/deepthought`, builds static assets, and copies SW/worker files to `public/`.
