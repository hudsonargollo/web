<?php

namespace App\Lab\Github;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Resolves a Lab glyph kind per repository (topics → cache → package.json → monorepo apps → config hints).
 * Only repos that resolve to a LAB_KIND are importable — unknown repos are omitted from the picker.
 */
final class GithubRepoKindScout
{
    private const MAX_NESTED_PACKAGES = 8;

    /**
     * @var array<string, list<string>>
     */
    private const ROOT_HINT_FILES = [
        'next' => ['next.config.ts', 'next.config.mjs', 'next.config.js'],
        'nuxt' => ['nuxt.config.ts', 'nuxt.config.mjs', 'nuxt.config.js'],
        'astro' => ['astro.config.mjs', 'astro.config.ts', 'astro.config.js'],
        'vite' => ['vite.config.ts', 'vite.config.mjs', 'vite.config.js'],
        'svelte' => ['svelte.config.js', 'svelte.config.ts'],
    ];

    /**
     * @param  list<array<string, mixed>>  $repos
     * @return array<string, string> full_name => kind
     */
    public function resolve(string $accessToken, array $repos): array
    {
        $kinds = [];
        $needsRoot = [];
        $ttl = max(60, (int) config('lab.github.kind_cache_ttl', 3600));

        foreach ($repos as $repo) {
            if (! is_array($repo)) {
                continue;
            }

            $fullName = (string) ($repo['full_name'] ?? '');
            if ($fullName === '') {
                continue;
            }

            $topics = is_array($repo['topics'] ?? null) ? $repo['topics'] : [];
            $topicKind = GithubManifestKind::fromTopics(array_map('strval', $topics));
            if ($topicKind !== null) {
                $kinds[$fullName] = $topicKind;
                $this->remember($fullName, $repo, $topicKind, $ttl);

                continue;
            }

            $cached = $this->cachedKind($fullName, $repo);
            if ($cached !== null) {
                if ($cached !== '') {
                    $kinds[$fullName] = $cached;
                }

                continue;
            }

            $needsRoot[] = $repo;
        }

        if ($needsRoot === []) {
            return $kinds;
        }

        $api = GithubHttp::apiBase();
        $timeout = max(1, (int) config('lab.github.timeout', 60));
        $headers = $this->headers();

        $rootResponses = $this->poolContents($needsRoot, $accessToken, $api, $timeout, $headers, static function (Pool $pool, string $fullName, string $owner, string $name) use ($accessToken, $api, $timeout, $headers): void {
            $pool->as($fullName)
                ->withToken($accessToken)
                ->accept('application/vnd.github+json')
                ->withHeaders($headers)
                ->timeout($timeout)
                ->get($api.'/repos/'.$owner.'/'.$name.'/contents/package.json');
        });

        $needsMonorepo = [];
        $needsHintsOnly = [];
        foreach ($needsRoot as $repo) {
            $fullName = (string) ($repo['full_name'] ?? '');
            if ($fullName === '') {
                continue;
            }

            $root = $this->manifestFromResponse($rootResponses[$fullName] ?? null);
            if ($root !== null) {
                $kind = GithubManifestKind::fromManifest($root);
                if ($kind !== null) {
                    $kinds[$fullName] = $kind;
                    $this->remember($fullName, $repo, $kind, $ttl);

                    continue;
                }

                if ($this->looksLikeWorkspace($root)) {
                    $needsMonorepo[] = $repo;
                } else {
                    $needsHintsOnly[] = $repo;
                }

                continue;
            }

            $needsMonorepo[] = $repo;
        }

        if ($needsMonorepo !== []) {
            $dirResponses = $this->poolContents($needsMonorepo, $accessToken, $api, $timeout, $headers, static function (Pool $pool, string $fullName, string $owner, string $name) use ($accessToken, $api, $timeout, $headers): void {
                foreach (['apps', 'packages'] as $dir) {
                    $pool->as($fullName.'::dir::'.$dir)
                        ->withToken($accessToken)
                        ->accept('application/vnd.github+json')
                        ->withHeaders($headers)
                        ->timeout($timeout)
                        ->get($api.'/repos/'.$owner.'/'.$name.'/contents/'.$dir);
                }
            });

            $nestedTargets = [];
            foreach ($needsMonorepo as $repo) {
                $fullName = (string) ($repo['full_name'] ?? '');
                if ($fullName === '') {
                    continue;
                }

                foreach ($this->nestedPackagePaths($fullName, $dirResponses) as $relative) {
                    $nestedTargets[] = [$repo, $relative];
                }
            }

            if ($nestedTargets !== []) {
                $nestedResponses = Http::pool(function (Pool $pool) use ($nestedTargets, $accessToken, $api, $timeout, $headers) {
                    foreach ($nestedTargets as [$repo, $relative]) {
                        [$fullName, $owner, $name] = $this->repoParts($repo);
                        if ($fullName === null) {
                            continue;
                        }

                        $pool->as($fullName.'::pkg::'.$relative)
                            ->withToken($accessToken)
                            ->accept('application/vnd.github+json')
                            ->withHeaders($headers)
                            ->timeout($timeout)
                            ->get($api.'/repos/'.$owner.'/'.$name.'/contents/'.$relative);
                    }
                });

                foreach ($needsMonorepo as $repo) {
                    $fullName = (string) ($repo['full_name'] ?? '');
                    if ($fullName === '' || isset($kinds[$fullName])) {
                        continue;
                    }

                    foreach ($this->nestedPackagePaths($fullName, $dirResponses) as $relative) {
                        $manifest = $this->manifestFromResponse($nestedResponses[$fullName.'::pkg::'.$relative] ?? null);
                        if ($manifest === null) {
                            continue;
                        }

                        $kind = GithubManifestKind::fromManifest($manifest);
                        if ($kind !== null) {
                            $kinds[$fullName] = $kind;
                            $this->remember($fullName, $repo, $kind, $ttl);
                            break;
                        }
                    }
                }
            }
        }

        $stillUnknown = [];
        foreach (array_merge($needsMonorepo, $needsHintsOnly) as $repo) {
            $fullName = (string) ($repo['full_name'] ?? '');
            if ($fullName === '' || isset($kinds[$fullName])) {
                continue;
            }
            $stillUnknown[] = $repo;
        }

        if ($stillUnknown === []) {
            $this->rememberMisses($needsRoot, $kinds, $ttl);

            return $kinds;
        }

        $hintResponses = $this->poolContents($stillUnknown, $accessToken, $api, $timeout, $headers, static function (Pool $pool, string $fullName, string $owner, string $name) use ($accessToken, $api, $timeout, $headers): void {
            foreach (self::ROOT_HINT_FILES as $kind => $files) {
                foreach ($files as $relative) {
                    $pool->as($fullName.'::hint::'.$kind.'::'.$relative)
                        ->withToken($accessToken)
                        ->accept('application/vnd.github+json')
                        ->withHeaders($headers)
                        ->timeout($timeout)
                        ->get($api.'/repos/'.$owner.'/'.$name.'/contents/'.$relative);
                }
            }
        });

        foreach ($stillUnknown as $repo) {
            $fullName = (string) ($repo['full_name'] ?? '');
            if ($fullName === '') {
                continue;
            }

            $hintKind = $this->kindFromHintFiles($fullName, $hintResponses);
            if ($hintKind !== null) {
                $kinds[$fullName] = $hintKind;
                $this->remember($fullName, $repo, $hintKind, $ttl);
            }
        }

        $this->rememberMisses($needsRoot, $kinds, $ttl);

        return $kinds;
    }

