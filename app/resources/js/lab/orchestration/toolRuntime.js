import { ERROR_CLASSES, WRITE_MODES } from './constants.js'
import { applyWriteToWorking, syncPatchEngineBuffers } from './patchApply.js'
import { buildModuleStubSource, VFS_STUB_MARKER } from './vfsHeal.js'
import { observationError, observationOk } from './observations.js'
import { compositionHint, writeReject } from './compositionGate.js'
import {
    grepWorkspaceFiles,
    listWorkspaceDir,
    searchWorkspaceFiles,
} from '../lib/chatTools.js'
import { lookupLabVisuals } from '../lib/visuals.js'
import {
    awaitLabDatastoreReady,
    reviseLabDatastore,
    surveyLabDatastore,
} from '../lib/datastore.js'
import {
    awaitLabGithubReady,
    compareLabGithub,
    createLabGithubRepo,
    forkLabGithub,
    githubNeedsConnect,
    githubNeedsRemote,
    linkLabGithub,
    pullLabGithub,
    pushLabGithub,
    readLabGithubStatus,
} from '../lib/githubRemote.js'
import { normalizeVfsPath } from '../lib/vfs.js'

/** Wall-clock dwell so React can paint "Writing…" before the card flips to "Wrote". */
function yieldForPaint(signal = null, dwellMs = 0) {
    if (signal?.aborted) return Promise.resolve()
    const ms = Math.max(0, Number(dwellMs) || 0)
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms)
        if (! signal || typeof signal.addEventListener !== 'function') return
        signal.addEventListener('abort', () => {
            clearTimeout(timer)
            resolve()
        }, { once: true })
    })
}

function abortedError() {
    const error = new Error('Stopped.')
    error.name = 'AbortError'
    error.code = 'ABORTED'
    return error
}

async function ensureDatastoreLinked(abortSignal) {
    if (abortSignal?.aborted) throw abortedError()
    try {
        return await awaitLabDatastoreReady({ signal: abortSignal })
    } catch (error) {
        if (error?.code === 'aborted' || abortSignal?.aborted) throw abortedError()
        throw error
    }
}

function isDatastoreSkip(error) {
    return error?.code === 'cancelled' || error?.code === 'oauth_unconfigured'
}

function skippedDatastoreSurvey(error) {
    const cancelled = error?.code === 'cancelled'
    return observationOk(
        'survey_datastore',
        cancelled
            ? 'User declined the data plane. Continue without a backend. Do not invent tables, do not retry survey_datastore this turn, and do not write Supabase client files unless they ask to connect later.'
            : 'Supabase OAuth is not configured. Continue without a backend. Do not invent tables or retry survey_datastore this turn.',
        {
            ready: false,
            skipped: true,
            reason: cancelled ? 'cancelled' : 'oauth_unconfigured',
        },
        'datastore_cancelled',
    )
}

function skippedDatastoreRevision(error) {
    const cancelled = error?.code === 'cancelled'
    return observationOk(
        'revise_datastore',
        cancelled
            ? 'User declined the data plane. Do not retry revise_datastore this turn. Continue without applying SQL.'
            : 'Supabase OAuth is not configured. Do not retry revise_datastore this turn.',
        {
            skipped: true,
            reason: cancelled ? 'cancelled' : 'oauth_unconfigured',
        },
        'datastore_cancelled',
    )
}

function skippedGithub(tool, error) {
    const cancelled = error?.code === 'cancelled'
    return observationOk(
        tool,
        cancelled
            ? 'User declined GitHub. Continue without git. Do not retry GitHub tools this turn.'
            : 'GitHub is not connected. Continue without git. Do not retry GitHub tools this turn.',
        {
            skipped: true,
            reason: cancelled ? 'cancelled' : (error?.code || 'unconfigured'),
        },
        'github_cancelled',
    )
}

