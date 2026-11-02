import type { RuntimeHost } from "./types";
import {
  LEGACY_GLOBAL_BROWSER_HOST_FACTORY,
  publishGlobalBrowserHostFactory,
  readGlobalBrowserHostFactory,
} from "../internal/lab-keys";

let _host: RuntimeHost | null = null;
let _defaultFactory: (() => RuntimeHost) | null = null;

/** @deprecated Use readGlobalBrowserHostFactory from internal/lab-keys */
export const GLOBAL_FACTORY_KEY = LEGACY_GLOBAL_BROWSER_HOST_FACTORY;

function readGlobalFactory(): (() => RuntimeHost) | null {
  const hooked = readGlobalBrowserHostFactory();
  return hooked ? (hooked as () => RuntimeHost) : null;
}

/** Used by the browser entry / browser-host to register a lazy default. */
export function registerDefaultHostFactory(
  factory: (() => RuntimeHost) | null,
): void {
  _defaultFactory = factory;
  publishGlobalBrowserHostFactory(factory);
}

/** Install a runtime host (browser default, or Node via headless host). */
export function setRuntimeHost(host: RuntimeHost): void {
  _host = host;
}

function resolveFactory(): (() => RuntimeHost) | null {
  return _defaultFactory ?? readGlobalFactory();
}

export function getRuntimeHost(): RuntimeHost {
  if (!_host) {
    const factory = resolveFactory();
    if (!factory) {
      throw new Error(
        "[DeepThoughtEngine] No RuntimeHost registered. Import the Lab runtime bundle or headless host.",
      );
    }
    _defaultFactory = factory;
    _host = factory();
  }
  return _host;
}

/**
 * Resolve a RuntimeHost after async chunk init. `vite-plugin-top-level-await`
 * wraps chunks in async IIFEs, so browser-host's global factory hook can land
 * a tick after static imports finish. Headless callers that already
 * `setRuntimeHost` return immediately.
 */
export async function ensureRuntimeHost(): Promise<RuntimeHost> {
  if (_host) return _host;

  for (let i = 0; i < 50; i++) {
    const factory = resolveFactory();
    if (factory) {
      _defaultFactory = factory;
      _host = factory();
      return _host;
    }
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  return getRuntimeHost();
}

/** Reset the active host instance (tests). */
export function resetRuntimeHost(): void {
  _host?.disposeGlobalResources?.();
  _host = null;
}
