import { listDirectory, pathExists, resolveVfsPath } from './vfs.js'

function parseArgs(line) {
    const tokens = []
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g
    let match
    while ((match = re.exec(line)) !== null) {
        tokens.push(match[1] ?? match[2] ?? match[3])
    }
    return tokens
}

/**
 * Run a single mock-shell command against VFS (no PTY).
 * @returns {{ exitCode: number, lines: string[], cwd: string }}
 */
export async function runVfsCommand(raw, {
    contents = {},
    tree = [],
    cwd = '',
    writeFile = null,
    removePath = null,
} = {}) {
    const line = String(raw || '').trim()
    const lines = []
    let nextCwd = cwd

    const say = (text) => {
        for (const row of String(text).split('\n')) lines.push(row)
    }

    if (! line) {
        return { exitCode: 0, lines, cwd: nextCwd }
    }

    const args = parseArgs(line)
    const cmd = (args[0] || '').toLowerCase()
    const rest = args.slice(1)

    if (cmd === 'help') {
        say('help  clear  pwd  cd  ls  cat  touch  rm')
        return { exitCode: 0, lines, cwd: nextCwd }
    }

    if (cmd === 'pwd') {
        say(`/${nextCwd}`)
        return { exitCode: 0, lines, cwd: nextCwd }
    }

    if (cmd === 'cd') {
        const target = rest[0] || ''
        if (! target || target === '~' || target === '/') {
            return { exitCode: 0, lines, cwd: '' }
        }
        const resolved = resolveVfsPath(nextCwd, target)
        if (resolved !== '' && ! pathExists(contents, tree, resolved)) {
            const prefix = `${resolved}/`
            const asDir = Object.keys(contents).some((p) => p.startsWith(prefix))
                || listDirectory(contents, tree, '', resolved).length > 0
            if (! asDir) {
                say(`cd: no such directory: ${target}`)
                return { exitCode: 1, lines, cwd: nextCwd }
            }
        }
        if (Object.prototype.hasOwnProperty.call(contents, resolved)) {
            say(`cd: not a directory: ${target}`)
            return { exitCode: 1, lines, cwd: nextCwd }
        }
        return { exitCode: 0, lines, cwd: resolved }
    }

    if (cmd === 'ls' || cmd === 'dir') {
        const names = listDirectory(contents, tree, nextCwd, rest[0] || '.')
        say(names.length ? names.join('  ') : '(empty)')
        return { exitCode: 0, lines, cwd: nextCwd }
    }

    if (cmd === 'cat') {
        if (! rest[0]) {
            say('usage: cat <path>')
            return { exitCode: 1, lines, cwd: nextCwd }
        }
        const path = resolveVfsPath(nextCwd, rest[0])
        if (! Object.prototype.hasOwnProperty.call(contents, path)) {
            say(`cat: ${rest[0]}: No such file`)
            return { exitCode: 1, lines, cwd: nextCwd }
        }
        say(contents[path] ?? '')
        return { exitCode: 0, lines, cwd: nextCwd }
    }

    if (cmd === 'touch') {
        if (! rest[0]) {
            say('usage: touch <path>')
            return { exitCode: 1, lines, cwd: nextCwd }
        }
        if (! writeFile) {
            say('error: workspace VFS is not ready')
            return { exitCode: 1, lines, cwd: nextCwd }
        }
        const path = resolveVfsPath(nextCwd, rest[0])
        const existing = Object.prototype.hasOwnProperty.call(contents, path)
            ? contents[path]
            : ''
        const ok = await writeFile(path, existing)
        if (! ok) {
            say(`error: could not write ${path}`)
            return { exitCode: 1, lines, cwd: nextCwd }
        }
        return { exitCode: 0, lines, cwd: nextCwd }
    }

    if (cmd === 'rm') {
        if (! rest[0]) {
            say('usage: rm <path>')
            return { exitCode: 1, lines, cwd: nextCwd }
        }
        if (! removePath) {
            say('error: workspace VFS is not ready')
            return { exitCode: 1, lines, cwd: nextCwd }
        }
        const path = resolveVfsPath(nextCwd, rest[0])
        const ok = await removePath(path)
        if (! ok) {
            say(`rm: cannot remove '${rest[0]}'`)
            return { exitCode: 1, lines, cwd: nextCwd }
        }
        return { exitCode: 0, lines, cwd: nextCwd }
    }

    say(`command not found: ${cmd}`)
    return { exitCode: 127, lines, cwd: nextCwd }
}
