<?php

namespace App\Ai\Lab;

use App\Ai\Data\AgentStage;

/**
 * Validates and serializes staged ContextPack payloads for ChatGateway injection.
 *
 * Wire contract (JSON):
 * {
 *   "version": 1,
 *   "stage": "router"|"planner"|"executor"|"chat"|"clarify",
 *   "pack": { session, conversation, manifest?, hotFiles?, observations?, diffLedger?, safetyFlags? }
 * }
 *
 * Prompt-cache layout (Anthropic ephemeral breakpoints):
 * - system_rules     → stage policy (stable, cacheable)
 * - system_baseline  → session + VFS manifest (stable within session, cacheable)
 * - system_dynamic   → hotFiles / observations / turn flags (uncached)
 * - system_suffix    → rules+baseline+dynamic (compat / OpenAI concatenation)
 */
final class StageContextContract
{
    public const VERSION = 1;

    /**
     * @param  array<string, mixed>  $payload
     * @return array{
     *   version: int,
     *   stage: string,
     *   pack: array<string, mixed>,
     *   system_rules: string,
     *   system_baseline: string,
     *   system_dynamic: string,
     *   system_suffix: string
     * }
     */
    public function normalize(array $payload, ?AgentStage $forcedStage = null): array
    {
        $stage = $forcedStage ?? AgentStage::tryFrom((string) ($payload['stage'] ?? '')) ?? AgentStage::Chat;
        $pack = is_array($payload['pack'] ?? null) ? $payload['pack'] : [];

        $normalizedPack = $this->filterPackForStage($stage, $pack);
        $rules = $this->renderStageRules($stage, $normalizedPack);
        $baseline = $this->renderBaseline($stage, $normalizedPack);
        $dynamic = $this->renderDynamic($stage, $normalizedPack);

        return [
            'version' => self::VERSION,
            'stage' => $stage->value,
            'pack' => $normalizedPack,
            'system_rules' => $rules,
            'system_baseline' => $baseline,
            'system_dynamic' => $dynamic,
            // Compat: full suffix for tests / providers that concatenate.
            'system_suffix' => trim($rules."\n".$baseline."\n".$dynamic),
        ];
    }

    /**
     * @param  array<string, mixed>  $pack
     * @return array<string, mixed>
     */
    private function filterPackForStage(AgentStage $stage, array $pack): array
    {
        $session = is_array($pack['session'] ?? null) ? $pack['session'] : [];
        $conversation = is_array($pack['conversation'] ?? null) ? $pack['conversation'] : [];
        $safety = is_array($pack['safetyFlags'] ?? null) ? $pack['safetyFlags'] : [];
        $workspaceOpen = (bool) ($safety['workspaceOpen'] ?? $session['workspaceOpen'] ?? false);

        // Messages[] already carries dialogue — never re-inject full recent turns.
        $conversationLite = [
            'summary' => $conversation['summary'] ?? null,
        ];

        return match ($stage) {
            AgentStage::Router, AgentStage::Chat, AgentStage::Clarify => [
                'session' => $session,
                'conversation' => $conversationLite,
                'safetyFlags' => $safety,
                'manifest' => $workspaceOpen ? ($pack['manifest'] ?? null) : null,
                'hotFiles' => [],
                'observations' => [],
                'diffLedger' => [],
            ],
            AgentStage::Planner => [
                'session' => $session,
                'conversation' => $conversationLite,
                'safetyFlags' => $safety,
                'manifest' => $pack['manifest'] ?? null,
                'hotFiles' => [],
                'observations' => [],
                'diffLedger' => is_array($pack['diffLedger'] ?? null) ? $pack['diffLedger'] : [],
            ],
            AgentStage::Executor => [
                'session' => $session,
                'conversation' => $conversationLite,
                'safetyFlags' => $safety,
                'manifest' => $pack['manifest'] ?? null,
                'hotFiles' => is_array($pack['hotFiles'] ?? null) ? $pack['hotFiles'] : [],
                'observations' => is_array($pack['observations'] ?? null) ? $pack['observations'] : [],
                'diffLedger' => is_array($pack['diffLedger'] ?? null) ? $pack['diffLedger'] : [],
            ],
        };
    }

