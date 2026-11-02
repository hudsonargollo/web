/**
 * Capture the live Lab preview for Studio project cards.
 *
 * Browsers refuse to copy iframe pixels. The guest chrome paints the live DOM
 * (radius, CSS blur, inline SVG) onto a canvas and posts a JPEG back.
 */

import html2canvas from 'html2canvas-pro'
import { isPreviewChromeMessage, postToPreview } from './previewChromeBridge'

function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
}

function dataUrlToBlob(dataUrl) {
    const raw = String(dataUrl || '')
    const comma = raw.indexOf(',')
    if (comma < 0) return null
    const head = raw.slice(0, comma)
    const body = raw.slice(comma + 1)
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg'
    try {
        const bytes = atob(body)
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i)
        return new Blob([arr], { type: mime })
    } catch {
        return null
    }
}

function canvasToBlob(canvas, mime = 'image/jpeg', quality = 0.84) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mime, quality)
    })
}

function applyColor(ctx, value, fallback) {
    const raw = String(value || '').trim()
    if (! raw || raw === 'transparent' || raw === 'none') return fallback
    try {
        ctx.fillStyle = fallback
        ctx.fillStyle = raw
        return ctx.fillStyle || fallback
    } catch {
        return fallback
    }
}

function isTransparent(value) {
    const raw = String(value || '').trim().toLowerCase()
    if (! raw || raw === 'transparent' || raw === 'none') return true
    return /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0/.test(raw) || raw.endsWith(', 0)') || raw.endsWith(',0)')
}

function visibleBox(win, el, vw, vh) {
    const style = win.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return null
    }
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return null
    if (rect.bottom < 0 || rect.right < 0 || rect.top > vh || rect.left > vw) return null
    return { style, rect }
}

function isSvgRoot(el) {
    return String(el?.tagName || '').toLowerCase() === 'svg'
}

function inSvg(el) {
    let node = el?.parentElement
    while (node) {
        if (isSvgRoot(node)) return true
        node = node.parentElement
    }
    return false
}

function cssFilter(style) {
    const filter = String(style.filter || '')
    const raw = (filter && filter !== 'none') ? filter : String(style.webkitFilter || '')
    if (! raw || raw === 'none') return ''
    if (! /blur\s*\(\s*(?:[1-9]\d*(?:\.\d+)?|\d*\.[1-9]\d*)px/i.test(raw)) return ''
    return raw
}

function roundRadii(style, w, h, scale) {
    const px = (raw) => {
        const token = String(raw || '0').trim().split(' ')[0] || '0'
        let n = Number.parseFloat(token) || 0
        if (token.includes('%')) n = (n / 100) * Math.min(w / scale, h / scale)
        n = Math.max(0, n * scale)
        const cap = Math.min(w, h) / 2
        return n > cap ? cap : n
    }
    return [
        px(style.borderTopLeftRadius),
        px(style.borderTopRightRadius),
        px(style.borderBottomRightRadius),
        px(style.borderBottomLeftRadius),
    ]
}

function clipOverflow(ctx, el, scale, win) {
    const clips = []
    let node = el?.parentElement
    while (node && node !== win.document.documentElement) {
        const st = win.getComputedStyle(node)
        const ox = String(st.overflowX || st.overflow || '')
        const oy = String(st.overflowY || st.overflow || '')
        if (['hidden', 'clip'].includes(ox) || ['hidden', 'clip'].includes(oy)) {
            clips.push({ node, st })
        }
        node = node.parentElement
    }
    for (let i = clips.length - 1; i >= 0; i -= 1) {
        const r = clips[i].node.getBoundingClientRect()
        const x = r.left * scale
        const y = r.top * scale
        const w = r.width * scale
        const h = r.height * scale
        if (w < 1 || h < 1) continue
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, roundRadii(clips[i].st, w, h, scale))
        else ctx.rect(x, y, w, h)
        ctx.clip()
    }
}

function beginPaint(ctx, el, style, scale, win, withFilter = false) {
    ctx.save()
    clipOverflow(ctx, el, scale, win)
    if (withFilter) {
        const filter = cssFilter(style)
        if (filter) ctx.filter = filter
    }
    const opacity = Number(style.opacity)
    if (! Number.isNaN(opacity) && opacity < 1) ctx.globalAlpha = opacity
}

function fillRound(ctx, x, y, w, h, radii) {
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radii)
    else ctx.rect(x, y, w, h)
    ctx.fill()
}

function strokeRound(ctx, x, y, w, h, radii) {
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radii)
    else ctx.rect(x, y, w, h)
    ctx.stroke()
}

