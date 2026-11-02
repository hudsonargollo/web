<?php

namespace App\Models;

use App\Finance\BillingInterval;
use App\Finance\SubscriptionStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'public_id',
    'user_id',
    'entitlement_plan_id',
    'status',
    'driver',
    'provider_subscription_id',
    'interval',
    'started_at',
    'ends_at',
    'last_paid_at',
])]
class UserEntitlement extends Model
{
    protected static function booted(): void
    {
        static::creating(function (UserEntitlement $entitlement): void {
            if (blank($entitlement->public_id)) {
                $entitlement->public_id = (string) Str::ulid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'interval' => BillingInterval::class,
            'started_at' => 'datetime',
            'ends_at' => 'datetime',
            'last_paid_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(EntitlementPlan::class, 'entitlement_plan_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'user_entitlement_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(PaymentWebhookEvent::class, 'user_entitlement_id');
    }

    public function isActive(): bool
    {
        if ($this->status !== SubscriptionStatus::Active) {
            return false;
        }

        if ($this->ends_at !== null && $this->ends_at->isPast()) {
            return false;
        }

        return true;
    }
}
