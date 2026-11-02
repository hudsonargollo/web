/**
 * Format tool observations for the next model round (explore → write chaining).
 * Providers only accept user|assistant text here — not native tool-result roles yet.
 */

const WRITE_TOOLS = new Set(['write_file'])

const EXPLORE_TOOLS = new Set([
    'list_dir',
    'file_search',
    'grep',
    'read_file',
    'scan_dir',
])

/** Legacy hints (apply_patch retired) — kept so old observations still classify. */
const PATCH_MISS_HINTS = new Set([
    'patch_miss_use_write_file',
    'patch_miss_noop',
    'noop_patch',
    'patch_invalidated_force_write',
    'patch_miss_blind_retry',
    'diff_loop_breaker',
    'prewrite_reject',
    'write_file_only',
])

/** Strict re-prompt when a Workspace follow-up returns an empty tool batch. */
export const EMPTY_WRITE_SYSTEM_ERROR =
    'SYSTEM ERROR: You did not invoke a native write_file tool call. Execute write_file immediately for the requested file changes.'

/**
 * Strict re-prompt when the model only explored (read/list/scan) and wrote 0 files.
 * Exact policy string — do not paraphrase at call sites.
 */
export const EXPLORE_ONLY_SYSTEM_ERROR =
    'SYSTEM ERROR: You executed read/explore tools but wrote 0 files to the VFS. You MUST execute a native write_file tool call to apply the requested changes now.'

/** Mandate write_file with complete file body (sole mutation tool). */
export const FORCE_WRITE_FILE_SYSTEM_ERROR =
    'SYSTEM ERROR: You MUST call write_file now with the COMPLETE file contents for each path that still needs changes.'

/** After lookup_visuals succeeded — write using visual.src, do not explore again. */
export const LOOKUP_THEN_WRITE_SYSTEM_ERROR =
    'SYSTEM ERROR: Photographs are in the tool results. You MUST call write_file now. Paste visual.src into a full-bleed <img> in the first viewport with a gradient scrim under the type, then continue writing the complete page (header, sections, footer) per the design language.'

/**
 * Partial-batch write rejects — some write_file calls failed while others landed.
 * Exact policy string — do not paraphrase at call sites.
 */
export const WRITE_REJECT_SYSTEM_ERROR =
    'SYSTEM ERROR: One or more write_file calls were rejected (syntax / empty / truncated body). You MUST call write_file again with COMPLETE valid file contents for ONLY the rejected paths. Do not stub, skip, or rewrite already-successful files.'

/** Pre-dry-probe topology drain — missing relative modules discovered by the DAG. */
export const TOPOLOGY_MISSING_SYSTEM_ERROR =
    'SYSTEM ERROR: Topology DAG found unresolved internal imports. You MUST call write_file now for every missing module before compilation.'

/**
 * Unattended resume after max_tokens / truncated tool output.
 * Exact policy string — do not paraphrase at call sites.
 */
export const AUTO_CONTINUE_SYSTEM_ERROR =
    '[SYSTEM AUTO-CONTINUE]: Your previous output hit the model output token limit. Resume generating the remaining files or complete the unfinished file right from where you stopped. Do not re-write fully completed files.'

/** Silent build left the seed App.jsx up — sections exist but nothing is mounted. */
export const PAGE_INCOMPLETE_SYSTEM_ERROR =
    'SYSTEM ERROR: src/App.jsx is still the seed canvas ("Lab workspace"). Sections were written but never mounted, so Preview is only a blank background. You MUST write_file src/App.jsx NOW importing and rendering every file already in src/components/ (except ui/). Then keep writing remaining sections and Footer. Never leave the seed App.jsx.'

/** Header links without matching routes, or a failed write in a multi-page build. */
export const MULTI_PAGE_INCOMPLETE_SYSTEM_ERROR =
    'SYSTEM ERROR: Multi-page routing is incomplete. Every Header <Link to="/path"> MUST have a matching <Route path="/path"> in App.jsx. Page shells live in src/pages/ — Header and Footer mount ONCE in App.jsx, never inside page files. If a write_file was rejected, rewrite ONLY that path with complete valid JSX before ending the turn.'

/** Provider tool_choice that forces the write_file function. */
export const WRITE_FILE_TOOL_CHOICE = Object.freeze({
    type: 'function',
    function: { name: 'write_file' },
})

export function isWriteToolName(name = '') {
    return WRITE_TOOLS.has(String(name || ''))
}

export function isExploreToolName(name = '') {
    return EXPLORE_TOOLS.has(String(name || ''))
}

