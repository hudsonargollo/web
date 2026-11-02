/**
 * Quiet tool-execution copy — never used as Checklist / Todo labels.
 */

function baseName(path = '') {
    const normalized = String(path || '').replace(/\\/g, '/').trim()
    if (! normalized) return ''
    return normalized.split('/').filter(Boolean).pop() || normalized
}

/**
 * Wait-row copy while a file is streaming — basename only, no extra ellipsis
 * (TurnWaitStatus already paints the elapsed timer).
 */
export function writingWaitLabel(path = '', { tool = 'write_file' } = {}) {
    const name = baseName(path)
    const editing = tool === 'apply_patch' || tool === 'edit_file'
    if (! name) return ''
    return editing ? `Editing ${name}` : `Writing ${name}`
}

/** Path of the in-flight write/edit card, if any. */
export function activeWritePath(stack = [], writes = []) {
    const fromStack = (Array.isArray(stack) ? stack : []).find((row) => (
        (row?.kind === 'writeFile' || row?.kind === 'editFile')
        && ['writing', 'editing'].includes(String(row?.status || ''))
        && String(row?.path || '').trim() !== ''
    ))
    if (fromStack?.path) return String(fromStack.path)
    const fromWrites = (Array.isArray(writes) ? writes : []).find((row) => (
        row?.status === 'writing'
        && String(row?.path || '').trim() !== ''
    ))
    return fromWrites?.path ? String(fromWrites.path) : ''
}

/** Live / past tense labels for the quiet tool activity bar. */
export function formatToolActivityLabel(tool = '', path = '', { done = false } = {}) {
    const name = baseName(path)
    const dir = String(path || '').replace(/\/?$/, '')

    switch (String(tool || '')) {
        case 'read_file':
            if (done) return name ? `Read ${name}` : 'Read file'
            return name ? `Reading ${name}…` : 'Reading file…'
        case 'apply_patch':
        case 'write_file':
            if (done) return name ? `Wrote ${name}` : 'Wrote file'
            return name ? `Writing ${name}…` : 'Writing file…'
        case 'list_dir':
            if (done) return dir ? `Scanned ${dir}/` : 'Scanned folder'
            return dir ? `Scanning ${dir}/…` : 'Scanning…'
        case 'file_search':
            return done ? 'Searched files' : 'Searching files…'
        case 'grep':
            return done ? 'Searched contents' : 'Searching contents…'
        case 'lookup_visuals':
            return done ? 'Looked up photographs' : 'Looking up photographs…'
        case 'survey_datastore':
            return done ? 'Surveyed datastore' : 'Surveying datastore…'
        case 'revise_datastore':
            return done ? 'Revised datastore' : 'Revising datastore…'
        case 'github_status':
            return done ? 'Checked GitHub' : 'Checking GitHub…'
        case 'github_compare':
            return done ? 'Compared GitHub tree' : 'Comparing GitHub tree…'
        case 'github_push':
            return done ? 'Pushed to GitHub' : 'Pushing to GitHub…'
        case 'github_pull':
            return done ? 'Pulled from GitHub' : 'Pulling from GitHub…'
        case 'github_fork':
            return done ? 'Forked repository' : 'Forking repository…'
        case 'github_link':
            return done ? 'Linked GitHub repo' : 'Linking GitHub repo…'
        case 'github_create_repo':
            return done ? 'Created GitHub repo' : 'Creating GitHub repo…'
        case 'shell':
            return done ? 'Ran command' : 'Running command…'
        case 'fetch':
            return done ? 'Fetched resource' : 'Fetching…'
        default:
            return done ? 'Finished step' : 'Working…'
    }
}

/**
 * Short write-failure reason for WriteFileCard — not the full agent observation.
 */
