import { createRoot } from 'react-dom/client'
import { applyKrikkitTheme, readKrikkitTheme } from '../krikkit-theme'
import { LabApp } from './LabApp'
import { bootDeskPulse } from './lib/deskPulse'
import { workspaceWindowName } from './lib/labUrl'

applyKrikkitTheme()
window.krikkitTheme = {
    apply: applyKrikkitTheme,
    read: readKrikkitTheme,
}

function readJsonScript(id) {
    const node = document.getElementById(id)
    if (! node) return null
    const raw = node.textContent?.trim()
    if (! raw || raw === 'null') return null
    try {
        return JSON.parse(raw)
    } catch (error) {
        console.warn(`[lab] failed to parse #${id}`, error)
        return null
    }
}

const rootEl = document.getElementById('lab-root')

if (rootEl) {
    const project = readJsonScript('lab-bootstrap')
    const workspace = Boolean(readJsonScript('lab-workspace'))
    bootDeskPulse(readJsonScript('lab-pulse'))
    if (project?.uuid) {
        window.name = workspaceWindowName(project.uuid)
    }

    /** @type {import('react-dom/client').Root|null} */
    let root = window.__krikkitLabRoot ?? null
    if (!root) {
        root = createRoot(rootEl)
        window.__krikkitLabRoot = root
    }

    root.render(
        <LabApp initialProject={project} initialWorkspace={workspace} />,
    )
}
