import type { Plugin } from "vite";
export interface DeepThoughtVitePluginOptions {
    /** Path to serve the SW from. Same origin as the page, must end in .js. Defaults to /__deepthought_sw__.js. */
    path?: string;
}
export default function deepthought(opts?: DeepThoughtVitePluginOptions): Plugin;
export { deepthought };
