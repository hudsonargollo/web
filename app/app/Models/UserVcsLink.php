<?php

namespace App\Models;

use App\Models\Concerns\IgnoresUnreadableCipher;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserVcsLink extends Model
{
    use IgnoresUnreadableCipher;

    public const DRIVER_GITHUB = 'github';

    protected $fillable = [
        'user_id',
        'driver',
        'external_id',
        'login',
        'avatar_url',
        'access_token',
        'scopes',
        'linked_at',
    ];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'linked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
