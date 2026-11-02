/**
 * One-off repair: append `export default X` to Lab project kit primitives
 * that only have named exports, so AI-generated default imports
 * (`import Button from './ui/button'`) resolve in every workspace.
 *
 * Safe: only touches src/components/ui/*.jsx files that export the expected
 * named component and have no default export yet.
 *
 * Run: node scripts/patch-lab-kit-default-exports.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const root = 'storage/app/lab/projects'
const map = {
    button: 'Button',
    badge: 'Badge',
    card: 'Card',
    input: 'Input',
    label: 'Label',
    textarea: 'Textarea',
    reveal: 'Reveal',
}

let patched = 0
let skipped = 0

for (const proj of fs.readdirSync(root)) {
    const uiDir = path.join(root, proj, 'src', 'components', 'ui')
    if (!fs.existsSync(uiDir)) continue
    for (const [file, name] of Object.entries(map)) {
        const p = path.join(uiDir, `${file}.jsx`)
        if (!fs.existsSync(p)) continue
        const src = fs.readFileSync(p, 'utf8')
        if (/export\s+default\b/.test(src)) {
            skipped++
            continue
        }
        const named = new RegExp(`export\\s+(function|const)\\s+${name}\\b`)
        if (!named.test(src)) {
            skipped++
            continue
        }
        fs.writeFileSync(p, `${src.replace(/\s*$/, '\n')}\nexport default ${name}\n`)
        patched++
    }
}

console.log('patched:', patched, 'skipped:', skipped)
