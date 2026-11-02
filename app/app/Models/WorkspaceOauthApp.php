<?php

namespace App\Models;

use App\Models\Concerns\IgnoresUnreadableCipher;
use Illuminate\Database\Eloquent\Model;

class WorkspaceOauthApp extends Model
{
    use IgnoresUnreadableCipher;

    protected $fillable = [
        'driver',
        'client_id',
        'client_secret',
        'enabled',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'client_secret' => 'encrypted',
            'enabled' => 'boolean',
            'settings' => 'array',
        ];
    }
}
