<?php

namespace App\Models;

use App\Models\Concerns\IgnoresUnreadableCipher;
use Illuminate\Database\Eloquent\Model;

class WorkspaceDatastore extends Model
{
    use IgnoresUnreadableCipher;

    protected $fillable = [
        'kind',
        'host_url',
        'publishable_token',
        'steward_token',
        'console_token',
        'enabled',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'publishable_token' => 'encrypted',
            'steward_token' => 'encrypted',
            'console_token' => 'encrypted',
            'enabled' => 'boolean',
            'settings' => 'array',
        ];
    }
}
