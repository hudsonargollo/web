<?php

namespace App\Lab\Github;

/**
 * Which repositories belong in Lab’s GitHub import picker.
 */
final class GithubRepoSuitability
{
    /** Frontend kinds Lab can open (glyph keys). */
    public const LAB_KINDS = [
        'vite',
        'next',
        'nuxt',
        'react',
        'vue',
        'svelte',
        'astro',
    ];

    /**
     * Primary languages that are almost never Lab-importable frontends.
     * Skipping these avoids pointless package.json probes (big list latency win).
     *
     * @var list<string>
     */
    private const SKIP_LANGUAGES = [
        'PHP',
        'Python',
        'Go',
        'Java',
        'C#',
        'C',
        'C++',
        'Ruby',
        'Rust',
        'Swift',
        'Kotlin',
        'Dart',
        'Elixir',
        'Scala',
        'Objective-C',
        'Shell',
        'Dockerfile',
        'PowerShell',
        'Haskell',
        'Lua',
        'Perl',
        'R',
    ];

    /**
     * @param  array<string, mixed>  $row  Raw GitHub /user/repos item
     */
    public static function isCandidate(array $row): bool
    {
        if ((bool) ($row['archived'] ?? false)) {
            return false;
        }

        $language = trim((string) ($row['language'] ?? ''));
        if ($language !== '' && in_array($language, self::SKIP_LANGUAGES, true)) {
            return false;
        }

        return true;
    }

    public static function isLabKind(string $kind): bool
    {
        return in_array($kind, self::LAB_KINDS, true);
    }
}
