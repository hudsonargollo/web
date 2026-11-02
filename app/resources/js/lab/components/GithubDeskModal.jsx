import { useEffect, useId, useState } from 'react'
import { githubConnectUrl } from '../lib/github'
import {
    GITHUB_CANCELLED,
    GITHUB_READY,
    compareLabGithub,
    createLabGithubRepo,
    forkLabGithub,
    linkLabGithub,
    pullLabGithub,
    pushLabGithub,
    readLabGithubStatus,
    unlinkLabGithubRemote,
} from '../lib/githubRemote'
import { LAB_BTN_OUTLINE, LAB_BTN_PRIMARY } from '../lib/labConstants'
import { labI18n } from '../lib/labI18n'
import { failDeskPulse } from '../lib/deskPulse'
import { IconClose } from './Icons'

const fieldClass = [
    'h-10 w-full rounded-full border border-transparent bg-krikkit-surface',
    'px-4 text-sm font-normal text-krikkit-fg placeholder:text-krikkit-subtle',
    'outline-none transition focus:border-krikkit-muted/40',
    'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

function IconGithubMark({ className = 'size-8' }) {
    return (
        <svg className={className} viewBox="0 0 640 640" fill="currentColor" aria-hidden="true">
            <path d="M319.988 7.973C143.293 7.973 0 151.242 0 327.96c0 141.392 91.678 261.298 218.826 303.63 16.004 2.964 21.886-6.957 21.886-15.414 0-7.63-.319-32.835-.449-59.552-89.032 19.359-107.8-37.772-107.8-37.772-14.552-36.993-35.529-46.831-35.529-46.831-29.032-19.879 2.209-19.442 2.209-19.442 32.126 2.245 49.04 32.954 49.04 32.954 28.56 48.922 74.883 34.76 93.131 26.598 2.882-20.681 11.15-34.807 20.315-42.803-71.08-8.067-145.797-35.516-145.797-158.14 0-34.926 12.52-63.485 32.965-85.88-3.33-8.078-14.291-40.606 3.083-84.674 0 0 26.87-8.61 88.029 32.8 25.512-7.075 52.878-10.642 80.056-10.76 27.2.118 54.614 3.673 80.162 10.76 61.076-41.386 87.922-32.8 87.922-32.8 17.398 44.08 6.485 76.631 3.154 84.675 20.516 22.394 32.93 50.953 32.93 85.879 0 122.907-74.883 149.93-146.117 157.856 11.481 9.921 21.733 29.398 21.733 59.233 0 42.792-.366 77.28-.366 87.804 0 8.516 5.764 18.473 21.992 15.354 127.076-42.354 218.637-162.274 218.637-303.582 0-176.695-143.269-319.988-320-319.988l-.023.107z" />
        </svg>
    )
}

function PathList({ title, paths }) {
    if (! paths?.length) return null
    return (
        <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-krikkit-subtle">
                {title} ({paths.length})
            </p>
            <ul className="krikkit-scroll-hover mt-1 max-h-28 space-y-0.5 overflow-y-auto font-mono text-[11px] text-krikkit-muted">
                {paths.slice(0, 40).map((path) => (
                    <li key={path} className="truncate">{path}</li>
                ))}
            </ul>
        </div>
    )
}

function labReturnPath() {
    return window.location.pathname.startsWith('/lab')
        ? window.location.pathname
        : '/lab'
}

function emitReady(detail = {}) {
    window.dispatchEvent(new CustomEvent(GITHUB_READY, { detail }))
}

function emitCancel() {
    window.dispatchEvent(new CustomEvent(GITHUB_CANCELLED))
}

/**
 * Manage the GitHub remote for a Lab project: connect, link, create, fork, tree vs, push, pull.
 */
export function GithubDeskModal({
    open = false,
    waitMode = false,
    needRemote = false,
    projectUuid = null,
    onClose,
    onPulled = null,
    onRequestImport = null,
}) {
    const titleId = useId()
    const t = labI18n()
    const [status, setStatus] = useState(null)
    const [compare, setCompare] = useState(null)
    const [busy, setBusy] = useState(false)
    const [mode, setMode] = useState('link')
    const [url, setUrl] = useState('')
    const [branch, setBranch] = useState('main')
    const [repoName, setRepoName] = useState('')
    const [commitMessage, setCommitMessage] = useState('Update from Krikkit Lab')
    const [force, setForce] = useState(false)

    const close = (cancelled = true) => {
        if (busy) return
        if (waitMode && cancelled) emitCancel()
        onClose?.()
    }

    const load = async () => {
        if (! projectUuid) return
        try {
            const payload = await readLabGithubStatus(projectUuid)
            setStatus(payload)
            setCompare(payload.compare || null)
            if (payload.remote?.repo) setRepoName(payload.remote.repo)
            if (payload.remote?.branch) setBranch(payload.remote.branch)
            if (waitMode && payload.linked && (! needRemote || payload.remote)) {
                emitReady(payload)
                onClose?.()
            }
        } catch (err) {
            failDeskPulse(err.message || t.githubUnavailable)
        }
    }

    useEffect(() => {
        if (! open) return
        load()
    }, [open, projectUuid])

    const run = async (task) => {
        setBusy(true)
        try {
            await task()
            await load()
        } catch (err) {
            failDeskPulse(err.message || t.githubUnavailable)
        } finally {
            setBusy(false)
        }
    }

    if (! open) return null

    const remote = status?.remote
    const linked = Boolean(status?.linked)

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label={t.close}
                disabled={busy}
                onClick={() => close(true)}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex max-h-[min(44rem,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-krikkit-canvas"
            >
                <div className="flex items-center justify-between gap-3 border-b border-krikkit-line px-5 py-4">
                    <h2 id={titleId} className="text-base font-semibold tracking-tight text-krikkit-fg">
                        {t.githubDesk || 'GitHub'}
                    </h2>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => close(true)}
                        className={`inline-flex size-8 items-center justify-center rounded-full ${LAB_BTN_OUTLINE}`}
                        aria-label={t.close}
                    >
                        <IconClose className="size-4" />
                    </button>
                </div>

                <div className="krikkit-scroll-hover min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                    {waitMode ? (
                        <p className="text-sm text-krikkit-muted">
                            {needRemote
                                ? (t.githubWaitRemote || 'Chat is waiting for a GitHub repository on this project.')
                                : (t.githubWaitConnect || 'Chat is waiting for GitHub to be connected.')}
                        </p>
                    ) : null}

                    {! projectUuid ? (
                        <div className="flex flex-col items-center px-4 py-8 text-center">
                            <IconGithubMark className="size-10 text-krikkit-fg" />
                            <p className="mt-4 text-sm text-krikkit-muted">{t.connectGithubHint}</p>
                            <button
                                type="button"
                                className={`mt-6 inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                                onClick={() => {
                                    onClose?.()
                                    onRequestImport?.()
                                }}
                            >
                                {t.importFromGithub}
                            </button>
                            <a
                                href={githubConnectUrl(labReturnPath())}
                                className={`mt-3 inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium ${LAB_BTN_OUTLINE}`}
                            >
                                {t.connectGithub}
                            </a>
                        </div>
                    ) : ! linked ? (
                        <div className="flex flex-col items-center px-4 py-8 text-center">
                            <IconGithubMark className="size-10 text-krikkit-fg" />
                            <p className="mt-4 text-sm text-krikkit-muted">{t.connectGithubHint}</p>
                            <a
                                href={githubConnectUrl(labReturnPath())}
                                className={`mt-6 inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                            >
                                {t.connectGithub}
                            </a>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-krikkit-muted">
                                {status.account?.login
                                    ? `${t.githubAccount}: ${status.account.login}`
                                    : t.githubAccount}
                            </p>

                            {remote ? (
                                <div className="space-y-3 rounded-xl border border-krikkit-line p-4">
                                    <p className="text-sm font-medium text-krikkit-fg">
                                        {remote.full_name}
                                        <span className="ml-2 font-normal text-krikkit-muted">@{remote.branch}</span>
                                    </p>
                                    {remote.forked_from ? (
                                        <p className="text-xs text-krikkit-muted">Forked from {remote.forked_from}</p>
                                    ) : null}
                                    {compare ? (
                                        <p className="text-xs text-krikkit-muted">
                                            {compare.clean
                                                ? (t.githubClean || 'Local matches GitHub.')
                                                : `${compare.ahead} local change${compare.ahead === 1 ? '' : 's'}, ${compare.behind} only on GitHub.`}
                                        </p>
                                    ) : null}
                                    <PathList title={t.githubAdded || 'Added'} paths={compare?.added} />
                                    <PathList title={t.githubModified || 'Modified'} paths={compare?.modified} />
                                    <PathList title={t.githubRemoved || 'Removed'} paths={compare?.removed} />

                                    <input
                                        className={fieldClass}
                                        value={commitMessage}
                                        onChange={(e) => setCommitMessage(e.target.value)}
                                        placeholder={t.githubCommitMessage || 'Commit message'}
                                    />
                                    <label className="flex items-center gap-2 text-xs text-krikkit-muted">
                                        <input
                                            type="checkbox"
                                            checked={force}
                                            onChange={(e) => setForce(e.target.checked)}
                                        />
                                        {t.githubForcePush || 'Force push if the branch diverged'}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                                            onClick={() => run(async () => {
                                                await pushLabGithub(projectUuid, { message: commitMessage, force })
                                            })}
                                        >
                                            {t.githubPush || 'Push'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_OUTLINE}`}
                                            onClick={() => run(async () => {
                                                const payload = await pullLabGithub(projectUuid)
                                                onPulled?.(payload)
                                            })}
                                        >
                                            {t.githubPull || 'Pull'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-medium ${LAB_BTN_OUTLINE}`}
                                            onClick={() => run(async () => {
                                                const payload = await compareLabGithub(projectUuid)
                                                setCompare(payload.compare || null)
                                            })}
                                        >
                                            {t.githubCompare || 'Tree vs'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-red-500"
                                            onClick={() => run(() => unlinkLabGithubRemote(projectUuid))}
                                        >
                                            {t.githubUnlink || 'Unlink'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-1 rounded-full bg-krikkit-soft p-1 text-xs">
                                        {['link', 'create', 'fork'].map((id) => (
                                            <button
                                                key={id}
                                                type="button"
                                                className={[
                                                    'flex-1 rounded-full px-3 py-1.5 font-medium',
                                                    mode === id ? 'bg-krikkit-canvas text-krikkit-fg' : 'text-krikkit-muted',
                                                ].join(' ')}
                                                onClick={() => setMode(id)}
                                            >
                                                {id === 'link' ? (t.githubLink || 'Link') : id === 'create' ? (t.githubCreate || 'Create') : (t.githubFork || 'Fork')}
                                            </button>
                                        ))}
                                    </div>

                                    {mode === 'create' ? (
                                        <>
                                            <input
                                                className={fieldClass}
                                                value={repoName}
                                                onChange={(e) => setRepoName(e.target.value)}
                                                placeholder={t.githubRepoName || 'repository-name'}
                                            />
                                            <button
                                                type="button"
                                                disabled={busy}
                                                className={`inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-medium ${LAB_BTN_PRIMARY}`}
                                                onClick={() => run(() => createLabGithubRepo(projectUuid, { name: repoName, private: true, push: true }))}
                                            >
                                                {t.githubCreateAndPush || 'Create repo and push'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                className={fieldClass}
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                placeholder={t.repositoryUrlPlaceholder}
                                            />
                                            <input
                                                className={fieldClass}
                                                value={branch}
                                                onChange={(e) => setBranch(e.target.value)}
                                                placeholder={t.branch}
                                            />
                                            <button
                                                type="button"
                                                disabled={busy || ! url.trim()}
                                                className={`inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-medium ${LAB_BTN_PRIMARY}`}
                                                onClick={() => run(async () => {
                                                    if (mode === 'fork') {
                                                        await forkLabGithub({ url, branch, import: true }, projectUuid)
                                                    } else {
                                                        await linkLabGithub(projectUuid, { url, branch })
                                                    }
                                                })}
                                            >
                                                {mode === 'fork' ? (t.githubForkImport || 'Fork and import') : (t.githubLinkRepo || 'Link repository')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
