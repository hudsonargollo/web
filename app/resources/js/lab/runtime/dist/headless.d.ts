/**
 * `@krikkit/deepthought/headless` — Node/Bun host adapter for isomorphic headless mode.
 *
 * Installs a `worker_threads` RuntimeHost (plus local HTTP ingress) before
 * re-exporting the public SDK. Prefer this entry for agents, CI, and CLIs.
 *
 * @example
 * ```ts
 * import { DeepThoughtEngine } from "@krikkit/deepthought/headless";
 * const pod = await DeepThoughtEngine.boot();
 * await pod.fs.writeFile("/hello.txt", "hi");
 * const res = await pod.request(3000, { path: "/" });
 * ```
 */
export { setRuntimeHost, getRuntimeHost, resetRuntimeHost } from "./host";
export { createNodeHost } from "./host/node/node-host";
export type { NodeHostOptions } from "./host/node/node-host";
export { createLocalHttpIngress } from "./host/node/local-http-ingress";
export { openFsSnapshotCache } from "./host/node/fs-snapshot-cache";
export { DeepThoughtEngine } from "./sdk/deepthought";
export { DeepThoughtProcess } from "./sdk/deepthought-process";
export { DeepThoughtFS } from "./sdk/deepthought-fs";
export { DeepThoughtFSClient, DeepThoughtFSClientError } from "./sdk/deepthought-fs-client";
export { MemoryVolume } from "./memory-volume";
export { DependencyInstaller, install } from "./packages/installer";
export type { InstallFlags, InstallOutcome, WorkspaceInstallOutcome } from "./packages/installer";
export { discoverWorkspaces, readWorkspacePatterns } from "./packages/workspace";
export type { WorkspaceGraph, WorkspacePackage } from "./packages/workspace";
export { RequestProxy, getProxyInstance, resetProxy, DeepThoughtSWSetupError } from "./request-proxy";
export type { DeepThoughtOptions, DeepThoughtEngineRequestOptions, Snapshot, SpawnOptions, StatResult, PerformanceStats, PerformanceTiming, } from "./sdk/types";
export type { DeepThoughtEngineProfileReport, DeepThoughtEngineProfiler, ProfileAggregate, ProfileCategory, ProfileEnvironment, ProfileExportFormat, ProfileLongTaskSample, ProfileMemorySample, ProfileSample, ProfileSession, ProfileSpan, ProfileSpanOptions, ProfileSummary, ProfileWarning, ProfilerLevel, ProfilerOptions, ProfilePathDetail, } from "./profiling/types";
