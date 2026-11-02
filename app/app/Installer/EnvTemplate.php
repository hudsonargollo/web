<?php

namespace App\Installer;

/**
 * Seeds and completes .env from .env.example without replacing values
 * the installer (or the buyer) already wrote.
 */
final class EnvTemplate
{
    public static function mergeMissing(?string $envPath = null, ?string $examplePath = null): void
    {
        $envPath ??= base_path('.env');
        $examplePath ??= base_path('.env.example');

        if (! is_file($examplePath)) {
            return;
        }

        if (! is_file($envPath)) {
            @copy($examplePath, $envPath);

            return;
        }

        $existing = @file_get_contents($envPath);
        if ($existing === false) {
            return;
        }

        $present = self::keys($existing);
        $append = [];

        foreach (self::assignmentLines((string) file_get_contents($examplePath)) as $line) {
            $key = self::assignmentKey($line);
            if ($key === null || isset($present[$key])) {
                continue;
            }

            $append[] = $line;
            $present[$key] = true;
        }

        if ($append === []) {
            return;
        }

        $content = rtrim($existing, "\r\n")."\n\n".implode("\n", $append)."\n";
        @file_put_contents($envPath, $content);
    }

    /**
     * @return array<string, true>
     */
    private static function keys(string $content): array
    {
        $keys = [];

        foreach (preg_split("/\R/", $content) ?: [] as $line) {
            $key = self::assignmentKey($line);
            if ($key !== null) {
                $keys[$key] = true;
            }
        }

        return $keys;
    }

    /**
     * @return list<string>
     */
    private static function assignmentLines(string $content): array
    {
        $lines = [];

        foreach (preg_split("/\R/", $content) ?: [] as $line) {
            if (self::assignmentKey($line) !== null) {
                $lines[] = rtrim($line, "\r\n");
            }
        }

        return $lines;
    }

    private static function assignmentKey(string $line): ?string
    {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            return null;
        }

        if (str_starts_with($line, 'export ')) {
            $line = trim(substr($line, 7));
        }

        if (preg_match('/^([A-Z_][A-Z0-9_]*)=/', $line, $matches) !== 1) {
            return null;
        }

        return $matches[1];
    }
}
