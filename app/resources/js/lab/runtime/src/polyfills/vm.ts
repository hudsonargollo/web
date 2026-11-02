// VM polyfill using eval/Function since no V8 isolate API in browser

import { createEventTargetContext } from "./event-target";

/* ------------------------------------------------------------------ */
/*  Script                                                             */
/* ------------------------------------------------------------------ */

export interface Script {
  runInThisContext(_opts?: object): unknown;
  runInNewContext(ctx?: object, _opts?: object): unknown;
  runInContext(ctx: object, _opts?: object): unknown;
  createCachedData(): Uint8Array;
}

export const Script = function Script(this: any, src: string, _opts?: object) {
  if (!this) return;
  this._src = src;
} as unknown as { new(src: string, _opts?: object): Script; prototype: any };

Script.prototype.runInThisContext = function runInThisContext(_opts?: object): unknown {
  return (0, eval)(this._src);
};

Script.prototype.runInNewContext = function runInNewContext(ctx?: object, _opts?: object): unknown {
  const sandbox = contextify(ctx ?? {});
  // Node contextifies the given object in place. Shadow realm globals with
  // the sandbox; `with` exposes require/module/process from the same object.
  // Do not hoist every key as a Function param — that shadows assignments
  // Next's evalManifest writes onto ctx.__RSC_MANIFEST.
  if (typeof sandbox.globalThis === "undefined") sandbox.globalThis = sandbox;
  if (typeof sandbox.self === "undefined") sandbox.self = sandbox;
  if (typeof sandbox.global === "undefined") sandbox.global = sandbox;
  // eval() — not a function body — so expression scripts return a value.
  // Webpack magic comments are `vm.runInNewContext('(function(){return {...};})()')`;
  // wrapping that as a statement discarded the object and webpack then did
  // Object.assign(options, undefined) → "Cannot convert undefined or null to object".
  const wrapper = new Function(
    "globalThis",
    "self",
    "global",
    "sandbox",
    `with (sandbox) { return eval(${JSON.stringify(this._src)}); }`,
  );
  return wrapper.call(sandbox, sandbox, sandbox, sandbox, sandbox);
};

Script.prototype.runInContext = function runInContext(ctx: object, _opts?: object): unknown {
  return this.runInNewContext(ctx, _opts);
};

Script.prototype.createCachedData = function createCachedData(): Uint8Array {
  return new Uint8Array(0);
};

/* ------------------------------------------------------------------ */
/*  Standalone helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Node's vm.createContext contextifies the sandbox so it behaves like an
 * EventTarget global (addEventListener / dispatchEvent). EdgeRuntime depends
 * on `runtime.context.addEventListener('error' | 'unhandledrejection', …)`.
 *
 * IMPORTANT: when `sandbox` is already contextified, we enrich it in place so
 * `runInContext` writes (e.g. `self._ENTRIES.middleware_middleware`) land on
 * the same object EdgeRuntime holds as `runtime.context`.
 */
function contextify(sandbox: object): Record<string, unknown> {
  return createEventTargetContext(sandbox);
}

export function createContext(sandbox?: object, _opts?: object): object {
  return contextify(sandbox ?? {});
}

export function isContext(_box: object): boolean {
  return true;
}

export function runInThisContext(code: string, _opts?: object): unknown {
  return (0, eval)(code);
}

export function runInNewContext(code: string, ctx?: object, _opts?: object): unknown {
  return new Script(code).runInNewContext(ctx);
}

export function runInContext(code: string, ctx: object, _opts?: object): unknown {
  return runInNewContext(code, ctx);
}

export function compileFunction(
  body: string,
  params?: string[],
  _opts?: object
): Function {
  return new Function(...(params ?? []), body);
}

/* ------------------------------------------------------------------ */
/*  ESM Module stubs                                                   */
/* ------------------------------------------------------------------ */

export interface Module {
  link(_linker: unknown): Promise<void>;
  evaluate(_opts?: object): Promise<unknown>;
  readonly status: string;
  readonly identifier: string;
  readonly context: object;
  readonly namespace: object;
}

export const Module = function Module(this: any, _code: string, _opts?: object) {
  if (!this) return;
} as unknown as { new(_code: string, _opts?: object): Module; prototype: any };

Module.prototype.link = function link(_linker: unknown): Promise<void> { return Promise.resolve(); };
Module.prototype.evaluate = function evaluate(_opts?: object): Promise<unknown> { return Promise.resolve(); };
Object.defineProperty(Module.prototype, 'status', { get() { return 'unlinked'; }, configurable: true });
Object.defineProperty(Module.prototype, 'identifier', { get() { return ''; }, configurable: true });
Object.defineProperty(Module.prototype, 'context', {
  get() {
    return createContext({});
  },
  configurable: true,
});
Object.defineProperty(Module.prototype, 'namespace', { get() { return {}; }, configurable: true });

export interface SourceTextModule extends Module {}

export const SourceTextModule = function SourceTextModule(this: any, _code: string, _opts?: object) {
  if (!this) return;
  (Module as any).call(this, _code, _opts);
} as unknown as { new(_code: string, _opts?: object): SourceTextModule; prototype: any };

Object.setPrototypeOf(SourceTextModule.prototype, Module.prototype);

export interface SyntheticModule extends Module {
  setExport(_name: string, _value: unknown): void;
}

export const SyntheticModule = function SyntheticModule(this: any, _code: string, _opts?: object) {
  if (!this) return;
  (Module as any).call(this, _code, _opts);
} as unknown as { new(_code: string, _opts?: object): SyntheticModule; prototype: any };

Object.setPrototypeOf(SyntheticModule.prototype, Module.prototype);

SyntheticModule.prototype.setExport = function setExport(_name: string, _value: unknown): void {};

/* ------------------------------------------------------------------ */
/*  Default export                                                     */
/* ------------------------------------------------------------------ */

export default {
  Script,
  createContext,
  isContext,
  runInThisContext,
  runInNewContext,
  runInContext,
  compileFunction,
  Module,
  SourceTextModule,
  SyntheticModule,
};