export function toolBatchHasWrite(toolCalls = []) {
    return (toolCalls || []).some((call) => isWriteToolName(call?.name))
}

export function toolBatchHasWriteFile(toolCalls = []) {
    return (toolCalls || []).some((call) => String(call?.name || '') === 'write_file')
}

export function toolBatchHasExplore(toolCalls = []) {
    return (toolCalls || []).some((call) => isExploreToolName(call?.name))
}

export function toolBatchHasLookupVisuals(toolCalls = []) {
    return (toolCalls || []).some((call) => String(call?.name || '') === 'lookup_visuals')
}

export function countExploreTools(toolCalls = []) {
    return (toolCalls || []).filter((call) => isExploreToolName(call?.name)).length
}

/**
 * Keep write tools; allow only `remaining` explore tools (drop the rest).
 * Used to enforce MAX_EXPLORE_TOOLS_PER_TURN before executing a batch.
 */
export function truncateExploreToolBatch(toolCalls = [], alreadyUsed = 0, maxExplore = 2) {
    const remaining = Math.max(0, maxExplore - Math.max(0, alreadyUsed))
    let exploreSeen = 0
    const out = []
    for (const call of toolCalls || []) {
        if (isExploreToolName(call?.name)) {
            if (exploreSeen >= remaining) continue
            exploreSeen += 1
            out.push(call)
            continue
        }
        out.push(call)
    }
    return out
}

/** True when an observation indicates a failed apply_patch that must escalate to write_file. */
export function isPatchMissObservation(observation = {}) {
    if (! observation || typeof observation !== 'object') return false
    // Successful full_content / silent threshold bypass already wrote — do not re-prompt.
    if (observation.status === 'fallback_applied' || observation.status === 'ok') {
        return false
    }
    if (observation.artifacts?.silentUpgrade || observation.artifacts?.thresholdBypass) {
        return false
    }
    const hint = String(observation.hint || '')
    if (PATCH_MISS_HINTS.has(hint)) return true
    if (observation.errorClass === 'PatchMiss' && observation.status === 'error') return true
    const summary = String(observation.summary || '').toLowerCase()
    return observation.status === 'error'
        && (summary.includes('patch miss') || summary.includes('apply_patch invalidated'))
}

export function observationsHavePatchMiss(observations = []) {
    return (observations || []).some((obs) => isPatchMissObservation(obs))
}

/** True when a write_file observation is a hard reject the model can fix with a full rewrite. */
export function isWriteRejectObservation(observation = {}) {
    if (! observation || typeof observation !== 'object') return false
    if (observation.status !== 'error') return false
    if (String(observation.toolKind || '') !== 'write') return false
    const hint = String(observation.hint || '')
    // Policy noops / sandbox denies are not "try again with a full body" cases.
    if (hint === 'noop_write' || hint === 'not_writable' || hint === 'file_missing') {
        return false
    }
    return Boolean(observation.artifacts?.path) || hint === 'prewrite_reject' || hint === 'write_file_only'
}

/**
 * Paths from rejected write_file observations (deduped, order preserved).
 * @returns {string[]}
 */
export function failedWritePathsFromObservations(observations = []) {
    const out = []
    const seen = new Set()
    for (const obs of observations || []) {
        if (! isWriteRejectObservation(obs)) continue
        const path = String(obs?.artifacts?.path || '').trim()
        if (! path || seen.has(path)) continue
        seen.add(path)
        out.push(path)
    }
    return out
}

