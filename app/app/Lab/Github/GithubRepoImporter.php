<?php

namespace App\Lab\Github;

use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use RuntimeException;
use Throwable;
use ZipArchive;

/**
 * Materialize a GitHub repo into a Lab workspace.
 * Prefers subtree (trees + blobs) when a package root is known — avoids multi‑MB monorepo zipballs.
 */
final class GithubRepoImporter
{
    /**
     * @var list<string>
     */
    private const APP_ROOT_CANDIDATES = [
        'apps/www',
        'apps/web',
        'apps/app',
        'apps/docs',
        'apps/site',
        'packages/app',
        'packages/web',
        'packages/www',
        'www',
        'web',
        'app',
        'frontend',
        'client',
    ];

    private readonly GithubSubtreeFetcher $subtree;

    public function __construct(
        private readonly GithubApiClient $api = new GithubApiClient,
        private readonly SiteWorkspace $workspace = new SiteWorkspace,
        ?GithubSubtreeFetcher $subtree = null,
    ) {
        $this->subtree = $subtree ?? new GithubSubtreeFetcher($this->api);
    }

    /**
     * @return array{owner: string, repo: string, paths: list<string>, skipped: int, root: ?string, mode: string}
     */
    public function import(
        LabProject $project,
        string $owner,
        string $repo,
        ?string $ref = null,
        ?string $accessToken = null,
        ?string $rootDirectory = null,
    ): array {
        $started = microtime(true);
        $requestedRoot = trim(str_replace('\\', '/', (string) $rootDirectory), '/');
        if (str_contains($requestedRoot, '..')) {
            throw new InvalidArgumentException(__('dashboard.Enter a valid GitHub repository URL (https://github.com/owner/repo).'));
        }

        try {
            $resolvedRoot = $requestedRoot !== ''
                ? $requestedRoot
                : $this->detectAppRootViaApi($owner, $repo, $ref, $accessToken);

            if ($resolvedRoot !== null && $resolvedRoot !== '') {
                try {
                    $result = $this->importSubtree($project, $owner, $repo, $resolvedRoot, $ref, $accessToken);

                    Log::info('lab.github.import.done', [
                        'project_uuid' => $project->uuid,
                        'owner' => $owner,
                        'repo' => $repo,
                        'resolved_root' => $resolvedRoot,
                        'mode' => 'subtree',
                        'imported' => count($result['paths']),
                        'skipped' => $result['skipped'],
                        'total_ms' => (int) round((microtime(true) - $started) * 1000),
                    ]);

                    return [
                        'owner' => $owner,
                        'repo' => $repo,
                        'paths' => $result['paths'],
                        'skipped' => $result['skipped'],
                        'root' => $resolvedRoot,
                        'mode' => 'subtree',
                    ];
                } catch (Throwable $subtreeError) {
                    Log::warning('lab.github.subtree.fallback_zip', [
                        'owner' => $owner,
                        'repo' => $repo,
                        'root' => $resolvedRoot,
                        'message' => $subtreeError->getMessage(),
                    ]);
                }
            }

            return $this->importZipball($project, $owner, $repo, $ref, $accessToken, $resolvedRoot, $started);
        } catch (Throwable $e) {
            Log::warning('lab.github.import.failed', [
                'project_uuid' => $project->uuid,
                'owner' => $owner,
                'repo' => $repo,
                'requested_root' => $rootDirectory,
                'message' => $e->getMessage(),
                'total_ms' => (int) round((microtime(true) - $started) * 1000),
            ]);

            throw $e;
        }
    }

    /**
     * @return array{owner: string, repo: string, paths: list<string>, skipped: int, root: ?string, mode: string}
     */
    public function importFromUrl(
        LabProject $project,
        string $url,
        ?string $accessToken = null,
        ?string $ref = null,
        ?string $rootDirectory = null,
    ): array {
        $parsed = GithubRepoUrl::parse($url);

        return $this->import($project, $parsed['owner'], $parsed['repo'], $ref, $accessToken, $rootDirectory);
    }

