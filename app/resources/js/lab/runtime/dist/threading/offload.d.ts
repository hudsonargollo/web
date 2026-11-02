import type { OffloadTask, OffloadResult, PoolConfig, TransformTask, TransformResult, TransformBatchTask, TransformBatchResult, ExtractTask, ExtractResult, BuildTask, BuildResult } from "./offload-types";
import type { DeepThoughtProfilerImpl } from "../profiling/profiler";
export { TaskPriority } from "./offload-types";
export type { TransformTask, TransformResult, TransformBatchTask, TransformBatchResult, ExtractTask, ExtractResult, BuildTask, BuildResult, OffloadTask, OffloadResult, PoolConfig, } from "./offload-types";
export declare function taskId(): number;
export declare function offload<T extends OffloadTask>(task: T): Promise<T extends TransformTask ? TransformResult : T extends TransformBatchTask ? TransformBatchResult : T extends ExtractTask ? ExtractResult : T extends BuildTask ? BuildResult : OffloadResult>;
/**
 * Opt-in timing wrapper for worker-backed tasks. Kept separate from offload()
 * so the default task path does not allocate profiling tokens or metadata.
 */
export declare function profiledOffload<T extends OffloadTask>(task: T, profiler: DeepThoughtProfilerImpl): Promise<T extends TransformTask ? TransformResult : T extends TransformBatchTask ? TransformBatchResult : T extends ExtractTask ? ExtractResult : T extends BuildTask ? BuildResult : OffloadResult>;
export declare function offloadBatch(tasks: OffloadTask[]): Promise<OffloadResult[]>;
export declare function cancelTask(id: number): boolean;
export declare function poolStats(): {
    total: number;
    busy: number;
    idle: number;
    initialized: number;
    fallback: boolean;
};
export declare function disposePool(): void;
export declare function configurePool(config: PoolConfig): void;
