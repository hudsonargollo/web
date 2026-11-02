<?php

namespace App\Models;

use App\Models\Concerns\IgnoresUnreadableCipher;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'driver',
    'enabled',
    'mode',
    'public_key',
    'secret_key',
    'webhook_secret',
    'settings',
])]
#[Hidden(['secret_key', 'webhook_secret'])]
class PaymentGateway extends Model
{
    use IgnoresUnreadableCipher;

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'public_key' => 'encrypted',
            'secret_key' => 'encrypted',
            'webhook_secret' => 'encrypted',
            'settings' => 'array',
        ];
    }

    public function isLive(): bool
    {
        return $this->mode === 'live';
    }
}
