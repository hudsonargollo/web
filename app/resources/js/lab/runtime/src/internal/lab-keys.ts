/**
 * Krikkit Lab internal symbol migration (Phase 4).
 * New producers write both keys; consumers dual-read until legacy keys are removed.
 */

import type { HostWorker } from "../host/types";

type Dict = Record<string, unknown>;

// ---- Global browser host factory ----

export const LEGACY_GLOBAL_BROWSER_HOST_FACTORY = "__DEEPTHOUGHT_CREATE_BROWSER_HOST__";
export const LAB_GLOBAL_BROWSER_HOST_FACTORY = "__KRIKKIT_LAB_CREATE_BROWSER_HOST__";

export function readGlobalBrowserHostFactory(): (() => unknown) | null {
  const g = globalThis as Dict;
  for (const key of [LAB_GLOBAL_BROWSER_HOST_FACTORY, LEGACY_GLOBAL_BROWSER_HOST_FACTORY]) {
    const hooked = g[key];
    if (typeof hooked === "function") return hooked as () => unknown;
  }
  return null;
}

export function publishGlobalBrowserHostFactory(
  factory: (() => unknown) | null,
): void {
  try {
    const g = globalThis as Dict;
    if (factory) {
      g[LAB_GLOBAL_BROWSER_HOST_FACTORY] = factory;
      g[LEGACY_GLOBAL_BROWSER_HOST_FACTORY] = factory;
    } else {
      delete g[LAB_GLOBAL_BROWSER_HOST_FACTORY];
      delete g[LEGACY_GLOBAL_BROWSER_HOST_FACTORY];
    }
  } catch {
    /* non-writable globalThis in exotic hosts */
  }
}

// ---- Worker lifecycle messages ----

export const LEGACY_WORKER_WASI_INIT = "__deepthought_wasi_init__";
export const LAB_WORKER_WASI_INIT = "__krikkit_lab_wasi_init__";

export const LEGACY_WORKER_BROKER_READY = "__deepthought_broker_ready__";
export const LAB_WORKER_BROKER_READY = "__krikkit_lab_broker_ready__";

export const LEGACY_WORKER_ERROR = "__deepthought_worker_error__";
export const LAB_WORKER_ERROR = "__krikkit_lab_worker_error__";

export const LEGACY_WORKER_EXIT = "__deepthought_worker_exit__";
export const LAB_WORKER_EXIT = "__krikkit_lab_worker_exit__";

export const LEGACY_WORKER_DATA_GLOBAL = "__deepthoughtWorkerData";
export const LAB_WORKER_DATA_GLOBAL = "__krikkitLabWorkerData";

export const LEGACY_THREAD_ID_TOKEN = "__DEEPTHOUGHT_THREAD_ID__";
export const LAB_THREAD_ID_TOKEN = "__KRIKKIT_LAB_THREAD_ID__";

export function isWorkerWasiInit(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Dict;
  return Boolean(d[LAB_WORKER_WASI_INIT] ?? d[LEGACY_WORKER_WASI_INIT]);
}

export function workerWasiInitMessage(
  source: string,
  workerData: unknown,
): Dict {
  return {
    [LAB_WORKER_WASI_INIT]: true,
    [LEGACY_WORKER_WASI_INIT]: true,
    source,
    workerData,
  };
}

export function workerBrokerReadyMessage(): Dict {
  return {
    [LAB_WORKER_BROKER_READY]: true,
    [LEGACY_WORKER_BROKER_READY]: true,
  };
}

export function workerErrorMessage(message: string): Dict {
  return {
    [LAB_WORKER_ERROR]: message,
    [LEGACY_WORKER_ERROR]: message,
  };
}

export function workerExitMessage(code: number): Dict {
  return {
    [LAB_WORKER_EXIT]: code,
    [LEGACY_WORKER_EXIT]: code,
  };
}

export function hasWorkerBrokerReady(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Dict;
  return LAB_WORKER_BROKER_READY in d || LEGACY_WORKER_BROKER_READY in d;
}

