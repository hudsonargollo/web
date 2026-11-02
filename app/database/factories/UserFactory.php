<?php

namespace Database\Factories;

use App\Entitlement\PlanAssigner;
use App\Enums\UserStatus;
use App\Models\AccessRole;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'username' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'public_id' => (string) Str::ulid(),
            'status' => UserStatus::Active,
            'access_role_id' => fn () => $this->ensureMemberRoleId(),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
            'status' => UserStatus::Invited,
        ]);
    }

    public function owner(): static
    {
        return $this->state(fn (array $attributes) => [
            'access_role_id' => $this->ensureRoleId('owner'),
        ]);
    }

    public function member(): static
    {
        return $this->state(fn (array $attributes) => [
            'access_role_id' => $this->ensureMemberRoleId(),
        ]);
    }

    public function onPack(string $slug): static
    {
        return $this->afterCreating(function (User $user) use ($slug): void {
            app(PlanAssigner::class)->assignBySlug($user, $slug);
        });
    }

    public function withTwoFactor(string $secret = 'JBSWY3DPEHPK3PXP'): static
    {
        return $this->state(fn (array $attributes) => [
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [
                Hash::make('recovery-code-1'),
            ],
        ]);
    }

    private function ensureMemberRoleId(): ?int
    {
        return $this->ensureRoleId('member');
    }

    private function ensureRoleId(string $slug): ?int
    {
        if (! Schema::hasTable('access_roles')) {
            return null;
        }

        if (AccessRole::query()->where('slug', $slug)->doesntExist()) {
            (new AccessControlSeeder)->run();
        }

        return AccessRole::query()->where('slug', $slug)->value('id');
    }
}
