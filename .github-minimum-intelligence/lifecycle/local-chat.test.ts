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
 *   6. A failed one-shot model turn must exit 1 rather than reporting success.
 *   7. A missing `pi` binary must exit 1 as an environment problem.
 */

import { describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { countSessionTurns, getSessionHistory } from "./local-chat.ts";

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
  test("session history reads stored messages and retains full export text", () => {
    const dir = mkdtempSync(join(tmpdir(), "gmi-history-"));
    const session = join(dir, "session.jsonl");
    const reply = "A long answer ".repeat(10) + "\n\n```ts\nconst answer = 42;\n```";
    try {
      writeFileSync(session, [
        { type: "session", version: 3, id: "history-test" },
        { type: "message", message: { role: "user", content: [{ type: "text", text: "Hello" }] } },
        { type: "message", message: { role: "assistant", content: [
          { type: "thinking", thinking: "Not part of exported text" },
          { type: "text", text: reply },
          { type: "text", text: "Second paragraph" },
        ] } },
        { type: "message", message: { role: "toolResult", content: [{ type: "text", text: "Not chat" }] } },
        { type: "message", message: { role: "user", content: [{ type: "image", data: "image" }] } },
        { type: "message_end", message: { role: "user", content: [{ type: "text", text: "CLI event" }] } },
      ].map(entry => JSON.stringify(entry)).join("\n") + "\n");

      expect(countSessionTurns(session)).toBe(2);
      const history = getSessionHistory(session);
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ role: "user", text: "Hello", preview: "Hello" });
      expect(history[1].text).toBe(reply + "\n\nSecond paragraph");
      expect(history[1].preview).toHaveLength(80);
      expect(history[1].preview.endsWith("...")).toBe(true);
      expect(history[1].preview).not.toContain("\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("/export md writes full messages rather than truncated history previews", async () => {
    const alias = `gmi-export-${Date.now()}-${process.pid}`;
    const dir = mkdtempSync(join(tmpdir(), "gmi-export-"));
    let exportPath: string | undefined;
    try {
      expect(runChat(["--new", "--name", alias], MI_DIR).status).toBe(0);
      const threadsDir = join(MI_DIR, "state", "threads");
      const thread = readdirSync(threadsDir)
        .filter(file => /^\d+\.json$/.test(file))
        .map(file => JSON.parse(readFileSync(join(threadsDir, file), "utf-8")))
        .find(thread => thread.name === alias);
      expect(thread).toBeDefined();
      const text = "Keep this complete. ".repeat(10) + "\n\n```ts\nconst value = 42;\n```";
      const sessionPath = join(dir, "session.jsonl");
      writeFileSync(sessionPath, JSON.stringify({
        type: "message", message: { role: "assistant", content: [{ type: "text", text }] },
      }) + "\n");
      writeFileSync(join(threadsDir, `${thread.id}.json`), JSON.stringify({ ...thread, sessionPath }));
      exportPath = join(MI_DIR, "state", "sessions", `thread-${thread.id}-${alias}-export.md`);
      const proc = spawn(process.execPath, ["run", CHAT_SCRIPT, "--thread", alias], {
        cwd: MI_DIR,
        env: { ...process.env, NO_COLOR: "1", LOCAL_PROVIDER: "lmstudio" },
        stdio: ["pipe", "pipe", "pipe"],
      });
      let output = "";
      let sent = false;
      const timer = setTimeout(() => proc.kill(), SPAWN_TIMEOUT_MS);
      try {
        proc.stdout.on("data", chunk => {
          output += chunk.toString();
          if (!sent && output.includes(" > ")) {
            sent = true;
            proc.stdin.write("/export md\n");
          }
          if (output.includes("Exported to:")) proc.stdin.end();
        });
        proc.stderr.on("data", chunk => { output += chunk.toString(); });
        const status = await new Promise<number | null>((resolve, reject) => {
          proc.on("error", reject);
          proc.on("close", resolve);
        });
        expect(status, output).toBe(0);
        expect(output).toContain("Exported to:");
      } finally {
        clearTimeout(timer);
        if (proc.exitCode === null) proc.kill();
      }
      expect(readFileSync(exportPath, "utf-8")).toContain(`**AI:** ${text}`);
    } finally {
      runChat(["--rm", alias], MI_DIR);
      if (exportPath) rmSync(exportPath, { force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  }, SPAWN_TIMEOUT_MS + 5_000);

  test("§3.4: --list from a foreign cwd does not nest state dirs", () => {
    const foreignCwd = mkdtempSync(join(tmpdir(), "gmi-cwd-"));
    try {
      const result = runChat(["--list"], foreignCwd);

      // Exit 0 expected; runner should anchor on its own __dirname, not cwd.
      expect(result.status).toBe(0);

      // The bug would have created this path inside MI_DIR.
      const nested = join(MI_DIR, ".github-minimum-intelligence");
      expect(existsSync(nested)).toBe(false);

      // And nothing should have been written under the foreign cwd either.
      expect(existsSync(join(foreignCwd, "state"))).toBe(false);
      expect(existsSync(join(foreignCwd, ".github-minimum-intelligence"))).toBe(false);
    } finally {
      rmSync(foreignCwd, { recursive: true, force: true });
    }
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

  test("failed one-shot model turn exits 1", () => {
    const alias = `gmi-failed-turn-${Date.now()}-${process.pid}`;
    try {
      const created = runChat(["--new", "--name", alias], MI_DIR);
      expect(created.status).toBe(0);

      const result = runChat(["--thread", alias, "hello"], MI_DIR, {
        LOCAL_PROVIDER: "not-a-real-provider",
        LOCAL_MODEL: "not-a-real-model",
        OPENAI_API_KEY: undefined,
        OPENAI_BASE_URL: undefined,
        LOCAL_LLM_BASE_URL: undefined,
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("Turn failed");
    } finally {
      const rm = runChat(["--rm", alias], MI_DIR);
      expect(rm.status).toBe(0);
    }
  });

  test("missing pi binary exits 1", () => {
    const alias = `gmi-missing-pi-${Date.now()}-${process.pid}`;
    const piBin = join(MI_DIR, "node_modules", ".bin", "pi");
    const piBins = (process.platform === "win32"
      ? [`${piBin}.exe`, `${piBin}.cmd`, piBin]
      : [piBin]
    ).filter(existsSync);
    const hiddenPiBins = piBins.map((path) => `${path}.gmi-test-hidden`);

    try {
      const created = runChat(["--new", "--name", alias], MI_DIR);
      expect(created.status).toBe(0);

      piBins.forEach((path, index) => renameSync(path, hiddenPiBins[index]));
      const result = runChat(["--thread", alias], MI_DIR, {
        LOCAL_PROVIDER: "lmstudio",
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("isn't installed yet");
    } finally {
      hiddenPiBins.forEach((path, index) => {
        if (existsSync(path)) renameSync(path, piBins[index]);
      });
      const rm = runChat(["--rm", alias], MI_DIR);
      expect(rm.status).toBe(0);
    }
  });
});
