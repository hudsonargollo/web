const STEP_DEFS = [
    { id: 'prepare', label: 'Prepare', phases: ['preparing', 'boot'] },
    { id: 'sync', label: 'Sync files', phases: ['sync'] },
    { id: 'packages', label: 'Packages', phases: ['install', 'install-log', 'install-cached', 'install-done'] },
    { id: 'build', label: 'Build site', phases: ['build'] },
    { id: 'pack', label: 'Package', phases: ['pack', 'pack-done'] },
    { id: 'upload', label: 'Upload', phases: ['uploading'] },
]

const PHASE_LABELS = {
    preparing: 'Starting publish…',
    boot: 'Starting runtime…',
    sync: 'Syncing project files…',
    install: 'Installing packages…',
    'install-log': 'Installing packages…',
    'install-cached': 'Packages ready.',
    'install-done': 'Packages installed.',
    build: 'Building your site…',
    pack: 'Packaging files…',
    'pack-done': 'Build packaged.',
    uploading: 'Uploading to the server…',
}

export function publishPhaseLabel(phase) {
    return PHASE_LABELS[phase] || (phase ? 'Working…' : '')
}

export function publishStepIndex(phase) {
    if (! phase) return -1
    return STEP_DEFS.findIndex((step) => step.phases.includes(phase))
}

export function publishSteps() {
    return STEP_DEFS
}

export function appendPublishLog(lines, line, max = 120) {
    const text = String(line || '').trim()
    if (! text) return lines
    const next = [...lines, text]
    return next.length > max ? next.slice(next.length - max) : next
}
