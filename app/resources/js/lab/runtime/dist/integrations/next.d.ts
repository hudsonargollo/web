import type { NextRequest, NextResponse as NextResponseType } from "next/server";
/** Drop-in matcher for `export const config = { matcher: deepThoughtMatcher }`. */
export declare const deepThoughtMatcher = "/__deepthought_sw__.js";
/**
 * Route handler for `app/__deepthought_sw__.js/route.ts`.
 *
 * ```ts
 * export { GET } from '@krikkit/deepthought/next';
 * ```
 */
export declare function GET(): Promise<NextResponseType>;
/**
 * Composable handler for Next 16's `proxy.ts` or Next <=15's `middleware.ts`.
 * Returns a response for the SW path, or `null` so the caller's own logic
 * can take over.
 *
 * Also exported as `deepThoughtMiddleware` for projects still on Next <=15.
 */
export declare function deepThoughtProxy(req: NextRequest): Promise<NextResponseType | null>;
/** Alias of {@link deepThoughtProxy} for Next <=15 (`middleware.ts`). */
export declare const deepThoughtMiddleware: typeof deepThoughtProxy;
