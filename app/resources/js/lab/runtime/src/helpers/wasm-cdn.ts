// CDN recovery for .wasm files under node_modules that never made it into
// the VFS (e.g. oversized binaries the tarball path skipped). Everything
// here is asynchronous and best-effort — the old synchronous XHR fallback
// that could block a thread for a full 15MB download is gone.

import type { MemoryVolume } from "../memory-volume";
import { precompileWasm, registerCompiledModule, PRECOMPILE_THRESHOLD } from "./wasm-cache";

const WASM_DEBUG_SUFFIX = ".debug.wasm";

/**
 * NAPI-RS loaders may probe an optional `<name>.debug.wasm` next to the
 * release `<name>.wasm`. A missing debug artifact must never turn into a CDN
 * request for that filename: published packages commonly ship only release
 * WASM. Keep the mapping generic for every napi-rs WASI package.
 */
export function resolveWasmAssetPath(volume: MemoryVolume, vfsPath: string): string {
  if (!vfsPath.endsWith(WASM_DEBUG_SUFFIX) || volume.existsSync(vfsPath)) {
    return vfsPath;
  }
  return vfsPath.slice(0, -WASM_DEBUG_SUFFIX.length) + ".wasm";
}

/** WASI loaders often open `/pkg/file.wasm` instead of `/node_modules/pkg/file.wasm`. */
export function coerceNodeModulesWasmPath(vfsPath: string): string {
  if (!vfsPath.endsWith(".wasm") || vfsPath.includes("/node_modules/")) {
    return vfsPath;
  }
  const trimmed = vfsPath.startsWith("/") ? vfsPath : `/${vfsPath}`;
  return `/node_modules${trimmed}`;
}

/** jsdelivr does not publish napi-rs `*.debug.wasm` probes — map them to release. */
export function rewriteDebugWasmCdnUrl(url: string): string {
  return url.replace(/\.debug\.wasm(\?[^#]*)?(#.*)?$/i, ".wasm$1$2");
}

/** napi-rs / wasm-pack packages ship JS glue next to a real .wasm binary. */
export function isNativeWasmPackage(pkgName: string): boolean {
  return (
    pkgName.endsWith("-wasm") ||
    pkgName.includes("wasm32-wasi") ||
    pkgName.includes("-wasm32-")
  );
}

/**
 * Next compiled shims (`react.js` → `react.wasm`) must not hit the CDN.
 * lightningcss-wasm / oxide-wasm32-wasi keep their JS glue AND a real .wasm.
 */
function shouldSkipCdnWasmProbe(
  volume: MemoryVolume,
  assetPath: string,
  pkgName: string,
): boolean {
  if (/\/dist\/compiled\//.test(assetPath)) return true;
  if (isNativeWasmPackage(pkgName)) return false;
  const stem = assetPath.replace(/\.wasm$/i, "");
  return (
    volume.existsSync(stem + ".js") ||
    volume.existsSync(stem + ".cjs") ||
    volume.existsSync(stem + ".mjs")
  );
}

/** Prefer the coerced / release .wasm when that file is already in the VFS. */
export function resolveExistingWasmPath(volume: MemoryVolume, vfsPath: string): string {
  if (typeof vfsPath !== "string" || !vfsPath.endsWith(".wasm")) return vfsPath;
  const mapped = resolveWasmAssetPath(volume, coerceNodeModulesWasmPath(vfsPath));
  if (mapped !== vfsPath && volume.existsSync(mapped)) return mapped;
  return vfsPath;
}

/**
 * Map a VFS path like `/project/node_modules/@scope/pkg/file.wasm` to its
 * jsdelivr URL, using the installed package.json version when available.
 * Returns null if the path isn't a node_modules .wasm path.
 */
export function buildCdnWasmUrl(volume: MemoryVolume, vfsPath: string): string | null {
  if (!vfsPath.endsWith(".wasm")) return null;
  const path = coerceNodeModulesWasmPath(vfsPath);
  const nmIdx = path.lastIndexOf("/node_modules/");
  if (nmIdx === -1) return null;

  const assetPath = resolveWasmAssetPath(volume, path);

  const afterNm = assetPath.substring(nmIdx + "/node_modules/".length);
  const parts = afterNm.split("/");
  let pkgName: string;
  let filePath: string;
  if (parts[0].startsWith("@")) {
    if (parts.length < 3) return null;
    pkgName = parts[0] + "/" + parts[1];
    filePath = parts.slice(2).join("/");
  } else {
    if (parts.length < 2) return null;
    pkgName = parts[0];
    filePath = parts.slice(1).join("/");
  }

  try {
    if (shouldSkipCdnWasmProbe(volume, assetPath, pkgName)) return null;
  } catch {
    /* keep mapping */
  }

  let version = "latest";
  try {
    const pkgJsonPath =
      path.substring(0, nmIdx + "/node_modules/".length) + pkgName + "/package.json";
    const pkgJson = JSON.parse(volume.readFileSync(pkgJsonPath, "utf8") as string);
    if (pkgJson.version) version = pkgJson.version;
  } catch {
    /* use latest */
  }

  return `https://cdn.jsdelivr.net/npm/${pkgName}@${version}/${filePath}`;
}

const _inflight = new Map<string, Promise<boolean>>();

export function isRecoverableWasmPath(vfsPath: unknown): vfsPath is string {
  if (typeof vfsPath !== "string" || !vfsPath.endsWith(".wasm")) return false;
  return coerceNodeModulesWasmPath(vfsPath).includes("/node_modules/");
}

/**
 * Fetch a missing node_modules .wasm from the CDN, write it to the VFS, and
 * warm the compile caches. Deduplicated per path; never throws.
 */
export function prefetchWasmFromCdn(volume: MemoryVolume, vfsPath: string): Promise<boolean> {
  const assetPath = resolveWasmAssetPath(volume, coerceNodeModulesWasmPath(vfsPath));
  const existing = _inflight.get(assetPath);
  if (existing) return existing;

  const promise = (async (): Promise<boolean> => {
    const cdnUrl = buildCdnWasmUrl(volume, assetPath);
    if (!cdnUrl || typeof fetch === "undefined") return false;

    try {
      const resp = await fetch(cdnUrl);
      if (!resp.ok) return false;

      // Compile in parallel with the byte read when the browser supports
      // streaming compilation; register the module once we have the bytes.
      let streamingCompile: Promise<WebAssembly.Module> | null = null;
      if (
        typeof WebAssembly !== "undefined" &&
        typeof WebAssembly.compileStreaming === "function"
      ) {
        try {
          streamingCompile = WebAssembly.compileStreaming(resp.clone());
          streamingCompile.catch(() => {});
        } catch {
          streamingCompile = null;
        }
      }

      const bytes = new Uint8Array(await resp.arrayBuffer());
      if (bytes.byteLength === 0) return false;

      try {
        const dir = assetPath.substring(0, assetPath.lastIndexOf("/")) || "/";
        volume.mkdirSync(dir, { recursive: true });
        volume.writeFileSync(assetPath, bytes);
      } catch {
        /* VFS write is best-effort; compile caches still help */
      }

      if (streamingCompile && bytes.byteLength >= PRECOMPILE_THRESHOLD) {
        try {
          registerCompiledModule(bytes, await streamingCompile);
        } catch {
          precompileWasm(bytes);
        }
      } else {
        precompileWasm(bytes);
      }
      return true;
    } catch {
      return false;
    } finally {
      _inflight.delete(assetPath);
    }
  })();

  _inflight.set(assetPath, promise);
  return promise;
}
