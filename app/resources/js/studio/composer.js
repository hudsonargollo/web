import { COMPOSER_ACCEPT, MAX_ATTACHMENTS, MAX_FILE_BYTES } from '../lab/lib/composerFiles'
import { stashStudioHandoff } from '../lab/lib/studioHandoff'

function fileKey(file) {
    return `${file.name || 'upload'}:${file.size}:${file.type}`
}

function formatBytes(bytes = 0) {
    if (bytes < 1024) {
        return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(file) {
    return Boolean(file?.type?.startsWith('image/'))
}

/**
 * Studio home composer: same + menu as Lab (GitHub import, export, upload).
 */
export function registerStudioComposer(Alpine) {
    Alpine.data('studioComposer', () => ({
        brief: '',
        open: false,
        importOpen: false,
        exportOpen: false,
        files: [],
        accept: COMPOSER_ACCEPT,
        maxFiles: MAX_ATTACHMENTS,

        pickFiles() {
            if (this.files.length >= MAX_ATTACHMENTS) return
            this.$refs.fileInput?.click()
        },

        onFilesSelected(event) {
            this.ingest(Array.from(event.target.files || []))
            event.target.value = ''
            this.open = false
            this.importOpen = false
            this.exportOpen = false
        },

        ingest(list) {
            const remaining = MAX_ATTACHMENTS - this.files.length
            if (remaining <= 0) return

            const existing = new Set(this.files.map((row) => fileKey(row.file)))
            const batch = new Set()

            const next = list
                .filter((file) => file && file.size <= MAX_FILE_BYTES)
                .filter((file) => {
                    const key = fileKey(file)
                    if (existing.has(key) || batch.has(key)) return false
                    batch.add(key)
                    return true
                })
                .slice(0, remaining)
                .map((file) => ({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: isImage(file) ? URL.createObjectURL(file) : '',
                    image: isImage(file),
                    bytes: formatBytes(file.size),
                    file,
                }))

            this.files = [...this.files, ...next]
        },

        removeFile(id) {
            const hit = this.files.find((row) => row.id === id)
            if (hit?.url) URL.revokeObjectURL(hit.url)
            this.files = this.files.filter((row) => row.id !== id)
        },

        async goToLab(seed = null) {
            const text = String(seed ?? this.brief ?? '').trim()
            const hasFiles = this.files.length > 0

            if (hasFiles) {
                await stashStudioHandoff(this.files.map((row) => row.file))
            }

            this.open = false
            this.importOpen = false
            this.exportOpen = false
            await this.$wire.openLab(text || null, hasFiles)
        },

        onSeed(event) {
            const prompt = event.detail?.prompt || ''
            this.brief = prompt
            if (event.detail?.send && String(prompt).trim()) {
                this.goToLab(prompt)
            }
        },
    }))

    Alpine.data('studioProjectMenu', () => ({
        open: false,
        exportOpen: false,
        place: 'bottom',
        exportSide: 'right',
        _onMove: null,

        init() {
            this._onMove = () => {
                if (! this.open) return
                this.place = this.pickPlace()
                this.exportSide = this.pickExportSide()
            }
            window.addEventListener('resize', this._onMove)
            window.addEventListener('scroll', this._onMove, true)
        },

        destroy() {
            if (! this._onMove) return
            window.removeEventListener('resize', this._onMove)
            window.removeEventListener('scroll', this._onMove, true)
        },

        close() {
            this.open = false
            this.exportOpen = false
        },

        toggle() {
            this.exportOpen = false
            if (this.open) {
                this.open = false
                return
            }
            this.place = this.pickPlace()
            this.open = true
            this.$nextTick(() => {
                this.place = this.pickPlace()
                this.exportSide = this.pickExportSide()
            })
        },

        showExport() {
            this.exportSide = this.pickExportSide()
            this.exportOpen = true
        },

        pickPlace() {
            const btn = this.$refs.trigger
            if (! btn) return this.place || 'bottom'

            const rect = btn.getBoundingClientRect()
            const gap = 6
            const measured = this.open ? (this.$refs.menu?.offsetHeight || 0) : 0
            const need = Math.max(measured, 260)
            const below = window.innerHeight - rect.bottom - gap
            const above = rect.top - gap

            if (below >= need) return 'bottom'
            if (above >= need) return 'top'

            return below >= above ? 'bottom' : 'top'
        },

        pickExportSide() {
            const menu = this.$refs.menu
            if (! menu) return 'right'

            const rect = menu.getBoundingClientRect()
            const gap = 6
            const need = 196
            const right = window.innerWidth - rect.right - gap
            const left = rect.left - gap

            if (right >= need) return 'right'
            if (left >= need) return 'left'

            return right >= left ? 'right' : 'left'
        },
    }))
}
