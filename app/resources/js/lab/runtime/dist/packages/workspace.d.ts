import { MemoryVolume } from "../memory-volume";
import type { PackageManifest } from "../types/manifest";
export interface WorkspacePackage {
    name: string;
    version: string;
    root: string;
    manifest: PackageManifest;
}
export interface WorkspaceGraph {
    root: string;
    patterns: string[];
    packages: WorkspacePackage[];
    byName: Map<string, WorkspacePackage>;
}
export declare function readWorkspacePatterns(manifest: PackageManifest): string[];
export declare function discoverWorkspaces(volume: MemoryVolume, root?: string): WorkspaceGraph;
export declare function workspaceDependencyNames(manifest: PackageManifest): Set<string>;
