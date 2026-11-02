<?php

namespace App\Ai\Lab;

/**
 * Stable per-project look. Same UUID always yields the same identity;
 * different UUIDs almost never share mode + accent + hero + type.
 *
 * Assigned as a brief the model implements — positive recipes, not bans.
 */
final class ProjectVisualIdentity
{
    /**
     * @return array{
     *   project: string,
     *   mode: string,
     *   canvas: string,
     *   surface: string,
     *   soft: string,
     *   fg: string,
     *   fg_muted: string,
     *   line: string,
     *   accent: string,
     *   accent_name: string,
     *   font_ui: string,
     *   font_display: string,
     *   font_import: string,
     *   type_voice: string,
     *   type_scale: string,
     *   hero: string,
     *   nav: string,
     *   radius: string,
     *   cta: string,
     *   atmosphere: string,
     *   page_shape: string,
     *   page_shape_key: string
     * }
     */
    public static function fromUuid(string $uuid): array
    {
        $hash = hash('sha256', 'krikkit.lab.visual.v2|'.strtolower(trim($uuid)));

        $mode = self::pick($hash, 0, [
            'daylight' => [
                'dark' => false,
                'canvas' => '#ffffff',
                'surface' => '#ffffff',
                'soft' => '#f4f4f5',
                'fg' => '#18181b',
                'fg_muted' => '#52525b',
                'line' => 'color-mix(in oklab, black 6%, transparent)',
            ],
            'paper' => [
                'dark' => false,
                'canvas' => '#ffffff',
                'surface' => '#ffffff',
                'soft' => '#f6f3ed',
                'fg' => '#1c1917',
                'fg_muted' => '#57534e',
                'line' => 'color-mix(in oklab, black 6%, transparent)',
            ],
            'fog' => [
                'dark' => false,
                'canvas' => '#ffffff',
                'surface' => '#ffffff',
                'soft' => '#f1f5f9',
                'fg' => '#0f172a',
                'fg_muted' => '#475569',
                'line' => 'color-mix(in oklab, black 6%, transparent)',
            ],
            'sage' => [
                'dark' => false,
                'canvas' => '#ffffff',
                'surface' => '#ffffff',
                'soft' => '#eef2ea',
                'fg' => '#1a201a',
                'fg_muted' => '#4d564c',
                'line' => 'color-mix(in oklab, black 6%, transparent)',
            ],
            'linen' => [
                'dark' => false,
                'canvas' => '#ffffff',
                'surface' => '#ffffff',
                'soft' => '#f5f0e8',
                'fg' => '#231d15',
                'fg_muted' => '#5e5346',
                'line' => 'color-mix(in oklab, black 6%, transparent)',
            ],
        ]);

        $isDark = (bool) $mode['value']['dark'];

        // Each accent carries a light-canvas and a dark-canvas value so the hue
        // stays vivid on both registers.
        $accent = self::pick($hash, 8, [
            'cobalt' => ['light' => '#1d4ed8', 'dark' => '#5b8bfd'],
            'vermilion' => ['light' => '#dc2626', 'dark' => '#f87171'],
            'ochre' => ['light' => '#b45309', 'dark' => '#f59e0b'],
            'forest' => ['light' => '#047857', 'dark' => '#34d399'],
            'violet' => ['light' => '#6d28d9', 'dark' => '#a78bfa'],
            'rose' => ['light' => '#be123c', 'dark' => '#fb7185'],
            'slate' => ['light' => '#334155', 'dark' => '#94a3b8'],
            'gold' => ['light' => '#a16207', 'dark' => '#eab308'],
            'sea' => ['light' => '#0f766e', 'dark' => '#2dd4bf'],
            'coral' => ['light' => '#c2410c', 'dark' => '#fb923c'],
            'navy' => ['light' => '#1e3a8a', 'dark' => '#818cf8'],
            'lime' => ['light' => '#4d7c0f', 'dark' => '#a3e635'],
        ]);

        // Pairings span four families of voice: neutral grotesk, characterful
        // display sans, wide statement faces, and editorial serif pairs — so two
        // projects rarely share a typographic personality.
        $type = self::pick($hash, 16, [
            'inter' => [
                'ui' => '"Inter", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Inter", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");',
                'voice' => 'Neutral engineering voice — hierarchy comes from scale and weight, never novelty.',
            ],
            'geist' => [
                'ui' => '"Geist", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Geist", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap");',
                'voice' => 'Cool, technical, contemporary — suits infra/dev tools; pair with mono meta text.',
            ],
            'dm-sans' => [
                'ui' => '"DM Sans", ui-sans-serif, system-ui, sans-serif',
                'display' => '"DM Sans", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap");',
                'voice' => 'Rounded warmth in a geometric body — friendly product, consumer SaaS.',
            ],
            'manrope' => [
                'ui' => '"Manrope", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Manrope", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");',
                'voice' => 'Soft-cornered modernism; push display weight to 800 for confident heroes.',
            ],
            'sora' => [
                'ui' => '"Inter", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Sora", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap");',
                'voice' => 'Techy display over neutral body — the display face only appears at H1/H2 scale.',
            ],
            'plus-jakarta' => [
                'ui' => '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap");',
                'voice' => 'Polished corporate-modern; generous x-height keeps dense UIs readable.',
            ],
            'outfit' => [
                'ui' => '"Outfit", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Outfit", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap");',
                'voice' => 'Pure geometry — circles and lines; suits brands selling clarity and order.',
            ],
            'space-grotesk' => [
                'ui' => '"Inter", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap");',
                'voice' => 'Quirky mono-DNA display over a quiet body — dev tools, data products, labs.',
            ],
            'archivo' => [
                'ui' => '"Archivo", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Archivo", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,400;0,62..125,500;0,62..125,600;0,62..125,800;1,62..125,400&display=swap");',
                'voice' => 'Grotesque workhorse with a wide axis — set hero display extra-bold and slightly expanded (font-stretch: 115%) for a poster feel.',
            ],
            'gabarito' => [
                'ui' => '"Gabarito", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Gabarito", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Gabarito:wght@400;500;600;700;800&display=swap");',
                'voice' => 'Rounded, upbeat, approachable — consumer apps, food, community products.',
            ],
            'bricolage' => [
                'ui' => '"Inter", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,800&family=Inter:wght@400;500;600&display=swap");',
                'voice' => 'Characterful ink-trap display with real personality at large sizes — the headline IS the brand.',
            ],
            'syne' => [
                'ui' => '"Inter", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Syne", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap");',
                'voice' => 'Arty, wide, slightly strange — studios, portfolios, culture and fashion briefs.',
            ],
            'unbounded' => [
                'ui' => '"Manrope", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Unbounded", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap");',
                'voice' => 'Ultra-wide statement display — use at slightly smaller clamp sizes, few words per line; bold consumer/web3/creative energy.',
            ],
            'onest' => [
                'ui' => '"Onest", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Onest", ui-sans-serif, system-ui, sans-serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap");',
                'voice' => 'Rounded geometric sans — confident display weights, friendly SaaS and consumer products.',
            ],
            'instrument-serif' => [
                'ui' => '"Instrument Sans", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Instrument Serif", ui-serif, Georgia, serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&display=swap");',
                'voice' => 'High-style serif display (regular weight only, set LARGE) over a matching sans — ateliers, jewelry, premium editorial; use italic for emphasis words.',
            ],
            'newsreader' => [
                'ui' => '"Inter", ui-sans-serif, system-ui, sans-serif',
                'display' => '"Newsreader", ui-serif, Georgia, serif',
                'import' => '@import url("https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Inter:wght@400;500;600&display=swap");',
                'voice' => 'Literary serif display, quiet and intelligent — publications, journals, writing tools, long-form products.',
            ],
        ]);

        $hero = self::pick($hash, 24, [
            'monument-object' => 'One iconic object owns the first viewport — a CSS-built product shape, glyph, device, or photo cutout — with a backlight bloom behind it (radial gradient in fg or accent tint). Display H1 beside or beneath at clamp(3rem,7vw,6.5rem), 2–3 whisper-size support lines, one primary action + text link. A monochrome customer wordmark rail may close the viewport.',
            'showcase-full-width' => 'Display headline block (clamp(3rem,7vw,6rem), max two lines) with a one-line deck and one quiet “New — {feature} →” link; beneath it ONE full-width product screenshot mock that bleeds below the fold — a detailed app with sidebar, main pane, and right rail, 15+ realistic rows. The artifact is the lower half of the viewport, never a small card in a column.',
            'beacon-typographic' => 'Centered display type at clamp(3.5rem,9vw,7.5rem) with a faint color-field wash (one subtle radial, 10–14% tint) behind the headline block only — then a REQUIRED full-width product mock bleeding below the fold (inbox/dashboard, 12+ rows) or split artifact beside type. Never ship headline + deck + CTA alone on a giant blur blob.',
            'split-overflow' => 'Two asymmetric columns (~55/45): copy block (announcement pill, display H1 at clamp(2.75rem,6vw,5.5rem), deck, one primary action + text link) beside a MONUMENTAL product artifact that overflows the viewport edge and the fold — cropped, implying more product — with a backlight glow behind it.',
            'editorial-left' => 'Left-aligned type block with a generous left margin at clamp(3rem,8vw,7rem); the product artifact sits below, cropped by the viewport edge. Quiet, confident, asymmetric; the atmosphere is a soft light wash, not boxes.',
            'full-bleed-overlay' => 'Full-bleed photograph or texture with type overlaid near the bottom edge; a gradient scrim keeps contrast. The image IS the product — call lookup_visuals for photographic briefs. One quiet action.',
            'type-only-massive' => 'The display headline owns the viewport at clamp(3.5rem,10vw,8rem); beneath it a specific deck and a proof artifact (stat row, ticker, or overflowing product frame) anchor the claim. One primary action.',
        ]);

        $nav = self::pick($hash, 32, [
            'logo-left-cta-right' => 'Wordmark left; 4–6 product destinations + one primary CTA right. Sticky, borderless: `backdrop-blur-md` + white/canvas at 80% opacity — no bottom rule. Destinations belong to THIS product (Docs, Menu, Collection, Pricing…).',
            'links-center' => 'Wordmark left, 4–6 product destinations centered, one primary CTA right. Balanced, quiet, borderless chrome.',
            'editorial-underline' => 'Compact masthead; text-only destinations with opacity/color hover — no header border or underline bar. Suits editorial and studio briefs.',
            'split-minimal' => 'Wordmark left, 3–4 compact destinations and one primary CTA right. Sparse, borderless chrome that lets the hero own the viewport.',
        ]);

        $radius = self::pick($hash, 40, [
            'sharp-6' => '6px controls, 8px cards — engineered, precise.',
            'soft-10' => '8–10px controls, 12px cards — friendly, contemporary.',
            'pill-cta' => 'Pill CTAs; cards stay 8–12px — one playful signature on a disciplined page.',
        ]);

        $cta = self::pick($hash, 48, [
            'solid-accent' => 'Primary CTA = accent fill + contrasting label (Button variant="accent").',
            'solid-ink' => 'Primary CTA = fg fill on white canvas (Button variant="primary"). Accent lives elsewhere: eyebrow, key word, active states.',
            'ghost-accent' => 'Primary CTA = soft accent fill (`bg-accent/10 text-accent`) deepening on hover — no outline border.',
        ]);

        // Independent scale personality: two projects sharing a font pairing
        // still read differently when their type systems behave differently.
        // Second hash — the primary one is fully consumed by the other axes.
        $scaleHash = hash('sha256', 'krikkit.lab.visual.v2.scale|'.strtolower(trim($uuid)));
        $scale = self::pick($scaleHash, 0, [
            'monumental' => 'Push every display clamp to its ceiling; leading-[0.95], tracking-[-0.03em]; section H2s stay huge (text-5xl+). The page speaks in headlines; body copy is sparse and quiet.',
            'classic' => 'Middle of every clamp; leading-[1.02]; balanced hierarchy — deck and body copy carry meaning alongside display type.',
            'airy' => 'Display weights one step lighter (500–600), leading-[1.08], extra space between hero lines and sections; meta text whispers at 11–12px. The page breathes.',
            'engineered' => 'Bottom half of every display clamp; font-mono for eyebrows, stat labels, and meta; tabular numbers everywhere; tight precise spacing. An instrument, not a poster.',
            'editorial' => 'Uppercase micro-eyebrows (tracking-[0.2em]+) over large mixed-case display; one italic accent word in the H1 is welcome; testimonials at pull-quote scale.',
        ]);

        // Page architecture — independent hash so two agency briefs do not
        // collapse onto Work / Services / Process / About / Contact.
        $shapeHash = hash('sha256', 'krikkit.lab.visual.v3.shape|'.strtolower(trim($uuid)));
        $shape = self::pick($shapeHash, 0, [
            'index-film' => 'After the hero, the page is a typographic film strip. Each case is a full-width chapter (title, year, one artifact). Name sections for the content (Reels, Chapters, Selected, Visit).',
            'masonry-studio' => 'Irregular masonry of 7–9 uniquely sized frames after the hero. A short manifesto split replaces any service list. Name sections Frames, Manifesto, Visit.',
            'dossier-rail' => 'Sticky left rail of destinations; the right column is long-form case essays stacked. Enquiry is a small aside, not a full-width CTA band. Name sections Ledger, Case, Notes.',
            'statement-chapters' => 'Five full-viewport statements, each a different layout (type-only, split, full-bleed artifact, inverted band, quiet closer). Name them after the claims.',
            'proof-instrument' => 'Product-shaped: hero artifact, one dense deep-dive, a capability bento, then pricing. Name sections DeepDive, Capabilities, Pricing, Faq.',
            'editorial-index' => 'Magazine contents: numbered typographic entries (name — material — year), one featured story, then a visit strip. Name sections Contents, Feature, Visit.',
            'split-ledger' => 'Two persistent columns after the hero: left is a running index of names, right is the selected story. Name sections Index, Story, Enquire.',
            'horizon-band' => 'Hero, then one full-bleed proof band, then a single long feature story, then a quiet closer. Four sections besides header/footer. Name them Proof, Story, Close.',
        ]);

        // Light is a material — every identity ships a lighting system on a white canvas.
        $atmosphere = self::pick($hash, 56, [
            'backlight-bloom' => 'One large radial bloom in the hero only, positioned behind the product artifact (18–24% opacity, fades by ~60%). Never a full-viewport color wash behind empty type; never repeat in feature/pricing/CTA sections.',
            'spotlight-top' => 'One soft spotlight in the hero only: radial-gradient ellipse at top (10–14% fg or accent tint) fading out behind the mock. Sections below stay flat white — no repeated washes.',
            'color-field' => 'At most two small blurred accent shapes in the hero only (blur-3xl, 12–20% opacity) tucked behind the product mock — not behind headline-only posters. Zero color-field shapes below the fold.',
            'horizon-glow' => 'One luminous horizon band low in the hero (layered linear + radial, accent tinted) behind the product artifact. The closing CTA may use solid fg/accent fill — not another blur layer.',
        ]);

        return [
            'project' => strtolower(trim($uuid)),
            'mode' => $mode['key'],
            'canvas' => $mode['value']['canvas'],
            'surface' => $mode['value']['surface'],
            'soft' => $mode['value']['soft'],
            'fg' => $mode['value']['fg'],
            'fg_muted' => $mode['value']['fg_muted'],
            'line' => $mode['value']['line'],
            'accent' => $accent['value'][$isDark ? 'dark' : 'light'],
            'accent_name' => $accent['key'],
            'font_ui' => $type['value']['ui'],
            'font_display' => $type['value']['display'],
            'font_import' => $type['value']['import'],
            'type_voice' => $type['value']['voice'],
            'type_scale' => $scale['value'],
            'hero' => $hero['value'],
            'hero_key' => $hero['key'],
            'nav' => $nav['value'],
            'radius' => $radius['value'],
            'cta' => $cta['value'],
            'atmosphere' => $atmosphere['value'],
            'page_shape' => $shape['value'],
            'page_shape_key' => $shape['key'],
        ];
    }

    /**
     * @param  array<string, mixed>|null  $contextPack
     * @return array<string, mixed>
     */
    public static function attachToPack(?array $contextPack, string $uuid): array
    {
        $pack = is_array($contextPack) ? $contextPack : [];
        $inner = is_array($pack['pack'] ?? null) ? $pack['pack'] : [];
        $session = is_array($inner['session'] ?? null) ? $inner['session'] : [];
        $session['visual_identity'] = self::fromUuid($uuid);
        $inner['session'] = $session;
        $pack['pack'] = $inner;

        if (! isset($pack['version'])) {
            $pack['version'] = StageContextContract::VERSION;
        }

        return $pack;
    }

    /**
     * @param  array<string, array<string, mixed>|string>  $items
     * @return array{key: string, value: mixed}
     */
    private static function pick(string $hash, int $offset, array $items): array
    {
        $keys = array_keys($items);
        $slice = substr($hash, $offset, 8);
        $n = hexdec($slice === '' ? '0' : $slice);
        $key = $keys[$n % count($keys)];

        return [
            'key' => (string) $key,
            'value' => $items[$key],
        ];
    }
}
