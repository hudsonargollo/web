import { useEffect, useState } from 'react'
import { LAB_BTN_OUTLINE, LAB_BTN_PRIMARY } from '../lib/labConstants'
import { publishPhaseLabel, publishStepIndex, publishSteps } from '../lib/publishProgress'
import { IconClose } from './Icons'

const fieldClass = [
    'h-10 w-full rounded-full border border-transparent bg-krikkit-surface',
    'px-4 text-sm font-normal text-krikkit-fg placeholder:text-krikkit-subtle',
    'outline-none transition focus:border-krikkit-muted/40',
    'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

function CopyField({ label, value }) {
    const [copied, setCopied] = useState(false)
    if (! value) return null

    return (
        <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-krikkit-subtle">{label}</p>
                <p className="mt-0.5 truncate font-mono text-[12px] text-krikkit-fg" title={value}>{value}</p>
            </div>
            <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(value)
                        setCopied(true)
                        window.setTimeout(() => setCopied(false), 1200)
                    } catch {
                        /* ignore */
                    }
                }}
            >
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    )
}

function KindCard({ selected, title, description, onClick, disabled = false }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={[
                'flex flex-1 flex-col rounded-xl border px-3 py-2.5 text-left transition',
                selected
                    ? 'border-accent bg-accent/5'
                    : 'border-krikkit-line hover:bg-krikkit-soft',
                disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
        >
            <span className="text-sm font-medium text-krikkit-fg">{title}</span>
            <span className="mt-0.5 text-[12px] leading-snug text-krikkit-muted">{description}</span>
        </button>
    )
}

function PublishProgress({ buildPhase, buildLogs, logRef, publishingInBrowser }) {
    const steps = publishSteps()
    const activeIndex = publishStepIndex(buildPhase)
    const buildMessage = publishPhaseLabel(buildPhase)

    return (
        <div className="mt-4 space-y-3 rounded-xl border border-krikkit-line bg-krikkit-surface px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-krikkit-fg">Publishing</p>
                {buildMessage ? (
                    <p className="truncate text-[12px] text-krikkit-muted">{buildMessage}</p>
                ) : null}
            </div>

            <ol className="flex flex-wrap gap-1.5">
                {steps.map((step, index) => {
                    const done = activeIndex > index
                    const active = activeIndex === index
                    return (
                        <li
                            key={step.id}
                            className={[
                                'rounded-full px-2.5 py-1 text-[11px] font-medium',
                                done
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : active
                                        ? 'bg-accent/15 text-accent-content'
                                        : 'bg-krikkit-soft text-krikkit-subtle',
                            ].join(' ')}
                        >
                            {step.label}
                        </li>
                    )
                })}
            </ol>

            {publishingInBrowser ? (
                <p className="text-[12px] leading-relaxed text-krikkit-muted">
                    Keep this tab open until publishing finishes. Uses a lightweight esbuild build to stay within browser memory — close other heavy tabs if needed.
                </p>
            ) : null}

            <div
                ref={logRef}
                className="max-h-36 overflow-y-auto rounded-lg border border-krikkit-line bg-krikkit-canvas px-2.5 py-2 font-mono text-[11px] leading-relaxed text-krikkit-muted"
            >
                {buildLogs.length ? (
                    buildLogs.map((line, index) => (
                        <div key={`${index}-${line.slice(0, 24)}`} className="whitespace-pre-wrap break-all">
                            {line}
                        </div>
                    ))
                ) : (
                    <div className="text-krikkit-subtle">Starting…</div>
                )}
            </div>
        </div>
    )
}

/**
 * Publish a Lab site to a Krikkit subdomain or a custom domain.
 */
export function PublishModal({
    open = false,
    payload = null,
    busy = false,
    buildPhase = '',
    buildLogs = [],
    logRef = null,
    publishingInBrowser = false,
    staleBuild = false,
    error = '',
    onClose,
    onPublish,
    onContinuePublish,
    onVerify,
    onUnpublish,
}) {
    const publication = payload?.publication || {}
    const config = payload?.config || {}
    const [kind, setKind] = useState('subdomain')
    const [subdomain, setSubdomain] = useState('')
    const [customHost, setCustomHost] = useState('')

    useEffect(() => {
        if (! open || ! payload) return
        setKind(publication.kind === 'custom' ? 'custom' : 'subdomain')
        setSubdomain(publication.subdomain || '')
        setCustomHost(publication.custom_host || '')
    }, [open, payload, publication.kind, publication.subdomain, publication.custom_host])

    if (! open) return null

    const customAllowed = Boolean(config.custom_domain_allowed)
    const customSubdomainAllowed = Boolean(config.custom_subdomain_allowed)
    const parent = config.parent_domain || 'localhost'
    const status = publication.status || 'idle'
    const live = status === 'live'
    const activeBuild = Boolean(buildPhase) || busy
    const building = activeBuild || staleBuild
    const hostDirty = customHost.trim() !== (publication.custom_host || '')
    const needsVerification = kind === 'custom' && (! publication.verified || hostDirty)
    const upgradeUrl = config.upgrade_url || '/dashboard/packs'
    const visitUrl = publication.url

    const handleClose = () => {
        if (publishingInBrowser) return
        onClose?.()
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Dismiss"
                onClick={handleClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="lab-publish-title"
                className="relative flex max-h-[min(36rem,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-krikkit-line bg-krikkit-canvas"
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-krikkit-line px-5 py-4">
                    <div className="min-w-0">
                        <h2 id="lab-publish-title" className="text-base font-semibold text-krikkit-fg">
                            Publish
                        </h2>
                        <p className="mt-0.5 text-xs text-krikkit-muted">
                            {live ? 'This site is live. Publish again to ship the latest files.' : 'Put this project on the web.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={publishingInBrowser}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Close"
                    >
                        <IconClose className="h-4 w-4" />
                    </button>
                </div>

                <div className="krikkit-scroll-hover min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <div className="flex gap-2">
                        <KindCard
                            selected={kind === 'subdomain'}
                            title="Subdomain"
                            description={customSubdomainAllowed
                                ? `Pick a name on ${parent}`
                                : `Random address on ${parent}`}
                            onClick={() => setKind('subdomain')}
                        />
                        <KindCard
                            selected={kind === 'custom'}
                            title="Custom domain"
                            description={customAllowed ? 'Your own hostname' : 'Pro & Agency'}
                            disabled={! customAllowed}
                            onClick={() => customAllowed && setKind('custom')}
                        />
                    </div>

                    {kind === 'subdomain' ? (
                        <label className="mt-4 block">
                            <span className="mb-1.5 block text-xs font-medium text-krikkit-muted">Address</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={subdomain}
                                    onChange={(event) => {
                                        if (! customSubdomainAllowed) return
                                        setSubdomain(event.target.value.toLowerCase())
                                    }}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    readOnly={! customSubdomainAllowed}
                                    className={fieldClass}
                                    placeholder={customSubdomainAllowed ? 'my-site' : ''}
                                    disabled={activeBuild || building}
                                />
                                <span className="shrink-0 text-sm text-krikkit-muted">.{parent}</span>
                            </div>
                            <p className="mt-1.5 text-[12px] leading-relaxed text-krikkit-muted">
                                {customSubdomainAllowed
                                    ? 'This becomes the public URL on the app domain.'
                                    : 'Your pack assigns a random 12-character address. Upgrade to choose the slug.'}
                            </p>
                            {! customSubdomainAllowed ? (
                                <a href={upgradeUrl} className="mt-2 inline-block text-[12px] font-medium text-accent-content">
                                    View packs
                                </a>
                            ) : null}
                        </label>
                    ) : customAllowed ? (
                        <div className="mt-4 space-y-3">
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-krikkit-muted">Domain</span>
                                <input
                                    type="text"
                                    value={customHost}
                                    onChange={(event) => setCustomHost(event.target.value.toLowerCase())}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    className={fieldClass}
                                    placeholder="www.studio.com"
                                    disabled={activeBuild || building}
                                />
                            </label>

                            <div className="rounded-xl border border-krikkit-line bg-krikkit-surface px-3.5 py-3">
                                <p className="text-sm font-medium text-krikkit-fg">At your DNS host</p>
                                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-krikkit-muted">
                                    <li>
                                        CNAME the host (usually <span className="font-medium text-krikkit-fg">www</span>) to{' '}
                                        <span className="font-mono text-krikkit-fg">{config.cname_target || parent}</span>.
                                    </li>
                                    <li>
                                        Apex (@) often cannot CNAME — add an A record to{' '}
                                        <span className="font-mono text-krikkit-fg">{config.a_record || 'this server’s IP'}</span>
                                        {config.a_record ? '' : ' (ask your host if unsure)'}.
                                    </li>
                                    <li>
                                        TXT <span className="font-mono text-krikkit-fg">{config.txt_host || '_krikkit-lab'}</span>
                                        {' = '}
                                        <span className="font-mono text-[12px] text-krikkit-fg">{config.txt_value}</span>
                                        {' '}so we can confirm you own it. Wait a few minutes, then Verify.
                                    </li>
                                </ol>
                                <div className="mt-3 space-y-2 border-t border-krikkit-line pt-3">
                                    <CopyField label="CNAME target" value={config.cname_target} />
                                    {config.a_record ? <CopyField label="A record" value={config.a_record} /> : null}
                                    <CopyField label="TXT name" value={config.txt_host} />
                                    <CopyField label="TXT value" value={config.txt_value} />
                                </div>
                                {publication.verified ? (
                                    <p className="mt-3 text-[13px] text-emerald-600 dark:text-emerald-400">Domain verified.</p>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-xl border border-krikkit-line px-3.5 py-3">
                            <p className="text-sm text-krikkit-muted">
                                Custom domains are on Pro and Agency. A subdomain still works on your current pack.
                            </p>
                            <a
                                href={upgradeUrl}
                                className={`mt-3 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                            >
                                View packs
                            </a>
                        </div>
                    )}

                    {activeBuild ? (
                        <PublishProgress
                            buildPhase={buildPhase}
                            buildLogs={buildLogs}
                            logRef={logRef}
                            publishingInBrowser={publishingInBrowser}
                        />
                    ) : null}
                    {staleBuild ? (
                        <div className="mt-4 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
                            <p className="text-sm leading-relaxed text-krikkit-fg">
                                The last publish stopped before the build finished. Click Continue to pick up where it left off.
                            </p>
                            <p className="text-[12px] leading-relaxed text-krikkit-muted">
                                If the tab crashed with “Out of Memory”, close other tabs, refresh this page, then try again.
                            </p>
                            {error ? (
                                <p className="text-[12px] leading-relaxed text-red-600 dark:text-red-400">{error}</p>
                            ) : publication.last_error ? (
                                <p className="text-[12px] leading-relaxed text-red-600 dark:text-red-400">{publication.last_error}</p>
                            ) : null}
                            {buildLogs.length ? (
                                <div className="max-h-28 overflow-y-auto rounded-lg border border-krikkit-line bg-krikkit-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-krikkit-muted">
                                    {buildLogs.slice(-8).map((line, index) => (
                                        <div key={`${index}-${line}`}>{line}</div>
                                    ))}
                                </div>
                            ) : null}
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onContinuePublish?.()}
                                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                            >
                                Continue publishing
                            </button>
                        </div>
                    ) : null}
                    {status === 'failed' && publication.last_error ? (
                        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{publication.last_error}</p>
                    ) : null}
                    {error && ! staleBuild ? (
                        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
                    ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-krikkit-line px-5 py-3">
                    {live && visitUrl ? (
                        <a
                            href={visitUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`mr-auto inline-flex items-center rounded-lg px-3 py-2 text-sm ${LAB_BTN_OUTLINE}`}
                        >
                            Open site
                        </a>
                    ) : (
                        <span className="mr-auto" />
                    )}
                    {live ? (
                        <button
                            type="button"
                            disabled={busy || activeBuild}
                            onClick={onUnpublish}
                            className="rounded-lg px-3 py-2 text-sm text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg disabled:opacity-40"
                        >
                            Unpublish
                        </button>
                    ) : null}
                    {kind === 'custom' && customAllowed && needsVerification ? (
                        <button
                            type="button"
                            disabled={busy || activeBuild || ! customHost.trim()}
                            onClick={() => onVerify({ kind, subdomain, custom_host: customHost })}
                            className={`rounded-lg px-3 py-2 text-sm font-medium ${LAB_BTN_OUTLINE}`}
                        >
                            Verify DNS
                        </button>
                    ) : null}
                    <button
                        type="button"
                            disabled={busy || activeBuild || (kind === 'custom' && (! customAllowed || needsVerification))}
                            onClick={() => (staleBuild ? onContinuePublish?.() : onPublish({ kind, subdomain, custom_host: customHost }))}
                            className={`rounded-lg px-3 py-2 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                        >
                            {activeBuild ? 'Publishing…' : staleBuild ? 'Continue publishing' : live ? 'Update' : 'Publish'}
                    </button>
                </div>
            </div>
        </div>
    )
}
