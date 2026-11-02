<?php

namespace App\Support\Site;

use App\Lab\LabConsoleCopy;
use App\Models\SiteSetting;
use App\Support\Html\SafeHtml;
use App\Support\Seo\PageSeo;
use App\Support\Ui\ThemePalette;
use Cknow\Money\Money;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

final class SiteSettings
{
    public const BUNDLED_LOGO_LIGHT = 'brand/logo-light.svg';

    public const BUNDLED_LOGO_DARK = 'brand/logo-dark.svg';

    /**
     * @var array<string, mixed>|null
     */
    private ?array $payload = null;

    private bool $ready;

    public function __construct()
    {
        $this->ready = $this->tablesReady();
    }

    /**
     * @return array<string, mixed>
     */
    public function defaults(): array
    {
        return [
            'general' => [
                'name' => (string) config('app.name', 'Krikkit'),
                'tagline' => '',
                'url' => (string) config('app.url', ''),
                'support_email' => '',
                'contact_email' => '',
                'legal_name' => '',
                'copyright' => '',
                'locale' => 'en',
                'timezone' => (string) config('app.timezone', 'UTC'),
                'currency' => strtoupper((string) config('money.defaultCurrency', config('app.currency', 'USD'))),
                'allow_registration' => true,
                'maintenance' => false,
                'maintenance_message' => '',
                'logo_light' => null,
                'logo_dark' => null,
                'favicon' => null,
                'apple_touch' => null,
                'icon_light' => null,
                'icon_dark' => null,
                'social_x' => '',
                'social_github' => '',
                'social_discord' => '',
                'social_linkedin' => '',
            ],
            'theme' => [
                'accent' => 'base',
                'base' => 'neutral',
                'mode' => 'system',
                'lock_members' => false,
            ],
            'seo' => [
                'meta_title' => '',
                'meta_description' => '',
                'meta_keywords' => '',
                'title_home' => PageSeo::TITLE_HOME,
                'title_dashboard' => PageSeo::TITLE_DASHBOARD,
                'title_lab' => PageSeo::TITLE_LAB,
                'robots_index' => true,
                'robots_follow' => true,
                'canonical' => '',
                'og_title' => '',
                'og_description' => '',
                'og_image' => null,
                'twitter_handle' => '',
                'analytics_id' => '',
                'search_console' => '',
            ],
            'gdpr' => [
                'enabled' => false,
                'title' => 'We use cookies',
                'message' => 'Essential cookies keep this site working. Optional analytics stay off until you accept.',
                'accept_label' => 'Accept',
                'reject_label' => 'Reject',
                'show_reject' => true,
                'consent_analytics' => true,
                'controller_name' => '',
                'controller_email' => '',
            ],
            'privacy' => [
                'published' => false,
                'title' => '',
                'body' => '',
                'updated_on' => '',
            ],
            'terms' => [
                'published' => false,
                'title' => '',
                'body' => '',
                'updated_on' => '',
            ],
            'mail' => [
                'mailer' => (string) config('mail.default', 'log'),
                'from_name' => (string) config('mail.from.name', config('app.name', 'Krikkit')),
                'from_address' => (string) config('mail.from.address', ''),
                'reply_to' => '',
                'host' => (string) config('mail.mailers.smtp.host', '127.0.0.1'),
                'port' => (string) config('mail.mailers.smtp.port', '587'),
                'encryption' => 'tls',
                'username' => (string) config('mail.mailers.smtp.username', ''),
                'password' => null,
            ],
            'publish' => [
                'enabled' => true,
            ],
            'lab' => LabConsoleCopy::defaults(),
            'landing' => LandingCopy::defaults(),
            'permit' => [
                'tone' => 'idle',
                'secret' => '',
                'tail' => '',
                'checked_at' => '',
                'notice' => '',
                'kind' => '',
                'bound_host' => '',
                'cap' => null,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function bag(string $group): array
    {
        $defaults = $this->defaults()[$group] ?? [];
        $stored = $this->payload()[$group] ?? [];

        if (! is_array($stored)) {
            $stored = [];
        }

        return array_merge($defaults, $stored);
    }

    public function value(string $group, string $key, mixed $default = null): mixed
    {
        $bag = $this->bag($group);

        return $bag[$key] ?? $default;
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public function put(string $group, array $values): void
    {
        $payload = $this->payload();
        $current = is_array($payload[$group] ?? null) ? $payload[$group] : [];
        $payload[$group] = array_merge($current, $values);

        $row = SiteSetting::current();
        $row->payload = $payload;
        $row->save();

        $this->payload = $payload;
    }

    public function name(): string
    {
        $name = trim((string) $this->value('general', 'name', ''));

        return $name !== '' ? $name : (string) config('app.name', 'Krikkit');
    }

    public function tagline(): string
    {
        return trim((string) $this->value('general', 'tagline', ''));
    }

    public function url(): string
    {
        $url = trim((string) $this->value('general', 'url', ''));

        return $url !== '' ? $url : (string) config('app.url', '');
    }

    public function locale(): string
    {
        $locale = trim((string) $this->value('general', 'locale', 'en'));

        return $locale !== '' ? $locale : 'en';
    }

    public function currency(): string
    {
        $code = strtoupper(trim((string) $this->value('general', 'currency', '')));

        if ($code !== '' && Money::isValidCurrency($code)) {
            return $code;
        }

        $fallback = strtoupper((string) config('money.defaultCurrency', config('app.currency', 'USD')));

        return $fallback !== '' && Money::isValidCurrency($fallback) ? $fallback : 'USD';
    }

    public function applyMoneyConfig(): void
    {
        $code = $this->ensureReady()
            ? $this->currency()
            : strtoupper((string) config('money.defaultCurrency', config('app.currency', 'USD')));

        if ($code === '' || ! Money::isValidCurrency($code)) {
            $code = 'USD';
        }

        Config::set('money.defaultCurrency', $code);
        Config::set('app.currency', $code);
        Money::setDefaultCurrency($code);
    }

    public function allowRegistration(): bool
    {
        return (bool) $this->value('general', 'allow_registration', true);
    }

    public function maintenance(): bool
    {
        return (bool) $this->value('general', 'maintenance', false);
    }

    public function maintenanceMessage(): string
    {
        $message = trim((string) $this->value('general', 'maintenance_message', ''));

        return $message !== '' ? $message : (string) __('messages.This site is temporarily unavailable.');
    }

    public function assetUrl(?string $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        return Storage::disk('public')->url($path);
    }

    public function bundledLogoUrl(string $mode = 'light'): string
    {
        $file = $mode === 'dark' ? self::BUNDLED_LOGO_DARK : self::BUNDLED_LOGO_LIGHT;

        return asset($file);
    }

    public function logoUrl(?string $mode = null): string
    {
        $light = $this->assetUrl($this->value('general', 'logo_light')) ?? $this->bundledLogoUrl('light');
        $dark = $this->assetUrl($this->value('general', 'logo_dark')) ?? $this->bundledLogoUrl('dark');

        return $mode === 'dark' ? $dark : $light;
    }

    public function iconUrl(?string $mode = null): ?string
    {
        $light = $this->assetUrl($this->value('general', 'icon_light'));
        $dark = $this->assetUrl($this->value('general', 'icon_dark'));

        if ($mode === 'dark') {
            return $dark ?? $light;
        }

        if ($mode === 'light') {
            return $light ?? $dark;
        }

        return $light ?? $dark;
    }

    public function faviconUrl(): ?string
    {
        return $this->assetUrl($this->value('general', 'favicon'))
            ?? $this->iconUrl('light')
            ?? $this->bundledLogoUrl('light');
    }

    public function appleTouchUrl(): ?string
    {
        return $this->assetUrl($this->value('general', 'apple_touch'))
            ?? $this->iconUrl('light')
            ?? $this->faviconUrl();
    }

    /**
     * @return array{accent: string, base: string, mode: string, lock_members: bool}
     */
    public function theme(): array
    {
        $bag = $this->bag('theme');
        $normalized = ThemePalette::normalize([
            'accent' => $bag['accent'] ?? 'base',
            'base' => $bag['base'] ?? 'neutral',
            'mode' => in_array($bag['mode'] ?? 'light', ['light', 'dark'], true)
                ? $bag['mode']
                : 'light',
        ]) ?? ['accent' => 'base', 'base' => 'neutral', 'mode' => 'light'];

        $mode = (string) ($bag['mode'] ?? 'system');
        if (! in_array($mode, ['light', 'dark', 'system'], true)) {
            $mode = 'system';
        }

        return [
            'accent' => $normalized['accent'],
            'base' => $normalized['base'],
            'mode' => $mode,
            'lock_members' => (bool) ($bag['lock_members'] ?? false),
        ];
    }

    public function privacyPublished(): bool
    {
        return (bool) $this->value('privacy', 'published', false)
            && SafeHtml::hasCopy((string) $this->value('privacy', 'body', ''));
    }

    public function termsPublished(): bool
    {
        return (bool) $this->value('terms', 'published', false)
            && SafeHtml::hasCopy((string) $this->value('terms', 'body', ''));
    }

    /**
     * @return array{
     *     mailer: string,
     *     from_name: string,
     *     from_address: string,
     *     reply_to: string,
     *     host: string,
     *     port: string,
     *     encryption: string,
     *     username: string,
     *     has_password: bool
     * }
     */
    public function mail(): array
    {
        $bag = $this->bag('mail');
        $mailer = (string) ($bag['mailer'] ?? 'log');
        $encryption = (string) ($bag['encryption'] ?? 'tls');

        if (! in_array($mailer, ['smtp', 'log', 'sendmail'], true)) {
            $mailer = 'log';
        }

        if (! in_array($encryption, ['tls', 'ssl', 'none'], true)) {
            $encryption = 'tls';
        }

        return [
            'mailer' => $mailer,
            'from_name' => (string) ($bag['from_name'] ?? ''),
            'from_address' => (string) ($bag['from_address'] ?? ''),
            'reply_to' => (string) ($bag['reply_to'] ?? ''),
            'host' => (string) ($bag['host'] ?? ''),
            'port' => (string) ($bag['port'] ?? '587'),
            'encryption' => $encryption,
            'username' => (string) ($bag['username'] ?? ''),
            'has_password' => $this->hasMailPassword(),
        ];
    }

    public function publishEnabled(): bool
    {
        $value = $this->value('publish', 'enabled', true);

        if (is_bool($value)) {
            return $value;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * @return array{name: string, slug: string, lines: array<string, string>}
     */
    public function labConsole(): array
    {
        return LabConsoleCopy::forLab($this->bag('lab'));
    }

    public function hasMailPassword(): bool
    {
        return filled($this->value('mail', 'password'));
    }

    public function mailPassword(): string
    {
        $stored = $this->value('mail', 'password');

        if (is_string($stored) && $stored !== '') {
            try {
                return Crypt::decryptString($stored);
            } catch (\Throwable) {
                return $stored;
            }
        }

        return trim((string) config('mail.mailers.smtp.password', ''));
    }

    public function applyMailConfig(): void
    {
        if (! $this->ensureReady()) {
            return;
        }

        $mail = $this->mail();
        $fromName = trim($mail['from_name']) !== '' ? $mail['from_name'] : $this->name();
        $fromAddress = trim($mail['from_address']);

        Config::set('mail.default', $mail['mailer']);

        if ($fromAddress !== '') {
            Config::set('mail.from.address', $fromAddress);
        }

        Config::set('mail.from.name', $fromName);

        if (filled($mail['reply_to'])) {
            Config::set('mail.reply_to', [
                'address' => $mail['reply_to'],
                'name' => $fromName,
            ]);
        }

        if ($mail['mailer'] === 'smtp') {
            $scheme = $mail['encryption'] === 'ssl' ? 'smtps' : 'smtp';

            Config::set('mail.mailers.smtp.host', $mail['host']);
            Config::set('mail.mailers.smtp.port', (int) ($mail['port'] !== '' ? $mail['port'] : 587));
            Config::set('mail.mailers.smtp.username', $mail['username'] !== '' ? $mail['username'] : null);
            Config::set('mail.mailers.smtp.password', $this->mailPassword() !== '' ? $this->mailPassword() : null);
            Config::set('mail.mailers.smtp.scheme', $scheme);
        }

        if (app()->bound('mail.manager')) {
            app('mail.manager')->purge();
        }
    }

    private function tablesReady(): bool
    {
        try {
            return Schema::hasTable('site_settings');
        } catch (\Throwable) {
            return false;
        }
    }

    private function ensureReady(): bool
    {
        if (! $this->ready) {
            $this->ready = $this->tablesReady();
        }

        return $this->ready;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        if ($this->payload !== null) {
            return $this->payload;
        }

        if (! $this->ensureReady()) {
            return $this->payload = [];
        }

        $stored = SiteSetting::query()->value('payload');
        $this->payload = is_array($stored) ? $stored : [];

        return $this->payload;
    }
}
