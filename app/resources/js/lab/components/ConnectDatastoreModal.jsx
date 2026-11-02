import { useEffect, useId, useRef, useState } from 'react'
import { failDeskPulse } from '../lib/deskPulse'
import {
    DATASTORE_CANCELLED,
    DATASTORE_OAUTH_CHANNEL,
    DATASTORE_OAUTH_STORAGE,
    DATASTORE_READY,
    attachLabDatastoreProject,
    isDatastoreOauthMessage,
    isDatastoreOauthPayload,
    listLabDatastoreProjects,
    readDatastoreOauthStorage,
    readLabDatastoreStatus,
    redirectToSupabaseOauth,
} from '../lib/datastore'
import { LAB_BTN_OUTLINE, LAB_BTN_PRIMARY } from '../lib/labConstants'
import { IconClose } from './Icons'

function IconSupabaseMark({ className = 'h-8 w-8' }) {
    return (
        <svg className={className} viewBox="0 0 109 113" fill="none" aria-hidden="true">
            <path
                d="M63.708 110.284c-2.86 3.602-8.657 1.628-8.727-2.97l-1.007-66.314h47.965c8.63 0 13.468 10.008 8.107 16.765L63.708 110.284Z"
                fill="#3ECF8E"
            />
            <path
                d="M45.293 2.071c2.86-3.602 8.657-1.628 8.727 2.97l1.007 66.314H7.06c-8.63 0-13.467-10.008-8.107-16.765L45.293 2.07Z"
                fill="#3ECF8E"
                fillOpacity="0.55"
            />
        </svg>
    )
}

