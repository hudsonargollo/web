<?php

namespace App\Lab\Github;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Integrations\Github\GithubLinkBroker;
use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use App\Models\LabProjectRemote;
use App\Models\User;
use InvalidArgumentException;
use RuntimeException;

/**
 * Per-project GitHub remote: link, create, fork, tree-vs, push, pull.
 * Uses the Git Data API (no git CLI) so shared hosts can still ship.
 */
final class GithubDesk
{
    public function __construct(
        private readonly GithubLinkBroker $broker,
        private readonly GithubApiClient $api,
        private readonly GithubRepoImporter $importer,
        private readonly SiteWorkspace $workspaces,
        private readonly EntitlementGate $entitlements,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function status(User $user, LabProject $project, bool $withCompare = false): array
    {
        $oauthReady = $this->broker->isOauthReady();
        $link = $this->broker->linkFor($user);
        $remote = $this->remoteFor($project);
        $payload = [
            'oauth_ready' => $oauthReady,
            'entitled' => $this->entitlements->allows($user, EntitlementCatalog::GITHUB_IMPORT),
            'linked' => $link !== null,
            'connected' => $link !== null,
            'connect_url' => $oauthReady && $link === null
                ? route('lab.vcs.github.start', ['return' => '/lab/'.$project->uuid])
                : null,
            'account' => $link === null ? null : [
                'login' => $link->login,
                'avatar_url' => $link->avatar_url,
            ],
            'remote' => $remote?->toLabPayload(),
            'compare' => null,
        ];

        if ($withCompare && $link !== null && $remote !== null) {
            try {
                $payload['compare'] = $this->compare($user, $project);
            } catch (RuntimeException) {
                $payload['compare'] = null;
            }
        }

        return $payload;
    }

    /**
     * Local workspace vs the GitHub git tree (blob SHAs).
     *
     * @param  string|null  $pathPrefix  Optional workspace path prefix to filter the diff.
     * @return array{
     *     added: list<string>,
     *     removed: list<string>,
     *     modified: list<string>,
     *     same: int,
     *     branch: string,
     *     commit_sha: ?string,
     *     html_url: string
     * }
     */
    public function compare(User $user, LabProject $project, ?string $pathPrefix = null): array
    {
        $this->assertReady($user);
        $token = $this->token($user);
        $remote = $this->requireRemote($project);
        $local = $this->localBlobs($project);
        $commitSha = null;
        $remoteBlobs = [];

        try {
            $commitSha = $this->api->resolveCommitSha($remote->owner, $remote->repo, $remote->branch, $token);
            $tree = $this->api->fetchRecursiveTree($remote->owner, $remote->repo, $commitSha, $token);
            $prefix = trim((string) $remote->root_directory, '/');
            $prefixSlash = $prefix !== '' ? $prefix.'/' : '';

            foreach ($tree as $entry) {
                if (($entry['type'] ?? '') !== 'blob') {
                    continue;
                }
                $path = (string) ($entry['path'] ?? '');
                if ($prefix !== '') {
                    if ($path === $prefix || ! str_starts_with($path, $prefixSlash)) {
                        continue;
                    }
                    $path = substr($path, strlen($prefixSlash));
                }
                if ($path === '') {
                    continue;
                }
                $remoteBlobs[$path] = (string) ($entry['sha'] ?? '');
            }
        } catch (RuntimeException) {
            $remoteBlobs = [];
        }

        $added = [];
        $modified = [];
        $same = 0;

        foreach ($local as $path => $sha) {
            if (! isset($remoteBlobs[$path])) {
                $added[] = $path;

                continue;
            }
            if ($remoteBlobs[$path] !== $sha) {
                $modified[] = $path;
            } else {
                $same++;
            }
        }

        $removed = [];
        foreach ($remoteBlobs as $path => $sha) {
            if (! isset($local[$path])) {
                $removed[] = $path;
            }
        }

        sort($added);
        sort($modified);
        sort($removed);

        $filter = trim(str_replace('\\', '/', (string) $pathPrefix), '/');
        if ($filter !== '') {
            $matches = static fn (string $path): bool => $path === $filter
                || str_starts_with($path, $filter.'/');
            $added = array_values(array_filter($added, $matches));
            $modified = array_values(array_filter($modified, $matches));
            $removed = array_values(array_filter($removed, $matches));
        }

        return [
            'added' => $added,
            'removed' => $removed,
            'modified' => $modified,
            'same' => $same,
            'branch' => $remote->branch,
            'commit_sha' => $commitSha,
            'html_url' => $remote->html_url ?: 'https://github.com/'.$remote->fullName(),
            'ahead' => count($added) + count($modified),
            'behind' => count($removed),
            'clean' => $added === [] && $removed === [] && $modified === [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function link(
        User $user,
        LabProject $project,
        string $owner,
        string $repo,
        ?string $branch = null,
        ?string $rootDirectory = null,
        ?string $forkedFrom = null,
    ): array {
        $this->assertReady($user);
        $parsed = GithubRepoUrl::parse($owner.'/'.$repo);
        $token = $this->token($user);
        $branch = trim((string) $branch);
        if ($branch === '') {
            $branch = $this->api->defaultBranch($parsed['owner'], $parsed['repo'], $token);
        }

        $remote = $this->remember($project, $parsed['owner'], $parsed['repo'], $branch, $rootDirectory, $forkedFrom);

        return $this->status($user, $project, withCompare: true) + [
            'linked_remote' => true,
            'remote' => $remote->toLabPayload(),
        ];
    }

    public function unlinkRemote(LabProject $project): void
    {
        LabProjectRemote::query()
            ->where('lab_project_id', $project->id)
            ->where('driver', LabProjectRemote::DRIVER_GITHUB)
            ->delete();
    }

    /**
     * @return array<string, mixed>
     */
    public function createRepository(
        User $user,
        LabProject $project,
        string $name,
        bool $private = true,
        string $description = '',
        bool $push = true,
    ): array {
        $this->assertReady($user);
        $token = $this->token($user);
        $slug = $this->safeRepoName($name !== '' ? $name : (string) $project->title);
        $card = $this->api->createRepository($token, $slug, $private, $description);
        $remote = $this->remember(
            $project,
            $card['owner'],
            $card['name'],
            $card['default_branch'] !== '' ? $card['default_branch'] : 'main',
        );

        $pushed = null;
        if ($push) {
            try {
                $pushed = $this->push($user, $project, 'Initial commit from Krikkit Lab');
            } catch (RuntimeException $e) {
                $pushed = ['ok' => false, 'message' => $e->getMessage()];
            }
        }

        return $this->status($user, $project) + [
            'created' => true,
            'remote' => $remote->fresh()?->toLabPayload() ?? $remote->toLabPayload(),
            'push' => $pushed,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function fork(
        User $user,
        string $owner,
        string $repo,
        ?LabProject $project = null,
        bool $import = false,
        ?string $branch = null,
    ): array {
        $this->assertReady($user);
        $parsed = GithubRepoUrl::parse($owner.'/'.$repo);
        $token = $this->token($user);
        $card = $this->api->forkRepository($token, $parsed['owner'], $parsed['repo']);
        $source = $parsed['owner'].'/'.$parsed['repo'];
        $forkBranch = filled($branch) ? (string) $branch : $card['default_branch'];

        $imported = null;
        if ($project instanceof LabProject) {
            $this->remember(
                $project,
                $card['owner'],
                $card['name'],
                $forkBranch !== '' ? $forkBranch : 'main',
                null,
                $source,
            );
            if ($import) {
                $imported = $this->importer->import(
                    $project,
                    $card['owner'],
                    $card['name'],
                    $forkBranch,
                    $token,
                );
            }
        }

        return [
            'forked' => true,
            'source' => $source,
            'owner' => $card['owner'],
            'repo' => $card['name'],
            'full_name' => $card['full_name'],
            'html_url' => $card['html_url'],
            'branch' => $forkBranch,
            'imported' => $imported,
            'status' => $project instanceof LabProject ? $this->status($user, $project) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function push(User $user, LabProject $project, string $message = '', bool $force = false): array
    {
        $this->assertReady($user);
        $token = $this->token($user);
        $remote = $this->requireRemote($project);
        $files = $this->workspaces->collectPushFiles($project);
        if ($files === []) {
            throw new RuntimeException(__('dashboard.Nothing to push — the workspace has no text files.'));
        }

        $prefix = trim((string) $remote->root_directory, '/');
        $tree = [];
        foreach ($files as $path => $content) {
            $remotePath = $prefix !== '' ? $prefix.'/'.$path : $path;
            $tree[] = [
                'path' => $remotePath,
                'mode' => '100644',
                'type' => 'blob',
                'content' => $content,
            ];
        }

        $parent = $this->api->getRef($token, $remote->owner, $remote->repo, $remote->branch);
        $baseTree = null;
        $parents = [];
        if ($parent !== null) {
            $parents[] = $parent['sha'];
            // Keep sibling paths when pushing into a monorepo prefix.
            if ($prefix !== '') {
                try {
                    $baseTree = $this->api->commitTreeSha($remote->owner, $remote->repo, $parent['sha'], $token);
                } catch (RuntimeException) {
                    $baseTree = null;
                }
            }
        }

        $treeSha = $this->api->createTree($token, $remote->owner, $remote->repo, $tree, $baseTree);
        $commitMessage = trim($message) !== '' ? trim($message) : 'Update from Krikkit Lab';
        $commitSha = $this->api->createCommit(
            $token,
            $remote->owner,
            $remote->repo,
            $commitMessage,
            $treeSha,
            $parents,
        );

        if ($parent === null) {
            $this->api->createRef($token, $remote->owner, $remote->repo, $remote->branch, $commitSha);
        } else {
            $this->api->updateRef($token, $remote->owner, $remote->repo, $remote->branch, $commitSha, $force);
        }

        $remote->forceFill([
            'last_pushed_sha' => $commitSha,
            'last_synced_at' => now(),
            'html_url' => $remote->html_url ?: 'https://github.com/'.$remote->fullName(),
        ])->save();

        return [
            'ok' => true,
            'sha' => $commitSha,
            'files' => count($files),
            'branch' => $remote->branch,
            'html_url' => 'https://github.com/'.$remote->fullName().'/commit/'.$commitSha,
            'compare' => $this->compareQuiet($user, $project),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function pull(User $user, LabProject $project, ?string $branch = null): array
    {
        $this->assertReady($user);
        $token = $this->token($user);
        $remote = $this->requireRemote($project);
        $targetBranch = trim((string) $branch);
        if ($targetBranch === '') {
            $targetBranch = (string) $remote->branch;
        }
        $result = $this->importer->import(
            $project,
            $remote->owner,
            $remote->repo,
            $targetBranch !== '' ? $targetBranch : 'main',
            $token,
            $remote->root_directory,
        );

        try {
            $sha = $this->api->resolveCommitSha($remote->owner, $remote->repo, $targetBranch !== '' ? $targetBranch : 'main', $token);
        } catch (RuntimeException) {
            $sha = null;
        }

        $remote->forceFill([
            'last_pulled_sha' => $sha,
            'last_synced_at' => now(),
        ])->save();

        return [
            'ok' => true,
            'imported' => $result,
            'compare' => $this->compareQuiet($user, $project),
            'tree' => $this->workspaces->tree($project),
        ];
    }

    public function remember(
        LabProject $project,
        string $owner,
        string $repo,
        string $branch = 'main',
        ?string $rootDirectory = null,
        ?string $forkedFrom = null,
    ): LabProjectRemote {
        $root = trim(str_replace('\\', '/', (string) $rootDirectory), '/');
        if (str_contains($root, '..')) {
            throw new InvalidArgumentException(__('dashboard.Enter a valid GitHub repository URL (https://github.com/owner/repo).'));
        }

        $remote = LabProjectRemote::query()->firstOrNew([
            'lab_project_id' => $project->id,
            'driver' => LabProjectRemote::DRIVER_GITHUB,
        ]);

        $remote->fill([
            'owner' => $owner,
            'repo' => $repo,
            'branch' => $branch !== '' ? $branch : 'main',
            'root_directory' => $root !== '' ? $root : null,
            'html_url' => 'https://github.com/'.$owner.'/'.$repo,
            'forked_from' => $forkedFrom,
        ]);
        $remote->save();

        return $remote;
    }

    private function remoteFor(LabProject $project): ?LabProjectRemote
    {
        return $project->githubRemote()->first()
            ?? LabProjectRemote::query()
                ->where('lab_project_id', $project->id)
                ->where('driver', LabProjectRemote::DRIVER_GITHUB)
                ->first();
    }

    private function requireRemote(LabProject $project): LabProjectRemote
    {
        $remote = $this->remoteFor($project);
        if ($remote === null) {
            throw new RuntimeException(__('dashboard.Link a GitHub repository first.'));
        }

        return $remote;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function compareQuiet(User $user, LabProject $project): ?array
    {
        try {
            return $this->compare($user, $project->fresh() ?? $project);
        } catch (RuntimeException) {
            return null;
        }
    }

    private function assertReady(User $user): void
    {
        $this->entitlements->assertFeature($user, EntitlementCatalog::GITHUB_IMPORT);

        if (! $this->broker->isOauthReady()) {
            throw new RuntimeException(__('dashboard.GitHub OAuth is not configured.'));
        }

        if ($this->broker->tokenFor($user) === null) {
            throw new RuntimeException(__('dashboard.Connect GitHub to continue.'));
        }
    }

    private function token(User $user): string
    {
        $token = $this->broker->tokenFor($user);
        if ($token === null) {
            throw new RuntimeException(__('dashboard.Connect GitHub to continue.'));
        }

        return $token;
    }

    /**
     * @return array<string, string> path → git blob sha
     */
    private function localBlobs(LabProject $project): array
    {
        $out = [];
        foreach ($this->workspaces->collectPushFiles($project) as $path => $content) {
            $out[$path] = $this->gitBlobSha($content);
        }

        return $out;
    }

    private function gitBlobSha(string $content): string
    {
        return sha1('blob '.strlen($content)."\0".$content);
    }

    private function safeRepoName(string $name): string
    {
        $slug = strtolower(trim($name));
        $slug = preg_replace('/[^a-z0-9._-]+/', '-', $slug) ?? 'lab-site';
        $slug = trim($slug, '.-');
        if ($slug === '') {
            $slug = 'lab-site';
        }

        return mb_substr($slug, 0, 80);
    }
}
