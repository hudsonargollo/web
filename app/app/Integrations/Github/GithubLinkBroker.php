<?php

namespace App\Integrations\Github;

use App\Integrations\WorkspaceOauthAppStore;
use App\Support\Http\LocalReturnPath;
use App\Lab\Github\GithubHttp;
use App\Models\User;
use App\Models\UserVcsLink;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

/**
 * Per-user GitHub account linking via OAuth App (no Socialite).
 */
final class GithubLinkBroker
{
    public const SESSION_STATE = 'lab.vcs.github.state';

    public const SESSION_RETURN = 'lab.vcs.github.return';

    public function __construct(
        private readonly WorkspaceOauthAppStore $apps = new WorkspaceOauthAppStore,
    ) {}

    public function callbackUrl(): string
    {
        return route('lab.vcs.github.return');
    }

    public function isOauthReady(): bool
    {
        return $this->apps->isReady(WorkspaceOauthAppStore::DRIVER_GITHUB);
    }

    public function linkFor(User $user): ?UserVcsLink
    {
        return UserVcsLink::query()
            ->where('user_id', $user->id)
            ->where('driver', UserVcsLink::DRIVER_GITHUB)
            ->first();
    }

    public function tokenFor(User $user): ?string
    {
        $link = $this->linkFor($user);
        if ($link === null || ! filled($link->access_token)) {
            return null;
        }

        return (string) $link->access_token;
    }

    /**
     * @return array{url: string, state: string}
     */
    public function begin(User $user, ?string $returnPath = null): array
    {
        if (! $this->isOauthReady()) {
            throw new RuntimeException(__('dashboard.GitHub OAuth is not configured.'));
        }

        $app = $this->apps->get(WorkspaceOauthAppStore::DRIVER_GITHUB);
        $state = Str::random(40);

        session([
            self::SESSION_STATE => $state,
            self::SESSION_RETURN => $this->sanitizeReturnPath($returnPath),
        ]);

        $query = http_build_query([
            'client_id' => $app['client_id'],
            'redirect_uri' => $this->callbackUrl(),
            'scope' => (string) config('services.github.oauth.scopes', 'repo read:user'),
            'state' => $state,
            'allow_signup' => 'true',
        ]);

        return [
            'url' => 'https://github.com/login/oauth/authorize?'.$query,
            'state' => $state,
        ];
    }

    public function complete(User $user, string $code, string $state): UserVcsLink
    {
        $expected = (string) session(self::SESSION_STATE, '');
        session()->forget(self::SESSION_STATE);

        if ($expected === '' || ! hash_equals($expected, $state)) {
            throw new InvalidArgumentException(__('dashboard.GitHub authorization state was invalid.'));
        }

        if (! $this->isOauthReady()) {
            throw new RuntimeException(__('dashboard.GitHub OAuth is not configured.'));
        }

        $app = $this->apps->get(WorkspaceOauthAppStore::DRIVER_GITHUB);

        try {
            $tokenResponse = Http::asForm()
                ->acceptJson()
                ->timeout(30)
                ->post('https://github.com/login/oauth/access_token', [
                    'client_id' => $app['client_id'],
                    'client_secret' => $app['client_secret'],
                    'code' => $code,
                    'redirect_uri' => $this->callbackUrl(),
                ])
                ->throw();
        } catch (RequestException $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not complete GitHub authorization.'), previous: $e);
        }

        /** @var array<string, mixed> $tokenPayload */
        $tokenPayload = $tokenResponse->json() ?? [];
        $accessToken = trim((string) ($tokenPayload['access_token'] ?? ''));
        $scopes = filled($tokenPayload['scope'] ?? null) ? (string) $tokenPayload['scope'] : null;

        if ($accessToken === '') {
            $error = (string) ($tokenPayload['error_description'] ?? $tokenPayload['error'] ?? '');

            throw new RuntimeException(
                $error !== ''
                    ? $error
                    : __('dashboard.Could not complete GitHub authorization.')
            );
        }

        try {
            $profile = GithubHttp::api($accessToken)
                ->get(GithubHttp::apiBase().'/user')
                ->throw()
                ->json();
        } catch (Throwable $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not load the GitHub profile.'), previous: $e);
        }

        /** @var array<string, mixed> $profile */
        $externalId = (string) ($profile['id'] ?? '');
        $login = trim((string) ($profile['login'] ?? ''));

        if ($externalId === '' || $login === '') {
            throw new RuntimeException(__('dashboard.Could not load the GitHub profile.'));
        }

        $link = UserVcsLink::query()->firstOrNew([
            'user_id' => $user->id,
            'driver' => UserVcsLink::DRIVER_GITHUB,
        ]);

        $link->fill([
            'external_id' => $externalId,
            'login' => $login,
            'avatar_url' => filled($profile['avatar_url'] ?? null) ? (string) $profile['avatar_url'] : null,
            'access_token' => $accessToken,
            'scopes' => $scopes,
            'linked_at' => now(),
        ]);
        $link->save();

        return $link;
    }

    public function unlink(User $user): void
    {
        UserVcsLink::query()
            ->where('user_id', $user->id)
            ->where('driver', UserVcsLink::DRIVER_GITHUB)
            ->delete();
    }

    public function consumeReturnPath(): string
    {
        $path = (string) session(self::SESSION_RETURN, '/lab');
        session()->forget(self::SESSION_RETURN);

        return $this->sanitizeReturnPath($path) ?? '/lab';
    }

    private function sanitizeReturnPath(?string $path): ?string
    {
        return LocalReturnPath::deskOrLab($path);
    }
}
