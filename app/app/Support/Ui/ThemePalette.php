<?php

namespace App\Support\Ui;

use App\Support\Site\SiteSettings;
use Illuminate\Http\Request;

final class ThemePalette
{
    public const MODE_COOKIE = 'krikkit-theme';

    /**
     * @return list<array{id: string, label: string}>
     */
    public static function accents(): array
    {
        return [
            ['id' => 'base', 'label' => __('dashboard.Base')],
            ['id' => 'red', 'label' => __('dashboard.Red')],
            ['id' => 'orange', 'label' => __('dashboard.Orange')],
            ['id' => 'amber', 'label' => __('dashboard.Amber')],
            ['id' => 'yellow', 'label' => __('dashboard.Yellow')],
            ['id' => 'lime', 'label' => __('dashboard.Lime')],
            ['id' => 'green', 'label' => __('dashboard.Green')],
            ['id' => 'emerald', 'label' => __('dashboard.Emerald')],
            ['id' => 'teal', 'label' => __('dashboard.Teal')],
            ['id' => 'cyan', 'label' => __('dashboard.Cyan')],
            ['id' => 'sky', 'label' => __('dashboard.Sky')],
            ['id' => 'blue', 'label' => __('dashboard.Blue')],
            ['id' => 'indigo', 'label' => __('dashboard.Indigo')],
            ['id' => 'violet', 'label' => __('dashboard.Violet')],
            ['id' => 'purple', 'label' => __('dashboard.Purple')],
            ['id' => 'fuchsia', 'label' => __('dashboard.Fuchsia')],
            ['id' => 'pink', 'label' => __('dashboard.Pink')],
            ['id' => 'rose', 'label' => __('dashboard.Rose')],
        ];
    }

    /**
     * @return list<array{id: string, label: string}>
     */
    public static function bases(): array
    {
        return [
            ['id' => 'slate', 'label' => __('dashboard.Slate')],
            ['id' => 'gray', 'label' => __('dashboard.Gray')],
            ['id' => 'zinc', 'label' => __('dashboard.Zinc')],
            ['id' => 'neutral', 'label' => __('dashboard.Neutral')],
            ['id' => 'stone', 'label' => __('dashboard.Stone')],
            ['id' => 'mauve', 'label' => __('dashboard.Mauve')],
            ['id' => 'olive', 'label' => __('dashboard.Olive')],
            ['id' => 'mist', 'label' => __('dashboard.Mist')],
            ['id' => 'taupe', 'label' => __('dashboard.Taupe')],
        ];
    }

    /**
     * @return list<string>
     */
    public static function accentIds(): array
    {
        return array_column(self::accents(), 'id');
    }

    /**
     * @return list<string>
     */
    public static function baseIds(): array
    {
        return array_column(self::bases(), 'id');
    }

    /**
     * @return array{accent: string, base: string, mode: string}|null
     */
    public static function normalize(?array $appearance): ?array
    {
        if (! is_array($appearance)) {
            return null;
        }

        $accent = (string) ($appearance['accent'] ?? 'base');
        $base = (string) ($appearance['base'] ?? 'neutral');
        $mode = (string) ($appearance['mode'] ?? 'light');

        if (! in_array($accent, self::accentIds(), true)) {
            $accent = 'base';
        }

        if (! in_array($base, self::baseIds(), true)) {
            $base = 'neutral';
        }

        if (! in_array($mode, ['light', 'dark', 'system'], true)) {
            $mode = 'system';
        }

        return compact('accent', 'base', 'mode');
    }

    /**
     * Resolve light/dark for the first HTML paint. Null means “unknown / system” — the
     * blocking boot script applies prefers-color-scheme before CSS loads.
     *
     * @param  'light'|'dark'|'system'|string  $siteMode
     * @param  'light'|'dark'|string|null  $userMode
     * @param  'light'|'dark'|string|null  $cookieMode
     */
    public static function resolveDocumentMode(
        bool $locked,
        string $siteMode,
        ?string $userMode,
        ?string $cookieMode,
    ): ?string {
        $site = in_array($siteMode, ['light', 'dark'], true) ? $siteMode : null;
        $user = in_array((string) $userMode, ['light', 'dark'], true) ? $userMode : null;
        $cookie = in_array((string) $cookieMode, ['light', 'dark'], true) ? $cookieMode : null;

        if ($locked) {
            return $site ?? $cookie;
        }

        if ((string) $userMode === 'system') {
            return null;
        }

        return $user ?? $cookie ?? $site;
    }

    public static function documentMode(?Request $request = null): ?string
    {
        $site = app(SiteSettings::class)->theme();
        $user = self::normalize(auth()->user()?->appearance);
        $cookie = null;

        try {
            $cookie = ($request ?? request())->cookie(self::MODE_COOKIE);
        } catch (\Throwable) {
            $cookie = null;
        }

        return self::resolveDocumentMode(
            (bool) ($site['lock_members'] ?? false),
            (string) ($site['mode'] ?? 'system'),
            is_array($user) ? ($user['mode'] ?? null) : null,
            is_string($cookie) ? $cookie : null,
        );
    }

    public static function documentIsDark(?Request $request = null): bool
    {
        return self::documentMode($request) === 'dark';
    }

    /**
     * Plain browser CSS for <style id="krikkit-theme"> (NOT Tailwind @theme — browsers ignore that).
     * Only base remap + accent. Semantic krikkit-* tokens live in app.css.
     */
    public static function runtimeCss(string $accent = 'base', string $base = 'neutral'): string
    {
        $lines = [':root {'];

        if ($base !== 'neutral') {
            foreach ([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as $shade) {
                $lines[] = "    --color-neutral-{$shade}: var(--color-{$base}-{$shade});";
            }
        }

        if ($accent === 'base') {
            $lines[] = '    --color-accent: var(--color-neutral-800);';
            $lines[] = '    --color-accent-content: var(--color-neutral-800);';
            $lines[] = '    --color-accent-foreground: var(--color-white);';
            $lines[] = '}';
            $lines[] = '.dark {';
            $lines[] = '    --color-accent: var(--color-white);';
            $lines[] = '    --color-accent-content: var(--color-white);';
            $lines[] = '    --color-accent-foreground: var(--color-neutral-900);';
            $lines[] = '}';
        } elseif (in_array($accent, ['yellow', 'lime', 'amber'], true)) {
            $lines[] = "    --color-accent: var(--color-{$accent}-400);";
            $lines[] = "    --color-accent-content: var(--color-{$accent}-700);";
            $lines[] = '    --color-accent-foreground: var(--color-neutral-900);';
            $lines[] = '}';
            $lines[] = '.dark {';
            $lines[] = "    --color-accent: var(--color-{$accent}-400);";
            $lines[] = "    --color-accent-content: var(--color-{$accent}-300);";
            $lines[] = '    --color-accent-foreground: var(--color-neutral-900);';
            $lines[] = '}';
        } else {
            $lines[] = "    --color-accent: var(--color-{$accent}-500);";
            $lines[] = "    --color-accent-content: var(--color-{$accent}-600);";
            $lines[] = '    --color-accent-foreground: var(--color-white);';
            $lines[] = '}';
            $lines[] = '.dark {';
            $lines[] = "    --color-accent: var(--color-{$accent}-500);";
            $lines[] = "    --color-accent-content: var(--color-{$accent}-400);";
            $lines[] = '    --color-accent-foreground: var(--color-white);';
            $lines[] = '}';
        }

        return implode("\n", $lines)."\n";
    }
}