function summarizeCompare(compare) {
    if (! compare || typeof compare !== 'object') return 'No GitHub tree comparison.'
    if (compare.clean) return `Local matches ${compare.branch || 'GitHub'}.`
    const bits = []
    if (compare.added?.length) bits.push(`${compare.added.length} added`)
    if (compare.modified?.length) bits.push(`${compare.modified.length} modified`)
    if (compare.removed?.length) bits.push(`${compare.removed.length} only on GitHub`)
    return bits.join(', ') || 'Compared local vs GitHub.'
}

async function ensureGithub(projectUuid, { needRemote = false, abortSignal = null } = {}) {
    if (! projectUuid) {
        const error = new Error('Open a Lab project first.')
        error.code = 'no_project'
        throw error
    }
    if (abortSignal?.aborted) throw abortedError()
    let status = await readLabGithubStatus(projectUuid)
    if (githubNeedsConnect(status) || (needRemote && githubNeedsRemote(status))) {
        await awaitLabGithubReady({ needRemote, signal: abortSignal })
        status = await readLabGithubStatus(projectUuid)
    }
    return status
}

function isGithubSkip(error) {
    return error?.code === 'cancelled' || error?.code === 'oauth_unconfigured' || error?.code === 'no_project'
}

/**
 * Apply native server tool_calls against Working VFS.
 * Mutation path is write_file only (atomic full overwrite).
 * Stale apply_patch calls are rejected with a short observation — no escalate latch.
 *
 * @param {{
 *   toolCalls: Array<{ id?: string, name: string, arguments?: object }>,
 *   workingVfs: object,
 *   tree?: array,
 *   writeMode?: string,
 *   forceFullWrite?: boolean,
 *   patchGate?: object|null,
 *   projectUuid?: string|null,
 *   onEvent?: Function,
 *   abortSignal?: AbortSignal|null,
 * }} args
 */
