<?php

namespace App\Lab\Github;

/**
 * Maps a package.json document to a Lab frontend kind (glyph key).
 */
final class GithubManifestKind
{
    /**
     * @param  array<string, mixed>  $manifest
     */
    public static function fromManifest(array $manifest): ?string
    {
        /** @var array<string, mixed> $bag */
        $bag = array_merge(
            is_array($manifest['dependencies'] ?? null) ? $manifest['dependencies'] : [],
            is_array($manifest['devDependencies'] ?? null) ? $manifest['devDependencies'] : [],
        );

        if ($bag === []) {
            return null;
        }

        // Meta-frameworks before shared libraries.
        if (array_key_exists('next', $bag)) {
            return 'next';
        }
        if (array_key_exists('nuxt', $bag) || array_key_exists('nuxt3', $bag)) {
            return 'nuxt';
        }
        if (array_key_exists('astro', $bag)) {
            return 'astro';
        }
        if (array_key_exists('@sveltejs/kit', $bag) || array_key_exists('svelte', $bag)) {
            return 'svelte';
        }
        if (
            array_key_exists('vite', $bag)
            || array_key_exists('@vitejs/plugin-react', $bag)
            || array_key_exists('@vitejs/plugin-vue', $bag)
            || array_key_exists('@vitejs/plugin-react-swc', $bag)
        ) {
            return 'vite';
        }
        if (array_key_exists('vue', $bag)) {
            return 'vue';
        }
        if (array_key_exists('react', $bag) || array_key_exists('react-dom', $bag)) {
            return 'react';
        }

        return null;
    }

    /**
     * @param  list<string>  $topics
     */
    public static function fromTopics(array $topics): ?string
    {
        $normalized = array_values(array_filter(array_map(
            static fn (string $t): string => mb_strtolower(trim($t)),
            $topics,
        )));

        $map = [
            'next' => ['next', 'nextjs', 'next.js'],
            'nuxt' => ['nuxt', 'nuxtjs', 'nuxt.js'],
            'astro' => ['astro'],
            'svelte' => ['svelte', 'sveltekit'],
            'vite' => ['vite', 'vitejs'],
            'vue' => ['vue', 'vuejs'],
            'react' => ['react', 'reactjs'],
        ];

        foreach ($map as $kind => $needles) {
            foreach ($needles as $needle) {
                if (in_array($needle, $normalized, true)) {
                    return $kind;
                }
            }
        }

        return null;
    }

    /**
     * Weak glyph from GitHub’s primary language (list latency — no contents fetch).
     */
    public static function fromLanguage(?string $language): ?string
    {
        $language = trim((string) $language);
        if ($language === '') {
            return null;
        }

        return match ($language) {
            'TypeScript', 'JavaScript' => 'react',
            'Vue' => 'vue',
            'Svelte' => 'svelte',
            'HTML', 'CSS', 'MDX' => 'web',
            default => null,
        };
    }
}