    /**
     * @param  array<string, mixed>  $pack
     */
    private function renderStageRules(AgentStage $stage, array $pack): string
    {
        $safety = is_array($pack['safetyFlags'] ?? null) ? $pack['safetyFlags'] : [];
        $session = is_array($pack['session'] ?? null) ? $pack['session'] : [];
        $proposalRejected = (bool) ($safety['proposalRejected'] ?? false);
        $turnRecap = (bool) ($safety['turnRecap'] ?? false);
        $workspaceOpen = (bool) ($safety['workspaceOpen'] ?? $session['workspaceOpen'] ?? false);

        $thoughtHint = <<<'HINT'

Thought block (required, concise):
Every response MUST begin with a <thought>…</thought> block before any visible reply and before any tool call. After tool results, emit a fresh <thought> before the next tools or final text. Never put the final user-facing answer only inside <thought>.
Hard limit: < 100 words inside <thought>. Intent + next tool plan only — no essays, no restating the user, no code dumps, no chain-of-thought narration, no conversational pleasantries (“Sure!”, “Happy to help”, “Great question”).
HINT;

        $suggestionsHint = <<<'HINT'

Suggested replies (optional, discovery only):
- When you ask a clarifying question, you MAY end the reply with 2–3 short answer chips the user can tap:
  <suggestions>["Option A", "Option B", "Option C"]</suggestions>
- Each chip is a concrete reply the user would send next (not a question). Keep each under ~40 characters. Match the user’s language.
- Omit the tag when you are not asking for a quick choice, or when emitting propose_workspace.
- Never mention the suggestions tag or JSON in visible prose.
HINT;

        $rejectHint = $proposalRejected ? <<<'HINT'

BUILD PROPOSAL REJECTED (UI Skip — not a user chat message):
- The user declined the proposed build plan via the Skip control.
- Keep context; shelf this proposal. Do NOT invent new defaults, do NOT emit propose_workspace on this turn.
- Reply briefly in the user’s language: acknowledge the pass, ask what they dislike or want to change, and how to proceed.
- No code dumps in chat. No pleasantries.
HINT : '';

        $recapHint = <<<'HINT'

TURN RECAP (workspace writes already landed — do not call tools):
- Reply in the user’s language, 2–4 short conversational sentences.
- Say what changed and what they can try in Preview.
- No questions, no code fences, no file dumps, no propose_workspace, no <todos>.
- Do not start another build.
HINT;

        $workspaceChatHint = <<<'HINT'

Workspace chat rules for this stage:
- Match the user’s language. The project workspace is already open — this turn is conversation only.
- Greetings, questions, and discussion stay in chat. Never dump fenced HTML/CSS/JS/Blade into chat.
- Do NOT call write_file or any VFS mutation tools. Do not start or resume a build.
- Do NOT emit propose_workspace / readiness meta.
- Answer about the current product. Keep replies short. No interview lists; no conversational filler.
HINT;

        $discoveryHint = <<<'HINT'

Discovery rules for this stage:
- Match the user’s language. Chat = product talk only — never dump fenced HTML/CSS/JS/Blade into chat; code belongs in the workspace VFS.
- At most 1–2 critical questions; keep replies short; no interview lists; no conversational filler.
- Do NOT call write_file or any VFS mutation tools. Discovery has no build workspace yet.
- If the user deferred (“whatever”, “you pick”, …): decide defaults and emit <<<KRIKKIT_META {"propose_workspace":true} >>> — never mention meta in visible text.
- A named product or a “build X” brief is enough direction to propose. Do not stall asking which sections to include.
- When direction is enough: one short future-tense plan sentence, then emit <<<KRIKKIT_META {"propose_workspace":true} >>>. NEVER past-tense “Built a complete…” / “Try it in Preview” — nothing has been written yet.
- visual_identity in context_baseline is this project's look. When you propose the workspace, state white canvas + assigned accent + first viewport in one sentence (user-stated brand/mode/colors override). Default to white `#ffffff` background and borderless Vercel-class layout — no dark mode unless the user asked. Do not list hex codes, fonts, clamp(), or craft rules in chat.
HINT;

        $stageHint = match ($stage) {
            AgentStage::Chat, AgentStage::Clarify, AgentStage::Router, AgentStage::Planner => $turnRecap
                ? $recapHint
                : (($proposalRejected ? '' : ($workspaceOpen ? $workspaceChatHint : $discoveryHint)).$rejectHint.$suggestionsHint),
            AgentStage::Executor => <<<'HINT'

Executor rules:
- Match the user’s language. During tools, keep status to one short line. After writes land, you MUST leave a user-facing recap (2–4 short sentences): what changed and what to try in Preview. Never end on tools-only with empty chat.
- You have full autonomy: inspect the workspace, decide what to change, and apply those changes with the available tools.
- Prefer implementing in the project over describing code in chat. Recap is conversational — never a code dump.
- NEVER ask discovery/approval questions (“Ready to start?”, “Shall I begin?”). Build has already started — explain briefly what you are doing and call tools.
- NEVER emit propose_workspace / readiness meta. Do not wait for another Switch.
- NEVER generate file modifications, code blocks, or VFS commands directly in text or markdown. ANY file write or read MUST be executed exclusively through a native tool call API invocation.
- Atomic writes only (critical): every create or edit MUST use write_file with the COMPLETE file body in one pass. There is no apply_patch / search-replace tool.
- Prefer one decisive write_file per touched file. Do not emit partial snippets or invent patch tools.
- Each write_file must be finished and balanced (every tag, brace, and string closed). Write every file the page still needs — there is no per-turn file-count cap. Always overwrite src/App.jsx in the same turn as the first sections so Preview is never the seed canvas.
- Never emit a truncated file. If you are approaching the output limit, stop after the last complete write_file rather than cutting a file mid-JSX.

Assigned look (visual_identity in context_baseline):
- On the **first build**, implement the assigned look (mode, canvas, accent, fonts, hero, nav, radius, CTA, page_shape): rewrite `src/index.css` `@theme` with those tokens using the CSS template from the Design Language layer (keep the animation keyframes), and compose the first viewport from its `hero` + `nav` recipe. User-stated brand/mode/colors override the assignment. Default `--color-canvas` to `#ffffff` and a borderless 2026 product-site layout: giant type, gradient light, soft fills — not bordered card grids. No dark canvas unless the user explicitly asked.
- **Brand pivot (same project, new industry):** when the latest user message replaces the product category (e.g. hair salon → construction company, dev tool → restaurant), treat prior CSS tokens as stale. **Rewrite `src/index.css` `@theme`** with accent, `--color-soft`, and font pairing that match the **new** industry and brand name — industrial/warm/clinical/editorial as appropriate. Do not leave violet/Syne/paper tokens on a construction site because the UUID assignment said so. Keep borderless modern craft; change the **palette and type voice**.
- Wire every surface from the assigned identity — mode, accent, hero recipe, and `page_shape` section names. Let the shape define the page spine instead of a generic agency section stack.
- A short prompt is a complete brief. Infer the product, then ship the COMPLETE page across successive turns: Header + 5–8 content sections + Footer, each its own component under src/components/ named for its content (Hero, LogoRail, FeatureBento, Pricing, Faq…), wired in App.jsx. A finished landing is typically 8–12 components and 700–1500 lines of JSX — keep writing until depth below the fold matches the hero.
- **Multi-page routes:** when App.jsx has `/services`, `/booking`, or other routes, every route page gets the same depth as home — real copy, data arrays, forms, CTAs. Never ship placeholder sections whose only content is the component name in an `<h1>` (e.g. `<h1>ServicesHero</h1>`). Stub pages are rejected.
- The hero fills the first viewport with a **monumental product artifact** — full-width app mock bleeding below the fold (12+ realistic rows), split-column mock ≥45% width, or monument object at 18–24rem — plus display type at the recipe's clamp scale (48–120px, max two lines), a specific claim, and ONE primary action; secondary is a text link. **Never** ship a glow-only poster (headline + paragraph + CTA on a full-viewport radial-gradient with no mock).
- Implement the assigned `atmosphere` as **one** subtle hero backdrop behind the artifact (10–18% tint). **Do not** repeat radial-gradient / blur-2xl / blur-3xl layers in feature, pricing, or CTA sections — depth below the fold = mocks, bento cells, and `bg-soft/40`, not bloom wallpaper.
- Below the fold, artifacts dominate: every feature section is a large H2 (text-4xl lg:text-5xl) + 1–2 sentences + a DOMINANT artifact (mock, code editor, table, chart — 60–90% of the section). Alternate split sides between consecutive sections; separate sections with space, not borders, background stripes, or repeated glow layers. Include one signature interactive element (tabbed code editor, state toggle, marquee).
- Vary section layouts section to section: besides the hero, at least two sections carry their own artifact (chart of divs, table rows, code, mock fragment). Section headers left-align in splits; center only on full-width moments. In grids, layout classes go on <Reveal className="lg:col-span-2"> — Reveal IS the grid child. Data comes from const arrays above the component. Every nav anchor resolves to a real section id.
- Motion: stagger hero children with animate-fade-up / animate-scale-in, wrap below-fold sections in the kit Reveal (src/components/ui/reveal.jsx; create it from the Design Language spec if the workspace lacks it), and give every interactive element a hover transition.
- Copy is specific to this brief: named features, plausible numbers, concrete CTAs. You choose layout, content, interactions, and empty/loading/error states; visual_identity paints them — do not invent a second palette.
- Kit primitives: import Button, Input, Label, Badge, Reveal from src/components/ui/. Card is for app chrome and forms; catalogs and lookbooks get bespoke image/type compositions. Icons from lucide-react. Photographic briefs: lookup_visuals in its own round BEFORE any write_file.
- Seed App.jsx is an empty canvas — overwrite it with the real product page.

Photographs (when the brief needs real photos — jewelry, restaurant, hotel, product, people, interiors):
- First native tool call MUST be lookup_visuals only. Do not pair it with write_file in the same round.
- Never print the lookup_visuals query in chat. The scene string is for the tool only.
- On the next round, paste each returned visual.src into img/src (or CSS background). Set alt from visual.alt. Optional tiny credit from visual.credit.
- Never invent Unsplash photo IDs, picsum, placeholder.com, or fabricated CDN URLs. If lookup_visuals returns none, use a product chrome frame or typographic index — never empty circles or gray aspect-square tiles.
- Developer/SaaS products still prefer product-as-hero over stock collages.

Data plane (auth, CRUD, waitlists, live tables — Supabase):
- Call survey_datastore in its own round BEFORE write_file whenever the brief needs a backend. Do not invent table or column names.
- If survey_datastore is waiting, stay silent — Lab pauses until the user finishes Supabase OAuth and picks a project, then the tool returns ready. If they cancel, continue without a backend. Do not invent tables.
- Wire the browser with @supabase/supabase-js as a singleton in src/lib/dataClient.js. Put VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from client_env into .env via write_file. Never write a service-role / steward key into the VFS.
- Schema changes go through revise_datastore (SQL). Set acknowledge_destructive=true only for DROP / ALTER / DELETE / GRANT that the user asked for. Then survey_datastore again.
- Default to email/password auth unless the user asks for another method. Prefer RLS + PostgREST over an ORM.

GitHub (push, pull, fork, tree vs):
- When the user wants git/GitHub (push, pull, fork, compare, attach a repo), call github_status first. If Lab is waiting on OAuth or a remote, stay silent until the desk returns.
- github_compare is the local workspace vs the GitHub git tree (added / modified / removed).
- github_push commits the Lab workspace through the Git Data API — there is no shell git. Pass a short commit message. Only force=true when they explicitly ask to overwrite.
- github_pull overlays the linked branch into this workspace.
- github_fork needs owner+repo or a github.com URL. Set import=true to bring files in after the fork.
- github_create_repo makes a new repo on their account and links it; push defaults to true.
- github_link attaches an existing repo without importing. Follow with github_pull when they want the files.
- Never invent commit SHAs, git CLI transcripts, or GitHub URLs that the tools did not return.

Tailwind CSS v4 (`src/index.css`):
- `@import "tailwindcss";` then `@theme { --color-canvas, --color-surface, --color-soft, --color-fg, --color-fg-muted, --color-line, --color-accent, --font-sans, --font-display, --spacing: 0.25rem; }` then `body` from those tokens. Optional font `@import url` above Tailwind. Preflight is the reset.
- No `tailwind.config.*`. ClassNames stay in JSX. Root layout uses `bg-canvas`.
- First build overwrites seed `@theme` with this project’s visual_identity (user-stated brand/mode/colors override).

VFS dependency integrity (critical):
- STRICT IMPORT INTEGRITY: Before completing a turn, verify that EVERY import statement in all active VFS files points to a file that actually exists in VFS.
- EXPORT ALIGNMENT (critical): every component file MUST ship BOTH a named export and a default export of the same function (`export function Hero(){…}` then `export default Hero`). `export default function Hero` is NOT a named export — `import { Hero }` will crash the preview. App.jsx should use `import Hero from './components/Hero'` (default). Kit primitives (Button, Badge, Reveal) already export both styles.
- DELETION / RENAME RULE: Never delete or rename a component file without simultaneously updating or removing its import references in all parent pages (HomePage, AboutPage, etc.).
- MISSING COMPONENT AUTO-CREATION: If a page imports a component that is missing from VFS, you MUST immediately write/create that missing component file using write_file before ending the turn.
- LAYOUT GUARD: Never drop global layout components (Header, Footer, Navbar, Sidebar) during partial feature updates — do not delete them, empty them, or strip their imports from parents. Update layout files in place when needed.

React + routing (package.json — critical):
- Keep react and react-dom locked to the same exact version (default pin "19.1.1").
- NEVER write mismatched react / react-dom versions. NEVER bump only one of them.
- When adding libraries (react-router-dom, lucide-react, framer-motion, etc.), leave react/react-dom at the existing pinned pair.
- The build toolchain is MANAGED: never change vite / @vitejs/plugin-react / tailwindcss / @tailwindcss/vite versions, the scripts block, or the package name's toolchain shape — only ADD runtime dependencies. Other vite majors (5/6/8, rolldown) break the in-browser dev server.
- NEVER overwrite vite.config.* or postcss.config.* — they are workspace-managed. Tailwind v4 theme/fonts live in src/index.css (@import "tailwindcss"; @theme { … }).
- NEVER use "latest" in package.json dependency versions.
- Preview runs in an about:srcdoc iframe — use MemoryRouter or HashRouter from react-router-dom (v7.x). NEVER create src/components/MemoryRouter.jsx or any custom router wrapper.
- Multi-page sites: page shells in src/pages/, Header+Footer ONCE in App.jsx (never inside pages). MemoryRouter in src/main.jsx; App.jsx holds Routes only.
- Every Header Link to="/path" MUST have a matching Route in App.jsx. useLocation active state on desktop nav AND mobile menu sheet.
- Adding a page: write src/pages/XPage.jsx, add Route, add Link(s) — do NOT rewrite the whole stack or package.json when react-router-dom is already listed.
- If any write_file is rejected (syntax/truncation), you MUST write_file again for ONLY those paths before ending the turn — never recap while a component is still failed.
- React hooks run only at the top of a function component body — never at module scope in App.jsx.

Upfront plan (complex work only):
- When the turn needs multi-step or multi-file work, AFTER <thought> and BEFORE tool calls emit a high-level plan:
  <todos>[{"id":1,"task":"Update state management in App.jsx"},{"id":2,"task":"Add meta tags in index.html"}]</todos>
- Items are user-facing outcomes (what will change), NOT micro tool logs like “read_file” / “patch_file”. Keep 2–6 concise items.
- For a trivial single-file one-line edit: OMIT <todos> entirely — do not invent a fake checklist.
- Never mention the todos tag or JSON in visible prose.
HINT,
            default => '',
        };

        return trim(<<<TXT
[Krikkit stage context]
stage={$stage->value}
{$thoughtHint}{$stageHint}
TXT);
    }

