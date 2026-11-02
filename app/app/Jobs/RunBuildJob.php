<?php

namespace App\Jobs;

use App\Lab\Build\BuildRunner;
use App\Models\Build;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Throwable;

/**
 * Tries are capped at one: a half-written workspace must not be silently
 * re-run and billed twice. Surface the failure and let the caller decide.
 */
final class RunBuildJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 1;

    public int $timeout = 660;

    public function __construct(public readonly string $buildId) {}

    public function handle(BuildRunner $runner): void
    {
        $build = Build::query()->find($this->buildId);

        if ($build === null) {
            return;
        }

        try {
            $runner->run($build);
        } catch (Throwable $e) {
            report($e);

            $build->forceFill([
                'status' => Build::STATUS_FAILED,
                'stage' => null,
                'error' => mb_substr($e->getMessage(), 0, 2000),
                'finished_at' => now(),
            ])->save();
        }
    }
}
