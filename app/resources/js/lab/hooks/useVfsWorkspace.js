import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { readStoredAutoSave } from '../components/SaveTray'
import {
    deleteProjectPath,
    fetchFileContent,
    fetchFilesBatch,
    fetchProjectTree,
    saveFileContent,
} from '../lib/files'
import {
    collectFilePaths,
    isBinaryPath,
    isWritableLabPath,
    nextUntitledPath,
    normalizeVfsPath,
    pathExists,
    removePathFromTree,
    upsertFileInTree,
} from '../lib/vfs'
import { pushRecentPath, readRecentPaths } from '../lib/workspaceRecents'
import { mergeVfsContents, normalizeFilesMap, upsertBatchInTree } from '../lib/vfsBatch'
import { MORPH_MS } from '../lib/labConstants'
import { setLabAiStreaming } from '../lib/labStreamState'
import { anyPathNeedsPreviewReload, PREVIEW_RESYNC_EVENT } from '../lib/previewReload'

/**
 * @param {string} uuid
 * @param {string[]} paths
 * @returns {Promise<Record<string, string>>}
 */
async function loadVfsPaths(uuid, paths) {
    const unique = [...new Set((paths || []).map((p) => normalizeVfsPath(p)).filter(Boolean))]
    if (! unique.length || ! uuid) return {}

    /** @type {Record<string, string>} */
    const loaded = {}
    try {
        Object.assign(loaded, await fetchFilesBatch(uuid, unique))
    } catch {
        /* batch endpoint may fail — fall through to per-file reads */
    }

    const stillMissing = unique.filter((path) => ! Object.prototype.hasOwnProperty.call(loaded, path))
    const chunkSize = 12
    for (let i = 0; i < stillMissing.length; i += chunkSize) {
        await Promise.all(stillMissing.slice(i, i + chunkSize).map(async (path) => {
            if (Object.prototype.hasOwnProperty.call(loaded, path)) return
            try {
                const payload = await fetchFileContent(uuid, path)
                loaded[path] = payload.content ?? ''
            } catch {
                /* skip — caller may retry */
            }
        }))
    }

    const retry = unique.filter((path) => ! Object.prototype.hasOwnProperty.call(loaded, path))
    if (retry.length) {
        await new Promise((resolve) => { setTimeout(resolve, 150) })
        for (const path of retry) {
            try {
                const payload = await fetchFileContent(uuid, path)
                loaded[path] = payload.content ?? ''
            } catch {
                /* skip */
            }
        }
    }

    return loaded
}

/**
 * Workspace VFS, editor buffers, dirty/save, AI stream mutex, panel mode.
 */
