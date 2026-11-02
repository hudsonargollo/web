// Error thrown when DeepThoughtEngine.boot() can't reach /__deepthought_sw__.js. Includes a
// framework-specific hint so the user knows which one-liner to add.

export type DeepThoughtSWFrameworkHint = "vite" | "next" | "generic";

export interface DeepThoughtSWSetupErrorDetails {
  swUrl: string;
  status?: number;
  contentType?: string;
  /** Underlying network/abort error, if the preflight never got a response. */
  cause?: unknown;
  framework: DeepThoughtSWFrameworkHint;
}

const HINTS: Record<DeepThoughtSWFrameworkHint, string> = {
  vite: [
    "Detected Vite. Add the deepthought plugin to serve __deepthought_sw__.js automatically:",
    "",
    "  // vite.config.ts",
    "  import deepthought from '@krikkit/deepthought/vite';",
    "  export default defineConfig({ plugins: [deepthought()] });",
  ].join("\n"),
  next: [
    "Detected Next.js. Add a route handler to serve __deepthought_sw__.js:",
    "",
    "  // app/__deepthought_sw__.js/route.ts",
    "  export { GET } from '@krikkit/deepthought/next';",
    "",
    "Or compose `deepThoughtProxy` (Next 16+, proxy.ts) / `deepThoughtMiddleware`",
    "(Next <=15, middleware.ts) alongside your own handler.",
  ].join("\n"),
  generic: [
    "No recognised framework detected. Either:",
    "",
    "  1. Mount the framework-agnostic handler:",
    "       import { serveSW } from '@krikkit/deepthought/server';",
    "       app.get('/__deepthought_sw__.js', () => serveSW());",
    "",
    "  2. Or copy node_modules/@krikkit/deepthought/dist/__deepthought_sw__.js",
    "     into your public/ (or static/) directory so it's served at /__deepthought_sw__.js",
    "     from the same origin as your page.",
  ].join("\n"),
};

export class DeepThoughtSWSetupError extends Error {
  readonly details: DeepThoughtSWSetupErrorDetails;

  constructor(message: string, details: DeepThoughtSWSetupErrorDetails) {
    super(message);
    this.name = "DeepThoughtSWSetupError";
    this.details = details;
    if (details.cause !== undefined) {
      (this as { cause?: unknown }).cause = details.cause;
    }
  }

  override toString(): string {
    const { swUrl, status, contentType, framework } = this.details;
    const lines: string[] = [
      `DeepThoughtSWSetupError: ${this.message}`,
      "",
      `  Requested:    ${swUrl}`,
    ];
    if (status !== undefined) {
      lines.push(`  HTTP status:  ${status}`);
    }
    if (contentType !== undefined) {
      lines.push(`  Content-Type: ${contentType}`);
    }
    lines.push("", HINTS[framework]);
    return lines.join("\n");
  }
}

/**
 * Guess which framework hint to show by sniffing the current runtime.
 * Defaults to "generic" if nothing matches.
 */
export function detectFrameworkHint(): DeepThoughtSWFrameworkHint {
  try {
    const w = typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>)
      : null;
    if (w) {
      if (
        "__vite_plugin_react_preamble_installed__" in w ||
        "__VITE_PRELOAD__" in w ||
        "__vite_is_modern_browser" in w
      ) {
        return "vite";
      }
      if (
        "next" in w ||
        "__NEXT_DATA__" in w ||
        "__NEXT_ROUTER_BASEPATH__" in w
      ) {
        return "next";
      }
    }
  } catch {
    // detection must never throw
  }
  return "generic";
}
