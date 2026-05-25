/**
 * local-chat.ts — Local, GitHub-free runner for the Minimum Intelligence agent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a developer-facing alternative to `agent.ts` that runs the same
 * `pi` coding agent on the user's local machine.  It reuses the repository's
 * personality configuration (`AGENTS.md`), provider settings (`.pi/settings.json`),
 * and skill packages (`.pi/skills/`) verbatim so that conversations driven from
 * the terminal are indistinguishable in behaviour from those driven by GitHub
 * Issues — only the I/O surface changes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RELATIONSHIP TO agent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * `agent.ts` is the production lifecycle entry point invoked by GitHub Actions.
 * It depends on the Actions environment: `gh` CLI, `GITHUB_EVENT_PATH`,
 * `git push`, and Unix-only shell tools (`tac`, `jq`, `tee`, `bash`).
 *
 * This file is the *peer* entry point for local development.  It removes every
 * GitHub-specific dependency and replaces them with cross-platform equivalents:
 *
 *   agent.ts (GitHub bot)            local-chat.ts (local runner)
 *   ─────────────────────────        ──────────────────────────────
 *   GitHub issue number              Monotonic integer thread ID
 *   `gh issue view` / `comment`      stdin/stdout REPL or `-p` one-shot
 *   `tac | jq` JSONL extraction      In-process JSON.parse (Windows-safe)
 *   `git add/commit/push` retry      No git mutation (workspace is yours)
 *   `state/issues/<n>.json`          `state/threads/<N>.json`
 *
 * The `state/sessions/*.jsonl` format and the `pi` invocation flags are
 * intentionally identical so a thread can be inspected, replayed, or migrated
 * with the same tooling used for the bot.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IDENTITY MODEL — CLOSED WORLD
 * ─────────────────────────────────────────────────────────────────────────────
 * The hardest design problem in a local equivalent of "Issues-as-conversation"
 * is identity.  GitHub solves this for `agent.ts` by *owning* issue numbers:
 * the user cannot pick them, cannot collide, and cannot accidentally re-use an
 * old one.  We reproduce that property here:
 *
 *   1. Thread IDs are monotonic integers allocated by this tool, never by the
 *      user.  Each thread is persisted as `state/threads/<N>.json`.
 *   2. Allocation is atomic: `openSync(path, "wx")` either creates the file or
 *      fails with EEXIST.  On EEXIST we increment and retry, so concurrent
 *      `--new` invocations never claim the same ID.
 *   3. An optional `--name <alias>` may be attached, but the alias is *layered
 *      over* the ID.  Alias collisions are rejected at creation time with a
 *      clear error pointing at the existing thread — never silently merged.
 *   4. `--thread <ref>` requires `<ref>` to resolve to an existing thread.
 *      Unknown references exit non-zero.  A typo cannot fork a new thread.
 *   5. Name grammar (`[A-Za-z][A-Za-z0-9_-]{0,63}`) forbids pure-digit aliases,
 *      eliminating any ambiguity between an ID reference and a name reference.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SESSION ATTRIBUTION
 * ─────────────────────────────────────────────────────────────────────────────
 * `pi` writes its session transcript into `state/sessions/` with a filename
 * chosen by `pi` itself.  Picking "the newest file in the directory" after a
 * turn is unsafe if another runner is active concurrently.  Instead, each
 * turn:
 *
 *   1. Snapshots the set of `.jsonl` files in the sessions directory.
 *   2. Runs `pi`.
 *   3. Diffs the directory; the new session file is the newest entry that did
 *      not exist in the pre-turn snapshot.
 *
 * If no new file appears (and the thread had no prior session), the turn
 * throws rather than guess.  This guarantees a thread is never bound to a
 * session belonging to another runner.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CLI
 * ─────────────────────────────────────────────────────────────────────────────
 *   bun run chat --new [--name <alias>]            Allocate thread, print ID.
 *   bun run chat --thread <id|alias> [prompt...]   Continue thread; REPL if no prompt.
 *   bun run chat --list                            List all threads.
 *   bun run chat --rm <id|alias>                   Remove a thread mapping.
 *
 * Exit codes:
 *   0  success
 *   1  environment problem (missing API key, missing `pi` binary, ...)
 *   2  user error (unknown thread, taken alias, malformed args, ...)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPENDENCIES
 * ─────────────────────────────────────────────────────────────────────────────
 * - Bun runtime                   — for Bun.spawn and top-level await.
 * - Node.js built-in `fs`/`path`  — file ops; uses `openSync(..., "wx")` for
 *                                   atomic ID allocation.
 * - Node.js built-in `readline`   — interactive REPL prompt.
 * - `pi` binary                   — installed by `bun install` from package.json
 *                                   (same binary `agent.ts` uses).
 */