export function writeFailureHint(observation = {}) {
    const hint = String(observation?.hint || '')
    const type = String(observation?.artifacts?.errorType || '')
    if (hint === 'not_writable') return 'Path isn’t writable'
    if (hint === 'diff_loop_breaker') return 'Too many similar rewrites'
    if (hint === 'noop_write') return 'No content change'
    if (hint === 'composition_empty_tile') return 'Empty tiles — use a photograph'
    if (hint === 'composition_poster_hero') return 'Poster hero — product must be on the page'
    if (hint === 'composition_twin_buttons') return 'One primary hero action only'
    if (hint === 'composition_section_stack') return 'Too many stacked landing sections'
    if (hint === 'composition_name_stub') return 'Placeholder section — ship real content'
    if (type === 'EmptySource' || /source file is empty/i.test(String(observation?.summary || ''))) {
        return 'File was empty'
    }
    if (type === 'SyntaxError' || /JSX closing tag|syntax error/i.test(String(observation?.summary || ''))) {
        return observation?.artifacts?.message
            ? String(observation.artifacts.message).slice(0, 80)
            : 'JSX syntax error'
    }
    if (type === 'UnbalancedDelimiter' || /unbalanced/i.test(String(observation?.summary || ''))) {
        return 'Unbalanced braces or tags'
    }
    if (type === 'UnclosedTag' || /truncated jsx/i.test(String(observation?.summary || ''))) {
        return 'Truncated JSX'
    }
    if (type === 'MalformedImport' || /malformed import/i.test(String(observation?.summary || ''))) {
        return 'Broken import'
    }
    if (type === 'JsonParseError') return 'Invalid JSON'
    return ''
}

/** True when a string looks like a raw tool-execution log, not a human milestone. */
export function isToolLogLabel(text = '') {
    const label = String(text || '').replace(/\s+/g, ' ').trim()
    if (! label) return true

    if (/^(list_dir|read_file|write_file|apply_patch|file_search|grep|lookup_visuals|survey_datastore|revise_datastore|github_status|github_compare|github_push|github_pull|github_fork|github_link|github_create_repo|shell|fetch)\b/i.test(label)) {
        return true
    }
    if (/^(technical logs?|writing files|running tools|reading results|starting tools|continuing|applying changes)\b/i.test(label)) {
        return true
    }
    // Legacy reactive checklist: "Read App.jsx", "Patch src/App.jsx", "Scan src/"…
    if (/^(read|write|wrote|patch|scan|scanned|grep|locate|listed)\s+\S+/i.test(label)) {
        return true
    }
    if (/^(reading|writing|updating)\s+\S+/i.test(label)) {
        return true
    }
    // Deprecated tool-kind todo ids from the reactive era.
    if (/^(list|search|grep|read|edit)$/i.test(label)) {
        return true
    }

    return false
}

/**
 * Build a quiet toolActivity snapshot from legacy per-tool chrome cards (F5 hydrate).
 * @returns {{ status: string, label: string, entries: Array<{ id: string, label: string, status: string }> }|null}
 */
