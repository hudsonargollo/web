/**
 * Detect and locally heal AI placeholder components that only render their name.
 * Keeps preview usable without another paid model turn.
 */

const STUB_INTERACTIVE = /<(Button|Input|Label|Textarea|Link|img)\b/i

/** @param {string} source */
export function componentNameFromSource(source = '') {
    const match = String(source || '').match(/\bfunction\s+([A-Z]\w*)\s*\(/)
    return match?.[1] || ''
}

/** @param {string} source */
export function isComponentNameStub(source = '') {
    const name = componentNameFromSource(source)
    if (! name) return false

    const heading = new RegExp(`<h[12]\\b[^>]*>\\s*${name}\\s*<\\/h[12]>`)
    if (! heading.test(source)) return false
    if (/\.map\s*\(/.test(source)) return false
    if (STUB_INTERACTIVE.test(source)) return false

    return String(source).length < 700
}

/** @param {Record<string, string>} contents */
export function listComponentStubPaths(contents = {}) {
    return Object.entries(contents)
        .filter(([path, body]) => /\.jsx$/i.test(path) && isComponentNameStub(body))
        .map(([path]) => path)
}

/**
 * @param {string} stubName
 * @param {Record<string, string>} contents
 */
function findDonorBody(stubName, contents) {
    const lower = stubName.toLowerCase()
    /** @type {string[]} */
    const candidates = []

    if (/cta|band|closing/.test(lower)) {
        candidates.push('src/components/CtaBand.jsx', 'src/components/ClosingCta.jsx')
    }
    if (/hero/.test(lower)) {
        candidates.push('src/components/Hero.jsx', 'src/components/ServicesHero.jsx', 'src/components/BookingHero.jsx')
    }

    for (const path of Object.keys(contents)) {
        if (/src\/components\/[A-Z]\w+\.jsx$/i.test(path)) {
            candidates.push(path)
        }
    }

    const seen = new Set()
    for (const path of candidates) {
        if (seen.has(path)) continue
        seen.add(path)
        const body = contents[path]
        if (! body || isComponentNameStub(body)) continue
        if (body.length > 400) return { path, body }
    }

    return null
}

/**
 * @param {string} stubName
 * @param {string} donorBody
 * @param {string} donorName
 */
function cloneDonorForStub(stubName, donorBody, donorName) {
    let next = donorBody
    if (donorName) {
        next = next.replace(new RegExp(`\\bfunction\\s+${donorName}\\b`, 'g'), `function ${stubName}`)
        next = next.replace(new RegExp(`export\\s+default\\s+${donorName}\\b`, 'g'), `export default ${stubName}`)
        next = next.replace(new RegExp(`export\\s+{\\s*${donorName}\\s*}`, 'g'), `export { ${stubName} }`)
    }
    return next
}

/** @param {string} name */
function genericClosingSection(name) {
    return `import { Link } from 'react-router-dom'
import Button from './ui/button'
import Reveal from './ui/reveal'

export function ${name}(props) {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32" {...props}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--color-accent)_12%,transparent),transparent_70%)]" />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <h2 className="font-display text-4xl font-semibold tracking-tight lg:text-5xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-fg-muted">
            Book your appointment today and experience the difference for yourself.
          </p>
          <div className="mt-10">
            <Button asChild size="lg" variant="primary">
              <Link to="/booking">Book now</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default ${name}
`
}

/**
 * @param {Record<string, string>} contents
 * @returns {{ patch: Record<string, string>, healed: string[] }}
 */
export function healComponentStubs(contents = {}) {
    /** @type {Record<string, string>} */
    const patch = {}
    /** @type {string[]} */
    const healed = []

    for (const [path, body] of Object.entries(contents)) {
        if (! /\.jsx$/i.test(path) || ! isComponentNameStub(body)) continue

        const stubName = componentNameFromSource(body)
        const donor = findDonorBody(stubName, contents)
        const donorName = donor ? componentNameFromSource(donor.body) : ''
        const next = donor
            ? cloneDonorForStub(stubName, donor.body, donorName)
            : genericClosingSection(stubName)

        patch[path] = next
        healed.push(path)
    }

    return { patch, healed }
}

/**
 * @param {Record<string, string>} contents
 * @returns {Record<string, string>}
 */
export function applyComponentStubHeal(contents = {}) {
    const { patch } = healComponentStubs(contents)
    if (! Object.keys(patch).length) return contents
    return { ...contents, ...patch }
}