import {
  existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync,
  statSync, unlinkSync, openSync, closeSync,
} from "fs";
import { resolve, join } from "path";
import { createInterface } from "readline";

// ─── Paths and constants ──────────────────────────────────────────────────────
// `import.meta.dir` resolves to `.github-minimum-intelligence/lifecycle/`;
// stepping up one level gives us the `.github-minimum-intelligence/` directory
// which contains `state/`, `.pi/`, and `node_modules/`.
const minimumIntelligenceDir = resolve(import.meta.dir, "..");
const stateDir = resolve(minimumIntelligenceDir, "state");
const threadsDir = resolve(stateDir, "threads");
const sessionsDir = resolve(stateDir, "sessions");
const piSettingsPath = resolve(minimumIntelligenceDir, ".pi", "settings.json");

// The `pi` CLI requires a repo-root-relative path for `--session-dir`, not an
// absolute one, so we keep this as a relative string constant — matching the
// convention used by `agent.ts`.
const sessionsDirRelative = ".github-minimum-intelligence/state/sessions";

// Alias grammar: starts with a letter; letters, digits, "_" or "-" only; max
// 64 chars.  Forbidding pure-digit names prevents ambiguity with integer IDs.
const ALIAS_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

// Cap for the atomic-allocation retry loop.  In practice the loop never runs
// more than once even under contention; the bound is purely defensive against
// pathological filesystem states.
const MAX_ALLOC_ATTEMPTS = 1000;

// Mapping of pi-mono provider IDs to their required environment variable
// names.  Mirrors the table in `agent.ts` so a thread launched locally fails
// the same way the bot would if the key is absent.
const PROVIDER_KEY_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
  xai: "XAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  mistral: "MISTRAL_API_KEY",
  groq: "GROQ_API_KEY",
};

