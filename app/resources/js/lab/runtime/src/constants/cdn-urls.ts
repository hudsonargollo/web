// Krikkit Lab — pinned CDN versions and dynamic import helper

export const LAB_PINNED_ESBUILD_WASM = "0.20.0";
export const LAB_PINNED_ROLLUP_BROWSER = "4.44.0";
export const LAB_PINNED_BROTLI_WASM = "3.0.1";
export const LAB_PINNED_LIGHTNINGCSS_WASM = "1.31.1";
export const LAB_PINNED_WA_SQLITE = "1.0.0";

export const CDN_ESBUILD_ESM = `https://esm.sh/esbuild-wasm@${LAB_PINNED_ESBUILD_WASM}`;
export const CDN_ESBUILD_BINARY = `https://esm.sh/esbuild-wasm@${LAB_PINNED_ESBUILD_WASM}/esbuild.wasm`;
export const CDN_ROLLUP_BROWSER = `https://esm.sh/@rollup/browser@${LAB_PINNED_ROLLUP_BROWSER}`;
// jsdelivr serves raw files without rebundling. esm.sh rebundles everything
// which breaks brotli-wasm's circular WASM/JS-glue dependencies, causing
// `(void 0) is not a function` at runtime. The pkg.web variant has a proper
// init() that fetches the co-located .wasm binary via import.meta.url.
export const CDN_BROTLI_WASM = `https://cdn.jsdelivr.net/npm/brotli-wasm@${LAB_PINNED_BROTLI_WASM}/pkg.web/brotli_wasm.js`;
export const CDN_LIGHTNINGCSS_WASM = `https://esm.sh/lightningcss-wasm@${LAB_PINNED_LIGHTNINGCSS_WASM}`;
export const CDN_WA_SQLITE = `https://cdn.jsdelivr.net/npm/wa-sqlite@${LAB_PINNED_WA_SQLITE}/dist/wa-sqlite.mjs`;
export const CDN_WA_SQLITE_WASM = `https://cdn.jsdelivr.net/npm/wa-sqlite@${LAB_PINNED_WA_SQLITE}/dist/wa-sqlite.wasm`;

// new Function hides import() from bundler static analysis so CDN URLs work at runtime
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const _dynamicImport = new Function("url", "return import(url)") as (url: string) => Promise<any>;
export { _dynamicImport as cdnImport };

// Backward-compatible aliases for in-tree imports.
export const PINNED_ESBUILD_WASM = LAB_PINNED_ESBUILD_WASM;
export const PINNED_ROLLUP_BROWSER = LAB_PINNED_ROLLUP_BROWSER;
export const PINNED_BROTLI_WASM = LAB_PINNED_BROTLI_WASM;
export const PINNED_LIGHTNINGCSS_WASM = LAB_PINNED_LIGHTNINGCSS_WASM;
export const PINNED_WA_SQLITE = LAB_PINNED_WA_SQLITE;
