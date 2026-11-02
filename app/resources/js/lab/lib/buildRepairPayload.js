/**
 * Auto-repair targeting + LLM payload builder.
 * Guarantees a non-null VFS target file whenever possible.
 */

import {
    cleanErrorFile,
    extractErrorOrigin,
    parseStackFrame,
    presentLabError,
    scrubErrorNoise,
} from './labErrors.js'

const SOURCE_PATH_IN_TEXT = /((?:src|app|pages|components|lib|hooks)\/[\w./+-]+\.(?:jsx?|tsx?|vue|svelte|css|html))/g
const AT_FILE_LINE = /(?:^|\s)(?:at\s+)?(?:[A-Za-z_$][\w$]*\s+\()?((?:src|app|pages|components|lib|hooks)\/[^)\s:]+):(\d+)/g

/**
 * Index PascalCase symbols in VFS source files → defining paths.
 * @param {Record<string, string>} contents
 * @returns {Map<string, string[]>}
 */
export function indexVfsSymbols(contents = {}) {
    const index = new Map()
    for (const [rawPath, body] of Object.entries(contents || {})) {
        const path = String(rawPath || '').replace(/^\/+/, '')
        if (! /\.(?:jsx?|tsx?)$/i.test(path)) continue
        if (path.includes('node_modules')) continue
        const text = String(body || '')
        const re = /(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|class)\s+([A-Z][A-Za-z0-9_]*)|(?:export\s+(?:default\s+)?)?(?:const|let)\s+([A-Z][A-Za-z0-9_]*)\s*=/g
        let match
        while ((match = re.exec(text))) {
            const name = match[1] || match[2]
            if (! name) continue
            const list = index.get(name) || []
            if (! list.includes(path)) list.push(path)
            index.set(name, list)
        }
        // Default export anonymous assigned later — also map filename stem.
        const stem = path.split('/').pop()?.replace(/\.(jsx?|tsx?)$/i, '')
        if (stem && /^[A-Z]/.test(stem)) {
            const list = index.get(stem) || []
            if (! list.includes(path)) list.push(path)
            index.set(stem, list)
        }
    }
    return index
}

function pickExistingPath(candidates = [], contents = {}) {
    for (const candidate of candidates) {
        const clean = cleanErrorFile(candidate) || String(candidate || '').replace(/^\/+/, '')
        if (clean && Object.prototype.hasOwnProperty.call(contents || {}, clean)) {
            return clean
        }
        // Basename fallback: stack said src/UserProfile.jsx but VFS has src/components/UserProfile.jsx
        const base = String(clean || '').split('/').pop()
        if (! base || ! /\.(?:jsx?|tsx?)$/i.test(base)) continue
        const keys = Object.keys(contents || {})
        const ranked = keys
            .filter((path) => path === base || path.endsWith(`/${base}`))
            .sort((a, b) => {
                const score = (path) => {
                    if (path.startsWith('src/components/')) return 0
                    if (path.startsWith('src/pages/')) return 1
                    if (path.startsWith('src/')) return 2
                    return 3
                }
                return score(a) - score(b) || a.length - b.length
            })
        if (ranked[0]) return ranked[0]
    }
    return null
}

function conventionalPathsFor(name = '') {
    const value = String(name || '').trim()
    if (! value) return []
    return [
        `src/components/${value}.jsx`,
        `src/components/${value}.tsx`,
        `src/pages/${value}.jsx`,
        `src/pages/${value}.tsx`,
        `src/${value}.jsx`,
        `src/${value}.tsx`,
    ]
}

function defaultWorkspaceEntry(contents = {}) {
    const keys = Object.keys(contents || {})
    const preferred = [
        'src/App.jsx',
        'src/App.tsx',
        'src/main.jsx',
        'src/main.tsx',
        'src/index.jsx',
        'src/index.tsx',
    ]
    for (const path of preferred) {
        if (keys.includes(path)) return path
    }
    const firstSrc = keys.find((path) => /^src\/.+\.(jsx?|tsx?)$/i.test(path))
    return firstSrc || keys.find((path) => /\.(jsx?|tsx?)$/i.test(path)) || 'src/App.jsx'
}

/**
 * Pull every VFS-looking path (+ optional line) from a stack / message blob.
 */
