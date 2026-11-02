import { useCallback, useSyncExternalStore } from 'react'
import { buildRepairPayload } from '../lib/buildRepairPayload'
import {
    activeRepairTarget,
    addConsoleError,
    buildAutoRepairMeta,
    buildAutoRepairPrompt,
    clearActiveErrors,
    clearAllLabErrors,
    clearBuildError,
    clearConsoleErrors,
    dismissErrorCard,
    getLabErrors,
    hasActiveLabErrors,
    presentLabError,
    setBuildError,
    subscribeLabErrors,
    summarizeLabError,
} from '../lib/labErrors'

/**
 * React binding for the Lab error collector (`labErrors`).
 * @param {{ getVfsContents?: () => Record<string, string> }} [options]
 */
export function useErrorStore(options = {}) {
    const snapshot = useSyncExternalStore(subscribeLabErrors, getLabErrors, getLabErrors)
    const getVfsContents = options.getVfsContents

    const resolvePayload = useCallback(() => {
        const snap = getLabErrors()
        const vfsContents = typeof getVfsContents === 'function' ? (getVfsContents() || {}) : {}
        return buildRepairPayload({
            buildError: snap.buildError,
            consoleErrors: snap.consoleErrors,
            vfsContents,
        })
    }, [getVfsContents])

    const requestRepair = useCallback((send) => {
        const payload = resolvePayload()
        if (! payload?.meta || typeof send !== 'function') return null

        // Drop collected faults before the turn so the card does not re-fire.
        clearAllLabErrors()
        send({
            content: '',
            attachments: [],
            autoRepair: payload.meta,
        })
        return payload.meta
    }, [resolvePayload])

    const repairPayload = (() => {
        if (! hasActiveLabErrors(snapshot) || snapshot.dismissed) return null
        const vfsContents = typeof getVfsContents === 'function' ? (getVfsContents() || {}) : {}
        return buildRepairPayload({
            buildError: snapshot.buildError,
            consoleErrors: snapshot.consoleErrors,
            vfsContents,
        })
    })()

    const repairTarget = repairPayload?.meta
        ? {
            type: repairPayload.meta.errorType,
            badge: repairPayload.meta.errorType === 'BUILD_ERROR' ? 'Build Failure' : 'Runtime Error',
            message: repairPayload.meta.message,
            stack: repairPayload.meta.stack,
            file: repairPayload.meta.file,
            line: repairPayload.meta.line,
            component: repairPayload.meta.component,
            errors: repairPayload.meta.errors,
            errorCount: repairPayload.meta.errors?.length || 1,
        }
        : activeRepairTarget(snapshot)

    return {
        buildError: snapshot.buildError,
        consoleErrors: snapshot.consoleErrors,
        dismissed: snapshot.dismissed,
        visible: hasActiveLabErrors(snapshot) && ! snapshot.dismissed,
        repairTarget,
        summary: summarizeLabError(repairTarget),
        presented: presentLabError(repairTarget),
        setBuildError,
        clearBuildError,
        addConsoleError,
        clearConsoleErrors,
        clearActiveErrors,
        clearAll: clearAllLabErrors,
        dismiss: dismissErrorCard,
        requestRepair,
        buildAutoRepairPrompt,
        buildAutoRepairMeta,
    }
}
