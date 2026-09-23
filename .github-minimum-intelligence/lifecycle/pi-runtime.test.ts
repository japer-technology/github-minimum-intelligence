import { describe, expect, test } from "bun:test";
import { DefaultResourceLoader, SettingsManager } from "@earendil-works/pi-coding-agent";
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
  test("installed pi loads committed settings, extensions, skills, and prompts", async () => {
    const minimumIntelligenceDir = resolve(import.meta.dir, "..");
    const cwd = mkdtempSync(join(tmpdir(), "gmi-pi-resources-"));
    const runtimeDir = preparePiAgentDir(minimumIntelligenceDir, `test-${process.pid}`);

    try {
      const settings = SettingsManager.create(cwd, runtimeDir);
      const committedSettings = JSON.parse(
        readFileSync(join(minimumIntelligenceDir, ".pi", "settings.json"), "utf-8"),
      );
      expect(settings.getDefaultProvider()).toBe(committedSettings.defaultProvider);
      expect(settings.getDefaultModel()).toBe(committedSettings.defaultModel);
      expect(settings.getDefaultThinkingLevel()).toBe(committedSettings.defaultThinkingLevel);

      const loader = new DefaultResourceLoader({ cwd, agentDir: runtimeDir, settingsManager: settings });
      await loader.reload();

      const extensions = loader.getExtensions();
      expect(extensions.errors).toEqual([]);
      expect(extensions.extensions.some(extension => extension.tools.has("github_repo_context"))).toBe(true);
      expect(loader.getSkills().diagnostics).toEqual([]);
      expect(loader.getSkills().skills.map(skill => skill.name)).toContain("memory");
      expect(loader.getSkills().skills.map(skill => skill.name)).toContain("skill-creator");
      expect(loader.getPrompts().diagnostics).toEqual([]);
      expect(loader.getPrompts().prompts.map(prompt => prompt.name)).toContain("code-review");
      expect(loader.getPrompts().prompts.map(prompt => prompt.name)).toContain("issue-triage");
      expect(loader.getAppendSystemPrompt()).toContain(
        readFileSync(join(minimumIntelligenceDir, ".pi", "APPEND_SYSTEM.md"), "utf-8"),
      );
    } finally {
      cleanupPiAgentDir(runtimeDir);
      rmSync(cwd, { recursive: true, force: true });
    }
  });

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
