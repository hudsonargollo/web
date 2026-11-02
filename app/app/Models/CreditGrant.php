<?php

namespace App\Models;

use App\Finance\CreditKind;
use Database\Factories\CreditGrantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable([
    'public_id',
    'user_id',
    'amount',
    'kind',
    'reason',
    'granted_by',
    'entitlement_plan_id',
    'invoice_id',
])]
class CreditGrant extends Model
{
    /** @use HasFactory<CreditGrantFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (CreditGrant $grant): void {
            if (blank($grant->public_id)) {
                $grant->public_id = (string) Str::ulid();
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
            'kind' => CreditKind::class,
            'amount' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(EntitlementPlan::class, 'entitlement_plan_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
