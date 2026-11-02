<?php

namespace App\Support\Ui;

use Illuminate\Support\Str;

final class Pulse
{
    public const SESSION_KEY = '_krikkit.pulse';

    public const EVENT = 'krikkit-pulse';

    /**
     * @return array{uid: string, copy: string, eyebrow: ?string, tone: string, linger: int}
     */
    public static function craft(
        string $copy,
        ?string $eyebrow = null,
        string $tone = 'note',
        int $linger = 4500,
    ): array {
        return [
            'uid' => (string) Str::ulid(),
            'copy' => $copy,
            'eyebrow' => $eyebrow,
            'tone' => $tone,
            'linger' => $linger,
        ];
    }

    public static function queue(
        string $copy,
        ?string $eyebrow = null,
        string $tone = 'note',
        int $linger = 4500,
    ): void {
        session()->flash(self::SESSION_KEY, self::craft($copy, $eyebrow, $tone, $linger));
    }

    public static function ok(string $copy, ?string $eyebrow = null): void
    {
        self::queue($copy, $eyebrow ?? __('dashboard.Saved'), 'ok');
    }

    public static function warn(string $copy, ?string $eyebrow = null): void
    {
        self::queue($copy, $eyebrow, 'warn');
    }

    public static function fail(string $copy, ?string $eyebrow = null): void
    {
        self::queue($copy, $eyebrow, 'fail');
    }

    public static function bounceFail(string $url, string $copy, ?string $eyebrow = null): \Illuminate\Http\RedirectResponse
    {
        self::fail($copy, $eyebrow);

        return redirect($url);
    }

    public static function bounceOk(string $url, string $copy, ?string $eyebrow = null): \Illuminate\Http\RedirectResponse
    {
        self::ok($copy, $eyebrow);

        return redirect($url);
    }

    /**
     * Resolve a queued pulse, including legacy status flashes.
     *
     * @return array{uid: string, copy: string, eyebrow: ?string, tone: string, linger: int}|null
     */
    public static function pending(): ?array
    {
        $queued = session(self::SESSION_KEY);

        if (is_array($queued) && isset($queued['copy'])) {
            return $queued;
        }

        return self::fromLegacyStatus(session('status'));
    }

    /**
     * @return array{uid: string, copy: string, eyebrow: ?string, tone: string, linger: int}|null
     */
    public static function fromLegacyStatus(mixed $status): ?array
    {
        if (! filled($status) || ! is_string($status)) {
            return null;
        }

        return match ($status) {
            'user-updated' => self::craft(__('dashboard.User updated.'), __('dashboard.Saved'), 'ok'),
            'role-created' => self::craft(__('dashboard.Role created.'), __('dashboard.Saved'), 'ok'),
            'role-updated' => self::craft(__('dashboard.Role updated.'), __('dashboard.Saved'), 'ok'),
            'role-retired' => self::craft(__('dashboard.Role retired.'), __('dashboard.Saved'), 'ok'),
            'password-updated' => self::craft(__('dashboard.Password updated.'), __('dashboard.Saved'), 'ok'),
            'two-factor-enabled' => self::craft(__('dashboard.Scan the secret, then confirm with a code.'), __('dashboard.Continue setup'), 'note'),
            'two-factor-confirmed' => self::craft(__('dashboard.Two-factor authentication confirmed.'), __('dashboard.Saved'), 'ok'),
            'two-factor-disabled' => self::craft(__('dashboard.Two-factor authentication disabled.'), __('dashboard.Saved'), 'ok'),
            'recovery-codes-generated' => self::craft(__('dashboard.New recovery codes generated.'), __('dashboard.Saved'), 'ok'),
            'verification-link-sent' => self::craft(__('messages.A new verification link has been sent.'), __('messages.Sent'), 'ok'),
            default => self::craft($status, null, 'ok'),
        };
    }
}
