<?php

declare(strict_types=1);

namespace App\Installer\Steps;

use Deep42\Hitchhiker\Contracts\InstallerStep;
use Deep42\Hitchhiker\Steps\CheckRequirements;
use RuntimeException;

final class RequirementsStep implements InstallerStep
{
    public function __construct(
        private readonly CheckRequirements $inner,
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
        return 'installer::steps.requirements';
    }

    public function isSkipped(): bool
    {
        return $this->inner->isSkipped();
    }

    public function validate(array $data = []): bool
    {
        if (! $this->inner->validate($data)) {
            throw new RuntimeException(__('installer::installer.requirements_action_needed'));
        }

        return true;
    }

    public function process(array $data = []): void
    {
        $this->inner->process($data);
    }

    /**
     * @return array<string, bool>
     */
    public function check(): array
    {
        return $this->inner->check();
    }
}
