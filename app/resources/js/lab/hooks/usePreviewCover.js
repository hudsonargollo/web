import { useEffect, useRef } from 'react'
import {
    fingerprintCover,
    grabPreviewCover,
    resetPreviewCoverLib,
    uploadPreviewCover,
} from '../lib/previewCover'

const SETTLE_MS = 3000
const MAX_TRIES = 8

/**
 * Persist a Studio cover only after chrome shows live (guest actually painted).
 */
export function usePreviewCover({
    iframeRef,
    projectUuid = null,
    enabled = false,
    paintKey = '',
}) {
    const timerRef = useRef(0)
    const genRef = useRef(0)
    const lastFpRef = useRef('')
    const inflightRef = useRef(false)

    useEffect(() => {
        if (! enabled || ! projectUuid) return undefined

        resetPreviewCoverLib()
        const gen = ++genRef.current
        window.clearTimeout(timerRef.current)
        let tries = 0

        const run = async ({ keepalive = false } = {}) => {
            if (inflightRef.current && ! keepalive) return false
            const iframe = iframeRef?.current
            if (! iframe) return false

            inflightRef.current = true
            try {
                const blob = await grabPreviewCover(iframe)
                if (! blob || (gen !== genRef.current && ! keepalive)) return false
                const fingerprint = await fingerprintCover(blob)
                if (fingerprint && fingerprint === lastFpRef.current) return true
                await uploadPreviewCover(projectUuid, blob, { keepalive })
                lastFpRef.current = fingerprint
                return true
            } catch {
                return false
            } finally {
                inflightRef.current = false
            }
        }

        const tick = async () => {
            if (gen !== genRef.current) return
            const ok = await run()
            if (ok || gen !== genRef.current) return
            tries += 1
            if (tries >= MAX_TRIES) return
            timerRef.current = window.setTimeout(() => {
                void tick()
            }, SETTLE_MS)
        }

        timerRef.current = window.setTimeout(() => {
            void tick()
        }, SETTLE_MS)

        const flush = () => {
            window.clearTimeout(timerRef.current)
            void run({ keepalive: true })
        }

        window.addEventListener('pagehide', flush)
        const onHide = () => {
            if (document.visibilityState === 'hidden') flush()
        }
        document.addEventListener('visibilitychange', onHide)

        return () => {
            window.clearTimeout(timerRef.current)
            window.removeEventListener('pagehide', flush)
            document.removeEventListener('visibilitychange', onHide)
        }
    }, [enabled, iframeRef, paintKey, projectUuid])
}
