<?php

namespace App\Lab\Github;

use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Fetch a single directory prefix from GitHub via git trees + blobs (no full zipball).
 */
final class GithubSubtreeFetcher
{
    private const BLOB_POOL = 40;

    public function __construct(
        private readonly GithubApiClient $api = new GithubApiClient,
    ) {}

    /**
     * @return array<string, string> relative path (under $prefix stripped) → file contents
     */
    public function fetch(
        string $owner,
        string $repo,
        string $prefix,
        ?string $ref = null,
        ?string $accessToken = null,
        int $maxFiles = 2500,
        int $maxFileBytes = 2_097_152,
    ): array {
        $prefix = trim(str_replace('\\', '/', $prefix), '/');
        if ($prefix === '' || str_contains($prefix, '..')) {
            throw new RuntimeException(__('dashboard.Could not import repository.'));
        }

        $started = microtime(true);
        $sha = $this->api->resolveCommitSha($owner, $repo, $ref, $accessToken);
        $tree = $this->api->fetchRecursiveTree($owner, $repo, $sha, $accessToken);

        $prefixSlash = $prefix.'/';
        $blobs = [];
        foreach ($tree as $entry) {
            if (($entry['type'] ?? '') !== 'blob') {
                continue;
            }

            $path = (string) ($entry['path'] ?? '');
            if ($path !== $prefix && ! str_starts_with($path, $prefixSlash)) {
                continue;
            }

            $relative = $path === $prefix
                ? ''
                : substr($path, strlen($prefixSlash));
            if ($relative === '' || str_contains($relative, '..')) {
                continue;
            }

            $size = (int) ($entry['size'] ?? 0);
            if ($size > $maxFileBytes) {
                continue;
            }

            $blobSha = (string) ($entry['sha'] ?? '');
            if ($blobSha === '') {
                continue;
            }

            $blobs[$relative] = $blobSha;
            if (count($blobs) > $maxFiles) {
                throw new RuntimeException(__('dashboard.Repository has too many files to import. Raise the max file count under API Integration → GitHub, or set Root directory (e.g. apps/www).'));
            }
        }

        if ($blobs === []) {
            throw new RuntimeException(__('dashboard.No importable files were found in the repository.'));
        }

        $files = $this->downloadBlobs($owner, $repo, $blobs, $accessToken, $maxFileBytes);

        Log::info('lab.github.subtree.ok', [
            'owner' => $owner,
            'repo' => $repo,
            'prefix' => $prefix,
            'ref' => $ref,
            'commit' => $sha,
            'blob_count' => count($blobs),
            'file_count' => count($files),
            'elapsed_ms' => (int) round((microtime(true) - $started) * 1000),
        ]);

        return $files;
    }

    /**
     * @param  array<string, string>  $relativeToSha
     * @return array<string, string>
     */
    private function downloadBlobs(
        string $owner,
        string $repo,
        array $relativeToSha,
        ?string $accessToken,
        int $maxFileBytes,
    ): array {
        $files = [];
        $chunks = array_chunk($relativeToSha, self::BLOB_POOL, true);
        $api = GithubHttp::apiBase();
        $timeout = max(1, (int) config('lab.github.timeout', 60));

        foreach ($chunks as $chunk) {
            $responses = Http::pool(function (Pool $pool) use ($chunk, $owner, $repo, $accessToken, $api, $timeout) {
                foreach ($chunk as $relative => $blobSha) {
                    $req = $pool->as($relative)
                        ->accept('application/vnd.github+json')
                        ->withHeaders([
                            'X-GitHub-Api-Version' => '2022-11-28',
                            'User-Agent' => config('lab.github.user_agent', 'Krikkit-Lab'),
                        ])
                        ->timeout($timeout);

                    if (filled($accessToken)) {
                        $req = $req->withToken($accessToken);
                    }

                    $req->get(
                        $api.'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/git/blobs/'.rawurlencode($blobSha)
                    );
                }
            });

            foreach ($chunk as $relative => $blobSha) {
                $response = $responses[$relative] ?? null;
                if (! $response || ! $response->successful()) {
                    continue;
                }

                /** @var array<string, mixed> $payload */
                $payload = $response->json() ?? [];
                if (($payload['encoding'] ?? '') !== 'base64' || ! isset($payload['content'])) {
                    continue;
                }

                $decoded = base64_decode(str_replace("\n", '', (string) $payload['content']), true);
                if ($decoded === false || strlen($decoded) > $maxFileBytes) {
                    continue;
                }

                // Skip obvious binaries (null bytes) for Lab text VFS.
                if (str_contains($decoded, "\0")) {
                    continue;
                }

                $files[$relative] = $decoded;
            }
        }

        if ($files === []) {
            throw new RuntimeException(__('dashboard.No importable files were found in the repository.'));
        }

        return $files;
    }
}
