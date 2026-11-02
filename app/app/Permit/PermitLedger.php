<?php

namespace App\Permit;

use App\Support\Site\SiteSettings;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;
use Throwable;

final class PermitLedger
{
    public const IDLE = 'idle';

    public const ACTIVE = 'active';

    public const DEFERRED = 'deferred';

    /**
     * @return array{
     *     tone: string,
     *     secret: string,
     *     tail: string,
     *     checked_at: string,
     *     notice: string,
     *     kind: string,
     *     bound_host: string,
     *     cap: int|null
     * }
     */
    public function snapshot(): array
    {
        $fromSite = $this->fromSiteBag();
        if ($fromSite !== null) {
            return $fromSite;
        }

        return $this->fromScratchFile() ?? $this->blank();
    }

    public function defer(): void
    {
        $this->persist(array_merge($this->blank(), [
            'tone' => self::DEFERRED,
            'checked_at' => now()->toIso8601String(),
            'notice' => (string) __('dashboard.License skipped. Bind a key later from Settings → License.'),
        ]));
    }

    /**
     * @param  array{notice: string, kind: ?string, cap: int|null}  $reply
     */
    public function rememberActive(string $token, array $reply, ?string $host = null): void
    {
        $token = trim($token);

        $this->persist(array_merge($this->blank(), [
            'tone' => self::ACTIVE,
            'secret' => $this->seal($token),
            'tail' => $this->tail($token),
            'checked_at' => now()->toIso8601String(),
            'notice' => $reply['notice'],
            'kind' => (string) ($reply['kind'] ?? ''),
            'bound_host' => $host ?: app(DeepthoughtClient::class)->boundHost(),
            'cap' => $reply['cap'],
        ]));
    }

    public function reveal(): string
    {
        $secret = $this->snapshot()['secret'];

        if ($secret === '') {
            return '';
        }

        try {
            return Crypt::decryptString($secret);
        } catch (Throwable) {
            return $secret;
        }
    }

    public function promoteWizardScratch(): void
    {
        if (! $this->siteTableReady()) {
            return;
        }

        $scratch = $this->fromScratchFile();
        if ($scratch === null) {
            return;
        }

        $this->writeSiteBag($scratch);
        $this->forgetScratch();
    }

    public function scratchPath(): string
    {
        if (app()->environment('testing')) {
            return storage_path('framework/testing/permit.json');
        }

        return storage_path('framework/permit.json');
    }

    /**
     * @return array{
     *     tone: string,
     *     secret: string,
     *     tail: string,
     *     checked_at: string,
     *     notice: string,
     *     kind: string,
     *     bound_host: string,
     *     cap: int|null
     * }
     */
    private function blank(): array
    {
        return [
            'tone' => self::IDLE,
            'secret' => '',
            'tail' => '',
            'checked_at' => '',
            'notice' => '',
            'kind' => '',
            'bound_host' => '',
            'cap' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function persist(array $row): void
    {
        $normalized = $this->normalize($row);

        if ($this->siteTableReady()) {
            $this->writeSiteBag($normalized);
            $this->forgetScratch();

            return;
        }

        $this->writeScratch($normalized);
    }

    private function siteTableReady(): bool
    {
        try {
            return Schema::hasTable('site_settings');
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fromSiteBag(): ?array
    {
        try {
            if (! Schema::hasTable('site_settings')) {
                return null;
            }
        } catch (Throwable) {
            return null;
        }

        $bag = app(SiteSettings::class)->bag('permit');
        if (($bag['tone'] ?? self::IDLE) === self::IDLE && ($bag['tail'] ?? '') === '' && ($bag['notice'] ?? '') === '') {
            return null;
        }

        return $this->normalize($bag);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fromScratchFile(): ?array
    {
        $path = $this->scratchPath();
        if (! is_file($path)) {
            return null;
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return is_array($decoded) ? $this->normalize($decoded) : null;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function writeScratch(array $row): void
    {
        $dir = dirname($this->scratchPath());
        if (! is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        file_put_contents(
            $this->scratchPath(),
            json_encode($row, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        );
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function writeSiteBag(array $row): void
    {
        app(SiteSettings::class)->put('permit', $row);
    }

    private function forgetScratch(): void
    {
        $path = $this->scratchPath();
        if (is_file($path)) {
            @unlink($path);
        }
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{
     *     tone: string,
     *     secret: string,
     *     tail: string,
     *     checked_at: string,
     *     notice: string,
     *     kind: string,
     *     bound_host: string,
     *     cap: int|null
     * }
     */
    private function normalize(array $row): array
    {
        $tone = (string) ($row['tone'] ?? self::IDLE);
        if (! in_array($tone, [self::IDLE, self::ACTIVE, self::DEFERRED], true)) {
            $tone = self::IDLE;
        }

        $cap = $row['cap'] ?? null;

        return [
            'tone' => $tone,
            'secret' => (string) ($row['secret'] ?? ''),
            'tail' => (string) ($row['tail'] ?? ''),
            'checked_at' => (string) ($row['checked_at'] ?? ''),
            'notice' => (string) ($row['notice'] ?? ''),
            'kind' => (string) ($row['kind'] ?? ''),
            'bound_host' => (string) ($row['bound_host'] ?? ''),
            'cap' => is_numeric($cap) ? (int) $cap : null,
        ];
    }

    private function seal(string $token): string
    {
        try {
            return Crypt::encryptString($token);
        } catch (Throwable) {
            return $token;
        }
    }

    private function tail(string $token): string
    {
        $trimmed = trim($token);
        $length = strlen($trimmed);

        if ($length <= 4) {
            return $trimmed;
        }

        return substr($trimmed, -4);
    }
}
