<?php

namespace App\Support\Auth;

use App\Models\User;

final class LoginRedirect
{
    public static function homeFor(User $user): string
    {
        return $user->isWorkspaceAdmin()
            ? route('dashboard.home')
            : route('home');
    }
}
