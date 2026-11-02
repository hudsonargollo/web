import { createRoot } from 'react-dom/client'
import { applyKrikkitTheme, readKrikkitTheme } from '../../krikkit-theme'
import { PreviewApp } from './PreviewApp'

applyKrikkitTheme()
window.krikkitTheme = {
    apply: applyKrikkitTheme,
    read: readKrikkitTheme,
}

const rootEl = document.getElementById('lab-preview-root')

if (rootEl) {
    /** @type {import('react-dom/client').Root|null} */
    let root = window.__krikkitLabPreviewRoot ?? null
    if (! root) {
        root = createRoot(rootEl)
        window.__krikkitLabPreviewRoot = root
    }
    root.render(<PreviewApp />)
}
