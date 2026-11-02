<?php

namespace App\Http\Controllers\Lab;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Http\Controllers\Controller;
use App\Integrations\Github\GithubLinkBroker;
use App\Lab\Github\GithubApiClient;
use App\Lab\Github\GithubDesk;
use App\Lab\Github\GithubRepoUrl;
use App\Lab\LabProjectAccess;
use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class LabGithubRemoteController extends Controller
{
    public function show(
        Request $request,
        LabProject $project,
        GithubDesk $desk,
        EntitlementGate $entitlements,
    ): JsonResponse {
        $user = $request->user();
        LabProjectAccess::assertOwner($project, $user);
        $entitlements->assertFeature($user, EntitlementCatalog::GITHUB_IMPORT);

        try {
            return response()->json($desk->status($user, $project, withCompare: true));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function compare(Request $request, LabProject $project, GithubDesk $desk): JsonResponse
    {
        $user = $request->user();
        LabProjectAccess::assertOwner($project, $user);

        try {
            $prefix = trim((string) $request->query('path_prefix', ''));

            return response()->json([
                'compare' => $desk->compare($user, $project, $prefix !== '' ? $prefix : null),
                'status' => $desk->status($user, $project),
            ]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function link(Request $request, LabProject $project, GithubDesk $desk): JsonResponse
    {
        $user = $request->user();
        LabProjectAccess::assertWritable($project, $user);

        $validated = $request->validate([
            'owner' => ['nullable', 'string', 'max:100'],
            'repo' => ['nullable', 'string', 'max:100'],
            'url' => ['nullable', 'string', 'max:500'],
            'branch' => ['nullable', 'string', 'max:200'],
            'root_directory' => ['nullable', 'string', 'max:240'],
        ]);

        try {
            $parsed = $this->parseRepo($validated);
            $payload = $desk->link(
                $user,
                $project,
                $parsed['owner'],
                $parsed['repo'],
                $validated['branch'] ?? null,
                $validated['root_directory'] ?? null,
            );
        } catch (InvalidArgumentException|RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($payload);
    }

    public function unlink(Request $request, LabProject $project, GithubDesk $desk): JsonResponse
    {
        $user = $request->user();
        LabProjectAccess::assertWritable($project, $user);
        $desk->unlinkRemote($project);

        return response()->json($desk->status($user, $project));
    }

    public function createRepo(Request $request, LabProject $project, GithubDesk $desk): JsonResponse
    {
        $user = $request->user();
        LabProjectAccess::assertWritable($project, $user);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:80'],
            'private' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
            'push' => ['nullable', 'boolean'],
        ]);

        try {
            return response()->json($desk->createRepository(
                $user,
                $project,
                (string) ($validated['name'] ?? $project->title ?? 'lab-site'),
                (bool) ($validated['private'] ?? true),
                (string) ($validated['description'] ?? ''),
                (bool) ($validated['push'] ?? true),
            ));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => __('dashboard.Could not create the GitHub repository.')], 500);
        }
    }

    public function fork(
        Request $request,
        GithubDesk $desk,
        ?LabProject $project = null,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($project instanceof LabProject && $project->exists) {
            LabProjectAccess::assertWritable($project, $user);
        } else {
            $project = null;
        }

        $validated = $request->validate([
            'owner' => ['nullable', 'string', 'max:100'],
            'repo' => ['nullable', 'string', 'max:100'],
            'url' => ['nullable', 'string', 'max:500'],
            'branch' => ['nullable', 'string', 'max:200'],
            'import' => ['nullable', 'boolean'],
        ]);

        try {
            $parsed = $this->parseRepo($validated);
            $payload = $desk->fork(
                $user,
                $parsed['owner'],
                $parsed['repo'],
                $project,
                (bool) ($validated['import'] ?? false),
                $validated['branch'] ?? null,
            );
        } catch (InvalidArgumentException|RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => __('dashboard.Could not fork the GitHub repository.')], 500);
        }

        if ($project instanceof LabProject) {
            $payload['project'] = $project->fresh(['messages', 'githubRemote'])?->toLabBootstrap();
            $payload['tree'] = app(SiteWorkspace::class)->tree($project);
        }

        return response()->json($payload);
    }

    public function push(Request $request, LabProject $project, GithubDesk $desk): JsonResponse
    {
        $user = $request->user();
        LabProjectAccess::assertWritable($project, $user);

        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:500'],
            'force' => ['nullable', 'boolean'],
        ]);

        try {
            return response()->json($desk->push(
                $user,
                $project,
                (string) ($validated['message'] ?? ''),
                (bool) ($validated['force'] ?? false),
            ));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => __('dashboard.Could not push to GitHub.')], 500);
        }
    }

    public function pull(Request $request, LabProject $project, GithubDesk $desk): JsonResponse
    {
        $user = $request->user();
        LabProjectAccess::assertWritable($project, $user);

        try {
            $validated = $request->validate([
                'branch' => ['nullable', 'string', 'max:200'],
            ]);
            $payload = $desk->pull($user, $project, $validated['branch'] ?? null);
            $payload['project'] = $project->fresh(['messages', 'githubRemote'])?->toLabBootstrap();

            return response()->json($payload);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => __('dashboard.Could not pull from GitHub.')], 500);
        }
    }

    public function repositories(
        Request $request,
        GithubLinkBroker $broker,
        GithubApiClient $api,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $token = $broker->tokenFor($user);
        if ($token === null) {
            return response()->json([
                'oauth_ready' => $broker->isOauthReady(),
                'linked' => false,
                'repositories' => [],
            ]);
        }

        try {
            $repos = $api->listRepositories(
                accessToken: $token,
                query: (string) ($validated['q'] ?? ''),
                page: (int) ($validated['page'] ?? 1),
                labOnly: false,
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'oauth_ready' => true,
            'linked' => true,
            'repositories' => $repos,
        ]);
    }

    /**
     * @param  array{owner?: string|null, repo?: string|null, url?: string|null}  $validated
     * @return array{owner: string, repo: string}
     */
    private function parseRepo(array $validated): array
    {
        if (filled($validated['url'] ?? null)) {
            return GithubRepoUrl::parse((string) $validated['url']);
        }

        if (filled($validated['owner'] ?? null) && filled($validated['repo'] ?? null)) {
            return GithubRepoUrl::parse($validated['owner'].'/'.$validated['repo']);
        }

        throw new InvalidArgumentException(__('dashboard.Enter a public GitHub repository URL.'));
    }
}
