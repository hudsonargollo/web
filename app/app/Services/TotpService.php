<?php

namespace App\Services;

use BaconQrCode\Renderer\Color\Rgb;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\Fill;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Str;

class TotpService
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function generateSecret(int $length = 32): string
    {
        $secret = '';

        for ($i = 0; $i < $length; $i++) {
            $secret .= self::ALPHABET[random_int(0, 31)];
        }

        return $secret;
    }

    public function verify(string $secret, string $code, int $window = 1, ?int $lastTimestep = null): bool
    {
        return $this->matchingTimestep($secret, $code, $window, $lastTimestep) !== null;
    }

    /**
     * Returns the matching TOTP timestep, or null if invalid / already used.
     */
    public function matchingTimestep(string $secret, string $code, int $window = 1, ?int $lastTimestep = null): ?int
    {
        $code = preg_replace('/\s+/', '', $code) ?? '';

        if (! preg_match('/^\d{6}$/', $code)) {
            return null;
        }

        $currentTimestep = intdiv(time(), 30);

        for ($i = -$window; $i <= $window; $i++) {
            $timestep = $currentTimestep + $i;

            if ($lastTimestep !== null && $timestep <= $lastTimestep) {
                continue;
            }

            if (hash_equals($this->codeAt($secret, $timestep * 30), $code)) {
                return $timestep;
            }
        }

        return null;
    }

    public function codeAt(string $secret, ?int $timestamp = null): string
    {
        $timestamp ??= time();
        $counter = intdiv($timestamp, 30);
        $secretKey = $this->base32Decode($secret);
        $binaryCounter = pack('N*', 0, $counter);
        $hash = hash_hmac('sha1', $binaryCounter, $secretKey, true);
        $offset = ord($hash[19]) & 0x0F;
        $value = (
            ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF)
        );

        return str_pad((string) ($value % 1_000_000), 6, '0', STR_PAD_LEFT);
    }

    public function provisioningUri(string $secret, string $email, string $issuer): string
    {
        $label = rawurlencode($issuer.':'.$email);
        $query = http_build_query([
            'secret' => $secret,
            'issuer' => $issuer,
            'algorithm' => 'SHA1',
            'digits' => 6,
            'period' => 30,
        ], '', '&', PHP_QUERY_RFC3986);

        return "otpauth://totp/{$label}?{$query}";
    }

    /**
     * Local SVG QR (same approach as Fortify's twoFactorQrCodeSvg).
     * Returns null when the host PHP build lacks iconv (common on minimal cPanel images).
     */
    public function qrCodeSvg(string $provisioningUri, int $size = 192): ?string
    {
        if (! function_exists('iconv')) {
            return null;
        }

        try {
            $svg = (new Writer(
                new ImageRenderer(
                    new RendererStyle($size, 0, null, null, Fill::uniformColor(
                        new Rgb(255, 255, 255),
                        new Rgb(45, 55, 72)
                    )),
                    new SvgImageBackEnd
                )
            ))->writeString($provisioningUri);

            $newline = strpos($svg, "\n");

            return $newline === false ? trim($svg) : trim(substr($svg, $newline + 1));
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    public function generateRecoveryCodes(int $count = 8): array
    {
        return collect(range(1, $count))
            ->map(fn () => Str::lower(Str::random(10).'-'.Str::random(10)))
            ->all();
    }

    private function base32Decode(string $secret): string
    {
        $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret) ?? '');
        $buffer = 0;
        $bitsLeft = 0;
        $result = '';

        foreach (str_split($secret) as $char) {
            $value = strpos(self::ALPHABET, $char);

            if ($value === false) {
                continue;
            }

            $buffer = ($buffer << 5) | $value;
            $bitsLeft += 5;

            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $result .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }

        return $result;
    }
}
