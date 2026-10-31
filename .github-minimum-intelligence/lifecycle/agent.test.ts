import { describe, expect, test } from "bun:test";
import { spawnSync } from "child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { delimiter, join, resolve } from "path";

const framework = resolve(import.meta.dir, "..");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "gmi-agent-"));
  const repo = join(root, "repo");
  const mi = join(repo, ".github-minimum-intelligence");
  const bin = join(root, "bin");
  mkdirSync(join(mi, "lifecycle"), { recursive: true });
  mkdirSync(join(mi, ".pi"), { recursive: true });
  mkdirSync(join(mi, "node_modules", ".bin"), { recursive: true });
  mkdirSync(bin);
  for (const file of ["agent.ts", "pi-runtime.ts"]) {
    copyFileSync(join(framework, "lifecycle", file), join(mi, "lifecycle", file));
  }
  copyFileSync(resolve(framework, "..", ".gitignore"), join(repo, ".gitignore"));
  writeFileSync(join(mi, ".pi", "settings.json"), JSON.stringify({
    defaultProvider: "openai", defaultModel: "test-model",
  }));
  const eventPath = join(root, "event.json");
  writeFileSync(eventPath, JSON.stringify({
    repository: { default_branch: "main" },
    issue: { number: 123, title: "Test", body: "Test hosted persistence" },
  }));
  const calls = join(root, "gh-calls.jsonl");
  writeFileSync(join(bin, "gh"), `#!${process.execPath}
import { appendFileSync } from "fs";
appendFileSync(${JSON.stringify(calls)}, JSON.stringify(process.argv.slice(2)) + "\\n");
`, { mode: 0o755 });
  writeFileSync(join(mi, "node_modules", ".bin", "pi"), `#!${process.execPath}
import { appendFileSync, mkdirSync, utimesSync, writeFileSync } from "fs";
import { dirname, join } from "path";
const args = process.argv.slice(2);
const session = args[args.indexOf("--session") + 1];
mkdirSync(dirname(session), { recursive: true });
const message = { role: "assistant", content: process.env.TEST_NO_TEXT ? [] : [{ type: "text", text: "Hosted reply" }] };
if (!process.env.TEST_MISSING_SESSION) {
  appendFileSync(session, JSON.stringify({ type: "message", message }) + "\\n");
}
const local = join(dirname(session), "private-local.jsonl");
writeFileSync(local, "Private local conversation\\n");
const future = new Date(Date.now() + 60000);
utimesSync(local, future, future);
console.log(JSON.stringify({ type: "message_end", message }));
`, { mode: 0o755 });

  const env = {
    ...process.env,
    PATH: `${bin}${delimiter}${process.env.PATH}`,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.invalid",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.invalid",
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_EVENT_NAME: "issues",
    GITHUB_REPOSITORY: "test/fixture",
    OPENAI_API_KEY: "test-key",
  };
  function git(...args: string[]) {
    const result = spawnSync("git", args, { cwd: repo, env, encoding: "utf-8" });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  }
  git("init", "--initial-branch=main");
  git("config", "commit.gpgsign", "false");
  git("add", ".");
  git("commit", "-m", "Fixture");
  git("init", "--bare", join(root, "remote.git"));
  git("remote", "add", "origin", join(root, "remote.git"));
  git("push", "origin", "main");

  return {
    root, repo, mi, calls, git,
    run(extraEnv: Record<string, string> = {}) {
      return spawnSync(process.execPath, [join(mi, "lifecycle", "agent.ts")], {
        cwd: repo, env: { ...env, ...extraEnv }, encoding: "utf-8", timeout: 30_000,
      });
    },
  };
}

describe("hosted session persistence", () => {
  test("commits only the hosted transcript and resumes it on the next run", () => {
    const f = fixture();
    try {
      const first = f.run();
      expect(first.stderr).not.toContain("error:");
      expect(first.status).toBe(0);
      const mappingPath = join(f.mi, "state", "issues", "123.json");
      const mapping = JSON.parse(readFileSync(mappingPath, "utf-8"));
      expect(mapping.sessionPath).toMatch(/\/issue-123-.*\.jsonl$/);
      expect(f.git("ls-files", ".github-minimum-intelligence/state/sessions/"))
        .toBe(mapping.sessionPath);
      expect(f.git("show", `origin/main:${mapping.sessionPath}`)).toContain("Hosted reply");
      expect(f.git("status", "--porcelain")).toBe("");

      const second = f.run();
      expect(second.status).toBe(0);
      expect(JSON.parse(readFileSync(mappingPath, "utf-8")).sessionPath).toBe(mapping.sessionPath);
      expect(f.git("show", `origin/main:${mapping.sessionPath}`).split("\n")).toHaveLength(2);
      expect(readFileSync(f.calls, "utf-8")).toContain("Hosted reply");
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  test("fails rather than attributing a local transcript when pi creates no session", () => {
    const f = fixture();
    try {
      const result = f.run({ TEST_MISSING_SESSION: "1" });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("pi did not write the expected session file");
      expect(f.git("ls-files", ".github-minimum-intelligence/state/sessions/")).toBe("");
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  test("preserves the fallback reply for a successful turn without text", () => {
    const f = fixture();
    try {
      const result = f.run({ TEST_NO_TEXT: "1" });
      expect(result.status).toBe(0);
      expect(readFileSync(f.calls, "utf-8")).toContain("did not produce a text response");
      expect(f.git("ls-tree", "-r", "--name-only", "origin/main"))
        .toContain("state/sessions/issue-123-");
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  test("a failed commit cannot report success", () => {
    const f = fixture();
    try {
      const hooks = join(f.root, "hooks");
      mkdirSync(hooks);
      writeFileSync(join(hooks, "pre-commit"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
      f.git("config", "core.hooksPath", hooks);
      const result = f.run();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("git commit failed");
      expect(f.git("ls-tree", "-r", "--name-only", "origin/main"))
        .not.toContain("state/sessions/");
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });
});