export async function applyToolCalls(args = {}) {
    const {
        toolCalls = [],
        workingVfs,
        tree = [],
        writeMode = WRITE_MODES.FULL,
        forceFullWrite = false,
        patchGate = null,
        projectUuid = null,
        onEvent = null,
        abortSignal = null,
    } = args

    if (Array.isArray(toolCalls) && toolCalls.length) {
        // Do not pre-paint the whole batch — each file lands on tool_start.
        await yieldForPaint(abortSignal, 16)
    }

    const observations = []
    let diffLoopEscalate = false
    /** @type {string[]} */
    const diffLoopPaths = []
    const effectiveMode = WRITE_MODES.FULL
    void writeMode
    void forceFullWrite

    for (const call of toolCalls) {
        const name = String(call?.name || '')
        const input = call?.arguments && typeof call.arguments === 'object'
            ? call.arguments
            : {}

        const startPath = input.path != null && String(input.path).trim() !== ''
            ? normalizeVfsPath(input.path)
            : null
        onEvent?.({
            type: 'tool_start',
            tool: name,
            id: call?.id,
            path: startPath,
            arguments: input,
        })
        let observation

        switch (name) {
            case 'list_dir': {
                const path = input.path || 'src'
                const listed = listWorkspaceDir({
                    contents: workingVfs.snapshot(),
                    tree,
                    path,
                })
                onEvent?.({
                    type: 'ui',
                    listDir: { path: listed.path, status: 'done', items: listed.items },
                })
                observation = observationOk('list_dir', `Listed ${listed.path}`, {
                    path: listed.path,
                    count: listed.items?.length || 0,
                    items: (listed.items || []).slice(0, 40).map((item) => (
                        typeof item === 'string' ? item : (item?.name || item?.path || item)
                    )),
                })
                break
            }
            case 'file_search': {
                const query = String(input.query || '')
                const result = searchWorkspaceFiles({
                    tree,
                    contents: workingVfs.snapshot(),
                    query,
                })
                onEvent?.({
                    type: 'ui',
                    fileSearch: { query: result.query, status: 'done', hits: result.hits },
                })
                observation = observationOk('file_search', `Search “${result.query}”`, {
                    query: result.query,
                    hits: result.hits,
                })
                break
            }
            case 'grep': {
                const pattern = String(input.pattern || '')
                const grep = grepWorkspaceFiles({
                    contents: workingVfs.snapshot(),
                    pattern,
                    pathPrefix: input.path_prefix || 'src',
                })
                onEvent?.({
                    type: 'ui',
                    grep: { pattern: grep.pattern, status: 'done', hits: grep.hits },
                })
                observation = observationOk('grep', `Grep ${grep.pattern}`, {
                    pattern: grep.pattern,
                    hits: grep.hits,
                })
                break
            }
            case 'read_file': {
                const path = normalizeVfsPath(input.path)
                const body = workingVfs.has(path) ? workingVfs.read(path) : ''
                const lines = body === '' ? [] : body.split('\n')
                const totalLines = lines.length
                const DEFAULT_WINDOW = 40
                const rawStart = input.start_line ?? input.startLine ?? null
                const rawEnd = input.end_line ?? input.endLine ?? null
                const hasWindow = rawStart != null || rawEnd != null
                let startLine = hasWindow
                    ? Math.max(1, Number(rawStart) || 1)
                    : (totalLines ? 1 : null)
                let endLine = hasWindow
                    ? Math.max(startLine, Number(rawEnd) || startLine)
                    : (totalLines ? Math.min(totalLines, DEFAULT_WINDOW) : null)
                if (totalLines > 0 && startLine != null) {
                    startLine = Math.min(startLine, totalLines)
                    endLine = Math.min(Math.max(endLine, startLine), totalLines)
                }
                const slice = totalLines && startLine != null && endLine != null
                    ? lines.slice(startLine - 1, endLine)
                    : []
                const windowed = slice.join('\n')
                const truncated = Boolean(
                    totalLines
                    && startLine != null
                    && endLine != null
                    && (startLine > 1 || endLine < totalLines),
                )
                onEvent?.({
                    type: 'ui',
                    readFile: {
                        path,
                        status: 'done',
                        content: windowed,
                        fullContent: body,
                        lineCount: totalLines,
                        startLine,
                        endLine,
                        truncated,
                    },
                })
                observation = observationOk('read_file', `Read ${path}`, {
                    path,
                    lineCount: totalLines,
                    startLine,
                    endLine,
                    contentPreview: (hasWindow ? windowed : body).slice(0, 2_400),
                }, 'retry_with_read')
                break
            }
            case 'apply_patch': {
                // Stale / hallucinated tool — reject quietly; no escalate latch / UI drama.
                const path = startPath || normalizeVfsPath(input.path)
                observation = observationError(
                    'write',
                    `apply_patch is not available. Call write_file with the complete file contents${path ? ` for ${path}` : ''}.`,
                    {
                        errorClass: ERROR_CLASSES.POLICY,
                        hint: 'write_file_only',
                        artifacts: { path, rejected: 'apply_patch' },
                    },
                )
                if (path) {
                    onEvent?.({
                        type: 'ui',
                        editFile: {
                            path,
                            status: 'error',
                            before: '',
                            after: '',
                        },
                    })
                }
                break
            }
            case 'lookup_visuals': {
                const query = String(input.query || '').trim()
                if (query === '') {
                    observation = observationError('lookup_visuals', 'lookup_visuals needs a scene query.', {
                        errorClass: ERROR_CLASSES.POLICY,
                        artifacts: { query: '' },
                        hint: 'visuals_query_required',
                    })
                    break
                }
                try {
                    const bundle = await lookupLabVisuals({
                        query,
                        count: input.count,
                        orientation: input.orientation,
                    })
                    const visuals = Array.isArray(bundle.visuals) ? bundle.visuals.slice(0, 8) : []
                    onEvent?.({
                        type: 'ui',
                        lookupVisuals: {
                            query: bundle.query || query,
                            status: 'done',
                            count: visuals.length,
                        },
                    })
                    const ready = bundle.catalogs && typeof bundle.catalogs === 'object'
                        ? bundle.catalogs
                        : {}
                    const noneReady = ready.unsplash === false && ready.pixabay === false
                    observation = observationOk(
                        'lookup_visuals',
                        visuals.length
                            ? `Found ${visuals.length} photograph${visuals.length === 1 ? '' : 's'} for “${bundle.query || query}”`
                            : (noneReady
                                ? 'No photograph catalogs configured. Use CSS or illustration — do not invent photo URLs.'
                                : `No photographs for “${bundle.query || query}”. Use CSS or illustration — do not invent photo URLs.`),
                        {
                            query: bundle.query || query,
                            visuals,
                            catalogs: ready,
                        },
                    )
                } catch (error) {
                    observation = observationError(
                        'lookup_visuals',
                        error?.message || 'Photograph lookup failed.',
                        {
                            errorClass: 'Recoverable',
                            artifacts: { query },
                            hint: 'visuals_lookup_failed',
                        },
                    )
                }
                break
            }
            case 'survey_datastore': {
                const surveyKey = `survey-${call?.id || 'active'}`
                try {
                    let bundle = await surveyLabDatastore({ fresh: Boolean(input.fresh) })
                    if (! bundle.ready && bundle.status === 'missing' && bundle.oauth_ready) {
                        onEvent?.({
                            type: 'ui',
                            datastoreSurvey: {
                                matchKey: surveyKey,
                                status: 'waiting',
                                tableCount: 0,
                                tables: [],
                                summary: 'Waiting for Supabase…',
                            },
                        })
                        await ensureDatastoreLinked(abortSignal)
                        bundle = await surveyLabDatastore({ fresh: true })
                    }
                    const tables = Array.isArray(bundle.tables) ? bundle.tables : []
                    onEvent?.({
                        type: 'ui',
                        datastoreSurvey: {
                            matchKey: surveyKey,
                            status: bundle.ready ? 'done' : 'error',
                            tableCount: tables.length,
                            tables,
                            summary: bundle.message || '',
                        },
                    })
                    observation = bundle.ready
                        ? observationOk('survey_datastore', bundle.message || 'Datastore ready.', {
                            ready: true,
                            status: bundle.status,
                            host: bundle.host,
                            can_revise: Boolean(bundle.can_revise),
                            client_env: bundle.client_env && typeof bundle.client_env === 'object'
                                ? bundle.client_env
                                : {},
                            suggested_files: Array.isArray(bundle.suggested_files) ? bundle.suggested_files : [],
                            tables,
                        })
                        : observationError('survey_datastore', bundle.message || 'Datastore is not configured.', {
                            errorClass: ERROR_CLASSES.POLICY,
                            artifacts: {
                                ready: false,
                                status: bundle.status || 'missing',
                                can_revise: Boolean(bundle.can_revise),
                                oauth_ready: Boolean(bundle.oauth_ready),
                            },
                            hint: 'datastore_missing',
                        })
                } catch (error) {
                    if (error?.code === 'ABORTED' || error?.name === 'AbortError') throw error
                    if (isDatastoreSkip(error)) {
                        onEvent?.({
                            type: 'ui',
                            datastoreSurvey: {
                                matchKey: surveyKey,
                                status: 'skipped',
                                tableCount: 0,
                                tables: [],
                                summary: error?.code === 'cancelled'
                                    ? 'Continued without a backend.'
                                    : 'Supabase isn’t set up on this workspace.',
                            },
                        })
                        observation = skippedDatastoreSurvey(error)
                        break
                    }
                    onEvent?.({
                        type: 'ui',
                        datastoreSurvey: {
                            matchKey: surveyKey,
                            status: 'error',
                            tableCount: 0,
                            tables: [],
                            summary: error?.message || 'Datastore survey failed.',
                        },
                    })
                    observation = observationError(
                        'survey_datastore',
                        error?.message || 'Datastore survey failed.',
                        {
                            errorClass: 'Recoverable',
                            artifacts: {},
                            hint: 'datastore_survey_failed',
                        },
                    )
                }
                break
            }
            case 'revise_datastore': {
                const sql = String(input.sql || '').trim()
                const reviseKey = `revise-${call?.id || 'active'}`
                if (sql === '') {
                    observation = observationError('revise_datastore', 'revise_datastore needs SQL.', {
                        errorClass: ERROR_CLASSES.POLICY,
                        artifacts: { sql: '' },
                        hint: 'datastore_sql_required',
                    })
                    break
                }
                try {
                    let survey = await surveyLabDatastore({ fresh: false })
                    if (! survey.ready && survey.status === 'missing' && survey.oauth_ready) {
                        onEvent?.({
                            type: 'ui',
                            datastoreRevision: {
                                matchKey: reviseKey,
                                status: 'waiting',
                                statementCount: 0,
                                destructive: false,
                                summary: 'Waiting for Supabase…',
                            },
                        })
                        await ensureDatastoreLinked(abortSignal)
                    }
                    const bundle = await reviseLabDatastore({
                        sql,
                        acknowledge_destructive: Boolean(input.acknowledge_destructive),
                    })
                    const statements = Array.isArray(bundle.statements) ? bundle.statements : []
                    onEvent?.({
                        type: 'ui',
                        datastoreRevision: {
                            matchKey: reviseKey,
                            status: bundle.ok ? 'done' : 'error',
                            statementCount: statements.length || Number(bundle.applied) || 0,
                            destructive: Boolean(bundle.destructive),
                            summary: bundle.message || '',
                        },
                    })
                    observation = bundle.ok
                        ? observationOk('revise_datastore', bundle.message || 'Revision applied.', {
                            applied: Number(bundle.applied) || 0,
                            destructive: Boolean(bundle.destructive),
                            statements: statements.slice(0, 12),
                        })
                        : observationError('revise_datastore', bundle.message || 'Revision failed.', {
                            errorClass: bundle.needs_ack ? ERROR_CLASSES.POLICY : 'Recoverable',
                            artifacts: {
                                needs_ack: Boolean(bundle.needs_ack),
                                destructive: Boolean(bundle.destructive),
                                statements: statements.slice(0, 12),
                            },
                            hint: bundle.needs_ack ? 'datastore_needs_ack' : 'datastore_revise_failed',
                        })
                } catch (error) {
                    if (error?.code === 'ABORTED' || error?.name === 'AbortError') throw error
                    if (isDatastoreSkip(error)) {
                        onEvent?.({
                            type: 'ui',
                            datastoreRevision: {
                                matchKey: reviseKey,
                                status: 'skipped',
                                statementCount: 0,
                                destructive: false,
                                summary: error?.code === 'cancelled'
                                    ? 'Continued without a backend.'
                                    : 'Supabase isn’t set up on this workspace.',
                            },
                        })
                        observation = skippedDatastoreRevision(error)
                        break
                    }
                    const payload = error?.payload && typeof error.payload === 'object' ? error.payload : {}
                    onEvent?.({
                        type: 'ui',
                        datastoreRevision: {
                            matchKey: reviseKey,
                            status: 'error',
                            statementCount: Array.isArray(payload.statements) ? payload.statements.length : 0,
                            destructive: Boolean(payload.destructive),
                            summary: payload.message || error?.message || 'Revision failed.',
                        },
                    })
                    observation = observationError(
                        'revise_datastore',
                        payload.message || error?.message || 'Datastore revision failed.',
                        {
                            errorClass: payload.needs_ack ? ERROR_CLASSES.POLICY : 'Recoverable',
                            artifacts: {
                                needs_ack: Boolean(payload.needs_ack),
                                destructive: Boolean(payload.destructive),
                                statements: Array.isArray(payload.statements) ? payload.statements.slice(0, 12) : [],
                            },
                            hint: payload.needs_ack ? 'datastore_needs_ack' : 'datastore_revise_failed',
                        },
                    )
                }
                break
            }
            case 'write_file': {
                const path = normalizeVfsPath(input.path)
                const before = workingVfs.has(path) ? workingVfs.read(path) : ''
                const body = String(input.content ?? '')
                const compositionIssue = writeReject(path, body)
                if (compositionIssue) {
                    observation = observationError(
                        'write',
                        [
                            `Rejected ${path}: ${compositionIssue.detail}`,
                            'Do not ship empty rounded-full tiles, a centered gradient poster, twin hero buttons, or Header+Hero+Collection+About+Footer.',
                            'Paste visual.src into a full-bleed <img> (or ship working product chrome). One primary action.',
                        ].join(' '),
                        {
                            errorClass: ERROR_CLASSES.POLICY,
                            hint: compositionHint(compositionIssue.code),
                            artifacts: {
                                path,
                                rejected: true,
                                code: compositionIssue.code,
                            },
                        },
                    )
                    if (path) {
                        onEvent?.({
                            type: 'ui',
                            writeFile: {
                                path,
                                status: 'error',
                                before,
                                after: before,
                                content: body,
                                observation,
                            },
                        })
                    }
                    break
                }
                if (path) {
                    onEvent?.({
                        type: 'ui',
                        writeFile: {
                            path,
                            status: 'writing',
                            before,
                            after: before,
                            content: '',
                        },
                    })
                    // Chips already resolved in real time via SSE tool_end — keep the
                    // apply-phase pulse short instead of re-animating every write.
                    await yieldForPaint(abortSignal, 60)
                }
                observation = await applyWriteToWorking({
                    workingVfs,
                    path,
                    fullContent: body,
                    writeMode: WRITE_MODES.FULL,
                    patchGate,
                })
                const after = workingVfs.has(path) ? workingVfs.read(path) : before
                const bytesChanged = before !== after
                const writeOk = observation?.status === 'ok'
                    || observation?.status === 'fallback_applied'

                if (observation?.hint === 'diff_loop_breaker' || observation?.errorClass === ERROR_CLASSES.DIFF_LOOP) {
                    diffLoopEscalate = true
                    if (path) diffLoopPaths.push(path)
                    onEvent?.({
                        type: 'ui',
                        callout: {
                            tone: 'warning',
                            text: `Diff-loop breaker — locked ${path} to last valid state.`,
                        },
                    })
                }
                if (observation?.hint === 'not_writable') {
                    onEvent?.({
                        type: 'ui',
                        callout: {
                            tone: 'warning',
                            text: `Path not writable — choose an allowed file (e.g. src/index.css for Tailwind).`,
                        },
                    })
                }
                // Wrote card when VFS bytes changed. Always settle a pre-painted
                // writing row (noop / skip would otherwise linger as "Writing…").
                if (writeOk && bytesChanged) {
                    onEvent?.({
                        type: 'ui',
                        writeFile: {
                            path,
                            status: 'done',
                            before,
                            after,
                            content: body,
                            observation,
                        },
                    })
                } else if (observation?.status === 'error' && observation?.hint !== 'noop_write') {
                    onEvent?.({
                        type: 'ui',
                        writeFile: {
                            path,
                            status: 'error',
                            before,
                            after: before,
                            // Attempted body for laravel.log diagnostics (never painted).
                            content: body,
                            observation,
                        },
                    })
                    // Rejected new JSX must still exist on disk — App.jsx already
                    // imports it. Write a real fallback now; do not wait on another
                    // billed model round (that was the 48s "Resolving 1 missing").
                    if (
                        path
                        && observation?.hint === 'prewrite_reject'
                        && /\.(jsx|tsx)$/i.test(path)
                    ) {
                        const live = workingVfs.has(path) ? String(workingVfs.read(path) || '') : ''
                        const missing = ! live.trim() || live.includes(VFS_STUB_MARKER)
                        if (missing) {
                            workingVfs.write(path, buildModuleStubSource(path))
                            syncPatchEngineBuffers(workingVfs, [path])
                        }
                    }
                } else if (path) {
                    onEvent?.({
                        type: 'ui',
                        writeFile: {
                            path,
                            status: 'done',
                            before,
                            after,
                            content: body,
                            observation,
                        },
                    })
                }
                break
            }
            case 'github_status':
            case 'github_compare':
            case 'github_push':
            case 'github_pull':
            case 'github_fork':
            case 'github_link':
            case 'github_create_repo': {
                try {
                    const needRemote = name === 'github_push' || name === 'github_pull' || name === 'github_compare'
                    await ensureGithub(projectUuid, { needRemote, abortSignal })
                    let bundle
                    if (name === 'github_compare') {
                        bundle = await compareLabGithub(projectUuid, {
                            pathPrefix: input.path_prefix,
                        })
                    } else if (name === 'github_push') {
                        bundle = await pushLabGithub(projectUuid, {
                            message: String(input.message || ''),
                            force: Boolean(input.force),
                        })
                    } else if (name === 'github_pull') {
                        bundle = await pullLabGithub(projectUuid, {
                            branch: input.branch,
                        })
                    } else if (name === 'github_fork') {
                        bundle = await forkLabGithub({
                            owner: input.owner,
                            repo: input.repo,
                            url: input.url,
                            branch: input.branch,
                            import: input.import !== false,
                        }, projectUuid)
                    } else if (name === 'github_link') {
                        bundle = await linkLabGithub(projectUuid, {
                            owner: input.owner,
                            repo: input.repo,
                            url: input.url,
                            branch: input.branch,
                            root_directory: input.root_directory,
                        })
                    } else if (name === 'github_create_repo') {
                        bundle = await createLabGithubRepo(projectUuid, {
                            name: input.name,
                            private: input.private !== false,
                            description: input.description,
                            push: input.push !== false,
                        })
                    } else {
                        bundle = await readLabGithubStatus(projectUuid)
                    }
                    const compare = bundle.compare || bundle.status?.compare || null
                    const remote = bundle.remote || bundle.status?.remote || null
                    const summary = name === 'github_compare' || compare
                        ? summarizeCompare(compare)
                        : (remote
                            ? `GitHub ${remote.full_name || `${remote.owner}/${remote.repo}`} @ ${remote.branch || 'main'}`
                            : (bundle.forked
                                ? `Forked ${bundle.full_name}`
                                : 'GitHub is connected.'))
                    onEvent?.({
                        type: 'ui',
                        github: { tool: name, status: 'done', summary, remote, compare },
                    })
                    observation = observationOk(name, summary, {
                        remote,
                        compare,
                        sha: bundle.sha || null,
                        html_url: bundle.html_url || remote?.html_url || null,
                        forked: Boolean(bundle.forked),
                        files: bundle.files || bundle.imported?.paths?.length || null,
                    })
                } catch (error) {
                    if (error?.code === 'ABORTED' || error?.name === 'AbortError') throw error
                    if (isGithubSkip(error)) {
                        observation = skippedGithub(name, error)
                        onEvent?.({
                            type: 'ui',
                            github: {
                                tool: name,
                                status: 'skipped',
                                summary: error?.code === 'cancelled'
                                    ? 'GitHub declined.'
                                    : 'GitHub is not connected.',
                            },
                        })
                        break
                    }
                    observation = observationError(
                        name,
                        error?.message || 'GitHub request failed.',
                        {
                            errorClass: 'Recoverable',
                            artifacts: { tool: name },
                            hint: 'github_failed',
                        },
                    )
                }
                break
            }
            default:
                observation = observationError('unknown', `Unknown tool: ${name}`, {
                    errorClass: 'Policy',
                    artifacts: { name },
                    hint: null,
                })
        }

        observations.push(observation)
        onEvent?.({ type: 'tool_done', tool: name, id: call?.id, observation })
        await yieldForPaint(abortSignal, name === 'write_file' ? 48 : 16)
    }

    return {
        observations,
        writeModeApplied: effectiveMode,
        touched: workingVfs.touchedPaths(),
        usedNativeTools: true,
        // Compat: patch escalate graph removed — always false / empty.
        patchMissEscalate: false,
        patchMissPaths: [],
        diffLoopEscalate,
        diffLoopPaths,
    }
}
