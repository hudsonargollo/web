import { MemoryVolume } from "../memory-volume";
import { RegistryConfig } from "./registry-client";
import { ResolvedDependency } from "./version-resolver";
import type { PackageManifest } from "../types/manifest";
import type { IDBSnapshotCache } from "../persistence/idb-cache";
import { restoreBinarySnapshot } from "../persistence/binary-snapshot";
import type { PerformanceTracker } from "../performance-tracker";
import type { DeepThoughtProfilerImpl } from "../profiling/profiler";
import { type WorkspaceGraph } from "./workspace";
/** Return literal npm package references using the wasm32-wasi convention. */
export declare function findWasiPackageReferences(source: string): string[];
export declare function manifestSnapshotKey(raw: string, flags?: InstallFlags): string;
export interface InstallFlags {
    registry?: string;
    persist?: boolean;
    persistDev?: boolean;
    withDevDeps?: boolean;
    withOptionalDeps?: boolean;
    onProgress?: (message: string) => void;
    /**
     * Module transform timing. Default is lazy: install only downloads and
     * extracts; the runtime module loader converts ESM/CJS on first require()
     * (and caches it). Pass "eager" (or the legacy `true`) to run esbuild over
     * every installed file at install time like before.
     */
    transformModules?: boolean | "eager";
    /** Prefer lockfile tarball URL + SRI for the root package being installed. */
    lockEntry?: {
        resolved?: string;
        integrity?: string;
    };
}
export declare function isEagerTransform(value: boolean | "eager" | undefined): boolean;
export declare function isManifestSnapshotComplete(snapshot: Parameters<typeof restoreBinarySnapshot>[1], workingDir: string, manifest: PackageManifest, flags?: InstallFlags): boolean;
export interface InstallOutcome {
    resolved: Map<string, ResolvedDependency>;
    newPackages: string[];
}
export interface WorkspaceInstallOutcome {
    graph: WorkspaceGraph;
    installs: Array<{
        root: string;
        outcome: InstallOutcome;
    }>;
}
declare function splitSpecifier(spec: string): {
    name: string;
    version?: string;
};
export declare class DependencyInstaller {
    private vol;
    private registryClient;
    private workingDir;
    private _snapshotCache;
    private _performance;
    private _profiler;
    constructor(vol: MemoryVolume, opts?: {
        cwd?: string;
        snapshotCache?: IDBSnapshotCache | null;
        performanceTracker?: PerformanceTracker | null;
        profiler?: DeepThoughtProfilerImpl | null;
    } & RegistryConfig);
    private profileSpan;
    private endProfileSpan;
    install(packageName: string, version?: string, flags?: InstallFlags): Promise<InstallOutcome>;
    installFromManifest(manifestPath?: string, flags?: InstallFlags): Promise<InstallOutcome>;
    /**
     * Install a root npm workspace and each child workspace. Workspace-local
     * dependencies are linked through the VFS after external dependencies are
     * installed in the package that consumes them.
     */
    installWorkspace(rootManifestPath?: string, flags?: InstallFlags): Promise<WorkspaceInstallOutcome>;
    listInstalled(): Record<string, string>;
    /**
     * Materialize the resolved tree, then add any WASI companions referenced by
     * the installed package code. This handles packages that omit the companion
     * from optionalDependencies and only discover it in a runtime fallback.
     */
    private materializeWithWasiCompanions;
    private findWasiCompanionCandidates;
    private materializePackages;
    private createBinStubs;
    private writeLockFile;
    private patchManifest;
}
export declare function install(specifier: string, vol: MemoryVolume, flags?: InstallFlags): Promise<InstallOutcome>;
export { RegistryClient } from "./registry-client";
export type { RegistryConfig, VersionDetail, PackageMetadata, } from "./registry-client";
export type { ResolvedDependency, ResolutionConfig } from "./version-resolver";
export type { ExtractionOptions } from "./archive-extractor";
export { splitSpecifier };
