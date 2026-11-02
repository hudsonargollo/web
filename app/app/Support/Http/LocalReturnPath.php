<?php

namespace App\Support\Http;

final class LocalReturnPath
{
    public static function deskOrLab(?string $path, string $fallback = '/lab'): string
    {
        $path = trim((string) $path);

        if ($path === '' || str_contains($path, '://') || str_contains($path, "\n") || str_contains($path, "\r")) {
            return $fallback;
        }

        if (str_starts_with($path, '/lab') || str_starts_with($path, '/settings')) {
            return $path;
        }

        return $fallback;
    }
}
