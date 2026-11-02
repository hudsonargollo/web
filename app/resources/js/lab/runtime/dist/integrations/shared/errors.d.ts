export type DeepThoughtSWFrameworkHint = "vite" | "next" | "generic";
export interface DeepThoughtSWSetupErrorDetails {
    swUrl: string;
    status?: number;
    contentType?: string;
    /** Underlying network/abort error, if the preflight never got a response. */
    cause?: unknown;
    framework: DeepThoughtSWFrameworkHint;
}
export declare class DeepThoughtSWSetupError extends Error {
    readonly details: DeepThoughtSWSetupErrorDetails;
    constructor(message: string, details: DeepThoughtSWSetupErrorDetails);
    toString(): string;
}
/**
 * Guess which framework hint to show by sniffing the current runtime.
 * Defaults to "generic" if nothing matches.
 */
export declare function detectFrameworkHint(): DeepThoughtSWFrameworkHint;
