<?php

namespace Database\Seeders;

use App\Entitlement\PlanAssigner;
use App\Enums\UserStatus;
use App\Models\AccessRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AccessControlSeeder::class,
            EntitlementSeeder::class,
            LanguageSeeder::class,
        ]);

        $this->ensureOwner('admin@deep42.co', 'Admin', 'admin');
    }

    private function ensureOwner(string $email, string $name, string $username): User
    {
        $role = AccessRole::query()->where('slug', 'owner')->firstOrFail();
        $user = User::query()->firstOrNew(['email' => $email]);
        $creating = ! $user->exists;

        if (blank($user->public_id)) {
            $user->public_id = (string) Str::ulid();
        }

        $usernameTaken = User::query()
            ->where('username', $username)
            ->when($user->exists, fn ($query) => $query->whereKeyNot($user->id))
            ->exists();

        $user->fill([
            'name' => $name,
            'username' => $usernameTaken ? Str::slug($username.'-owner') : $username,
            'access_role_id' => $role->id,
            'status' => UserStatus::Active,
            'email_verified_at' => $user->email_verified_at ?? now(),
        ]);

        if ($creating || blank($user->getRawOriginal('password'))) {
            $user->password = '12345678';
        }

        $user->save();

        app(PlanAssigner::class)->assignBySlug($user->fresh(), 'agency');

        return $user->fresh();
    }
}