// ─── Thread record schema ─────────────────────────────────────────────────────
// One file per thread, written to `state/threads/<id>.json`.  `sessionPath` is
// null between thread creation and the first completed turn; thereafter it
// points at the absolute path of the `pi` session transcript for this thread.
type Thread = {
  id: number;
  name: string | null;
  sessionPath: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the on-disk path for a thread record.  Co-located with `readThread`
 * and `writeThread` so all path construction stays in one place.
 */
function threadPath(id: number): string {
  return resolve(threadsDir, `${id}.json`);
}

/**
 * Load a thread record from disk.  Returns `null` if the file is absent or
 * unparseable rather than throwing — callers treat both conditions the same
 * way (the thread effectively does not exist).
 */
function readThread(id: number): Thread | null {
  const p = threadPath(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as Thread;
  } catch {
    return null;
  }
}

/**
 * Persist a thread record.  Writes a trailing newline so the file is friendly
 * to standard text editors and POSIX text-file expectations.
 */
function writeThread(t: Thread): void {
  writeFileSync(threadPath(t.id), JSON.stringify(t, null, 2) + "\n");
}

/**
 * Enumerate every well-formed thread file in `state/threads/`, sorted by ID.
 * Files whose names do not match `<digits>.json` are ignored so unrelated
 * artefacts in the directory cannot break listing.
 */
function listThreads(): Thread[] {
  if (!existsSync(threadsDir)) return [];
  const ids = readdirSync(threadsDir)
    .filter((f) => /^\d+\.json$/.test(f))
    .map((f) => parseInt(f, 10))
    .sort((a, b) => a - b);
  const out: Thread[] = [];
  for (const id of ids) {
    const t = readThread(id);
    if (t) out.push(t);
  }
  return out;
}

/**
 * Atomically allocate the next free integer thread ID and persist a stub
 * record for it.
 *
 * The strategy is:
 *   1. Read the directory to compute `max(existingIds) + 1` as a starting
 *      candidate.
 *   2. Try to create `<candidate>.json` with `openSync(..., "wx")` — the
 *      filesystem's O_EXCL semantics make the create-or-fail check atomic.
 *   3. On EEXIST another process won the race; increment and retry.
 *
 * This is the same pattern maildir and mbox tools use to avoid an external
 * lock file.  Pure userland; works on every platform Node supports.
 *
 * @param name - Optional human-readable alias.  Must satisfy `ALIAS_PATTERN`
 *               and not already be in use; both conditions throw on violation
 *               so the caller can present a clear message to the user.
 */
function allocateThread(name: string | null): Thread {
  // ── Validate alias (if any) BEFORE touching the filesystem ──────────────────
  // We check the alias first so that a bad name does not leave a dangling
  // integer file behind after `openSync` succeeds.
  if (name !== null) {
    if (!ALIAS_PATTERN.test(name)) {
      throw new Error(
        `Invalid --name "${name}". Must start with a letter and contain only ` +
        `letters, digits, "_" or "-" (max 64 chars). Pure-digit names are ` +
        `reserved for IDs.`
      );
    }
    for (const existing of listThreads()) {
      if (existing.name === name) {
        throw new Error(
          `Thread name "${name}" already taken by thread #${existing.id}. ` +
          `Pick a different --name, or use \`--thread ${name}\` to continue it.`
        );
      }
    }
  }

  // ── Pick a starting candidate ID ────────────────────────────────────────────
  const existingIds = readdirSync(threadsDir)
    .filter((f) => /^\d+\.json$/.test(f))
    .map((f) => parseInt(f, 10));
  let candidate = (existingIds.length === 0 ? 0 : Math.max(...existingIds)) + 1;

  // ── O_EXCL allocation loop ──────────────────────────────────────────────────
  for (let attempt = 0; attempt < MAX_ALLOC_ATTEMPTS; attempt++) {
    const p = threadPath(candidate);
    try {
      // 'wx' = write + exclusive (fail if the file exists).  This is the
      // atomic claim — only one process can succeed for a given path.
      const fd = openSync(p, "wx");
      closeSync(fd);
      const now = new Date().toISOString();
      const t: Thread = {
        id: candidate,
        name,
        sessionPath: null,
        createdAt: now,
        updatedAt: now,
      };
      writeThread(t);
      return t;
    } catch (err: any) {
      if (err.code === "EEXIST") { candidate++; continue; }
      throw err;
    }
  }
  throw new Error(
    `Could not allocate a thread ID after ${MAX_ALLOC_ATTEMPTS} attempts. ` +
    `Inspect ${threadsDir} for filesystem issues.`
  );
}

/**
 * Resolve a user-supplied reference to an existing thread, or null.
 *
 * The reference is interpreted as an integer ID when it matches `^\d+$`, and
 * as an alias otherwise.  Because `ALIAS_PATTERN` forbids pure-digit names,
 * this dispatch is unambiguous: no ID can collide with a name.
 */
function resolveThreadRef(ref: string): Thread | null {
  if (/^\d+$/.test(ref)) return readThread(parseInt(ref, 10));
  for (const t of listThreads()) {
    if (t.name === ref) return t;
  }
  return null;
}

/**
 * Snapshot the set of `.jsonl` filenames currently in the sessions directory.
 * Used to attribute the session file `pi` creates during a turn (see
 * `runTurn`) without relying on mtime alone, which is racy when multiple
 * runners share the directory.
 */
function snapshotSessionFiles(): Set<string> {
  if (!existsSync(sessionsDir)) return new Set();
  return new Set(readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl")));
}

/**
 * Extract the final assistant text reply from a stream of `pi` JSONL events.
 *
 * Mirrors the `tac | jq` pipeline in `agent.ts`: walk the events in reverse
 * and return the text content of the most recent `message_end` event whose
 * role is `assistant` and which actually contains a text block.  This skips
 * trailing tool-call-only events and degenerate empty-content events caused
 * by post-tool-call API errors — both behaviours that `agent.ts` relies on.
 */
function extractFinalAssistantText(jsonl: string): string {
  const lines = jsonl.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let evt: any;
    try { evt = JSON.parse(line); } catch { continue; }
    if (evt.type !== "message_end" || evt.message?.role !== "assistant") continue;
    const textBlocks = (evt.message.content ?? []).filter((b: any) => b?.type === "text");
    if (textBlocks.length === 0) continue;
    return textBlocks.map((b: any) => b.text).join("\n").trim();
  }
  return "";
}

// ─── CLI parsing ──────────────────────────────────────────────────────────────
// A deliberately small hand-rolled parser; pulling in a CLI library would be
// over-engineering for the handful of flags this tool exposes and would add a
// dependency that `agent.ts` does not need either.
type CliArgs = {
  threadRef: string | null;
  newThread: boolean;
  newName: string | null;
  list: boolean;
  rmRef: string | null;
  prompt: string;
};

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    threadRef: null, newThread: false, newName: null,
    list: false, rmRef: null, prompt: "",
  };
  const promptParts: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--thread":
      case "-t":
        out.threadRef = argv[++i] ?? null;
        break;
      case "--new":
        out.newThread = true;
        break;
      case "--name":
        out.newName = argv[++i] ?? null;
        break;
      case "--list":
      case "-l":
        out.list = true;
        break;
      case "--rm":
        out.rmRef = argv[++i] ?? null;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        // Anything not recognised as a flag is treated as part of the
        // one-shot prompt, joined later with single spaces.  This matches
        // the ergonomics of `pi -p` itself.
        promptParts.push(a);
    }
  }
  out.prompt = promptParts.join(" ").trim();
  return out;
}

