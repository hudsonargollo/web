<?php

namespace App\Livewire\Dashboard\Profile\Options;

use App\Livewire\Dashboard\Profile\Traits\HasProfileChrome;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class PasswordComponent extends Component
{
    use HasProfileChrome;

    public string $current_password = '';

    public string $password = '';

    public string $password_confirmation = '';

    protected function profileSection(): string
    {
        return 'password';
    }

    public function mount(): void
    {
        $this->authorizeProfile();
    }

    public function save(): void
    {
        $this->authorizeProfile();

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
        return view('livewire.dashboard.profile.options.password', [
            'section' => $this->profileSection(),
            'nav' => $this->profileNav(),
        ])->layoutData($this->layoutData());
    }
}
