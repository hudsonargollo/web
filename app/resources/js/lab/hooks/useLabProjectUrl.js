import { useEffect, useState } from 'react'
import { parseLabPath, setDocumentTitle } from '../lib/labUrl'

/**
 * Project identity + building flag synced to /lab/:uuid[/workspace] history.
 */
export function useLabProjectUrl({ initialProject = null, initialWorkspace = false } = {}) {
    const [building, setBuilding] = useState(() => {
        if (typeof window === 'undefined') {
            return Boolean(initialWorkspace)
        }
        const parsed = parseLabPath(window.location.pathname)
        return Boolean(initialWorkspace) || Boolean(parsed?.workspace)
    })
    const [projectUuid, setProjectUuid] = useState(initialProject?.uuid || null)
    const [projectTitle, setProjectTitle] = useState(initialProject?.title || null)
    const [composeModeReset, setComposeModeReset] = useState(0)

    useEffect(() => {
        if (! projectUuid) return
        if (projectTitle) setDocumentTitle(projectTitle)

        const projectPath = `/lab/${projectUuid}`
        const workspacePath = `${projectPath}/workspace`
        const path = window.location.pathname

        if (building) {
            if (path === workspacePath) return
            // Entering workspace: push so browser Back returns to the chat URL.
            if (path === projectPath || path === '/lab' || path === '/lab/') {
                window.history.pushState(
                    { lab: true, uuid: projectUuid, workspace: true },
                    '',
                    workspacePath,
                )
                return
            }
            window.history.replaceState(
                { lab: true, uuid: projectUuid, workspace: true },
                '',
                workspacePath,
            )
            return
        }

        if (! building) {
            // URL already on /workspace — open the rail; don't rewrite back to chat.
            if (path === workspacePath) {
                setBuilding(true)
                return
            }
            if (path === projectPath) return
            // Leaving workspace / syncing project id: replace, never push a bare /lab sandwich.
            window.history.replaceState(
                { lab: true, uuid: projectUuid, workspace: false },
                '',
                projectPath,
            )
            return
        }
    }, [projectUuid, projectTitle, building])

    // Browser back/forward within Lab: sync workspace UI, or hard-load when the project changes.
    useEffect(() => {
        let leaving = false

        const syncFromLocation = () => {
            if (leaving) return

            const parsed = parseLabPath(window.location.pathname)
            if (! parsed) {
                leaving = true
                window.location.assign(window.location.href)
                return
            }

            if (parsed.uuid && parsed.uuid !== projectUuid) {
                leaving = true
                window.location.assign(window.location.href)
                return
            }

            if (! parsed.uuid && projectUuid) {
                leaving = true
                window.location.assign(window.location.href)
                return
            }

            const inWorkspace = Boolean(parsed.workspace)
            setBuilding(inWorkspace)
            if (! inWorkspace) {
                setComposeModeReset((n) => n + 1)
            }
        }

        const onPageShow = (event) => {
            if (event.persisted) syncFromLocation()
        }

        window.addEventListener('popstate', syncFromLocation)
        window.addEventListener('pageshow', onPageShow)
        syncFromLocation()

        return () => {
            window.removeEventListener('popstate', syncFromLocation)
            window.removeEventListener('pageshow', onPageShow)
        }
    }, [projectUuid])

    const crumbTitle = projectTitle?.trim() || (projectUuid ? 'Untitled' : null)

    return {
        building,
        setBuilding,
        projectUuid,
        setProjectUuid,
        projectTitle,
        setProjectTitle,
        crumbTitle,
        /** Bumps when leaving workspace via history — LabApp resets composeMode to rail. */
        composeModeReset,
    }
}
