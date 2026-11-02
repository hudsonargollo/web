const EXT_META = {
    php: { label: 'PHP', tone: 'violet' },
    js: { label: 'JS', tone: 'amber' },
    jsx: { label: 'JSX', tone: 'amber' },
    mjs: { label: 'JS', tone: 'amber' },
    cjs: { label: 'JS', tone: 'amber' },
    ts: { label: 'TS', tone: 'sky' },
    tsx: { label: 'TSX', tone: 'sky' },
    css: { label: 'CSS', tone: 'sky' },
    scss: { label: 'SCSS', tone: 'rose' },
    html: { label: 'HTML', tone: 'orange' },
    json: { label: 'JSON', tone: 'lime' },
    md: { label: 'MD', tone: 'slate' },
    txt: { label: 'TXT', tone: 'slate' },
    pdf: { label: 'PDF', tone: 'red' },
    csv: { label: 'CSV', tone: 'green' },
    xml: { label: 'XML', tone: 'orange' },
    yml: { label: 'YML', tone: 'slate' },
    yaml: { label: 'YAML', tone: 'slate' },
    vue: { label: 'VUE', tone: 'green' },
    py: { label: 'PY', tone: 'sky' },
    rb: { label: 'RB', tone: 'rose' },
    go: { label: 'GO', tone: 'cyan' },
    rs: { label: 'RS', tone: 'orange' },
    java: { label: 'JAVA', tone: 'orange' },
    zip: { label: 'ZIP', tone: 'slate' },
    svg: { label: 'SVG', tone: 'lime' },
}

const TONE_CLASSES = {
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    sky: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    lime: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
    slate: 'bg-krikkit-soft text-krikkit-fg-soft',
    red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
}

export function getExtension(name = '') {
    const parts = name.split('.')
    return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

export function isImageAttachment(attachment) {
    if (attachment?.kind === 'image') {
        return true
    }

    if (attachment?.type?.startsWith('image/')) {
        return true
    }

    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif'].includes(getExtension(attachment?.name))
}

export function getFileMeta(attachment) {
    const ext = getExtension(attachment?.name)
    const meta = EXT_META[ext]

    if (meta) {
        return {
            ext,
            label: meta.label,
            toneClass: TONE_CLASSES[meta.tone] || TONE_CLASSES.slate,
        }
    }

    return {
        ext: ext || 'file',
        label: (ext || 'FILE').toUpperCase().slice(0, 5),
        toneClass: TONE_CLASSES.slate,
    }
}

export function formatBytes(bytes = 0) {
    if (bytes < 1024) {
        return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function createAttachmentFromFile(file) {
    const kind = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif'].includes(getExtension(file.name))
        ? 'image'
        : 'file'

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        kind,
        url: URL.createObjectURL(file),
        file,
        ...getFileMeta({ name: file.name }),
    }
}
