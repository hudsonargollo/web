<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\AccessRole;
use App\Models\User;
use App\Support\Site\SiteSettings;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class RegisteredUserController extends Controller
{
    public function create(SiteSettings $site): View
    {
        abort_unless($site->allowRegistration(), 404);

        return view('auth.register.register');
    }

    public function store(RegisterRequest $request, SiteSettings $site): RedirectResponse
    {
        abort_unless($site->allowRegistration(), 404);

        $memberRoleId = AccessRole::query()->where('slug', 'member')->value('id');

        $user = User::create([
            ...$request->validated(),
            'access_role_id' => $memberRoleId,
            'status' => UserStatus::Invited,
        ]);

        event(new Registered($user));

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('home');
    }
}
