<?php

namespace App\Installer;

/**
 * Fresh uploads ship without .env / APP_KEY. Cookie encryption would 500
 * before /install can render — seed a real key into .env and runtime config
 * while the install lock is still absent.
 */
final class EnsureInstallerAppKey
{
    public static function hydrate(): void
    {
        if (filled((string) config('app.key')) || filled((string) env('APP_KEY', ''))) {
            return;
        }

        $lock = (string) (config('installer.installed_file') ?: storage_path('installed'));
        if (is_file($lock)) {
            return;
        }

        $key = 'base64:'.base64_encode(random_bytes(32));

        self::persist($key);
        self::applyRuntime($key);
    }

    private static function applyRuntime(string $key): void
    {
        config(['app.key' => $key]);
        putenv('APP_KEY='.$key);
        $_ENV['APP_KEY'] = $key;
        $_SERVER['APP_KEY'] = $key;
    }

    private static function persist(string $key): void
    {
        $path = base_path('.env');

        EnvTemplate::mergeMissing($path);

        if (! is_file($path)) {
            $written = @file_put_contents($path, implode("\n", [
                'APP_NAME=Krikkit',
                'APP_ENV=production',
                'APP_KEY=',
                'APP_DEBUG=false',
                'APP_URL=',
                '',
                'SESSION_DRIVER=file',
                'CACHE_STORE=file',
                '',
            ]));

            if ($written === false) {
                // storage may be writable even when base/.env is not — still allow
                // this request to reach the installer UI and surface permissions next.
                self::applyRuntime($key);

                return;
            }
        }

        $content = @file_get_contents($path);
        if ($content === false) {
            self::applyRuntime($key);

            return;
        }

        if (preg_match('/^APP_KEY=.*/m', $content) === 1) {
            $content = preg_replace('/^APP_KEY=.*/m', 'APP_KEY='.$key, $content, 1) ?? $content;
        } else {
            $content = 'APP_KEY='.$key."\n".$content;
        }

        @file_put_contents($path, $content);

        EnvTemplate::mergeMissing($path);
    }
}
