import { useEffect, useMemo, useState } from 'react'
import { LAB_BTN_OUTLINE, LAB_BTN_PRIMARY } from '../lib/labConstants'
import {
    addLabDatastoreUser,
    readLabDatastoreAuth,
    readLabDatastoreRows,
    readLabDatastoreStatus,
    readLabDatastoreUsers,
    restartLabDatastore,
    saveLabDatastoreAuth,
    surveyLabDatastore,
    unlinkLabDatastore,
    readLabDatastoreCatalog,
} from '../lib/datastore'

const SECTIONS = [
    { id: 'tables', label: 'Tables' },
    { id: 'security', label: 'Security' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'users', label: 'User Management' },
    { id: 'functions', label: 'Server Functions' },
    { id: 'storage', label: 'File Storage' },
    { id: 'secrets', label: 'Secrets' },
    { id: 'logs', label: 'Logs' },
    { id: 'advanced', label: 'Advanced' },
]

const CATALOG_TOPICS = ['security', 'functions', 'storage', 'secrets', 'logs', 'advanced']

const CATALOG_INTRO = {
    security: ['Security', 'Row-level policies on this project.'],
    functions: ['Server Functions', 'Edge functions on this project.'],
    storage: ['File Storage', 'Buckets on this project.'],
    secrets: ['Secrets', 'Names only. Values stay on the server.'],
    logs: ['Logs', 'Recent events from this project.'],
    advanced: ['Advanced', 'Project status and region for this database.'],
}

function cellValue(value) {
    if (value == null) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    try {
        return JSON.stringify(value)
    } catch {
        return String(value)
    }
}

function LabSwitch({ checked, onChange, label, disabled = false }) {
    return (
        <button
            type="button"
            role="switch"
            disabled={disabled}
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange?.(! checked)}
            className={[
                'relative h-6 w-10 shrink-0 rounded-full transition disabled:opacity-40',
                checked ? 'bg-accent' : 'bg-krikkit-soft',
            ].join(' ')}
        >
            <span
                className={[
                    'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-krikkit-canvas transition',
                    checked ? 'translate-x-4' : '',
                ].join(' ')}
            />
        </button>
    )
}

