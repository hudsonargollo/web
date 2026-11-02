/**
 * Monthly Lab credit balance for the header + exhausted notice.
 */

import { readLabEntitlement } from './entitlement'

export const LAB_CREDITS_CHANGE = 'krikkit:lab-credits'
export const LAB_CREDITS_EXHAUSTED = 'krikkit:lab-credits-exhausted'

export function readLabCredits() {
    const snapshot = readLabEntitlement()
    const row = snapshot?.credits || snapshot?.quotas?.lab_credits || null
    if (! row || typeof row !== 'object') {
        return null
    }

    return {
        used: Number(row.used) || 0,
        limit: row.limit == null ? null : Number(row.limit),
        remaining: row.remaining == null ? null : Number(row.remaining),
        unlimited: Boolean(row.unlimited),
        window: row.window || 'monthly',
        charged: Number(row.charged) || 0,
        upgradeUrl: snapshot?.upgrade_url || '/dashboard/packs',
        planTitle: snapshot?.plan?.title || '',
        suggestedTitle: snapshot?.suggested_plan?.title || '',
    }
}

export function publishLabCredits(partial) {
    if (typeof window === 'undefined' || ! partial || typeof partial !== 'object') {
        return
    }
    window.dispatchEvent(new CustomEvent(LAB_CREDITS_CHANGE, { detail: partial }))
}

export function publishCreditsExhausted(payload) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(LAB_CREDITS_EXHAUSTED, { detail: payload || {} }))
}
