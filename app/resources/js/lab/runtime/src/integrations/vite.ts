// Vite plugin that serves the Lab service worker in dev and emits it as assets at
// build time, so the user never has to copy the file into public/.

import type { Plugin } from "vite";
import { readServiceWorkerSource } from "./shared/read-sw";
import { readWorkerBundleSource } from "./shared/read-worker";
import {
  swResponseHeaders,
  LEGACY_SW_PATH,
  labServiceWorkerPaths,
} from "./shared/headers";
import { LAB_SW_FILENAME, LEGACY_SW_FILENAME } from "../internal/lab-keys";

const WORKER_ASSET_PATH = "/__worker__.js";

export interface DeepThoughtVitePluginOptions {
  /** Path to serve the SW from. Same origin as the page, must end in .js. Defaults to /__krikkit_lab_sw__.js. */
  path?: string;
}

export default function deepthought(
  opts: DeepThoughtVitePluginOptions = {},
): Plugin {
  const swPath = opts.path ?? DEFAULT_SW_PATH;
  const servedSwPaths = new Set([
    ...labServiceWorkerPaths(),
    swPath.replace(/\?.*$/, ""),
  ]);

  return {
    name: "deepthought",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === WORKER_ASSET_PATH) {
          const source = await readWorkerBundleSource(import.meta.url).catch(() => null);
          if (source === null) return next();
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          res.statusCode = 200;
          res.end(source);
          return;
        }
        if (!url || !servedSwPaths.has(url)) return next();
        try {
          const source = await readServiceWorkerSource(import.meta.url);
          const headers = swResponseHeaders();
          for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
          res.statusCode = 200;
          res.end(source);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain");
          const msg = err instanceof Error ? err.message : String(err);
          res.end(`[lab-runtime/vite] failed to read service worker source: ${msg}`);
        }
      });
    },
    async generateBundle() {
      const source = await readServiceWorkerSource(import.meta.url);
      for (const fileName of [LAB_SW_FILENAME, LEGACY_SW_FILENAME]) {
        this.emitFile({
          type: "asset",
          fileName,
          source,
        });
      }
      const workerSource = await readWorkerBundleSource(import.meta.url).catch(() => null);
      if (workerSource !== null) {
        this.emitFile({
          type: "asset",
          fileName: WORKER_ASSET_PATH.replace(/^\/+/, ""),
          source: workerSource,
        });
      }
    },
  };
}

export { deepthought };
