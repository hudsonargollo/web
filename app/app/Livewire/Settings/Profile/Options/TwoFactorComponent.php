<?php

namespace App\Livewire\Settings\Profile\Options;

use App\Livewire\Settings\Traits\HasAccountChrome;
use App\Services\TotpService;
use App\Support\Seo\PageSeo;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Hash;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class TwoFactorComponent extends Component
{
    use HasAccountChrome;

    public string $password = '';

    public string $code = '';

    public string $disablePassword = '';

    public string $regeneratePassword = '';

    /**
     * @var list<string>
     */
    public array $recoveryCodes = [];

    protected function deskSection(): string
    {
        return 'two-factor';
    }

    public function mount(PageSeo $seo): void
    {
        $this->authorizeDesk();
        $this->hydrateDeskSeo($seo);

        $codes = session('two_factor.recovery_codes');
        $this->recoveryCodes = is_array($codes) ? array_values($codes) : [];
    }

    public function enable(TotpService $totp): void
    {
        $this->authorizeDesk();
        $this->validate([
            'password' => ['required', 'string'],
        ]);

        $user = auth()->user();

        if (! Hash::check($this->password, $user->password)) {
            $this->addError('password', __('dashboard.The provided password is incorrect.'));

            return;
        }

        if ($user->hasTwoFactorEnabled()) {
            return;
        }

        $secret = $totp->generateSecret();
        session()->put('two_factor.secret', $secret);

        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
            'two_factor_last_timestep' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        $this->reset('password');
        $this->pulseOk(__('dashboard.Scan the secret, then confirm with a code.'));
    }

    public function confirmSetup(TotpService $totp): void
    {
        $this->authorizeDesk();
        $this->validate([
            'code' => ['required', 'string'],
        ]);

        $user = auth()->user();
        $secret = $this->pendingSecret();
        $timestep = filled($secret)
            ? $totp->matchingTimestep($secret, $this->code)
            : null;

        if ($timestep === null) {
            $this->addError('code', __('dashboard.The provided two factor authentication code was invalid.'));

            return;
        }

        $recoveryCodes = $totp->generateRecoveryCodes();
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_last_timestep' => $timestep,
        ])->save();
        $user->replaceRecoveryCodes($recoveryCodes);

        session()->forget('two_factor.secret');
        $this->recoveryCodes = $recoveryCodes;
        $this->reset('code');
        $this->pulseOk(__('dashboard.Two-factor authentication confirmed.'));
    }

    public function askDisable(): void
    {
        $this->authorizeDesk();
        $this->validate([
            'disablePassword' => ['required', 'string'],
        ]);

        if (! Hash::check($this->disablePassword, auth()->user()->password)) {
            $this->addError('disablePassword', __('dashboard.The provided password is incorrect.'));

            return;
        }

        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'disable-two-factor' }))");
    }

    public function confirmPending(): void
    {
        $this->authorizeDesk();
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'disable-two-factor' }))");

        if (! Hash::check($this->disablePassword, auth()->user()->password)) {
            $this->addError('disablePassword', __('dashboard.The provided password is incorrect.'));

            return;
        }

        auth()->user()->clearTwoFactorAuthentication();
        session()->forget(['two_factor.secret', 'two_factor.recovery_codes']);
        $this->recoveryCodes = [];
        $this->reset('disablePassword', 'regeneratePassword', 'code', 'password');
        $this->pulseOk(__('dashboard.Two-factor authentication disabled.'));
    }

    public function regenerate(TotpService $totp): void
    {
        $this->authorizeDesk();
        $this->validate([
            'regeneratePassword' => ['required', 'string'],
        ]);

        $user = auth()->user();

        if (! Hash::check($this->regeneratePassword, $user->password)) {
            $this->addError('regeneratePassword', __('dashboard.The provided password is incorrect.'));

            return;
        }

        if (! $user->hasTwoFactorEnabled()) {
            return;
        }

        $recoveryCodes = $totp->generateRecoveryCodes();
        $user->replaceRecoveryCodes($recoveryCodes);
        $this->recoveryCodes = $recoveryCodes;
        $this->reset('regeneratePassword');
        $this->pulseOk(__('dashboard.New recovery codes generated.'));
    }

    public function render(TotpService $totp): View
    {
        $user = auth()->user();
        $pendingSecret = $this->pendingSecret();
        $provisioningUri = $pendingSecret
            ? $totp->provisioningUri($pendingSecret, $user->email, config('app.name'))
            : null;

        return view('livewire.settings.profile.options.twoFactor', [
            'section' => $this->deskSection(),
            'nav' => $this->profileTabs(),
            'enabled' => $user->hasTwoFactorEnabled(),
            'pendingSecret' => $pendingSecret,
            'qrCodeSvg' => $provisioningUri ? $totp->qrCodeSvg($provisioningUri) : null,
        ]);
    }

    private function pendingSecret(): ?string
    {
        $user = auth()->user();
        $sessionSecret = session('two_factor.secret');

        if (filled($sessionSecret)) {
            return $sessionSecret;
        }

        if ($user->hasPendingTwoFactorSetup()) {
            session()->put('two_factor.secret', $user->two_factor_secret);

            return $user->two_factor_secret;
        }

        return null;
    }
}
