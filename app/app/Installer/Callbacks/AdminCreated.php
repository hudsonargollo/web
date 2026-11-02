<?php

namespace App\Installer\Callbacks;

use App\Entitlement\PlanAssigner;
use App\Enums\UserStatus;
use App\Models\AccessRole;
use App\Models\User;
use Illuminate\Support\Str;

final class AdminCreated
{
    public function __invoke(User $user): void
    {
        $role = AccessRole::query()->where('slug', 'owner')->firstOrFail();
        $username = filled($user->username) ? (string) $user->username : $this->uniqueUsername($user);

        $user->forceFill([
            'username' => $username,
            'access_role_id' => $role->id,
            'status' => UserStatus::Active,
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        app(PlanAssigner::class)->assignBySlug($user->fresh(), 'agency');
    }

    private function uniqueUsername(User $user): string
    {
        $base = Str::slug((string) $user->name) ?: 'owner';
        $username = $base;
        $suffix = 1;

        while (User::query()
            ->where('username', $username)
            ->whereKeyNot($user->id)
            ->exists()
        ) {
            $username = $base.'-'.$suffix;
            $suffix++;
        }

        return $username;
    }
}
