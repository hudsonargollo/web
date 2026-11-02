<?php

namespace App\Support;

use Illuminate\Support\Facades\Crypt;
use JsonException;
use Throwable;

final class OpaqueEmailToken
{
    /**
     * @param  array{id: int|string, email: string}  $payload
     */
    public static function seal(array $payload): string
    {
        $encrypted = Crypt::encryptString(json_encode($payload, JSON_THROW_ON_ERROR));

        return rtrim(strtr(base64_encode($encrypted), '+/', '-_'), '=');
    }

    /**
     * @return array{id: int|string, email: string}
     */
    public static function open(string $token): array
    {
        try {
            $encrypted = base64_decode(strtr($token, '-_', '+/'), true);

            if ($encrypted === false) {
                throw new JsonException('Invalid token encoding.');
            }

            $payload = json_decode(Crypt::decryptString($encrypted), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $exception) {
            throw $exception;
        }

        if (! is_array($payload) || ! isset($payload['id'], $payload['email'])) {
            throw new JsonException('Invalid token payload.');
        }

        return $payload;
    }
}
