export declare enum TaskPriority {
    HIGH = 0,// runtime transforms (user waiting)
    NORMAL = 1,// install-time bulk transforms
    LOW = 2
}
export interface TransformTask {
    type: "transform";
    id: number;
    source: string;
    filePath: string;
    options?: {
        loader?: "js" | "jsx" | "ts" | "tsx";
        format?: "cjs" | "esm";
        target?: string;
        platform?: string;
        define?: Record<string, string>;
    };
    priority: TaskPriority;
    profiling?: OffloadProfileTiming;
}
export interface TransformResult {
    type: "transform";
    id: number;
    code: string;
    warnings: string[];
    profiling?: OffloadProfileTiming;
}
export interface TransformBatchFile {
    filePath: string;
    source: string;
    loader?: "js" | "jsx" | "ts" | "tsx";
}
export interface TransformBatchTask {
    type: "transformBatch";
    id: number;
    files: TransformBatchFile[];
    options?: Omit<NonNullable<TransformTask["options"]>, "loader">;
    priority: TaskPriority;
    profiling?: OffloadProfileTiming;
}
export interface TransformBatchFileResult {
    filePath: string;
    code: string;
    warnings: string[];
}
export interface TransformBatchResult {
    type: "transformBatch";
    id: number;
    results: TransformBatchFileResult[];
    profiling?: OffloadProfileTiming;
}
export interface ExtractTask {
    type: "extract";
    id: number;
    tarballUrl: string;
    stripComponents: number;
    priority: TaskPriority;
    expectedShasum?: string;
    tarballBytes?: ArrayBuffer;
    wantTarball?: boolean;
    streamPort?: MessagePort;
    profiling?: OffloadProfileTiming;
}
export interface ExtractedFile {
    path: string;
    data: string | Uint8Array;
    isBinary: boolean;
}
export interface ExtractResult {
    type: "extract";
    id: number;
    files: ExtractedFile[];
    tarballBytes?: ArrayBuffer;
    streamed?: boolean;
    profiling?: OffloadProfileTiming;
}
export interface OffloadProfileTiming {
    createdAt: number;
    dispatchedAt?: number;
    startedAt?: number;
    completedAt?: number;
    receivedAt?: number;
    workerId?: number;
}
export interface BuildTask {
    type: "build";
    id: number;
    files: Record<string, string>;
    entryPoints?: string[];
    stdin?: {
        contents: string;
        resolveDir?: string;
        loader?: string;
    };
    bundle?: boolean;
    format?: "iife" | "cjs" | "esm";
    platform?: "browser" | "node" | "neutral";
    target?: string | string[];
    minify?: boolean;
    external?: string[];
    absWorkingDir?: string;
    priority: TaskPriority;
    profiling?: OffloadProfileTiming;
}
export interface BuildOutputFile {
    path: string;
    text: string;
}
export interface BuildResult {
    type: "build";
    id: number;
    outputFiles: BuildOutputFile[];
    errors: string[];
    warnings: string[];
    profiling?: OffloadProfileTiming;
}
export type OffloadTask = TransformTask | TransformBatchTask | ExtractTask | BuildTask;
export type OffloadResult = TransformResult | TransformBatchResult | ExtractResult | BuildResult;
export interface OffloadWorkerEndpoint {
    init(): Promise<void>;
    transform(task: TransformTask): Promise<TransformResult>;
    transformBatch(task: TransformBatchTask): Promise<TransformBatchResult>;
    extract(task: ExtractTask): Promise<ExtractResult>;
    build(task: BuildTask): Promise<BuildResult>;
    ping(): boolean;
}
export interface PoolConfig {
    minWorkers?: number;
    maxWorkers?: number;
    idleTimeoutMs?: number;
    warmUpOnCreate?: boolean;
}
