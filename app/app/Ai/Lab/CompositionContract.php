<?php

namespace App\Ai\Lab;

/**
 * Local composition checks — no model, no credits.
 *
 * Narrow by design: only mechanically-detectable garbage is rejected
 * (grids of empty placeholder tiles standing in for photographs).
 * Taste and structure live in the design-language prompt, not in regexes —
 * broad heuristics here previously rejected legitimate writes (avatars,
 * status dots, menu buttons) and stalled builds at the seed.
 */
final class CompositionContract
{
    /**
     * @param  array<string, string>  $files  VFS path => source
     * @return array{ok: bool, issues: list<array{code: string, path: string, detail: string}>}
     */
    public static function inspect(array $files): array
    {
        $issues = [];
        foreach ($files as $path => $body) {
            $path = str_replace('\\', '/', (string) $path);
            $source = (string) $body;
            $issues = array_merge($issues, self::inspectFile($path, $source));
        }

        $app = self::fileNamed($files, 'App.jsx');
        if ($app !== null && self::isLandingSectionStack($app)) {
            $issues[] = [
                'code' => 'landing_section_stack',
                'path' => 'src/App.jsx',
                'detail' => 'Generic Hero + Collection + About + Footer stack. Name sections after their real content and give each depth (see design language).',
            ];
        }

        return [
            'ok' => $issues === [],
            'issues' => $issues,
        ];
    }

    /**
     * First hard reject for a single write, or null when the body may land.
     * Only empty placeholder-tile grids block a write; everything else is
     * advisory (inspect) and handled by the prompts.
     *
     * @return array{code: string, path: string, detail: string}|null
     */
    public static function writeReject(string $path, string $body): ?array
    {
        $path = str_replace('\\', '/', $path);
        foreach (self::inspectFile($path, $body) as $issue) {
            if (in_array($issue['code'], [
                'empty_product_tiles',
                'dead_grid_span',
                'custom_router_wrapper',
                'hooks_outside_component',
                'component_name_stub',
                'poster_glow_hero',
            ], true)) {
                return $issue;
            }
        }

        return null;
    }

    /**
     * True when this single write would land a banned empty-tile page.
     */
    public static function rejectsWrite(string $path, string $body): bool
    {
        return self::writeReject($path, $body) !== null;
    }

    /**
     * @return list<array{code: string, path: string, detail: string}>
     */
    private static function inspectFile(string $path, string $source): array
    {
        $issues = [];

        if (self::isCustomRouterWrapperPath($path)) {
            $issues[] = [
                'code' => 'custom_router_wrapper',
                'path' => $path,
                'detail' => 'Never create a custom MemoryRouter/Router component. Import MemoryRouter, Routes, Route, Link, and useLocation from react-router-dom only.',
            ];
        }

        if (preg_match('/\.(jsx|tsx)$/i', $path) && self::hooksOutsideComponent($source)) {
            $issues[] = [
                'code' => 'hooks_outside_component',
                'path' => $path,
                'detail' => 'React hooks must run at the top level inside a function component — not at module scope, not inside callbacks.',
            ];
        }

        if (preg_match('/\.(jsx|tsx)$/i', $path) && self::isComponentNameStub($source)) {
            $issues[] = [
                'code' => 'component_name_stub',
                'path' => $path,
                'detail' => 'Placeholder component that only renders its own name. Ship real section content — copy, data arrays, CTAs, forms — matching the home page depth.',
            ];
        }

        $hasImg = (bool) preg_match('/<img\b/i', $source);

        // Self-closing aspect-square divs are empty tile slots (no children, no photo).
        // Avatars, status dots, and sized decorations do not match this shape.
        $emptyTiles = preg_match_all('/<div\b[^>]*aspect-square[^>]*\/>/i', $source) ?: 0;
        $mapped = (bool) preg_match('/\.map\s*\(/', $source);
        if (! $hasImg && ($emptyTiles >= 3 || ($emptyTiles >= 1 && $mapped))) {
            $issues[] = [
                'code' => 'empty_product_tiles',
                'path' => $path,
                'detail' => 'Empty aspect-square tiles without photographs. Call lookup_visuals and use visual.src, or show one cinematic object / typographic index.',
            ];
        }

        // <Reveal> renders the grid child itself — a col/row-span on a lone div
        // directly inside it is dead and leaves the grid column empty.
        if (preg_match_all('/<Reveal\b([^>]*)>\s*<div\b[^>]*\bcol-span-\d/', $source, $matches)) {
            foreach ($matches[1] as $revealAttrs) {
                if (stripos($revealAttrs, 'col-span') !== false) {
                    continue;
                }
                $issues[] = [
                    'code' => 'dead_grid_span',
                    'path' => $path,
                    'detail' => 'col-span on a div directly inside <Reveal> has no effect — Reveal renders the grid child. Move layout classes onto the Reveal: <Reveal className="lg:col-span-2">.',
                ];
                break;
            }
        }

        if (preg_match('/\/Hero\.(jsx|tsx)$/i', $path) && self::isGlowOnlyHero($source)) {
            $issues[] = [
                'code' => 'poster_glow_hero',
                'path' => $path,
                'detail' => 'Glow-only hero — headline on a radial/blur backdrop with no product mock. Add a full-width inbox/dashboard mock (12+ rows), split-column artifact, or proof rail in the same section.',
            ];
        }

        return $issues;
    }

