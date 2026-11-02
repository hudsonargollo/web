import { createBackgroundFrameLoop, isDocumentHidden } from '../lib/backgroundFrame.js'

/**
 * Stream-safe KRIKKIT_META filter.
 * Holds back chunks that might be mid-tag so the UI never paints raw meta.
 * Emits a discrete proposal signal when a complete meta block is detected.
 *
 * Ready for SSE/Reverb: feed `push(chunk)`; listen for `{ type: 'proposal' }`.
 */

const META_OPEN = '<<<KRIKKIT_META'
const HOLD_TAIL = META_OPEN.length - 1

/**
 * @param {{
 *   onVisible?: (text: string) => void,
 *   onProposal?: (propose: boolean) => void,
 *   onEvent?: (event: { type: string, propose_workspace?: boolean }) => void,
 * }} hooks
 */
export function createMetaStreamBuffer(hooks = {}) {
    let visible = ''
    let pending = ''
    let inMeta = false
    let metaBody = ''
    let proposeWorkspace = false

    function emitVisible(next) {
        visible = next
        hooks.onVisible?.(visible)
    }

    function emitProposal(flag) {
        proposeWorkspace = Boolean(flag) || proposeWorkspace
        hooks.onProposal?.(proposeWorkspace)
        hooks.onEvent?.({ type: 'proposal', propose_workspace: proposeWorkspace })
    }

    function push(chunk) {
        const piece = String(chunk ?? '')
        if (! piece) return { visible, propose_workspace: proposeWorkspace }

        pending += piece

        while (pending.length) {
            if (inMeta) {
                const endA = pending.search(/KRIKKIT_META/)
                const endB = pending.indexOf('>>>')
                let end = -1
                let endLen = 0
                if (endA >= 0 && (endB < 0 || endA <= endB)) {
                    end = endA
                    endLen = 'KRIKKIT_META'.length
                } else if (endB >= 0) {
                    end = endB
                    endLen = 3
                }

                if (end < 0) {
                    metaBody += pending
                    pending = ''
                    break
                }

                metaBody += pending.slice(0, end)
                pending = pending.slice(end + endLen)
                inMeta = false
                if (payloadIsTrue(metaBody)) emitProposal(true)
                metaBody = ''
                continue
            }

            const open = pending.indexOf(META_OPEN)
            if (open >= 0) {
                emitVisible(visible + pending.slice(0, open))
                pending = pending.slice(open + META_OPEN.length)
                inMeta = true
                metaBody = ''
                continue
            }

            // Hold back a suffix that could be the start of META_OPEN.
            if (pending.length > HOLD_TAIL) {
                const flush = pending.slice(0, pending.length - HOLD_TAIL)
                pending = pending.slice(pending.length - HOLD_TAIL)
                // Also strip completed fenced proposal blocks from the flush window.
                const scrubbed = scrubCompleteMetaArtifacts(flush)
                if (scrubbed.propose) emitProposal(true)
                emitVisible(visible + scrubbed.text)
            }
            break
        }

        return { visible, propose_workspace: proposeWorkspace }
    }

    function finish(remainder = '') {
        if (remainder) push(remainder)

        if (inMeta) {
            // Unclosed meta — drop it (never leak) and try to parse body.
            if (payloadIsTrue(metaBody)) emitProposal(true)
            inMeta = false
            metaBody = ''
        }

        if (pending) {
            const scrubbed = scrubCompleteMetaArtifacts(pending)
            if (scrubbed.propose) emitProposal(true)
            emitVisible(visible + scrubbed.text)
            pending = ''
        }

        // Final scrub of any leftover artifacts in visible text.
        const final = scrubCompleteMetaArtifacts(visible)
        if (final.propose) emitProposal(true)
        // Trim only once on the completed string — never on intermediate flushes.
        const cleaned = String(final.text || '').trimEnd()
        if (cleaned !== visible) emitVisible(cleaned)

        return { visible: cleaned, propose_workspace: proposeWorkspace }
    }

    return { push, finish, getVisible: () => visible, getProposal: () => proposeWorkspace }
}

/**
 * Sanitize a full assistant string for display (defense in depth after JSON responses).
 */
export function stripWorkspaceMeta(text = '') {
    const buffer = createMetaStreamBuffer()
    buffer.push(String(text || ''))
    return buffer.finish()
}

