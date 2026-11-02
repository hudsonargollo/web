/**
 * Extract + strip proactive <todos>…</todos> plans.
 * Tags must never paint in chat markdown; items live only in turn checklist state.
 *
 * Expected:
 * <todos>[{"id":1,"task":"Update state in App.jsx"},{"id":2,"task":"Add meta in index.html"}]</todos>
 *
 * @returns {{ visible: string, todos: Array<{ id: string, task: string }> }}
 */

const MAX_ITEMS = 8
const MAX_TASK_CHARS = 120

function decodeList(raw = '') {
    const trimmed = String(raw || '').trim()
    if (! trimmed) return []

    try {
        const decoded = JSON.parse(trimmed)
        if (! Array.isArray(decoded)) return []

        return decoded.map((value, index) => {
            if (typeof value === 'string' || typeof value === 'number') {
                return { id: String(index + 1), task: String(value) }
            }
            if (! value || typeof value !== 'object') return null
            const task = value.task ?? value.label ?? value.text
            if (typeof task !== 'string' && typeof task !== 'number') return null
            const id = value.id != null && String(value.id).trim() !== ''
                ? String(value.id)
                : String(index + 1)
            return { id, task: String(task) }
        }).filter(Boolean)
    } catch {
        return []
    }
}

function normalizeList(items = []) {
    const out = []
    const seenIds = new Set()
    const seenTasks = new Set()

    for (const item of items) {
        let task = String(item?.task || '').replace(/\s+/g, ' ').trim()
        if (! task) continue
        if (task.length > MAX_TASK_CHARS) {
            task = `${task.slice(0, MAX_TASK_CHARS - 1).trimEnd()}…`
        }
        const taskKey = task.toLowerCase()
        if (seenTasks.has(taskKey)) continue

        let id = String(item?.id || '').trim()
        if (! id || seenIds.has(id)) {
            id = String(out.length + 1)
        }

        seenIds.add(id)
        seenTasks.add(taskKey)
        out.push({ id, task })
        if (out.length >= MAX_ITEMS) break
    }

    return out
}

export function stripTodos(text = '') {
    let todos = []
    let visible = String(text || '')

    visible = visible.replace(/<todos>\s*([\s\S]*?)\s*<\/todos>/giu, (_, body) => {
        todos = todos.concat(decodeList(body))
        return '\n'
    })

    const open = visible.match(/<todos>\s*([\s\S]*)$/iu)
    if (open) {
        todos = todos.concat(decodeList(open[1] || ''))
        visible = visible.slice(0, open.index)
    }

    visible = visible.replace(/\s*<\/todos>\s*/giu, '\n')
    visible = visible.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

    return {
        visible,
        todos: normalizeList(todos),
    }
}

/**
 * Hold back a trailing partial `<todos` so faux-stream never paints the tag.
 */
export function scrubTodoArtifacts(text = '') {
    let out = String(text || '')
    let todos = []

    out = out.replace(/<todos>\s*([\s\S]*?)\s*<\/todos>/giu, (_, body) => {
        todos = todos.concat(decodeList(body))
        return ''
    })

    const partial = out.search(/<todos(?:\s|>|$)/iu)
    if (partial >= 0) {
        out = out.slice(0, partial)
    }

    out = out.replace(/\s*<\/todos>\s*/giu, '')
    out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')

    return { text: out, todos: normalizeList(todos) }
}
