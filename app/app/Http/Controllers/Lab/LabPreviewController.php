<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Lab\LabProjectAccess;
use App\Models\LabProject;
use App\Support\Seo\PageSeo;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Private full-page preview for a Lab project. Public hosting is Lab → Publish.
 */
class LabPreviewController extends Controller
{
    public function __invoke(Request $request, LabProject $project, PageSeo $seo): Response
    {
        LabProjectAccess::assertOwner($project, $request->user());

        $seo->page([
            'title' => filled($project->title) ? $project->title : __('dashboard.Preview'),
        ]);

        return response()
            ->view('lab.preview.preview', [
                'project' => [
                    'uuid' => $project->uuid,
                    'title' => $project->title,
                ],
                'guestPath' => self::sanitizeGuestPath($request->query('path')),
            ])
            ->header('Cross-Origin-Opener-Policy', 'same-origin')
            ->header('Cross-Origin-Embedder-Policy', 'credentialless');
    }

    private static function sanitizeGuestPath(mixed $raw): string
    {
        $path = trim((string) $raw);
        if ($path === '') {
            return '/';
        }

        if (str_contains($path, '://') || str_starts_with($path, '//')) {
            return '/';
        }

        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        return $path;
    }
}