export function toolActivityFromLegacyChrome(chrome = {}) {
    if (! chrome || typeof chrome !== 'object') return null
    if (chrome.toolActivity?.entries?.length) {
        return chrome.toolActivity
    }

    const entries = []
    const seen = new Set()
    const push = (id, tool, path, status = 'done') => {
        const key = `${tool}|${path || ''}`
        if (seen.has(key)) return
        seen.add(key)
        entries.push({
            id,
            tool,
            path: path || null,
            label: formatToolActivityLabel(tool, path, { done: status !== 'error' }),
            status: status === 'error' ? 'error' : 'done',
        })
    }

    const listDirs = Array.isArray(chrome.listDirs) && chrome.listDirs.length
        ? chrome.listDirs
        : (chrome.listDir ? [chrome.listDir] : [])
    for (const [index, row] of listDirs.entries()) {
        if (! row || row.path == null) continue
        push(`listDir-${index}`, 'list_dir', row.path, row.status)
    }

    const searches = Array.isArray(chrome.fileSearches) && chrome.fileSearches.length
        ? chrome.fileSearches
        : (chrome.fileSearch ? [chrome.fileSearch] : [])
    for (const [index, row] of searches.entries()) {
        push(`fileSearch-${index}`, 'file_search', '', row?.status)
    }

    const greps = Array.isArray(chrome.greps) && chrome.greps.length
        ? chrome.greps
        : (chrome.grep ? [chrome.grep] : [])
    for (const [index, row] of greps.entries()) {
        push(`grep-${index}`, 'grep', '', row?.status)
    }

    const reads = Array.isArray(chrome.reads) && chrome.reads.length
        ? chrome.reads
        : (chrome.readFile ? [chrome.readFile] : [])
    for (const [index, row] of reads.entries()) {
        if (! row?.path) continue
        push(`read-${index}`, 'read_file', row.path, row.status)
    }

    const edits = Array.isArray(chrome.edits) && chrome.edits.length
        ? chrome.edits
        : (chrome.editFile ? [chrome.editFile] : [])
    for (const [index, row] of edits.entries()) {
        if (! row?.path) continue
        push(`edit-${index}`, 'apply_patch', row.path, row.status)
    }

    const writes = Array.isArray(chrome.writes) && chrome.writes.length
        ? chrome.writes
        : (chrome.writeFile ? [chrome.writeFile] : [])
    for (const [index, row] of writes.entries()) {
        if (! row?.path) continue
        push(`write-${index}`, 'write_file', row.path, row.status)
    }
    if (chrome.shell?.command) {
        push('shell', 'shell', '', chrome.shell.status)
    }
    if (chrome.fetch?.url) {
        push('fetch', 'fetch', '', chrome.fetch.status)
    }
    const lookups = Array.isArray(chrome.lookupVisualsList) && chrome.lookupVisualsList.length
        ? chrome.lookupVisualsList
        : (chrome.lookupVisuals ? [chrome.lookupVisuals] : [])
    for (const [index, row] of lookups.entries()) {
        push(`visuals-${index}`, 'lookup_visuals', '', row?.status)
    }
    const surveys = Array.isArray(chrome.datastoreSurveys) && chrome.datastoreSurveys.length
        ? chrome.datastoreSurveys
        : (chrome.datastoreSurvey ? [chrome.datastoreSurvey] : [])
    for (const [index, row] of surveys.entries()) {
        push(`datastore-survey-${index}`, 'survey_datastore', '', row?.status)
    }
    const revisions = Array.isArray(chrome.datastoreRevisions) && chrome.datastoreRevisions.length
        ? chrome.datastoreRevisions
        : (chrome.datastoreRevision ? [chrome.datastoreRevision] : [])
    for (const [index, row] of revisions.entries()) {
        push(`datastore-revise-${index}`, 'revise_datastore', '', row?.status)
    }

    if (! entries.length) return null

    return {
        status: 'done',
        label: summarizeToolActivity(entries),
        entries,
    }
}

export function summarizeToolActivity(entries = []) {
    const list = Array.isArray(entries) ? entries : []
    if (! list.length) return ''
    const writes = list.filter((row) => row.tool === 'write_file' || row.tool === 'apply_patch')
    if (writes.length === 1) return writes[0].label
    if (writes.length > 1) return `Updated ${writes.length} files`
    const last = list[list.length - 1]
    return last?.label || `${list.length} steps`
}

/** Append / refresh a quiet tool activity entry. */
export function bumpToolActivity(prev = null, {
    tool = '',
    path = null,
    status = 'active',
    id = null,
} = {}) {
    const entries = Array.isArray(prev?.entries) ? [...prev.entries] : []
    const entryId = id || `${tool}:${path || entries.length}`
    const label = formatToolActivityLabel(tool, path, { done: status === 'done' || status === 'error' })
    const existing = entries.findIndex((row) => row.id === entryId)
    const row = {
        id: entryId,
        tool,
        path: path || null,
        label,
        status,
    }
    if (existing >= 0) entries[existing] = row
    else entries.push(row)

    const live = status === 'active' || status === 'running'
        ? formatToolActivityLabel(tool, path, { done: false })
        : summarizeToolActivity(entries)

    return {
        status: live && (status === 'active' || status === 'running') ? 'running' : 'done',
        label: live,
        entries: entries.slice(-24),
    }
}
