<?php

namespace App\Models;

use App\Entitlement\GrantKind;
use App\Entitlement\UsageWindow;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'entitlement_plan_id',
    'code',
    'kind',
    'allowed',
    'ceiling',
    'window',
])]
class PlanGrant extends Model
{
    protected function casts(): array
    {
        return [
            'kind' => GrantKind::class,
            'window' => UsageWindow::class,
            'allowed' => 'boolean',
            'ceiling' => 'integer',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(EntitlementPlan::class, 'entitlement_plan_id');
    }

    public function isUnlimited(): bool
    {
        return $this->kind === GrantKind::Quota && $this->ceiling === null;
    }
}
