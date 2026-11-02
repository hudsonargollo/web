import { useEffect, useState } from 'react'
import { LAB_CREDITS_CHANGE, readLabCredits } from '../lib/labCredits'
import { readDeskPrefs } from '../lib/deskChime'

export function CreditBalanceBadge({ inProject = false }) {
    const [credits, setCredits] = useState(() => readLabCredits())
    const visible = inProject && readDeskPrefs().show_token_usage

    useEffect(() => {
        const onChange = (event) => {
            const detail = event?.detail
            if (! detail || typeof detail !== 'object') return
            setCredits((prev) => ({ ...(prev || {}), ...detail }))
        }
        window.addEventListener(LAB_CREDITS_CHANGE, onChange)
        return () => window.removeEventListener(LAB_CREDITS_CHANGE, onChange)
    }, [])

    if (! visible || ! credits) return null

    if (credits.unlimited) {
        return (
            <div
                className="flex h-5 shrink-0 items-center font-mono text-[11px] leading-none tabular-nums text-krikkit-muted"
                title="Lab credits this month"
            >
                Credits
                <span
                    className="ml-1 inline-flex h-5 items-center text-krikkit-fg"
                    aria-label="Unlimited"
                >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            d="M7.5 8.25c2.7 0 4.2 2.55 4.5 3.75.3-1.2 1.8-3.75 4.5-3.75 2.4 0 4.5 1.95 4.5 4.5s-2.1 4.5-4.5 4.5c-2.7 0-4.2-2.55-4.5-3.75-.3 1.2-1.8 3.75-4.5 3.75-2.4 0-4.5-1.95-4.5-4.5s2.1-4.5 4.5-4.5Z"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </div>
        )
    }

    const limit = Number(credits.limit) || 0
    const remaining = credits.remaining == null
        ? Math.max(0, limit - (Number(credits.used) || 0))
        : Math.max(0, Number(credits.remaining) || 0)
    const depleted = limit > 0 && remaining <= 0
    const low = ! depleted && limit > 0 && remaining / limit <= 0.12

    return (
        <div
            className={[
                'flex h-5 shrink-0 items-center font-mono text-[11px] leading-none tabular-nums',
                depleted ? 'text-red-600 dark:text-red-400' : low ? 'text-amber-700 dark:text-amber-300' : 'text-krikkit-muted',
            ].join(' ')}
            title="Lab credits this month"
        >
            Credits
            {' '}
            <span className={depleted || low ? 'ml-1 font-medium' : 'ml-1 text-krikkit-fg'}>
                {remaining.toLocaleString()}
                {' / '}
                {limit.toLocaleString()}
            </span>
        </div>
    )
}
