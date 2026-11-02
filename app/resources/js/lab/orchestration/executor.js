import {
    MAX_TOOL_ROUNDS,
    TURN_STATES,
    WRITE_MODES,
} from './constants.js'
import { applyToolCalls } from './toolRuntime.js'
import { applyWriteToWorking } from './patchApply.js'
import { observationOk } from './observations.js'
import {
    draftAppFromBrief,
    listWorkspaceDir,
    pickReadPath,
    searchQueryFromBrief,
    searchWorkspaceFiles,
} from '../lib/chatTools.js'
import { normalizeVfsPath } from '../lib/vfs.js'
import { recoverPseudoToolCalls } from './pseudoToolCalls.js'

/**
 * Build-lane Executor — prefers native tool_calls from the server agent.
 * Always recovers text/fenced pseudo-tools before applying when the batch is empty.
 */
export async function runExecutorPass({
    machine,
    workingVfs,
    tree = [],
    userText = '',
    assistantText = '',
    toolCalls = null,
    writeMode = WRITE_MODES.PATCH,
    forceFullWrite = false,
    repairBrief = null,
    projectUuid = null,
    onEvent = null,
    abortSignal = null,
    allowLegacyHeuristic = false,
    vfsContents = null,
    patchGate = null,
} = {}) {
    let calls = Array.isArray(toolCalls) ? toolCalls.filter((c) => c?.name) : []
    const vfsSnap = vfsContents && typeof vfsContents === 'object'
        ? vfsContents
        : (workingVfs?.snapshot?.() || {})

    // Hard gate: never apply with an empty batch if prose/fences/diffs still carry file bodies.
    if (! calls.length) {
        const seed = String(assistantText || userText || '')
        const recovered = recoverPseudoToolCalls(seed, [], { vfsContents: vfsSnap })
        if (recovered.toolCalls.length) {
            calls = recovered.toolCalls
            console.info('[lab:executor] recovered pseudo tool_calls before apply', {
                count: calls.length,
                names: calls.map((c) => c.name),
                paths: calls.map((c) => c.arguments?.path).filter(Boolean),
            })
        }
    }

    console.info('[lab:executor] incoming tool payload', {
        count: calls.length,
        names: calls.map((c) => c.name),
        paths: calls.map((c) => c.arguments?.path).filter(Boolean),
        allowLegacyHeuristic,
        projectUuid,
    })

    machine.transition(TURN_STATES.EXECUTING, {
        repair: Boolean(repairBrief),
        forceFullWrite,
        nativeTools: calls.length > 0,
    })

    if (calls.length > 0) {
        machine.assertNotAborted()
        machine.transition(TURN_STATES.TOOL_PENDING, { tool: 'native_batch' })
        const result = await applyToolCalls({
            toolCalls: calls.slice(0, MAX_TOOL_ROUNDS),
            workingVfs,
            tree,
            writeMode,
            forceFullWrite,
            patchGate,
            projectUuid,
            onEvent,
            abortSignal,
        })
        machine.assertNotAborted()
        machine.transition(TURN_STATES.OBSERVING, { tool: 'native_batch' })
        machine.transition(TURN_STATES.EXECUTING)
        return {
            ...result,
            projectUuid,
            legacyHeuristic: false,
            appliedCalls: calls,
            patchMissEscalate: Boolean(result?.patchMissEscalate),
            patchMissPaths: Array.isArray(result?.patchMissPaths) ? result.patchMissPaths : [],
            diffLoopEscalate: Boolean(result?.diffLoopEscalate),
            diffLoopPaths: Array.isArray(result?.diffLoopPaths) ? result.diffLoopPaths : [],
        }
    }

    if (! allowLegacyHeuristic) {
        console.warn('[lab:executor] empty tool payload — no VFS mutations', {
            assistantPreview: String(assistantText || '').slice(0, 240),
        })
        onEvent?.({
            type: 'ui',
            callout: {
                tone: 'warning',
                text: 'Executor expected native tool_calls from the server agent. No VFS mutations applied.',
            },
        })
        return {
            observations: [
                observationOk('executor', 'No tool_calls — skipped mutations (parser banned)', {
                    writeModeApplied: writeMode,
                }),
            ],
            writeModeApplied: writeMode,
            touched: [],
            projectUuid,
            legacyHeuristic: false,
            missingToolCalls: true,
        }
    }

    return runLegacyScaffoldPass({
        machine,
        workingVfs,
        tree,
        userText,
        repairBrief,
        writeMode,
        forceFullWrite,
        projectUuid,
        onEvent,
    })
}

/** @deprecated Emergency fallback only — do not use in production agent path. */
async function runLegacyScaffoldPass({
    machine,
    workingVfs,
    tree,
    userText,
    repairBrief,
    writeMode,
    forceFullWrite,
    projectUuid,
    onEvent,
}) {
    const effectiveMode = forceFullWrite ? WRITE_MODES.FULL : writeMode
    const observations = []

    machine.transition(TURN_STATES.TOOL_PENDING, { tool: 'legacy_scaffold' })
    const listed = listWorkspaceDir({ contents: workingVfs.snapshot(), tree, path: 'src' })
    onEvent?.({
        type: 'ui',
        listDir: { path: listed.path, status: 'done', items: listed.items },
    })
    observations.push(observationOk('list_dir', `Listed ${listed.path}`, { path: listed.path }))

    const query = searchQueryFromBrief(userText)
    const search = searchWorkspaceFiles({ tree, contents: workingVfs.snapshot(), query })
    onEvent?.({
        type: 'ui',
        fileSearch: { query: search.query, status: 'done', hits: search.hits },
    })

    const editPath = normalizeVfsPath(pickReadPath(search.hits, 'src/App.jsx'))
    const before = workingVfs.has(editPath) ? workingVfs.read(editPath) : ''
    const after = draftAppFromBrief(before, repairBrief || userText)
    const observation = await applyWriteToWorking({
        workingVfs,
        path: editPath,
        fullContent: after,
        writeMode: WRITE_MODES.FULL,
        patchGate,
    })
    observations.push(observation)
    onEvent?.({
        type: 'ui',
        editFile: {
            path: editPath,
            status: 'done',
            observation,
            before,
            after: workingVfs.read(editPath),
        },
    })

    machine.transition(TURN_STATES.OBSERVING, { tool: 'legacy_scaffold' })
    machine.transition(TURN_STATES.EXECUTING)

    return {
        observations,
        writeModeApplied: effectiveMode,
        touched: workingVfs.touchedPaths(),
        projectUuid,
        legacyHeuristic: true,
    }
}
