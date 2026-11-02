<?php

namespace App\Models;

use App\Models\Concerns\IgnoresUnreadableCipher;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDatastoreLink extends Model
{
    use IgnoresUnreadableCipher;

    public const DRIVER_SUPABASE = 'supabase';

    protected $fillable = [
        'user_id',
        'driver',
        'external_id',
        'login',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'host_url',
        'publishable_token',
        'steward_token',
        'project_ref',
        'project_name',
        'organization_id',
        'settings',
        'linked_at',
    ];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'publishable_token' => 'encrypted',
            'steward_token' => 'encrypted',
            'token_expires_at' => 'datetime',
            'linked_at' => 'datetime',
            'settings' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