function ConfirmSheet({ open, title, copy, dangerLabel, onCancel, onConfirm, busy = false }) {
    if (! open) return null
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Dismiss" onClick={onCancel} />
            <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl border border-krikkit-line bg-krikkit-canvas p-5">
                <h3 className="text-base font-semibold text-krikkit-fg">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-krikkit-muted">{copy}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_OUTLINE}`}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onConfirm}
                        className="inline-flex h-10 items-center rounded-full bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-40"
                    >
                        {busy ? 'Working…' : dangerLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

function CatalogTable({ rows = [] }) {
    if (rows.length === 0) {
        return <p className="mt-8 text-sm text-krikkit-muted">Nothing here yet.</p>
    }
    const columns = Object.keys(rows[0] || {})
    return (
        <div className="mt-8 overflow-x-auto rounded-xl border border-krikkit-line">
            <table className="min-w-full text-left text-xs">
                <thead className="border-b border-krikkit-line bg-krikkit-soft/40">
                    <tr>
                        {columns.map((col) => (
                            <th key={col} className="whitespace-nowrap px-3 py-2 font-medium text-krikkit-fg">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={index} className="border-b border-krikkit-line last:border-b-0">
                            {columns.map((col) => (
                                <td key={col} className="max-w-[18rem] truncate px-3 py-2 text-krikkit-muted" title={cellValue(row[col])}>
                                    {cellValue(row[col])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function SignupChart({ series = [] }) {
    const max = Math.max(1, ...series.map((row) => Number(row.count) || 0))
    return (
        <div className="mt-6">
            <div className="flex h-36 items-end gap-px">
                {series.map((row) => (
                    <div
                        key={row.day}
                        title={`${row.label}: ${row.count}`}
                        className="min-w-0 flex-1 rounded-t-sm bg-krikkit-muted/70"
                        style={{ height: `${Math.max(4, (Number(row.count) / max) * 100)}%` }}
                    />
                ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-krikkit-subtle">
                <span>{series[0]?.label || ''}</span>
                <span>{series[series.length - 1]?.label || ''}</span>
            </div>
        </div>
    )
}

/**
 * Workspace desk for the attached Supabase project.
 */
export function DatastoreDesk({ onConnect = null, onChangeProject = null }) {
    const [section, setSection] = useState('tables')
    const [status, setStatus] = useState(null)
    const [survey, setSurvey] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeTable, setActiveTable] = useState(null)
    const [rows, setRows] = useState([])
    const [rowsLoading, setRowsLoading] = useState(false)
    const [rowsError, setRowsError] = useState('')
    const [auth, setAuth] = useState(null)
    const [authBusy, setAuthBusy] = useState(false)
    const [users, setUsers] = useState([])
    const [series, setSeries] = useState([])
    const [userQuery, setUserQuery] = useState('')
    const [addOpen, setAddOpen] = useState(false)
    const [addMode, setAddMode] = useState('invite')
    const [addEmail, setAddEmail] = useState('')
    const [addPassword, setAddPassword] = useState('')
    const [addBusy, setAddBusy] = useState(false)
    const [confirm, setConfirm] = useState(null)
    const [confirmBusy, setConfirmBusy] = useState(false)
    const [catalogRows, setCatalogRows] = useState([])
    const [catalogLoading, setCatalogLoading] = useState(false)
    const [catalogError, setCatalogError] = useState('')

    const ready = Boolean(status?.ready)

    useEffect(() => {
        let cancelled = false
        readLabDatastoreStatus()
            .then((row) => {
                if (cancelled) return null
                setStatus(row)
                if (row?.ready) return surveyLabDatastore({ fresh: false })
                setLoading(false)
                return null
            })
            .then((payload) => {
                if (cancelled || ! payload) return
                setSurvey(payload)
                const list = Array.isArray(payload.tables) ? payload.tables : []
                setActiveTable((prev) => {
                    if (prev && list.some((row) => row.name === prev)) return prev
                    return list[0]?.name || null
                })
                setLoading(false)
            })
            .catch((err) => {
                if (cancelled) return
                setError(err?.payload?.message || err?.message || 'Could not load Supabase.')
                setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    const refreshSurvey = (fresh = false) => {
        setLoading(true)
        setError('')
        return surveyLabDatastore({ fresh })
            .then((payload) => {
                setSurvey(payload)
                const tables = Array.isArray(payload.tables) ? payload.tables : []
                setActiveTable((prev) => {
                    if (prev && tables.some((row) => row.name === prev)) return prev
                    return tables[0]?.name || null
                })
            })
            .catch((err) => {
                setSurvey(null)
                setError(err?.payload?.message || err?.message || 'Could not load tables.')
            })
            .finally(() => setLoading(false))
    }

    const refreshStatus = () => readLabDatastoreStatus().then(setStatus)

    const refreshUsers = (q = userQuery) => {
        return readLabDatastoreUsers(q)
            .then((payload) => {
                setUsers(Array.isArray(payload.users) ? payload.users : [])
                setSeries(Array.isArray(payload.series) ? payload.series : [])
            })
            .catch((err) => {
                setError(err?.payload?.message || err?.message || 'Could not load users.')
            })
    }

    useEffect(() => {
        if (! ready || section !== 'authentication') return undefined
        void readLabDatastoreAuth().then(setAuth).catch((err) => {
            setError(err?.payload?.message || err?.message || 'Could not load auth settings.')
        })
        return undefined
    }, [ready, section])

    useEffect(() => {
        if (! ready || section !== 'users') return undefined
        const timer = window.setTimeout(() => void refreshUsers(userQuery), 200)
        return () => window.clearTimeout(timer)
    }, [ready, section, userQuery])

    useEffect(() => {
        if (! ready || ! activeTable || section !== 'tables') {
            return undefined
        }
        let cancelled = false
        setRowsLoading(true)
        setRowsError('')
        readLabDatastoreRows(activeTable)
            .then((payload) => {
                if (cancelled) return
                setRows(Array.isArray(payload.rows) ? payload.rows : [])
                if (payload.ok === false) setRowsError(payload.error || 'Could not read rows.')
            })
            .catch((err) => {
                if (cancelled) return
                setRows([])
                setRowsError(err?.payload?.message || err?.message || 'Could not read rows.')
            })
            .finally(() => {
                if (! cancelled) setRowsLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [ready, activeTable, section])

    useEffect(() => {
        if (! ready || ! CATALOG_TOPICS.includes(section)) {
            return undefined
        }
        let cancelled = false
        setCatalogLoading(true)
        setCatalogError('')
        readLabDatastoreCatalog(section)
            .then((payload) => {
                if (cancelled) return
                setCatalogRows(Array.isArray(payload.rows) ? payload.rows : [])
                if (payload.ok === false) setCatalogError(payload.error || 'Could not load this catalog.')
            })
            .catch((err) => {
                if (cancelled) return
                setCatalogRows([])
                setCatalogError(err?.payload?.message || err?.message || 'Could not load this catalog.')
            })
            .finally(() => {
                if (! cancelled) setCatalogLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [ready, section])

    const tables = Array.isArray(survey?.tables) ? survey.tables : []
    const schema = tables.find((row) => row.name === activeTable) || null
    const columns = schema?.columns?.length
        ? schema.columns.map((col) => col.name)
        : (rows[0] ? Object.keys(rows[0]) : [])

    const dashboardUrl = status?.project_ref
        ? `https://supabase.com/dashboard/project/${status.project_ref}`
        : 'https://supabase.com/dashboard'

    const patchAuth = async (key, value) => {
        setAuthBusy(true)
        try {
            const next = await saveLabDatastoreAuth({ [key]: value })
            setAuth(next)
        } catch (err) {
            setError(err?.payload?.message || err?.message || 'Could not save auth settings.')
        } finally {
            setAuthBusy(false)
        }
    }

    const submitUser = async () => {
        setAddBusy(true)
        setError('')
        try {
            await addLabDatastoreUser({
                email: addEmail,
                password: addPassword,
                invite: addMode === 'invite',
            })
            setAddOpen(false)
            setAddEmail('')
            setAddPassword('')
            await refreshUsers()
        } catch (err) {
            setError(err?.payload?.message || err?.message || 'Could not add that user.')
        } finally {
            setAddBusy(false)
        }
    }

    const runConfirm = async () => {
        if (! confirm) return
        setConfirmBusy(true)
        try {
            if (confirm === 'disconnect') {
                await unlinkLabDatastore()
                await refreshStatus()
                setSurvey(null)
            } else if (confirm === 'restart') {
                await restartLabDatastore()
            } else if (confirm === 'change') {
                onChangeProject?.()
            }
            setConfirm(null)
        } catch (err) {
            setError(err?.payload?.message || err?.message || 'That action failed.')
        } finally {
            setConfirmBusy(false)
        }
    }

    const confirmCopy = useMemo(() => {
        if (confirm === 'disconnect') {
            return {
                title: 'Disconnect database',
                copy: 'Disconnect this Lab project from the Supabase project. Files that talk to the old database will keep their env until you change them.',
                dangerLabel: 'Disconnect',
            }
        }
        if (confirm === 'restart') {
            return {
                title: 'Restart database',
                copy: 'Restarting Postgres causes a short outage while the service comes back online.',
                dangerLabel: 'Restart',
            }
        }
        return {
            title: 'Change database',
            copy: 'This replaces the current database connection. Project files can fall out of sync with the new database.',
            dangerLabel: 'Change database',
        }
    }, [confirm])

    const pane = (() => {
        if (status === null && loading) {
            return (
                <div className="px-6 py-8 sm:px-8">
                    <p className="text-sm text-krikkit-muted">Loading Supabase…</p>
                </div>
            )
        }

        if (! ready) {
            return (
                <div className="px-6 py-8 sm:px-8">
                    <h2 className="text-2xl font-semibold tracking-tight text-krikkit-fg">Supabase</h2>
                    <p className="mt-2 max-w-xl text-sm text-krikkit-muted">
                        Connect an existing Supabase project to manage tables, auth, and users from Lab.
                    </p>
                    {onConnect ? (
                        <button
                            type="button"
                            onClick={onConnect}
                            className={`mt-6 inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                        >
                            Connect Supabase
                        </button>
                    ) : null}
                </div>
            )
        }

        if (section === 'tables') {
            return (
                <div className="px-6 py-8 sm:px-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-krikkit-fg">Tables</h2>
                            <p className="mt-2 max-w-xl text-sm text-krikkit-muted">
                                View and manage database tables and records. Ask Lab to create or modify tables.
                            </p>
                        </div>
                        <button type="button" onClick={() => void refreshSurvey(true)} className="text-xs font-medium text-krikkit-muted transition hover:text-krikkit-fg">
                            Refresh
                        </button>
                    </div>
                    {loading ? (
                        <p className="mt-10 text-sm text-krikkit-muted">Loading tables…</p>
                    ) : tables.length === 0 ? (
                        <p className="mt-10 text-sm text-krikkit-muted">You don&apos;t have any tables yet.</p>
                    ) : (
                        <div className="mt-8 flex min-h-0 flex-col gap-6 lg:flex-row">
                            <ul className="w-full shrink-0 lg:w-52">
                                {tables.map((row) => {
                                    const on = activeTable === row.name
                                    return (
                                        <li key={row.name}>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTable(row.name)}
                                                className={[
                                                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition',
                                                    on ? 'bg-krikkit-soft font-medium text-krikkit-fg' : 'text-krikkit-muted hover:bg-krikkit-soft/70 hover:text-krikkit-fg',
                                                ].join(' ')}
                                            >
                                                <span className="truncate">{row.name}</span>
                                                <span className="ml-2 shrink-0 text-[11px] text-krikkit-subtle">
                                                    {Array.isArray(row.columns) ? row.columns.length : 0}
                                                </span>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-krikkit-fg">{activeTable}</p>
                                {schema?.columns?.length ? (
                                    <p className="mt-1 text-xs text-krikkit-muted">
                                        {schema.columns.map((col) => `${col.name} (${col.type})`).join(' · ')}
                                    </p>
                                ) : null}
                                {rowsError ? (
                                    <p className="mt-4 text-sm text-red-500">{rowsError}</p>
                                ) : rowsLoading ? (
                                    <p className="mt-4 text-sm text-krikkit-muted">Loading records…</p>
                                ) : rows.length === 0 ? (
                                    <p className="mt-4 text-sm text-krikkit-muted">No records in this table.</p>
                                ) : (
                                    <div className="mt-4 overflow-x-auto rounded-xl border border-krikkit-line">
                                        <table className="min-w-full text-left text-xs">
                                            <thead className="border-b border-krikkit-line bg-krikkit-soft/40">
                                                <tr>
                                                    {columns.map((col) => (
                                                        <th key={col} className="whitespace-nowrap px-3 py-2 font-medium text-krikkit-fg">{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((row, index) => (
                                                    <tr key={index} className="border-b border-krikkit-line last:border-b-0">
                                                        {columns.map((col) => (
                                                            <td key={col} className="max-w-[14rem] truncate px-3 py-2 text-krikkit-muted" title={cellValue(row[col])}>
                                                                {cellValue(row[col])}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )
        }

        if (section === 'authentication') {
            return (
                <div className="px-6 py-8 sm:px-8">
                    <h2 className="text-2xl font-semibold tracking-tight text-krikkit-fg">Authentication</h2>
                    <p className="mt-2 max-w-xl text-sm text-krikkit-muted">
                        Control how users sign up and sign in to your app.
                    </p>
                    <div className="mt-8 max-w-xl divide-y divide-krikkit-line border-y border-krikkit-line">
                        <div className="flex items-start justify-between gap-4 py-5">
                            <div>
                                <p className="text-sm font-medium text-krikkit-fg">Allow new users to sign up</p>
                                <p className="mt-1 text-[13px] text-krikkit-muted">If this is turned off, new users can&apos;t sign up for your app.</p>
                            </div>
                            <LabSwitch checked={Boolean(auth?.allow_signup)} disabled={authBusy || ! auth} label="Allow sign up" onChange={(on) => void patchAuth('allow_signup', on)} />
                        </div>
                        <div className="flex items-start justify-between gap-4 py-5">
                            <div>
                                <p className="text-sm font-medium text-krikkit-fg">Allow Anonymous Sign-ins</p>
                                <p className="mt-1 text-[13px] text-krikkit-muted">Let users sign in to your app without creating an account.</p>
                            </div>
                            <LabSwitch checked={Boolean(auth?.allow_anonymous)} disabled={authBusy || ! auth} label="Allow anonymous" onChange={(on) => void patchAuth('allow_anonymous', on)} />
                        </div>
                    </div>
                    <h3 className="mt-10 text-sm font-semibold text-krikkit-fg">Sign-in methods</h3>
                    <p className="mt-1 text-[13px] text-krikkit-muted">Configure how users authenticate to your app.</p>
                    <div className="mt-4 max-w-xl divide-y divide-krikkit-line rounded-xl border border-krikkit-line">
                        <div className="flex items-center justify-between gap-4 px-4 py-4">
                            <div>
                                <p className="text-sm font-medium text-krikkit-fg">Email</p>
                                <p className="mt-0.5 text-[13px] text-krikkit-muted">Sign in with email and password</p>
                            </div>
                            <span className="text-xs font-medium text-krikkit-muted">{auth?.email_password ? 'Enabled' : 'Disabled'}</span>
                            <LabSwitch checked={Boolean(auth?.email_password)} disabled={authBusy || ! auth} label="Email sign-in" onChange={(on) => void patchAuth('email_password', on)} />
                        </div>
                        <div className="flex items-center justify-between gap-4 px-4 py-4">
                            <div>
                                <p className="text-sm font-medium text-krikkit-fg">Google</p>
                                <p className="mt-0.5 text-[13px] text-krikkit-muted">Sign in with Google</p>
                            </div>
                            <span className="text-xs font-medium text-krikkit-muted">{auth?.google ? 'Enabled' : 'Disabled'}</span>
                            <LabSwitch checked={Boolean(auth?.google)} disabled={authBusy || ! auth} label="Google sign-in" onChange={(on) => void patchAuth('google', on)} />
                        </div>
                    </div>
                </div>
            )
        }

        if (section === 'users') {
            return (
                <div className="px-6 py-8 sm:px-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-krikkit-fg">User Management</h2>
                            <p className="mt-2 max-w-xl text-sm text-krikkit-muted">
                                Track authenticated users who sign up and sign in to your app.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                        >
                            Add user
                        </button>
                    </div>
                    <SignupChart series={series} />
                    <div className="mt-8">
                        <p className="text-sm font-medium text-krikkit-fg">Recent users</p>
                        <input
                            type="search"
                            value={userQuery}
                            onChange={(event) => setUserQuery(event.target.value)}
                            placeholder="Search by email or id"
                            className="mt-3 h-10 w-full max-w-md rounded-full border border-krikkit-line bg-transparent px-4 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                        />
                        {users.length === 0 ? (
                            <p className="mt-6 text-sm text-krikkit-muted">
                                No authenticated users yet. Users will appear here when they sign up for your app.
                            </p>
                        ) : (
                            <ul className="mt-4 divide-y divide-krikkit-line rounded-xl border border-krikkit-line">
                                {users.map((row) => (
                                    <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                                        <span className="min-w-0 truncate text-krikkit-fg">{row.email || row.id}</span>
                                        <span className="shrink-0 text-xs text-krikkit-subtle">{row.created_at ? String(row.created_at).slice(0, 10) : ''}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )
        }

        if (section === 'manage') {
            return (
                <div className="px-6 py-8 sm:px-8">
                    <h2 className="text-2xl font-semibold tracking-tight text-krikkit-fg">Manage database</h2>
                    <p className="mt-2 max-w-xl text-sm text-krikkit-muted">
                        Connections and ownership. Connect an existing Supabase project or switch the one Lab is using.
                    </p>
                    <div className="mt-8 max-w-xl space-y-8">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-krikkit-subtle">Supabase project</p>
                            <p className="mt-1 text-sm font-medium text-krikkit-fg">{status.project_name || status.project_ref}</p>
                            <p className="mt-0.5 text-xs text-krikkit-muted">{status.host}</p>
                            <p className="mt-3 text-sm text-krikkit-muted">Connect to a different Supabase project to manage your data.</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <a
                                    href={dashboardUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_OUTLINE}`}
                                >
                                    View in Supabase
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setConfirm('change')}
                                    className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_OUTLINE}`}
                                >
                                    Change database
                                </button>
                            </div>
                        </div>
                        <div className="border-t border-krikkit-line pt-8">
                            <p className="text-sm font-medium text-krikkit-fg">Restart database</p>
                            <p className="mt-1 text-sm text-krikkit-muted">
                                Restart the Postgres service for this project to recover from transient connection issues.
                            </p>
                            <button
                                type="button"
                                onClick={() => setConfirm('restart')}
                                className={`mt-4 inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_OUTLINE}`}
                            >
                                Restart
                            </button>
                        </div>
                        <div className="border-t border-krikkit-line pt-8">
                            <p className="text-sm font-medium text-krikkit-fg">Disconnect database</p>
                            <p className="mt-1 text-sm text-krikkit-muted">
                                Disconnect your Lab project from the Supabase project.
                            </p>
                            <button
                                type="button"
                                onClick={() => setConfirm('disconnect')}
                                className="mt-4 inline-flex h-10 items-center rounded-full border border-red-500/40 px-4 text-sm font-medium text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        if (CATALOG_TOPICS.includes(section)) {
            const intro = CATALOG_INTRO[section] || [section, '']
            return (
                <div className="px-6 py-8 sm:px-8">
                    <h2 className="text-2xl font-semibold tracking-tight text-krikkit-fg">{intro[0]}</h2>
                    <p className="mt-2 max-w-xl text-sm text-krikkit-muted">{intro[1]}</p>
                    {catalogError ? <p className="mt-4 text-sm text-red-500">{catalogError}</p> : null}
                    {catalogLoading ? (
                        <p className="mt-8 text-sm text-krikkit-muted">Loading…</p>
                    ) : (
                        <CatalogTable rows={catalogRows} />
                    )}
                </div>
            )
        }

        return null
    })()

    return (
        <div className="flex h-full min-h-0 bg-krikkit-canvas">
            {ready ? (
            <aside className="flex w-52 shrink-0 flex-col border-r border-krikkit-line">
                <nav className="krikkit-scroll-hover min-h-0 flex-1 overflow-y-auto py-2">
                    {SECTIONS.map((item) => {
                        const on = section === item.id
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setSection(item.id)}
                                className={[
                                    'flex w-full px-4 py-2 text-left text-sm transition',
                                    on ? 'bg-krikkit-soft font-medium text-krikkit-fg' : 'text-krikkit-muted hover:bg-krikkit-soft/70 hover:text-krikkit-fg',
                                ].join(' ')}
                            >
                                {item.label}
                            </button>
                        )
                    })}
                </nav>
                <div className="border-t border-krikkit-line p-2">
                    <button
                        type="button"
                        onClick={() => setSection('manage')}
                        className={[
                            'flex w-full rounded-lg px-3 py-2 text-left text-sm transition',
                            section === 'manage' ? 'bg-krikkit-soft font-medium text-krikkit-fg' : 'text-krikkit-muted hover:bg-krikkit-soft/70 hover:text-krikkit-fg',
                        ].join(' ')}
                    >
                        Manage
                    </button>
                </div>
            </aside>
            ) : null}

            <div className="krikkit-scroll-hover min-w-0 flex-1 overflow-y-auto">
                {error ? <p className="px-6 pt-4 text-sm text-red-500">{error}</p> : null}
                {pane}
            </div>

            <ConfirmSheet
                open={Boolean(confirm)}
                title={confirmCopy.title}
                copy={confirmCopy.copy}
                dangerLabel={confirmCopy.dangerLabel}
                busy={confirmBusy}
                onCancel={() => setConfirm(null)}
                onConfirm={() => void runConfirm()}
            />

            {addOpen ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <button type="button" className="absolute inset-0 bg-black/40" aria-label="Dismiss" onClick={() => setAddOpen(false)} />
                    <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl border border-krikkit-line bg-krikkit-canvas p-5">
                        <h3 className="text-base font-semibold text-krikkit-fg">Add user</h3>
                        <div className="mt-4 flex gap-1 rounded-full bg-krikkit-soft p-1 text-xs">
                            {['invite', 'create'].map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setAddMode(id)}
                                    className={['flex-1 rounded-full px-3 py-1.5 font-medium', addMode === id ? 'bg-krikkit-canvas text-krikkit-fg' : 'text-krikkit-muted'].join(' ')}
                                >
                                    {id === 'invite' ? 'Send invitation' : 'Create user'}
                                </button>
                            ))}
                        </div>
                        <input
                            type="email"
                            value={addEmail}
                            onChange={(event) => setAddEmail(event.target.value)}
                            placeholder="name@company.com"
                            className="mt-4 h-10 w-full rounded-full border border-krikkit-line bg-transparent px-4 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                        />
                        {addMode === 'create' ? (
                            <input
                                type="password"
                                value={addPassword}
                                onChange={(event) => setAddPassword(event.target.value)}
                                placeholder="Temporary password"
                                className="mt-2 h-10 w-full rounded-full border border-krikkit-line bg-transparent px-4 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                            />
                        ) : (
                            <p className="mt-2 text-xs text-krikkit-muted">They get an email to finish signing up.</p>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setAddOpen(false)} className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_OUTLINE}`}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={addBusy || ! addEmail.trim()}
                                onClick={() => void submitUser()}
                                className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                            >
                                {addBusy ? 'Saving…' : (addMode === 'invite' ? 'Send invitation' : 'Create user')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
