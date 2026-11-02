/**
 * Pin the Lab runtime browser host before boot/terminal calls.
 * Do not import createBrowserHost from labRuntimeEngine — the dist re-export can
 * be undefined when browser-host is still on TLA chunks.
 */
import { ensureRuntimeHost } from './labRuntimeEngine'

let pinned = false
/** @type {Promise<void>|null} */
let pinPromise = null

export function pinLabRuntimeHost() {
    if (pinned) {
        return pinPromise || Promise.resolve()
    }

    pinPromise = (async () => {
        const factory =
            globalThis.__KRIKKIT_LAB_CREATE_BROWSER_HOST__
            ?? globalThis.__DEEPTHOUGHT_CREATE_BROWSER_HOST__
        if (typeof factory === 'function') {
            const { setRuntimeHost } = await import('./labRuntimeEngine')
            setRuntimeHost(factory())
            pinned = true
            return
        }

        await ensureRuntimeHost()
        pinned = true
    })()

    return pinPromise
}

/** @deprecated Use pinLabRuntimeHost */
export const pinDeepThoughtBrowserHost = pinLabRuntimeHost
