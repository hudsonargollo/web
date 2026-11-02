<?php

namespace App\Livewire\Dashboard\Users\Traits;

use App\Entitlement\PlanAssigner;
use App\Enums\UserStatus;
use App\Models\AccessRole;
use App\Models\EntitlementPlan;
use App\Models\User;
use App\Support\Geography\Countries;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;

trait ManagesUserForm
{
    public string $username = '';

    public string $email = '';

    public string $phone = '';

    public string $country = '';

    public string $accessRoleId = '';

    public string $planPublicId = '';

    public string $status = UserStatus::Active->value;

    public string $password = '';

    public string $password_confirmation = '';

    public ?TemporaryUploadedFile $avatar = null;

    public ?string $avatarPreviewUrl = null;

    public bool $removeAvatar = false;

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

    /**
     * @return array<string, mixed>
     */
    protected function userRules(?User $user = null): array
    {
        $passwordRules = $user === null
            ? ['required', 'string', 'confirmed', Password::defaults()]
            : ['nullable', 'string', 'confirmed', Password::defaults()];

        return [
            'username' => [
                'required',
                'string',
                'max:60',
                'alpha_dash',
                Rule::unique('users', 'username')->ignore($user?->id),
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'phone' => ['nullable', 'string', 'max:32'],
            'country' => ['nullable', 'string', 'size:2', Rule::in(Countries::codes())],
            'accessRoleId' => ['required', 'integer', Rule::exists('access_roles', 'id')],
            'planPublicId' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (blank($value)) {
                        return;
                    }

                    $plan = EntitlementPlan::query()->where('public_id', $value)->first();

                    if ($plan === null) {
                        $fail(__('dashboard.Unknown pack.'));

                        return;
                    }

                    $currentId = isset($this->user) ? $this->user->entitlement?->entitlement_plan_id : null;

                    if ($plan->isLocked() && (int) $currentId !== (int) $plan->id) {
                        $fail(__('dashboard.This pack is locked.'));
                    }
                },
            ],
            'status' => ['required', 'string', Rule::in(UserStatus::values())],
            'password' => $passwordRules,
            'avatar' => ['nullable', 'image', 'max:2048'],
            'removeAvatar' => ['boolean'],
        ];
    }

    protected function fillFromUser(User $user): void
    {
        $user->loadMissing('entitlement.plan');
        app(PlanAssigner::class)->ensureDefault($user);
        $user->loadMissing('entitlement.plan');

        $this->username = (string) ($user->username ?: '');
        $this->email = (string) $user->email;
        $this->phone = (string) ($user->phone ?: '');
        $this->country = (string) ($user->country ?: '');
        $this->accessRoleId = $user->access_role_id !== null ? (string) $user->access_role_id : '';
        $this->planPublicId = (string) ($user->entitlement?->plan?->public_id ?: '');
        $this->status = $user->statusEnum()->value;
        $this->password = '';
        $this->password_confirmation = '';
        $this->avatar = null;
        $this->removeAvatar = false;
        $this->avatarPreviewUrl = $user->avatarUrl();
    }

    /**
     * @return array{username: string, email: string, phone: ?string, country: ?string, access_role_id: int, status: string, name: string, password?: string, avatar_path?: ?string}
     */
    protected function validatedUserPayload(?User $user = null): array
    {
        $validated = $this->validate($this->userRules($user));

        $payload = [
            'username' => $validated['username'],
            'name' => $validated['username'],
            'email' => $validated['email'],
            'phone' => filled($validated['phone'] ?? null) ? $validated['phone'] : null,
            'country' => filled($validated['country'] ?? null) ? strtoupper($validated['country']) : null,
            'access_role_id' => (int) $validated['accessRoleId'],
            'status' => $validated['status'],
        ];

        if (filled($validated['password'] ?? null)) {
            $payload['password'] = $validated['password'];
        }

        if ($this->removeAvatar && $user?->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $payload['avatar_path'] = null;
        }

        if ($this->avatar instanceof TemporaryUploadedFile) {
            if ($user?->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }

            $payload['avatar_path'] = $this->avatar->store('avatars', 'public');
        }

        return $payload;
    }

    protected function guardSoleOwnerDemotion(User $user, int $nextRoleId): void
    {
        $owner = AccessRole::query()->where('slug', 'owner')->first();

        if ($owner === null || $user->access_role_id !== $owner->id) {
            return;
        }

        if ($nextRoleId === $owner->id) {
            return;
        }

        $otherOwners = User::query()
            ->where('access_role_id', $owner->id)
            ->whereKeyNot($user->id)
            ->exists();

        if (! $otherOwners) {
            throw ValidationException::withMessages([
                'accessRoleId' => __('dashboard.Keep at least one owner on the workspace.'),
            ]);
        }
    }

    protected function persistPlan(User $user): void
    {
        if (blank($this->planPublicId)) {
            return;
        }

        app(PlanAssigner::class)->assignByPublicId($user, $this->planPublicId);
    }
}