/** Normalize provider finish/stop reasons to a short lowercase token. */
export function normalizeFinishReason(value = null) {
    if (value && typeof value === 'object') {
        return normalizeFinishReason(
            value.finish_reason ?? value.stop_reason ?? value.finishReason ?? null,
        )
    }
    return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

/** True when the model hit its output token ceiling mid-response. */
export function isMaxTokensFinishReason(reason = null) {
    const r = normalizeFinishReason(reason)
    return r === 'max_tokens'
        || r === 'length'
        || r === 'max_output_tokens'
        || r === 'maxoutputtokens'
}

/**
 * write_file tool calls that arrived with empty / missing content (typical max_tokens cut).
 * @returns {string[]}
 */
export function emptyWritePathsFromToolCalls(toolCalls = []) {
    const out = []
    const seen = new Set()
    for (const call of toolCalls || []) {
        if (String(call?.name || '') !== 'write_file') continue
        const args = call?.arguments && typeof call.arguments === 'object'
            ? call.arguments
            : (call?.input && typeof call.input === 'object' ? call.input : {})
        const path = String(args?.path || '').trim()
        if (! path || seen.has(path)) continue
        const content = args?.content
        if (content == null || String(content) === '') {
            seen.add(path)
            out.push(path)
        }
    }
    return out
}

/**
 * Seed kit App.jsx — a blank canvas. Preview is only bg-canvas until overwritten.
 */
export function isSeedLabApp(body = '') {
    const text = String(body ?? '')
    return text.includes('Lab workspace')
        && /min-h-dvh bg-canvas/.test(text)
        && ! /from\s+['"]\.\/components\//.test(text)
}

export function productSectionPaths(snapshot = {}) {
    return Object.keys(snapshot || {}).filter((path) => (
        /^src\/components\/(?!ui\/)[^/]+\.(jsx|tsx)$/i.test(String(path || ''))
    ))
}

/**
 * True when product files landed but App.jsx still shows the seed canvas.
 */
export function isPageAssemblyIncomplete(workingVfs) {
    if (! workingVfs?.has || ! workingVfs.read) return false
    const app = workingVfs.has('src/App.jsx') ? String(workingVfs.read('src/App.jsx') || '') : ''
    if (! isSeedLabApp(app)) return false
    const snap = typeof workingVfs.snapshot === 'function' ? workingVfs.snapshot() : {}
    if (productSectionPaths(snap).length > 0) return true
    const css = workingVfs.has('src/index.css') ? String(workingVfs.read('src/index.css') || '') : ''
    return /--color-canvas\s*:/.test(css) && /@theme/.test(css)
}

/** Header nav links that lack a matching <Route path> in App.jsx. */
export function extractRoutePaths(appSource = '') {
    const paths = []
    const re = /<Route\b[^>]*\bpath=["']([^"']+)["']/gi
    let match = re.exec(String(appSource || ''))
    while (match) {
        paths.push(match[1])
        match = re.exec(String(appSource || ''))
    }
    return paths
}

export function extractNavLinkPaths(headerSource = '') {
    const paths = []
    const re = /\bto=["']([^"'#]+)["']/gi
    let match = re.exec(String(headerSource || ''))
    while (match) {
        const path = match[1]
        if (path.startsWith('/')) paths.push(path)
        match = re.exec(String(headerSource || ''))
    }
    return paths
}

export function isMultiPageRoutingIncomplete(workingVfs) {
    if (! workingVfs?.has || ! workingVfs.read) return false
    const app = workingVfs.has('src/App.jsx') ? String(workingVfs.read('src/App.jsx') || '') : ''
    const header = workingVfs.has('src/components/Header.jsx')
        ? String(workingVfs.read('src/components/Header.jsx') || '')
        : ''
    if (! app.includes('Routes') || ! header.includes('Link')) return false
    const routes = new Set(extractRoutePaths(app))
    const links = extractNavLinkPaths(header)
    if (! links.length || ! routes.size) return false
    return links.some((link) => ! routes.has(link))
}

/**
 * Whether the orchestrator should silently chain another LLM write turn.
 */
export function needsAutonomousContinue({
    finishReason = null,
    toolCalls = [],
    observations = [],
    workingVfs = null,
} = {}) {
    if (isMaxTokensFinishReason(finishReason)) return true
    if (emptyWritePathsFromToolCalls(toolCalls).length) return true
    if (failedWritePathsFromObservations(observations).length) return true
    if (isPageAssemblyIncomplete(workingVfs)) return true
    if (isMultiPageRoutingIncomplete(workingVfs)) return true
    return false
}

/** Stable key for rejected write paths (identical-reject circuit breaker). */
export function rejectPathKey(paths = []) {
    return [...new Set((paths || []).map((path) => String(path || '').trim()).filter(Boolean))]
        .sort()
        .join('|')
}

/**
 * User-facing label while the agent silently continues an incomplete
 * generation. Pass counting stays internal (meta.autonomousPass) — surfacing
 * "auto-continuing (pass 3/4)" reads like an error, so the UI shows the
 * normal wait state instead.
 */
export function autonomousContinueLabel() {
    return 'Writing files…'
}

export function formatObservationForAgent(observation = {}, { keepContentPreview = false } = {}) {
    const artifacts = observation.artifacts && typeof observation.artifacts === 'object'
        ? { ...observation.artifacts }
        : {}
    // Keep content preview for the model; trim other bulky fields.
    if (Array.isArray(artifacts.hits) && artifacts.hits.length > 12) {
        artifacts.hits = artifacts.hits.slice(0, 12)
    }
    if (Array.isArray(artifacts.items) && artifacts.items.length > 40) {
        artifacts.items = artifacts.items.slice(0, 40)
    }
    if (Array.isArray(artifacts.errors) && artifacts.errors.length > 6) {
        artifacts.errors = artifacts.errors.slice(0, 6)
    }
    // Preserve exact VFS reject-feedback snippet (trim only if enormous).
    if (typeof artifacts.exactSnippet === 'string' && artifacts.exactSnippet.length > 3_000) {
        artifacts.exactSnippet = artifacts.exactSnippet.slice(0, 3_000)
    }

    // Drop heavy read_file bodies unless this is the live round that still needs them.
    if (typeof artifacts.contentPreview === 'string') {
        if (! keepContentPreview) {
            const len = artifacts.contentPreview.length
            delete artifacts.contentPreview
            artifacts.contentPreviewChars = len
            artifacts.contentPreviewDropped = true
        } else if (artifacts.contentPreview.length > 2_000) {
            artifacts.contentPreview = `${artifacts.contentPreview.slice(0, 2_000)}…`
        }
    }
    if (typeof artifacts.fullContent === 'string') {
        delete artifacts.fullContent
    }
    if (Array.isArray(artifacts.visuals) && artifacts.visuals.length > 8) {
        artifacts.visuals = artifacts.visuals.slice(0, 8)
    }

    return {
        status: observation.status || 'ok',
        tool: observation.toolKind || 'unknown',
        summary: observation.summary || '',
        hint: observation.hint || null,
        errorClass: observation.errorClass || null,
        artifacts,
    }
}

/**
 * Build the continuation user message after a tool batch with no VFS writes yet.
 * When forceTools is set (prose-only / empty tool_calls), demand native writes immediately.
 * When exploreOnly is set, use the explore-only SYSTEM ERROR (and caller must force write_file).
 * When mandateWriteFile is set, demand write_file with complete bodies.
 */
export function buildAgentContinuationPrompt({
    observations = [],
    toolCalls = [],
    round = 1,
    forceTools = false,
    mandateWriteFile = false,
    exploreOnly = false,
    autoContinue = false,
    finishReason = null,
    incompletePaths = [],
    pageIncomplete = false,
} = {}) {
    const names = (toolCalls || []).map((c) => c?.name).filter(Boolean)
    const tools = names.join(', ') || 'none'
    const hadWrite = toolBatchHasWrite(toolCalls)
    const needWrite = ! exploreOnly && Boolean(mandateWriteFile)
    const exploreBatch = exploreOnly
        || (! hadWrite && names.length > 0 && toolBatchHasExplore(toolCalls))
    const emptyPaths = emptyWritePathsFromToolCalls(toolCalls)
    const incomplete = [...new Set([
        ...(Array.isArray(incompletePaths) ? incompletePaths : []),
        ...emptyPaths,
        ...failedWritePathsFromObservations(observations),
    ].filter(Boolean))]
    const blocks = (observations || []).map((obs, index) => {
        // Only the freshest observations may keep a short content preview; older ok reads are stubs.
        const isFresh = index >= Math.max(0, (observations || []).length - 2)
        const needsPreview = isFresh && (
            obs?.status === 'error'
            || obs?.status === 'fallback_applied'
            || obs?.toolKind === 'read_file'
        )
        const packed = formatObservationForAgent(obs, { keepContentPreview: needsPreview })
        return JSON.stringify(packed)
    }).join('\n')

    const lines = [
        `[TOOL_RESULTS — round ${round}]`,
        `Previous tools: ${tools}`,
        blocks || '(no observations)',
        '',
    ]

    const visualHits = (observations || []).filter((obs) => obs?.toolKind === 'lookup_visuals')
    if (visualHits.length) {
        lines.push(
            'PHOTOGRAPHS: Use visual.src from lookup_visuals artifacts as img src (or CSS background). Set alt from visual.alt. Never invent Unsplash/Pixabay/placeholder URLs.',
            '',
        )
    }

    const datastoreHits = (observations || []).filter((obs) => (
        obs?.toolKind === 'survey_datastore' || obs?.toolKind === 'revise_datastore'
    ))
    if (datastoreHits.length) {
        const skipped = datastoreHits.some((obs) => (
            obs?.hint === 'datastore_cancelled' || Boolean(obs?.artifacts?.skipped)
        ))
        lines.push(
            skipped
                ? 'DATASTORE: The user declined or skipped Supabase. Continue WITHOUT a backend. Do not invent tables, do not write .env / dataClient.js, and do not retry survey_datastore or revise_datastore this turn.'
                : 'DATASTORE: Use client_env from survey_datastore for .env (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY only). Write src/lib/dataClient.js as an @supabase/supabase-js singleton. Never invent tables — use the returned map. Never write a service-role key. If needs_ack, recall revise_datastore with acknowledge_destructive=true only when the user asked for that SQL.',
            '',
        )
    }

    const githubHits = (observations || []).filter((obs) => String(obs?.toolKind || '').startsWith('github_'))
    if (githubHits.length) {
        const skippedGithub = githubHits.some((obs) => (
            obs?.hint === 'github_cancelled' || Boolean(obs?.artifacts?.skipped)
        ))
        lines.push(
            skippedGithub
                ? 'GITHUB: The user declined or skipped GitHub. Continue without git. Do not retry github_* tools this turn.'
                : 'GITHUB: Use html_url / sha / compare from the tool result. github_compare is local vs the GitHub git tree. Push goes through github_push — never invent git CLI output.',
            '',
        )
    }

    const notWritable = (observations || []).find((obs) => obs?.hint === 'not_writable')
    if (notWritable) {
        lines.push(
            'SYSTEM ERROR: Path is not writable — do NOT retry the rejected path.',
            String(notWritable.summary || '').slice(0, 400),
            'Shift strategy: write under src/ or public/ (or package.json / vite.config.*).',
            'Tailwind v4: src/index.css is @import "tailwindcss" + @theme + body from those tokens.',
            '',
        )
    }

    const visualThenWrite = visualHits.length > 0
        && ! hadWrite
        && ! autoContinue
        && ! isMaxTokensFinishReason(finishReason)
        && emptyPaths.length === 0

    if (pageIncomplete) {
        lines.push(
            PAGE_INCOMPLETE_SYSTEM_ERROR,
            'First write_file MUST be src/App.jsx mounting the sections that already exist.',
            'NEVER paste file bodies into chat text — use the write_file tool only.',
            '',
        )
    } else if (autoContinue || isMaxTokensFinishReason(finishReason) || emptyPaths.length) {
        lines.push(
            AUTO_CONTINUE_SYSTEM_ERROR,
            'Keep writing remaining files. Each write_file must be a complete balanced file.',
            'NEVER paste file bodies into chat text — use the write_file tool only.',
            '',
        )
    } else if (visualThenWrite) {
        lines.push(
            LOOKUP_THEN_WRITE_SYSTEM_ERROR,
            'Do not call lookup_visuals, list_dir, or read_file again this turn.',
            'NEVER paste file bodies into chat text — use the write_file tool only.',
            '',
        )
    } else if (incomplete.length && needWrite) {
        lines.push(
            WRITE_REJECT_SYSTEM_ERROR,
            `Rejected paths: ${incomplete.join(', ')}`,
            'Each write_file must include the full file body (not a patch). Fix syntax / truncation before calling.',
            'NEVER paste file bodies into chat text — use the write_file tool only.',
            '',
        )
    } else if (needWrite) {
        lines.push(
            FORCE_WRITE_FILE_SYSTEM_ERROR,
            'Call write_file with the COMPLETE updated file body for each path.',
            'NEVER paste file bodies into chat text — use the write_file tool only.',
        )
        const loopHit = (observations || []).find((obs) => (
            obs?.hint === 'diff_loop_breaker' || obs?.errorClass === 'DiffLoop'
        ))
        if (loopHit) {
            lines.push(
                'DIFF-LOOP CIRCUIT BREAKER tripped — that file is locked to its last valid state.',
                'Only a substantially different write_file may proceed.',
            )
        }
    } else if (exploreBatch) {
        lines.push(
            EXPLORE_ONLY_SYSTEM_ERROR,
            'CRITICAL: Explore-only batch detected (list/read/search) — zero files written.',
            'You MUST call write_file NOW via the tools API with concrete full-file content.',
            'Do NOT call list_dir, read_file, grep, or file_search again — implement immediately.',
            'NEVER paste file bodies or fake tool JSON into chat text.',
            'Canonical VFS stays unchanged until you write.',
        )
    } else if (forceTools || ! names.length) {
        lines.push(
            EMPTY_WRITE_SYSTEM_ERROR,
            'CRITICAL: Your previous reply had no native tool_calls (or only explore tools).',
            'You MUST invoke write_file via the tools API NOW with full file contents.',
            'NEVER paste file bodies or fake tool JSON into chat text.',
            'Do not reply with plans or prose only — mutate the workspace VFS.',
            'Do not stop after list_dir / read_file — write the implementation in this round.',
        )
    } else {
        lines.push(
            'Continue implementing the agreed product direction in the workspace.',
            'Use the tool results above. Create or update files with write_file (complete body every time).',
            'Do not stop after reading — apply concrete file changes before finishing.',
        )
    }

    return lines.join('\n')
}
