import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { cleanupPiAgentDir, preparePiAgentDir } from "./pi-runtime.ts";

describe("pi runtime configuration", () => {
  test("copies committed configuration into a clean runtime directory", () => {
    const minimumIntelligenceDir = mkdtempSync(join(tmpdir(), "gmi-pi-runtime-"));
    const sourceDir = join(minimumIntelligenceDir, ".pi");
    mkdirSync(join(sourceDir, "skills", "memory"), { recursive: true });
    writeFileSync(join(sourceDir, "settings.json"), '{"quietStartup":true}\n');
    writeFileSync(join(sourceDir, "skills", "memory", "SKILL.md"), "# Memory\n");

    try {
      const runtimeDir = preparePiAgentDir(minimumIntelligenceDir, "test");
      expect(runtimeDir).toBe(resolve(minimumIntelligenceDir, "state", "pi-agent", "test"));
      expect(readFileSync(join(runtimeDir, "settings.json"), "utf-8"))
        .toBe('{"quietStartup":true}\n');
      expect(readFileSync(join(runtimeDir, "skills", "memory", "SKILL.md"), "utf-8"))
        .toBe("# Memory\n");

      writeFileSync(join(runtimeDir, "stale.json"), "{}\n");
      preparePiAgentDir(minimumIntelligenceDir, "test");
      expect(existsSync(join(runtimeDir, "stale.json"))).toBe(false);

      cleanupPiAgentDir(runtimeDir);
      expect(existsSync(runtimeDir)).toBe(false);
      expect(existsSync(join(sourceDir, "settings.json"))).toBe(true);
    } finally {
      rmSync(minimumIntelligenceDir, { recursive: true, force: true });
    }
  });
});
