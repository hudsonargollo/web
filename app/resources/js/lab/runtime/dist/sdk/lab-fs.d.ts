import type { MemoryVolume } from "../memory-volume";
import type { StatResult } from "./types";
import type { DeepThoughtProfilerImpl } from "../profiling/profiler";
export declare class LabFS {
    private _vol;
    private _profiler;
    constructor(_vol: MemoryVolume, _profiler?: DeepThoughtProfilerImpl | null);
    private begin;
    private end;
    writeFile(path: string, data: string | Uint8Array): Promise<void>;
    readFile(path: string, encoding?: "utf-8" | "utf8"): Promise<string>;
    readFile(path: string): Promise<Uint8Array>;
    mkdir(path: string, opts?: {
        recursive?: boolean;
    }): Promise<void>;
    readdir(path: string): Promise<string[]>;
    exists(path: string): Promise<boolean>;
    stat(path: string): Promise<StatResult>;
    unlink(path: string): Promise<void>;
    rmdir(path: string, opts?: {
        recursive?: boolean;
    }): Promise<void>;
    rm(path: string, opts?: {
        recursive?: boolean;
        force?: boolean;
    }): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    watch(path: string, optionsOrCb?: {
        recursive?: boolean;
    } | ((event: string, filename: string | null) => void), cb?: (event: string, filename: string | null) => void): {
        close(): void;
    };
    get volume(): MemoryVolume;
    private _removeRecursive;
}
