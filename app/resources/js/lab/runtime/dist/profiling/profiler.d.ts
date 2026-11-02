import type { DeepThoughtEngineProfileReport, ProfileCategory, ProfileEnvironment, ProfileSample, ProfileSession, ProfileSpanOptions, ProfilerLevel, ProfilerOptions, DeepThoughtEngineProfiler as DeepThoughtEngineProfilerApi } from "./types";
export interface ProfileSpanToken {
    readonly id: number;
    readonly startedAt: number;
    readonly name: string;
    readonly category: ProfileCategory;
    readonly thread: string;
    readonly processId?: number;
    readonly parentId?: number;
    readonly metadata?: Record<string, string | number | boolean>;
    ended?: boolean;
}
export type ProfileMemoryProvider = () => Record<string, unknown>;
export declare function profileTimestamp(): number;
interface InternalSession extends ProfileSession {
    begin(name: string, options?: ProfileSpanOptions): ProfileSpanToken | null;
    end(token: ProfileSpanToken | null): number;
    recordSpan(name: string, startedAt: number, endedAt: number, options?: ProfileSpanOptions): void;
    count(name: string, amount?: number): void;
    gauge(name: string, value: number): void;
    sample(sample: ProfileSample): void;
    warning(code: string, message: string): void;
    addMemorySample(): Promise<void>;
    addLongTask(startTime: number, durationMs: number, name?: string): void;
}
declare class ProfileSessionImpl implements InternalSession {
    readonly id: string;
    readonly startedAt: number;
    private readonly profiler;
    private readonly options;
    private readonly nameValue;
    private readonly spansById;
    private readonly spanAggregates;
    private readonly categoryAggregates;
    private readonly countersMap;
    private readonly gaugesMap;
    private readonly sampleList;
    private readonly warningList;
    private readonly memorySamples;
    private readonly hashSalt;
    private nextSpanId;
    private droppedSpansValue;
    private droppedSamplesValue;
    private busyDurationMs;
    private longTaskCount;
    private longTaskTotalMs;
    private longTaskLongestMs;
    private droppedMetricKeys;
    private memoryTimer;
    private readonly memorySamplePromises;
    private memoryCapabilityWarningIssued;
    private memorySampleWarningIssued;
    private observer;
    private stopping;
    private reportValue;
    constructor(profiler: DeepThoughtProfilerImpl, name: string);
    get name(): string;
    private startObservers;
    private scheduleMemorySample;
    begin(name: string, options?: ProfileSpanOptions): ProfileSpanToken | null;
    end(token: ProfileSpanToken | null): number;
    recordSpan(name: string, startedAt: number, endedAt: number, options?: ProfileSpanOptions): void;
    private recordCompletedSpan;
    count(name: string, amount?: number): void;
    gauge(name: string, value: number): void;
    sample(sample: ProfileSample): void;
    warning(code: string, message: string): void;
    addLongTask(startTime: number, durationMs: number, name?: string): void;
    addMemorySample(): Promise<void>;
    stop(): Promise<DeepThoughtEngineProfileReport>;
    private finish;
}
export declare class DeepThoughtProfilerImpl implements DeepThoughtEngineProfilerApi {
    readonly enabled: boolean;
    readonly level: ProfilerLevel;
    readonly options: Required<ProfilerOptions>;
    readonly environment: ProfileEnvironment;
    memoryProvider: ProfileMemoryProvider | null;
    private active;
    constructor(options?: ProfilerOptions);
    setMemoryProvider(provider: ProfileMemoryProvider | null): void;
    start(name: string): ProfileSession;
    profile<T>(name: string, operation: () => T | Promise<T>): Promise<{
        result: T;
        report: DeepThoughtEngineProfileReport;
    }>;
    begin(name: string, options?: ProfileSpanOptions): ProfileSpanToken | null;
    end(token: ProfileSpanToken | null): number;
    recordSpan(name: string, startedAt: number, endedAt: number, options?: ProfileSpanOptions): void;
    count(name: string, amount?: number): void;
    gauge(name: string, value: number): void;
    sample(sample: ProfileSample): void;
    finish(session: ProfileSessionImpl): void;
}
export type DeepThoughtEngineProfiler = DeepThoughtProfilerImpl;
export {};
