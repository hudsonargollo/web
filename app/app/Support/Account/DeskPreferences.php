<?php

namespace App\Support\Account;

use App\Ai\ModelCatalog;
use App\Models\User;
use App\Support\Ui\ThemePalette;

final class DeskPreferences
{
    /**
     * @return array{show_token_usage: bool, sound_alerts: bool, default_model: string}
     */
    public static function defaults(): array
    {
        return [
            'show_token_usage' => false,
            'sound_alerts' => true,
            'default_model' => '',
        ];
    }

    /**
     * @return array{show_token_usage: bool, sound_alerts: bool, default_model: string}
     */
    public static function for(?User $user): array
    {
        $base = self::defaults();

        if ($user === null) {
            return $base;
        }

        $stored = is_array($user->preferences) ? $user->preferences : [];

        $base['show_token_usage'] = (bool) ($stored['show_token_usage'] ?? $base['show_token_usage']);
        $base['sound_alerts'] = array_key_exists('sound_alerts', $stored)
            ? (bool) $stored['sound_alerts']
            : true;
        $base['default_model'] = trim((string) ($stored['default_model'] ?? ''));

        return $base;
    }

    /**
     * @param  array<string, mixed>  $patch
     * @return array{show_token_usage: bool, sound_alerts: bool, default_model: string}
     */
    public static function merge(User $user, array $patch): array
    {
        $next = array_merge(self::for($user), $patch);
        $next['show_token_usage'] = (bool) $next['show_token_usage'];
        $next['sound_alerts'] = (bool) $next['sound_alerts'];
        $next['default_model'] = trim((string) $next['default_model']);

        $user->forceFill(['preferences' => $next])->save();

        return $next;
    }

    public static function preferredModelId(?User $user, ModelCatalog $catalog): string
    {
        $preferred = self::for($user)['default_model'];

        if ($preferred !== '' && $catalog->has($preferred)) {
            return $preferred;
        }

        return $catalog->defaultId();
    }

    public static function appearanceMode(?User $user): string
    {
        $normalized = ThemePalette::normalize($user?->appearance);

        return is_array($normalized) ? (string) $normalized['mode'] : 'system';
    }
}