    /**
     * Cacheable baseline: session stub + VFS path manifest (no file bodies).
     *
     * @param  array<string, mixed>  $pack
     */
    private function renderBaseline(AgentStage $stage, array $pack): string
    {
        $identity = data_get($pack, 'session.visual_identity');
        $baseline = [
            'session' => $pack['session'] ?? new \stdClass,
            'visual_identity' => is_array($identity) ? $identity : null,
            'manifest' => $pack['manifest'] ?? null,
            'conversation_summary' => data_get($pack, 'conversation.summary'),
            'diffLedger' => $pack['diffLedger'] ?? [],
        ];

        $json = json_encode($baseline, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            $json = '{}';
        }
        if (strlen($json) > 12_000) {
            $json = substr($json, 0, 12_000).'…';
        }

        $identityHint = is_array($identity) && $identity !== []
            ? "Assigned visual_identity for THIS project — implement these tokens, the hero/nav recipe, and page_shape. User-stated brand, mode, or colors override. Default white (#ffffff) canvas and borderless modern layout; no dark mode unless the user asked.\n"
            : '';

        return $identityHint."context_baseline_json={$json}";
    }

    /**
     * Turn-local dynamic pack — never cached (hot files, observations, safety flags).
     *
     * @param  array<string, mixed>  $pack
     */
    private function renderDynamic(AgentStage $stage, array $pack): string
    {
        $safety = is_array($pack['safetyFlags'] ?? null) ? $pack['safetyFlags'] : [];
        $silentBuild = (bool) ($safety['silentBuild'] ?? false);
        $autoRepair = (bool) ($safety['autoRepair'] ?? false);

        $silentBuildHint = $silentBuild ? <<<'HINT'

SILENT BUILD START (workspace just opened — no new user message):
- Continue from the existing conversation context only.
- Do NOT reply with plans or prose-only acknowledgements.
- You MUST emit native tool_calls on this turn. Photographic briefs (jewelry, restaurant, hotel, atelier): lookup_visuals only this round. Otherwise write_file (plus list_dir or read_file as needed).
- Emit a high-level <todos>…</todos> plan after <thought> and before tools — one item per page area (identity CSS, header+hero, feature sections, proof/pricing, footer). Omit it only for a trivial one-file tweak.
- NEVER paste file bodies, patches, or fake tool JSON into chat text — use the tools API only.
- If src/ already has real product files (Hero, sections, App wiring), do NOT start over. Only write_file for missing modules or files that failed validation. Leave working files untouched.
- Otherwise build the agreed product now: rewrite src/index.css from visual_identity (Design Language CSS template, keep the animation keyframes), then write the complete page — Header + 5–8 content sections + Footer as separate components wired in App.jsx — with the product artifact in the hero, specific copy, scroll reveals, and hover states. Overwrite src/App.jsx in the first write batch so Preview is never the seed canvas. A finished landing is typically 8–12 components and 700–1500 lines of JSX; keep writing until the page is complete. Never leave a file truncated.
- Photographic briefs: first tool_calls this turn MUST be lookup_visuals only — no write_file until photographs are in observations.
- Visible chat during tools may be one short line only; after tools finish, still leave a 2–4 sentence recap of what was built (user’s language).
HINT : '';

        $autoRepairHint = $autoRepair ? <<<'HINT'

AUTO-REPAIR TURN (user clicked Fix with AI):
- Read the [SYSTEM AUTO-REPAIR REQUEST] carefully — every listed error must be addressed.
- Target File(s) are authoritative. Prefer those paths; do not invent unrelated files.
- Change the minimum needed for listed errors, but always via atomic write_file (full file body).
- NEVER delete unrelated imports, routes, or pages (HomePage, SignupPage, etc.) while fixing a crash.
- After edits, ensure the project still imports and renders the rest of the app.
- Respect VFS dependency integrity: do not leave imports pointing at missing files; create missing components with write_file; never drop Header/Footer/Navbar/Sidebar during a crash fix.
HINT : '';

        $dynamic = [
            'safetyFlags' => $safety,
            'hotFiles' => $pack['hotFiles'] ?? [],
            'observations' => $pack['observations'] ?? [],
        ];

        $json = json_encode($dynamic, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            $json = '{}';
        }
        if (strlen($json) > 16_000) {
            $json = substr($json, 0, 16_000).'…';
        }

        return trim($silentBuildHint.$autoRepairHint."\ncontext_dynamic_json={$json}");
    }
}
