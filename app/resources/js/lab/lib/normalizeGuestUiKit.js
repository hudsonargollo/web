import canonicalButtonRaw from '../../../lab/site-kit/src/components/ui/button.jsx?raw'
import { normalizeGuestUiKit as normalizeGuestUiKitCore } from './normalizeGuestUiKitCore.js'

export {
    projectUsesButtonAsChild,
    buttonNeedsAsChildPatch,
} from './normalizeGuestUiKitCore.js'

export const CANONICAL_BUTTON = String(canonicalButtonRaw || '')

/** @param {Record<string, string>} files */
export function normalizeGuestUiKit(files = {}, canonicalButton = CANONICAL_BUTTON) {
    return normalizeGuestUiKitCore(files, canonicalButton)
}
