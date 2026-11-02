import { featureAllowed, readLabEntitlement } from '../lib/entitlement'

const IS_APPLE = typeof navigator !== 'undefined'
    && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '')
const MOD = IS_APPLE ? '⌘' : 'Ctrl+'

function LabSwitch({ checked, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange?.(! checked)}
            className={[
                'relative h-6 w-10 shrink-0 rounded-full transition',
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

function SettingsRow({ title, description, children }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-krikkit-line py-4 last:border-b-0">
            <div className="min-w-0">
                <p className="text-sm font-medium text-krikkit-fg">{title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-krikkit-muted">{description}</p>
            </div>
            <div className="shrink-0 pt-0.5">
                {children}
            </div>
        </div>
    )
}

/**
 * Workspace preferences — auto-save and shortcuts.
 */
export function AppSettingsPanel({
    autoSave = false,
    onToggleAutoSave,
}) {
    const entitlement = readLabEntitlement()
    const customDomainAllowed = featureAllowed(entitlement, 'custom_domain')
    return (
        <div className="flex h-full min-h-0 flex-col bg-krikkit-canvas">
            <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-krikkit-line bg-krikkit-canvas px-3">
                <p className="min-w-0 truncate text-xs font-medium text-krikkit-fg">
                    App settings
                </p>
            </div>

            <div className="krikkit-scroll-hover min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-6">
                <div className="mx-auto w-full max-w-xl">
                    <SettingsRow
                        title="Auto save"
                        description="Write edits to disk as you type. When off, use Ctrl+S or the save tray."
                    >
                        <LabSwitch
                            checked={autoSave}
                            onChange={onToggleAutoSave}
                            label="Auto save"
                        />
                    </SettingsRow>

                    <SettingsRow
                        title="Custom subdomain"
                        description={featureAllowed(entitlement, 'custom_subdomain')
                            ? 'Use Publish to pick the slug on the app domain.'
                            : 'Without this, Lab assigns a random 12-character address.'}
                    >
                        <span className="text-xs font-medium text-krikkit-muted">
                            {featureAllowed(entitlement, 'custom_subdomain') ? 'Included' : 'Locked'}
                        </span>
                    </SettingsRow>

                    <SettingsRow
                        title="GitHub"
                        description={featureAllowed(entitlement, 'github_import')
                            ? 'Push, pull, fork, and compare this workspace against a GitHub repo.'
                            : 'GitHub import, push, and fork are available on Pro and Agency.'}
                    >
                        {featureAllowed(entitlement, 'github_import') ? (
                            <button
                                type="button"
                                className="rounded-full border border-krikkit-line px-3 py-1.5 text-xs font-medium text-krikkit-fg transition hover:bg-krikkit-soft"
                                onClick={() => window.dispatchEvent(new CustomEvent('lab-github-open'))}
                            >
                                Manage
                            </button>
                        ) : (
                            <span className="text-xs font-medium text-krikkit-muted">Locked</span>
                        )}
                    </SettingsRow>

                    <div className="py-4">
                        <p className="text-sm font-medium text-krikkit-fg">Shortcuts</p>
                        <p className="mt-0.5 text-[13px] text-krikkit-muted">
                            Same actions as the + menu on the tab strip.
                        </p>
                        <ul className="mt-3 space-y-1.5 text-[13px] text-krikkit-muted">
                            <li className="flex justify-between gap-4">
                                <span>Files</span>
                                <span className="tabular-nums text-krikkit-subtle">{MOD}⇧E</span>
                            </li>
                            <li className="flex justify-between gap-4">
                                <span>Console</span>
                                <span className="tabular-nums text-krikkit-subtle">{MOD}`</span>
                            </li>
                            <li className="flex justify-between gap-4">
                                <span>New file</span>
                                <span className="tabular-nums text-krikkit-subtle">{MOD}N</span>
                            </li>
                            <li className="flex justify-between gap-4">
                                <span>Find file</span>
                                <span className="tabular-nums text-krikkit-subtle">{MOD}P</span>
                            </li>
                            <li className="flex justify-between gap-4">
                                <span>Recently opened</span>
                                <span className="tabular-nums text-krikkit-subtle">{MOD}E</span>
                            </li>
                            <li className="flex justify-between gap-4">
                                <span>App settings</span>
                                <span className="tabular-nums text-krikkit-subtle">{MOD},</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
