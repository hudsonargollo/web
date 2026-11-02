<?php

namespace App\Lab\Github;

use Illuminate\Http\Client\RequestException;
use RuntimeException;

/**
 * Thin GitHub REST helpers for Lab import (public zipball + per-user repos).
 */
final class GithubApiClient
{
    /**
     * @return array{login: string, name: ?string, avatar_url: ?string}|null
     */
    public function fetchUser(string $accessToken): ?array
    {
        try {
            $response = GithubHttp::api($accessToken)->get(GithubHttp::apiBase().'/user')->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not reach GitHub. Check your connection and try again.'), previous: $e);
        }

        /** @var array<string, mixed> $data */
        $data = $response->json() ?? [];

        $login = trim((string) ($data['login'] ?? ''));
        if ($login === '') {
            return null;
        }

        return [
            'login' => $login,
            'name' => filled($data['name'] ?? null) ? (string) $data['name'] : null,
            'avatar_url' => filled($data['avatar_url'] ?? null) ? (string) $data['avatar_url'] : null,
        ];
    }

    /**
     * @return list<array{
     *     id: int,
     *     full_name: string,
     *     name: string,
     *     private: bool,
     *     html_url: string,
     *     description: ?string,
     *     updated_at: ?string,
     *     updated_label: string,
     *     owner_login: string,
     *     glyph: string
     * }>
     */
    public function listRepositories(string $accessToken, string $query = '', int $page = 1, int $perPage = 100, bool $labOnly = true): array
    {
        $page = max(1, $page);
        $perPage = min(100, max(1, $perPage));

        try {
            $response = GithubHttp::api($accessToken)->get(GithubHttp::apiBase().'/user/repos', [
                'sort' => 'updated',
                'direction' => 'desc',
                'per_page' => $perPage,
                'page' => $page,
                'affiliation' => 'owner,collaborator,organization_member',
            ])->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not load GitHub repositories.'), previous: $e);
        }

        /** @var list<array<string, mixed>> $rows */
        $rows = $response->json() ?? [];
        $needle = mb_strtolower(trim($query));

        $candidates = [];
        foreach ($rows as $row) {
            if (! is_array($row) || ! GithubRepoSuitability::isCandidate($row)) {
                continue;
            }

            $fullName = (string) ($row['full_name'] ?? '');
            $name = (string) ($row['name'] ?? '');
            if ($fullName === '' || $name === '') {
                continue;
            }

            if ($needle !== '' && ! str_contains(mb_strtolower($fullName), $needle)
                && ! str_contains(mb_strtolower($name), $needle)) {
                continue;
            }

            $candidates[] = $row;
        }

        $kinds = $labOnly
            ? (new GithubRepoKindScout)->resolve($accessToken, $candidates)
            : [];

        $out = [];
        foreach ($candidates as $row) {
            $fullName = (string) ($row['full_name'] ?? '');
            $kind = $labOnly ? ($kinds[$fullName] ?? null) : 'any';
            if ($labOnly && ($kind === null || ! GithubRepoSuitability::isLabKind($kind))) {
                continue;
            }

            $owner = is_array($row['owner'] ?? null) ? $row['owner'] : [];
            $updatedAt = filled($row['updated_at'] ?? null) ? (string) $row['updated_at'] : null;

            $out[] = [
                'id' => (int) ($row['id'] ?? 0),
                'full_name' => $fullName,
                'name' => (string) ($row['name'] ?? ''),
                'private' => (bool) ($row['private'] ?? false),
                'html_url' => (string) ($row['html_url'] ?? ''),
                'description' => filled($row['description'] ?? null) ? (string) $row['description'] : null,
                'default_branch' => (string) ($row['default_branch'] ?? 'main'),
                'updated_at' => $updatedAt,
                'updated_label' => $this->relativeLabel($updatedAt),
                'owner_login' => (string) ($owner['login'] ?? explode('/', $fullName)[0] ?? ''),
                'glyph' => $kind,
            ];
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    public function listBranches(string $accessToken, string $owner, string $repo): array
    {
        $owner = trim($owner);
        $repo = trim($repo);
        if ($owner === '' || $repo === '') {
            return [];
        }

        try {
            $response = GithubHttp::api($accessToken)->get(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/branches',
                ['per_page' => 100],
            )->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not load GitHub repositories.'), previous: $e);
        }

        /** @var list<array<string, mixed>> $rows */
        $rows = $response->json() ?? [];
        $names = [];
        foreach ($rows as $row) {
            $name = trim((string) ($row['name'] ?? ''));
            if ($name !== '') {
                $names[] = $name;
            }
        }

        return $names;
    }

    /**
     * Resolve a branch/tag/SHA to a commit SHA.
     */
    public function resolveCommitSha(string $owner, string $repo, ?string $ref = null, ?string $accessToken = null): string
    {
        $ref = trim((string) $ref);
        if ($ref === '') {
            $ref = $this->defaultBranch($owner, $repo, $accessToken);
        }

        try {
            $response = GithubHttp::api($accessToken)->get(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/commits/'.rawurlencode($ref),
                ['per_page' => 1],
            )->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not download the GitHub repository archive.'), previous: $e);
        }

        /** @var array<string, mixed> $data */
        $data = $response->json() ?? [];
        $sha = trim((string) ($data['sha'] ?? ''));
        if ($sha === '') {
            throw new RuntimeException(__('dashboard.Could not download the GitHub repository archive.'));
        }

        return $sha;
    }

    public function defaultBranch(string $owner, string $repo, ?string $accessToken = null): string
    {
        try {
            $response = GithubHttp::api($accessToken)->get(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo)
            )->throw();
        } catch (RequestException $e) {
            report($e);

            return 'main';
        }

        /** @var array<string, mixed> $data */
        $data = $response->json() ?? [];
        $branch = trim((string) ($data['default_branch'] ?? 'main'));

        return $branch !== '' ? $branch : 'main';
    }

    /**
     * @return list<array{path: string, type: string, sha: string, size?: int}>
     */
    public function fetchRecursiveTree(string $owner, string $repo, string $commitSha, ?string $accessToken = null): array
    {
        try {
            $response = GithubHttp::api($accessToken)->get(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/git/trees/'.rawurlencode($commitSha),
                ['recursive' => 1],
            )->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not download the GitHub repository archive.'), previous: $e);
        }

        /** @var array<string, mixed> $data */
        $data = $response->json() ?? [];
        $tree = $data['tree'] ?? [];
        if (! is_array($tree)) {
            return [];
        }

        $out = [];
        foreach ($tree as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $path = (string) ($entry['path'] ?? '');
            $type = (string) ($entry['type'] ?? '');
            $sha = (string) ($entry['sha'] ?? '');
            if ($path === '' || $sha === '') {
                continue;
            }
            $row = [
                'path' => $path,
                'type' => $type,
                'sha' => $sha,
            ];
            if (isset($entry['size'])) {
                $row['size'] = (int) $entry['size'];
            }
            $out[] = $row;
        }

        return $out;
    }

    public function commitTreeSha(string $owner, string $repo, string $commitSha, ?string $accessToken = null): string
    {
        try {
            $response = GithubHttp::api($accessToken)->get(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/git/commits/'.rawurlencode($commitSha)
            )->throw();
        } catch (RequestException $e) {
            throw new RuntimeException($this->apiMessage($e, __('dashboard.Could not read the GitHub branch.')), previous: $e);
        }

        $treeSha = trim((string) ($response->json('tree.sha') ?? ''));
        if ($treeSha === '') {
            throw new RuntimeException(__('dashboard.Could not read the GitHub branch.'));
        }

        return $treeSha;
    }

    /**
     * Decode a JSON file from the Contents API (null when missing).
     *
     * @return array<string, mixed>|null
     */
    public function fetchJsonFile(string $owner, string $repo, string $path, ?string $ref = null, ?string $accessToken = null): ?array
    {
        $path = trim(str_replace('\\', '/', $path), '/');
        if ($path === '' || str_contains($path, '..')) {
            return null;
        }

        try {
            $query = [];
            if (filled($ref)) {
                $query['ref'] = $ref;
            }
            $response = GithubHttp::api($accessToken)->get(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/contents/'.$path,
                $query,
            );
        } catch (RequestException $e) {
            report($e);

            return null;
        }

        if ($response->status() === 404 || ! $response->successful()) {
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
     * @return list<string> directory names
     */
    public function listDirectoryNames(string $owner, string $repo, string $path, ?string $ref = null, ?string $accessToken = null): array
    {
        $path = trim(str_replace('\\', '/', $path), '/');
        if ($path === '' || str_contains($path, '..')) {
            return [];
        }

        try {
            $query = [];
            if (filled($ref)) {
                $query['ref'] = $ref;
            }
            $response = GithubHttp::api($accessToken)->get(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/contents/'.$path,
                $query,
            );
        } catch (RequestException $e) {
            report($e);

            return [];
        }

        if (! $response->successful()) {
            return [];
        }

        $entries = $response->json();
        if (! is_array($entries)) {
            return [];
        }

        $names = [];
        foreach ($entries as $entry) {
            if (! is_array($entry) || ($entry['type'] ?? '') !== 'dir') {
                continue;
            }
            $name = trim((string) ($entry['name'] ?? ''));
            if ($name !== '' && ! str_starts_with($name, '.')) {
                $names[] = $name;
            }
        }

        return $names;
    }

    /**
     * Download a repository zipball into a temp file path.
     * Pass $accessToken for private repos; omit for public zipballs.
     */
    public function downloadZipball(string $owner, string $repo, ?string $ref = null, ?string $accessToken = null): string
    {
        $url = GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/zipball';
        if (filled($ref)) {
            $url .= '/'.rawurlencode((string) $ref);
        }

        $maxBytes = LabGithubImportLimits::maxZipBytes();

        try {
            $response = GithubHttp::download($accessToken)->get($url);
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not download the GitHub repository archive.'), previous: $e);
        }

        if ($response->status() === 404) {
            throw new RuntimeException(__('dashboard.Repository not found or it is private.'));
        }

        if (! $response->successful()) {
            throw new RuntimeException(__('dashboard.Could not download the GitHub repository archive.'));
        }

        $body = $response->body();
        if ($body === '') {
            throw new RuntimeException(__('dashboard.Repository archive is too large to import.'));
        }

        if (strlen($body) > $maxBytes) {
            throw new RuntimeException(__('dashboard.Repository archive is too large to import. Raise the max archive size under API Integration → GitHub.'));
        }

        $tmp = tempnam(sys_get_temp_dir(), 'krikkit-gh-');
        if ($tmp === false) {
            throw new RuntimeException(__('dashboard.Could not import repository.'));
        }

        $zipPath = $tmp.'.zip';
        @unlink($tmp);

        if (file_put_contents($zipPath, $body) === false) {
            throw new RuntimeException(__('dashboard.Could not import repository.'));
        }

        return $zipPath;
    }

    /**
     * @return array{name: string, full_name: string, html_url: string, default_branch: string, private: bool, fork: bool}
     */
    public function createRepository(string $accessToken, string $name, bool $private = true, string $description = ''): array
    {
        try {
            $response = GithubHttp::api($accessToken)->post(GithubHttp::apiBase().'/user/repos', array_filter([
                'name' => $name,
                'private' => $private,
                'description' => $description !== '' ? $description : null,
                'auto_init' => false,
            ], fn (mixed $value) => $value !== null))->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException($this->apiMessage($e, __('dashboard.Could not create the GitHub repository.')), previous: $e);
        }

        return $this->repoCard($response->json() ?? []);
    }

    /**
     * @return array{name: string, full_name: string, html_url: string, default_branch: string, private: bool, fork: bool, owner: string}
     */
    public function forkRepository(string $accessToken, string $owner, string $repo): array
    {
        try {
            $response = GithubHttp::api($accessToken)->post(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/forks'
            )->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException($this->apiMessage($e, __('dashboard.Could not fork the GitHub repository.')), previous: $e);
        }

        $card = $this->repoCard($response->json() ?? []);

        return $this->waitForRepository($accessToken, $card['owner'], $card['name'], $card);
    }

    /**
     * @param  array<string, mixed>  $fallback
     * @return array{name: string, full_name: string, html_url: string, default_branch: string, private: bool, fork: bool, owner: string}
     */
    public function waitForRepository(string $accessToken, string $owner, string $repo, array $fallback = []): array
    {
        $deadline = microtime(true) + (app()->runningUnitTests() ? 0.2 : 20);
        $last = $fallback;

        while (microtime(true) < $deadline) {
            try {
                $response = GithubHttp::api($accessToken)->get(
                    GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo)
                );
                if ($response->successful()) {
                    return $this->repoCard($response->json() ?? $last);
                }
            } catch (RequestException) {
                // Forks are often 404 until GitHub finishes copying.
            }

            usleep(400_000);
        }

        if ($last !== []) {
            return $this->repoCard($last);
        }

        throw new RuntimeException(__('dashboard.GitHub is still preparing the fork. Try again in a moment.'));
    }

    /**
     * @return array{ref: string, sha: string}|null
     */
    public function getRef(string $accessToken, string $owner, string $repo, string $branch): ?array
    {
        try {
            $response = GithubHttp::api($accessToken)->get(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/git/ref/heads/'.rawurlencode($branch)
            );
        } catch (RequestException $e) {
            if ($e->response?->status() === 404) {
                return null;
            }

            throw new RuntimeException($this->apiMessage($e, __('dashboard.Could not read the GitHub branch.')), previous: $e);
        }

        if ($response->status() === 404) {
            return null;
        }

        if (! $response->successful()) {
            throw new RuntimeException(__('dashboard.Could not read the GitHub branch.'));
        }

        $data = $response->json() ?? [];
        $sha = (string) ($data['object']['sha'] ?? '');
        $ref = (string) ($data['ref'] ?? '');
        if ($sha === '') {
            return null;
        }

        return ['ref' => $ref, 'sha' => $sha];
    }

    /**
     * @param  list<array{path: string, mode?: string, type?: string, content?: string, sha?: string}>  $tree
     */
    public function createTree(string $accessToken, string $owner, string $repo, array $tree, ?string $baseTree = null): string
    {
        $payload = ['tree' => $tree];
        if (filled($baseTree)) {
            $payload['base_tree'] = $baseTree;
        }

        try {
            $response = GithubHttp::api($accessToken)
                ->post(
                    GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/git/trees',
                    $payload,
                )
                ->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException($this->apiMessage($e, __('dashboard.Could not write the GitHub tree.')), previous: $e);
        }

        $sha = trim((string) ($response->json('sha') ?? ''));
        if ($sha === '') {
            throw new RuntimeException(__('dashboard.Could not write the GitHub tree.'));
        }

        return $sha;
    }

    /**
     * @param  list<string>  $parents
     */
    public function createCommit(
        string $accessToken,
        string $owner,
        string $repo,
        string $message,
        string $treeSha,
        array $parents = [],
    ): string {
        try {
            $response = GithubHttp::api($accessToken)
                ->post(
                    GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/git/commits',
                    [
                        'message' => $message,
                        'tree' => $treeSha,
                        'parents' => array_values($parents),
                    ],
                )
                ->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException($this->apiMessage($e, __('dashboard.Could not create the GitHub commit.')), previous: $e);
        }

        $sha = trim((string) ($response->json('sha') ?? ''));
        if ($sha === '') {
            throw new RuntimeException(__('dashboard.Could not create the GitHub commit.'));
        }

        return $sha;
    }

    public function createRef(string $accessToken, string $owner, string $repo, string $branch, string $sha): void
    {
        try {
            GithubHttp::api($accessToken)->post(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/git/refs',
                [
                    'ref' => 'refs/heads/'.$branch,
                    'sha' => $sha,
                ],
            )->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException($this->apiMessage($e, __('dashboard.Could not create the GitHub branch.')), previous: $e);
        }
    }

    public function updateRef(string $accessToken, string $owner, string $repo, string $branch, string $sha, bool $force = false): void
    {
        try {
            GithubHttp::api($accessToken)->patch(
                GithubHttp::apiBase().'/repos/'.rawurlencode($owner).'/'.rawurlencode($repo).'/git/refs/heads/'.rawurlencode($branch),
                [
                    'sha' => $sha,
                    'force' => $force,
                ],
            )->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException($this->apiMessage($e, __('dashboard.Could not update the GitHub branch. Pull first, or force push.')), previous: $e);
        }
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{name: string, full_name: string, html_url: string, default_branch: string, private: bool, fork: bool, owner: string}
     */
    private function repoCard(array $row): array
    {
        $fullName = (string) ($row['full_name'] ?? '');
        $owner = is_array($row['owner'] ?? null) ? (string) ($row['owner']['login'] ?? '') : '';
        if ($owner === '' && str_contains($fullName, '/')) {
            $owner = explode('/', $fullName, 2)[0];
        }

        $name = (string) ($row['name'] ?? '');
        if ($name === '' && str_contains($fullName, '/')) {
            $name = explode('/', $fullName, 2)[1];
        }

        return [
            'name' => $name,
            'full_name' => $fullName !== '' ? $fullName : $owner.'/'.$name,
            'html_url' => (string) ($row['html_url'] ?? ('https://github.com/'.$owner.'/'.$name)),
            'default_branch' => (string) ($row['default_branch'] ?? 'main'),
            'private' => (bool) ($row['private'] ?? false),
            'fork' => (bool) ($row['fork'] ?? false),
            'owner' => $owner,
        ];
    }

    private function apiMessage(RequestException $e, string $fallback): string
    {
        $json = $e->response?->json();
        $message = is_array($json) ? trim((string) ($json['message'] ?? '')) : '';

        return $message !== '' ? $message : $fallback;
    }

    private function relativeLabel(?string $iso8601): string
    {
        if ($iso8601 === null || $iso8601 === '') {
            return __('dashboard.Updated recently');
        }

        try {
            $ts = strtotime($iso8601);
        } catch (\Throwable) {
            return __('dashboard.Updated recently');
        }

        if ($ts === false) {
            return __('dashboard.Updated recently');
        }

        $delta = max(0, time() - $ts);

        if ($delta < 60) {
            return __('dashboard.Updated just now');
        }

        if ($delta < 3600) {
            $m = (int) floor($delta / 60);

            return $m === 1
                ? __('dashboard.Updated 1 min ago')
                : __('dashboard.Updated :count mins ago', ['count' => $m]);
        }

        if ($delta < 86400) {
            $h = (int) floor($delta / 3600);

            return $h === 1
                ? __('dashboard.Updated 1 hour ago')
                : __('dashboard.Updated :count hours ago', ['count' => $h]);
        }

        if ($delta < 86400 * 7) {
            $d = (int) floor($delta / 86400);

            return $d === 1
                ? __('dashboard.Updated 1 day ago')
                : __('dashboard.Updated :count days ago', ['count' => $d]);
        }

        return __('dashboard.Updated :date', ['date' => date('M j, Y', $ts)]);
    }
}
