<?php

namespace App\Livewire\Settings\Profile\Options;

use App\Livewire\Settings\Traits\HasAccountChrome;
use App\Support\Seo\PageSeo;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class PasswordComponent extends Component
{
    use HasAccountChrome;

    public string $current_password = '';

    public string $password = '';

    public string $password_confirmation = '';

    protected function deskSection(): string
    {
        return 'password';
    }

    public function mount(PageSeo $seo): void
    {
        $this->authorizeDesk();
        $this->hydrateDeskSeo($seo);
    }

    public function save(): void
    {
        $this->authorizeDesk();

        $this->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = auth()->user();

        if (! Hash::check($this->current_password, $user->password)) {
            $this->addError('current_password', __('dashboard.The provided password does not match your current password.'));

            return;
        }

        $user->update([
            'password' => $this->password,
        ]);

        $this->reset('current_password', 'password', 'password_confirmation');
        $this->pulseOk(__('dashboard.Password updated.'));
    }

    public function render(): View
    {
        return view('livewire.settings.profile.options.password', [
            'section' => $this->deskSection(),
            'nav' => $this->profileTabs(),
        ]);
    }
}
