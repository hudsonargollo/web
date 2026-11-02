<?php

namespace App\Lab\Publish;

use InvalidArgumentException;

/**
 * Normalize and match public Lab hosts (subdomain + custom domain).
 */
final class PublishHost
{
    public function __construct(
        private readonly LabPublishConfig $config,
    ) {}

    public function normalizeSubdomain(string $raw): string
    {
        $slug = strtolower(trim($raw));
        $slug = str_replace(['_', ' '], '-', $slug);
        $slug = preg_replace('/[^a-z0-9-]+/', '', $slug) ?? '';
        $slug = trim($slug, '-');

        return $slug;
    }

    public function suggestSubdomain(?string $title, string $fallback): string
    {
        $base = $this->normalizeSubdomain((string) $title);
        if ($base === '') {
            $base = $this->normalizeSubdomain(substr($fallback, 0, 8));
        }
        if ($base === '') {
            $base = 'site';
        }
        if (strlen($base) > 48) {
            $base = rtrim(substr($base, 0, 48), '-');
        }

        return $base;
    }

    public function randomSubdomain(): string
    {
        $alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
        $max = strlen($alphabet) - 1;
        $slug = '';
        for ($i = 0; $i < 12; $i++) {
            $slug .= $alphabet[random_int(0, $max)];
        }

        return $slug;
    }

    public function assertSubdomain(string $slug): void
    {
        if ($slug === '' || strlen($slug) < 3 || strlen($slug) > 48) {
            throw new InvalidArgumentException(__('dashboard.Subdomain must be 3–48 letters, numbers, or hyphens.'));
        }
        if (! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
            throw new InvalidArgumentException(__('dashboard.Subdomain must be 3–48 letters, numbers, or hyphens.'));
        }
        if (in_array($slug, $this->config->reservedSubdomains(), true)) {
            throw new InvalidArgumentException(__('dashboard.That subdomain is reserved.'));
        }
    }

    public function normalizeCustomHost(string $raw): string
    {
        $value = trim($raw);
        $value = preg_replace('#^https?://#i', '', $value) ?? $value;
        $value = explode('/', $value, 2)[0];
        $value = explode('?', $value, 2)[0];
        $value = strtolower(trim($value));
        $value = rtrim($value, '.');

        if (str_contains($value, ':')) {
            $parts = explode(':', $value);
            $port = array_pop($parts);
            $value = implode(':', $parts);
            if (! in_array($port, ['80', '443', ''], true)) {
                throw new InvalidArgumentException(__('dashboard.Enter a hostname without a port.'));
            }
        }

        return $this->config->punycode($value);
    }

    public function assertCustomHost(string $host): void
    {
        if ($host === '' || strlen($host) > 253) {
            throw new InvalidArgumentException(__('dashboard.Enter a valid domain, such as www.studio.com.'));
        }
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            throw new InvalidArgumentException(__('dashboard.Enter a domain name, not an IP address.'));
        }
        if (! preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/', $host)) {
            throw new InvalidArgumentException(__('dashboard.Enter a valid domain, such as www.studio.com.'));
        }

        $appHost = $this->config->appHost();
        $parent = $this->config->parentDomain();

        if ($host === $appHost || $host === $parent) {
            throw new InvalidArgumentException(__('dashboard.That host is used by Krikkit itself.'));
        }
        if ($appHost !== '' && (str_ends_with($host, '.'.$appHost) || $host === $appHost)) {
            throw new InvalidArgumentException(__('dashboard.That host is used by Krikkit itself.'));
        }
        if (str_ends_with($host, '.'.$parent) || $host === $parent) {
            throw new InvalidArgumentException(__('dashboard.Use the subdomain option for hosts under :domain.', [
                'domain' => $parent,
            ]));
        }
    }

    public function subdomainFromRequestHost(string $host): ?string
    {
        $host = $this->config->punycode(strtolower(rtrim(trim($host), '.')));
        $parent = $this->config->parentDomain();
        $suffix = '.'.$parent;
        if ($host === $parent || ! str_ends_with($host, $suffix)) {
            return null;
        }

        $slug = substr($host, 0, -strlen($suffix));
        if ($slug === '' || str_contains($slug, '.')) {
            return null;
        }

        return $slug;
    }
}