export function readWorkerError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Dict;
  const err = d[LAB_WORKER_ERROR] ?? d[LEGACY_WORKER_ERROR];
  return err == null ? null : String(err);
}

export function hasWorkerError(data: unknown): boolean {
  return readWorkerError(data) !== null;
}

export function readWorkerExitCode(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Dict;
  if (!(LAB_WORKER_EXIT in d) && !(LEGACY_WORKER_EXIT in d)) return null;
  const code = d[LAB_WORKER_EXIT] ?? d[LEGACY_WORKER_EXIT];
  return Number(code) || 0;
}

export function wasiBootstrapSource(): string {
  return `self.onmessage = (event) => {
  if (!event.data || (!event.data.${LAB_WORKER_WASI_INIT} && !event.data.${LEGACY_WORKER_WASI_INIT})) return;
  const init = event.data;
  globalThis.${LAB_WORKER_DATA_GLOBAL} = init.workerData;
  globalThis.${LEGACY_WORKER_DATA_GLOBAL} = init.workerData;
  self.onmessage = null;
  try {
    (0, eval)(init.source);
    self.postMessage({ ${LAB_WORKER_BROKER_READY}: true, ${LEGACY_WORKER_BROKER_READY}: true });
  } catch (error) {
    const msg = String(error && error.stack || error);
    self.postMessage({ ${LAB_WORKER_ERROR}: msg, ${LEGACY_WORKER_ERROR}: msg });
  }
};`;
}

export function replaceThreadIdTokens(source: string, threadId: number | string): string {
  const id = String(threadId);
  return source
    .replaceAll(LAB_THREAD_ID_TOKEN, id)
    .replaceAll(LEGACY_THREAD_ID_TOKEN, id);
}

export function readGlobalWorkerData(): unknown {
  const g = globalThis as Dict;
  return g[LAB_WORKER_DATA_GLOBAL] ?? g[LEGACY_WORKER_DATA_GLOBAL] ?? null;
}

export function publishGlobalWorkerData(data: unknown): void {
  const g = globalThis as Dict;
  g[LAB_WORKER_DATA_GLOBAL] = data;
  g[LEGACY_WORKER_DATA_GLOBAL] = data;
}

// ---- Host worker metadata ----

export const LEGACY_HOST_WORKER_DIRECT = "__deepthoughtDirect";
export const LAB_HOST_WORKER_DIRECT = "__krikkitLabDirect";

export const LEGACY_HOST_WORKER_REVOKE_URL = "__deepthoughtRevokeUrl";
export const LAB_HOST_WORKER_REVOKE_URL = "__krikkitLabRevokeUrl";

export function markHostWorkerDirect(worker: HostWorker, direct = true): void {
  const w = worker as unknown as Dict;
  w[LAB_HOST_WORKER_DIRECT] = direct;
  w[LEGACY_HOST_WORKER_DIRECT] = direct;
}

export function isHostWorkerDirect(worker: HostWorker): boolean {
  const w = worker as unknown as Dict;
  return Boolean(w[LAB_HOST_WORKER_DIRECT] ?? w[LEGACY_HOST_WORKER_DIRECT]);
}

export function setHostWorkerRevokeUrl(
  worker: HostWorker,
  url: string | null | undefined,
): void {
  const w = worker as unknown as Dict;
  w[LAB_HOST_WORKER_REVOKE_URL] = url ?? null;
  w[LEGACY_HOST_WORKER_REVOKE_URL] = url ?? null;
}

export function getHostWorkerRevokeUrl(worker: HostWorker): string {
  const w = worker as unknown as Dict;
  return String(w[LAB_HOST_WORKER_REVOKE_URL] ?? w[LEGACY_HOST_WORKER_REVOKE_URL] ?? "");
}

// ---- Runtime globals (volume, esbuild) ----

export const LEGACY_VOLUME_GLOBAL = "__deepthoughtVolume";
export const LAB_VOLUME_GLOBAL = "__krikkitLabVolume";

