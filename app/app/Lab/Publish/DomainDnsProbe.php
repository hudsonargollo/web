<?php

namespace App\Lab\Publish;

/**
 * DNS checks for custom-domain verification (CNAME / A / TXT).
 */
final class DomainDnsProbe
{
    /**
     * @var (callable(string): array{cname: list<string>, a: list<string>, txt: list<string>})|null
     */
    private $lookup;

    /**
     * @param  (callable(string): array{cname: list<string>, a: list<string>, txt: list<string>})|null  $lookup
     */
    public function __construct(?callable $lookup = null)
    {
        $this->lookup = $lookup;
    }

    public function pointsToPublishTarget(string $host, LabPublishConfig $config): bool
    {
        $records = $this->lookup($host);
        $cnameTarget = $config->cnameTarget();
        foreach ($records['cname'] as $target) {
            if ($this->hostsMatch($target, $cnameTarget)) {
                return true;
            }
        }

        $ip = $config->serverIp();
        if ($ip !== '' && in_array($ip, $records['a'], true)) {
            return true;
        }

        return false;
    }

    public function hasVerificationTxt(string $host, string $token, LabPublishConfig $config): bool
    {
        $name = $config->txtName($host);
        $expected = strtolower($config->txtValue($token));
        $records = $this->lookup($name);

        foreach ($records['txt'] as $txt) {
            if (strtolower(trim($txt, '"')) === $expected) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{cname: list<string>, a: list<string>, txt: list<string>}
     */
    public function lookup(string $host): array
    {
        if ($this->lookup !== null) {
            return ($this->lookup)($host);
        }

        return $this->fromPhp($host);
    }

    /**
     * @return array{cname: list<string>, a: list<string>, txt: list<string>}
     */
    private function fromPhp(string $host): array
    {
        $cname = [];
        $a = [];
        $txt = [];

        $cnameRows = @dns_get_record($host, DNS_CNAME) ?: [];
        foreach ($cnameRows as $row) {
            if (! empty($row['target'])) {
                $cname[] = rtrim(strtolower((string) $row['target']), '.');
            }
        }

        $aRows = @dns_get_record($host, DNS_A) ?: [];
        foreach ($aRows as $row) {
            if (! empty($row['ip'])) {
                $a[] = (string) $row['ip'];
            }
        }

        $txtRows = @dns_get_record($host, DNS_TXT) ?: [];
        foreach ($txtRows as $row) {
            if (! empty($row['txt'])) {
                $txt[] = (string) $row['txt'];
            }
        }

        return [
            'cname' => array_values(array_unique($cname)),
            'a' => array_values(array_unique($a)),
            'txt' => array_values(array_unique($txt)),
        ];
    }

    private function hostsMatch(string $left, string $right): bool
    {
        return rtrim(strtolower($left), '.') === rtrim(strtolower($right), '.');
    }
}
