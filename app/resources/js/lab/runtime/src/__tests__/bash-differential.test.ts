import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { MemoryVolume } from "../memory-volume";
import { DeepThoughtShell } from "../shell/shell-interpreter";

// Git Bash on Windows does not preserve argv exactly like Bash 5.x when
// launched through execFileSync; the corpus is required on Linux CI and is
// intentionally skipped on local Windows runs.
const bashAvailable = process.platform !== "win32" && spawnSync("bash", ["--version"], { stdio: "ignore" }).status === 0;

function runBash(script: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync("bash", ["--noprofile", "--norc", "-c", script], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error) {
    const result = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
    return {
      stdout: result.stdout?.toString() ?? "",
      stderr: result.stderr?.toString() ?? "",
      exitCode: result.status ?? 1,
    };
  }
}

async function runDeepThoughtEngine(script: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const volume = new MemoryVolume();
  volume.mkdirSync("/workspace", { recursive: true });
  volume.writeFileSync("/workspace/a.txt", "a\n");
  volume.writeFileSync("/workspace/b.txt", "b\n");
  const shell = new DeepThoughtShell(volume, { cwd: "/workspace", env: { PATH: "/usr/bin" } });
  return shell.exec(script);
}

describe.skipIf(!bashAvailable)("DeepThoughtEngine shell differential corpus", () => {
  for (const script of [
    "printf '%s\\n' hello world",
    "if true; then for x in a b; do printf '<%s>\\n' \"$x\"; done; fi",
    "set -o pipefail; false | true; printf '%s\\n' \"$?\"",
    "printf 'b\\na\\na\\n' | sort | uniq -c",
  ]) {
    it(`matches Bash for ${script}`, async () => {
      const [bash, deepthought] = await Promise.all([Promise.resolve(runBash(script)), runDeepThoughtEngine(script)]);
      expect(deepthought.stdout).toBe(bash.stdout);
      expect(deepthought.exitCode).toBe(bash.exitCode);
    });
  }
});