export const LEGACY_ESBUILD_PROMISE_GLOBAL = "__deepthoughtEsbuild";
export const LAB_ESBUILD_PROMISE_GLOBAL = "__krikkitLabEsbuild";

export const LEGACY_ESBUILD_READY_GLOBAL = "__deepthoughtEsbuildReady";
export const LAB_ESBUILD_READY_GLOBAL = "__krikkitLabEsbuildReady";

export function readGlobalVolume(): unknown {
  const g = globalThis as Dict;
  return g[LAB_VOLUME_GLOBAL] ?? g[LEGACY_VOLUME_GLOBAL];
}

export function publishGlobalVolume(volume: unknown): void {
  const g = globalThis as Dict;
  g[LAB_VOLUME_GLOBAL] = volume;
  g[LEGACY_VOLUME_GLOBAL] = volume;
}

// ---- Preview inspector wire protocol ----

export const LEGACY_INSPECT_FLAG = "__deepthoughtInspect";
export const LAB_INSPECT_FLAG = "__krikkitLabInspect";

export const LEGACY_INSPECT_CONFIG_GLOBAL = "__deepthoughtInspectConfig";
export const LAB_INSPECT_CONFIG_GLOBAL = "__krikkitLabInspectConfig";

export const LEGACY_INSPECT_AGENT_GLOBAL = "__deepthoughtInspectAgent";
export const LAB_INSPECT_AGENT_GLOBAL = "__krikkitLabInspectAgent";

export function isInspectWireMessage(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Dict;
  return d[LAB_INSPECT_FLAG] === 1 || d[LEGACY_INSPECT_FLAG] === 1;
}

export function inspectWireEnvelope(
  partial: Dict,
): Dict {
  return {
    [LAB_INSPECT_FLAG]: 1,
    [LEGACY_INSPECT_FLAG]: 1,
    ...partial,
  };
}

// ---- Shell history paths ----

export const LEGACY_SHELL_HISTORY_BASENAME = ".deepthought_history";
export const LAB_SHELL_HISTORY_BASENAME = ".krikkit-lab_history";

export function shellHistoryPaths(home: string): string[] {
  return [
    `${home}/${LAB_SHELL_HISTORY_BASENAME}`,
    `${home}/${LEGACY_SHELL_HISTORY_BASENAME}`,
  ];
}

export function primaryShellHistoryPath(home: string): string {
  return `${home}/${LAB_SHELL_HISTORY_BASENAME}`;
}

// ---- Service worker URLs (Phase 5) ----

export const LAB_SW_PATH = "/__krikkit_lab_sw__.js";
export const LEGACY_SW_PATH = "/__deepthought_sw__.js";

/** Primary Lab service worker script URL path. */
export const DEFAULT_SW_PATH = LAB_SW_PATH;

export const LAB_SW_FILENAME = "__krikkit_lab_sw__.js";
export const LEGACY_SW_FILENAME = "__deepthought_sw__.js";

export function isLabServiceWorkerPath(path: string): boolean {
  const base = path.split("?")[0];
  return base === LAB_SW_PATH || base === LEGACY_SW_PATH;
}

export function labServiceWorkerPaths(): string[] {
  return [LAB_SW_PATH, LEGACY_SW_PATH];
}

// ---- IndexedDB names (Phase 5) ----

export const LAB_SNAPSHOT_DB = "krikkit-lab-snapshots";
export const LEGACY_SNAPSHOT_DB = "deepthought-snapshots";

export const LAB_WASM_MODULE_DB = "krikkit-lab-wasm-modules";
export const LEGACY_WASM_MODULE_DB = "deepthought-wasm-modules";

export const LAB_TARBALL_DB = "krikkit-lab-tarballs";
export const LEGACY_TARBALL_DB = "deepthought-tarballs";

export const LAB_IDB_MIGRATION_PREFIX = "krikkit-lab-idb-migration-v1:";
