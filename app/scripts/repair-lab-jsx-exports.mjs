/**
 * Dual-export every src/components/*.jsx in a Lab project so named + default
 * imports both work. Usage:
 *   node scripts/repair-lab-jsx-exports.mjs [project-uuid]
 *   node scripts/repair-lab-jsx-exports.mjs   # all kit projects
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureDualComponentExport } from '../resources/js/lab/lib/jsxExports.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const projectsDir = join(root, 'storage/app/lab/projects')
const only = process.argv[2] || null

function walkJsx(dir, acc = []) {
    if (! existsSync(dir)) return acc
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'ui') continue
            walkJsx(full, acc)
            continue
        }
        if (/\.(jsx|tsx)$/.test(entry.name)) acc.push(full)
    }
    return acc
}

let patched = 0
const targets = only ? [only] : readdirSync(projectsDir).filter((name) => {
    const dir = join(projectsDir, name)
    return statSync(dir).isDirectory() && existsSync(join(dir, '.krikkit-kit'))
})

for (const name of targets) {
    const src = join(projectsDir, name, 'src')
    for (const file of walkJsx(src)) {
        const rel = file.slice(join(projectsDir, name).length + 1).replaceAll('\\', '/')
        const raw = readFileSync(file, 'utf8')
        const { body, changed } = ensureDualComponentExport(rel, raw)
        if (! changed) continue
        writeFileSync(file, body)
        patched += 1
        console.log(`${name}  ${rel}`)
    }
}

console.log(`\ndual-export patched: ${patched}`)
