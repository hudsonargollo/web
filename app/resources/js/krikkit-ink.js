const BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'LI', 'BLOCKQUOTE', 'PRE', 'DIV'])

function nodeElement(node) {
    if (! node) return null

    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
}

function climb(from, stop, match) {
    let el = nodeElement(from)

    while (el && el !== stop) {
        if (match(el)) return el
        el = el.parentElement
    }

    return null
}

function writableHref(raw) {
    const value = String(raw || '').trim()
    if (value === '') return ''

    try {
        const parsed = new URL(value, window.location.origin)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href
        }
    } catch {
        return ''
    }

    return ''
}

function copyText(html) {
    const probe = document.createElement('div')
    probe.innerHTML = html || ''

    return (probe.innerText || '')
        .replace(/[\u00a0\u200b\ufeff]/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .trim()
}

function tidyMarkup(html) {
    return String(html || '')
        .replace(/\u200b/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\u00a0/g, ' ')
}

function lineCopy(el) {
    return (el?.innerText || '').replace(/[\u00a0\u200b\ufeff]/g, ' ').replace(/\s+$/, '')
}

function lineRaw(el) {
    return (el?.innerText || '').replace(/[\u00a0\u200b\ufeff]/g, ' ').replace(/\n+$/, '')
}

function placeCaret(el, atStart = false) {
    const sel = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(atStart)
    sel.removeAllRanges()
    sel.addRange(range)
}

function looksLikeMarkdown(text) {
    return /^(#{1,3}\s|[-*]\s|\d+\.\s|>\s|---+$)/m.test(text)
        || /(\*\*|__|~~|`|]\(https?:)/.test(text)
}

function takeInline(text, start, open, close, tag) {
    if (! text.startsWith(open, start)) return null
    const from = start + open.length
    const end = text.indexOf(close, from)
    if (end < from) return null

    const el = document.createElement(tag)
    el.textContent = text.slice(from, end)

    return { el, next: end + close.length }
}

function inlineFragment(text) {
    const frag = document.createDocumentFragment()
    let index = 0
    let plain = ''

    const flush = () => {
        if (plain === '') return
        frag.appendChild(document.createTextNode(plain))
        plain = ''
    }

    while (index < text.length) {
        if (text.startsWith('**', index) || text.startsWith('__', index)) {
            const mark = takeInline(text, index, text.slice(index, index + 2), text.slice(index, index + 2), 'strong')
            if (mark) {
                flush()
                frag.appendChild(mark.el)
                index = mark.next
                continue
            }
        }

        if (text.startsWith('~~', index)) {
            const mark = takeInline(text, index, '~~', '~~', 's')
            if (mark) {
                flush()
                frag.appendChild(mark.el)
                index = mark.next
                continue
            }
        }

        if (text[index] === '`') {
            const mark = takeInline(text, index, '`', '`', 'code')
            if (mark) {
                flush()
                frag.appendChild(mark.el)
                index = mark.next
                continue
            }
        }

        if (text[index] === '[') {
            const labelEnd = text.indexOf('](', index)
            const hrefEnd = labelEnd === -1 ? -1 : text.indexOf(')', labelEnd + 2)
            if (labelEnd > index + 1 && hrefEnd > labelEnd + 2) {
                const href = text.slice(labelEnd + 2, hrefEnd)
                if (/^https?:\/\//.test(href)) {
                    flush()
                    const el = document.createElement('a')
                    el.href = href
                    el.textContent = text.slice(index + 1, labelEnd)
                    frag.appendChild(el)
                    index = hrefEnd + 1
                    continue
                }
            }
        }

        if (text[index] === '*' || text[index] === '_') {
            const tick = text[index]
            const mark = takeInline(text, index, tick, tick, 'em')
            if (mark && mark.el.textContent !== '') {
                flush()
                frag.appendChild(mark.el)
                index = mark.next
                continue
            }
        }

        plain += text[index]
        index += 1
    }

    flush()

    if (! frag.hasChildNodes()) {
        frag.appendChild(document.createTextNode(text))
    }

    return frag
}

function fillBlock(el, text) {
    el.textContent = ''
    if (text === '') {
        el.appendChild(document.createElement('br'))
        return el
    }

    el.appendChild(inlineFragment(text))

    return el
}

function markdownFragment(text) {
    const frag = document.createDocumentFragment()
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
    let index = 0

    while (index < lines.length) {
        const line = lines[index]

        if (/^```/.test(line)) {
            const buf = []
            index += 1
            while (index < lines.length && ! /^```/.test(lines[index])) {
                buf.push(lines[index])
                index += 1
            }
            index += 1
            const pre = document.createElement('pre')
            pre.textContent = buf.join('\n')
            frag.appendChild(pre)
            continue
        }

        if (/^---+$/.test(line.trim()) && line.trim() !== '') {
            frag.appendChild(document.createElement('hr'))
            index += 1
            continue
        }

        const heading = line.match(/^(#{1,3})\s+(.*)$/)
        if (heading) {
            frag.appendChild(fillBlock(document.createElement('h' + heading[1].length), heading[2]))
            index += 1
            continue
        }

        const quote = line.match(/^>\s?(.*)$/)
        if (quote) {
            frag.appendChild(fillBlock(document.createElement('blockquote'), quote[1]))
            index += 1
            continue
        }

        const bullet = line.match(/^[-*]\s+(.*)$/)
        if (bullet) {
            const list = document.createElement('ul')
            while (index < lines.length) {
                const item = lines[index].match(/^[-*]\s+(.*)$/)
                if (! item) break
                list.appendChild(fillBlock(document.createElement('li'), item[1]))
                index += 1
            }
            frag.appendChild(list)
            continue
        }

        const numbered = line.match(/^\d+\.\s+(.*)$/)
        if (numbered) {
            const list = document.createElement('ol')
            while (index < lines.length) {
                const item = lines[index].match(/^\d+\.\s+(.*)$/)
                if (! item) break
                list.appendChild(fillBlock(document.createElement('li'), item[1]))
                index += 1
            }
            frag.appendChild(list)
            continue
        }

        if (line.trim() === '') {
            index += 1
            continue
        }

        frag.appendChild(fillBlock(document.createElement('p'), line))
        index += 1
    }

    return frag
}

export function registerKrikkitInk(Alpine) {
    Alpine.data('krikkitInkDesk', (seed = {}) => ({
        draft: seed.draft || '',
        blank: copyText(seed.draft || '') === '',
        ask: { visible: false, mode: 'href', href: '' },
        trail: [],
        trailAt: -1,
        keep: null,
        busy: false,

        awake() {
            if (this.$refs.desk && this.draft) {
                this.$refs.desk.innerHTML = this.draft
            }

            this.paintVault(this.draft)
            this.markBlank()
            this.capture()
        },

        markBlank() {
            this.blank = copyText(this.$refs.desk?.innerHTML || '') === ''
        },

        paintVault(html) {
            if (! this.$refs.vault) return
            if (this.$refs.vault.value === html) return
            this.$refs.vault.value = html
        },

        emit() {
            if (this.busy) return
            this.busy = true
            try {
                this.cueLine()
                this.markBlank()
                const html = this.blank ? '' : tidyMarkup(this.$refs.desk?.innerHTML || '')
                this.draft = html
                this.paintVault(html)
                this.$refs.vault?.dispatchEvent(new Event('input', { bubbles: true }))
            } finally {
                this.busy = false
            }
        },

        capture() {
            const snap = this.$refs.desk?.innerHTML || ''
            if (this.trailAt >= 0 && this.trail[this.trailAt] === snap) return
            this.trail = this.trail.slice(0, this.trailAt + 1)
            this.trail.push(snap)
            if (this.trail.length > 80) {
                this.trail.shift()
            }
            this.trailAt = this.trail.length - 1
        },

        stepTrail(dir) {
            const next = this.trailAt + dir
            if (next < 0 || next >= this.trail.length) return
            this.trailAt = next
            if (this.$refs.desk) {
                this.$refs.desk.innerHTML = this.trail[next]
            }
            this.emit()
        },

        revert() {
            this.stepTrail(-1)
        },

        replay() {
            this.stepTrail(1)
        },

        remember() {
            const sel = window.getSelection()
            if (! sel?.rangeCount) return
            const range = sel.getRangeAt(0)
            if (! this.$refs.desk?.contains(range.commonAncestorContainer)) return
            this.keep = range.cloneRange()
        },

        restore() {
            this.$refs.desk?.focus()
            if (! this.keep) return
            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(this.keep)
        },

        nest(tag) {
            return climb(window.getSelection()?.anchorNode, this.$refs.desk, (el) => el.tagName === tag)
        },

        block() {
            return climb(window.getSelection()?.anchorNode, this.$refs.desk, (el) => BLOCKS.has(el.tagName))
                || this.$refs.desk
        },

        peel(el) {
            const parent = el.parentNode
            if (! parent) return
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el)
            }
            parent.removeChild(el)
        },

        wrap(tag, attrs = {}) {
            const sel = window.getSelection()
            if (! sel?.rangeCount) return
            const range = sel.getRangeAt(0)
            if (! this.$refs.desk?.contains(range.commonAncestorContainer)) return

            const el = document.createElement(tag)
            Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))

            if (range.collapsed) {
                el.appendChild(document.createTextNode(''))
                range.insertNode(el)
            } else {
                el.appendChild(range.extractContents())
                range.insertNode(el)
            }

            const caret = document.createRange()
            caret.selectNodeContents(el)
            caret.collapse(false)
            sel.removeAllRanges()
            sel.addRange(caret)
        },

        toggleInline(tag, attrs = {}) {
            this.restore()
            const existing = this.nest(tag)
            if (existing) {
                this.peel(existing)
            } else {
                this.wrap(tag, attrs)
            }
            this.capture()
            this.emit()
        },

        strong() {
            this.toggleInline('STRONG')
        },

        em() {
            this.toggleInline('EM')
        },

        ins() {
            this.toggleInline('U')
        },

        del() {
            this.toggleInline('S')
        },

        glow() {
            this.toggleInline('MARK')
        },

        raise() {
            this.toggleInline('SUP')
        },

        lower() {
            this.toggleInline('SUB')
        },

        promote(tag) {
            this.restore()
            const current = this.block()
            const name = String(tag || 'p').toUpperCase()

            if (! current || current === this.$refs.desk) {
                const fresh = document.createElement(name.toLowerCase())
                fresh.innerHTML = this.$refs.desk?.innerHTML || '<br>'
                if (this.$refs.desk) {
                    this.$refs.desk.innerHTML = ''
                    this.$refs.desk.appendChild(fresh)
                }
            } else if (current.tagName === name) {
                const paragraph = document.createElement('p')
                paragraph.innerHTML = current.innerHTML
                current.replaceWith(paragraph)
            } else {
                const next = document.createElement(name.toLowerCase())
                next.innerHTML = current.innerHTML
                current.replaceWith(next)
            }

            this.capture()
            this.emit()
        },

        bullets() {
            this.toggleList('UL')
        },

        numerals() {
            this.toggleList('OL')
        },

        toggleList(kind) {
            this.restore()
            const current = this.block()
            const list = current?.closest?.('ul, ol')

            if (list && list.tagName === kind) {
                const frag = document.createDocumentFragment()
                ;[...list.children].forEach((item) => {
                    const paragraph = document.createElement('p')
                    paragraph.innerHTML = item.innerHTML
                    frag.appendChild(paragraph)
                })
                list.replaceWith(frag)
            } else if (list) {
                const next = document.createElement(kind.toLowerCase())
                next.innerHTML = list.innerHTML
                list.replaceWith(next)
            } else {
                const host = current && current !== this.$refs.desk ? current : null
                const listEl = document.createElement(kind.toLowerCase())
                const item = document.createElement('li')
                item.innerHTML = host ? host.innerHTML : '<br>'
                listEl.appendChild(item)
                if (host) {
                    host.replaceWith(listEl)
                } else {
                    this.$refs.desk?.appendChild(listEl)
                }
            }

            this.capture()
            this.emit()
        },

        deepen() {
            this.restore()
            const item = this.nest('LI')
            const prior = item?.previousElementSibling
            if (! item || ! prior) return

            let nest = prior.querySelector(':scope > ul, :scope > ol')
            if (! nest) {
                nest = document.createElement(item.parentElement.tagName.toLowerCase())
                prior.appendChild(nest)
            }
            nest.appendChild(item)
            this.capture()
            this.emit()
        },

        lift() {
            this.restore()
            const item = this.nest('LI')
            const nest = item?.parentElement
            const owner = nest?.parentElement
            if (! item || owner?.tagName !== 'LI') return

            owner.after(item)
            if (! nest.children.length) {
                nest.remove()
            }
            this.capture()
            this.emit()
        },

        cite() {
            this.promote('blockquote')
        },

        mono() {
            this.promote('pre')
        },

        flush(side) {
            this.restore()
            const current = this.block()
            if (! current || current === this.$refs.desk) return
            current.style.textAlign = side
            this.capture()
            this.emit()
        },

        start() {
            this.flush('left')
        },

        mid() {
            this.flush('center')
        },

        end() {
            this.flush('right')
        },

        spread() {
            this.flush('justify')
        },

        href() {
            this.remember()
            this.ask = { visible: true, mode: 'href', href: 'https://' }
            this.$nextTick(() => this.$refs.ask?.focus())
        },

        figure() {
            this.remember()
            this.ask = { visible: true, mode: 'figure', href: '' }
            this.$nextTick(() => this.$refs.ask?.focus())
        },

        dismissAsk() {
            this.ask.visible = false
        },

        sealAsk() {
            const href = writableHref(this.ask.href)
            this.restore()
            if (href === '') {
                this.ask.visible = false
                return
            }

            if (this.ask.mode === 'figure') {
                const img = document.createElement('img')
                img.src = href
                img.alt = ''
                const sel = window.getSelection()
                if (sel?.rangeCount) {
                    sel.getRangeAt(0).insertNode(img)
                } else {
                    this.$refs.desk?.appendChild(img)
                }
            } else {
                const existing = this.nest('A')
                if (existing) {
                    existing.setAttribute('href', href)
                } else {
                    const sel = window.getSelection()
                    if (sel?.rangeCount && sel.getRangeAt(0).collapsed) {
                        this.wrap('a', { href })
                        const made = this.nest('A')
                        if (made && made.textContent === '') {
                            made.textContent = href
                        }
                    } else {
                        this.wrap('a', { href })
                    }
                }
            }

            this.ask.visible = false
            this.capture()
            this.emit()
        },

        detach() {
            this.restore()
            const anchor = this.nest('A')
            if (anchor) {
                this.peel(anchor)
            }
            this.capture()
            this.emit()
        },

        rule() {
            this.restore()
            const line = document.createElement('hr')
            const current = this.block()
            if (current && current !== this.$refs.desk) {
                current.after(line)
            } else {
                this.$refs.desk?.appendChild(line)
            }
            this.capture()
            this.emit()
        },

        grid() {
            this.restore()
            const table = document.createElement('table')
            const head = table.createTHead()
            const headRow = head.insertRow()
            headRow.insertCell().textContent = ''
            headRow.insertCell().textContent = ''
            const body = table.createTBody()
            const row = body.insertRow()
            row.insertCell().textContent = ''
            row.insertCell().textContent = ''

            const current = this.block()
            if (current && current !== this.$refs.desk) {
                current.after(table)
            } else {
                this.$refs.desk?.appendChild(table)
            }
            this.capture()
            this.emit()
        },

        wipe() {
            this.restore()
            const sel = window.getSelection()
            if (! sel?.rangeCount) return
            const range = sel.getRangeAt(0)
            const text = range.toString()
            range.deleteContents()
            const node = document.createTextNode(text)
            range.insertNode(node)
            this.capture()
            this.emit()
        },

        cueHost() {
            const current = this.block()
            if (current?.closest?.('pre') || current?.tagName === 'PRE') return null

            return current || this.$refs.desk
        },

        cueLine() {
            const host = this.cueHost()
            if (! host) return

            const line = lineRaw(host)
            if (host === this.$refs.desk && line.includes('\n')) return

            const heading = line.match(/^(#{1,3})[ \t]+(.*)$/)
            if (heading) {
                this.swapBlock(host, 'h' + heading[1].length, heading[2] || '')
                return
            }

            const quote = line.match(/^>[ \t]+(.*)$/)
            if (quote) {
                this.swapBlock(host, 'blockquote', quote[1] || '')
                return
            }

            const bullet = line.match(/^[-*][ \t]+(.*)$/)
            if (bullet && host.tagName !== 'LI') {
                this.swapList(host, 'ul', bullet[1] || '')
                return
            }

            const numbered = line.match(/^\d+\.[ \t]+(.*)$/)
            if (numbered && host.tagName !== 'LI') {
                this.swapList(host, 'ol', numbered[1] || '')
                return
            }

            if (/^---+$/.test(line) && line.length >= 3) {
                const rule = document.createElement('hr')
                if (host === this.$refs.desk) {
                    host.innerHTML = ''
                    host.appendChild(rule)
                } else {
                    host.replaceWith(rule)
                }
                const p = document.createElement('p')
                p.appendChild(document.createElement('br'))
                rule.after(p)
                placeCaret(p, true)
            }
        },

        foldMarks(event) {
            if (event.key !== ' ' && event.key !== 'Enter') return
            if (event.metaKey || event.ctrlKey || event.altKey) return

            const host = this.cueHost()
            if (! host) return

            const line = lineCopy(host)
            const heading = line.match(/^(#{1,3})(?:\s+(.*))?$/)
            if (heading && (heading[2] !== undefined || event.key === ' ')) {
                event.preventDefault()
                this.swapBlock(host, 'h' + heading[1].length, heading[2] || '')
                if (event.key === 'Enter') this.breakAfter()
                this.capture()
                this.emit()
                return
            }

            const quote = line.match(/^>(?:\s+(.*))?$/)
            if (quote && (quote[1] !== undefined || event.key === ' ')) {
                event.preventDefault()
                this.swapBlock(host, 'blockquote', quote[1] || '')
                if (event.key === 'Enter') this.breakAfter()
                this.capture()
                this.emit()
                return
            }

            const bullet = line.match(/^[-*](?:\s+(.*))?$/)
            if (bullet && host.tagName !== 'LI' && (bullet[1] !== undefined || event.key === ' ')) {
                event.preventDefault()
                this.swapList(host, 'ul', bullet[1] || '')
                if (event.key === 'Enter') this.breakAfter()
                this.capture()
                this.emit()
                return
            }

            const numbered = line.match(/^\d+\.(?:\s+(.*))?$/)
            if (numbered && host.tagName !== 'LI' && (numbered[1] !== undefined || event.key === ' ')) {
                event.preventDefault()
                this.swapList(host, 'ol', numbered[1] || '')
                if (event.key === 'Enter') this.breakAfter()
                this.capture()
                this.emit()
                return
            }

            if (/^---+$/.test(line) && line.length >= 3) {
                event.preventDefault()
                const rule = document.createElement('hr')
                if (host === this.$refs.desk) {
                    host.innerHTML = ''
                    host.appendChild(rule)
                } else {
                    host.replaceWith(rule)
                }
                const p = document.createElement('p')
                p.appendChild(document.createElement('br'))
                rule.after(p)
                placeCaret(p, true)
                this.capture()
                this.emit()
                return
            }

            if (this.foldInline(event)) {
                this.capture()
                this.emit()
            }
        },

        swapBlock(el, tag, text) {
            const next = fillBlock(document.createElement(tag), text)
            if (el === this.$refs.desk) {
                el.innerHTML = ''
                el.appendChild(next)
            } else if (el.tagName === 'LI') {
                const list = el.parentElement
                list.after(next)
                el.remove()
                if (list && ! list.children.length) list.remove()
            } else {
                el.replaceWith(next)
            }
            placeCaret(next)
            this.$refs.desk?.focus()
        },

        swapList(el, kind, text) {
            const list = document.createElement(kind)
            const item = fillBlock(document.createElement('li'), text)
            list.appendChild(item)
            if (el === this.$refs.desk) {
                el.innerHTML = ''
                el.appendChild(list)
            } else {
                el.replaceWith(list)
            }
            placeCaret(item)
            this.$refs.desk?.focus()
        },

        breakAfter() {
            const current = this.block()
            if (! current || current === this.$refs.desk) return
            const p = document.createElement('p')
            p.appendChild(document.createElement('br'))
            const host = current.tagName === 'LI' ? current.parentElement : current
            host.after(p)
            placeCaret(p, true)
        },

        foldInline(event) {
            const sel = window.getSelection()
            if (! sel?.rangeCount || ! sel.isCollapsed) return false

            const node = sel.anchorNode
            if (! node || node.nodeType !== Node.TEXT_NODE) return false

            const text = node.textContent.slice(0, sel.anchorOffset)
            const rules = [
                { re: /^(.*)\*\*(.+?)\*\*$/s, tag: 'STRONG' },
                { re: /^(.*)__(.+?)__$/s, tag: 'STRONG' },
                { re: /^(.*)~~(.+?)~~$/s, tag: 'S' },
                { re: /^(.*)`(.+?)`$/s, tag: 'CODE' },
                { re: /^(.*)\*(.+?)\*$/s, tag: 'EM' },
                { re: /^(.*)_(.+?)_$/s, tag: 'EM' },
            ]

            for (const rule of rules) {
                const found = text.match(rule.re)
                if (! found) continue
                if (rule.tag === 'EM' && found[1].endsWith('*')) continue

                event.preventDefault()
                const range = document.createRange()
                range.setStart(node, found[1].length)
                range.setEnd(node, sel.anchorOffset)
                range.deleteContents()
                const mark = document.createElement(rule.tag)
                mark.textContent = found[2]
                range.insertNode(mark)

                const after = document.createRange()
                after.setStartAfter(mark)
                after.collapse(true)
                if (event.key === ' ') {
                    const space = document.createTextNode(' ')
                    after.insertNode(space)
                    after.setStartAfter(space)
                    after.collapse(true)
                }
                sel.removeAllRanges()
                sel.addRange(after)
                return true
            }

            const link = text.match(/^(.*)\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
            if (! link) return false

            event.preventDefault()
            const range = document.createRange()
            range.setStart(node, link[1].length)
            range.setEnd(node, sel.anchorOffset)
            range.deleteContents()
            const anchor = document.createElement('a')
            anchor.href = link[3]
            anchor.textContent = link[2]
            range.insertNode(anchor)
            const after = document.createRange()
            after.setStartAfter(anchor)
            after.collapse(true)
            if (event.key === ' ') {
                const space = document.createTextNode(' ')
                after.insertNode(space)
                after.setStartAfter(space)
                after.collapse(true)
            }
            sel.removeAllRanges()
            sel.addRange(after)
            return true
        },

        ingestPlain(event) {
            event.preventDefault()
            const text = event.clipboardData?.getData('text/plain') || ''
            this.restore()
            const sel = window.getSelection()

            if (looksLikeMarkdown(text)) {
                const frag = markdownFragment(text)
                if (! sel?.rangeCount) {
                    this.$refs.desk?.appendChild(frag)
                } else {
                    const range = sel.getRangeAt(0)
                    range.deleteContents()
                    range.insertNode(frag)
                    range.collapse(false)
                    sel.removeAllRanges()
                    sel.addRange(range)
                }
                this.capture()
                this.emit()
                return
            }

            if (! sel?.rangeCount) {
                this.$refs.desk?.appendChild(document.createTextNode(text))
                this.capture()
                this.emit()
                return
            }

            const range = sel.getRangeAt(0)
            range.deleteContents()
            const node = document.createTextNode(text)
            range.insertNode(node)
            range.setStartAfter(node)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
            this.capture()
            this.emit()
        },
    }))
}
