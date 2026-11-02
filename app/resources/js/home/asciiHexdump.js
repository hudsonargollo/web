const HEX = '0123456789ABCDEF'
const CELL = 9
const RECIPE = {
    bgBlur: 12,
    bgOpacity: 0.9,
    contrast: 1.58,
    density: 0.2,
    animSpeed: 1,
    animIntensity: 0.6,
}

function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value))
}

function coverDraw(ctx, image, width, height) {
    const ir = image.width / image.height
    const cr = width / height
    let dw = width
    let dh = height
    let dx = 0
    let dy = 0

    if (ir > cr) {
        dw = height * ir
        dx = (width - dw) / 2
    } else {
        dh = width / ir
        dy = (height - dh) / 2
    }

    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(image, dx, dy, dw, dh)
}

function loadPhoto(url) {
    return new Promise((resolve, reject) => {
        if (! url) {
            reject(new Error('Missing ASCII source'))
            return
        }

        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('ASCII source failed'))
        image.src = url
    })
}

function sampleCells(source, width, height) {
    const cols = Math.ceil(width / CELL)
    const rows = Math.ceil(height / CELL)
    const pixels = source.getImageData(0, 0, width, height).data
    const cells = []

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let r = 0
            let g = 0
            let b = 0
            let count = 0
            const x0 = col * CELL
            const y0 = row * CELL
            const x1 = Math.min(width, x0 + CELL)
            const y1 = Math.min(height, y0 + CELL)

            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    const i = (y * width + x) * 4
                    r += pixels[i]
                    g += pixels[i + 1]
                    b += pixels[i + 2]
                    count++
                }
            }

            const inv = 1 / Math.max(1, count)
            r *= inv
            g *= inv
            b *= inv
            const luma = clamp((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255)
            const contrast = clamp(((luma - 0.5) * RECIPE.contrast) + 0.5)
            const shaped = contrast ** (1.15 + (1 - RECIPE.density))

            cells.push({
                x: x0 + CELL / 2,
                y: y0 + CELL / 2,
                r,
                g,
                b,
                luma: shaped,
            })
        }
    }

    return { cells, cols }
}

function drawFrame(ctx, width, height, sourceCanvas, cells, cols, time, reduceMotion) {
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.globalAlpha = RECIPE.bgOpacity
    ctx.filter = `blur(${RECIPE.bgBlur}px)`
    ctx.drawImage(sourceCanvas, 0, 0, width, height)
    ctx.restore()

    ctx.font = `700 ${CELL}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const t = reduceMotion ? 0 : time * RECIPE.animSpeed * 0.0016
    const wave = reduceMotion ? 0 : RECIPE.animIntensity

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]
        const col = i % cols
        const row = Math.floor(i / cols)
        const shimmer = Math.sin(col * 0.22 + row * 0.13 - t) * wave * 0.28
        const luma = clamp(cell.luma + shimmer)
        const shade = 0.35 + luma * 0.85

        ctx.fillStyle = `rgb(${Math.round(cell.r * shade)}, ${Math.round(cell.g * shade)}, ${Math.round(cell.b * shade)})`
        ctx.globalAlpha = 0.28 + luma * 0.72
        ctx.fillText(HEX[Math.min(15, Math.floor(luma * 16))], cell.x, cell.y)
    }

    ctx.globalAlpha = 1
}

export function mountAsciiHexdump(canvas) {
    if (! (canvas instanceof HTMLCanvasElement) || canvas.dataset.asciiMounted === '1') {
        return
    }

    canvas.dataset.asciiMounted = '1'

    const view = canvas.getContext('2d', { alpha: false })
    const source = document.createElement('canvas')
    const sourceCtx = source.getContext('2d', { willReadFrequently: true })
    if (! view || ! sourceCtx) {
        return
    }

    let photo = null
    let cells = []
    let cols = 0
    let frame = 0
    let running = false
    let visible = true
    let loadToken = 0
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const rasterize = () => {
        const rect = canvas.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
        const width = Math.max(1, Math.round(rect.width * dpr))
        const height = Math.max(1, Math.round(rect.height * dpr))
        if (width < 8 || height < 8 || ! photo) {
            return
        }

        canvas.width = width
        canvas.height = height
        source.width = width
        source.height = height
        coverDraw(sourceCtx, photo, width, height)
        const sampled = sampleCells(sourceCtx, width, height)
        cells = sampled.cells
        cols = sampled.cols
        drawFrame(view, width, height, source, cells, cols, 0, reduceMotion)
    }

    const useSrc = async (url) => {
        const token = ++loadToken
        try {
            const image = await loadPhoto(url)
            if (token !== loadToken) {
                return
            }
            photo = image
            rasterize()
        } catch {
            if (token !== loadToken) {
                return
            }
            const fallback = document.createElement('canvas')
            fallback.width = 640
            fallback.height = 400
            const ctx = fallback.getContext('2d')
            if (ctx) {
                const wash = ctx.createLinearGradient(0, 0, 640, 400)
                wash.addColorStop(0, '#1a3d2a')
                wash.addColorStop(0.45, '#6ee7a8')
                wash.addColorStop(1, '#0b1410')
                ctx.fillStyle = wash
                ctx.fillRect(0, 0, 640, 400)
                photo = fallback
                rasterize()
            }
        }
    }

    const tick = (time) => {
        if (! running) {
            return
        }

        if (visible && cells.length > 0) {
            drawFrame(view, canvas.width, canvas.height, source, cells, cols, time, reduceMotion)
        }

        if (! reduceMotion) {
            frame = window.requestAnimationFrame(tick)
        }
    }

    const start = () => {
        if (running || reduceMotion) {
            return
        }

        running = true
        frame = window.requestAnimationFrame(tick)
    }

    const stop = () => {
        running = false
        window.cancelAnimationFrame(frame)
    }

    const resize = new ResizeObserver(() => {
        rasterize()
    })
    resize.observe(canvas)

    const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting)
        if (visible) {
            start()
        } else {
            stop()
        }
    }, { threshold: 0.05 })
    io.observe(canvas)

    const attrs = new MutationObserver(() => {
        useSrc(canvas.getAttribute('data-ascii-src') || '')
    })
    attrs.observe(canvas, { attributes: true, attributeFilter: ['data-ascii-src'] })

    useSrc(canvas.getAttribute('data-ascii-src') || '')
    if (! reduceMotion) {
        start()
    }

    canvas._asciiTeardown = () => {
        stop()
        resize.disconnect()
        io.disconnect()
        attrs.disconnect()
        delete canvas.dataset.asciiMounted
    }
}

export function bootAsciiHexdump(root = document) {
    root.querySelectorAll('[data-ascii-hexdump]').forEach((node) => mountAsciiHexdump(node))
}
