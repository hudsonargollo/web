<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Machine client credential. Only the sha256 of the plaintext key is stored;
 * the key itself is shown once at issue time and never persisted or logged.
 */
final class ApiToken extends Model
{
    protected $fillable = ['name', 'token_hash', 'last_used_at'];

    protected function casts(): array
    {
        return ['last_used_at' => 'datetime'];
    }

    public static function findByKey(string $plaintext): ?self
    {
        if ($plaintext === '') {
            return null;
        }

        $hash = hash('sha256', $plaintext);
        $token = self::query()->where('token_hash', $hash)->first();

        return $token instanceof self && hash_equals($token->token_hash, $hash) ? $token : null;
    }

    public function markUsed(): void
    {
        $this->forceFill(['last_used_at' => now()])->saveQuietly();
    }
}
