<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TotpService;
use App\Support\Auth\LoginRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class TwoFactorChallengeController extends Controller
{
    public function create(Request $request): View|RedirectResponse
    {
        if (! $this->hasValidLoginChallenge($request)) {
            $this->clearLoginChallenge($request);

            return redirect()->route('login');
        }

        return view('auth.twoFactorChallenge.twoFactorChallenge');
    }

    public function store(Request $request, TotpService $totp): RedirectResponse
    {
        if (! $this->hasValidLoginChallenge($request)) {
            $this->clearLoginChallenge($request);

            return redirect()->route('login');
        }

        $request->validate([
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $this->ensureIsNotRateLimited($request);

        /** @var User $user */
        $user = User::query()->findOrFail($request->session()->get('login.id'));

        $code = $request->string('code')->toString();
        $recoveryCode = $request->string('recovery_code')->toString();

        $valid = false;

        if ($code !== '' && filled($user->two_factor_secret)) {
            $timestep = $totp->matchingTimestep(
                $user->two_factor_secret,
                $code,
                lastTimestep: $user->two_factor_last_timestep
            );

            if ($timestep !== null) {
                $user->markTwoFactorTimestepUsed($timestep);
                $valid = true;
            }
        } elseif ($recoveryCode !== '') {
            $valid = $user->consumeRecoveryCode($recoveryCode);
        }

        if (! $valid) {
            RateLimiter::hit($this->throttleKey($request));

            throw ValidationException::withMessages([
                'code' => __('messages.The provided two factor authentication code was invalid.'),
            ]);
        }

        RateLimiter::clear($this->throttleKey($request));

        Auth::login($user, (bool) $request->session()->pull('login.remember'));
        $this->clearLoginChallenge($request);
        $request->session()->regenerate();

        return redirect()->intended(LoginRedirect::homeFor($user));
    }

    private function hasValidLoginChallenge(Request $request): bool
    {
        if (! $request->session()->has('login.id') || ! $request->session()->has('login.expires_at')) {
            return false;
        }

        return (int) $request->session()->get('login.expires_at') >= now()->getTimestamp();
    }

    private function clearLoginChallenge(Request $request): void
    {
        $request->session()->forget(['login.id', 'login.remember', 'login.expires_at']);
    }

    private function ensureIsNotRateLimited(Request $request): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey($request), 5)) {
            return;
        }

        $seconds = RateLimiter::availableIn($this->throttleKey($request));

        throw ValidationException::withMessages([
            'code' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    private function throttleKey(Request $request): string
    {
        return 'two-factor|'.$request->session()->get('login.id').'|'.$request->ip();
    }
}
