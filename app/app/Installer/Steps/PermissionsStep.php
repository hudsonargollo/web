<?php

declare(strict_types=1);

namespace App\Installer\Steps;

use App\Support\Ui\Pulse;
use Deep42\Hitchhiker\Contracts\InstallerStep;
use Deep42\Hitchhiker\Steps\CheckPermissions;
use RuntimeException;

final class PermissionsStep implements InstallerStep
{
    public function __construct(
        private readonly CheckPermissions $inner,
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
        return 'installer::steps.permissions';
    }

    public function isSkipped(): bool
    {
        return $this->inner->isSkipped();
    }

    public function validate(array $data = []): bool
    {
        if (! $this->inner->validate($data)) {
            throw new RuntimeException(__('installer::installer.permissions_action_needed'));
        }

        return true;
    }

    public function process(array $data = []): void
    {
        $this->inner->process($data);

        session()->now('installer.pulse', Pulse::craft(
            (string) __('installer::installer.permissions_all_correct'),
            null,
            'ok',
        ));
    }

    /**
     * @return array<string, bool>
     */
    public function check(): array
    {
        return $this->inner->check();
    }
}
