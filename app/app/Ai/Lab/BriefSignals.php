<?php

namespace App\Ai\Lab;

/**
 * Cheap text heuristics so Lab can require photographs without a model call.
 */
final class BriefSignals
{
    public static function looksLikeSoftware(string $text): bool
    {
        $t = self::fold($text);

        return (bool) preg_match(
            '/\b(saas|dashboard|auth|cli|api\b|sdk|docs?|editor|ide\b|status page|component library|design system)\b/u',
            $t,
        );
    }

    /**
     * House / retail / food / body — needs lookup_visuals before write_file.
     */
    public static function needsPhotograph(string $text): bool
    {
        $t = self::fold($text);
        if ($t === '' || self::looksLikeSoftware($t)) {
            return false;
        }

        return (bool) preg_match(
            '/jewelry|jeweller|atelier|restaurant|hotel|bakery|cafe|coffee|boutique|florist|fashion|spa\b|wine|gallery|museum|barber|salon|food\b|interior|architect|jewels?|ring\b|necklace|earring/u',
            $t,
        );
    }

    /**
     * @param  array<string, string>  $files
     */
    public static function vfsHasPhotograph(array $files): bool
    {
        foreach ($files as $body) {
            if (preg_match('/<img\b[^>]*src\s*=\s*["\'][^"\']+/i', (string) $body)) {
                return true;
            }
        }

        return false;
    }

    private static function fold(string $text): string
    {
        return mb_strtolower(trim($text));
    }
}
