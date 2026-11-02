<?php

namespace App\Http\Controllers\Lab;

use App\Datastore\SupabaseLinkBroker;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Http\LocalReturnPath;
use App\Support\Seo\PageSeo;
use App\Support\Ui\Pulse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class LabSupabaseOAuthController extends Controller
{
    public function start(Request $request, SupabaseLinkBroker $broker): RedirectResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $popup = $request->boolean('popup');

        try {
            $begin = $broker->begin(
                $user,
                (string) $request->query('return', '/lab'),
                $popup,
            );
        } catch (RuntimeException $e) {
            if ($popup) {
                return redirect()->route('lab.oauth.supabase.return', [
                    'error' => 'not_configured',
                    'error_description' => $e->getMessage(),
                    'popup' => 1,
                ]);
            }

            return $this->bounceNotice(
                (string) $request->query('return', '/lab'),
                $e->getMessage(),
            );
        }

        return redirect()->away($begin['url']);
    }

    public function return(Request $request, SupabaseLinkBroker $broker, PageSeo $seo): RedirectResponse|Response
    {
        $state = (string) $request->query('state', '');
        $handshake = $broker->handshake($state);
        $popup = (bool) ($handshake['popup'] ?? false) || $request->boolean('popup');
        $returnPath = (string) ($handshake['return'] ?? '/lab');

        $user = $request->user();
        if ($user === null && ($handshake['user_id'] ?? null) !== null) {
            $user = User::query()->find((int) $handshake['user_id']);
        }

        if ($request->filled('error')) {
            $broker->forgetHandshake($state);
            $message = (string) $request->query('error_description', $request->query('error'));
            $copy = $message !== '' ? $message : __('dashboard.Supabase authorization was cancelled.');

            return $popup
                ? $this->popupPage($seo, false, $copy)
                : $this->bounceNotice($returnPath, $copy);
        }

        if ($user === null) {
            $copy = __('dashboard.Supabase authorization state was invalid.');

            return $popup
                ? $this->popupPage($seo, false, $copy)
                : $this->bounceNotice($returnPath, $copy);
        }

        try {
            $broker->complete($user, (string) $request->query('code', ''), $state);
        } catch (InvalidArgumentException|RuntimeException $e) {
            return $popup
                ? $this->popupPage($seo, false, $e->getMessage())
                : $this->bounceNotice($returnPath, $e->getMessage());
        } catch (Throwable $e) {
            report($e);
            $copy = __('dashboard.Could not complete Supabase authorization.');

            return $popup
                ? $this->popupPage($seo, false, $copy)
                : $this->bounceNotice($returnPath, $copy);
        }

        return $popup
            ? $this->popupPage($seo, true, '')
            : $this->bounceNotice($returnPath, __('settings.Supabase connected.'), true);
    }

    private function popupPage(PageSeo $seo, bool $ok, string $message): Response
    {
        $seo->page(['title' => 'Supabase']);

        return response()->view('lab.oauth.popup.popup', [
            'ok' => $ok,
            'message' => $message,
        ]);
    }

    private function bounceNotice(string $path, string $copy, bool $ok = false): RedirectResponse
    {
        $path = LocalReturnPath::deskOrLab($path);

        if ($ok) {
            Pulse::ok($copy);

            return redirect(str_starts_with($path, '/settings') ? $path : $this->withOpenFlag($path));
        }

        Pulse::fail($copy);

        if (str_starts_with($path, '/settings')) {
            return redirect($path);
        }

        return redirect($this->withOauthNotice($path, $copy));
    }

    private function withOpenFlag(string $path): string
    {
        $path = $path === '' ? '/lab' : $path;
        if (! str_contains($path, 'datastore=1')) {
            $separator = str_contains($path, '?') ? '&' : '?';
            $path .= $separator.'datastore=1';
        }

        return $path;
    }

    private function withOauthNotice(string $path, string $message): string
    {
        $path = $this->withOpenFlag($path);
        $message = trim($message);
        if ($message === '') {
            return $path;
        }

        return $path.'&oauth_error='.rawurlencode(mb_substr($message, 0, 300));
    }
}
