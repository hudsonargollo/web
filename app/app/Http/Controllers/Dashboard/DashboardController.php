<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Support\Workspace\WorkspacePulse;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __invoke(WorkspacePulse $pulse): View
    {
        $user = auth()->user();

        return view('dashboard.home.home', $pulse->for($user));
    }
}
