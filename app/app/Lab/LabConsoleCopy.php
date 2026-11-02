<?php

namespace App\Lab;

/**
 * Lab terminal status copy (autostart + fallback shell). Tokens: {name} {command} {code} {error}.
 */
final class LabConsoleCopy
{
    public const DEFAULT_NAME = 'DeepThought';

    /**
     * @return array<string, string>
     */
    public static function defaults(): array
    {
        return [
            'runtime_name' => self::DEFAULT_NAME,
            'waiting' => '{name} · waiting for package.json…',
            'no_package' => '{name} · no package.json — skip auto install/dev',
            'installing' => '{name} · installing dependencies (lazy)…',
            'ready' => '{name} · dependencies ready',
            'cache_hit' => '{name} · node_modules cache hit — skip install',
            'wasm_ready' => '{name} · native WASM compiler binaries ready',
            'no_script' => '{name} · no scripts.dev / scripts.start — idle',
            'auto_start' => '{name} · auto-start {command}…',
            'exited' => '{name} · {command} exited ({code})',
            'failed' => '{name} · autostart failed: {error}',
            'shell_unavailable' => '{name} shell unavailable — local console only.',
        ];
    }

    /**
     * Payload for #lab-config.console.
     *
     * @param  array<string, mixed>  $stored
     * @return array{name: string, slug: string, lines: array<string, string>}
     */
    public static function forLab(array $stored): array
    {
        $defaults = self::defaults();
        $name = self::clean((string) ($stored['runtime_name'] ?? ''), 40);

        if ($name === '') {
            $name = self::DEFAULT_NAME;
        }

        $lines = [];

        foreach ($defaults as $key => $fallback) {
            if ($key === 'runtime_name') {
                continue;
            }

            $value = self::clean((string) ($stored[$key] ?? ''), 200);
            $lines[$key] = $value !== '' ? $value : $fallback;
        }

        return [
            'name' => $name,
            'slug' => self::slug($name),
            'lines' => $lines,
        ];
    }

    public static function slug(string $name): string
    {
        $slug = strtolower(trim($name));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-');

        return $slug !== '' ? $slug : 'deepthought';
    }

    public static function clean(string $value, int $max): string
    {
        $value = preg_replace('/\e\[[0-9;]*[A-Za-z]/', '', $value) ?? $value;
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
        $value = trim($value);

        if ($value === '') {
            return '';
        }

        if (mb_strlen($value) > $max) {
            return mb_substr($value, 0, $max);
        }

        return $value;
    }
}
