<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Integrations\Github\GithubLinkBroker;
use App\Support\Http\LocalReturnPath;
use App\Support\Ui\Pulse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class LabGithubVcsController extends Controller
{
    public function start(Request $request, GithubLinkBroker $broker): RedirectResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $return = (string) $request->query('return', '/lab');

        try {
            $begin = $broker->begin($user, $return);
        } catch (RuntimeException $e) {
            return Pulse::bounceFail(LocalReturnPath::deskOrLab($return), $e->getMessage());
        }

        return redirect()->away($begin['url']);
    }

    public function return(Request $request, GithubLinkBroker $broker): RedirectResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $returnPath = $broker->consumeReturnPath();

        if ($request->filled('error')) {
            $message = (string) $request->query('error_description', $request->query('error'));

            return Pulse::bounceFail(
                $returnPath,
                $message !== '' ? $message : __('dashboard.GitHub authorization was cancelled.'),
            );
        }

        $code = (string) $request->query('code', '');
        $state = (string) $request->query('state', '');

        try {
            $broker->complete($user, $code, $state);
        } catch (InvalidArgumentException|RuntimeException $e) {
            return Pulse::bounceFail($returnPath, $e->getMessage());
        } catch (Throwable $e) {
            report($e);

            return Pulse::bounceFail($returnPath, __('dashboard.Could not complete GitHub authorization.'));
        }

        return Pulse::bounceOk($returnPath, __('settings.GitHub connected.'));
    }

    public function destroy(Request $request, GithubLinkBroker $broker): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $broker->unlink($user);

        if ($request->expectsJson()) {
            return response()->json(['unlinked' => true]);
        }

        $return = LocalReturnPath::deskOrLab((string) $request->input('return', '/lab'));

        return Pulse::bounceOk($return, __('settings.GitHub disconnected.'));
    }
}