function printHelp(): void {
  console.log(
`Usage:
  bun run chat --new [--name <alias>]            Create a new thread (prints ID).
  bun run chat --thread <id|alias> [prompt...]   Continue a thread; REPL if no prompt.
  bun run chat --list                            List all threads.
  bun run chat --rm <id|alias>                   Delete a thread mapping.

Notes:
  • Thread IDs are monotonic integers allocated by this tool.
  • An alias (--name) is optional; aliases must be unique.
  • Unknown thread IDs/aliases are rejected — typos won't create new threads.`
  );
}

// ─── One agent turn ───────────────────────────────────────────────────────────

/**
 * Execute one turn of conversation against the `pi` agent.
 *
 * Pipeline:
 *   1. Build the same argv `agent.ts` uses, plus `--session <path>` when
 *      resuming an existing thread.
 *   2. Snapshot the sessions directory so we can attribute the new transcript
 *      to *this* thread after the run completes.
 *   3. Spawn `pi` from the repo root (matching `agent.ts`'s cwd so relative
 *      paths in `--session-dir` resolve identically).
 *   4. Buffer stdout for in-process JSONL parsing — no jq/tac/tee, no shell.
 *   5. Extract the final assistant text via `extractFinalAssistantText`.
 *   6. Determine which session file belongs to this thread (see
 *      "SESSION ATTRIBUTION" in the file header) and update the thread record.
 *
 * Throws on non-zero `pi` exit and on unattributable sessions; both are
 * conditions where silently continuing would corrupt a thread's identity.
 */
async function runTurn(
  t: Thread,
  prompt: string,
  piBin: string,
  provider: string,
  model: string,
  thinking: string | undefined,
): Promise<{ thread: Thread; reply: string }> {
  // ── Build pi argv ───────────────────────────────────────────────────────────
  const args: string[] = [
    "--mode", "json",
    "--tools", "read,bash,edit,write,grep,find,ls",
    "--provider", provider,
    "--model", model,
    ...(thinking ? ["--thinking", thinking] : []),
    "--session-dir", sessionsDirRelative,
    "-p", prompt,
  ];
  if (t.sessionPath && existsSync(t.sessionPath)) {
    // Resume the prior transcript so the agent has full memory of earlier
    // turns in this thread — identical to how `agent.ts` resumes by issue.
    args.push("--session", t.sessionPath);
  }

  // ── Snapshot sessions BEFORE the turn ───────────────────────────────────────
  // Newest-mtime alone is unsafe when multiple runners share the sessions
  // directory; diffing pre/post sets is unambiguous.
  const before = snapshotSessionFiles();

  // ── Spawn pi ────────────────────────────────────────────────────────────────
  // Launch from the repo root so `--session-dir` resolves to the same
  // location `agent.ts` writes to.  stderr is inherited so provider/model
  // errors surface directly in the terminal.
  const repoRoot = resolve(minimumIntelligenceDir, "..");
  const proc = Bun.spawn([piBin, ...args], {
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "inherit",
  });

  // Buffer the full JSONL stream.  Typical sessions are small (kilobytes), so
  // in-memory buffering is fine and lets us walk the events in reverse later.
  const raw = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    // Surface provider/model in the error message — the most common cause of
    // a non-zero exit is an invalid or misspelled model ID, exactly as
    // documented in `agent.ts`.
    throw new Error(
      `pi exited with code ${exitCode} (provider: ${provider}, model: ${model}). ` +
      `This may indicate an invalid or misspelled model ID in .pi/settings.json.`
    );
  }

  const reply = extractFinalAssistantText(raw);

  // ── Attribute the session file to this thread ───────────────────────────────
  let sessionPath = t.sessionPath;
  if (!sessionPath || !existsSync(sessionPath)) {
    const after = snapshotSessionFiles();
    const created = [...after].filter((f) => !before.has(f));
    if (created.length === 0) {
      // `pi` should always create a session file on a fresh turn.  If it did
      // not, refuse to guess — adopting an unrelated file here would
      // permanently bind this thread to another runner's conversation.
      throw new Error(
        "pi did not create a session file for this turn — refusing to guess " +
        "and risk binding the wrong session to this thread."
      );
    }
    // Among files that did not exist before this turn, take the newest.  In
    // the common single-runner case this set has size 1 and the sort is a
    // no-op.
    created.sort((a, b) =>
      statSync(join(sessionsDir, b)).mtimeMs - statSync(join(sessionsDir, a)).mtimeMs
    );
    sessionPath = join(sessionsDir, created[0]);
  }

  const updated: Thread = { ...t, sessionPath, updatedAt: new Date().toISOString() };
  writeThread(updated);
  return { thread: updated, reply };
}