function scrubCompleteMetaArtifacts(text) {
    let propose = false
    let out = String(text || '')

    out = out.replace(/<<<KRIKKIT_META\s*[\s\S]*?(?:KRIKKIT_META|>>>)/giu, (block) => {
        const body = block.replace(/^<<<KRIKKIT_META/i, '').replace(/(?:KRIKKIT_META|>>>)\s*$/i, '')
        if (payloadIsTrue(body)) propose = true
        return ''
    })

    // Truncated / unclosed meta at end of the string — drop, never leak.
    out = out.replace(/<<<KRIKKIT_META\b[\s\S]*$/giu, (block) => {
        const body = block.replace(/^<<<KRIKKIT_META/i, '')
        if (payloadIsTrue(body)) propose = true
        return ''
    })

    out = out.replace(/```(?:json|javascript|js)?\s*([\s\S]*?)```/giu, (full, body) => {
        if (/propose[_ ]?workspace/i.test(body) && payloadIsTrue(body)) {
            propose = true
            return ''
        }
        return full
    })

    out = out.replace(/\{[^{}]*propose[_ ]?workspace[^{}]*\}/giu, (object) => {
        if (payloadIsTrue(object)) {
            propose = true
            return ''
        }
        return object
    })

    out = out.replace(/<!--\s*krikkit:propose_workspace\s*=\s*(?:true|false|1|0|"true"|"false")\s*-->/giu, (comment) => {
        if (/=\s*(?:true|1|"true")/i.test(comment)) propose = true
        return ''
    })

    // Orphan meta closers (model ended with >>> after a stripped / missing open tag).
    out = out.replace(/(^|[\s.!?…,;:])>>>\s*(?=\s|$)/g, '$1')
    out = out.replace(/>>>\s*$/g, '')
    out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ')

    // Never trimEnd here — faux-stream flushes one char at a time, and trimEnd
    // on a flush of " " permanently deletes word spaces ("Got it" → "Gotit").
    return { text: out, propose }
}

function payloadIsTrue(raw) {
    const text = String(raw || '').trim()
    try {
        const decoded = JSON.parse(text)
        if (decoded && typeof decoded === 'object') {
            const value = decoded.propose_workspace ?? decoded.proposeWorkspace ?? decoded['propose-workspace']
            return normalizeBool(value)
        }
    } catch {
        /* fall through */
    }
    const match = text.match(/propose[_ ]?workspace["']?\s*[:=]\s*["']?(true|false|1|0|yes|no)["']?/i)
    return match ? normalizeBool(match[1]) : false
}

function normalizeBool(value) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    const raw = String(value ?? '').trim().toLowerCase().replace(/^["']|["']$/g, '')
    return ['true', '1', 'yes', 'on'].includes(raw)
}

/**
 * Reveal text to the UI while buffering meta tags (client-side faux-stream + future SSE).
 *
 * Uses a visibility-aware frame loop: rAF while the tab is focused, wall-clock
 * timeouts while backgrounded. When the tab is hidden, remaining text is flushed
 * immediately so turn state / tools are not stalled by paused rAF.
 */
export function streamRevealSafe(text, onFrame, options = {}) {
    const full = String(text || '')
    const {
        msPerChar = 16,
        minMs = 900,
        maxMs = 2400,
        onProposal = null,
    } = options

    return new Promise((resolve) => {
        if (! full) {
            onFrame('')
            resolve({ visible: '', propose_workspace: false })
            return
        }

        const buffer = createMetaStreamBuffer({
            onVisible: onFrame,
            onProposal: onProposal || undefined,
        })

        // Already backgrounded — skip the faux-stream so the turn never waits on rAF.
        if (isDocumentHidden()) {
            buffer.push(full)
            resolve(buffer.finish())
            return
        }

        const durationMs = Math.min(maxMs, Math.max(minMs, full.length * msPerChar))
        const started = performance.now()
        let lastIndex = 0
        const loop = createBackgroundFrameLoop()

        const tick = (now) => {
            // Hidden tabs pause rAF — flush so generation / UI updates continue.
            const p = isDocumentHidden()
                ? 1
                : Math.min(1, (now - started) / durationMs)
            const nextIndex = Math.ceil(full.length * p)
            if (nextIndex > lastIndex) {
                buffer.push(full.slice(lastIndex, nextIndex))
                lastIndex = nextIndex
            }
            if (p < 1) {
                loop.schedule(tick)
                return
            }
            loop.cancel()
            resolve(buffer.finish())
        }

        loop.schedule(tick)
    })
}
