const DB_NAME = 'krikkit-studio-handoff'
const STORE = 'payload'
const KEY = 'pending'
const DB_VERSION = 1
const MAX_AGE_MS = 10 * 60 * 1000

/** One take per page load so React Strict Mode cannot drain IndexedDB twice. */
let takeOnce = null

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (! db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE)
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

function storeOp(mode, fn) {
    return openDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const store = tx.objectStore(STORE)
        const req = fn(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        tx.oncomplete = () => db.close()
        tx.onerror = () => reject(tx.error)
    }))
}

/**
 * Persist composer files from Studio so Lab can attach them after redirect.
 *
 * @param {File[]} files
 */
export async function stashStudioHandoff(files) {
    const list = Array.from(files || []).filter(Boolean)
    const packed = await Promise.all(list.map(async (file) => ({
        name: file.name || 'upload',
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
        buffer: await file.arrayBuffer(),
    })))

    await storeOp('readwrite', (store) => store.put({
        at: Date.now(),
        files: packed,
    }, KEY))
}

async function readAndClear() {
    const row = await storeOp('readonly', (store) => store.get(KEY))
    await storeOp('readwrite', (store) => store.delete(KEY))

    if (! row?.files?.length) {
        return []
    }

    if (typeof row.at === 'number' && Date.now() - row.at > MAX_AGE_MS) {
        return []
    }

    return row.files.map((item) => new File(
        [item.buffer],
        item.name || 'upload',
        { type: item.type || 'application/octet-stream' },
    ))
}

/** Consume stashed Studio files once (empty array if none). */
export function takeStudioHandoff() {
    if (! takeOnce) {
        takeOnce = readAndClear().catch(() => [])
    }

    return takeOnce
}