function UnlinkedScreen({
    oauthReady = false,
    waitMode = false,
    loading = false,
    checking = false,
    onConnect,
}) {
    const title = checking
        ? 'Checking connection…'
        : (! oauthReady
            ? 'Supabase isn’t set up yet'
            : (waitMode ? 'Chat is waiting on Supabase' : 'Connect your database'))
    const copy = checking
        ? 'Lab is reading the workspace OAuth app.'
        : (! oauthReady
            ? 'An admin adds the OAuth app under Dashboard → API Integration → Supabase. After that, you can connect an organization from here.'
            : 'Continue to Supabase to authorize Lab. You will come back here to pick a project — chat can survey tables and apply SQL. Keys stay on the server.')

    return (
        <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-krikkit-line bg-krikkit-surface">
                <IconSupabaseMark className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-base font-semibold tracking-tight text-krikkit-fg">
                {title}
            </h3>
            <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-krikkit-muted">
                {copy}
            </p>
            {oauthReady && ! checking ? (
                <button
                    type="button"
                    disabled={loading}
                    onClick={onConnect}
                    className={`mt-6 inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                >
                    {loading ? 'Opening Supabase…' : 'Continue to Supabase'}
                </button>
            ) : null}
        </div>
    )
}

function statusCopy(status, waitMode) {
    if (! status) {
        return waitMode
            ? 'Finish Supabase authorization to continue this chat.'
            : 'Connect your Supabase organization, then pick a project.'
    }
    if (! status.oauth_ready) {
        return 'An admin needs to add the Supabase OAuth app under Dashboard → API Integration → Supabase.'
    }
    if (status.ready) {
        const name = status.project_name || status.project_ref
        return name
            ? `${name} is attached. Chat tools can survey and revise this project.`
            : 'A project is attached. Chat tools can survey and revise it.'
    }
    if (status.linked) {
        return waitMode
            ? 'Pick a project so the chat can continue.'
            : 'Choose a project to attach to Lab.'
    }
    return waitMode
        ? 'Finish Supabase authorization to continue this chat.'
        : 'Connect your Supabase organization, then pick a project.'
}

function labReturnPath() {
    return window.location.pathname.startsWith('/lab')
        ? window.location.pathname
        : '/lab'
}

/**
 * Connect a personal Supabase org from the Lab composer, then attach a project.
 * Chat-initiated waits use waitMode: popup OAuth, then resume the turn.
 */
export function ConnectDatastoreModal({
    open = false,
    waitMode = false,
    initialError = '',
    onClose,
}) {
    const titleId = useId()
    const popupStarted = useRef(false)
    const autoAttached = useRef(false)
    const refreshRef = useRef(null)
    const seenLinked = useRef(false)
    const [status, setStatus] = useState(null)
    const [projects, setProjects] = useState([])
    const [projectRef, setProjectRef] = useState('')
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(initialError)

    const announceReady = (next) => {
        window.dispatchEvent(new CustomEvent(DATASTORE_READY, { detail: next }))
        onClose?.()
    }

    const refresh = async ({ afterOauth = false } = {}) => {
        const next = await readLabDatastoreStatus()
        if (next.linked) {
            seenLinked.current = true
        } else if (seenLinked.current) {
            return next
        }
        setStatus(next)
        setProjectRef(next.project_ref || '')
        if (next.ready && waitMode) {
            announceReady(next)
            return next
        }
        if (! next.linked) {
            setProjects([])
            return next
        }
        const listed = await listLabDatastoreProjects()
        const rows = Array.isArray(listed.projects) ? listed.projects : []
        setProjects(rows)
        if (! next.project_ref && rows[0]?.ref) {
            setProjectRef(rows[0].ref)
        }
        if (
            waitMode
            && ! next.ready
            && rows.length === 1
            && rows[0]?.ref
            && ! autoAttached.current
        ) {
            autoAttached.current = true
            const attached = await attachLabDatastoreProject(rows[0].ref)
            setStatus(attached)
            if (attached.ready) announceReady(attached)
        } else if (afterOauth && waitMode && ! next.ready && rows.length === 0) {
            setError('No Supabase projects were found on this account.')
        }
        return next
    }

    refreshRef.current = refresh

    const applyOauthSignal = (payload) => {
        if (! isDatastoreOauthPayload(payload)) return
        try {
            window.localStorage.removeItem(DATASTORE_OAUTH_STORAGE)
        } catch {
            // ignore quota / private mode
        }
        if (! payload.ok) {
            setLoading(false)
            setError(payload.message || 'Authorization failed.')
            return
        }
        setLoading(true)
        refreshRef.current?.({ afterOauth: true })
            ?.catch((err) => {
                setError(err?.payload?.message || err?.message || 'Could not read datastore status.')
            })
            ?.finally(() => setLoading(false))
    }

    useEffect(() => {
        if (! open) {
            popupStarted.current = false
            autoAttached.current = false
            seenLinked.current = false
            return undefined
        }
        let cancelled = false
        if (initialError) failDeskPulse(initialError)
        setError('')
        setProjects([])
        setProjectRef('')
        setQuery('')
        setLoading(true)
        refresh()
            .catch((err) => {
                if (! cancelled) failDeskPulse(err?.payload?.message || err?.message || 'Could not read datastore status.')
            })
            .finally(() => {
                if (! cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, waitMode])

    useEffect(() => {
        if (! open) return undefined

        const onMessage = (event) => {
            if (isDatastoreOauthMessage(event)) applyOauthSignal(event.data)
        }
        const onStorage = (event) => {
            if (event.key && event.key !== DATASTORE_OAUTH_STORAGE) return
            applyOauthSignal(readDatastoreOauthStorage())
        }
        const onFocus = () => {
            refreshRef.current?.({ afterOauth: true })?.catch(() => {})
        }
        const onVisibility = () => {
            if (document.visibilityState === 'visible') onFocus()
        }

        window.addEventListener('message', onMessage)
        window.addEventListener('storage', onStorage)
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onVisibility)

        let channel = null
        try {
            channel = new BroadcastChannel(DATASTORE_OAUTH_CHANNEL)
            channel.onmessage = (event) => applyOauthSignal(event.data)
        } catch {
            channel = null
        }

        applyOauthSignal(readDatastoreOauthStorage())

        return () => {
            window.removeEventListener('message', onMessage)
            window.removeEventListener('storage', onStorage)
            window.removeEventListener('focus', onFocus)
            document.removeEventListener('visibilitychange', onVisibility)
            channel?.close()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, waitMode])

    useEffect(() => {
        if (! open || ! waitMode || loading || ! status?.oauth_ready || status.linked || popupStarted.current) {
            return
        }
        popupStarted.current = true
        redirectToSupabaseOauth(labReturnPath())
    }, [open, waitMode, loading, status])

    const connect = () => {
        setError('')
        setLoading(true)
        redirectToSupabaseOauth(labReturnPath())
    }

    const attach = async () => {
        if (! projectRef) return
        setSaving(true)
        setError('')
        try {
            const next = await attachLabDatastoreProject(projectRef)
            setStatus(next)
            if (next.ready && waitMode) {
                announceReady(next)
            } else if (next.ready) {
                window.dispatchEvent(new CustomEvent('lab-tables-open'))
                onClose?.()
            }
        } catch (err) {
            setError(err?.payload?.message || err?.message || 'Could not attach that project.')
        } finally {
            setSaving(false)
        }
    }

    const dismiss = () => {
        if (waitMode && ! status?.ready) {
            window.dispatchEvent(new CustomEvent(DATASTORE_CANCELLED))
        }
        onClose?.()
    }

    const visibleProjects = projects.filter((row) => {
        const hay = `${row.name || ''} ${row.region || ''} ${row.ref || ''}`.toLowerCase()
        return hay.includes(query.trim().toLowerCase())
    })

    if (! open) return null

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Dismiss"
                onClick={dismiss}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex max-h-[min(36rem,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-krikkit-line bg-krikkit-canvas"
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-krikkit-line px-5 py-4">
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-base font-semibold text-krikkit-fg">
                            Supabase
                        </h2>
                        {status?.linked ? (
                            <p className="mt-0.5 text-xs text-krikkit-muted">
                                {loading ? 'Checking connection…' : statusCopy(status, waitMode)}
                            </p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                        aria-label="Close"
                    >
                        <IconClose className="h-4 w-4" />
                    </button>
                </div>

                {status?.linked ? (
                    <>
                        <div className="flex min-h-0 flex-1 flex-col">
                            {error ? (
                                <p className="mx-5 mt-4 shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                                    {error}
                                </p>
                            ) : null}

                            {status.login ? (
                                <p className="shrink-0 px-5 pt-4 text-sm font-medium text-krikkit-fg">
                                    {status.login}
                                    {status.host ? (
                                        <span className="mt-0.5 block text-xs font-normal text-krikkit-muted">{status.host}</span>
                                    ) : null}
                                </p>
                            ) : null}

                            {projects.length > 4 ? (
                                <div className="shrink-0 px-5 pt-3">
                                    <input
                                        type="search"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search projects"
                                        disabled={loading || saving}
                                        className="h-10 w-full rounded-full border border-krikkit-line bg-transparent px-4 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                                        autoComplete="off"
                                    />
                                </div>
                            ) : null}

                            <div className="krikkit-scroll-hover min-h-[14rem] flex-1 overflow-y-auto px-3 py-3">
                                {loading && projects.length === 0 ? (
                                    <p className="px-2 py-8 text-center text-sm text-krikkit-muted">Loading projects…</p>
                                ) : visibleProjects.length === 0 ? (
                                    <p className="px-2 py-8 text-center text-sm text-krikkit-muted">
                                        {projects.length === 0
                                            ? 'No projects came back for this organization. In the Supabase OAuth app, enable Projects read, then disconnect and connect again.'
                                            : 'No matching projects.'}
                                    </p>
                                ) : (
                                    <ul className="space-y-0.5">
                                        {visibleProjects.map((row) => {
                                            const active = projectRef === row.ref
                                            const attached = status.project_ref === row.ref
                                            return (
                                                <li key={row.ref}>
                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        aria-pressed={active}
                                                        onClick={() => setProjectRef(row.ref)}
                                                        className={[
                                                            'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition',
                                                            active ? 'bg-krikkit-soft' : 'hover:bg-krikkit-soft/70',
                                                            'disabled:opacity-40',
                                                        ].join(' ')}
                                                    >
                                                        <IconSupabaseMark className="h-4 w-4 shrink-0" />
                                                        <span className="min-w-0 flex-1">
                                                            <span className={`block truncate text-sm ${active ? 'font-medium text-krikkit-fg' : 'font-normal text-krikkit-fg'}`}>
                                                                {row.name || row.ref}
                                                            </span>
                                                            <span className="mt-0.5 block truncate text-[11px] text-krikkit-muted">
                                                                {[row.region, attached ? 'Attached' : null].filter(Boolean).join(' · ')}
                                                            </span>
                                                        </span>
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-krikkit-line px-5 py-3">
                            <button
                                type="button"
                                disabled={saving || loading || projectRef === '' || projectRef === status.project_ref}
                                onClick={attach}
                                className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                            >
                                {saving ? 'Attaching…' : (status.ready ? 'Switch project' : 'Attach project')}
                            </button>
                        </div>
                    </>
                ) : (
                    <div>
                        {error ? (
                            <p className="mx-5 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        ) : null}
                        <UnlinkedScreen
                            oauthReady={Boolean(status?.oauth_ready)}
                            waitMode={waitMode}
                            loading={loading}
                            checking={! status && loading}
                            onConnect={connect}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