export function extractPathsFromStack(stack = '') {
    const text = String(stack || '')
    const hits = []
    const seen = new Set()

    let match
    const lineRe = new RegExp(AT_FILE_LINE.source, 'g')
    while ((match = lineRe.exec(text))) {
        const file = cleanErrorFile(match[1])
        if (! file || seen.has(`${file}:${match[2]}`)) continue
        seen.add(`${file}:${match[2]}`)
        hits.push({ file, line: Number(match[2]) || null })
    }

    const pathRe = new RegExp(SOURCE_PATH_IN_TEXT.source, 'g')
    while ((match = pathRe.exec(text))) {
        const file = cleanErrorFile(match[1])
        if (! file || seen.has(file)) continue
        seen.add(file)
        hits.push({ file, line: null })
    }

    // Frame-aware parse for "at Foo (src/Bar.jsx:12:3)"
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (! trimmed.startsWith('at ')) continue
        const frame = parseStackFrame(trimmed)
        if (frame?.file) {
            const key = `${frame.file}:${frame.line || ''}`
            if (! seen.has(key) && ! seen.has(frame.file)) {
                seen.add(key)
                hits.push({ file: frame.file, line: frame.line })
            }
        }
    }

    return hits
}

export function extractComponentNames(stack = '', message = '') {
    const names = []
    const blob = `${stack}\n${message}`
    for (const line of blob.split(/\r?\n/)) {
        const trimmed = line.trim()
        const at = trimmed.match(/^(?:at|in)\s+([A-Z][A-Za-z0-9_$]*)/)
        if (at) names.push(at[1])
        const framed = trimmed.match(/\bat\s+([A-Z][A-Za-z0-9_$]*)\s*\(/)
        if (framed) names.push(framed[1])
    }
    return [...new Set(names)]
}

/**
 * Resolve a concrete VFS target — never returns null file when VFS has sources.
 */
export function resolveRepairTarget({
    stack = '',
    message = '',
    component = null,
    file = null,
    line = null,
    vfsContents = {},
} = {}) {
    const contents = vfsContents || {}
    const symbols = indexVfsSymbols(contents)
    const pathHits = extractPathsFromStack(`${stack}\n${message}`)
    const components = [
        ...(component ? [component] : []),
        ...extractComponentNames(stack, message),
    ]

    // 1) Explicit / stack paths that exist in VFS
    const existingFromStack = pickExistingPath(
        pathHits.map((hit) => hit.file),
        contents,
    )
    if (existingFromStack) {
        const base = existingFromStack.split('/').pop()
        const hit = pathHits.find((row) => row.file === existingFromStack)
            || pathHits.find((row) => String(row.file || '').split('/').pop() === base)
            || pathHits[0]
        const resolvedComponent = components.find((name) => (symbols.get(name) || []).includes(existingFromStack))
            || components[0]
            || null
        return {
            file: existingFromStack,
            line: hit?.line ?? line ?? null,
            component: resolvedComponent,
            source: 'stack_path',
        }
    }

    // 2) Hint file if present in VFS
    const hintFile = pickExistingPath([file, cleanErrorFile(file)].filter(Boolean), contents)
    if (hintFile) {
        return {
            file: hintFile,
            line: line ?? null,
            component: components[0] || null,
            source: 'hint_file',
        }
    }

    // 3) Component → VFS symbol map (skip App/Landing wrappers when a leaf component is known)
    const leafComponents = components.filter((name) => ! /^(App|LandingPage|SignupPage|HomePage|Root)$/.test(name))
    const orderedComponents = [...leafComponents, ...components.filter((name) => ! leafComponents.includes(name))]

    for (const name of orderedComponents) {
        const paths = symbols.get(name) || []
        const existing = pickExistingPath(paths, contents)
        if (existing) {
            return {
                file: existing,
                line: line ?? null,
                component: name,
                source: 'vfs_symbol',
            }
        }
        const found = pickExistingPath(conventionalPathsFor(name), contents)
        if (found) {
            return {
                file: found,
                line: line ?? null,
                component: name,
                source: 'conventional_path',
            }
        }
    }

    // 4) Esbuild-style origin on message
    const origin = extractErrorOrigin(message)
    const originFile = pickExistingPath([origin.file].filter(Boolean), contents)
    if (originFile) {
        return {
            file: originFile,
            line: origin.line ?? line ?? null,
            component: orderedComponents[0] || components[0] || null,
            source: 'message_origin',
        }
    }

    // 5) Known leaf component → conventional hint (never silently pin App.jsx)
    const leaf = orderedComponents[0]
    if (leaf && leaf !== 'App') {
        return {
            file: conventionalPathsFor(leaf)[0],
            line: line ?? null,
            component: leaf,
            source: 'conventional_hint',
        }
    }

    // 6) Hard fallback — never null when workspace has sources
    const fallback = defaultWorkspaceEntry(contents)
    return {
        file: fallback,
        line: line ?? null,
        component: components[0] || null,
        source: 'workspace_fallback',
    }
}

/**
 * Normalize one console/build error into a repair entry with forced target.
 */
export function normalizeRepairError(entry = {}, vfsContents = {}) {
    const rawMessage = scrubErrorNoise(String(entry.message || entry.text || 'Unknown error').split('\n')[0])
    const stack = String(entry.stack || entry.message || '')
    const target = resolveRepairTarget({
        stack,
        message: rawMessage,
        component: entry.component || null,
        file: entry.file || null,
        line: entry.line != null ? Number(entry.line) : null,
        vfsContents,
    })
    const presented = presentLabError({
        message: rawMessage,
        stack,
        file: target.file,
        line: target.line,
        component: target.component,
    })

    return {
        message: presented.title || rawMessage || 'Unknown error',
        stack: presented.detail || stack || rawMessage,
        file: target.file,
        line: target.line,
        component: target.component,
        source: target.source,
    }
}

/**
 * Build AUTO_REPAIR metadata + LLM prompt from the error store snapshot.
 * Unmasks every console error; forces non-null targets.
 */
export function buildRepairPayload({
    buildError = null,
    consoleErrors = [],
    vfsContents = {},
} = {}) {
    if (buildError) {
        const entry = normalizeRepairError({
            message: buildError.message,
            stack: buildError.stack || buildError.message,
            file: buildError.file,
            line: buildError.line,
        }, vfsContents)

        const errors = [entry]
        const meta = {
            type: 'AUTO_REPAIR',
            errorType: 'BUILD_ERROR',
            message: entry.message,
            stack: entry.stack,
            file: entry.file,
            component: entry.component,
            line: entry.line,
            errors,
            targets: [...new Set(errors.map((row) => row.file).filter(Boolean))],
            subtitle: 'Fixing build failure…',
        }
        return {
            meta,
            prompt: formatRepairPrompt(meta),
        }
    }

    const list = Array.isArray(consoleErrors) ? consoleErrors : []
    if (! list.length) return null

    const errors = list.map((row) => normalizeRepairError(row, vfsContents))
    const primary = errors[0]
    const meta = {
        type: 'AUTO_REPAIR',
        errorType: 'RUNTIME_ERROR',
        message: primary.message,
        stack: primary.stack,
        file: primary.file,
        component: primary.component,
        line: primary.line,
        errors,
        targets: [...new Set(errors.map((row) => row.file).filter(Boolean))],
        subtitle: errors.length > 1
            ? `Fixing ${errors.length} runtime errors…`
            : 'Fixing runtime rendering crash…',
    }

    return {
        meta,
        prompt: formatRepairPrompt(meta),
    }
}

/** Hidden LLM user payload — all errors listed, surgical constraints. */
export function formatRepairPrompt(meta) {
    if (! meta) return ''
    const errorType = meta.errorType === 'BUILD_ERROR' ? 'BUILD_ERROR' : 'RUNTIME_ERROR'
    const phaseNote = errorType === 'BUILD_ERROR'
        ? 'The in-browser bundler failed while compiling the VFS snapshot (syntax/import/build error).'
        : 'The project compiled successfully. This error occurred later at RUNTIME during React render/execution inside the preview — it is NOT a bundler/compile failure.'

    const errors = Array.isArray(meta.errors) && meta.errors.length
        ? meta.errors
        : [{
            message: meta.message,
            file: meta.file,
            line: meta.line,
            component: meta.component,
            stack: meta.stack,
        }]

    const targets = Array.isArray(meta.targets) && meta.targets.length
        ? meta.targets
        : [...new Set(errors.map((row) => row.file).filter(Boolean))]

    const lines = [
        '[SYSTEM AUTO-REPAIR REQUEST]',
        `Type: ${errorType}`,
        phaseNote,
        `Target File(s): ${targets.join(', ') || 'src/App.jsx'}`,
        '',
        '[ACTIVE RUNTIME ERRORS]',
    ]

    errors.forEach((row, index) => {
        const loc = row.file
            ? (row.line != null ? `${row.file}:${row.line}` : row.file)
            : 'unknown'
        const component = row.component ? ` (${row.component})` : ''
        lines.push(`- Error ${index + 1}: ${row.message} at ${loc}${component}`)
    })

    if (errors[0]?.stack) {
        lines.push('', '[PRIMARY STACK]', String(errors[0].stack))
    }

    lines.push(
        '',
        '[CONSTRAINTS]',
        '- Surgical fix only: change the minimum lines needed for the listed errors.',
        '- Use write_file with the complete updated file body (atomic overwrite). There is no apply_patch tool.',
        '- Do NOT delete unrelated imports, routes, or pages (e.g. HomePage, SignupPage) unless required to fix a listed error.',
        '- Do NOT rewrite whole files for a one-line null/undefined crash.',
        '- Only edit Target File(s) unless another file is strictly required by a listed error.',
        '- Fix the broken file(s) in VFS immediately using write_file.',
    )

    return lines.join('\n')
}