function svgToImage(svg, win) {
    return new Promise((resolve) => {
        try {
            const clone = svg.cloneNode(true)
            if (! clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
            const style = win.getComputedStyle(svg)
            const color = style.color || '#111111'
            const rect = svg.getBoundingClientRect()
            clone.setAttribute('width', String(Math.max(1, Math.round(rect.width))))
            clone.setAttribute('height', String(Math.max(1, Math.round(rect.height))))
            if (! clone.getAttribute('viewBox')) {
                clone.setAttribute('viewBox', svg.getAttribute('viewBox') || '0 0 24 24')
            }
            let xml = new XMLSerializer().serializeToString(clone)
            xml = xml.replace(/currentColor/g, color)
            const img = new Image()
            const timer = window.setTimeout(() => {
                img.src = ''
                resolve(null)
            }, 1500)
            img.onload = () => {
                window.clearTimeout(timer)
                resolve(img)
            }
            img.onerror = () => {
                window.clearTimeout(timer)
                resolve(null)
            }
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
        } catch {
            resolve(null)
        }
    })
}

function skipTextParent(el) {
    if (! el || inSvg(el) || isSvgRoot(el)) return true
    const tag = String(el.tagName || '').toUpperCase()
    return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'OPTION'
}

function textVisuallyHidden(el, style) {
    if (style.visibility === 'hidden' || Number(style.opacity) === 0) return true
    const indent = Number.parseFloat(style.textIndent)
    if (! Number.isNaN(indent) && indent <= -900) return true
    if (/rect\s*\(\s*0px/i.test(String(style.clip || ''))) return true
    const clipPath = String(style.clipPath || style.webkitClipPath || '')
    if (clipPath.includes('inset(50%)') || clipPath.includes('inset(100%)')) return true
    const r = el.getBoundingClientRect()
    if ((style.overflow === 'hidden' || style.overflow === 'clip') && r.width <= 1 && r.height <= 1) return true
    return false
}

function unionRect(a, b) {
    const left = Math.min(a.left, b.left)
    const top = Math.min(a.top, b.top)
    const right = Math.max(a.right, b.right)
    const bottom = Math.max(a.bottom, b.bottom)
    return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function textLines(node, win) {
    const text = String(node.textContent || '')
    if (! text.replace(/\s+/g, '').length) return []
    const range = win.document.createRange()
    const lines = []
    let current = null
    for (let i = 0; i < text.length; i += 1) {
        const ch = text.charAt(i)
        if (ch === '\n') {
            if (current) {
                lines.push(current)
                current = null
            }
            continue
        }
        let r
        try {
            range.setStart(node, i)
            range.setEnd(node, i + 1)
            r = range.getBoundingClientRect()
        } catch {
            continue
        }
        if (! r || (r.width <= 0 && r.height <= 0)) continue
        const top = Math.round(r.top)
        if (! current || Math.abs(current.top - top) > 3) {
            if (current) lines.push(current)
            current = { text: ch, rect: r, top }
        } else {
            current.text += ch
            current.rect = unionRect(current.rect, r)
        }
    }
    if (current) lines.push(current)
    return lines
}

function paintTexts(ctx, doc, win, scale, vw, vh) {
    let walker
    try {
        walker = doc.createTreeWalker(doc.body, 4)
    } catch {
        return
    }

    let node = walker.nextNode()
    while (node) {
        const el = node.parentElement
        if (! skipTextParent(el)) {
            const style = win.getComputedStyle(el)
            if (! (style.display === 'none' || textVisuallyHidden(el, style))) {
                const lines = textLines(node, win)
                if (lines.length) {
                    ctx.save()
                    clipOverflow(ctx, el, scale, win)
                    const fontSize = Math.max(7, (Number.parseFloat(style.fontSize) || 14) * scale)
                    const italic = style.fontStyle && style.fontStyle !== 'normal' ? `${style.fontStyle} ` : ''
                    ctx.font = `${italic}${style.fontWeight || 400} ${fontSize}px ${style.fontFamily || 'sans-serif'}`
                    ctx.fillStyle = applyColor(ctx, style.color, '#111111')
                    ctx.textBaseline = 'top'
                    ctx.textAlign = 'left'
                    const spacing = Number.parseFloat(style.letterSpacing)
                    if (ctx.letterSpacing !== undefined) {
                        ctx.letterSpacing = `${Number.isNaN(spacing) ? 0 : spacing * scale}px`
                    }
                    for (const line of lines) {
                        const r = line.rect
                        if (! r || r.width < 0.5 || r.height < 0.5) continue
                        if (r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue
                        const top = r.top * scale
                        const rh = r.height * scale
                        ctx.fillText(line.text.replace(/\n/g, ''), r.left * scale, top + Math.max(0, (rh - fontSize) / 2))
                    }
                    ctx.restore()
                }
            }
        }
        node = walker.nextNode()
    }
}

async function paintPreviewCanvas(iframe) {
    const doc = iframe?.contentDocument
    const win = iframe?.contentWindow
    if (! doc?.body || ! win) return null

    const vw = Math.round(win.innerWidth || iframe.clientWidth || 0)
    const vh = Math.round(win.innerHeight || iframe.clientHeight || 0)
    if (vw < 160 || vh < 90) return null

    const scale = Math.min(1, 960 / vw)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(vw * scale))
    canvas.height = Math.max(1, Math.round(vh * scale))
    const ctx = canvas.getContext('2d')
    if (! ctx) return null

    const bodyStyle = win.getComputedStyle(doc.body)
    const htmlStyle = win.getComputedStyle(doc.documentElement)
    ctx.fillStyle = applyColor(ctx, bodyStyle.backgroundColor, applyColor(ctx, htmlStyle.backgroundColor, '#ffffff'))
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const nodes = Array.from(doc.body.querySelectorAll('*')).slice(0, 1200)
    const svgTasks = []

    for (const el of nodes) {
        if (inSvg(el) || isSvgRoot(el)) continue
        const box = visibleBox(win, el, vw, vh)
        if (! box) continue
        const { style, rect } = box
        const x = rect.left * scale
        const y = rect.top * scale
        const w = rect.width * scale
        const h = rect.height * scale
        beginPaint(ctx, el, style, scale, win, true)
        if (! isTransparent(style.backgroundColor)) {
            ctx.fillStyle = applyColor(ctx, style.backgroundColor, 'transparent')
            if (ctx.fillStyle && ctx.fillStyle !== 'transparent') {
                fillRound(ctx, x, y, w, h, roundRadii(style, w, h, scale))
            }
        }
        const bw = Number.parseFloat(style.borderTopWidth) || 0
        if (bw > 0 && ! isTransparent(style.borderTopColor)) {
            ctx.strokeStyle = applyColor(ctx, style.borderTopColor, '#000')
            ctx.lineWidth = Math.max(1, bw * scale)
            strokeRound(ctx, x, y, w, h, roundRadii(style, w, h, scale))
        }
        ctx.restore()
    }

    for (const el of nodes) {
        if (inSvg(el)) continue
        const box = visibleBox(win, el, vw, vh)
        if (! box) continue
        const { style, rect } = box
        const x = rect.left * scale
        const y = rect.top * scale
        const w = rect.width * scale
        const h = rect.height * scale

        if (isSvgRoot(el)) {
            svgTasks.push({ el, x, y, w, h, style })
            continue
        }

        if (el.tagName === 'IMG' && el.complete && el.naturalWidth > 0) {
            beginPaint(ctx, el, style, scale, win, false)
            try {
                ctx.drawImage(el, x, y, w, h)
            } catch {
                /* cross-origin */
            }
            ctx.restore()
        }
    }

    paintTexts(ctx, doc, win, scale, vw, vh)

    await Promise.all(svgTasks.map(async (task) => {
        const img = await svgToImage(task.el, win)
        if (! img) return
        beginPaint(ctx, task.el, task.style, scale, win, false)
        try {
            ctx.drawImage(img, task.x, task.y, task.w, task.h)
        } catch {
            /* ignore */
        }
        ctx.restore()
    }))

    return canvas
}

function canvasLooksBlank(canvas) {
    try {
        const ctx = canvas.getContext('2d')
        if (! ctx) return true
        const { width, height } = canvas
        const data = ctx.getImageData(0, 0, width, height).data
        const stepX = Math.max(1, Math.floor(width / 28))
        const stepY = Math.max(1, Math.floor(height / 28))
        let total = 0
        let same = 0
        const r0 = data[0]
        const g0 = data[1]
        const b0 = data[2]
        for (let y = 0; y < height; y += stepY) {
            for (let x = 0; x < width; x += stepX) {
                const i = (y * width + x) * 4
                total += 1
                if (Math.abs(data[i] - r0) < 10 && Math.abs(data[i + 1] - g0) < 10 && Math.abs(data[i + 2] - b0) < 10) {
                    same += 1
                }
            }
        }
        return total > 0 && same / total > 0.995
    } catch {
        return false
    }
}

/**
 * @param {HTMLIFrameElement | null} iframe
 * @returns {Promise<Blob | null>}
 */
export async function capturePreviewCover(iframe) {
    try {
        const canvas = await paintPreviewCanvas(iframe)
        if (! canvas || canvasLooksBlank(canvas)) return null
        const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.84)
        if (jpeg && jpeg.size > 32) return jpeg
        return canvasToBlob(canvas, 'image/png')
    } catch {
        return null
    }
}

/**
 * Ask the live preview iframe to snapshot itself (fallback).
 * @param {HTMLIFrameElement | null} iframe
 * @param {number} [timeout]
 * @returns {Promise<Blob | null>}
 */
export function requestPreviewCover(iframe, timeout = 8000) {
    return new Promise((resolve) => {
        const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
        let done = false
        const finish = (blob) => {
            if (done) return
            done = true
            window.clearTimeout(timer)
            window.removeEventListener('message', onMsg)
            resolve(blob)
        }
        const onMsg = (event) => {
            const data = event?.data
            if (! isPreviewChromeMessage(data) || data.type !== 'cover-result' || data.id !== id) return
            if (! data.ok || ! data.dataUrl) {
                finish(null)
                return
            }
            finish(dataUrlToBlob(data.dataUrl))
        }
        const timer = window.setTimeout(() => finish(null), timeout)
        window.addEventListener('message', onMsg)
        if (! postToPreview(iframe, { type: 'cover-capture', id })) {
            finish(null)
        }
    })
}

export function resetPreviewCoverLib() {
    // Kept so the cover hook can call it after remounts.
}

function withIframeLoadFix(doc, run) {
    const orig = doc.createElement.bind(doc)
    doc.createElement = function createElement(name, options) {
        const el = orig(name, options)
        if (String(name).toLowerCase() === 'iframe') {
            let handler = null
            try {
                Object.defineProperty(el, 'onload', {
                    configurable: true,
                    enumerable: true,
                    get() {
                        return handler
                    },
                    set(fn) {
                        handler = fn
                        queueMicrotask(() => {
                            try {
                                if (typeof handler === 'function') handler.call(el)
                            } catch {
                                /* ignore */
                            }
                        })
                    },
                })
            } catch {
                /* ignore */
            }
        }
        return el
    }

    return Promise.resolve().then(run).finally(() => {
        doc.createElement = orig
    })
}

async function snapshotLiveDocument(doc, win, frame) {
    const w = Math.round(win.innerWidth || frame.clientWidth || 0)
    const h = Math.round(win.innerHeight || frame.clientHeight || 0)
    if (w < 160 || h < 90) return null

    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), 8000)

    try {
        const canvas = await withIframeLoadFix(doc, () => html2canvas(doc.documentElement, {
            windowWidth: w,
            windowHeight: h,
            width: w,
            height: h,
            x: 0,
            y: 0,
            scrollX: -(win.scrollX || 0),
            scrollY: -(win.scrollY || 0),
            scale: Math.min(1, 960 / w),
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 2000,
            signal: ctrl.signal,
            ignoreElements: (el) => Boolean(el?.getAttribute?.('data-krikkit-inspect')),
            onclone: (cloned) => {
                cloned.querySelectorAll('*').forEach((node) => {
                    if (! node.style) return
                    node.style.setProperty('animation', 'none', 'important')
                    node.style.setProperty('transition', 'none', 'important')
                })
            },
        }))
        const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.84)
        if (jpeg && jpeg.size > 32) return jpeg
        return canvasToBlob(canvas, 'image/png')
    } finally {
        window.clearTimeout(timer)
    }
}

