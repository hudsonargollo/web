/**
 * `@krikkit/deepthought/headless` — Node/Bun host adapter for isomorphic headless mode.
 *
 * Installs a `worker_threads` RuntimeHost (plus local HTTP ingress) before
 * re-exporting the public SDK. Prefer this entry for agents, CI, and CLIs.
 *
 * @example
 * ```ts
 * import { LabRuntime } from "@krikkit/deepthought/headless";
 * const runtime = await LabRuntime.boot();
 * await pod.fs.writeFile("/hello.txt", "hi");
 * const res = await pod.request(3000, { path: "/" });
 * ```
 */

import { setRuntimeHost } from "./host/runtime-host";
import { createNodeHost } from "./host/node/node-host";

setRuntimeHost(createNodeHost());

export { setRuntimeHost, getRuntimeHost, resetRuntimeHost } from "./host";
export { createNodeHost } from "./host/node/node-host";
export type { NodeHostOptions } from "./host/node/node-host";
export { createLocalHttpIngress } from "./host/node/local-http-ingress";
export { openFsSnapshotCache } from "./host/node/fs-snapshot-cache";

export { LabRuntime } from "./sdk/lab-runtime";
/** @deprecated Use LabRuntime */
export { LabRuntime as DeepThoughtEngine } from "./sdk/lab-runtime";
export { LabProcess } from "./sdk/lab-process";
/** @deprecated Use LabProcess */
export { LabProcess as DeepThoughtProcess } from "./sdk/lab-process";
export { LabFS } from "./sdk/lab-fs";
/** @deprecated Use LabFS */
export { LabFS as DeepThoughtFS } from "./sdk/lab-fs";
export { LabFSClient, LabFSClientError } from "./sdk/lab-fs-client";
/** @deprecated Use LabFSClient */
export {
  LabFSClient as DeepThoughtFSClient,
  LabFSClientError as DeepThoughtFSClientError,
} from "./sdk/lab-fs-client";
export { MemoryVolume } from "./memory-volume";
export { DependencyInstaller, install } from "./packages/installer";
export type { InstallFlags, InstallOutcome, WorkspaceInstallOutcome } from "./packages/installer";
export { discoverWorkspaces, readWorkspacePatterns } from "./packages/workspace";
export type { WorkspaceGraph, WorkspacePackage } from "./packages/workspace";
export { RequestProxy, getProxyInstance, resetProxy, DeepThoughtSWSetupError } from "./request-proxy";
export type {
  LabRuntimeOptions,
  LabRuntimeRequestOptions,
  Snapshot,
  SpawnOptions,
  ShellLimits,
  ShellOptions,
  StatResult,
  PerformanceStats,
  PerformanceTiming,
} from "./sdk/types";
/** @deprecated Use LabRuntimeOptions / LabRuntimeRequestOptions */
export type {
  DeepThoughtOptions,
  DeepThoughtEngineRequestOptions,
} from "./sdk/types";
export type {
  DeepThoughtEngineProfileReport,
  DeepThoughtEngineProfiler,
  ProfileAggregate,
  ProfileCategory,
  ProfileEnvironment,
  ProfileExportFormat,
  ProfileLongTaskSample,
  ProfileMemorySample,
  ProfileSample,
  ProfileSession,
  ProfileSpan,
  ProfileSpanOptions,
  ProfileSummary,
  ProfileWarning,
  ProfilerLevel,
  ProfilerOptions,
  ProfilePathDetail,
} from "./profiling/types";
