<?php

namespace App\Support;

use InvalidArgumentException;
use RuntimeException;

/**
 * Deterministic UUIDv4 generator with checksum: hex-nibble sum % 42 === 0.
 *
 * - RFC 4122 version nibble is always 4
 * - RFC 4122 variant nibble is always 8|9|a|b
 * - No retry / brute-force loop: free trailing nibbles are solved in one pass
 *
 * Hex mapping: 0-9 → 0-9, a-f → 10-15. Hyphens are ignored.
 */
final class ConstrainedUuid
{
    /**
     * Produce a valid UUIDv4 string (8-4-4-4-12) whose hex-digit sum is divisible by 42.
     */
    public static function v4(): string
    {
        $bytes = random_bytes(16);

        // Version 4: high nibble of time_hi_and_version = 0b0100
        $bytes[6] = chr((ord($bytes[6]) & 0x0F) | 0x40);
        // Variant 1 (RFC 4122): top two bits of clock_seq_hi_and_reserved = 0b10
        $bytes[8] = chr((ord($bytes[8]) & 0x3F) | 0x80);

        $nibbles = str_split(bin2hex($bytes));

        // Indices 12 (version) and 16 (variant) stay untouched.
        // Solve the last three node nibbles so total sum % 42 === 0.
        $base = 0;
        for ($i = 0; $i < 29; $i++) {
            $base += self::nibbleValue($nibbles[$i]);
        }

        [$a, $b, $c] = self::solveTrailingNibbles($base);
        $nibbles[29] = dechex($a);
        $nibbles[30] = dechex($b);
        $nibbles[31] = dechex($c);

        $uuid = self::format($nibbles);

        if (! self::isValidUuidV4($uuid) || ! self::satisfiesConstraint($uuid)) {
            throw new RuntimeException('Deterministic UUIDv4 checksum construction failed.');
        }

        return $uuid;
    }

    public static function satisfiesConstraint(string $uuid): bool
    {
        return self::hexSum($uuid) % 42 === 0;
    }

    public static function hexSum(string $uuid): int
    {
        $sum = 0;

        foreach (self::nibbleMap($uuid) as $nibble) {
            $sum += $nibble['value'];
        }

        return $sum;
    }

    /**
     * Ordered hex-char → value pairs for the 32 nibbles (hyphens stripped).
     *
     * @return list<array{char: string, value: int}>
     */
    public static function nibbleMap(string $uuid): array
    {
        $hex = strtolower(str_replace('-', '', $uuid));

        if (strlen($hex) !== 32 || ! ctype_xdigit($hex)) {
            throw new InvalidArgumentException('Expected a 32-character hexadecimal UUID payload.');
        }

        $map = [];

        for ($i = 0; $i < 32; $i++) {
            $char = $hex[$i];
            $map[] = [
                'char' => $char,
                'value' => self::nibbleValue($char),
            ];
        }

        return $map;
    }

    public static function isValidUuidV4(string $uuid): bool
    {
        return (bool) preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
            strtolower($uuid),
        );
    }

    /**
     * Find a,b,c ∈ [0,15] such that (base + a + b + c) % 42 === 0.
     * Three free nibbles cover every residue mod 42 (range 0..45).
     *
     * @return array{0: int, 1: int, 2: int}
     */
    private static function solveTrailingNibbles(int $base): array
    {
        $need = (42 - ($base % 42)) % 42;

        // need ∈ [0,41] always fits in three nibbles (max 45).
        $remaining = $need;
        $a = min(15, $remaining);
        $remaining -= $a;
        $b = min(15, $remaining);
        $remaining -= $b;
        $c = $remaining;

        if ($c < 0 || $c > 15 || ($base + $a + $b + $c) % 42 !== 0) {
            throw new RuntimeException('Unable to solve UUIDv4 checksum nibbles.');
        }

        return [$a, $b, $c];
    }

    private static function nibbleValue(string $char): int
    {
        return hexdec($char);
    }

    /**
     * @param  list<string>  $nibbles
     */
    private static function format(array $nibbles): string
    {
        $hex = implode('', $nibbles);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12),
        );
    }
}