export async function grabPreviewCover(iframe) {
    const guest = await requestPreviewCover(iframe, 8000)
    if (guest && guest.size > 32) return guest

    try {
        const doc = iframe?.contentDocument
        const win = iframe?.contentWindow
        if (doc?.documentElement && win) {
            const live = await snapshotLiveDocument(doc, win, iframe)
            if (live && live.size > 32) return live
        }
    } catch {
        /* cross-origin or clone failed */
    }

    return capturePreviewCover(iframe)
}

export async function fingerprintCover(blob) {
    if (! blob) return ''
    const buf = await blob.slice(0, 96).arrayBuffer()
    const head = new Uint8Array(buf)
    let hash = blob.size >>> 0
    for (const byte of head) hash = (Math.imul(hash, 33) + byte) >>> 0
    return `${blob.size}:${hash.toString(16)}`
}

export async function uploadPreviewCover(projectUuid, blob, { keepalive = false } = {}) {
    if (! projectUuid || ! blob) return null

    const body = new FormData()
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
    body.append('cover', blob, `cover.${ext}`)

    const response = await fetch(`/lab/${encodeURIComponent(projectUuid)}/cover`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        keepalive,
        body,
    })

    if (! response.ok) {
        const data = await response.json().catch(() => ({}))
        const error = new Error(data.message || `Cover upload failed (${response.status})`)
        error.status = response.status
        throw error
    }

    return response.json().catch(() => ({ saved: true }))
}
