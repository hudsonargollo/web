<?php

namespace App\Models\Concerns;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Log;

/**
 * Encrypted attributes stored under a previous APP_KEY must not 500 the app.
 * Treat them as empty so the secret can be pasted again.
 */
trait IgnoresUnreadableCipher
{
    /** @var array<string, true> */
    private static array $unreadableCipherNotices = [];

    public function fromEncryptedString($value)
    {
        try {
            return parent::fromEncryptedString($value);
        } catch (DecryptException) {
            $this->noticeUnreadableCipher();

            return null;
        }
    }

    public function cipherIsUnreadable(string $attribute): bool
    {
        $raw = $this->getRawOriginal($attribute);

        if (! is_string($raw) || $raw === '') {
            return false;
        }

        return $this->fromEncryptedString($raw) === null;
    }

    private function noticeUnreadableCipher(): void
    {
        $key = static::class.'#'.(string) $this->getKey();
        if (isset(self::$unreadableCipherNotices[$key])) {
            return;
        }

        self::$unreadableCipherNotices[$key] = true;

        Log::warning('Workspace secret could not be decrypted. Re-enter it, or set APP_PREVIOUS_KEYS to the previous APP_KEY.', [
            'model' => static::class,
            'id' => $this->getKey(),
        ]);
    }
}