export function useVfsWorkspace({ projectUuid, projectTitle, building }) {
    const [workspaceView, setWorkspaceView] = useState({
        panel: 'preview',
        tabId: null,
        consoleIds: [],
        editorPaths: [],
        activePath: null,
    })
    /** rail = chat | stage; draft = chat | editor | files rail (chat stays left) */
    const [composeMode, setComposeMode] = useState('rail')
    /** Skip flex morph unless opening from the full Files stage. */
    const [layoutInstant, setLayoutInstant] = useState(false)
    const [draftBuffers, setDraftBuffers] = useState({})
    const [savedBuffers, setSavedBuffers] = useState({})
    const [autoSave, setAutoSave] = useState(() => readStoredAutoSave())
    const [saving, setSaving] = useState(false)
    const [workspacePristine, setWorkspacePristine] = useState(true)
    const [pendingClose, setPendingClose] = useState(null)
    const [fileTree, setFileTree] = useState([])
    /** In-memory VFS: relative path → text (editor + mock shell source of truth). */
    const [vfsContents, setVfsContents] = useState({})
    /** AI codegen stream mutex — pauses disk/UI churn while tools stream. */
    const [isAiStreaming, setIsAiStreaming] = useState(false)
    /** True once the current turn has written/patched files (vs chat-only). */
    const [aiWriting, setAiWriting] = useState(false)
    /** Hold the bucket overlay until a reload-required iframe remount starts. */
    const [previewReloadPending, setPreviewReloadPending] = useState(false)
    const [previewLive, setPreviewLive] = useState(false)
    const [filesLoading, setFilesLoading] = useState(false)
    const [filesError, setFilesError] = useState(null)
    const [openFileSignal, setOpenFileSignal] = useState(null)
    const [openConsoleSignal, setOpenConsoleSignal] = useState(null)
    const [openPreviewSignal, setOpenPreviewSignal] = useState(null)
    const [openTablesSignal, setOpenTablesSignal] = useState(null)
    const [recentPaths, setRecentPaths] = useState(() => readRecentPaths(projectUuid))
    /** Shell-tool runs mirrored into the Console tab (command + stdout). */
    const [consoleSessionLog, setConsoleSessionLog] = useState([])

    const composeModeRef = useRef(composeMode)
    const workspaceViewRef = useRef(workspaceView)
    const saveTimersRef = useRef({})
    const autoSaveRef = useRef(autoSave)
    const draftBuffersRef = useRef(draftBuffers)
    const savedBuffersRef = useRef(savedBuffers)
    const vfsContentsRef = useRef(vfsContents)
    const fileTreeRef = useRef(fileTree)
    const writeVfsFileRef = useRef(null)
    const removeVfsPathRef = useRef(null)
    /** Partial AI file payloads while isAiStreaming — flushed via applyVfsBatch. */
    const aiStreamBufferRef = useRef({})
    const isAiStreamingRef = useRef(false)
    const pendingPreviewReloadRef = useRef(false)
    /** Soft project switch: wipe + hydrate only when the uuid actually changes. */
    const prevProjectUuidRef = useRef(Symbol('unset'))

    composeModeRef.current = composeMode
    workspaceViewRef.current = workspaceView
    autoSaveRef.current = autoSave
    draftBuffersRef.current = draftBuffers
    savedBuffersRef.current = savedBuffers
    vfsContentsRef.current = vfsContents
    fileTreeRef.current = fileTree
    isAiStreamingRef.current = isAiStreaming

    const dirtyPaths = useMemo(() => {
        const map = {}
        for (const path of Object.keys(draftBuffers)) {
            if (! Object.prototype.hasOwnProperty.call(savedBuffers, path)) continue
            if (draftBuffers[path] !== savedBuffers[path]) map[path] = true
        }
        return map
    }, [draftBuffers, savedBuffers])

    const dirtyPathList = useMemo(() => Object.keys(dirtyPaths), [dirtyPaths])
    const dirtyCount = dirtyPathList.length

    /** Draft overlays win over hydrated disk VFS for shell + stage consumers. */
    const previewContents = useMemo(
        () => ({ ...vfsContents, ...draftBuffers }),
        [vfsContents, draftBuffers],
    )

    const hydrateVfsFromTree = useCallback(async (uuid, tree, { force = false } = {}) => {
        if (! uuid) {
            setVfsContents({})
            vfsContentsRef.current = {}
            return {}
        }

        const paths = collectFilePaths(tree).filter((path) => ! isBinaryPath(path))
        const updates = {}

        for (const path of paths) {
            if (! force && Object.prototype.hasOwnProperty.call(draftBuffersRef.current, path)) {
                updates[path] = draftBuffersRef.current[path]
            } else if (! force && Object.prototype.hasOwnProperty.call(vfsContentsRef.current, path)) {
                updates[path] = vfsContentsRef.current[path]
            }
        }

        const missing = paths.filter((path) => (
            ! Object.prototype.hasOwnProperty.call(updates, path)
        ))

        if (missing.length) {
            Object.assign(updates, await loadVfsPaths(uuid, missing))
        }

        if (force) {
            setVfsContents(updates)
            vfsContentsRef.current = { ...updates }
        } else if (Object.keys(updates).length) {
            setVfsContents((prev) => ({ ...prev, ...updates }))
            vfsContentsRef.current = { ...vfsContentsRef.current, ...updates }
        }

        return { ...vfsContentsRef.current, ...(! force ? draftBuffersRef.current : {}) }
    }, [])

    const refreshFileTree = useCallback(async (uuid, { force = false } = {}) => {
        if (! uuid) {
            setFileTree([])
            setVfsContents({})
            vfsContentsRef.current = {}
            setDraftBuffers({})
            draftBuffersRef.current = {}
            setPreviewLive(false)
            setFilesError(null)
            setWorkspacePristine(true)
            return { tree: [], contents: {} }
        }

        setFilesLoading(true)
        setFilesError(null)
        try {
            if (force) {
                setDraftBuffers({})
                draftBuffersRef.current = {}
                setVfsContents({})
                vfsContentsRef.current = {}
                setSavedBuffers({})
                savedBuffersRef.current = {}
            }

            const payload = await fetchProjectTree(uuid)
            const tree = payload.tree || []
            setFileTree(tree)
            fileTreeRef.current = tree
            setWorkspacePristine(payload.pristine !== false)
            const contents = await hydrateVfsFromTree(uuid, tree, { force })
            if (force && Object.keys(contents).length) {
                setPreviewLive(true)
            }
            return { tree, contents }
        } catch (error) {
            setFilesError(error?.message || 'Could not load files.')
            setFileTree([])
            return { tree: [], contents: {} }
        } finally {
            setFilesLoading(false)
        }
    }, [hydrateVfsFromTree])

    // Soft project switch: wipe + hydrate only when the uuid actually changes.
    // refreshFileTree in the dep array used to re-wipe VFS on every callback identity churn.
    useEffect(() => {
        if (prevProjectUuidRef.current === projectUuid) return undefined
        prevProjectUuidRef.current = projectUuid
        setVfsContents({})
        setPreviewLive(false)
        setRecentPaths(readRecentPaths(projectUuid))
        refreshFileTree(projectUuid, { force: true })
        return undefined
    }, [projectUuid, refreshFileTree])

    useEffect(() => {
        if (! layoutInstant) return undefined
        const id = window.setTimeout(() => setLayoutInstant(false), MORPH_MS + 50)
        return () => window.clearTimeout(id)
    }, [layoutInstant])

    useEffect(() => () => {
        Object.values(saveTimersRef.current).forEach((timer) => window.clearTimeout(timer))
    }, [])

    const markSaved = useCallback((path, content) => {
        setSavedBuffers((prev) => ({ ...prev, [path]: content }))
        setWorkspacePristine(false)
    }, [])

    const queueFileSave = useCallback((uuid, path, content) => {
        if (! uuid || ! path) return
        const timers = saveTimersRef.current
        if (timers[path]) window.clearTimeout(timers[path])
        timers[path] = window.setTimeout(() => {
            saveFileContent(uuid, path, content)
                .then(() => markSaved(path, content))
                .catch(() => {
                    /* keep local buffer; next edit retries */
                })
        }, 350)
    }, [markSaved])

    /**
     * Apply many path→content writes in one React update cycle.
     * While AI is streaming, pass `{ triggerPreview: false }` (default when
     * isAiStreaming) — stage consumers stay quiet until the stream ends.
     */
    const applyVfsBatch = useCallback((filesMap, options = {}) => {
        const batch = normalizeFilesMap(filesMap)
        const paths = Object.keys(batch)
        if (! paths.length) return { applied: [], triggerPreview: false }

        const {
            persist = true,
            asDraft = true,
            triggerPreview = ! isAiStreamingRef.current,
        } = options

        setVfsContents((prev) => {
            const next = mergeVfsContents(prev, batch)
            vfsContentsRef.current = next
            return next
        })

        if (asDraft) {
            setDraftBuffers((prev) => {
                const next = { ...prev, ...batch }
                draftBuffersRef.current = next
                return next
            })
        }

        if (isAiStreamingRef.current) {
            setAiWriting(true)
            if (anyPathNeedsPreviewReload(paths)) {
                pendingPreviewReloadRef.current = true
                setPreviewReloadPending(true)
            }
        }

        setFileTree((prev) => {
            const next = upsertBatchInTree(prev, batch)
            fileTreeRef.current = next
            return next
        })
        setWorkspacePristine(false)
        setPreviewLive(true)

        const uuid = projectUuid
        if (persist && uuid) {
            for (const path of paths) {
                queueFileSave(uuid, path, batch[path])
            }
        } else if (! persist) {
            setSavedBuffers((prev) => ({ ...prev, ...batch }))
        }

        if (triggerPreview && isAiStreamingRef.current) {
            setIsAiStreaming(false)
            isAiStreamingRef.current = false
        }

        return { applied: paths, triggerPreview }
    }, [projectUuid, queueFileSave])

    const beginAiStream = useCallback(() => {
        aiStreamBufferRef.current = {}
        pendingPreviewReloadRef.current = false
        isAiStreamingRef.current = true
        setLabAiStreaming(true)
        setIsAiStreaming(true)
        setAiWriting(false)
        setPreviewReloadPending(false)
    }, [])

    const bufferAiFile = useCallback((path, content) => {
        const normalized = normalizeVfsPath(path)
        if (! normalized) return
        aiStreamBufferRef.current[normalized] = content == null ? '' : String(content)
    }, [])

    /** Commit one completed file block during a stream without ending the mutex. */
    const commitAiStreamFile = useCallback((path, content, options = {}) => {
        const normalized = normalizeVfsPath(path)
        if (! normalized) return
        const body = content == null ? '' : String(content)
        aiStreamBufferRef.current[normalized] = body
        applyVfsBatch(
            { [normalized]: body },
            { triggerPreview: false, persist: options.persist ?? true, asDraft: options.asDraft ?? true },
        )
        // Already on VFS — don't re-apply on endAiStream.
        delete aiStreamBufferRef.current[normalized]
    }, [applyVfsBatch])

    const endAiStream = useCallback((options = {}) => {
        const batch = { ...aiStreamBufferRef.current }
        aiStreamBufferRef.current = {}
        const leftover = Object.keys(batch)
        if (leftover.length) {
            setAiWriting(true)
            if (anyPathNeedsPreviewReload(leftover)) {
                pendingPreviewReloadRef.current = true
                setPreviewReloadPending(true)
            }
        }

        const reload = pendingPreviewReloadRef.current
        isAiStreamingRef.current = false
        setLabAiStreaming(false)
        setIsAiStreaming(false)
        setAiWriting(false)

        if (leftover.length) {
            applyVfsBatch(batch, {
                triggerPreview: true,
                persist: options.persist ?? true,
                asDraft: options.asDraft ?? true,
            })
        }

        return { reload }
    }, [applyVfsBatch])

    const cancelAiStream = useCallback(() => {
        aiStreamBufferRef.current = {}
        pendingPreviewReloadRef.current = false
        isAiStreamingRef.current = false
        setLabAiStreaming(false)
        setIsAiStreaming(false)
        setAiWriting(false)
        setPreviewReloadPending(false)
    }, [])

    const savePaths = useCallback(async (paths) => {
        const uuid = projectUuid
        if (! uuid || ! paths.length) return true

        setSaving(true)
        let ok = true
        try {
            for (const path of paths) {
                const timers = saveTimersRef.current
                if (timers[path]) {
                    window.clearTimeout(timers[path])
                    delete timers[path]
                }
                const content = draftBuffersRef.current[path]
                if (content == null) continue
                try {
                    await saveFileContent(uuid, path, content)
                    markSaved(path, content)
                } catch {
                    ok = false
                }
            }
            if (ok) refreshFileTree(uuid)
        } finally {
            setSaving(false)
        }
        return ok
    }, [markSaved, projectUuid, refreshFileTree])

    const saveAllDirty = useCallback(() => {
        const paths = Object.keys(draftBuffersRef.current).filter((path) => {
            if (! Object.prototype.hasOwnProperty.call(savedBuffersRef.current, path)) return false
            return draftBuffersRef.current[path] !== savedBuffersRef.current[path]
        })
        return savePaths(paths)
    }, [savePaths])

    const discardPaths = useCallback((paths) => {
        setDraftBuffers((prev) => {
            const next = { ...prev }
            for (const path of paths) {
                if (Object.prototype.hasOwnProperty.call(savedBuffersRef.current, path)) {
                    next[path] = savedBuffersRef.current[path]
                }
            }
            return next
        })
        for (const path of paths) {
            const timers = saveTimersRef.current
            if (timers[path]) {
                window.clearTimeout(timers[path])
                delete timers[path]
            }
        }
    }, [])

    const discardAllDirty = useCallback(() => {
        const paths = Object.keys(draftBuffersRef.current).filter((path) => {
            if (! Object.prototype.hasOwnProperty.call(savedBuffersRef.current, path)) return false
            return draftBuffersRef.current[path] !== savedBuffersRef.current[path]
        })
        discardPaths(paths)
    }, [discardPaths])

    const loadFileIntoBuffer = useCallback(async (uuid, path) => {
        if (! uuid || ! path) return
        if (Object.prototype.hasOwnProperty.call(draftBuffersRef.current, path)) return

        if (Object.prototype.hasOwnProperty.call(vfsContentsRef.current, path)) {
            const content = vfsContentsRef.current[path]
            setDraftBuffers((prev) => (
                Object.prototype.hasOwnProperty.call(prev, path) ? prev : { ...prev, [path]: content }
            ))
            setSavedBuffers((prev) => (
                Object.prototype.hasOwnProperty.call(prev, path) ? prev : { ...prev, [path]: content }
            ))
            return
        }

        try {
            const payload = await fetchFileContent(uuid, path)
            const content = payload.content ?? ''
            setDraftBuffers((prev) => (
                Object.prototype.hasOwnProperty.call(prev, path) ? prev : { ...prev, [path]: content }
            ))
            setSavedBuffers((prev) => (
                Object.prototype.hasOwnProperty.call(prev, path) ? prev : { ...prev, [path]: content }
            ))
            setVfsContents((prev) => (
                Object.prototype.hasOwnProperty.call(prev, path) ? prev : { ...prev, [path]: content }
            ))
        } catch {
            setDraftBuffers((prev) => (
                Object.prototype.hasOwnProperty.call(prev, path) ? prev : { ...prev, [path]: '' }
            ))
            setSavedBuffers((prev) => (
                Object.prototype.hasOwnProperty.call(prev, path) ? prev : { ...prev, [path]: '' }
            ))
        }
    }, [])

    const writeVfsFile = useCallback(async (path, content) => {
        const normalized = normalizeVfsPath(path)
        const uuid = projectUuid
        if (! normalized || ! uuid) return false

        setVfsContents((prev) => ({ ...prev, [normalized]: content }))
        setDraftBuffers((prev) => (
            Object.prototype.hasOwnProperty.call(prev, normalized)
                ? { ...prev, [normalized]: content }
                : prev
        ))
        setFileTree((prev) => upsertFileInTree(prev, normalized))
        setWorkspacePristine(false)
        queueFileSave(uuid, normalized, content)
        return true
    }, [projectUuid, queueFileSave])

    const removeVfsPath = useCallback(async (path) => {
        const normalized = normalizeVfsPath(path)
        const uuid = projectUuid
        if (! normalized || ! uuid) return false

        try {
            await deleteProjectPath(uuid, normalized)
        } catch {
            return false
        }

        const dropKey = (key) => key === normalized || key.startsWith(`${normalized}/`)

        setVfsContents((prev) => {
            const next = { ...prev }
            for (const key of Object.keys(next)) {
                if (dropKey(key)) delete next[key]
            }
            return next
        })
        setDraftBuffers((prev) => {
            const next = { ...prev }
            for (const key of Object.keys(next)) {
                if (dropKey(key)) delete next[key]
            }
            return next
        })
        setSavedBuffers((prev) => {
            const next = { ...prev }
            for (const key of Object.keys(next)) {
                if (dropKey(key)) delete next[key]
            }
            return next
        })
        setFileTree((prev) => removePathFromTree(prev, normalized))
        setWorkspacePristine(false)
        return true
    }, [projectUuid])

    writeVfsFileRef.current = writeVfsFile
    removeVfsPathRef.current = removeVfsPath

    const vfsApi = useMemo(() => ({
        getContents: () => ({ ...vfsContentsRef.current, ...draftBuffersRef.current }),
        getTree: () => fileTreeRef.current,
        writeFile: (path, content) => writeVfsFileRef.current?.(path, content),
        removePath: (path) => removeVfsPathRef.current?.(path),
        markPreviewLive: () => setPreviewLive(true),
        applyBatch: (filesMap, options) => applyVfsBatch(filesMap, options),
        beginAiStream,
        bufferAiFile,
        commitAiStreamFile,
        endAiStream,
        cancelAiStream,
        isAiStreaming: () => isAiStreamingRef.current,
    }), [applyVfsBatch, beginAiStream, bufferAiFile, commitAiStreamFile, endAiStream, cancelAiStream])

    const handleWorkspaceView = useCallback((view) => {
        const prevMode = composeModeRef.current
        const prevPanel = workspaceViewRef.current.panel

        setWorkspaceView((prev) => ({
            ...prev,
            ...view,
            editorPaths: view.editorPaths ?? prev.editorPaths ?? [],
            activePath: view.activePath ?? null,
        }))

        if (view.panel === 'editor' && view.activePath) {
            // Animate only when leaving the full Files stage for the first time.
            // (handleOpenFile already set the flag when the click came from Files.)
            if (prevMode !== 'draft') {
                const fromFullFiles = prevMode === 'rail' && prevPanel === 'files'
                setLayoutInstant(! fromFullFiles)
            }
            if (projectUuid && view.activePath) {
                loadFileIntoBuffer(projectUuid, view.activePath)
            }
            setComposeMode('draft')
            return
        }

        const backToFiles = view.panel === 'files' && prevMode === 'draft'
        setLayoutInstant(! backToFiles)
        setComposeMode('rail')
    }, [loadFileIntoBuffer, projectUuid])

    const handleOpenFile = useCallback((entry) => {
        if (! entry?.path || entry.type === 'folder') return

        const path = normalizeVfsPath(entry.path)
        if (! path) return

        const fromFullFiles = composeModeRef.current === 'rail'
            && workspaceViewRef.current.panel === 'files'
        setLayoutInstant(! fromFullFiles)

        const uuid = projectUuid
        if (uuid) {
            loadFileIntoBuffer(uuid, path)
            setRecentPaths(pushRecentPath(uuid, path))
        } else {
            const body = entry.body ?? ''
            setDraftBuffers((prev) => (
                Object.prototype.hasOwnProperty.call(prev, path)
                    ? prev
                    : { ...prev, [path]: body }
            ))
            setSavedBuffers((prev) => (
                Object.prototype.hasOwnProperty.call(prev, path)
                    ? prev
                    : { ...prev, [path]: body }
            ))
        }

        setOpenFileSignal({
            path,
            name: entry.name || path.split('/').pop() || path,
            nonce: Date.now(),
        })
        setComposeMode('draft')
    }, [loadFileIntoBuffer, projectUuid])

    const suggestUntitledPath = useCallback(() => (
        nextUntitledPath(vfsContentsRef.current, fileTreeRef.current)
    ), [])

    const createBlankFile = useCallback(async (rawPath) => {
        let normalized = normalizeVfsPath(rawPath)
        if (! normalized) {
            return { ok: false, error: 'Enter a file name.' }
        }
        if (! normalized.includes('/')) {
            normalized = normalizeVfsPath(`src/${normalized}`)
        }
        if (! isWritableLabPath(normalized)) {
            return { ok: false, error: 'Files must live under src/ or public/.' }
        }
        if (pathExists(vfsContentsRef.current, fileTreeRef.current, normalized)) {
            return { ok: false, error: 'That file already exists.' }
        }

        const content = ''
        vfsContentsRef.current = { ...vfsContentsRef.current, [normalized]: content }
        draftBuffersRef.current = { ...draftBuffersRef.current, [normalized]: content }
        savedBuffersRef.current = { ...savedBuffersRef.current, [normalized]: content }

        setVfsContents((prev) => ({ ...prev, [normalized]: content }))
        setDraftBuffers((prev) => ({ ...prev, [normalized]: content }))
        setSavedBuffers((prev) => ({ ...prev, [normalized]: content }))
        setFileTree((prev) => {
            const next = upsertFileInTree(prev, normalized)
            fileTreeRef.current = next
            return next
        })
        setWorkspacePristine(false)

        if (projectUuid) {
            queueFileSave(projectUuid, normalized, content)
        }

        handleOpenFile({
            path: normalized,
            name: normalized.split('/').pop() || normalized,
            body: content,
        })

        return { ok: true, path: normalized }
    }, [handleOpenFile, projectUuid, queueFileSave])

    const updateDraftBuffer = useCallback((path, value) => {
        setDraftBuffers((prev) => ({ ...prev, [path]: value }))
        setVfsContents((prev) => ({ ...prev, [path]: value }))
        setWorkspacePristine(false)
        if (autoSaveRef.current && projectUuid) {
            queueFileSave(projectUuid, path, value)
        }
        // Live sync only if guest already running (never boot on every keystroke).
        void import('../lib/labRuntime').then((m) => {
            if (m.getLabRuntime?.()) {
                m.syncLabVfsToGuest({ [path.startsWith('/') ? path : `/${path}`]: value }).catch(() => {})
            }
        })
    }, [projectUuid, queueFileSave])

    const handleRequestCloseTab = useCallback((tab, doClose) => {
        if (tab.path && dirtyPaths[tab.path]) {
            setPendingClose({ tab, doClose })
            return
        }
        doClose()
    }, [dirtyPaths])

    const confirmCloseSave = useCallback(async () => {
        if (! pendingClose) return
        const { tab, doClose } = pendingClose
        if (tab.path) {
            const ok = await savePaths([tab.path])
            if (! ok) return
        }
        setPendingClose(null)
        doClose()
    }, [pendingClose, savePaths])

    const confirmCloseDiscard = useCallback(() => {
        if (! pendingClose) return
        const { tab, doClose } = pendingClose
        if (tab.path) discardPaths([tab.path])
        setPendingClose(null)
        doClose()
    }, [discardPaths, pendingClose])

    // Ctrl/Cmd+S saves dirty buffers.
    useEffect(() => {
        if (! building) return undefined

        const onKey = (event) => {
            if (! (event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
            event.preventDefault()
            saveAllDirty()
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [building, saveAllDirty])

    /** @param {{ focus?: boolean }} [opts] focus=false keeps Preview tab while Console boots. */
    const openConsoleFromChat = useCallback(({ focus = true } = {}) => {
        setOpenConsoleSignal({ nonce: Date.now(), focus })
        setComposeMode('rail')
    }, [])

    const openPreviewFromChat = useCallback(() => {
        setOpenPreviewSignal({ nonce: Date.now() })
        setComposeMode('rail')
    }, [])

    const openTablesFromChat = useCallback(() => {
        setOpenTablesSignal({ nonce: Date.now() })
        setComposeMode('rail')
    }, [])

    const appendConsoleSession = useCallback((entry) => {
        if (! entry) return
        const lines = Array.isArray(entry.lines)
            ? entry.lines.map(String)
            : []
        setConsoleSessionLog((prev) => [
            ...prev,
            {
                command: String(entry.command || '').trim() || 'vfs-heal',
                lines,
                exitCode: Number(entry.exitCode) || 0,
                cwd: entry.cwd != null ? String(entry.cwd) : undefined,
            },
        ].slice(-80))
    }, [])

    // DeepThought onServerReady → Preview live.
    useEffect(() => {
        const onListen = () => {
            setPreviewLive(true)
        }
        const onResync = () => {
            window.setTimeout(() => {
                pendingPreviewReloadRef.current = false
                setPreviewReloadPending(false)
            }, 0)
        }
        window.addEventListener('krikkit-lab-runtime-listen', onListen)
        window.addEventListener(PREVIEW_RESYNC_EVENT, onResync)
        return () => {
            window.removeEventListener('krikkit-lab-runtime-listen', onListen)
            window.removeEventListener(PREVIEW_RESYNC_EVENT, onResync)
        }
    }, [])

    return {
        workspaceView,
        composeMode,
        layoutInstant,
        draftBuffers,
        savedBuffers,
        autoSave,
        setAutoSave,
        saving,
        workspacePristine,
        pendingClose,
        setPendingClose,
        fileTree,
        vfsContents,
        isAiStreaming,
        aiWriting,
        previewReloadPending,
        previewLive,
        filesLoading,
        filesError,
        openFileSignal,
        openConsoleSignal,
        openPreviewSignal,
        openTablesSignal,
        recentPaths,
        consoleSessionLog,
        dirtyPaths,
        dirtyPathList,
        dirtyCount,
        previewContents,
        vfsApi,
        workspaceViewRef,
        vfsContentsRef,
        draftBuffersRef,
        fileTreeRef,
        isAiStreamingRef,
        prevProjectUuidRef,
        refreshFileTree,
        applyVfsBatch,
        beginAiStream,
        endAiStream,
        cancelAiStream,
        saveAllDirty,
        discardAllDirty,
        handleWorkspaceView,
        handleOpenFile,
        createBlankFile,
        suggestUntitledPath,
        updateDraftBuffer,
        handleRequestCloseTab,
        confirmCloseSave,
        confirmCloseDiscard,
        openConsoleFromChat,
        openPreviewFromChat,
        openTablesFromChat,
        appendConsoleSession,
        setComposeMode,
    }
}
