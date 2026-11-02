<?php

namespace App\Ai\Support;

/**
 * Normalize provider usage blobs into a stable Lab shape.
 *
 * @phpstan-type UsageShape array{
 *   input_tokens: int,
 *   output_tokens: int,
 *   cached_tokens: int,
 *   cache_creation_tokens: int,
 *   raw: array<string, mixed>|null
 * }
 */
final class UsageNormalizer
{
    /**
     * @param  array<string, mixed>|null  $raw
     * @return UsageShape
     */
    public static function normalize(mixed $raw): array
    {
        if (! is_array($raw)) {
            return self::empty();
        }

        $input = self::int($raw, [
            'input_tokens',
            'prompt_tokens',
            'promptTokenCount',
            'inputTokenCount',
        ]);

        $output = self::int($raw, [
            'output_tokens',
            'completion_tokens',
            'candidatesTokenCount',
            'outputTokenCount',
        ]);

        // Anthropic cache read / OpenAI prompt_tokens_details / Gemini cachedContentTokenCount
        $cached = self::int($raw, [
            'cache_read_input_tokens',
            'cached_tokens',
            'cachedContentTokenCount',
        ]);
        if ($cached === 0 && is_array($raw['prompt_tokens_details'] ?? null)) {
            $cached = self::int($raw['prompt_tokens_details'], ['cached_tokens']);
        }
        if ($cached === 0 && is_array($raw['input_tokens_details'] ?? null)) {
            $cached = self::int($raw['input_tokens_details'], ['cached_tokens', 'cache_read_input_tokens']);
        }

        $cacheCreation = self::int($raw, [
            'cache_creation_input_tokens',
            'cache_creation_tokens',
        ]);

        return [
            'input_tokens' => $input,
            'output_tokens' => $output,
            'cached_tokens' => $cached,
            'cache_creation_tokens' => $cacheCreation,
            'raw' => $raw,
        ];
    }

    /**
     * @return UsageShape
     */
    public static function empty(): array
    {
        return [
            'input_tokens' => 0,
            'output_tokens' => 0,
            'cached_tokens' => 0,
            'cache_creation_tokens' => 0,
            'raw' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  list<string>  $keys
     */
    private static function int(array $row, array $keys): int
    {
        foreach ($keys as $key) {
            if (! array_key_exists($key, $row)) {
                continue;
            }
            $value = $row[$key];
            if (is_numeric($value)) {
                return max(0, (int) $value);
            }
        }

        return 0;
    }
}
