/**
 * Canonical React version pin for Lab package.json writes.
 * Keep in sync with resources/lab/site-kit/package.json.
 */
export const PINNED_REACT_VERSION = '19.1.1'

export function stripDepVersion(version) {
    return String(version ?? '').replace(/^[\^~>=<\s]+/, '').trim()
}

/**
 * Resolve a matching react / react-dom pair for package.json pins.
 * Mismatched or missing versions fall back to the canonical pin.
 */
export function resolvePinnedReactPair(dependencies = {}) {
    const rawReact = dependencies.react
    const rawDom = dependencies['react-dom']

    const react = rawReact && rawReact !== 'latest' ? stripDepVersion(rawReact) : null
    const reactDom = rawDom && rawDom !== 'latest' ? stripDepVersion(rawDom) : null

    if (react && reactDom && react === reactDom) {
        return { react, reactDom }
    }
    if (react && ! reactDom) {
        return { react, reactDom: react }
    }
    if (reactDom && ! react) {
        return { react: reactDom, reactDom }
    }

    return {
        react: PINNED_REACT_VERSION,
        reactDom: PINNED_REACT_VERSION,
    }
}
