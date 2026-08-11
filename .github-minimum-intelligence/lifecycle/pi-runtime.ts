import { cpSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";

/**
 * Copy the committed pi configuration into an ignored, process-local agent
 * directory. Pi treats this directory as trusted global configuration while
 * keeping runtime caches and credentials out of the tracked source tree.
 */
export function preparePiAgentDir(
  minimumIntelligenceDir: string,
  instanceId = String(process.pid),
): string {
  const sourceDir = resolve(minimumIntelligenceDir, ".pi");
  const runtimeRoot = resolve(minimumIntelligenceDir, "state", "pi-agent");
  const runtimeDir = resolve(runtimeRoot, instanceId);

  mkdirSync(runtimeRoot, { recursive: true });
  rmSync(runtimeDir, { recursive: true, force: true });
  cpSync(sourceDir, runtimeDir, { recursive: true });

  return runtimeDir;
}

export function cleanupPiAgentDir(runtimeDir: string): void {
  try {
    rmSync(runtimeDir, { recursive: true, force: true });
  } catch {
    // Runtime state is ignored; cleanup must not mask an agent result.
  }
}
