<?php

declare(strict_types=1);

namespace App\Installer\Steps;

use App\Installer\EnsureInstallerAppKey;
use App\Installer\EnvTemplate;
use App\Support\Ui\Pulse;
use Deep42\Hitchhiker\Contracts\EnvironmentWriter;
use Deep42\Hitchhiker\Contracts\InstallerStep;
use Deep42\Hitchhiker\Steps\ConfigureEnvironment;

final class EnvironmentStep implements InstallerStep
{
    public function __construct(
        private readonly ConfigureEnvironment $inner,
    ) {}

    public function id(): string
    {
        return $this->inner->id();
    }

    public function label(): string
    {
        return $this->inner->label();
    }

    public function view(): string
    {
        return 'installer::steps.environment';
    }

    public function isSkipped(): bool
    {
        return $this->inner->isSkipped();
    }

    public function validate(array $data = []): bool
    {
        return $this->inner->validate($data);
    }

    public function process(array $data = []): void
    {
        $this->inner->process($data);

        // Hitchhiker only writes DB_* (and extra fields). A leftover stub .env
        // would otherwise stay ~15 keys — pull the rest from .env.example.
        EnvTemplate::mergeMissing();

        // Keep the wizard on file stores in .env until AfterInstall flips them.
        // Otherwise the next Livewire request boots with SESSION_DRIVER=database
        // against an empty database that has no sessions table yet.
        EnsureInstallerAppKey::hydrate();

        $env = app(EnvironmentWriter::class);
        $fill = [
            'APP_NAME' => (string) (config('installer.name') ?: 'Krikkit'),
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'SESSION_DRIVER' => 'file',
            'CACHE_STORE' => 'file',
        ];
        $key = (string) config('app.key');
        if ($key !== '' && blank($env->get('APP_KEY'))) {
            $fill['APP_KEY'] = $key;
        }
        $url = rtrim((string) request()->getSchemeAndHttpHost(), '/');
        if ($url !== '' && blank($env->get('APP_URL'))) {
            $fill['APP_URL'] = $url;
        }
        $env->fill($fill);
        $env->save();

        session()->now('installer.pulse', Pulse::craft(
            (string) __('installer::installer.environment_test_success'),
            null,
            'ok',
        ));
    }

    public function testConnection(array $data): bool
    {
        return $this->inner->testConnection($data);
    }
}
