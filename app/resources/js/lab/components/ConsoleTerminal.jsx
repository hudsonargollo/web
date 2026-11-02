import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
    attachLabTerminal,
    ensureLabSession,
    syncLabVfsToGuest,
    vfsContentsToFiles,
} from '../lib/labRuntime'
import { labConsoleLine, labConsolePrompt } from '../lib/labConsole'

function readCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
}

function buildTheme() {
    const canvas = readCssVar('--color-krikkit-canvas', '#0a0a0a')
    const fg = readCssVar('--color-krikkit-fg', '#fafafa')
    const muted = readCssVar('--color-krikkit-muted', '#a1a1aa')
    const soft = readCssVar('--color-krikkit-soft', '#18181b')
    const accent = readCssVar('--color-accent', '#14b8a6')

    return {
        background: canvas,
        foreground: fg,
        cursor: accent,
        cursorAccent: canvas,
        selectionBackground: soft,
        selectionForeground: fg,
        black: '#09090b',
        red: '#f87171',
        green: '#34d399',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: accent,
        white: fg,
        brightBlack: muted,
        brightRed: '#fca5a5',
        brightGreen: '#6ee7b7',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: accent,
        brightWhite: '#ffffff',
    }
}

function refitTerminal(terminal, fitAddon) {
    try {
        fitAddon?.fit?.()
        terminal?.fit?.()
    } catch {
        /* ignore */
    }
}

function readVfsContents(snap) {
    if (!snap) return {}
    if (typeof snap.getContents === 'function') return snap.getContents() || {}
    return snap.contents || {}
}

/** Survive Strict Mode remounts — one live xterm per console tab. */
/** @type {Map<string, { terminal: any, projectUuid: string|null }>} */
const terminalsBySession = new Map()

function disposeSession(sessionId) {
    const entry = terminalsBySession.get(sessionId)
    if (! entry) return
    try {
        entry.terminal?.dispose?.()
    } catch {
        /* ignore */
    }
    terminalsBySession.delete(sessionId)
}

export function disposeConsoleSession(sessionId) {
    if (sessionId) disposeSession(sessionId)
}

export function clearSharedConsoleTerminal() {
    for (const id of [...terminalsBySession.keys()]) {
        disposeSession(id)
    }
}

/**
 * Lab console — DeepThoughtEngine.createTerminal (xterm) over the project VFS.
 */