    /**
     * @param  list<array<string, mixed>>  $repos
     * @param  callable(Pool, string, string, string): void  $register
     * @return array<string, mixed>
     */
    private function poolContents(array $repos, string $accessToken, string $api, int $timeout, array $headers, callable $register): array
    {
        return Http::pool(function (Pool $pool) use ($repos, $register) {
            foreach ($repos as $repo) {
                [$fullName, $owner, $name] = $this->repoParts($repo);
                if ($fullName === null) {
                    continue;
                }

                $register($pool, $fullName, $owner, $name);
            }
        });
    }

    /**
     * @param  array<string, mixed>  $repo
     * @return array{0: ?string, 1: string, 2: string}
     */
    private function repoParts(array $repo): array
    {
        $fullName = (string) ($repo['full_name'] ?? '');
        $owner = rawurlencode((string) (is_array($repo['owner'] ?? null) ? ($repo['owner']['login'] ?? '') : ''));
        $name = rawurlencode((string) ($repo['name'] ?? ''));

        if ($fullName === '' || $owner === '' || $name === '') {
            return [null, '', ''];
        }

        return [$fullName, $owner, $name];
    }

    /**
     * @param  array<string, mixed>  $dirResponses
     * @return list<string>
     */
    private function nestedPackagePaths(string $fullName, array $dirResponses): array
    {
        $paths = [];
        foreach (['apps', 'packages'] as $dir) {
            $response = $dirResponses[$fullName.'::dir::'.$dir] ?? null;
            if (! $response instanceof Response || ! $response->successful()) {
                continue;
            }

            $entries = $response->json();
            if (! is_array($entries)) {
                continue;
            }

            foreach ($entries as $entry) {
                if (! is_array($entry) || ($entry['type'] ?? '') !== 'dir') {
                    continue;
                }

                $name = trim((string) ($entry['name'] ?? ''));
                if ($name === '' || str_starts_with($name, '.')) {
                    continue;
                }

                $paths[] = $dir.'/'.$name.'/package.json';
                if (count($paths) >= self::MAX_NESTED_PACKAGES) {
                    return $paths;
                }
            }
        }

        return $paths;
    }

