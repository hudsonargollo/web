<?php

namespace App\Installer\Callbacks;

use App\Permit\PermitLedger;
use App\Support\Storage\PublicDiskLink;
use Deep42\Hitchhiker\Contracts\EnvironmentWriter;
use Illuminate\Support\Facades\Log;

final class AfterInstall
{
    /**
     * @param  array<string, mixed>  $state
     */
    public function __invoke(array $state = []): void
    {
        // Only persist to .env — do not flip runtime session/cache drivers in this
        // request. finish() still needs the file session (sessions table may already
        // exist, but Livewire is mid-response and the installer lock is not written yet).
        $this->writeDatabaseSessionAndCacheToEnv();
        app(PermitLedger::class)->promoteWizardScratch();
        $this->ensurePublicStorageLink();
    }

    private function writeDatabaseSessionAndCacheToEnv(): void
    {
        $env = app(EnvironmentWriter::class);
        $env->fill([
            'SESSION_DRIVER' => 'database',
            'CACHE_STORE' => 'database',
        ]);

        if (app()->environment('testing') && ! app()->isShared(EnvironmentWriter::class)) {
            return;
        }

        if (! $env->save()) {
            Log::warning('Could not write SESSION_DRIVER and CACHE_STORE to database after install.');
        }
    }

    private function ensurePublicStorageLink(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        if (! PublicDiskLink::ensure()) {
            Log::warning('Could not link public/storage to storage/app/public.');
        }
    }
}