// ─── Subcommands ──────────────────────────────────────────────────────────────

/**
 * `--list` — print every thread, one per line, with status of its session
 * file ("ok" if present on disk, "—" if missing).  Always exits 0.
 */
function cmdList(): void {
  const all = listThreads();
  if (all.length === 0) {
    console.log("(no threads — create one with `bun run chat --new`)");
    process.exit(0);
  }
  console.log("ID    NAME                       UPDATED                   STATUS");
  for (const t of all) {
    const alive = t.sessionPath && existsSync(t.sessionPath) ? "ok" : "—";
    console.log(
      `${String(t.id).padEnd(5)} ${(t.name ?? "(unnamed)").padEnd(26)} ${t.updatedAt}  [${alive}]`
    );
  }
  process.exit(0);
}

/**
 * `--rm <ref>` — delete only the thread *mapping*, never the underlying
 * session transcript.  Preserving the transcript means a removal is
 * recoverable: a new thread can be created and pointed at the same session
 * file by editing its JSON if needed.
 */
function cmdRemove(ref: string): void {
  const t = resolveThreadRef(ref);
  if (!t) {
    console.error(`No thread matching "${ref}".`);
    process.exit(2);
    return;
  }
  unlinkSync(threadPath(t.id));
  console.log(`Removed thread mapping #${t.id}${t.name ? ` ("${t.name}")` : ""}.`);
  console.log(`(Session transcript on disk preserved: ${t.sessionPath ?? "n/a"})`);
  process.exit(0);
}

// ─── Interactive REPL ─────────────────────────────────────────────────────────

/**
 * Run an interactive prompt loop bound to a single thread.
 *
 * Each non-empty line is sent as one turn.  The `current` reference is
 * rebound after every turn because `runTurn` returns a *new* `Thread` object
 * (timestamps and session path may change), and subsequent turns must resume
 * from the most recent state.
 *
 * Errors during a turn are caught and printed so a single failing turn does
 * not terminate the REPL; the user can retry or `/exit`.
 */
