<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Lab\LabProjectAccess;
use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Throwable;

class LabFilesController extends Controller
{
    public function tree(Request $request, LabProject $project, SiteWorkspace $workspace): JsonResponse
    {
        LabProjectAccess::assertOwner($project, $request->user());

        try {
            $tree = $workspace->tree($project);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Could not load project files.'], 500);
        }

        return response()->json([
            'tree' => $tree,
            'pristine' => $workspace->isPristine($project),
            'kit_version' => $project->fresh()->kit_version,
            'stack' => $project->fresh()->stack,
            'workspace_status' => $project->fresh()->workspace_status,
        ]);
    }

    public function show(Request $request, LabProject $project, SiteWorkspace $workspace): JsonResponse
    {
        LabProjectAccess::assertOwner($project, $request->user());

        $path = (string) $request->query('path', '');

        try {
            $content = $workspace->read($project, $path);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Could not read file.'], 500);
        }

        return response()->json([
            'path' => ltrim(str_replace('\\', '/', $path), '/'),
            'content' => $content,
        ]);
    }

    /**
     * Bulk file read — avoids thousands of parallel GETs when hydrating Lab preview VFS.
     */
    public function batch(Request $request, LabProject $project, SiteWorkspace $workspace): JsonResponse
    {
        LabProjectAccess::assertOwner($project, $request->user());

        $validated = $request->validate([
            'paths' => ['required', 'array', 'min:1', 'max:250'],
            'paths.*' => ['required', 'string', 'max:500'],
        ]);

        /** @var list<string> $paths */
        $paths = array_values(array_unique(array_map('strval', $validated['paths'])));

        try {
            $files = $workspace->readMany($project, $paths);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Could not read files.'], 500);
        }

        return response()->json([
            'files' => $files,
        ]);
    }

    public function update(Request $request, LabProject $project, SiteWorkspace $workspace): JsonResponse
    {
        LabProjectAccess::assertWritable($project, $request->user());

        $validated = $request->validate([
            'path' => ['required', 'string', 'max:500'],
            // Empty bodies become null via ConvertEmptyStringsToNull (touch / blank files).
            'content' => ['present', 'nullable', 'string'],
        ]);

        try {
            $workspace->write($project, $validated['path'], (string) ($validated['content'] ?? ''));
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Could not write file.'], 500);
        }

        return response()->json([
            'path' => ltrim(str_replace('\\', '/', $validated['path']), '/'),
            'saved' => true,
        ]);
    }

    public function mkdir(Request $request, LabProject $project, SiteWorkspace $workspace): JsonResponse
    {
        LabProjectAccess::assertWritable($project, $request->user());

        $validated = $request->validate([
            'path' => ['required', 'string', 'max:500'],
        ]);

        try {
            $workspace->mkdir($project, $validated['path']);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Could not create directory.'], 500);
        }

        return response()->json([
            'path' => ltrim(str_replace('\\', '/', $validated['path']), '/'),
            'created' => true,
        ]);
    }

    public function destroy(Request $request, LabProject $project, SiteWorkspace $workspace): JsonResponse
    {
        LabProjectAccess::assertWritable($project, $request->user());

        $validated = $request->validate([
            'path' => ['required', 'string', 'max:500'],
        ]);

        try {
            $workspace->delete($project, $validated['path']);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Could not delete path.'], 500);
        }

        return response()->json([
            'path' => ltrim(str_replace('\\', '/', $validated['path']), '/'),
            'deleted' => true,
        ]);
    }

    /**
     * Atomic multi-file disk commit (staging transaction).
     */
    public function commit(Request $request, LabProject $project, SiteWorkspace $workspace): JsonResponse
    {
        LabProjectAccess::assertWritable($project, $request->user());

        $validated = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:80'],
            'files.*' => ['present', 'nullable', 'string'],
        ]);

        /** @var array<string, string|null> $files */
        $files = $validated['files'];
        $payload = [];
        foreach ($files as $path => $content) {
            $payload[(string) $path] = (string) ($content ?? '');
        }

        try {
            $paths = $workspace->commitAtomic($project, $payload);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Atomic disk commit failed.', 'rolled_back' => true], 500);
        }

        return response()->json([
            'committed' => true,
            'paths' => $paths,
            'atomic' => true,
        ]);
    }
}
