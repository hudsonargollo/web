import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
    fetchGithubAccounts,
    fetchGithubBranches,
    fetchGithubRepositories,
    githubConnectUrl,
    importGithubRepository,
    unlinkGithubAccount,
} from '../lib/github'
import { isEntitlementDenied } from '../lib/entitlement'
import { LAB_BTN_OUTLINE, LAB_BTN_PRIMARY } from '../lib/labConstants'
import { labI18n } from '../lib/labI18n'
import { failDeskPulse } from '../lib/deskPulse'
import { LabSelect } from './LabSelect'
import { RepoGlyph } from './RepoGlyph'

function IconClose({ className = 'size-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    )
}

function IconSearch({ className = 'size-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15ZM16.5 16.5 21 21"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function IconGithubMark({ className = 'size-3.5' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 640 640"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            aria-hidden="true"
        >
            <path d="M319.988 7.973C143.293 7.973 0 151.242 0 327.96c0 141.392 91.678 261.298 218.826 303.63 16.004 2.964 21.886-6.957 21.886-15.414 0-7.63-.319-32.835-.449-59.552-89.032 19.359-107.8-37.772-107.8-37.772-14.552-36.993-35.529-46.831-35.529-46.831-29.032-19.879 2.209-19.442 2.209-19.442 32.126 2.245 49.04 32.954 49.04 32.954 28.56 48.922 74.883 34.76 93.131 26.598 2.882-20.681 11.15-34.807 20.315-42.803-71.08-8.067-145.797-35.516-145.797-158.14 0-34.926 12.52-63.485 32.965-85.88-3.33-8.078-14.291-40.606 3.083-84.674 0 0 26.87-8.61 88.029 32.8 25.512-7.075 52.878-10.642 80.056-10.76 27.2.118 54.614 3.673 80.162 10.76 61.076-41.386 87.922-32.8 87.922-32.8 17.398 44.08 6.485 76.631 3.154 84.675 20.516 22.394 32.93 50.953 32.93 85.879 0 122.907-74.883 149.93-146.117 157.856 11.481 9.921 21.733 29.398 21.733 59.233 0 42.792-.366 77.28-.366 87.804 0 8.516 5.764 18.473 21.992 15.354 127.076-42.354 218.637-162.274 218.637-303.582 0-176.695-143.269-319.988-320-319.988l-.023.107z" />
        </svg>
    )
}

function Pulse({ className = '' }) {
    return (
        <div
            className={`animate-pulse rounded-md bg-krikkit-soft ${className}`}
            aria-hidden="true"
        />
    )
}

const fieldClass = [
    'h-10 w-full rounded-full border border-transparent bg-krikkit-surface',
    'px-4 text-sm font-normal text-krikkit-fg placeholder:text-krikkit-subtle',
    'outline-none transition focus:border-krikkit-muted/40',
    'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

const pillCardClass = [
    'h-10 rounded-full border border-transparent bg-krikkit-surface',
    'text-sm font-normal text-krikkit-fg',
].join(' ')

const areaClass = [
    'min-h-[4.5rem] w-full rounded-2xl border border-transparent bg-krikkit-surface',
    'px-4 py-2.5 text-sm font-normal text-krikkit-fg placeholder:text-krikkit-subtle',
    'outline-none transition focus:border-krikkit-muted/40',
    'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
].join(' ')

const primaryBtn = `inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium ${LAB_BTN_PRIMARY}`
const labelClass = 'text-[11px] font-medium uppercase tracking-[0.14em] text-krikkit-subtle'

function AccountSkeleton() {
    return (
        <div className="flex items-center gap-2">
            <div className={`${pillCardClass} flex min-w-0 flex-1 items-center gap-2 pl-2.5 pr-4`}>
                <Pulse className="size-4 rounded" />
                <Pulse className="h-3.5 w-28" />
                <Pulse className="ml-auto h-3 w-14" />
            </div>
            <Pulse className="size-9 shrink-0 rounded-full" />
        </div>
    )
}

function RepoListSkeleton() {
    return (
        <ul className="space-y-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-center gap-2.5 px-2 py-2">
                    <Pulse className="size-4 rounded" />
                    <Pulse className="h-3.5 w-36 max-w-[55%]" />
                    <Pulse className="ml-auto h-2.5 w-24" />
                </li>
            ))}
        </ul>
    )
}

