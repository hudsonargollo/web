<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AccessAbility extends Model
{
    protected $fillable = [
        'code',
        'cluster',
        'title',
    ];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            AccessRole::class,
            'access_role_ability',
            'access_ability_id',
            'access_role_id'
        );
    }
}
