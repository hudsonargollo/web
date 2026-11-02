<?php

declare(strict_types=1);

namespace App\Installer\Steps;

use App\Permit\DeepthoughtClient;
use App\Permit\PermitLedger;
use App\Permit\PermitRejected;
use App\Support\Ui\Pulse;
use Deep42\Hitchhiker\Contracts\InstallerStep;
use RuntimeException;

final class PermitStep implements InstallerStep
{
    public function id(): string
    {
        return 'permit';
    }

    public function label(): string
    {
        return __('dashboard.License');
    }

    public function view(): string
    {
        return 'installer.permit.permit';
    }

    public function isSkipped(): bool
    {
        return false;
    }

    public function validate(array $data = []): bool
    {
        return true;
    }

    public function process(array $data = []): void
    {
        $ledger = app(PermitLedger::class);

        $token = trim((string) ($data['permit_token'] ?? ''));

        if ($token === '') {
            $ledger->defer();
            session()->now('installer.pulse', Pulse::craft(
                (string) __('dashboard.License skipped. Bind a key later from Settings → License.'),
                null,
                'warn',
            ));

            return;
        }

        try {
            $reply = app(DeepthoughtClient::class)->attest($token, 'krikkit-install');
        } catch (PermitRejected $exception) {
            throw new RuntimeException($exception->getMessage(), previous: $exception);
        }

        $ledger->rememberActive($token, $reply);
        session()->now('installer.pulse', Pulse::craft(
            (string) __('dashboard.License bound.'),
            __('dashboard.Saved'),
            'ok',
        ));
    }
}
