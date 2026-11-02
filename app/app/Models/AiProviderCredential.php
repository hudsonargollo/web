<?php

namespace App\Models;

use App\Models\Concerns\IgnoresUnreadableCipher;
use Illuminate\Database\Eloquent\Model;

class AiProviderCredential extends Model
{
    use IgnoresUnreadableCipher;

    protected $fillable = [
        'provider',
        'application_id',
        'api_key',
        'api_secret',
        'enabled',
    ];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'api_secret' => 'encrypted',
            'enabled' => 'boolean',
        ];
    }
}
