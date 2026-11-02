<?php

namespace App\Http\Controllers\Lab;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Http\Controllers\Controller;
use App\Integrations\Github\GithubLinkBroker;
use App\Lab\Github\GithubApiClient;
use App\Lab\Github\GithubDesk;
use App\Lab\Github\GithubRepoImporter;
use App\Lab\Github\GithubRepoUrl;
use App\Lab\LabProjectAccess;
use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class LabGithubController extends Controller
{
    public function accounts(Request $request, GithubLinkBroker $broker): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $oauthReady = $broker->isOauthReady();
        $link = $broker->linkFor($user);

        if ($link === null) {
            return response()->json([
                'oauth_ready' => $oauthReady,
                'linked' => false,
                'connected' => false,
                'accounts' => [],
                'connect_url' => $oauthReady ? route('lab.vcs.github.start', ['return' => '/lab']) : null,
            ]);
        }

        return response()->json([
            'oauth_ready' => $oauthReady,
            'linked' => true,
            'connected' => true,
            'accounts' => [[
                'id' => $link->login,
                'login' => $link->login,
                'name' => $link->login,
                'avatar_url' => $link->avatar_url,
            ]],
            'connect_url' => null,
        ]);
    }

    public function repositories(Request $request, GithubLinkBroker $broker, GithubApiClient $api): JsonResponse
    {
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
                'connected' => false,
                'repositories' => [],
            ]);
        }

        try {
            $repos = $api->listRepositories(
                accessToken: $token,
                query: (string) ($validated['q'] ?? ''),
                page: (int) ($validated['page'] ?? 1),
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => __('dashboard.Could not load GitHub repositories.')], 502);
        }

        return response()->json([
            'oauth_ready' => true,
            'linked' => true,
            'connected' => true,
            'repositories' => $repos,
        ]);
    }

    public function branches(Request $request, GithubLinkBroker $broker, GithubApiClient $api): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'owner' => ['required', 'string', 'max:100'],
            'repo' => ['required', 'string', 'max:100'],
        ]);

        $token = $broker->tokenFor($user);
        if ($token === null) {
            return response()->json([
                'branches' => [],
                'message' => __('dashboard.Connect GitHub to continue.'),
            ], 422);
        }

        try {
            $branches = $api->listBranches($token, $validated['owner'], $validated['repo']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => __('dashboard.Could not load GitHub repositories.')], 502);
        }

        return response()->json([
            'branches' => $branches,
        ]);
    }

    public function import(
        Request $request,
        GithubLinkBroker $broker,
        GithubRepoImporter $importer,
        SiteWorkspace $workspace,
        EntitlementGate $entitlements,
    ): JsonResponse {
        $validated = $request->validate([
            'url' => ['nullable', 'string', 'max:500'],
            'owner' => ['nullable', 'string', 'max:100'],
            'repo' => ['nullable', 'string', 'max:100'],
            'branch' => ['nullable', 'string', 'max:200'],
            'root_directory' => ['nullable', 'string', 'max:240'],
            'first_prompt' => ['nullable', 'string', 'max:4000'],
            'project_uuid' => ['nullable', 'string', 'max:64'],
        ]);

        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $fromUrl = filled($validated['url'] ?? null);
        $fromPicker = filled($validated['owner'] ?? null) && filled($validated['repo'] ?? null);

        try {
            if ($fromUrl) {
                $parsed = GithubRepoUrl::parse((string) $validated['url']);
            } elseif ($fromPicker) {
                $parsed = GithubRepoUrl::parse($validated['owner'].'/'.$validated['repo']);
            } else {
                return response()->json([
                    'message' => __('dashboard.Enter a public GitHub repository URL.'),
                ], 422);
            }
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Picker imports require the user's OAuth token; URL imports stay public.
        $accessToken = $fromPicker ? $broker->tokenFor($user) : null;
        if ($fromPicker && $accessToken === null) {
            return response()->json([
                'message' => __('dashboard.Connect GitHub to continue.'),
            ], 422);
        }

        $branch = filled($validated['branch'] ?? null) ? (string) $validated['branch'] : null;
        $rootDirectory = filled($validated['root_directory'] ?? null) ? (string) $validated['root_directory'] : null;
        $firstPrompt = filled($validated['first_prompt'] ?? null) ? trim((string) $validated['first_prompt']) : null;

        $entitlements->assertFeature($user, EntitlementCatalog::GITHUB_IMPORT);

        try {
            $project = $this->resolveProject(
                $user->id,
                $validated['project_uuid'] ?? null,
                $parsed['repo'],
            );
            $workspace->resetForImport($project);
            $result = $importer->import(
                $project,
                $parsed['owner'],
                $parsed['repo'],
                $branch,
                $fromPicker ? $accessToken : null,
                $rootDirectory,
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => __('dashboard.Could not import repository.'),
            ], 500);
        }

        $project = $project->fresh(['messages']);

        try {
            app(GithubDesk::class)->remember(
                $project,
                $result['owner'],
                $result['repo'],
                $branch ?: 'main',
                $result['root'] ?? $rootDirectory,
            );
            $project->load('githubRemote');
        } catch (Throwable) {
            // Import succeeded even if the remote row could not be stored.
        }

        return response()->json([
            'imported' => true,
            'message' => __('dashboard.Repository imported.'),
            'owner' => $result['owner'],
            'repo' => $result['repo'],
            'paths' => $result['paths'],
            'skipped' => $result['skipped'],
            'first_prompt' => $firstPrompt,
            'open_workspace' => true,
            'project' => $project->toLabBootstrap(),
            'pristine' => $workspace->isPristine($project),
            'tree' => $workspace->tree($project),
        ]);
    }

    private function resolveProject(int $userId, ?string $projectUuid, string $repoName): LabProject
    {
        $user = request()->user();

        if (filled($projectUuid)) {
            $existing = LabProject::query()->where('uuid', $projectUuid)->first();

            if ($existing !== null) {
                LabProjectAccess::assertWritable($existing, $user);

                return $existing;
            }
        }

        app(EntitlementGate::class)->assertQuota($user, EntitlementCatalog::PROJECTS);

        $title = trim($repoName);
        if ($title === '') {
            $title = 'GitHub import';
        }

        return LabProject::query()->create([
            'title' => mb_substr($title, 0, 120),
            'notes' => 'github-import',
            'user_id' => $userId,
            'workspace_status' => 'pending',
            'stack' => SiteWorkspace::STACK,
        ]);
    }
}
