<?php

namespace App\Ai\Support;

/**
 * Helpers for incomplete JSON tool-argument streams (OpenAI / Anthropic input_json_delta).
 */
final class PartialJson
{
    /**
     * @return array<string, mixed>|null
     */
    public static function tryDecode(string $json): ?array
    {
        $trimmed = trim($json);
        if ($trimmed === '') {
            return null;
        }

        $decoded = json_decode($trimmed, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Recover a write_file payload when the model (or max_tokens) cut the
     * JSON mid-string. tryDecode stays strict so streamers can tell "still
     * arriving" from "this block is finished but truncated".
     *
     * @return array<string, mixed>|null
     */
    public static function tryDecodeLenient(string $json): ?array
    {
        $strict = self::tryDecode($json);
        if ($strict !== null) {
            return $strict;
        }

        $repaired = self::repairTruncatedJson($json);
        if ($repaired === null) {
            return null;
        }

        return self::tryDecode($repaired);
    }

    /**
     * Close an object/array/string the stream dropped at EOF. Never invents keys.
     */
    public static function repairTruncatedJson(string $json): ?string
    {
        $raw = trim($json);
        if ($raw === '' || ($raw[0] !== '{' && $raw[0] !== '[')) {
            return null;
        }

        $inString = false;
        $escape = false;
        $stack = [];
        $length = strlen($raw);

        for ($i = 0; $i < $length; $i++) {
            $char = $raw[$i];
            if ($inString) {
                if ($escape) {
                    $escape = false;
                    continue;
                }
                if ($char === '\\') {
                    $escape = true;
                    continue;
                }
                if ($char === '"') {
                    $inString = false;
                }
                continue;
            }
            if ($char === '"') {
                $inString = true;
                continue;
            }
            if ($char === '{') {
                $stack[] = '}';
                continue;
            }
            if ($char === '[') {
                $stack[] = ']';
                continue;
            }
            if ($char === '}' || $char === ']') {
                array_pop($stack);
            }
        }

        $out = $raw;
        if ($escape) {
            $out = substr($out, 0, -1);
        }
        if ($inString) {
            $out .= '"';
        }
        $out = rtrim($out);
        if (str_ends_with($out, ',')) {
            $out = substr($out, 0, -1);
        }
        while ($stack !== []) {
            $out .= array_pop($stack);
        }

        $decoded = json_decode($out, true);

        return is_array($decoded) ? $out : null;
    }

    public static function peekString(string $partial, string $key): ?string
    {
        $quoted = preg_quote($key, '/');
        if (! preg_match('/"'.$quoted.'"\s*:\s*"((?:\\\\.|[^"\\\\])*)"/u', $partial, $match)) {
            return null;
        }

        $decoded = json_decode('"'.$match[1].'"');

        return is_string($decoded) && $decoded !== '' ? $decoded : null;
    }

    /**
     * @return array<string, mixed>
     */
    public static function peekPaintArgs(string $partial): array
    {
        $args = [];
        foreach (['path', 'query', 'pattern'] as $key) {
            $value = self::peekString($partial, $key);
            if ($value !== null) {
                $args[$key] = $value;
            }
        }

        return $args;
    }

    /**
     * Keys safe to paint while this tool call is still streaming (path only).
     *
     * @param  array<string, mixed>  $decoded
     * @return array<string, mixed>
     */
    public static function startPaintArgs(array $decoded): array
    {
        return array_intersect_key($decoded, array_flip(['path', 'query', 'pattern']));
    }

    /**
     * Keys to paint when the call's JSON is complete.
     *
     * write_file includes `content` so the Lab client can settle a Wrote card
     * with +/- / diff as soon as this file finishes — not after the whole batch.
     *
     * @param  array<string, mixed>  $decoded
     * @return array<string, mixed>
     */
    public static function endPaintArgs(string $toolName, array $decoded): array
    {
        $paint = self::startPaintArgs($decoded);
        if ($toolName === 'write_file' && isset($decoded['content']) && is_string($decoded['content'])) {
            $paint['content'] = $decoded['content'];
        }

        return $paint;
    }
}
