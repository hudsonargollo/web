import { useCallback, useEffect, useRef, useState } from 'react'
import { isEntitlementDenied } from '../lib/entitlement'
import { buildLabPublishArtifact } from '../lib/publishBuild'
import { appendPublishLog } from '../lib/publishProgress'
import {
    fetchLabPublish,
    saveLabPublish,
    unpublishLabSite,
    uploadLabPublishArtifact,
    verifyLabPublish,
} from '../lib/publish'

export function useLabPublish(projectUuid, { getFiles } = {}) {
    const [open, setOpen] = useState(false)
    const [payload, setPayload] = useState(null)
    const [busy, setBusy] = useState(false)
    const [buildPhase, setBuildPhase] = useState('')
    const [buildLogs, setBuildLogs] = useState([])
    const [error, setError] = useState('')
    const pollRef = useRef(0)
    const buildAbortRef = useRef(null)
    const logRef = useRef(null)

    const appendLog = useCallback((line) => {
        setBuildLogs((current) => appendPublishLog(current, line))
    }, [])

    const apply = useCallback((next) => {
        setPayload(next)
        setError('')
    }, [])

    const fail = useCallback((caught) => {
        if (isEntitlementDenied(caught)) {
            setError(caught?.payload?.message || caught?.message || 'Custom domain is locked on your pack.')
            if (caught?.payload) {
                setPayload((current) => {
                    if (! current) return current
                    return {
                        ...current,
                        config: {
                            ...current.config,
                            custom_domain_allowed: false,
                            upgrade_url: caught.payload?.entitlement?.upgrade_url || current.config?.upgrade_url,
                        },
                    }
                })
            }
            return
        }
        setError(caught?.message || 'Could not update publish settings.')
    }, [])

    const refresh = useCallback(async () => {
        if (! projectUuid) return null
        const next = await fetchLabPublish(projectUuid)
        apply(next)
        return next
    }, [apply, projectUuid])

    useEffect(() => {
        if (! projectUuid) {
            setPayload(null)
            return undefined
        }
        let cancelled = false
        fetchLabPublish(projectUuid)
            .then((next) => {
                if (! cancelled) apply(next)
            })
            .catch(() => {
                /* header badge stays idle until the modal opens */
            })
        return () => {
            cancelled = true
        }
    }, [apply, projectUuid])

    useEffect(() => {
        if (! open || ! projectUuid) return undefined
        refresh().catch((caught) => fail(caught))
        return undefined
    }, [fail, open, projectUuid, refresh])

    useEffect(() => {
        const orphanedBuild = payload?.publication?.status === 'building'
            && ! busy
            && ! buildPhase
        if (! open || ! projectUuid || ! orphanedBuild) return undefined

        pollRef.current = window.setInterval(() => {
            fetchLabPublish(projectUuid)
                .then((next) => apply(next))
                .catch(() => {})
        }, 15000)

        return () => {
            window.clearInterval(pollRef.current)
        }
    }, [apply, buildPhase, busy, open, payload?.publication?.status, projectUuid])

    useEffect(() => () => {
        buildAbortRef.current?.abort()
    }, [])

    useEffect(() => {
        if (! logRef.current) return
        logRef.current.scrollTop = logRef.current.scrollHeight
    }, [buildLogs, buildPhase])

    const publishingInBrowser = Boolean(buildPhase)

    useEffect(() => {
        const activeBuild = buildPhase && buildPhase !== 'preparing'
        if (! activeBuild) return undefined

        const onBeforeUnload = (event) => {
            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [buildPhase])

    const runBrowserBuild = useCallback(async () => {
        if (! projectUuid) return null

        buildAbortRef.current?.abort()
        const ac = new AbortController()
        buildAbortRef.current = ac
        appendLog('Starting build…')
        setBuildPhase('sync')

        try {
            const blob = await buildLabPublishArtifact({
                getFiles: typeof getFiles === 'function' ? getFiles : undefined,
                signal: ac.signal,
                onPhase: (phase, detail) => {
                    setBuildPhase(phase)
                    if (detail?.line) appendLog(detail.line)
                },
                onLog: appendLog,
            })

            if (ac.signal.aborted) return null

            appendLog('Uploading build to server…')
            setBuildPhase('uploading')
            const final = await uploadLabPublishArtifact(projectUuid, blob)
            appendLog('Upload complete — site is live.')
            apply(final)
            return final
        } finally {
            if (buildAbortRef.current === ac) {
                buildAbortRef.current = null
            }
            setBuildPhase('')
        }
    }, [appendLog, apply, getFiles, projectUuid])

    const publish = useCallback(async (input) => {
        if (! projectUuid) return
        setBusy(true)
        setError('')
        setBuildLogs([])
        setBuildPhase('preparing')
        appendLog('Saving publish settings…')
        try {
            const next = await saveLabPublish(projectUuid, {
                kind: input.kind,
                subdomain: input.subdomain,
                custom_host: input.custom_host,
            })
            apply(next)

            if (next?.publication?.status === 'building') {
                appendLog('Settings saved — starting build.')
                await runBrowserBuild()
            } else {
                setBuildPhase('')
            }
        } catch (caught) {
            fail(caught)
            appendLog(caught?.message || 'Publish failed.')
        } finally {
            setBusy(false)
        }
    }, [appendLog, apply, fail, projectUuid, runBrowserBuild])

    const continuePublish = useCallback(async () => {
        if (! projectUuid || busy || buildPhase) return
        setBusy(true)
        setError('')
        setBuildPhase('preparing')
        appendLog('Resuming publish build…')
        try {
            await runBrowserBuild()
        } catch (caught) {
            fail(caught)
            appendLog(caught?.message || 'Publish failed.')
        } finally {
            setBusy(false)
        }
    }, [appendLog, buildPhase, busy, fail, projectUuid, runBrowserBuild])

    const verify = useCallback(async (input) => {
        if (! projectUuid) return
        setBusy(true)
        setError('')
        try {
            await saveLabPublish(projectUuid, {
                kind: 'custom',
                subdomain: input.subdomain,
                custom_host: input.custom_host,
            })
            const next = await verifyLabPublish(projectUuid)
            apply(next)
        } catch (caught) {
            fail(caught)
        } finally {
            setBusy(false)
        }
    }, [apply, fail, projectUuid])

    const unpublish = useCallback(async () => {
        if (! projectUuid) return
        setBusy(true)
        setError('')
        try {
            const next = await unpublishLabSite(projectUuid)
            apply(next)
        } catch (caught) {
            fail(caught)
        } finally {
            setBusy(false)
        }
    }, [apply, fail, projectUuid])

    return {
        open,
        setOpen,
        payload,
        busy,
        buildPhase,
        buildLogs,
        logRef,
        publishingInBrowser,
        staleBuild: payload?.publication?.status === 'building' && ! buildPhase && ! busy,
        error,
        status: payload?.publication?.status || 'idle',
        enabled: payload?.config?.enabled !== false,
        publish,
        continuePublish,
        verify,
        unpublish,
    }
}
