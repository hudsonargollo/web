// One place for the headers used when serving the Lab service worker, so Vite, Next and
// the generic server handler can't drift apart.

import {
  DEFAULT_SW_PATH,
  LAB_SW_PATH,
  LEGACY_SW_PATH,
  labServiceWorkerPaths,
} from "../../internal/lab-keys";

export { DEFAULT_SW_PATH, LAB_SW_PATH, LEGACY_SW_PATH, labServiceWorkerPaths };

/**
 * Headers for the Lab service worker response.
 *
 * Content-Type must be a JS type or browsers silently refuse to register
 * the SW (the common failure mode is SPA dev servers serving text/html
 * as a fallback and quietly breaking things).
 *
 * Service-Worker-Allowed: / lets the SW control the whole origin even if
 * the script itself lives under a nested path.
 *
 * Cache-Control: no-cache pairs with the `?v=` cache-buster the SDK appends
 * on register(), so upgrades don't get a stale SW.
 */
export function swResponseHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/javascript; charset=utf-8",
    "Service-Worker-Allowed": "/",
    "Cache-Control": "no-cache",
  };
}
