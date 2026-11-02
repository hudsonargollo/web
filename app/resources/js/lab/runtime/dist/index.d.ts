export { MemoryVolume } from "./memory-volume";
export type { VolumeNode, FileStat, FileWatchHandle, WatchCallback, WatchEventKind, SystemError, } from "./memory-volume";
export { ScriptEngine, executeCode } from "./script-engine";
export type { ModuleRecord, EngineOptions, ResolverFn } from "./script-engine";
export { spawnEngine, WorkerSandbox, IframeSandbox, spawnProcessWorkerEngine, ProcessWorkerAdapter } from "./engine-factory";
export type { IScriptEngine, ExecutionOutcome, SpawnEngineConfig, EngineConfig, VolumeSnapshot, } from "./engine-types";
export { generateSandboxDeployment, getSandboxPageHtml, getSandboxHostingConfig, SANDBOX_DEPLOYMENT_GUIDE, } from "./isolation-helpers";
export { buildFileSystemBridge } from "./polyfills/fs";
export type { FsBridge } from "./polyfills/fs";
export { buildProcessEnv } from "./polyfills/process";
export type { ProcessObject, ProcessEnvVars } from "./polyfills/process";
export * as path from "./polyfills/path";
export * as http from "./polyfills/http";
export { setFetchResponse, installFetchHeadersSetCookieParity, installNodeFetchClassParity, } from "./polyfills/fetch-response";
export * as net from "./polyfills/net";
export * as events from "./polyfills/events";
export * as stream from "./polyfills/stream";
export * as url from "./polyfills/url";
export * as querystring from "./polyfills/querystring";
export * as util from "./polyfills/util";
export * as npm from "./packages/installer";
export { DependencyInstaller, install } from "./packages/installer";
export type { InstallFlags, InstallOutcome, WorkspaceInstallOutcome } from "./packages/installer";
export { discoverWorkspaces, readWorkspacePatterns } from "./packages/workspace";
export type { WorkspaceGraph, WorkspacePackage } from "./packages/workspace";
export { RequestProxy, getProxyInstance, resetProxy, DeepThoughtSWSetupError } from "./request-proxy";
export type { ProxyOptions, ServiceWorkerConfig, DeepThoughtSWFrameworkHint } from "./request-proxy";
export { setProxy as setCorsProxy, getProxy as getCorsProxy, setAllowedDomains, } from "./cross-origin";
export * as chokidar from "./polyfills/chokidar";
export * as ws from "./polyfills/ws";
export * as fsevents from "./polyfills/fsevents";
export * as readdirp from "./polyfills/readdirp";
export * as module from "./polyfills/module";
export * as perf_hooks from "./polyfills/perf_hooks";
export * as worker_threads from "./polyfills/worker_threads";
export * as esbuild from "./polyfills/esbuild";
export * as rollup from "./polyfills/rollup";
export * as assert from "./polyfills/assert";
import { MemoryVolume } from "./memory-volume";
import { ScriptEngine, EngineOptions } from "./script-engine";
import { DependencyInstaller } from "./packages/installer";
import { RequestProxy } from "./request-proxy";
export interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
export interface CommandOptions {
    cwd?: string;
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
    signal?: AbortSignal;
}
export interface WorkspaceConfig extends EngineOptions {
    baseUrl?: string;
    onServerReady?: (port: number, url: string) => void;
}
export declare function createWorkspace(config?: WorkspaceConfig): {
    volume: MemoryVolume;
    engine: ScriptEngine;
    packages: DependencyInstaller;
    proxy: RequestProxy;
    execute: (code: string, filename?: string) => {
        exports: unknown;
    };
    runFile: (filename: string) => {
        exports: unknown;
    };
    run: (command: string, options?: CommandOptions) => Promise<CommandResult>;
    sendInput: (data: string) => Promise<void>;
    createREPL: () => {
        eval: (code: string) => unknown;
    };
    on: (event: string, listener: (...args: unknown[]) => void) => void;
};
export default createWorkspace;
export { LabRuntime } from "./sdk/lab-runtime";
/** @deprecated Use LabRuntime */
export { LabRuntime as DeepThoughtEngine } from "./sdk/lab-runtime";
export { LabTerminal } from "./sdk/lab-terminal";
/** @deprecated Use LabTerminal */
export { LabTerminal as DeepThoughtTerminal } from "./sdk/lab-terminal";
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
export { PreviewInspector, PreviewInspectorError, PreviewNotAttachedError, PreviewAgentUnavailableError, PreviewInspectionTimeoutError, PreviewScreenshotUnavailableError, } from "./sdk/preview-inspector";
export type { LabRuntimeOptions, LabRuntimeRequestOptions, TerminalOptions, TerminalTheme, StatResult, Snapshot, SpawnOptions, PerformanceStats, PerformanceTiming, } from "./sdk/types";
/** @deprecated Use LabRuntimeOptions / LabRuntimeRequestOptions */
export type { DeepThoughtOptions, DeepThoughtEngineRequestOptions, } from "./sdk/types";
export type { DeepThoughtEngineProfileReport, DeepThoughtEngineProfiler, ProfileAggregate, ProfileCategory, ProfileEnvironment, ProfileExportFormat, ProfileLongTaskSample, ProfileMemorySample, ProfileSample, ProfileSession, ProfileSpan, ProfileSpanOptions, ProfileSummary, ProfileWarning, ProfilerLevel, ProfilerOptions, ProfilePathDetail, } from "./profiling/types";
export { ensureRuntimeHost, getRuntimeHost, setRuntimeHost, resetRuntimeHost, createBrowserHost, } from "./host";
export type { RuntimeHost, HostWorker, HttpIngress, WorkerSpec } from "./host";
export type { InspectWaitUntil, InspectTarget, InspectResult, InspectAttachOptions, InspectRect, InspectConsoleEntry, InspectErrorEntry, InspectDomNode, InspectQueryNode, InspectA11yNode, InspectA11yViolation, InspectScreenshot, InspectEvent, InspectSnapshot, } from "./sdk/preview-inspector";
export { MemoryHandler, LRUCache } from "./memory-handler";
export type { MemoryHandlerOptions } from "./memory-handler";
export { ProcessManager } from "./threading/process-manager";
export { ProcessHandle } from "./threading/process-handle";
export type { ProcessState } from "./threading/process-handle";
export { VFSBridge } from "./threading/vfs-bridge";
export { WorkerVFS } from "./threading/worker-vfs";
export { SyncChannelController, SyncChannelWorker } from "./threading/sync-channel";
export { SharedVFSController, SharedVFSReader, isSharedArrayBufferAvailable } from "./threading/shared-vfs";
export type { SharedVFSStat } from "./threading/shared-vfs";
export { createProcessContext, getActiveContext, setActiveContext } from "./threading/process-context";
export type { ProcessContext, ProcessWriter, ProcessReader, OpenFileEntry } from "./threading/process-context";
export type { VFSBinarySnapshot, VFSSnapshotEntry, SpawnConfig, ProcessInfo, MainToWorkerMessage, WorkerToMainMessage, } from "./threading/worker-protocol";
