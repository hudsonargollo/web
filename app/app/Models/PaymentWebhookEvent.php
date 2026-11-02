<?php

namespace App\Models;

use App\Finance\WebhookApplyStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable([
    'public_id',
    'driver',
    'event_type',
    'provider_event_id',
    'status',
    'attempts',
    'last_error',
    'invoice_id',
    'user_entitlement_id',
    'payload',
])]
class PaymentWebhookEvent extends Model
{
    protected static function booted(): void
    {
        static::creating(function (PaymentWebhookEvent $event): void {
            if (blank($event->public_id)) {
                $event->public_id = (string) Str::ulid();
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
            'payload' => 'array',
            'status' => WebhookApplyStatus::class,
            'attempts' => 'integer',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function entitlement(): BelongsTo
    {
        return $this->belongsTo(UserEntitlement::class, 'user_entitlement_id');
    }
}