export function ConsoleTerminal({
    sessionId = 'console-primary',
    active = true,
    bootInBackground = false,
    autostart = true,
    syncVfs = true,
    vfs = null,
    sessionLog = [],
    focusNonce = 0,
    projectUuid = null,
    isAiStreaming = false,
}) {
    const hostRef = useRef(null)
    const termApiRef = useRef(null)
    const xtermRef = useRef(null)
    const fitRef = useRef(null)
    const vfsRef = useRef(vfs)
    const appliedLogCountRef = useRef(0)
    const [allowBoot, setAllowBoot] = useState(() => Boolean(active || bootInBackground))
    const [status, setStatus] = useState('loading')
    const [error, setError] = useState(null)

    vfsRef.current = vfs

    useEffect(() => {
        if (active || bootInBackground) setAllowBoot(true)
    }, [active, bootInBackground])

    // Attach once Console has been visible — xterm in `display:none` boots at 0×0.
    useEffect(() => {
        if (!allowBoot) return undefined

        const host = hostRef.current
        if (!host) return undefined

        let disposed = false
        /** @type {ResizeObserver|null} */
        let resizeObserver = null

        const kickAutostart = (terminal) => {
            void import('../lib/labAutostart').then((m) => {
                m.setDeepThoughtAutostartTerminal?.(terminal)
                void m.runLabAutostart({
                    projectKey: projectUuid || 'lab',
                    getFiles: () => readVfsContents(vfsRef.current),
                    terminal,
                    // Do not pass a remount AbortSignal — only project teardown resets.
                }).then((result) => {
                    if (disposed) return
                    const idle = !result?.ok
                        || result?.reason === 'no-package-json'
                        || result?.reason === 'no-script'
                        || result?.reason === 'skip'
                    if (idle) {
                        try {
                            terminal.showPrompt?.()
                        } catch {
                            /* ignore */
                        }
                    }
                    if (active) {
                        try {
                            terminal.xterm?.focus?.()
                            terminal.focus?.()
                        } catch {
                            /* ignore */
                        }
                    }
                })
            })
        }

        const boot = async () => {
            try {
                setStatus('loading')
                setError(null)

                const contents = readVfsContents(vfsRef.current)
                const cached = terminalsBySession.get(sessionId)

                // Re-attach existing terminal after Strict Mode / tab remount.
                if (
                    cached
                    && cached.projectUuid === projectUuid
                    && (cached.terminal?.xterm?.element || typeof cached.terminal?.attach === 'function')
                ) {
                    // Re-home the live xterm node. detach() disposes the instance and
                    // drops the buffer (Vite ready banner included) on remount.
                    host.replaceChildren()
                    const xtermEl = cached.terminal.xterm?.element
                    if (xtermEl) {
                        host.appendChild(xtermEl)
                    } else {
                        cached.terminal.attach(host)
                    }
                    termApiRef.current = cached.terminal
                    xtermRef.current = cached.terminal?.xterm || null
                    fitRef.current = cached.terminal?.fitAddon || null
                    try {
                        xtermRef.current?.options && (xtermRef.current.options.theme = buildTheme())
                    } catch {
                        /* ignore */
                    }
                    refitTerminal(cached.terminal, fitRef.current)
                    resizeObserver = new ResizeObserver(() => {
                        refitTerminal(cached.terminal, fitRef.current)
                    })
                    resizeObserver.observe(host)
                    if (!disposed) setStatus('ready')
                    if (autostart) kickAutostart(cached.terminal)
                    return
                }

                if (cached && cached.projectUuid !== projectUuid) {
                    disposeSession(sessionId)
                }

                await ensureLabSession({
                    files: vfsContentsToFiles(contents),
                })
                if (disposed) return

                // Wait a frame so the host has non-zero layout after un-hiding.
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
                if (disposed) return

                const { terminal } = await attachLabTerminal(host, {
                    Terminal,
                    FitAddon,
                }, {
                    theme: buildTheme(),
                    // Tips first, then show the prompt ourselves.
                    autoPrompt: false,
                })
                if (disposed) {
                    // Keep instance for remount; don't dispose here.
                    terminalsBySession.set(sessionId, { terminal, projectUuid })
                    return
                }

                terminalsBySession.set(sessionId, { terminal, projectUuid })
                termApiRef.current = terminal
                xtermRef.current = terminal?.xterm || null
                fitRef.current = terminal?.fitAddon || null

                try {
                    xtermRef.current?.options && (xtermRef.current.options.theme = buildTheme())
                } catch {
                    /* ignore */
                }

                refitTerminal(terminal, fitRef.current)

                resizeObserver = new ResizeObserver(() => {
                    refitTerminal(terminal, fitRef.current)
                })
                resizeObserver.observe(host)

                refitTerminal(terminal, fitRef.current)

                if (!disposed) setStatus('ready')
                if (autostart) kickAutostart(terminal)
            } catch (err) {
                console.warn('[lab] createTerminal path failed, falling back to local xterm', err)
                if (disposed) return

                try {
                    host.replaceChildren()
                    const term = new Terminal({
                        cursorBlink: true,
                        fontSize: 13,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        theme: buildTheme(),
                        convertEol: true,
                    })
                    const fitAddon = new FitAddon()
                    term.loadAddon(fitAddon)
                    term.open(host)
                    fitAddon.fit()
                    term.writeln(`\x1b[33m${labConsoleLine('shell_unavailable')}\x1b[0m`)
                    term.writeln(`\x1b[90m${err?.message || err}\x1b[0m`)
                    term.writeln('Retry after hard refresh; ensure /__krikkit_lab_sw__.js is served.')
                    term.write(labConsolePrompt())
                    xtermRef.current = term
                    fitRef.current = fitAddon
                    termApiRef.current = {
                        write: (s) => term.write(s),
                        writeln: (s) => term.writeln(s),
                        xterm: term,
                        fitAddon,
                        showPrompt: () => term.write(labConsolePrompt()),
                        focus: () => term.focus(),
                    }
                    resizeObserver = new ResizeObserver(() => {
                        try {
                            fitAddon.fit()
                        } catch {
                            /* ignore */
                        }
                    })
                    resizeObserver.observe(host)
                    setStatus('ready')
                    setError(err?.message || String(err))
                } catch (err2) {
                    setStatus('error')
                    setError(err2?.message || err?.message || 'Failed to start terminal')
                }
            }
        }

        void boot()

        return () => {
            disposed = true
            resizeObserver?.disconnect()
            // Keep this session's terminal alive across Strict Mode / panel toggles.
            // Closed tabs are disposed from WorkspaceStage; project teardown clears all.
            termApiRef.current = null
            xtermRef.current = null
            fitRef.current = null
        }
    }, [allowBoot, projectUuid, sessionId, autostart])

    // Keep pod FS in sync when editor buffers change — only when host content shifts.
    // Pause while the AI is writing so Vite does not restart on every file.
    useEffect(() => {
        if (! syncVfs) return undefined
        if (status !== 'ready') return undefined
        if (isAiStreaming) return undefined
        const snap = vfs
        if (!snap) return undefined

        let lastFp = ''
        const fingerprint = (contents) => {
            const keys = Object.keys(contents || {}).sort()
            let h = keys.length
            for (const key of keys) {
                const v = contents[key] ?? ''
                h = ((h * 33) ^ key.length ^ v.length) >>> 0
                if (v.length) {
                    h = (h ^ v.charCodeAt(0) ^ v.charCodeAt(v.length - 1)) >>> 0
                }
            }
            // Include a cheap sample so same-length edits still invalidate.
            for (const key of keys) {
                const v = contents[key] ?? ''
                if (v.length > 64) {
                    h = (h ^ v.charCodeAt((v.length / 2) | 0) ^ v.charCodeAt(v.length - 17)) >>> 0
                }
            }
            return `${keys.length}:${h}`
        }

        const push = () => {
            const contents = readVfsContents(snap)
            const fp = fingerprint(contents)
            if (fp === lastFp) return
            lastFp = fp
            void syncLabVfsToGuest(contents)
        }

        push()
        const id = setInterval(push, 2500)
        return () => clearInterval(id)
    }, [vfs, status, syncVfs, isAiStreaming])

    // Replay Shell-tool / VFS-heal sessions into xterm when we have a raw term.
    useEffect(() => {
        if (status !== 'ready') return
        const term = xtermRef.current
        const api = termApiRef.current
        if (!term?.writeln && !api?.writeln) return

        const pending = sessionLog.slice(appliedLogCountRef.current)
        if (!pending.length) return

        const writeLine = (row) => {
            if (api?.writeln) api.writeln(row)
            else term.writeln(row)
        }

        for (const entry of pending) {
            const command = String(entry?.command || '').trim()
            const lines = Array.isArray(entry?.lines) ? entry.lines : []
            if (command) writeLine(`\x1b[36m$ ${command}\x1b[0m`)
            for (const row of lines) {
                writeLine(String(row))
            }
        }
        appliedLogCountRef.current = sessionLog.length
        try {
            refitTerminal(api, fitRef.current)
            api?.showPrompt?.()
            if (active) {
                term.focus?.()
                api?.xterm?.focus?.()
            }
        } catch {
            /* ignore */
        }
    }, [sessionLog, status, focusNonce, active])

    useEffect(() => {
        if (!active || status !== 'ready') return
        const id = requestAnimationFrame(() => {
            refitTerminal(termApiRef.current || terminalsBySession.get(sessionId)?.terminal, fitRef.current)
            try {
                xtermRef.current?.focus?.()
                termApiRef.current?.xterm?.focus?.()
                termApiRef.current?.focus?.()
            } catch {
                /* ignore */
            }
        })
        return () => cancelAnimationFrame(id)
    }, [active, status, focusNonce])

    return (
        <div className="flex h-full min-h-0 flex-col bg-krikkit-canvas">
            <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-krikkit-line bg-krikkit-canvas px-3">
                <p className="min-w-0 truncate text-xs font-medium text-krikkit-fg">Console</p>
                <span className="shrink-0 text-[11px] tabular-nums text-krikkit-subtle">
                    {status === 'ready' && !error
                        ? (autostart ? 'connected' : 'shell')
                        : status === 'error'
                            ? 'error'
                            : error
                                ? 'degraded'
                                : 'loading…'}
                </span>
            </div>

            {status === 'error' ? (
                <div className="flex flex-1 items-center justify-center px-6 text-center">
                    <p className="max-w-sm text-sm text-krikkit-muted">
                        Couldn’t start the terminal.
                        {error ? ` ${error}` : ''}
                    </p>
                </div>
            ) : (
                <div
                    ref={hostRef}
                    className="min-h-0 flex-1 px-3 py-2"
                />
            )}
        </div>
    )
}
