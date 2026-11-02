/**
 * EventTarget helpers for VM contexts / globals.
 * Next.js EdgeRuntime calls `runtime.context.addEventListener(...)` after
 * `vm.createContext()` — Node contextifies sandboxes as real EventTargets.
 *
 * NOTE: `Object.setPrototypeOf(obj, EventTarget.prototype)` fails brand checks
 * in browsers/Node ("Illegal invocation" / internal slot errors). Prefer
 * `new EventTarget()` + assign, or a Map-backed shim.
 */

type Listener = EventListenerOrEventListenerObject | ((event: Event) => void);

function normalizeListener(fn: Listener): EventListener | null {
  if (typeof fn === "function") return fn as EventListener;
  if (fn && typeof (fn as EventListenerObject).handleEvent === "function") {
    return (event: Event) =>
      (fn as EventListenerObject).handleEvent.call(fn, event);
  }
  return null;
}

/** Map-backed add/remove/dispatchEvent — safe on plain objects. */
export function installEventTargetMethods(
  target: object,
  opts: { force?: boolean } = {},
): void {
  const obj = target as Record<string, unknown>;
  if (!opts.force && typeof obj.addEventListener === "function") return;

  const listeners = new Map<string, Set<EventListener>>();

  obj.addEventListener = function addEventListener(
    type: string,
    listener: Listener,
    _options?: boolean | AddEventListenerOptions,
  ): void {
    const fn = normalizeListener(listener);
    if (!fn || typeof type !== "string") return;
    let set = listeners.get(type);
    if (!set) {
      set = new Set();
      listeners.set(type, set);
    }
    set.add(fn);
  };

  obj.removeEventListener = function removeEventListener(
    type: string,
    listener: Listener,
    _options?: boolean | EventListenerOptions,
  ): void {
    const fn = normalizeListener(listener);
    if (!fn) return;
    listeners.get(type)?.delete(fn);
  };

  obj.dispatchEvent = function dispatchEvent(event: Event): boolean {
    if (!event || typeof event.type !== "string") return true;
    const set = listeners.get(event.type);
    if (!set || set.size === 0) return true;
    for (const fn of [...set]) {
      try {
        fn.call(target, event);
      } catch {
        /* ignore listener errors */
      }
    }
    return true;
  };
}

/**
 * Seed a VM/context global with host builtins. Node's vm.createContext
 * exposes Error/Object/… on the context; EdgeRuntime then does
 * `runtime.context.Error.prepareStackTrace = …`.
 */
const CONTEXT_BUILTIN_KEYS = [
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "ReferenceError",
  "AggregateError",
  "Object",
  "Array",
  "Boolean",
  "Number",
  "String",
  "Symbol",
  "BigInt",
  "Math",
  "JSON",
  "Date",
  "RegExp",
  "Promise",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Proxy",
  "Reflect",
  "Function",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "NaN",
  "Infinity",
  "undefined",
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Uint8Array",
  "Int8Array",
  "Uint16Array",
  "Int16Array",
  "Uint32Array",
  "Int32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array",
  "Uint8ClampedArray",
  "TextEncoder",
  "TextDecoder",
  "URL",
  "URLSearchParams",
  "atob",
  "btoa",
  "queueMicrotask",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "console",
  "crypto",
  "performance",
  "Event",
  "EventTarget",
  "AbortController",
  "AbortSignal",
  "ReadableStream",
  "WritableStream",
  "TransformStream",
  "Blob",
  "File",
  "FormData",
  "Headers",
  "Request",
  "Response",
  "fetch",
] as const;

/** Make Error.prepareStackTrace assignable (Next edge error inspect). */
export function ensureErrorPrepareStackTrace(ErrorCtor: unknown): void {
  if (typeof ErrorCtor !== "function") return;
  const Err = ErrorCtor as typeof Error & {
    prepareStackTrace?: unknown;
    stackTraceLimit?: number;
  };

  let writable = false;
  try {
    const prev = Err.prepareStackTrace;
    const probe = function prepareStackTraceProbe(
      _err: Error,
      _frames: unknown,
    ) {
      return "";
    };
    Err.prepareStackTrace = probe as typeof Err.prepareStackTrace;
    writable = Err.prepareStackTrace === probe;
    Err.prepareStackTrace = prev as typeof Err.prepareStackTrace;
  } catch {
    writable = false;
  }

  if (!writable) {
    let prepareStackTrace: unknown = Err.prepareStackTrace;
    try {
      Object.defineProperty(Err, "prepareStackTrace", {
        configurable: true,
        enumerable: false,
        get() {
          return prepareStackTrace;
        },
        set(fn: unknown) {
          prepareStackTrace = fn;
        },
      });
    } catch {
      /* ignore */
    }
  }

  if (typeof Err.stackTraceLimit !== "number") {
    try {
      Object.defineProperty(Err, "stackTraceLimit", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: 10,
      });
    } catch {
      /* ignore */
    }
  }
}

function seedContextBuiltins(ctx: Record<string, unknown>): void {
  const g = globalThis as Record<string, unknown>;
  for (const key of CONTEXT_BUILTIN_KEYS) {
    if (typeof ctx[key] !== "undefined") continue;
    if (key === "undefined") {
      ctx[key] = undefined;
      continue;
    }
    try {
      if (key in g) ctx[key] = g[key];
    } catch {
      /* ignore cross-realm / revoked */
    }
  }

  if (typeof ctx.Error !== "function") {
    ctx.Error = Error;
  }
  ensureErrorPrepareStackTrace(ctx.Error);
  // Keep host Error writable too — Next sometimes patches the outer realm.
  ensureErrorPrepareStackTrace(Error);
}

