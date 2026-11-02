/**
 * One-shot repair: re-pin the managed build toolchain across all site-kit
 * Lab projects (marker: .krikkit-kit) whose package.json / vite.config.js
 * were overwritten by the model with drifted versions (vite ^5/^6/^8 —
 * rolldown breaks the in-browser WASM dev server).
 *
 * Usage: node scripts/repair-lab-toolchain-pins.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeLabPackageJson } from '../resources/js/lab/lib/toolchainPins.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const projectsDir = join(root, 'storage/app/lab/projects')
const kitViteConfig = readFileSync(join(root, 'resources/lab/site-kit/vite.config.js'), 'utf8')

let pkgPatched = 0
let vitePatched = 0
let skipped = 0

for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
    if (! entry.isDirectory()) continue
    const dir = join(projectsDir, entry.name)

    // Only kit-seeded projects — legacy stacks (vite 5 + tailwind 3) stay as-is.
    if (! existsSync(join(dir, '.krikkit-kit'))) {
        skipped += 1
        continue
    }

    const pkgPath = join(dir, 'package.json')
    if (existsSync(pkgPath)) {
        const raw = readFileSync(pkgPath, 'utf8')
        const { body, changed } = normalizeLabPackageJson(raw)
        if (changed) {
            writeFileSync(pkgPath, body)
            pkgPatched += 1
            console.log(`pkg   ${entry.name}`)
        }
    }

    const vitePath = join(dir, 'vite.config.js')
    if (existsSync(vitePath) && readFileSync(vitePath, 'utf8') !== kitViteConfig) {
        writeFileSync(vitePath, kitViteConfig)
        vitePatched += 1
        console.log(`vite  ${entry.name}`)
    }
}

console.log(`\npackage.json repinned: ${pkgPatched}, vite.config restored: ${vitePatched}, non-kit skipped: ${skipped}`)
