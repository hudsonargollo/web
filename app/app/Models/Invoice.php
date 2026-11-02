<?php

namespace App\Models;

use App\Finance\InvoiceStatus;
use App\Finance\Money;
use Database\Factories\InvoiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'public_id',
    'user_id',
    'entitlement_plan_id',
    'user_entitlement_id',
    'driver',
    'provider_invoice_id',
    'provider_subscription_id',
    'amount',
    'currency',
    'status',
    'paid_at',
    'refunded_at',
    'refunded_by',
    'description',
])]
class Invoice extends Model
{
    /** @use HasFactory<InvoiceFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice): void {
            if (blank($invoice->public_id)) {
                $invoice->public_id = (string) Str::ulid();
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
            'status' => InvoiceStatus::class,
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
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

    public function entitlement(): BelongsTo
    {
        return $this->belongsTo(UserEntitlement::class, 'user_entitlement_id');
    }

    public function refundedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'refunded_by');
    }

    public function events(): HasMany
    {
        return $this->hasMany(PaymentWebhookEvent::class);
    }

    public function formattedAmount(): string
    {
        return Money::format($this->amount, (string) $this->currency);
    }

    public function canRefund(): bool
    {
        return $this->status === InvoiceStatus::Paid;
    }
}
