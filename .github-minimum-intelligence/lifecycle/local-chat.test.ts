/**
 * local-chat.test.ts — regression tests for local-chat.ts.
 *
 * Each test is intentionally tiny and isolated. Run with `bun test`.
 *
 * Coverage today:
 *   1. §3.4 nested-directory artefact bug — running the runner from an
 *      unexpected cwd must NOT create
 *      `.github-minimum-intelligence/.github-minimum-intelligence/state/`.
 *   2. `--list` must succeed (exit 0) regardless of cwd.
 *   3. `--rm` of an unknown ref must exit 2 (user error), not 1.
 *   4. Exit-code contract: user errors (unknown thread, invalid/taken alias)
 *      exit 2; environment problems exit 1.
 *   5. EOF safety: closed stdin (non-TTY / Ctrl-D) must never hang an
 *      interactive prompt.
 */

import { describe, expect, test } from "bun:test";
import { spawnSync } from "child_process";
import { existsSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

const MI_DIR = resolve(import.meta.dir, "..");
const CHAT_SCRIPT = join(MI_DIR, "lifecycle", "local-chat.ts");

// Hard ceiling for each spawned runner: an EOF-handling regression would
// otherwise hang the suite forever.
const SPAWN_TIMEOUT_MS = 30_000;

function runChat(args: string[], cwd: string, extraEnv: Record<string, string | undefined> = {}) {
  // process.execPath points at the currently running Bun, regardless of PATH.
  return spawnSync(process.execPath, ["run", CHAT_SCRIPT, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: SPAWN_TIMEOUT_MS,
    env: { ...process.env, NO_COLOR: "1", ...extraEnv },
  });
}

describe("local-chat regression tests", () => {
  test("§3.4: --list from a foreign cwd does not nest state dirs", () => {
    const foreignCwd = mkdtempSync(join(tmpdir(), "gmi-cwd-"));
    const result = runChat(["--list"], foreignCwd);

    // Exit 0 expected; runner should anchor on its own __dirname, not cwd.
    expect(result.status).toBe(0);

    // The bug would have created this path inside MI_DIR.
    const nested = join(MI_DIR, ".github-minimum-intelligence");
    expect(existsSync(nested)).toBe(false);

    // And nothing should have been written under the foreign cwd either.
    expect(existsSync(join(foreignCwd, "state"))).toBe(false);
    expect(existsSync(join(foreignCwd, ".github-minimum-intelligence"))).toBe(false);
  });

  test("--list succeeds with exit 0", () => {
    const result = runChat(["--list"], MI_DIR);
    expect(result.status).toBe(0);
  });

  test("--rm of unknown ref does not crash with env-error exit code 1", () => {
    const result = runChat(["--rm", "this-thread-does-not-exist-xyz"], MI_DIR);
    // Either idempotent (0) or user-error (2) is acceptable; an env-error (1)
    // would indicate the runner mistook missing state for a config problem.
    expect([0, 2]).toContain(result.status);
  });

  test("--thread with an unknown ref exits 2 (user error)", () => {
    const result = runChat(
      ["--thread", "no-such-thread-abc", "hello"],
      MI_DIR,
      { OPENAI_API_KEY: "test-key", OPENAI_BASE_URL: undefined, LOCAL_LLM_BASE_URL: undefined },
    );
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("Unknown thread");
  });

  test("--new with an invalid (pure-digit) alias exits 2 (user error)", () => {
    const result = runChat(["--new", "--name", "12345"], MI_DIR);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("Invalid name");
  });

  test("--new with a taken alias exits 2; --rm cleans it up", () => {
    const alias = `gmi-test-${Date.now()}-${process.pid}`;
    try {
      const first = runChat(["--new", "--name", alias], MI_DIR);
      expect(first.status).toBe(0);
      const dup = runChat(["--new", "--name", alias], MI_DIR);
      expect(dup.status).toBe(2);
      expect(dup.stdout).toContain("already taken");
    } finally {
      const rm = runChat(["--rm", alias], MI_DIR);
      expect(rm.status).toBe(0);
    }
  });

  test("missing API key with closed stdin exits cleanly without hanging", () => {
    // With no key and stdin at EOF, the guided-recovery prompt must resolve
    // (treating EOF as "quit") rather than waiting forever on input.
    const result = runChat([], MI_DIR, {
      OPENAI_API_KEY: undefined,
      ANTHROPIC_API_KEY: undefined,
      OPENAI_BASE_URL: undefined,
      LOCAL_LLM_BASE_URL: undefined,
      LOCAL_PROVIDER: undefined,
      LOCAL_MODEL: undefined,
    });
    // Must terminate (no timeout) and quit cleanly from the recovery guide.
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
  });
});