    private static function isLandingSectionStack(string $app): bool
    {
        $hasHero = (bool) preg_match('/\bHero\b/', $app);
        $hasCollection = (bool) preg_match('/\bCollection\b/', $app);
        $hasAbout = (bool) preg_match('/\b(Atelier|About|Contact)\b/', $app);
        $hasFooter = (bool) preg_match('/\bFooter\b/', $app);

        return $hasHero && $hasCollection && $hasAbout && $hasFooter;
    }

    /**
     * @param  array<string, string>  $files
     */
    private static function fileNamed(array $files, string $basename): ?string
    {
        foreach ($files as $path => $body) {
            if (basename(str_replace('\\', '/', (string) $path)) === $basename) {
                return (string) $body;
            }
        }

        return null;
    }

    private static function isCustomRouterWrapperPath(string $path): bool
    {
        $base = basename(str_replace('\\', '/', $path));

        return (bool) preg_match('/^(MemoryRouter|HashRouter|BrowserRouter|Router)\.jsx$/i', $base);
    }

    private static function isComponentNameStub(string $source): bool
    {
        if (! preg_match('/\bfunction\s+([A-Z]\w*)\s*\(/', $source, $nameMatch)) {
            return false;
        }

        $name = (string) ($nameMatch[1] ?? '');
        if ($name === '') {
            return false;
        }

        if (! preg_match('/<h[12]\b[^>]*>\s*'.preg_quote($name, '/').'\s*<\/h[12]>/', $source)) {
            return false;
        }

        // Real sections carry more than a lone titled shell.
        if (preg_match('/\.map\s*\(/', $source)) {
            return false;
        }

        if (preg_match('/<(Button|Input|Label|Textarea|Link|img)\b/i', $source)) {
            return false;
        }

        return strlen($source) < 700;
    }

    private static function hooksOutsideComponent(string $source): bool
    {
        $stripped = preg_replace('/\/\*[\s\S]*?\*\//', '', $source) ?? $source;
        $stripped = preg_replace('/\/\/[^\n]*/', '', $stripped) ?? $stripped;

        if (! preg_match('/\buse(?:State|Effect|Ref|Memo|Callback|Context|Reducer|LayoutEffect|Id|Transition|DeferredValue|SyncExternalStore|InsertionEffect|Location|Navigate|Params|SearchParams|Match|Matches|OutletContext|InRouterContext)\s*\(/i', $stripped, $hookMatch, PREG_OFFSET_CAPTURE)) {
            return false;
        }

        $hookAt = (int) ($hookMatch[0][1] ?? -1);
        if ($hookAt < 0) {
            return false;
        }

        if (! preg_match('/\b(?:export\s+default\s+function|export\s+function|function\s+[A-Z]\w*\s*\()/i', $stripped, $componentMatch, PREG_OFFSET_CAPTURE)) {
            return true;
        }

        $componentAt = (int) ($componentMatch[0][1] ?? PHP_INT_MAX);

        return $hookAt < $componentAt;
    }

    private static function isGlowOnlyHero(string $source): bool
    {
        $hasGlow = (bool) preg_match('/blur-(?:2xl|3xl)|radial-gradient|bg-accent\/\d+\s+blur/i', $source);
        if (! $hasGlow) {
            return false;
        }

        $hasProductArtifact = (bool) preg_match('/\.map\s*\(/', $source)
            || (bool) preg_match('/<img\b/i', $source)
            || (bool) preg_match('/-mb-(?:24|32|40)/', $source)
            || (bool) preg_match('/lg:grid-cols/', $source)
            || (bool) preg_match('/overflow-hidden rounded-2xl bg-soft/', $source)
            || (bool) preg_match('/size-\[(?:1[89]|2[0-4])rem\]/', $source);

        return ! $hasProductArtifact;
    }
}
