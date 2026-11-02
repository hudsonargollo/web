function fromIso(iso) {
    if (! iso) return new Date()

    return new Date(iso + 'T12:00:00')
}

export function registerKrikkitDate(Alpine) {
    Alpine.data('krikkitDateDesk', (seed = {}) => ({
        open: false,
        pane: 'days',
        value: seed.value || '',
        cursor: (() => {
            const base = fromIso(seed.value || '')
            return { y: base.getFullYear(), m: base.getMonth() }
        })(),
        weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],

        format(iso) {
            if (! iso) return ''
            return fromIso(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        },

        dayStamp() {
            if (this.value) return fromIso(this.value).getDate()
            return fromIso('').getDate()
        },

        monthStamp() {
            return new Date(this.cursor.y, this.cursor.m, 1).toLocaleDateString(undefined, { month: 'long' })
        },

        months() {
            return Array.from({ length: 12 }, (_, m) => ({
                m,
                label: new Date(2020, m, 1).toLocaleDateString(undefined, { month: 'short' }),
            }))
        },

        years() {
            const origin = Math.floor(this.cursor.y / 12) * 12
            return Array.from({ length: 12 }, (_, i) => origin + i)
        },

        days() {
            const first = new Date(this.cursor.y, this.cursor.m, 1)
            const startOffset = (first.getDay() + 6) % 7
            const start = new Date(this.cursor.y, this.cursor.m, 1 - startOffset)
            return Array.from({ length: 42 }, (_, i) => {
                const d = new Date(start)
                d.setDate(start.getDate() + i)
                return {
                    iso: d.toISOString().slice(0, 10),
                    day: d.getDate(),
                    inMonth: d.getMonth() === this.cursor.m,
                }
            })
        },

        show(pane) {
            this.pane = pane
        },

        prev() {
            if (this.pane === 'years') {
                this.cursor.y -= 12
                return
            }
            if (this.pane === 'months') {
                this.cursor.y -= 1
                return
            }
            if (this.cursor.m === 0) {
                this.cursor.m = 11
                this.cursor.y -= 1
            } else {
                this.cursor.m -= 1
            }
        },

        next() {
            if (this.pane === 'years') {
                this.cursor.y += 12
                return
            }
            if (this.pane === 'months') {
                this.cursor.y += 1
                return
            }
            if (this.cursor.m === 11) {
                this.cursor.m = 0
                this.cursor.y += 1
            } else {
                this.cursor.m += 1
            }
        },

        pickMonth(m) {
            this.cursor.m = m
            this.pane = 'days'
        },

        pickYear(y) {
            this.cursor.y = y
            this.pane = 'months'
        },

        pick(iso) {
            this.value = iso
            this.open = false
            this.pane = 'days'
            this.$nextTick(() => {
                this.$refs.input?.dispatchEvent(new Event('input', { bubbles: true }))
                this.$refs.input?.dispatchEvent(new Event('change', { bubbles: true }))
            })
        },
    }))
}
