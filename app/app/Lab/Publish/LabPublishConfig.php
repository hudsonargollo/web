<?php

namespace App\Lab\Publish;

use App\Support\Site\SiteSettings;
use Illuminate\Support\Facades\Schema;

/**
 * Published Lab sites live on `{slug}.{APP_URL host}` (or a verified custom host).
 * Parent domain, scheme, CNAME target, and A-record IP are derived — not dashboard fields.
 */
final class LabPublishConfig
{
    public function enabled(): bool
    {
        if (! app()->bound(SiteSettings::class)) {
            return true;
        }

        try {
            if (! Schema::hasTable('site_settings')) {
                return true;
            }

            return app(SiteSettings::class)->publishEnabled();
        } catch (\Throwable) {
            return true;
        }
    }

    public function parentDomain(): string
    {
        $host = $this->appHost();

        if ($host === '' || filter_var($host, FILTER_VALIDATE_IP)) {
            return 'localhost';
        }

        if (str_starts_with($host, 'www.')) {
            $host = substr($host, 4);
        }

        return $host;
    }

    public function scheme(): string
    {
        $app = parse_url((string) config('app.url'), PHP_URL_SCHEME);

        return $app === 'http' ? 'http' : 'https';
    }

    public function cnameTarget(): string
    {
        return $this->parentDomain();
    }

    public function serverIp(): string
    {
        if (app()->environment('testing')) {
            return $this->publicServerAddr();
        }

        $parent = $this->parentDomain();
        if ($parent === '' || $parent === 'localhost' || str_ends_with($parent, '.localhost')) {
            return $this->publicServerAddr();
        }

        foreach ($this->aRecords($parent) as $ip) {
            if ($this->isPublicIp($ip)) {
                return $ip;
            }
        }

        $resolved = gethostbyname($parent);
        if ($resolved !== $parent && $this->isPublicIp($resolved)) {
            return $resolved;
        }

        return $this->publicServerAddr();
    }

    public function appHost(): string
    {
        $host = strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST));

        return $this->punycode(rtrim($host, '.'));
    }

    /**
     * @return list<string>
     */
    public function reservedSubdomains(): array
    {
        /** @var list<string> $extra */
        $extra = config('lab.publish.reserved', []);

        return array_values(array_unique(array_map(
            static fn ($value) => strtolower(trim((string) $value)),
            [
                'www', 'lab', 'dashboard', 'api', 'mail', 'ftp', 'admin', 'app',
                'sites', 'status', 'assets', 'static', 'cdn', 'preview', 'staging',
                'blog', 'pages', 'login', 'register', 'auth', 'webhooks', 'up',
                ...$extra,
            ],
        )));
    }

    public function subdomainUrl(string $slug): string
    {
        return $this->scheme().'://'.$slug.'.'.$this->parentDomain();
    }

    public function customUrl(string $host): string
    {
        return $this->scheme().'://'.$host;
    }

    public function txtName(string $host): string
    {
        return '_krikkit-lab.'.$host;
    }

    public function txtValue(string $token): string
    {
        return 'krikkit='.$token;
    }

    public function punycode(string $host): string
    {
        $host = strtolower(trim($host));
        $host = rtrim($host, '.');
        if ($host === '' || ! function_exists('idn_to_ascii')) {
            return $host;
        }

        $ascii = idn_to_ascii($host, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46);

        return is_string($ascii) && $ascii !== '' ? strtolower($ascii) : $host;
    }

    /**
     * @return list<string>
     */
    private function aRecords(string $host): array
    {
        $ips = [];
        $rows = @dns_get_record($host, DNS_A) ?: [];
        foreach ($rows as $row) {
            if (! empty($row['ip'])) {
                $ips[] = (string) $row['ip'];
            }
        }

        return $ips;
    }

    private function publicServerAddr(): string
    {
        $addr = (string) (request()->server('SERVER_ADDR') ?? '');

        return $this->isPublicIp($addr) ? $addr : '';
    }

    private function isPublicIp(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }
}