/** Nested empty Proxy for missing Next manifest keys. */
function createManifestFallback(): object {
  const store: Record<PropertyKey, unknown> = Object.create(null);
  return new Proxy(store, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      if (typeof prop === "symbol") return undefined;
      const child = createManifestFallback();
      target[prop] = child;
      return child;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      return true;
    },
  });
}

/**
 * Next edge sandbox reads `runtime.context._ENTRIES['middleware_*']` after
 * evaluating the middleware wrapper (`self._ENTRIES ||= {}`). Seed the map
 * and common manifests so a missing key is an object miss, not `_ENTRIES`
 * itself being undefined.
 */
export function ensureNextEdgeGlobals(ctx: Record<string, unknown>): void {
  if (ctx._ENTRIES == null || typeof ctx._ENTRIES !== "object") {
    ctx._ENTRIES = Object.create(null);
  }
  if (typeof ctx.__BUILD_MANIFEST === "undefined") {
    ctx.__BUILD_MANIFEST = createManifestFallback();
  }
  if (typeof ctx.__NEXT_MIDDLEWARE_MANIFEST === "undefined") {
    ctx.__NEXT_MIDDLEWARE_MANIFEST = createManifestFallback();
  }
  // Do NOT auto-vivify __RSC_MANIFEST. Next evalManifest does
  // `globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {}` then
  // writes page keys; a Proxy here makes those writes unreadable.
  if (typeof ctx.__NEXT_DATA__ === "undefined") {
    ctx.__NEXT_DATA__ = {};
  }
}

/**
 * Enrich an existing sandbox in place (same object identity).
 * Critical for EdgeRuntime: `runInContext` must write `self._ENTRIES` onto
 * the same object `runtime.context` points at.
 */
export function enrichContextInPlace(
  sandbox: object,
): Record<string, unknown> {
  const ctx = sandbox as Record<string, unknown>;
  installEventTargetMethods(ctx);
  seedContextBuiltins(ctx);
  ensureNextEdgeGlobals(ctx);
  if (typeof ctx.globalThis === "undefined") ctx.globalThis = ctx;
  if (typeof ctx.self === "undefined") ctx.self = ctx;
  if (typeof ctx.global === "undefined") ctx.global = ctx;
  return ctx;
}

/**
 * Build a Node-like contextified sandbox.
 *
 * Node's `vm.createContext(sandbox)` / `runInNewContext(code, sandbox)`
 * contextify **that object in place** and return the same reference.
 * Next `evalManifest` writes `sandbox.__RSC_MANIFEST` then reads it back
 * off the original object — replacing it with a new EventTarget drops the
 * client reference manifest (InvariantError).
 */
export function createEventTargetContext(
  sandbox?: object,
): Record<string, unknown> {
  const base = (sandbox ?? {}) as Record<string, unknown>;
  if (typeof base.addEventListener !== "function") {
    installEventTargetMethods(base, { force: true });
  }
  return enrichContextInPlace(base);
}

/**
 * Ensure EventTarget exists and globalThis can register error / rejection
 * listeners (Next edge sandbox + DeepThought child_process guards).
 */
export function installGlobalEventTarget(
  g: typeof globalThis = globalThis,
): void {
  if (typeof (g as any).EventTarget !== "function") {
    class EventTargetShim {
      #listeners = new Map<string, Set<EventListener>>();
      addEventListener(
        type: string,
        listener: Listener,
        _options?: boolean | AddEventListenerOptions,
      ): void {
        const fn = normalizeListener(listener);
        if (!fn) return;
        let set = this.#listeners.get(type);
        if (!set) {
          set = new Set();
          this.#listeners.set(type, set);
        }
        set.add(fn);
      }
      removeEventListener(
        type: string,
        listener: Listener,
        _options?: boolean | EventListenerOptions,
      ): void {
        const fn = normalizeListener(listener);
        if (!fn) return;
        this.#listeners.get(type)?.delete(fn);
      }
      dispatchEvent(event: Event): boolean {
        if (!event || typeof event.type !== "string") return true;
        const set = this.#listeners.get(event.type);
        if (!set) return true;
        for (const fn of [...set]) {
          try {
            fn.call(this, event);
          } catch {
            /* ignore */
          }
        }
        return true;
      }
    }
    try {
      Object.defineProperty(g, "EventTarget", {
        value: EventTargetShim,
        writable: true,
        configurable: true,
      });
    } catch {
      (g as any).EventTarget = EventTargetShim;
    }
  }

  // Don't rewire globalThis's prototype (brand / host object). Only fill gaps.
  if (typeof (g as any).addEventListener !== "function") {
    installEventTargetMethods(g, { force: true });
  }
  if (typeof (g as any).addEventListener !== "function") {
    (g as any).addEventListener = () => {};
    (g as any).removeEventListener = () => {};
  }
  if (typeof (g as any).dispatchEvent !== "function") {
    (g as any).dispatchEvent = () => true;
  }

  if (typeof (g as any).Error === "undefined") {
    (g as any).Error = Error;
  }
  ensureErrorPrepareStackTrace((g as any).Error);
  ensureErrorPrepareStackTrace(Error);

  // Host-level Next edge fallbacks (module eval may touch these on globalThis).
  if ((g as any)._ENTRIES == null || typeof (g as any)._ENTRIES !== "object") {
    (g as any)._ENTRIES = Object.create(null);
  }
  if (typeof (g as any).__BUILD_MANIFEST === "undefined") {
    (g as any).__BUILD_MANIFEST = {};
  }
  if (typeof (g as any).__NEXT_MIDDLEWARE_MANIFEST === "undefined") {
    (g as any).__NEXT_MIDDLEWARE_MANIFEST = {};
  }
}
