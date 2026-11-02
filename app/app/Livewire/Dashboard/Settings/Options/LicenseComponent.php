<?php

namespace App\Livewire\Dashboard\Settings\Options;

use App\Livewire\Dashboard\Settings\Traits\HasSettingsChrome;
use App\Permit\DeepthoughtClient;
use App\Permit\PermitLedger;
use App\Permit\PermitRejected;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class LicenseComponent extends Component
{
    use HasSettingsChrome;

    public string $token = '';

    public function mount(): void
    {
        $this->authorizeSettings();
    }

    public function bind(PermitLedger $ledger, DeepthoughtClient $desk): void
    {
        $this->authorizeSettings();

        $this->validate([
            'token' => ['required', 'string', 'max:255'],
        ]);

        try {
            $reply = $desk->attest($this->token, 'krikkit-settings');
        } catch (PermitRejected $exception) {
            $this->addError('token', $exception->getMessage());
            $this->pulseFail($exception->getMessage());

            return;
        }

        $ledger->rememberActive($this->token, $reply, $desk->boundHost());
        $this->token = '';
        $this->pulseOk(__('dashboard.License bound.'));
    }

    public function recheck(PermitLedger $ledger, DeepthoughtClient $desk): void
    {
        $this->authorizeSettings();

        $token = $ledger->reveal();
        if ($token === '') {
            $message = __('dashboard.Enter a license key first.');
            $this->addError('token', $message);
            $this->pulseFail($message);

            return;
        }

        try {
            $reply = $desk->attest($token, 'krikkit-settings');
        } catch (PermitRejected $exception) {
            $this->addError('token', $exception->getMessage());
            $this->pulseFail($exception->getMessage());

            return;
        }

        $ledger->rememberActive($token, $reply, $desk->boundHost());
        $this->pulseOk(__('dashboard.License check passed.'));
    }

    public function render(PermitLedger $ledger): View
    {
        $row = $ledger->snapshot();

        return view('livewire.dashboard.settings.options.license', [
            'section' => $this->settingsSection(),
            'nav' => $this->settingsNav(),
            'row' => $row,
            'canRecheck' => $row['tone'] === PermitLedger::ACTIVE && $row['secret'] !== '',
            'statusLabel' => match ($row['tone']) {
                PermitLedger::ACTIVE => __('dashboard.Active'),
                PermitLedger::DEFERRED => __('dashboard.Skipped'),
                default => __('dashboard.Not bound'),
            },
            'statusTone' => match ($row['tone']) {
                PermitLedger::ACTIVE => 'success',
                PermitLedger::DEFERRED => 'warning',
                default => 'info',
            },
        ])->layoutData($this->layoutData());
    }

    protected function settingsSection(): string
    {
        return 'license';
    }
}
