import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { gzipSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));

const peerDeps = ["vite", "next", "next/server"];
const allExternal = [...peerDeps, /^node:/];

function inlineProcessWorkerPlugin() {
  const VIRTUAL_ID = "virtual:process-worker-bundle";
  const RESOLVED_ID = "\0" + VIRTUAL_ID;
  let workerBundle = "";

  return {
    name: "inline-process-worker",
    async buildStart() {
      const result = await esbuild({
        entryPoints: [resolve(__dirname, "src/threading/process-worker-entry.ts")],
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "esnext",
        write: false,
        minify: true,
        legalComments: "none",
        sourcemap: false,
      });
      workerBundle = result.outputFiles[0].text;
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        const compressed = gzipSync(Buffer.from(workerBundle)).toString("base64");
        return `export const PROCESS_WORKER_BUNDLE_GZIP_BASE64 = ${JSON.stringify(compressed)};`;
      }
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "__worker__.js",
        source: workerBundle,
      });
    },
  };
}

export default defineConfig({
  plugins: [wasm(), topLevelAwait(), inlineProcessWorkerPlugin()],
  worker: {
    format: "es",
    rollupOptions: {
      external: allExternal,
    },
  },
  build: {
    target: "esnext",
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        headless: resolve(__dirname, "src/headless.ts"),
        "integrations/server": resolve(__dirname, "src/integrations/server.ts"),
        "integrations/vite": resolve(__dirname, "src/integrations/vite.ts"),
        "integrations/next": resolve(__dirname, "src/integrations/next.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        const ext = format === "es" ? "mjs" : "cjs";
        return `${entryName}.${ext}`;
      },
    },
    rollupOptions: {
      external: allExternal,
      preserveEntrySignatures: "strict",
    },
    sourcemap: true,
    minify: "esbuild",
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: false,
  },
});
