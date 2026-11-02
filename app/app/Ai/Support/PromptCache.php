<?php

namespace App\Ai\Support;

/**
 * Provider-specific prompt-cache markers for stable system + tool prefixes.
 *
 * Anthropic rules that matter in production:
 * - Haiku 4.5 / Opus 4.5+ need ≥4096 tokens in the cached prefix (Sonnet ≥1024).
 * - Below the minimum, cache_control is silently ignored (creation/read = 0).
 * - cache_control on tools caches EVERYTHING before tools — including later
 *   system blocks. Never put turn-local dynamic JSON in system if tools are cached.
 * - Put a single breakpoint on the LAST stable system block; cache tools only when
 *   system contains no uncached trailing dynamic content.
 */
final class PromptCache
{
    public const EPHEMERAL = ['type' => 'ephemeral'];

    /**
     * Extra stable text appended to the Anthropic cached system prefix.
     *
     * Haiku 4.5 requires ≥4096 tokens *up to the system cache breakpoint*
     * (tools after that breakpoint do not count toward the minimum). Lab
     * base+rules+baseline alone is ~3200 tokens and silently misses cache.
     * This floor pushes the cached system prefix over the Haiku threshold.
     */
    public const STABLE_FLOOR = <<<'TXT'

## Lab cache-stable invariants (do not restate in replies)
- Working VFS is the only write target; Canonical promotes only after validate.
- Stack pin: react@19.1.1 + react-dom@19.1.1 exact; MemoryRouter only (never BrowserRouter/HashRouter).
- Tailwind v4: `src/index.css` is `@import "tailwindcss"` + `@theme` (`--color-*`, `--font-sans`, `--font-display`, `--spacing: 0.25rem`) + `body` from those tokens. Preflight is the reset. No tailwind.config.*.
- Writes: atomic write_file only (complete file body every time). No apply_patch / search-replace.
- Integrity: every import must resolve; auto-create missing components; never drop Header/Footer/Navbar/Sidebar.
- Completeness: a named product is a full brief — infer real nav, a cinematic hero with the product on the page. Never two equal hero buttons, empty rounded-full tiles, or Header+Hero+Collection+About+Footer.
- Photographic briefs: lookup_visuals in its own round before write_file; paste visual.src into img. Seed App.jsx is empty canvas — overwrite it.
- Shipped-product bar: Linear / Clerk / Cursor / Vercel / Resend / Superhuman class density. One primary hero Button.
- Output discipline: <thought> under 100 words; no pleasantries; no fenced file bodies in chat; native tools only.
- Explore budget: at most a couple list/read calls before writing; do not resend stale directory scans.
- When unsure of live file text, call read_file once, then write_file with the complete body.
- Preview is about:srcdoc — avoid APIs that touch window.location / History for routing.
- Keep package.json dependency versions compatible with the Lab import map; do not duplicate React.
- Prefer editing existing layout shells in place over deleting and recreating them mid-turn.
- Multi-file work may emit concise <todos> outcomes; omit todos for trivial one-line fixes.
- Silent build / auto-repair turns must mutate VFS via tools immediately — no discovery questions.
- Path policy: write under src/ or public/ (plus package.json / vite.config.*); reject other roots.
- After tool results, continue with a fresh short <thought> then the next tool batch or a short user-facing recap.
- Do not narrate cache, tokens, or internal orchestration in user-visible chat.
- Treat context_baseline_json as the workspace map; re-read files instead of trusting stale previews.
- Prefer one decisive write_file per file — no speculative patch retries.
- If topology reports missing modules, create them with write_file before finishing the turn.
- Photographs: call lookup_visuals with a concrete English scene before writing img tags; use returned src values only.
- Data plane: call survey_datastore before auth/CRUD writes; apply SQL with revise_datastore; never put steward keys in the VFS.
- GitHub: when the user asks to push, pull, fork, compare, or attach a repo, call github_status then github_push / github_pull / github_fork / github_compare / github_link / github_create_repo. Lab opens the GitHub desk if they still need to connect. Never invent git CLI output.
- Match the user language for visible status text (one short line during tools) and always leave a 2–4 sentence recap after a mutation turn — never close on tools-only silence.
TXT;

    /**
     * Build Anthropic system content blocks.
     *
     * Stable parts are emitted first. Only the last stable block gets cache_control
     * so the cumulative prefix can clear Haiku's 4096-token floor.
     *
     * @param  list<array{text: string, cache?: bool}>  $parts
     * @return list<array{type: string, text: string, cache_control?: array{type: string}}>|string
     */
    public static function anthropicBlocks(array $parts, bool $padFloor = true): array|string
    {
        $blocks = [];
        foreach ($parts as $part) {
            $text = trim((string) ($part['text'] ?? ''));
            if ($text === '') {
                continue;
            }
            $blocks[] = [
                'type' => 'text',
                'text' => $text,
            ];
        }

        if ($blocks === []) {
            return '';
        }

        // Lab turns only — title / translate must not inherit VFS + lookup_visuals rules.
        if ($padFloor) {
            $blocks[count($blocks) - 1]['text'] = rtrim($blocks[count($blocks) - 1]['text'])."\n".self::STABLE_FLOOR;
        }

        // Single breakpoint on the final stable block (caller should omit dynamic here).
        $last = count($blocks) - 1;
        $blocks[$last]['cache_control'] = self::EPHEMERAL;

        return $blocks;
    }

    /**
     * Stable system layers only (no turn-local dynamic). Cached as one prefix.
     *
     * @return list<array{type: string, text: string, cache_control?: array{type: string}}>|string
     */
    public static function anthropicSystem(
        string $stable,
        string $dynamic = '',
        string $baseline = '',
        string $rules = '',
        bool $padFloor = true,
    ): array|string {
        // $dynamic is ignored here on purpose — callers must place it in messages
        // so tool-level cache_control does not invalidate every turn.
        unset($dynamic);

        return self::anthropicBlocks([
            ['text' => $stable],
            ['text' => $rules],
            ['text' => $baseline],
        ], $padFloor);
    }

    /**
     * Mark the last Anthropic tool definition as a cache breakpoint.
     * Only safe when system has no trailing uncached dynamic blocks.
     *
     * @param  list<array<string, mixed>>  $tools
     * @return list<array<string, mixed>>
     */
    public static function withAnthropicToolCache(array $tools): array
    {
        if ($tools === []) {
            return $tools;
        }

        $last = count($tools) - 1;
        $tools[$last] = array_merge($tools[$last], [
            'cache_control' => self::EPHEMERAL,
        ]);

        return $tools;
    }

    /**
     * Full system string for providers without block caching (stable prefix first).
     */
    public static function concatenate(string ...$parts): string
    {
        $chunks = [];
        foreach ($parts as $part) {
            $trimmed = trim($part);
            if ($trimmed !== '') {
                $chunks[] = $trimmed;
            }
        }

        return implode("\n", $chunks);
    }
}
