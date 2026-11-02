<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Support\Auth\LoginRedirect;
use App\Support\OpaqueEmailToken;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class VerifyEmailController extends Controller
{
    public function __invoke(Request $request, string $token): RedirectResponse
    {
        try {
            $payload = OpaqueEmailToken::open($token);
        } catch (Throwable) {
            abort(403);
        }

        $user = $request->user();

        if ((string) $user->getKey() !== (string) $payload['id']) {
            abort(403);
        }

        if (! hash_equals((string) $payload['email'], sha1($user->getEmailForVerification()))) {
            abort(403);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();

            if ($user->statusEnum() === UserStatus::Invited) {
                $user->forceFill(['status' => UserStatus::Active])->save();
            }

            event(new Verified($user));
        }

        return redirect()->intended(LoginRedirect::homeFor($user));
    }
}
