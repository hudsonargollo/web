<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Lab\LabProjectAccess;
use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Persist / serve the Studio card thumbnail captured from a live Lab preview.
 */
class LabCoverController extends Controller
{
    public function show(Request $request, LabProject $project, SiteWorkspace $workspace): BinaryFileResponse
    {
        LabProjectAccess::assertOwner($project, $request->user());

        $path = $workspace->coverPath($project);
        if ($path === null) {
            abort(404);
        }

        $mime = $workspace->coverMime($project) ?: 'image/jpeg';

        return response()->file($path, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function update(Request $request, LabProject $project, SiteWorkspace $workspace): JsonResponse
    {
        LabProjectAccess::assertWritable($project, $request->user());

        $request->validate([
            'cover' => ['required', 'file', 'max:1536', 'mimetypes:image/jpeg,image/png,image/webp'],
        ]);

        $file = $request->file('cover');
        $binary = (string) file_get_contents($file->getRealPath());
        $info = @getimagesizefromstring($binary);

        if ($info === false || ($info[0] ?? 0) < 32 || ($info[1] ?? 0) < 32) {
            return response()->json(['message' => 'Cover image is empty or unreadable.'], 422);
        }

        if (($info[0] ?? 0) > 2560 || ($info[1] ?? 0) > 2560) {
            return response()->json(['message' => 'Cover image is too large.'], 422);
        }

        $ext = match ($info['mime'] ?? '') {
            'image/webp' => 'webp',
            'image/png' => 'png',
            'image/jpeg' => 'jpg',
            default => null,
        };

        if ($ext === null) {
            return response()->json(['message' => 'Cover image type is not supported.'], 422);
        }

        $workspace->putCover($project, $binary, $ext);

        return response()->json([
            'saved' => true,
        ]);
    }
}
