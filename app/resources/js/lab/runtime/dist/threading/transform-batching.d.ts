import type { TransformBatchFile } from "./offload-types";
export declare const TRANSFORM_BATCH_MAX_FILES = 64;
export declare const TRANSFORM_BATCH_MAX_SOURCE_BYTES: number;
/** Split files without changing their order or placing an oversized file in a later batch. */
export declare function chunkTransformFiles(files: TransformBatchFile[], maxFiles?: number, maxSourceBytes?: number): TransformBatchFile[][];
