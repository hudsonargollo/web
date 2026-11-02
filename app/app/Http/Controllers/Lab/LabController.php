<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Lab\LabProjectAccess;
use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use App\Support\Seo\PageSeo;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LabController extends Controller
{
    public function __invoke(Request $request, SiteWorkspace $workspaces, PageSeo $seo, ?LabProject $project = null): Response
    {
        // /lab has no {project} segment — the container still may inject a fresh
        // empty LabProject. Only route-bound (persisted) models are real.
        if ($project !== null && ! $project->exists) {
            $project = null;
        }

        $bootstrap = null;

        if ($project !== null) {
            LabProjectAccess::assertOwner($project, $request->user());
            $workspaces->ensure($project);
            $project->markOpened();
            $project->load('messages', 'githubRemote');
            $bootstrap = $project->toLabBootstrap();
        }

        $seo->page([
            'title' => is_array($bootstrap) && filled($bootstrap['title'] ?? null)
                ? (string) $bootstrap['title']
                : '',
        ]);

        return response()
            ->view('lab.lab', [
                'project' => $bootstrap,
                'workspace' => $request->routeIs('lab.workspace'),
            ])
            // DeepThought Engine: COOP enables isolation; credentialless COEP
            // avoids breaking Bunny fonts / Vite assets while still allowing SAB where supported.
            ->header('Cross-Origin-Opener-Policy', 'same-origin')
            ->header('Cross-Origin-Embedder-Policy', 'credentialless');
    }
}