    /**
     * @return array{paths: list<string>, skipped: int}
     */
    private function importSubtree(
        LabProject $project,
        string $owner,
        string $repo,
        string $root,
        ?string $ref,
        ?string $accessToken,
    ): array {
        $maxFiles = LabGithubImportLimits::maxFiles();
        $maxFileBytes = (int) config('lab.github.max_file_bytes', 2 * 1024 * 1024);

        Log::info('lab.github.import.start', [
            'project_uuid' => $project->uuid,
            'owner' => $owner,
            'repo' => $repo,
            'ref' => $ref,
            'resolved_root' => $root,
            'mode' => 'subtree',
        ]);

        $files = $this->subtree->fetch(
            $owner,
            $repo,
            $root,
            $ref,
            $accessToken,
            $maxFiles,
            $maxFileBytes,
        );

        $result = $this->workspace->importFileMap($project, $files);
        $this->workspace->ensureFumadocsSourceStub($project);

        return $result;
    }

    /**
     * @return array{owner: string, repo: string, paths: list<string>, skipped: int, root: ?string, mode: string}
     */
    private function importZipball(
        LabProject $project,
        string $owner,
        string $repo,
        ?string $ref,
        ?string $accessToken,
        ?string $resolvedRoot,
        float $started,
    ): array {
        $zipPath = null;
        $extractRoot = null;

        try {
            $downloadStarted = microtime(true);
            $zipPath = $this->api->downloadZipball($owner, $repo, $ref, $accessToken);
            $downloadMs = (int) round((microtime(true) - $downloadStarted) * 1000);
            $zipBytes = is_file($zipPath) ? (int) filesize($zipPath) : 0;

            $extractStarted = microtime(true);
            $extractRoot = $this->extractZip($zipPath);
            $extractMs = (int) round((microtime(true) - $extractStarted) * 1000);

            $repoRoot = $this->resolveRepoRoot($extractRoot);
            $root = $resolvedRoot;
            if ($root === null || $root === '') {
                $root = $this->detectAppRootOnDisk($repoRoot);
            }

            Log::info('lab.github.import.start', [
                'project_uuid' => $project->uuid,
                'owner' => $owner,
                'repo' => $repo,
                'ref' => $ref,
                'resolved_root' => $root,
                'mode' => 'zipball',
                'zip_bytes' => $zipBytes,
                'download_ms' => $downloadMs,
                'extract_ms' => $extractMs,
            ]);

            $source = $this->resolveImportSource($repoRoot, $root);
            $result = $this->workspace->importTree($project, $source);
            $this->workspace->ensureFumadocsSourceStub($project);

            Log::info('lab.github.import.done', [
                'project_uuid' => $project->uuid,
                'owner' => $owner,
                'repo' => $repo,
                'resolved_root' => $root,
                'mode' => 'zipball',
                'imported' => count($result['paths']),
                'skipped' => $result['skipped'],
                'total_ms' => (int) round((microtime(true) - $started) * 1000),
            ]);

            return [
                'owner' => $owner,
                'repo' => $repo,
                'paths' => $result['paths'],
                'skipped' => $result['skipped'],
                'root' => $root,
                'mode' => 'zipball',
            ];
        } finally {
            if (is_string($zipPath) && is_file($zipPath)) {
                @unlink($zipPath);
            }
            if (is_string($extractRoot) && is_dir($extractRoot)) {
                File::deleteDirectory($extractRoot);
            }
        }
    }

    private function detectAppRootViaApi(string $owner, string $repo, ?string $ref, ?string $accessToken): ?string
    {
        $rootManifest = $this->api->fetchJsonFile($owner, $repo, 'package.json', $ref, $accessToken);
        if ($rootManifest !== null && GithubManifestKind::fromManifest($rootManifest) !== null) {
            return null;
        }

        foreach (self::APP_ROOT_CANDIDATES as $relative) {
            $manifest = $this->api->fetchJsonFile($owner, $repo, $relative.'/package.json', $ref, $accessToken);
            if ($manifest !== null && GithubManifestKind::fromManifest($manifest) !== null) {
                Log::info('lab.github.import.auto_root', ['root' => $relative, 'via' => 'api']);

                return $relative;
            }
        }

        foreach (['apps', 'packages'] as $dir) {
            foreach ($this->api->listDirectoryNames($owner, $repo, $dir, $ref, $accessToken) as $name) {
                $relative = $dir.'/'.$name;
                $manifest = $this->api->fetchJsonFile($owner, $repo, $relative.'/package.json', $ref, $accessToken);
                if ($manifest !== null && GithubManifestKind::fromManifest($manifest) !== null) {
                    Log::info('lab.github.import.auto_root', ['root' => $relative, 'via' => 'api']);

                    return $relative;
                }
            }
        }

        // Workspace shell without a resolvable package — still prefer apps/www if present.
        if ($rootManifest !== null && $this->looksLikeWorkspace($rootManifest)) {
            foreach (self::APP_ROOT_CANDIDATES as $relative) {
                if ($this->api->fetchJsonFile($owner, $repo, $relative.'/package.json', $ref, $accessToken) !== null) {
                    Log::info('lab.github.import.auto_root', ['root' => $relative, 'via' => 'workspace']);

                    return $relative;
                }
            }
        }

        return null;
    }

