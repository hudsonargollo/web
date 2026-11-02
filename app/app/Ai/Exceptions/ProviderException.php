<?php

namespace App\Ai\Exceptions;

final class ProviderException extends AiException
{
    public function __construct(
        string $message,
        public readonly string $provider,
        public readonly ?int $status = null,
        public readonly mixed $body = null,
    ) {
        parent::__construct($message);
    }

    public static function missingKey(string $provider): self
    {
        return new self("API key is not configured for provider [{$provider}].", $provider);
    }

    public static function unreachable(string $provider, string $detail = ''): self
    {
        $suffix = $detail !== '' ? " {$detail}" : '';

        return new self(
            "Could not reach provider [{$provider}].{$suffix} Check network/DNS (WSL) and that no broken HTTP_PROXY is set.",
            $provider,
            503,
        );
    }

    public static function http(string $provider, int $status, string $body): self
    {
        $detail = self::summarizeBody($body);
        $hint = match (true) {
            $status === 429 => ' Rate limit / quota exceeded — wait, switch model, or check billing.',
            $status === 401, $status === 403 => ' Check the API key for this provider.',
            $status === 404 => ' Model id may be retired or wrong — pick another model in Lab / AI settings.',
            default => '',
        };

        return new self(
            "Provider [{$provider}] returned HTTP {$status}.{$hint}".($detail !== '' ? " {$detail}" : ''),
            $provider,
            $status,
            $body,
        );
    }

    private static function summarizeBody(string $body): string
    {
        $trimmed = trim($body);
        if ($trimmed === '') {
            return '';
        }

        $decoded = json_decode($trimmed, true);
        if (is_array($decoded)) {
            $message = data_get($decoded, 'error.message')
                ?? data_get($decoded, 'message')
                ?? data_get($decoded, 'error.status');
            if (is_string($message) && $message !== '') {
                return '('.mb_substr($message, 0, 180).')';
            }
        }

        return '('.mb_substr(preg_replace('/\s+/', ' ', $trimmed) ?? '', 0, 120).')';
    }
}
