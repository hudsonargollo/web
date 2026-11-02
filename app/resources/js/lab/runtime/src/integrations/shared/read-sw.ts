// Finds and reads static/__deepthought_sw__.js from disk. Used by all the framework
// integrations. The file lives in different places depending on whether
// we're running from the shipped package or straight from src/, so we
// just try each candidate path and take the first one that exists.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { LAB_SW_FILENAME, LEGACY_SW_FILENAME } from "../../internal/lab-keys";

const SW_RELATIVE_PATHS = [
  `../${LAB_SW_FILENAME}`,
  `../${LEGACY_SW_FILENAME}`,
  `../../static/${LAB_SW_FILENAME}`,
  `../../static/${LEGACY_SW_FILENAME}`,
  `../../dist/${LAB_SW_FILENAME}`,
  `../../dist/${LEGACY_SW_FILENAME}`,
];

let cached: Promise<string> | null = null;

async function locateSW(fromFileUrl: string): Promise<string> {
  const baseDir = dirname(fileURLToPath(fromFileUrl));
  const errors: string[] = [];
  for (const rel of SW_RELATIVE_PATHS) {
    const candidate = resolve(baseDir, rel);
    try {
      await readFile(candidate);
      return candidate;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`  ${candidate}: ${msg}`);
    }
  }
  throw new Error(
    `[lab-runtime] could not locate service worker source. Tried:\n${errors.join("\n")}`,
  );
}

/**
 * Read the SW source. Pass `import.meta.url` from the caller so we can
 * resolve paths whether we're running from src/ or dist/.
 */
export async function readServiceWorkerSource(
  fromFileUrl: string,
): Promise<string> {
  if (!cached) {
    cached = (async () => {
      const path = await locateSW(fromFileUrl);
      return readFile(path, "utf8");
    })();
  }
  return cached;
}

/** Test-only: reset the module cache between cases. */
export function __resetServiceWorkerSourceCacheForTests(): void {
  cached = null;
}