    private function detectAppRootOnDisk(string $repoRoot): ?string
    {
        $rootManifest = $this->readManifest($repoRoot.DIRECTORY_SEPARATOR.'package.json');
        if ($rootManifest !== null && GithubManifestKind::fromManifest($rootManifest) !== null) {
            return null;
        }

        foreach (self::APP_ROOT_CANDIDATES as $relative) {
            $manifest = $this->readManifest($repoRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative).DIRECTORY_SEPARATOR.'package.json');
            if ($manifest !== null && GithubManifestKind::fromManifest($manifest) !== null) {
                return $relative;
            }
        }

        return null;
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

        return array_key_exists('turbo', $bag);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readManifest(string $path): ?array
    {
        if (! is_file($path)) {
            return null;
        }

        try {
            $json = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }

        return is_array($json) ? $json : null;
    }

    private function extractZip(string $zipPath): string
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException(__('dashboard.ZIP support is required to import from GitHub.'));
        }

        $target = sys_get_temp_dir().DIRECTORY_SEPARATOR.'krikkit-gh-'.bin2hex(random_bytes(8));
        File::ensureDirectoryExists($target);

        $zip = new ZipArchive;
        $opened = $zip->open($zipPath);

        if ($opened !== true) {
            File::deleteDirectory($target);

            throw new RuntimeException(__('dashboard.Could not read the GitHub repository archive.'));
        }

        try {
            if (! $zip->extractTo($target)) {
                throw new RuntimeException(__('dashboard.Could not extract the GitHub repository archive.'));
            }
        } catch (Throwable $e) {
            $zip->close();
            File::deleteDirectory($target);

            throw $e instanceof RuntimeException
                ? $e
                : new RuntimeException(__('dashboard.Could not extract the GitHub repository archive.'), previous: $e);
        }

        $zip->close();

        return $target;
    }

    private function resolveRepoRoot(string $extractRoot): string
    {
        $entries = array_values(array_filter(
            scandir($extractRoot) ?: [],
            static fn (string $name): bool => $name !== '.' && $name !== '..',
        ));

        if (count($entries) === 1) {
            $only = $extractRoot.DIRECTORY_SEPARATOR.$entries[0];
            if (is_dir($only)) {
                return $only;
            }
        }

        if ($entries === []) {
            throw new InvalidArgumentException(__('dashboard.The GitHub archive was empty.'));
        }

        return $extractRoot;
    }

    private function resolveImportSource(string $repoRoot, ?string $rootDirectory): string
    {
        $rel = trim(str_replace('\\', '/', (string) $rootDirectory), '/');
        if ($rel === '') {
            return $repoRoot;
        }

        if (str_contains($rel, '..')) {
            throw new InvalidArgumentException(__('dashboard.Enter a valid GitHub repository URL (https://github.com/owner/repo).'));
        }

        $path = $repoRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $rel);
        $realRoot = realpath($repoRoot);
        $realPath = realpath($path);

        if ($realRoot === false || $realPath === false || ! is_dir($realPath)) {
            throw new InvalidArgumentException(__('dashboard.No importable files were found in the repository.'));
        }

        if (! str_starts_with($realPath, $realRoot.DIRECTORY_SEPARATOR) && $realPath !== $realRoot) {
            throw new InvalidArgumentException(__('dashboard.No importable files were found in the repository.'));
        }

        return $realPath;
    }
}