/**
 * Import from GitHub — pick a repo, then branch / folder / opening message.
 */
export function ImportFromGithubModal({
    open = false,
    projectUuid = null,
    onClose,
    onImported,
}) {
    const t = labI18n()
    const titleId = useId()
    const urlInputRef = useRef(null)
    const searchInputRef = useRef(null)
    const searchRegionRef = useRef(null)
    const [url, setUrl] = useState('')
    const [search, setSearch] = useState('')
    const [searchOpen, setSearchOpen] = useState(false)
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [accounts, setAccounts] = useState([])
    const [oauthReady, setOauthReady] = useState(false)
    const [linked, setLinked] = useState(false)
    const [connected, setConnected] = useState(false)
    const [repos, setRepos] = useState([])
    const [selectedKey, setSelectedKey] = useState('')
    const [branches, setBranches] = useState([])
    const [branch, setBranch] = useState('')
    const [rootDirectory, setRootDirectory] = useState('')
    const [firstPrompt, setFirstPrompt] = useState('')
    const [loadingAccounts, setLoadingAccounts] = useState(false)
    const [loadingRepos, setLoadingRepos] = useState(false)
    const [loadingBranches, setLoadingBranches] = useState(false)
    const [importing, setImporting] = useState(false)
    const [unlinking, setUnlinking] = useState(false)
    const [error, setError] = useState('')

    const selected = useMemo(
        () => repos.find((repo) => (repo.full_name || `${repo.owner_login}/${repo.name}`) === selectedKey) || null,
        [repos, selectedKey],
    )

    const refreshAccounts = () => {
        setLoadingAccounts(true)
        return fetchGithubAccounts()
            .then((data) => {
                const list = Array.isArray(data.accounts) ? data.accounts : []
                setOauthReady(Boolean(data.oauth_ready))
                setLinked(Boolean(data.linked))
                setConnected(Boolean(data.connected))
                setAccounts(list)
            })
            .catch((err) => {
                setOauthReady(false)
                setLinked(false)
                setConnected(false)
                setAccounts([])
                failDeskPulse(err.message || t.githubUnavailable)
            })
            .finally(() => setLoadingAccounts(false))
    }

    useEffect(() => {
        if (! open) return undefined
        const timer = window.setTimeout(() => setDebouncedSearch(search), 250)
        return () => window.clearTimeout(timer)
    }, [open, search])

    useEffect(() => {
        if (! open) return undefined

        setError('')
        setUrl('')
        setSearch('')
        setSearchOpen(false)
        setDebouncedSearch('')
        setSelectedKey('')
        setBranches([])
        setBranch('')
        setRootDirectory('')
        setFirstPrompt('')
        setImporting(false)
        void refreshAccounts()
        queueMicrotask(() => urlInputRef.current?.focus())

        return undefined
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    useEffect(() => {
        if (! open) return undefined

        const onKey = (event) => {
            if (event.key === 'Escape' && ! importing && ! unlinking) {
                if (searchOpen) {
                    setSearchOpen(false)
                    return
                }
                onClose?.()
            }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose, importing, unlinking, searchOpen])

    useEffect(() => {
        if (! open || ! searchOpen) return undefined

        const onPointerDown = (event) => {
            const root = searchRegionRef.current
            if (! root || ! root.contains(event.target)) {
                setSearchOpen(false)
            }
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [open, searchOpen])

    useEffect(() => {
        if (! searchOpen) return undefined
        const timer = window.setTimeout(() => searchInputRef.current?.focus(), 180)
        return () => window.clearTimeout(timer)
    }, [searchOpen])

    useEffect(() => {
        if (! open || ! connected) {
            setRepos([])
            setSelectedKey('')
            return undefined
        }

        let cancelled = false
        setLoadingRepos(true)
        setError('')

        fetchGithubRepositories(debouncedSearch)
            .then((data) => {
                if (cancelled) return
                const list = Array.isArray(data.repositories) ? data.repositories : []
                setRepos(list)
                if (! data.connected) {
                    setConnected(false)
                    setLinked(false)
                }
                setSelectedKey((prev) => {
                    if (! prev) return ''
                    return list.some((repo) => (repo.full_name || `${repo.owner_login}/${repo.name}`) === prev)
                        ? prev
                        : ''
                })
            })
            .catch((err) => {
                if (cancelled) return
                setRepos([])
                failDeskPulse(err.message || t.noRepositoriesFound)
            })
            .finally(() => {
                if (! cancelled) setLoadingRepos(false)
            })

        return () => {
            cancelled = true
        }
    }, [open, connected, debouncedSearch, t.noRepositoriesFound])

    useEffect(() => {
        if (! open || ! selected) {
            setBranches([])
            setBranch('')
            return undefined
        }

        let cancelled = false
        setLoadingBranches(true)
        setError('')

        fetchGithubBranches(selected.owner_login, selected.name)
            .then((data) => {
                if (cancelled) return
                const list = Array.isArray(data.branches) ? data.branches : []
                setBranches(list)
                const preferred = selected.default_branch || 'main'
                setBranch(list.includes(preferred) ? preferred : (list[0] || preferred))
            })
            .catch((err) => {
                if (cancelled) return
                setBranches([])
                setBranch(selected.default_branch || 'main')
                failDeskPulse(err.message || t.noRepositoriesFound)
            })
            .finally(() => {
                if (! cancelled) setLoadingBranches(false)
            })

        return () => {
            cancelled = true
        }
    }, [open, selected, t.noRepositoriesFound])

    const selectedAccount = useMemo(() => accounts[0] || null, [accounts])

    const canImport = Boolean(selected) || Boolean(url.trim())
    const busy = importing || unlinking

    const runImport = async () => {
        if (importing || ! canImport) return
        setImporting(true)
        setError('')
        try {
            const payload = selected
                ? {
                    owner: selected.owner_login,
                    repo: selected.name,
                    branch: branch || selected.default_branch || undefined,
                    rootDirectory: rootDirectory.trim() || undefined,
                    firstPrompt: firstPrompt.trim() || undefined,
                    projectUuid,
                }
                : {
                    url: url.trim(),
                    branch: branch.trim() || undefined,
                    rootDirectory: rootDirectory.trim() || undefined,
                    firstPrompt: firstPrompt.trim() || undefined,
                    projectUuid,
                }

            const result = await importGithubRepository(payload)
            onImported?.(result)
            onClose?.()
        } catch (err) {
            if (isEntitlementDenied(err)) {
                onClose?.()
                return
            }
            failDeskPulse(err.message || t.enterPublicGithubUrl)
        } finally {
            setImporting(false)
        }
    }

    const onConnect = () => {
        const returnPath = window.location.pathname.startsWith('/lab')
            ? window.location.pathname
            : '/lab'
        window.location.assign(githubConnectUrl(returnPath))
    }

    const onDisconnect = async () => {
        if (unlinking) return
        setUnlinking(true)
        setError('')
        try {
            await unlinkGithubAccount()
            setRepos([])
            setSelectedKey('')
            await refreshAccounts()
        } catch (err) {
            failDeskPulse(err.message || t.noGithubAccount)
        } finally {
            setUnlinking(false)
        }
    }

    if (! open) return null

    const showOptions = Boolean(selected) || Boolean(url.trim())

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label={t.close}
                disabled={busy}
                onClick={() => {
                    if (! busy) onClose?.()
                }}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-krikkit-canvas"
            >
                <div className="flex items-center justify-between gap-3 border-b border-krikkit-line px-5 py-4">
                    <h2 id={titleId} className="text-base font-semibold tracking-tight text-krikkit-fg">
                        {t.importFromGithub}
                    </h2>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => onClose?.()}
                        className={`inline-flex size-8 items-center justify-center rounded-full ${LAB_BTN_OUTLINE}`}
                        aria-label={t.close}
                    >
                        <IconClose className="size-4" />
                    </button>
                </div>

                <div className="krikkit-scroll-hover min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                    <section className="space-y-2">
                        <h3 className={labelClass}>{t.importFromAUrl}</h3>
                        <input
                            ref={urlInputRef}
                            type="url"
                            value={url}
                            onChange={(event) => {
                                setUrl(event.target.value)
                                if (event.target.value.trim()) setSelectedKey('')
                            }}
                            placeholder={t.repositoryUrlPlaceholder}
                            disabled={busy}
                            className={fieldClass}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </section>

                    <section className="space-y-2">
                        <h3 className={labelClass}>{t.selectARepository}</h3>

                        {loadingAccounts ? (
                            <AccountSkeleton />
                        ) : linked && selectedAccount ? (
                            <div
                                className="grid items-center gap-2 transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                style={{
                                    gridTemplateColumns: searchOpen
                                        ? 'minmax(0, 8.75rem) minmax(0, 1fr)'
                                        : 'minmax(0, 1fr) 2.25rem',
                                }}
                            >
                                <div
                                    className={`${pillCardClass} flex min-w-0 items-center gap-2 overflow-hidden pl-2 pr-3`}
                                >
                                    <IconGithubMark className="size-[1.125rem] shrink-0 text-krikkit-fg" />
                                    <span className="min-w-0 flex-1 truncate text-sm font-light text-krikkit-fg">
                                        {selectedAccount.login || selectedAccount.name}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={busy || searchOpen}
                                        tabIndex={searchOpen ? -1 : 0}
                                        onClick={() => void onDisconnect()}
                                        className={[
                                            'shrink-0 overflow-hidden whitespace-nowrap text-xs font-medium text-krikkit-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-krikkit-fg disabled:opacity-40',
                                            searchOpen
                                                ? 'pointer-events-none max-w-0 translate-x-1 opacity-0'
                                                : 'max-w-[5.5rem] translate-x-0 opacity-100',
                                        ].join(' ')}
                                    >
                                        {unlinking ? <Pulse className="inline-block h-3 w-14" /> : t.disconnect}
                                    </button>
                                </div>

                                <div
                                    ref={searchRegionRef}
                                    className={`${pillCardClass} relative flex min-w-0 items-center overflow-hidden`}
                                >
                                    <button
                                        type="button"
                                        disabled={busy}
                                        aria-expanded={searchOpen}
                                        aria-label={t.searchRepositories}
                                        tabIndex={searchOpen ? -1 : 0}
                                        onClick={() => setSearchOpen(true)}
                                        className={[
                                            'absolute inset-0 z-10 inline-flex items-center justify-center text-krikkit-muted transition-opacity duration-200 hover:text-krikkit-fg disabled:opacity-40',
                                            searchOpen ? 'pointer-events-none opacity-0' : 'opacity-100',
                                        ].join(' ')}
                                    >
                                        <IconSearch className="size-3.5" />
                                    </button>
                                    <div
                                        className={[
                                            'relative flex h-full w-full items-center px-3.5 transition-opacity duration-200',
                                            searchOpen ? 'opacity-100 delay-75' : 'pointer-events-none opacity-0',
                                        ].join(' ')}
                                    >
                                        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-krikkit-subtle" />
                                        <input
                                            ref={searchInputRef}
                                            type="search"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder={t.searchRepositories}
                                            disabled={busy || ! searchOpen}
                                            tabIndex={searchOpen ? 0 : -1}
                                            className="h-full w-full bg-transparent py-0 pl-6 pr-1 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-krikkit-surface px-4 py-6 text-center">
                                <p className="text-sm font-normal text-krikkit-muted">
                                    {t.connectGithubHint}
                                </p>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={onConnect}
                                    className={`${primaryBtn} mt-4`}
                                >
                                    {t.connectGithub}
                                </button>
                            </div>
                        )}

                        {linked ? (
                            <div className="krikkit-scroll-hover max-h-52 overflow-y-auto">
                                {loadingRepos ? (
                                    <RepoListSkeleton />
                                ) : repos.length === 0 ? (
                                    <p className="px-2 py-8 text-center text-sm font-normal text-krikkit-muted">
                                        {t.noRepositoriesFound}
                                    </p>
                                ) : (
                                    <ul className="space-y-0.5">
                                        {repos.map((repo) => {
                                            const key = repo.full_name || `${repo.owner_login}/${repo.name}`
                                            const active = selectedKey === key
                                            const updated = repo.updated_label || ''
                                            return (
                                                <li key={key}>
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        aria-pressed={active}
                                                        onClick={() => {
                                                            setSelectedKey(key)
                                                            setUrl('')
                                                        }}
                                                        className={[
                                                            'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition',
                                                            active
                                                                ? 'bg-krikkit-soft'
                                                                : 'hover:bg-krikkit-soft/70',
                                                            'disabled:opacity-40',
                                                        ].join(' ')}
                                                    >
                                                        <RepoGlyph kind={repo.glyph || 'web'} className="size-4 shrink-0" />
                                                        <span
                                                            className={[
                                                                'min-w-0 flex-1 truncate text-sm text-krikkit-fg',
                                                                active ? 'font-medium' : 'font-normal',
                                                            ].join(' ')}
                                                        >
                                                            {repo.name || repo.full_name}
                                                        </span>
                                                        {updated ? (
                                                            <span className="shrink-0 text-right text-[11px] font-normal leading-none text-krikkit-muted">
                                                                {updated}
                                                            </span>
                                                        ) : null}
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                        ) : null}
                    </section>

                    {showOptions ? (
                        <section className="space-y-3 border-t border-krikkit-line pt-5">
                            <div className="space-y-2">
                                <label className={labelClass} htmlFor="lab-gh-branch">
                                    {t.branch}
                                </label>
                                {loadingBranches && selected ? (
                                    <Pulse className="h-10 w-full rounded-full" />
                                ) : (
                                    <LabSelect
                                        id="lab-gh-branch"
                                        value={branch}
                                        onChange={setBranch}
                                        options={branches.length > 0 ? branches : [branch || 'main']}
                                        disabled={busy || (selected && branches.length === 0)}
                                        placeholder={t.branch}
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className={labelClass} htmlFor="lab-gh-root">
                                    {t.rootDirectory}
                                    <span className="ml-1 font-normal normal-case tracking-normal text-krikkit-muted">
                                        ({t.optional})
                                    </span>
                                </label>
                                <input
                                    id="lab-gh-root"
                                    type="text"
                                    value={rootDirectory}
                                    onChange={(event) => setRootDirectory(event.target.value)}
                                    placeholder={t.rootDirectoryPlaceholder}
                                    disabled={busy}
                                    className={fieldClass}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClass} htmlFor="lab-gh-prompt">
                                    {t.firstPrompt}
                                    <span className="ml-1 font-normal normal-case tracking-normal text-krikkit-muted">
                                        ({t.optional})
                                    </span>
                                </label>
                                <textarea
                                    id="lab-gh-prompt"
                                    value={firstPrompt}
                                    onChange={(event) => setFirstPrompt(event.target.value)}
                                    placeholder={t.firstPromptPlaceholder}
                                    disabled={busy}
                                    className={areaClass}
                                    rows={3}
                                />
                            </div>
                        </section>
                    ) : null}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-krikkit-line px-5 py-4">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => onClose?.()}
                        className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium ${LAB_BTN_OUTLINE}`}
                    >
                        {t.close}
                    </button>
                    <button
                        type="button"
                        disabled={busy || ! canImport || (selected && loadingBranches)}
                        onClick={() => void runImport()}
                        className={primaryBtn}
                    >
                        {importing ? t.importing : t.import}
                    </button>
                </div>
            </div>
        </div>
    )
}
