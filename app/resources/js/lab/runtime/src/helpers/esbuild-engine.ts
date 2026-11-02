// Single esbuild-wasm instance per realm. Both the `esbuild` polyfill and
// the install-time module transformer used to boot their own copy of the
// ~10MB binary; this module owns the one shared init promise, stored on
// globalThis so duplicate bundle copies of this file still converge.

import { CDN_ESBUILD_ESM, CDN_ESBUILD_BINARY, cdnImport } from "../constants/cdn-urls";
import {
  LAB_ESBUILD_PROMISE_GLOBAL,
  LAB_ESBUILD_READY_GLOBAL,
  LEGACY_ESBUILD_PROMISE_GLOBAL,
  LEGACY_ESBUILD_READY_GLOBAL,
} from "../internal/lab-keys";

export type EsbuildEngine = typeof import("esbuild-wasm");

interface EsbuildGlobal extends Record<string, unknown> {
  __esbuild?: EsbuildEngine;
}

function readEsbuildPromise(g: EsbuildGlobal): Promise<EsbuildEngine> | undefined {
  return (g[LAB_ESBUILD_PROMISE_GLOBAL] ?? g[LEGACY_ESBUILD_PROMISE_GLOBAL]) as
    | Promise<EsbuildEngine>
    | undefined;
}

function readEsbuildReady(g: EsbuildGlobal): EsbuildEngine | null {
  return (g[LAB_ESBUILD_READY_GLOBAL] ?? g[LEGACY_ESBUILD_READY_GLOBAL] ?? null) as
    | EsbuildEngine
    | null;
}

function publishEsbuildPromise(g: EsbuildGlobal, promise: Promise<EsbuildEngine> | undefined): void {
  g[LAB_ESBUILD_PROMISE_GLOBAL] = promise;
  g[LEGACY_ESBUILD_PROMISE_GLOBAL] = promise;
}

function publishEsbuildReady(g: EsbuildGlobal, engine: EsbuildEngine | undefined): void {
  g[LAB_ESBUILD_READY_GLOBAL] = engine;
  g[LEGACY_ESBUILD_READY_GLOBAL] = engine;
}

/**
 * Get (initializing on first call) the realm-wide esbuild-wasm instance.
 * A host page may pre-provide its own instance on `globalThis.__esbuild`.
 * Failed initialization clears the shared promise so callers can retry.
 */
export function getEsbuild(opts?: { wasmURL?: string }): Promise<EsbuildEngine> {
  const g = globalThis as EsbuildGlobal;

  const existing = readEsbuildPromise(g);
  if (existing) return existing;

  if (g.__esbuild) {
    publishEsbuildReady(g, g.__esbuild);
    const promise = Promise.resolve(g.__esbuild);
    publishEsbuildPromise(g, promise);
    return promise;
  }

  const initPromise = (async () => {
    try {
      const loaded = await cdnImport(CDN_ESBUILD_ESM);
      const engine: EsbuildEngine = loaded.default || loaded;
      try {
        await engine.initialize({ wasmURL: opts?.wasmURL || CDN_ESBUILD_BINARY });
      } catch (initErr) {
        if (
          !(
            initErr instanceof Error &&
            initErr.message.includes('Cannot call "initialize" more than once')
          )
        ) {
          throw initErr;
        }
      }
      publishEsbuildReady(g, engine);
      return engine;
    } catch (err) {
      publishEsbuildPromise(g, undefined);
      throw new Error(`esbuild: initialization failed -- ${err}`);
    }
  })();

  publishEsbuildPromise(g, initPromise);
  return initPromise;
}

/** The initialized instance, or null if init hasn't completed yet. */
export function getEsbuildIfReady(): EsbuildEngine | null {
  return readEsbuildReady(globalThis as EsbuildGlobal);
}

export function disposeEsbuild(): void {
  const g = globalThis as EsbuildGlobal;
  try { (readEsbuildReady(g) as any)?.stop?.(); } catch { /* ignore */ }
  publishEsbuildReady(g, undefined);
  publishEsbuildPromise(g, undefined);
}
