/**
 * Single import surface for the Lab in-browser runtime core.
 * Source tree: resources/js/lab/runtime/
 */
export {
    LabRuntime,
    ensureRuntimeHost,
    setRuntimeHost,
} from '../runtime/dist/index.mjs'

/** @deprecated Use LabRuntime */
export { LabRuntime as DeepThoughtEngine } from '../runtime/dist/index.mjs'
