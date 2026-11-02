<?php

namespace App\Models;

use App\Entitlement\EntitlementGate;
use App\Entitlement\PlanAssigner;
use App\Enums\UserStatus;
use App\Notifications\ConfirmEmailAddress;
use Database\Factories\UserFactory;
use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

#[Fillable([
    'name',
    'username',
    'email',
    'phone',
    'country',
    'status',
    'avatar_path',
    'password',
    'access_role_id',
    'appearance',
    'preferences',
])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable implements MustVerifyEmailContract
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, MustVerifyEmail, Notifiable;

    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if (blank($user->public_id)) {
                $user->public_id = (string) Str::ulid();
            }
        });

        static::created(function (User $user): void {
            if (! Schema::hasTable('user_entitlements')) {
                return;
            }

            app(PlanAssigner::class)->ensureDefault($user);
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new ConfirmEmailAddress);
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'two_factor_last_timestep' => 'integer',
            'appearance' => 'array',
            'preferences' => 'array',
            'status' => UserStatus::class,
        ];
    }

    public function accessRole(): BelongsTo
    {
        return $this->belongsTo(AccessRole::class);
    }

    public function entitlement(): HasOne
    {
        return $this->hasOne(UserEntitlement::class);
    }

    public function labProjects(): HasMany
    {
        return $this->hasMany(LabProject::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function creditGrants(): HasMany
    {
        return $this->hasMany(CreditGrant::class);
    }

    public function entitled(string $code): bool
    {
        return app(EntitlementGate::class)->allows($this, $code);
    }

    public function statusEnum(): UserStatus
    {
        return $this->status instanceof UserStatus
            ? $this->status
            : UserStatus::tryFrom((string) $this->status) ?? UserStatus::Active;
    }

    public function avatarUrl(): ?string
    {
        if (blank($this->avatar_path)) {
            return null;
        }

        return Storage::disk('public')->url($this->avatar_path);
    }

    public function allows(string $abilityCode): bool
    {
        $role = $this->accessRole;

        if ($role === null) {
            return false;
        }

        return $role->admits($abilityCode);
    }

    public function isWorkspaceAdmin(): bool
    {
        if ($this->accessRole?->slug === 'owner') {
            return true;
        }

        return $this->allows('settings.revise') || $this->allows('users.browse');
    }

    public function hasTwoFactorEnabled(): bool
    {
        return filled($this->two_factor_secret) && $this->two_factor_confirmed_at !== null;
    }

    public function hasPendingTwoFactorSetup(): bool
    {
        return filled($this->two_factor_secret) && $this->two_factor_confirmed_at === null;
    }

    /**
     * @param  list<string>  $codes
     */
    public function replaceRecoveryCodes(array $codes): void
    {
        $this->forceFill([
            'two_factor_recovery_codes' => collect($codes)
                ->map(fn (string $code) => Hash::make($code))
                ->values()
                ->all(),
        ])->save();
    }

    public function consumeRecoveryCode(string $code): bool
    {
        $hashedCodes = $this->two_factor_recovery_codes ?? [];

        foreach ($hashedCodes as $index => $hashed) {
            if (Hash::check($code, $hashed)) {
                unset($hashedCodes[$index]);

                $this->forceFill([
                    'two_factor_recovery_codes' => array_values($hashedCodes),
                ])->save();

                return true;
            }
        }

        return false;
    }

    public function markTwoFactorTimestepUsed(int $timestep): void
    {
        $this->forceFill([
            'two_factor_last_timestep' => $timestep,
        ])->save();
    }

    public function clearTwoFactorAuthentication(): void
    {
        $this->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_timestep' => null,
        ])->save();
    }
}
