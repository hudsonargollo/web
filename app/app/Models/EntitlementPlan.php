<?php

namespace App\Models;

use App\Casts\MoneyDecimal;
use Cknow\Money\Money;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property Money|null $price_monthly
 * @property Money|null $price_yearly
 */
#[Fillable([
    'public_id',
    'slug',
    'title',
    'summary',
    'rank',
    'price_monthly',
    'price_yearly',
    'is_default',
    'is_active',
])]
class EntitlementPlan extends Model
{
    protected static function booted(): void
    {
        static::creating(function (EntitlementPlan $plan): void {
            if (blank($plan->public_id)) {
                $plan->public_id = (string) Str::ulid();
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
            'rank' => 'integer',
            'price_monthly' => MoneyDecimal::class,
            'price_yearly' => MoneyDecimal::class,
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function priceLine(): string
    {
        $monthly = $this->formatPrice('monthly');
        $yearly = $this->formatPrice('yearly');

        if ($monthly === '—' && $yearly === '—') {
            return '—';
        }

        return $monthly.' · '.$yearly;
    }

    public function formatPrice(string $interval = 'monthly'): string
    {
        $amount = $interval === 'yearly' ? $this->price_yearly : $this->price_monthly;

        if (! $amount instanceof Money) {
            return '—';
        }

        $suffix = $interval === 'yearly'
            ? __('dashboard./yr')
            : __('dashboard./mo');

        if ($amount->isZero() || $amount->isNegative()) {
            return $amount->format();
        }

        return $amount->format().$suffix;
    }

    public function grants(): HasMany
    {
        return $this->hasMany(PlanGrant::class);
    }

    public function entitlements(): HasMany
    {
        return $this->hasMany(UserEntitlement::class);
    }

    public function isLocked(): bool
    {
        return ! $this->is_active;
    }

    public function isBuiltIn(): bool
    {
        return in_array($this->slug, ['free', 'pro', 'agency'], true);
    }

    public function grantFor(string $code): ?PlanGrant
    {
        if ($this->relationLoaded('grants')) {
            return $this->grants->first(fn (PlanGrant $grant) => $grant->code === $code);
        }

        return $this->grants()->where('code', $code)->first();
    }

    /**
     * @return Collection<int, EntitlementPlan>
     */
    public static function assignable(?string $includePublicId = null): Collection
    {
        return static::query()
            ->where(function (Builder $query) use ($includePublicId): void {
                $query->where('is_active', true);

                if (filled($includePublicId)) {
                    $query->orWhere('public_id', $includePublicId);
                }
            })
            ->orderBy('rank')
            ->get();
    }
}
