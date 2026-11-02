const defaults = {
    close: 'Close',
    chooseAnAccount: 'Choose an account',
    connectGithub: 'Connect GitHub',
    connectGithubHint: 'Import repositories from your GitHub account.',
    disconnect: 'Disconnect',
    enterPublicGithubUrl: 'Enter a public GitHub repository URL.',
    githubAccount: 'GitHub account',
    githubUnavailable: 'GitHub connection is unavailable.',
    import: 'Import',
    importFromAUrl: 'Import from a URL',
    importFromGithub: 'Import from GitHub',
    importing: 'Importing…',
    loading: 'Loading…',
    noGithubAccount: 'No GitHub account connected.',
    noRepositoriesFound: 'No repositories found.',
    repositoryUrlPlaceholder: 'https://github.com/owner/repo',
    searchRepositories: 'Search repositories…',
    selectARepository: 'Select a Repository',
    branch: 'Branch',
    rootDirectory: 'Root directory',
    rootDirectoryPlaceholder: 'apps/web',
    firstPrompt: 'First prompt',
    firstPromptPlaceholder: 'What should Lab build from this repository?',
    optional: 'optional',
    githubDesk: 'GitHub',
    githubPush: 'Push',
    githubPull: 'Pull',
    githubCompare: 'Tree vs',
    githubFork: 'Fork',
    githubLink: 'Link',
    githubCreate: 'Create',
    githubUnlink: 'Unlink',
    githubCommitMessage: 'Commit message',
    githubForcePush: 'Force push if the branch diverged',
    githubCreateAndPush: 'Create repo and push',
    githubForkImport: 'Fork and import',
    githubLinkRepo: 'Link repository',
    githubRepoName: 'repository-name',
    githubWaitConnect: 'Chat is waiting for GitHub to be connected.',
    githubWaitRemote: 'Chat is waiting for a GitHub repository on this project.',
    githubClean: 'Local matches GitHub.',
    githubAdded: 'Added',
    githubModified: 'Modified',
    githubRemoved: 'Removed',
    githubNeedProject: 'Open a Lab project first, then connect GitHub.',
}

let cache = null

/**
 * Lab UI strings from #lab-config.i18n (Blade __()), with English fallbacks.
 */
export function labI18n() {
    if (cache) return cache

    let fromBoot = {}
    try {
        const node = document.getElementById('lab-config')
        const raw = node?.textContent?.trim()
        if (raw && raw !== 'null') {
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed.i18n === 'object' && parsed.i18n) {
                fromBoot = parsed.i18n
            }
        }
    } catch {
        fromBoot = {}
    }

    cache = { ...defaults, ...fromBoot }
    return cache
}
