<?php

namespace App\Http\Controllers\Studio;

use App\Http\Controllers\Controller;
use App\Lab\StudioProjectDesk;
use App\Models\LabProject;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProjectExportController extends Controller
{
    public function __invoke(Request $request, LabProject $project, StudioProjectDesk $desk): BinaryFileResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        return $desk->exportZip($user, $project);
    }
}