async function repl(
  initial: Thread,
  piBin: string,
  provider: string,
  model: string,
  thinking: string | undefined,
): Promise<void> {
  console.log(
    `MI local chat — thread #${initial.id}` +
    `${initial.name ? ` ("${initial.name}")` : ""} ` +
    `— provider=${provider}, model=${model}`
  );
  console.log(`Type /exit to quit.\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise((res) => rl.question(q, res));

  let current = initial;
  try {
    while (true) {
      const line = (await ask("you> ")).trim();
      if (!line) continue;
      if (line === "/exit" || line === "/quit") break;
      try {
        const { thread, reply } = await runTurn(current, line, piBin, provider, model, thinking);
        current = thread;
        console.log(`\nagent> ${reply || "(no text reply produced)"}\n`);
      } catch (err) {
        console.error(`\n[error] ${(err as Error).message}\n`);
      }
    }
  } finally {
    rl.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // ── Ensure state directories exist ──────────────────────────────────────────
  // Done unconditionally and idempotently so every subcommand can assume the
  // directories are present without re-checking.
  mkdirSync(threadsDir, { recursive: true });
  mkdirSync(sessionsDir, { recursive: true });

  // ── Read-only subcommands first (no settings/key checks needed) ─────────────
  // `--list` and `--rm` don't invoke `pi`, so we handle them before validating
  // provider settings or API keys.  This lets users inspect/clean up threads
  // even when their environment is misconfigured.
  if (args.list) cmdList();
  if (args.rmRef !== null) cmdRemove(args.rmRef);

  // ── Load and validate pi settings ───────────────────────────────────────────
  // Read the committed `.pi` defaults and pass them explicitly to the runtime,
  // matching `agent.ts`.  This prevents drift from any host-level config
  // (e.g. a global `~/.pi/settings.json`).
  const piSettings = JSON.parse(readFileSync(piSettingsPath, "utf-8"));
  const configuredProvider: string = piSettings.defaultProvider;
  const configuredModel: string = piSettings.defaultModel;
  const configuredThinking: string | undefined = piSettings.defaultThinkingLevel;

  if (!configuredProvider || !configuredModel) {
    throw new Error(
      `Invalid .pi settings at ${piSettingsPath}: ` +
      `expected defaultProvider and defaultModel`
    );
  }
  if (configuredModel.trim() !== configuredModel || /\s/.test(configuredModel)) {
    throw new Error(
      `Invalid model identifier "${configuredModel}" in ${piSettingsPath}: ` +
      `model IDs must not contain whitespace.`
    );
  }

  // ── Resolve the thread for this invocation ──────────────────────────────────
  // Two paths into chat: an explicit `--new` (optionally combined with
  // `--thread <ref>` or a prompt to immediately continue), or an explicit
  // `--thread <ref>`.  Anything else is a usage error.
  let activeThread: Thread | null = null;
  if (args.newThread) {
    activeThread = allocateThread(args.newName);
    console.log(
      `Created thread #${activeThread.id}` +
      `${activeThread.name ? ` ("${activeThread.name}")` : ""}.`
    );
    // If `--new` was issued alone (no follow-up prompt and no `--thread`),
    // exit so users can scripted-allocate IDs without entering the REPL.
    if (!args.prompt && !args.threadRef) process.exit(0);
  }

  if (!activeThread) {
    if (!args.threadRef) {
      console.error("No --thread specified. Create one with `--new` or pick from `--list`.");
      printHelp();
      process.exit(2);
    }
    activeThread = resolveThreadRef(args.threadRef!);
    if (!activeThread) {
      console.error(
        `Unknown thread "${args.threadRef}". Use \`--list\` to see threads, ` +
        `or \`--new\` to create one. (Closed-world: unknown refs are never ` +
        `auto-created.)`
      );
      process.exit(2);
    }
  }

  // ── Provider API key check (deferred until a turn is actually imminent) ─────
  // We delay this check past the read-only subcommands and the thread
  // resolution step so that diagnostics like `--list` or "unknown thread"
  // surface before this one — those are far more likely user mistakes than a
  // missing key.
  const requiredKeyName = PROVIDER_KEY_MAP[configuredProvider];
  if (requiredKeyName && !process.env[requiredKeyName]) {
    console.error(
      `Missing env var ${requiredKeyName} for provider "${configuredProvider}".`
    );
    console.error(`PowerShell: $env:${requiredKeyName} = "..."`);
    console.error(`bash/zsh:   export ${requiredKeyName}="..."`);
    process.exit(1);
  }

  // ── Locate the pi binary ────────────────────────────────────────────────────
  // `node_modules/.bin/pi` on POSIX, `pi.cmd` on Windows.  We resolve this
  // here rather than letting Bun.spawn search PATH so we always run the
  // version pinned in this repo's package.json, exactly like `agent.ts`.
  const piBin = resolve(
    minimumIntelligenceDir, "node_modules", ".bin",
    process.platform === "win32" ? "pi.cmd" : "pi",
  );
  if (!existsSync(piBin)) {
    console.error(`pi binary not found at ${piBin}`);
    console.error(`Run "bun install" inside .github-minimum-intelligence/ first.`);
    process.exit(1);
  }

  // ── Dispatch: one-shot prompt vs interactive REPL ───────────────────────────
  if (args.prompt) {
    const { reply } = await runTurn(
      activeThread!, args.prompt, piBin,
      configuredProvider, configuredModel, configuredThinking,
    );
    console.log("\n" + (reply || "(no text reply produced)"));
    return;
  }

  await repl(activeThread!, piBin, configuredProvider, configuredModel, configuredThinking);
}

main();
