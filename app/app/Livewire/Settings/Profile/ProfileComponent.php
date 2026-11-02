<?php

namespace App\Livewire\Settings\Profile;

use App\Livewire\Settings\Traits\HasAccountChrome;
use App\Models\User;
use App\Support\Geography\Countries;
use App\Support\Seo\PageSeo;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;

#[Layout('components.layouts.app')]
class ProfileComponent extends Component
{
    use HasAccountChrome;
    use WithFileUploads;

    public string $username = '';

    public string $email = '';

    public string $phone = '';

    public string $country = '';

    public ?TemporaryUploadedFile $avatar = null;

    public ?string $avatarPreviewUrl = null;

    public bool $removeAvatar = false;

    protected function deskSection(): string
    {
        return 'profile';
    }

    public function mount(PageSeo $seo): void
    {
        $this->authorizeDesk();
        $this->hydrateDeskSeo($seo);
        $this->fillFromUser(auth()->user());
    }

    public function clearAvatar(): void
    {
        $this->reset('avatar');

        if (filled($this->avatarPreviewUrl)) {
            $this->removeAvatar = true;
        }
    }

    public function updatedAvatar(): void
    {
        $this->removeAvatar = false;
    }

    public function save(): void
    {
        $this->authorizeDesk();

        $user = auth()->user();
        $validated = $this->validate($this->rules($user));
        $emailChanged = $user->email !== $validated['email'];

        $payload = [
            'username' => $validated['username'],
            'name' => $validated['username'],
            'email' => $validated['email'],
            'phone' => filled($validated['phone'] ?? null) ? $validated['phone'] : null,
            'country' => filled($validated['country'] ?? null) ? strtoupper($validated['country']) : null,
        ];

        if ($this->removeAvatar && $user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $payload['avatar_path'] = null;
        }

        if ($this->avatar instanceof TemporaryUploadedFile) {
            if ($user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }

            $payload['avatar_path'] = $this->avatar->store('avatars', 'public');
        }

        if ($emailChanged) {
            $payload['email_verified_at'] = null;
        }

        $user->forceFill($payload)->save();

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }

        $this->fillFromUser($user->fresh());
        $this->pulseOk(__('dashboard.Profile saved.'));
    }

    public function render(): View
    {
        return view('livewire.settings.profile.profile', [
            'section' => $this->deskSection(),
            'nav' => $this->profileTabs(),
            'countries' => Countries::options(),
            'roleTitle' => auth()->user()?->accessRole?->title ?: __('dashboard.Member'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(User $user): array
    {
        return [
            'username' => [
                'required',
                'string',
                'max:60',
                'alpha_dash',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:32'],
            'country' => array_values(array_filter([
                'nullable',
                'string',
                filled($this->country) ? 'size:2' : null,
                filled($this->country) ? Rule::in(Countries::codes()) : null,
            ])),
            'avatar' => ['nullable', 'image', 'max:2048'],
            'removeAvatar' => ['boolean'],
        ];
    }

    private function fillFromUser(User $user): void
    {
        $this->username = (string) ($user->username ?: '');
        $this->email = (string) $user->email;
        $this->phone = (string) ($user->phone ?: '');
        $this->country = (string) ($user->country ?: '');
        $this->avatar = null;
        $this->removeAvatar = false;
        $this->avatarPreviewUrl = $user->avatarUrl();
    }
}