    /**
     * @param  array<string, mixed>  $manifest
     */
    private function looksLikeWorkspace(array $manifest): bool
    {
        if (isset($manifest['workspaces'])) {
            return true;
        }

        $manager = (string) ($manifest['packageManager'] ?? '');
        if ($manager !== '' && (str_contains($manager, 'pnpm') || str_contains($manager, 'yarn@'))) {
            return true;
        }

        /** @var array<string, mixed> $bag */
        $bag = array_merge(
            is_array($manifest['dependencies'] ?? null) ? $manifest['dependencies'] : [],
            is_array($manifest['devDependencies'] ?? null) ? $manifest['devDependencies'] : [],
        );

        if (array_key_exists('turbo', $bag)) {
            return true;
        }

        $scripts = is_array($manifest['scripts'] ?? null) ? $manifest['scripts'] : [];
        foreach ($scripts as $script) {
            if (is_string($script) && (str_contains($script, 'turbo ') || str_contains($script, 'pnpm --filter'))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $responses
     */
    private function kindFromHintFiles(string $fullName, array $responses): ?string
    {
        foreach (self::ROOT_HINT_FILES as $kind => $files) {
            foreach ($files as $relative) {
                $response = $responses[$fullName.'::hint::'.$kind.'::'.$relative] ?? null;
                if ($response instanceof Response && $response->successful()) {
                    return $kind;
                }
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function manifestFromResponse(mixed $response): ?array
    {
        if (! $response instanceof Response || ! $response->successful()) {
            return null;
        }

        /** @var array<string, mixed> $payload */
        $payload = $response->json() ?? [];
        if (($payload['encoding'] ?? '') !== 'base64' || ! isset($payload['content'])) {
            return null;
        }

        $decoded = base64_decode(str_replace("\n", '', (string) $payload['content']), true);
        if ($decoded === false || trim($decoded) === '') {
            return null;
        }

        try {
            $json = json_decode($decoded, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }

        return is_array($json) ? $json : null;
    }

    /**
     * @return array<string, string>
     */
    private function headers(): array
    {
        return [
            'X-GitHub-Api-Version' => '2022-11-28',
            'User-Agent' => config('lab.github.user_agent', 'Krikkit-Lab'),
        ];
    }

    /**
     * @param  array<string, mixed>  $repo
     */
    private function cacheKey(string $fullName, array $repo): string
    {
        $stamp = (string) ($repo['pushed_at'] ?? $repo['updated_at'] ?? '');

        return 'lab.github.kind.'.hash('sha256', $fullName.'|'.$stamp);
    }

    /**
     * @param  array<string, mixed>  $repo
     */
    private function cachedKind(string $fullName, array $repo): ?string
    {
        $value = Cache::get($this->cacheKey($fullName, $repo));
        if (! is_string($value)) {
            return null;
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $repo
     */
    private function remember(string $fullName, array $repo, string $kind, int $ttl): void
    {
        Cache::put($this->cacheKey($fullName, $repo), $kind, $ttl);
    }

    /**
     * @param  list<array<string, mixed>>  $repos
     * @param  array<string, string>  $kinds
     */
    private function rememberMisses(array $repos, array $kinds, int $ttl): void
    {
        foreach ($repos as $repo) {
            $fullName = (string) ($repo['full_name'] ?? '');
            if ($fullName === '' || isset($kinds[$fullName])) {
                continue;
            }

            Cache::put($this->cacheKey($fullName, $repo), '', $ttl);
        }
    }
}
