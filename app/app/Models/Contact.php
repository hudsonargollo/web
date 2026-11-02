<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable([
    'public_id',
    'user_id',
    'entitlement_plan_id',
    'name',
    'email',
    'body',
    'ip',
    'read_at',
    'reply_body',
    'replied_at',
    'replied_by',
])]
class Contact extends Model
{
    protected static function booted(): void
    {
        static::creating(function (Contact $row): void {
            if (blank($row->public_id)) {
                $row->public_id = (string) Str::ulid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(EntitlementPlan::class, 'entitlement_plan_id');
    }

    public function repliedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'replied_by');
    }

    public function isUnread(): bool
    {
        return $this->read_at === null && $this->replied_at === null;
    }

    public function isReplied(): bool
    {
        return $this->replied_at !== null;
    }

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'replied_at' => 'datetime',
        ];
    }
}
