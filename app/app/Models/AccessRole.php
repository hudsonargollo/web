<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccessRole extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'summary',
        'locked',
    ];

    protected function casts(): array
    {
        return [
            'locked' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function abilities(): BelongsToMany
    {
        return $this->belongsToMany(
            AccessAbility::class,
            'access_role_ability',
            'access_role_id',
            'access_ability_id'
        );
    }

    public function holders(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function admits(string $abilityCode): bool
    {
        if ($this->locked && $this->slug === 'owner') {
            return true;
        }

        return $this->relationLoaded('abilities')
            ? $this->abilities->contains(fn (AccessAbility $ability) => $ability->code === $abilityCode)
            : $this->abilities()->where('code', $abilityCode)->exists();
    }
}
