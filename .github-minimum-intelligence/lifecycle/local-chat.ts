/**
 * local-chat.ts — Local, GitHub-free runner for the Minimum Intelligence agent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 * ─────────────────────────────────────────────────────────────────────────────
 * Developer-facing alternative to `agent.ts` that runs the same `pi` coding
 * agent on the user's local machine.  Reuses the repository's personality
 * (`AGENTS.md`), provider settings (`.pi/settings.json`), and skill packages
 * (`.pi/skills/`) verbatim so that conversations driven from the terminal are
 * indistinguishable in behaviour from those driven by GitHub Issues — only
 * the I/O surface changes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RELATIONSHIP TO agent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * `agent.ts` is the production lifecycle entry point invoked by GitHub Actions.
 * It depends on `gh`, `GITHUB_EVENT_PATH`, `git push`, and Unix-only shell
 * tools (`tac`, `jq`, `tee`, `bash`).  This file is the *peer* entry point
 * for local development.  It removes every GitHub-specific dependency and
 * replaces them with cross-platform equivalents:
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
 * Thread IDs are monotonic integers allocated by this tool, never by the user.
 * Allocation is atomic via `openSync(path, "wx")`; alias collisions are hard
 * errors; `--thread <ref>` requires `<ref>` to resolve to an existing thread
 * (typos cannot fork phantom threads); pure-digit aliases are forbidden so an
 * integer reference and a name reference can never be confused.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SESSION ATTRIBUTION
 * ─────────────────────────────────────────────────────────────────────────────
 * `pi` writes its session transcript into `state/sessions/` with a filename
 * it chooses itself.  Picking "the newest file" is racy when multiple runners
 * are active concurrently.  Each turn instead snapshots the directory before
 * spawning `pi`, then attributes the new entry by diff.  If no new file
 * appears we refuse to guess.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCAL-LLM SUPPORT
 * ─────────────────────────────────────────────────────────────────────────────
 * OpenAI-compatible local servers (LM Studio, Ollama, vLLM) are supported by
 * setting `LOCAL_LLM_BASE_URL`.  The runner forwards it into `OPENAI_BASE_URL`
 * and injects a placeholder `OPENAI_API_KEY=local` so the SDK does not reject
 * the request.  `lmstudio` is recognised as a first-class provider value and
 * exempt from the cloud-provider API-key check.
 *
 * Precedence for provider/model: `LOCAL_*` env vars > `.pi/settings.json` >
 * built-in defaults.
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
 * - Bun runtime
 * - Node.js built-in `fs`/`path`/`readline`/`child_process`
 * - `pi`                          (installed by `bun install`)
 * - `marked` + `marked-terminal`  (assistant-reply rendering)
 * - `ansi-regex`                  (stripping stray ANSI before render)
 */

import {
  existsSync, readFileSync, writeFileSync, appendFileSync,
  mkdirSync, readdirSync, statSync, unlinkSync, renameSync,
  openSync, closeSync,
} from "fs";
import { resolve, join, basename } from "path";
import { createInterface } from "readline";
import { execFileSync, execSync } from "child_process";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import ansiRegex from "ansi-regex";

// marked-terminal's return type does not perfectly align with marked's
// MarkedExtension interface; the cast is the standard workaround.
marked.use(markedTerminal() as any);

// ─── Paths and constants ──────────────────────────────────────────────────────

const minimumIntelligenceDir = resolve(import.meta.dir, "..");
const stateDir = resolve(minimumIntelligenceDir, "state");
const threadsDir = resolve(stateDir, "threads");
const sessionsDir = resolve(stateDir, "sessions");
const piSettingsPath = resolve(minimumIntelligenceDir, ".pi", "settings.json");
const memoryLogPath = resolve(minimumIntelligenceDir, "memory.log");
const lastRunRawPath = resolve(stateDir, "local-last-run.jsonl");

// Repo-root-relative session dir, matching agent.ts.
const sessionsDirRelative = ".github-minimum-intelligence/state/sessions";

// Alias grammar: starts with a letter; letters/digits/"_"/"-" only; max 64.
// Forbidding pure-digit names prevents ambiguity with integer IDs.
const ALIAS_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

// Cap for the atomic-allocation retry loop; defensive only.
const MAX_ALLOC_ATTEMPTS = 1000;

// Mapping of pi-mono provider IDs to required environment variable names.
// `lmstudio` and any `openai` setup pointed at LOCAL_LLM_BASE_URL are exempt
// from this check (local servers do not need a real key).
const PROVIDER_KEY_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
  xai: "XAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  mistral: "MISTRAL_API_KEY",
  groq: "GROQ_API_KEY",
};

// Providers we consider "local" for the purpose of skipping the cloud API-key
// check and enabling auto-retry by default.
const LOCAL_PROVIDERS = new Set(["lmstudio", "ollama", "vllm"]);

// Default OpenAI-compatible endpoints for well-known local servers.
const LOCAL_BRAND_DEFAULTS: Record<string, { label: string; baseUrl: string }> = {
  lmstudio: { label: "LM Studio", baseUrl: "http://localhost:1234/v1" },
  ollama:   { label: "Ollama",    baseUrl: "http://localhost:11434/v1" },
  vllm:     { label: "vLLM",      baseUrl: "http://localhost:8000/v1"  },
};

// Brand labels that map to a "openai-compatible" pi invocation. The key is
// what the user types or configures; the value is what pi actually receives
// (always "openai" today because pi has no first-class lmstudio/ollama/vllm
// provider — they all speak OpenAI Chat Completions).
function resolvePiProvider(userProvider: string): string {
  if (LOCAL_PROVIDERS.has(userProvider)) return "openai";
  return userProvider;
}

function localBrandLabel(userProvider: string): string | null {
  if (LOCAL_PROVIDERS.has(userProvider)) {
    return LOCAL_BRAND_DEFAULTS[userProvider]?.label ?? userProvider;
  }
  if (userProvider === "openai" && (process.env.LOCAL_LLM_BASE_URL || process.env.OPENAI_BASE_URL)) {
    return "openai-compatible";
  }
  return null;
}

// ─── Output styling ───────────────────────────────────────────────────────────
// All user-facing messages MUST go through `say.*` (stdout) instead of
// `console.error` (stderr).  PowerShell renders stderr as red-on-white which
// is unreadable; routing everything to stdout with ANSI lets us pick legible,
// purposeful colours.  Respects NO_COLOR, FORCE_COLOR, and !isTTY.

const useColor: boolean = (() => {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return !!(process.stdout && process.stdout.isTTY);
})();

function wrap(open: number, close: number, s: string): string {
  return useColor ? `\x1b[${open}m${s}\x1b[${close}m` : s;
}
const c = {
  reset:   (s: string) => wrap(0,  0, s),
  bold:    (s: string) => wrap(1, 22, s),
  dim:     (s: string) => wrap(2, 22, s),
  italic:  (s: string) => wrap(3, 23, s),
  under:   (s: string) => wrap(4, 24, s),
  red:     (s: string) => wrap(31, 39, s),
  green:   (s: string) => wrap(32, 39, s),
  yellow:  (s: string) => wrap(33, 39, s),
  blue:    (s: string) => wrap(34, 39, s),
  magenta: (s: string) => wrap(35, 39, s),
  cyan:    (s: string) => wrap(36, 39, s),
  gray:    (s: string) => wrap(90, 39, s),
};

/** Word-wrap a string to a max line width, preserving existing line breaks. */
function wordWrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    if (para.length <= width) { out.push(para); continue; }
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      if (line.length === 0) { line = w; continue; }
      if (line.length + 1 + w.length > width) { out.push(line); line = w; }
      else { line += " " + w; }
    }
    if (line.length > 0) out.push(line);
  }
  return out;
}

const say = {
  /** Recoverable problem — yellow banner, stdout, never exits. */
  warn(title: string, body?: string): void {
    console.log("");
    console.log("  " + c.yellow(c.bold("! ")) + c.bold(title));
    if (body) for (const ln of wordWrap(body, 68)) console.log("    " + c.dim(ln));
    console.log("");
  },
  /** Hard failure — red label, stdout (not stderr), caller decides what to do next. */
  error(title: string, body?: string): void {
    console.log("");
    console.log("  " + c.red(c.bold("x ")) + c.bold(title));
    if (body) for (const ln of wordWrap(body, 68)) console.log("    " + c.dim(ln));
    console.log("");
  },
  /** Neutral informational note. */
  info(msg: string): void {
    console.log("  " + c.cyan("i ") + msg);
  },
  /** Success / confirmation. */
  ok(msg: string): void {
    console.log("  " + c.green("✓ ") + msg);
  },
  /** Subtle hint / next-step prompt. */
  hint(msg: string): void {
    console.log("  " + c.dim("· " + msg));
  },
};

// ─── Thread record schema ─────────────────────────────────────────────────────

type Thread = {
  id: number;
  name: string | null;
  sessionPath: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Thread helpers ───────────────────────────────────────────────────────────

function threadPath(id: number): string {
  return resolve(threadsDir, `${id}.json`);
}

function readThread(id: number): Thread | null {
  const p = threadPath(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as Thread;
  } catch {
    return null;
  }
}

function writeThread(t: Thread): void {
  writeFileSync(threadPath(t.id), JSON.stringify(t, null, 2) + "\n");
}

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
 * Atomically allocate the next free integer thread ID.
 * See file header "IDENTITY MODEL — CLOSED WORLD" for the design rationale.
 */
function allocateThread(name: string | null): Thread {
  if (name !== null) {
    if (!ALIAS_PATTERN.test(name)) {
      throw new Error(
        `Invalid name "${name}". Must start with a letter and contain only ` +
        `letters, digits, "_" or "-" (max 64 chars). Pure-digit names are ` +
        `reserved for IDs.`
      );
    }
    for (const existing of listThreads()) {
      if (existing.name === name) {
        throw new Error(
          `Thread name "${name}" already taken by thread #${existing.id}.`
        );
      }
    }
  }

  mkdirSync(threadsDir, { recursive: true });
  const existingIds = readdirSync(threadsDir)
    .filter((f) => /^\d+\.json$/.test(f))
    .map((f) => parseInt(f, 10));
  let candidate = (existingIds.length === 0 ? 0 : Math.max(...existingIds)) + 1;

  for (let attempt = 0; attempt < MAX_ALLOC_ATTEMPTS; attempt++) {
    const p = threadPath(candidate);
    try {
      const fd = openSync(p, "wx");
      closeSync(fd);
      const now = new Date().toISOString();
      const t: Thread = {
        id: candidate, name, sessionPath: null,
        createdAt: now, updatedAt: now,
      };
      writeThread(t);
      return t;
    } catch (err: any) {
      if (err.code === "EEXIST") { candidate++; continue; }
      throw err;
    }
  }
  throw new Error(
    `Could not allocate a thread ID after ${MAX_ALLOC_ATTEMPTS} attempts.`
  );
}

function resolveThreadRef(ref: string): Thread | null {
  if (/^\d+$/.test(ref)) return readThread(parseInt(ref, 10));
  for (const t of listThreads()) {
    if (t.name === ref) return t;
  }
  return null;
}

function snapshotSessionFiles(): Set<string> {
  if (!existsSync(sessionsDir)) return new Set();
  return new Set(readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl")));
}

// ─── pi JSONL parsing ─────────────────────────────────────────────────────────

type PiBlock = { type?: string; text?: string };
type PiEvent = { type?: string; message?: { role?: string; content?: PiBlock[] } };

/**
 * Extract the final assistant text reply from a stream of pi JSONL events.
 * Mirrors the `tac | jq` pipeline in agent.ts: walk events in reverse and
 * return the text of the most recent `message_end` assistant event with at
 * least one text block.  Skips trailing tool-call-only events and
 * empty-content events caused by post-tool-call API errors.
 */
function extractFinalAssistantText(jsonl: string): string {
  const lines = jsonl.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let evt: PiEvent;
    try { evt = JSON.parse(line) as PiEvent; } catch { continue; }
    if (evt.type !== "message_end" || evt.message?.role !== "assistant") continue;
    const blocks = (evt.message.content ?? []).filter((b) => b?.type === "text" && typeof b.text === "string");
    if (blocks.length === 0) continue;
    return blocks.map((b) => (b.text ?? "").trim()).filter((s) => s.length > 0).join("\n\n");
  }
  return "";
}

/** Count `message_end` events with role=user — i.e. user turns in a session. */
function countSessionTurns(filePath: string): number {
  if (!existsSync(filePath)) return 0;
  try {
    const lines = readFileSync(filePath, "utf-8")
      .split(/\r?\n/).filter((l) => l.trim().length > 0);
    let turns = 0;
    for (const line of lines) {
      try {
        const evt = JSON.parse(line) as PiEvent;
        if (evt.type === "message_end" && evt.message?.role === "user") turns++;
      } catch {}
    }
    return turns;
  } catch { return 0; }
}

/** Condensed per-turn preview list for /history and /export. */
function getSessionHistory(filePath: string): Array<{ role: string; preview: string }> {
  if (!existsSync(filePath)) return [];
  try {
    const lines = readFileSync(filePath, "utf-8")
      .split(/\r?\n/).filter((l) => l.trim().length > 0);
    const out: Array<{ role: string; preview: string }> = [];
    for (const line of lines) {
      try {
        const evt = JSON.parse(line) as PiEvent;
        if (evt.type !== "message_end") continue;
        const role = evt.message?.role;
        if (role !== "user" && role !== "assistant") continue;
        const text = (evt.message?.content ?? [])
          .filter((b) => b.type === "text" && typeof b.text === "string")
          .map((b) => (b.text ?? "").trim())
          .filter((t) => t.length > 0)
          .join(" ").replace(/\s+/g, " ");
        if (!text) continue;
        out.push({ role, preview: text.length > 80 ? text.slice(0, 77) + "..." : text });
      } catch {}
    }
    return out;
  } catch { return []; }
}

// ─── Formatting / display helpers ─────────────────────────────────────────────

function stripAnsi(text: string): string {
  return text.replace(ansiRegex(), "");
}

/**
 * Render markdown text for terminal display.  Strips stray ANSI from the
 * source first so `marked` does not mistakenly treat escape sequences as
 * literal characters and produce garbled output.
 */
function renderMarkdown(text: string): string {
  try {
    return (marked(stripAnsi(text)) as string).trimEnd();
  } catch {
    return text;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = ((ms % 60_000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
// Braille frames driven by setInterval; cleared with a CR + blanking row.

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function createSpinner(message: string): { stop: (finalMessage?: string) => void } {
  let frameIndex = 0;
  let stopped = false;
  const interval = setInterval(() => {
    if (stopped) return;
    const frame = spinnerFrames[frameIndex % spinnerFrames.length];
    process.stdout.write(`\r  ${frame} ${message}`);
    frameIndex++;
  }, 80);
  return {
    stop(finalMessage?: string) {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      process.stdout.write(`\r${" ".repeat(80)}\r`);
      if (finalMessage) console.log(`  ${finalMessage}`);
    },
  };
}

// ─── Git / repo helpers (best-effort, never throw out) ────────────────────────

function getGitBranch(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim() || null;
  } catch { return null; }
}

function getRepoRoot(): string {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return resolve(minimumIntelligenceDir, "..");
  }
}

function getRepoName(): string {
  try { return basename(getRepoRoot()); } catch { return "local-chat"; }
}

/** Resolve a user-supplied path, rejecting anything outside the repo root. */
function safePath(userPath: string): string | null {
  const root = getRepoRoot();
  const resolved = resolve(root, userPath);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

// ─── Memory log helpers ───────────────────────────────────────────────────────

function getMemoryCount(): number {
  if (!existsSync(memoryLogPath)) return 0;
  try {
    return readFileSync(memoryLogPath, "utf-8")
      .split(/\r?\n/).filter((l) => l.trim().length > 0).length;
  } catch { return 0; }
}

// ─── CLI parsing ──────────────────────────────────────────────────────────────

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
      case "--thread": case "-t": out.threadRef = argv[++i] ?? null; break;
      case "--new": out.newThread = true; break;
      case "--name": out.newName = argv[++i] ?? null; break;
      case "--list": case "-l": out.list = true; break;
      case "--rm": out.rmRef = argv[++i] ?? null; break;
      case "--help": case "-h": printCliHelp(); process.exit(0);
      default: promptParts.push(a);
    }
  }
  out.prompt = promptParts.join(" ").trim();
  return out;
}

function printCliHelp(): void {
  console.log(
`GitHub Minimum Intelligence — Local Chat

Usage:
  bun run chat                                   Interactive launcher (pick or create).
  bun run chat --new [--name <alias>]            Create a new thread and enter REPL.
  bun run chat --thread <id|alias> [prompt...]   Continue a thread; REPL if no prompt.
  bun run chat --list                            List all threads.
  bun run chat --rm <id|alias>                   Delete a thread mapping.
  bun run chat --help                            Show this message.

Environment overrides (highest precedence):
  LOCAL_PROVIDER      Override .pi/settings.json defaultProvider.
  LOCAL_MODEL         Override defaultModel.
  LOCAL_THINKING      Override defaultThinkingLevel  (e.g. low, medium, high).
  LOCAL_LLM_BASE_URL  OpenAI-compatible base URL (LM Studio, Ollama, vLLM).
                      Forwarded to OPENAI_BASE_URL with a placeholder API key.

Closed-world identity: thread IDs are allocated by this tool; unknown refs are
rejected (no auto-create on typos). Aliases must start with a letter.`
  );
}

/**
 * Interactive launcher shown when `bun run chat` is invoked with no args.
 * Lists existing threads and lets the user pick by row number, press Enter
 * to resume the most-recent thread, type `n` to create a new one, or `q` to
 * quit. Returns the chosen Thread or null if the user quit.
 */
async function interactiveStart(provider: string, model: string, thinking: string | undefined): Promise<Thread | null> {
  const all = listThreads();
  const branch = getGitBranch();
  const repo = getRepoName();

  console.log("");
  console.log("  " + c.cyan("┌─────────────────────────────────────────────────────────────────────┐"));
  console.log("  " + c.cyan("│  ") + c.bold("GitHub Minimum Intelligence") + c.dim(" — Local Chat") + "                           " + c.cyan("│"));
  console.log("  " + c.cyan("└─────────────────────────────────────────────────────────────────────┘"));
  console.log("");
  console.log(`    ${c.dim("Repo:")}     ${c.bold(repo)}${branch ? c.dim(`  (${branch})`) : ""}`);
  console.log(`    ${c.dim("Provider:")} ${c.bold(provider)}    ${c.dim("Model:")} ${c.bold(model)}${thinking ? `    ${c.dim("Thinking:")} ${thinking}` : ""}`);
  const memCount = getMemoryCount();
  if (memCount > 0) {
    console.log(`    ${c.dim("Memory:")}   ${memCount} entr${memCount === 1 ? "y" : "ies"} in memory.log`);
  }
  console.log("");

  if (all.length === 0) {
    console.log("    No threads yet. Creating your first thread…");
    console.log("");
    const t = allocateThread(null);
    console.log(`    Created thread #${t.id}.`);
    console.log("");
    console.log("    Quick start:");
    console.log("      • Just type a message to chat.");
    console.log("      • Type /help inside the chat for all commands.");
    console.log("      • Type /exit (or Ctrl-C) to end the session.");
    console.log("");
    return t;
  }

  // Sort by updatedAt descending so the most recent is first.
  const sorted = [...all].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  console.log(`    Existing threads (${sorted.length}):`);
  console.log("");
  console.log("      #   ID   ALIAS                       UPDATED               TURNS");
  console.log("      ─── ──── ─────────────────────────── ───────────────────── ─────");
  const max = Math.min(sorted.length, 20);
  for (let i = 0; i < max; i++) {
    const t = sorted[i];
    const turns = t.sessionPath && existsSync(t.sessionPath) ? countSessionTurns(t.sessionPath) : 0;
    console.log(
      `      ${String(i + 1).padStart(2, " ")}. ${String(t.id).padEnd(4)} ` +
      `${(t.name ?? "(unnamed)").padEnd(27)} ${t.updatedAt.padEnd(20)} ${String(turns).padStart(4)}`
    );
  }
  if (sorted.length > max) {
    console.log(`      … and ${sorted.length - max} more (use \`--list\` to see all).`);
  }
  console.log("");
  console.log("    Choose:");
  console.log("      • Enter a row number to resume that thread.");
  console.log("      • Press [Enter] to resume the most recent (#" + sorted[0].id + ").");
  console.log("      • Type  n  to create a new thread.");
  console.log("      • Type  q  (or Ctrl-C) to quit.");
  console.log("");

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));
  try {
    while (true) {
      const raw = (await ask("    Select> ")).trim();
      if (raw === "q" || raw === "Q" || raw === "/exit" || raw === "/quit") {
        return null;
      }
      if (raw === "n" || raw === "N" || raw === "/new") {
        const t = allocateThread(null);
        console.log(`    Created thread #${t.id}.\n`);
        return t;
      }
      if (raw === "") {
        const t = sorted[0];
        console.log(`    Resuming thread #${t.id}${t.name ? ` ("${t.name}")` : ""}.\n`);
        return t;
      }
      const n = parseInt(raw, 10);
      if (Number.isInteger(n) && n >= 1 && n <= sorted.length) {
        const t = sorted[n - 1];
        console.log(`    Resuming thread #${t.id}${t.name ? ` ("${t.name}")` : ""}.\n`);
        return t;
      }
      // Also accept raw IDs or aliases.
      const direct = resolveThreadRef(raw);
      if (direct) {
        console.log(`    Resuming thread #${direct.id}${direct.name ? ` ("${direct.name}")` : ""}.\n`);
        return direct;
      }
      console.log(`    Not a valid choice: "${raw}". Try a row number, \`n\`, or \`q\`.`);
    }
  } finally {
    rl.close();
  }
}

// ─── Environment / settings resolution ────────────────────────────────────────

type PiSettings = {
  defaultProvider?: string;
  defaultModel?: string;
  defaultThinkingLevel?: string;
};

function loadPiSettings(): PiSettings {
  if (!existsSync(piSettingsPath)) return {};
  try { return JSON.parse(readFileSync(piSettingsPath, "utf-8")) as PiSettings; }
  catch { return {}; }
}

/**
 * Resolve final provider/model/thinking by applying env overrides on top of
 * settings, validate the result, and (for OpenAI-compatible local servers)
 * forward `LOCAL_LLM_BASE_URL` into `OPENAI_BASE_URL` with a placeholder key.
 */
function resolveRuntimeConfig(): { provider: string; model: string; thinking: string | undefined } {
  const settings = loadPiSettings();
  const provider = process.env.LOCAL_PROVIDER ?? settings.defaultProvider ?? "";
  const model = process.env.LOCAL_MODEL ?? settings.defaultModel ?? "";
  const thinking = process.env.LOCAL_THINKING ?? settings.defaultThinkingLevel;

  if (!provider || !model) {
    throw new Error(
      `Invalid .pi settings at ${piSettingsPath}: ` +
      `expected defaultProvider and defaultModel (or LOCAL_PROVIDER / LOCAL_MODEL).`
    );
  }
  if (model.trim() !== model || /\s/.test(model)) {
    throw new Error(
      `Invalid model identifier "${model}": model IDs must not contain whitespace.`
    );
  }

  // OpenAI-compatible local server wiring.
  // For brand providers (lmstudio/ollama/vllm) auto-fill a default base URL
  // if the user did not set LOCAL_LLM_BASE_URL/OPENAI_BASE_URL explicitly.
  if (provider === "openai" || LOCAL_PROVIDERS.has(provider)) {
    const brandDefault = LOCAL_BRAND_DEFAULTS[provider]?.baseUrl;
    if (brandDefault && !process.env.LOCAL_LLM_BASE_URL && !process.env.OPENAI_BASE_URL) {
      process.env.LOCAL_LLM_BASE_URL = brandDefault;
    }
    if (process.env.LOCAL_LLM_BASE_URL && !process.env.OPENAI_BASE_URL) {
      process.env.OPENAI_BASE_URL = process.env.LOCAL_LLM_BASE_URL;
    }
    if ((process.env.LOCAL_LLM_BASE_URL || process.env.OPENAI_BASE_URL) && !process.env.OPENAI_API_KEY) {
      // OpenAI-compatible local servers often ignore the key, but the SDK
      // refuses to send a request without one.  A literal "local" satisfies it.
      process.env.OPENAI_API_KEY = "local";
    }
  }

  return { provider, model, thinking };
}

/** True when this provider+env combination targets a local model server. */
function isLocalProvider(provider: string): boolean {
  if (LOCAL_PROVIDERS.has(provider)) return true;
  if (provider === "openai" && (process.env.LOCAL_LLM_BASE_URL || process.env.OPENAI_BASE_URL)) return true;
  return false;
}

// ─── pi binary location ───────────────────────────────────────────────────────

function locatePiBin(): string {
  const base = resolve(minimumIntelligenceDir, "node_modules", ".bin", "pi");
  // Cover both `.cmd` (npm-shim) and `.exe` (Bun-shim) on Windows.
  const candidates = process.platform === "win32"
    ? [base + ".exe", base + ".cmd", base]
    : [base];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(
    `pi binary not found in any of: ${candidates.join(", ")}\n` +
    `Run "bun install" inside .github-minimum-intelligence/ first.`
  );
}

// ─── Subprocess lifecycle ─────────────────────────────────────────────────────
// Track the active `pi` child so we can terminate it on Ctrl+C / EPIPE /
// SIGTERM rather than leaving orphan processes streaming JSONL into a dead
// terminal — a real problem on Windows.

let activePiProcess: ReturnType<typeof Bun.spawn> | null = null;

function cleanup(): void {
  if (activePiProcess) {
    try { activePiProcess.kill(); } catch {}
    activePiProcess = null;
  }
}

process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") { cleanup(); process.exit(0); }
  throw err;
});
process.stderr.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") { cleanup(); process.exit(0); }
  throw err;
});
process.on("SIGINT",  () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });

// ─── Runtime toggles (REPL only) ──────────────────────────────────────────────

type RuntimeState = {
  provider: string;
  model: string;
  thinking: string | undefined;
  showTiming: boolean;
  verbose: boolean;
  autoRetry: boolean;
  autoRetryMax: number;
  piBin: string;
};

// ─── One agent turn ───────────────────────────────────────────────────────────

/**
 * Execute one turn of conversation against pi for the given thread.
 *
 * Pipeline:
 *   1. Build argv mirroring agent.ts, adding `--session <path>` when resuming.
 *   2. Snapshot the sessions directory.
 *   3. Spawn pi from the repo root (matching agent.ts cwd).
 *   4. Buffer stdout for in-process JSONL parsing.
 *   5. Extract the final assistant text.
 *   6. Attribute the new transcript via pre/post directory diff.
 *
 * Auto-retries (when enabled) on non-zero exit codes and on turns that
 * produced no assistant text.  Each retry attribution diff is taken against
 * the *original* pre-turn snapshot so the chosen session file is always one
 * created by this invocation.
 */
async function runTurn(
  t: Thread,
  prompt: string,
  rt: RuntimeState,
  spinnerLabel?: string,
): Promise<{ thread: Thread; reply: string; rawJsonl: string }> {
  const maxAttempts = rt.autoRetry ? rt.autoRetryMax : 1;
  const repoRoot = getRepoRoot();
  const before = snapshotSessionFiles();
  let lastErr: Error | null = null;
  let rawJsonl = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const spinner = spinnerLabel
      ? createSpinner(maxAttempts > 1 && attempt > 1
          ? `${spinnerLabel} (retry ${attempt}/${maxAttempts})…`
          : `${spinnerLabel}…`)
      : null;

    // Map brand providers (lmstudio/ollama/vllm) to what pi actually
    // understands today (openai-compatible Chat Completions). pi has no
    // first-class lmstudio provider, so the brand is purely a label for
    // the user; the wire-format is always openai-compatible.
    const piProvider = resolvePiProvider(rt.provider);
    const localMode = isLocalProvider(rt.provider);
    const args: string[] = [
      "--mode", "json",
      "--tools", "read,bash,edit,write,grep,find,ls",
      "--provider", piProvider,
      "--model", rt.model,
      ...(rt.thinking ? ["--thinking", rt.thinking] : []),
      "--session-dir", sessionsDirRelative,
      // Local OpenAI-compatible servers (LM Studio, Ollama, vLLM, ...) ignore
      // the key but the SDK requires one. Passing it explicitly via --api-key
      // also covers the case where the env var did not propagate to the child.
      ...(localMode ? ["--api-key", process.env.OPENAI_API_KEY || "local"] : []),
      "-p", prompt,
    ];
    if (t.sessionPath && existsSync(t.sessionPath)) {
      args.push("--session", t.sessionPath);
    }

    try {
      const proc = Bun.spawn([rt.piBin, ...args], {
        cwd: repoRoot,
        stdout: "pipe",
        stderr: "inherit",
      });
      activePiProcess = proc;
      rawJsonl = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;
      activePiProcess = null;
      spinner?.stop();

      // Always save the raw stream for post-mortem debugging.
      try { writeFileSync(lastRunRawPath, rawJsonl); } catch {}

      if (rt.verbose) {
        const events = rawJsonl.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
        console.log(`  [verbose] attempt ${attempt}: ${events} JSONL events, exit ${exitCode}`);
      }

      if (exitCode !== 0) {
        lastErr = new Error(
          `pi exited with code ${exitCode} (provider: ${rt.provider}, model: ${rt.model}). ` +
          `This may indicate an invalid model ID, an unreachable local server, or a provider error.`
        );
        if (attempt < maxAttempts) {
          console.log("  " + c.yellow(`⟳ Retry ${attempt + 1}/${maxAttempts} after exit code ${exitCode}…`));
          continue;
        }
        throw lastErr;
      }

      const reply = extractFinalAssistantText(rawJsonl);
      if (!reply) {
        lastErr = new Error("pi produced no assistant text for this turn.");
        if (attempt < maxAttempts) {
          console.log("  " + c.yellow(`⟳ Retry ${attempt + 1}/${maxAttempts} after empty reply…`));
          continue;
        }
        // Fall through with empty reply rather than throwing: the agent may
        // have legitimately performed file edits without a text reply.
      }

      if (attempt > 1 && reply) {
        console.log("  " + c.green(`✓ Got response on attempt ${attempt}/${maxAttempts}`));
      }

      // Attribute the session file.
      let sessionPath = t.sessionPath;
      if (!sessionPath || !existsSync(sessionPath)) {
        const after = snapshotSessionFiles();
        const created = [...after].filter((f) => !before.has(f));
        if (created.length === 0) {
          throw new Error(
            "pi did not create a session file for this turn — refusing to guess " +
            "and risk binding the wrong session to this thread."
          );
        }
        created.sort((a, b) =>
          statSync(join(sessionsDir, b)).mtimeMs - statSync(join(sessionsDir, a)).mtimeMs
        );
        sessionPath = join(sessionsDir, created[0]);
      }

      const updated: Thread = { ...t, sessionPath, updatedAt: new Date().toISOString() };
      writeThread(updated);
      return { thread: updated, reply, rawJsonl };
    } catch (err) {
      spinner?.stop();
      activePiProcess = null;
      lastErr = err as Error;
      if (attempt < maxAttempts) {
        console.log("  " + c.yellow(`⟳ Retry ${attempt + 1}/${maxAttempts} after error: ${(err as Error).message}`));
        continue;
      }
      throw lastErr;
    }
  }

  throw lastErr ?? new Error("runTurn: exhausted retries with no recorded error.");
}

// ─── Read-only subcommands ────────────────────────────────────────────────────

function cmdList(): void {
  const all = listThreads();
  if (all.length === 0) {
    console.log("(no threads — create one with `bun run chat --new`)");
    return;
  }
  console.log("ID    NAME                       UPDATED                   STATUS");
  for (const t of all) {
    const alive = t.sessionPath && existsSync(t.sessionPath) ? "ok" : "—";
    console.log(
      `${String(t.id).padEnd(5)} ${(t.name ?? "(unnamed)").padEnd(26)} ${t.updatedAt}  [${alive}]`
    );
  }
}

function cmdRemove(ref: string): void {
  const t = resolveThreadRef(ref);
  if (!t) {
    say.warn(`No thread matching "${ref}".`, "Use `--list` to see existing threads.");
    return;
  }
  unlinkSync(threadPath(t.id));
  say.ok(`Removed thread mapping #${t.id}${t.name ? ` ("${t.name}")` : ""}.`);
  console.log("    " + c.dim(`Session transcript preserved: ${t.sessionPath ?? "n/a"}`));
}

// ─── REPL ─────────────────────────────────────────────────────────────────────

function printReplHelp(): void {
  console.log(`
  Thread (closed-world identity, IDs allocated by the tool):
    /list                 — List all threads.
    /new [name]           — Create a new thread; switch to it.
    /switch <id|alias>    — Switch to an existing thread. (Unknown ref = error.)
    /history              — Condensed view of this thread's conversation.
    /export md            — Export this thread as a Markdown file.
    /rename <name>        — Attach/replace this thread's alias.

  Model & config:
    /status               — Provider, model, thread, branch, memory, toggles.
    /model <name>         — Switch model for subsequent turns.
    /model <prov>:<name>  — Switch provider+model (e.g. lmstudio:google/gemma-4-31b).
    /provider <name>      — Switch provider (lmstudio | ollama | vllm | openai | …).
    /time                 — Toggle elapsed-time display.
    /verbose              — Toggle verbose mode (JSONL event counts).
    /auto-retry [on|off|N]— Toggle / set auto-retry attempts.

  Memory log:
    /remember <text>      — Append a timestamped entry to memory.log.
    /memories [term]      — Search or show recent entries.

  Files & repo:
    /cat <path>           — Display a file with line numbers.
    /md <path>            — Render a Markdown file.
    /git                  — git status + diff stat.
    /diff [path]          — git diff (optionally scoped).
    /run <command>        — Shell command (30s timeout).

  Prompt:
    /retry                — Re-send the last prompt in this thread.
    /again                — New thread + re-send the last prompt.
    /best-of <n>          — Send last prompt n times (fresh threads), compare.
    /multiline            — Multiline input mode (blank line submits).

  General:
    /clear                — Clear the screen.
    /help                 — This message.
    /exit, /quit          — End the chat session.
`);
}

/**
 * Interactive REPL bound to a thread.  Reassigns `current` after every turn
 * because runTurn returns a *new* Thread object (timestamps / session path
 * may change), and subsequent turns must resume from the latest state.
 */
async function repl(initial: Thread, rt: RuntimeState): Promise<void> {
  const startTime = Date.now();
  const repoName = getRepoName();
  let current = initial;
  let lastPrompt: string | null = null;

  // ── Banner ────────────────────────────────────────────────────────────────
  const turns = current.sessionPath ? countSessionTurns(current.sessionPath) : 0;
  const sessionStatus = current.sessionPath
    ? `resuming session (${turns} turn${turns === 1 ? "" : "s"})`
    : "new session";
  console.log("");
  console.log("  " + c.bold("GitHub Minimum Intelligence") + c.dim(" — Local Chat"));
  const brand = localBrandLabel(rt.provider);
  console.log(
    `  ${c.dim("Provider:")} ${c.bold(rt.provider)}${brand ? c.dim(` (${brand})`) : ""} ${c.dim("|")} ${c.dim("Model:")} ${c.bold(rt.model)}` +
    `${rt.thinking ? ` ${c.dim("|")} ${c.dim("Thinking:")} ${rt.thinking}` : ""}`
  );
  if (brand && process.env.OPENAI_BASE_URL) {
    console.log(`  ${c.dim("Endpoint:")} ${c.bold(process.env.OPENAI_BASE_URL)}`);
  }
  console.log(`  ${c.dim("Thread:")}   ${c.bold("#" + current.id)}${current.name ? c.dim(` ("${current.name}")`) : ""} ${c.dim("— " + sessionStatus)}`);
  const memCount = getMemoryCount();
  if (memCount > 0) {
    console.log(`  ${c.dim("Memory:")}   ${memCount} entr${memCount === 1 ? "y" : "ies"} in memory.log`);
  }
  if (rt.autoRetry) {
    console.log(`  ${c.dim("Retry:")}    auto (max ${rt.autoRetryMax})`);
  }
  console.log("");
  console.log("  " + c.bold("Common commands:"));
  console.log("    " + c.cyan("/help") + "          all commands         " + c.cyan("/status") + "      runtime info");
  console.log("    " + c.cyan("/list /new") + "     manage threads       " + c.cyan("/switch <n>") + "  resume thread");
  console.log("    " + c.cyan("/history") + "       view this thread     " + c.cyan("/export md") + "   save as Markdown");
  console.log("    " + c.cyan("/retry /again") + "  redo last prompt     " + c.cyan("/multiline") + "   paste long input");
  console.log("    " + c.cyan("/exit") + "          end session          " + c.dim("Ctrl-C") + "       quit anytime");
  console.log("  " + c.dim("─────────────────────────────────────────────────────────────────────"));
  console.log("");

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

  function prompt(): string {
    const branch = getGitBranch();
    const branchPart = branch ? ` (${branch})` : "";
    const aliasPart = current.name ? ` [${current.name}]` : "";
    return `${repoName}${branchPart} #${current.id}${aliasPart} > `;
  }

  /** Run one user prompt with timing display when enabled. */
  async function turn(text: string, spinnerLabel = "Thinking"): Promise<void> {
    lastPrompt = text;
    const t0 = Date.now();
    try {
      const { thread, reply } = await runTurn(current, text, rt, spinnerLabel);
      current = thread;
      console.log("");
      console.log(renderMarkdown(reply || "(no text reply produced)"));
      if (rt.showTiming) {
        const words = stripAnsi(reply).split(/\s+/).filter((w) => w.length > 0).length;
        console.log(`\n  ─ ${formatDuration(Date.now() - t0)} · ${words} words`);
      }
      console.log("");
    } catch (err) {
      console.log("\n  " + c.red("× ") + (err as Error).message + "\n");
    }
  }

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const line = (await ask(prompt())).trim();
      if (!line) continue;

      // ─── Exit ─────────────────────────────────────────────────────────────
      if (line === "/exit" || line === "/quit") break;

      // ─── /help, /clear ────────────────────────────────────────────────────
      if (line === "/help") { printReplHelp(); continue; }
      if (line === "/clear") { process.stdout.write("\x1B[2J\x1B[H"); continue; }

      // ─── Thread commands ──────────────────────────────────────────────────
      if (line === "/list") { console.log(""); cmdList(); console.log(""); continue; }

      if (line === "/new" || line.startsWith("/new ")) {
        const arg = line.slice("/new".length).trim() || null;
        try {
          const t = allocateThread(arg);
          current = t;
          console.log(`\n  Created thread #${t.id}${t.name ? ` ("${t.name}")` : ""}; switched.\n`);
        } catch (err) {
          console.log("\n  " + c.red("× ") + (err as Error).message + "\n");
        }
        continue;
      }

      if (line.startsWith("/switch ")) {
        const ref = line.slice("/switch ".length).trim();
        const t = resolveThreadRef(ref);
        if (!t) {
          console.log("\n  " + c.yellow("! ") + `Unknown thread "${ref}". Use /list to see existing threads.\n`);
        } else {
          current = t;
          const n = current.sessionPath ? countSessionTurns(current.sessionPath) : 0;
          console.log(`\n  Switched to thread #${t.id}${t.name ? ` ("${t.name}")` : ""} (${n} turn${n === 1 ? "" : "s"}).\n`);
        }
        continue;
      }

      if (line.startsWith("/rename ")) {
        const newName = line.slice("/rename ".length).trim();
        if (!ALIAS_PATTERN.test(newName)) {
          console.log("\n  " + c.yellow("! ") + `Invalid name "${newName}". Use letters/digits/_/- (starts with a letter).\n`);
          continue;
        }
        const clash = listThreads().find((x) => x.name === newName && x.id !== current.id);
        if (clash) {
          console.log("\n  " + c.yellow("! ") + `Name "${newName}" already taken by thread #${clash.id}.\n`);
          continue;
        }
        current = { ...current, name: newName, updatedAt: new Date().toISOString() };
        writeThread(current);
        console.log(`\n  Thread #${current.id} renamed to "${newName}".\n`);
        continue;
      }

      // ─── /history ─────────────────────────────────────────────────────────
      if (line === "/history") {
        const h = current.sessionPath ? getSessionHistory(current.sessionPath) : [];
        if (h.length === 0) { console.log("\n  No history in this thread.\n"); continue; }
        console.log(`\n  Conversation history (${h.length} messages):\n`);
        let n = 0;
        for (const e of h) {
          if (e.role === "user") n++;
          const label = e.role === "user" ? `  [${n}] You:` : "       AI:";
          console.log(`${label} ${e.preview}`);
        }
        console.log("");
        continue;
      }

      // ─── /export md ───────────────────────────────────────────────────────
      if (line === "/export md" || line === "/export") {
        const h = current.sessionPath ? getSessionHistory(current.sessionPath) : [];
        if (h.length === 0) { console.log("\n  Nothing to export.\n"); continue; }
        const outPath = resolve(sessionsDir,
          `thread-${current.id}${current.name ? `-${current.name}` : ""}-export.md`);
        const md: string[] = [
          `# Thread #${current.id}${current.name ? ` — ${current.name}` : ""}`,
          ``,
          `Exported: ${new Date().toISOString()}`,
          `Provider: ${rt.provider} | Model: ${rt.model}`,
          ``,
        ];
        let n = 0;
        for (const e of h) {
          if (e.role === "user") { n++; md.push(`## Turn ${n}`, ``, `**You:** ${e.preview}`, ``); }
          else { md.push(`**AI:** ${e.preview}`, ``); }
        }
        try { writeFileSync(outPath, md.join("\n")); console.log(`\n  Exported to: ${outPath}\n`); }
        catch (err) { console.log("\n  " + c.red("× ") + (err as Error).message + "\n"); }
        continue;
      }

      // ─── /status ──────────────────────────────────────────────────────────
      if (line === "/status") {
        const branch = getGitBranch();
        const mc = getMemoryCount();
        const sExists = current.sessionPath ? existsSync(current.sessionPath) : false;
        const sTurns = sExists ? countSessionTurns(current.sessionPath!) : 0;
        const sSize = sExists ? formatBytes(statSync(current.sessionPath!).size) : "—";
        console.log("");
        const brandLabel = localBrandLabel(rt.provider);
        console.log("  Status:");
        console.log(`    Provider:    ${rt.provider}${brandLabel ? ` (${brandLabel}, local server)` : ""}`);
        console.log(`    Pi --provider: ${resolvePiProvider(rt.provider)}`);
        console.log(`    Model:       ${rt.model}`);
        if (rt.thinking) console.log(`    Thinking:    ${rt.thinking}`);
        console.log(`    Thread:      #${current.id}${current.name ? ` ("${current.name}")` : ""}`);
        console.log(`    Session:     ${sTurns} turn${sTurns === 1 ? "" : "s"}, ${sSize}`);
        if (branch) console.log(`    Git branch:  ${branch}`);
        console.log(`    Memory:      ${mc} entr${mc === 1 ? "y" : "ies"}`);
        console.log(`    Timing:      ${rt.showTiming ? "on" : "off"}`);
        console.log(`    Verbose:     ${rt.verbose ? "on" : "off"}`);
        console.log(`    Auto-retry:  ${rt.autoRetry ? `on (max ${rt.autoRetryMax})` : "off"}`);
        console.log(`    Uptime:      ${formatDuration(Date.now() - startTime)}`);
        if (process.env.OPENAI_BASE_URL) {
          console.log(`    OPENAI_BASE_URL: ${process.env.OPENAI_BASE_URL}`);
        }
        console.log("");
        continue;
      }

      // ─── /model <name> ────────────────────────────────────────────────────
      // Also accepts `provider:model` (e.g. `/model lmstudio:google/gemma-4-31b`)
      // to switch both at once. Known local brands: lmstudio, ollama, vllm.
      if (line === "/model" || line.startsWith("/model ")) {
        const newModel = line.slice("/model".length).trim();
        if (!newModel) {
          console.log(`\n  Current provider:model = ${rt.provider}:${rt.model}\n  Usage: /model <id>  or  /model <provider>:<id>\n`);
        } else if (/\s/.test(newModel)) {
          console.log("\n  " + c.yellow("! ") + "Model IDs must not contain whitespace.\n");
        } else if (newModel.includes(":") && /^[a-z][a-z0-9-]*:/.test(newModel)) {
          const idx = newModel.indexOf(":");
          const newProv = newModel.slice(0, idx);
          const newId   = newModel.slice(idx + 1);
          const oldProv = rt.provider, oldModel = rt.model;
          rt.provider = newProv;
          rt.model = newId;
          // Re-wire env for newly-selected local brand if needed.
          if (LOCAL_PROVIDERS.has(newProv)) {
            const def = LOCAL_BRAND_DEFAULTS[newProv];
            if (def && !process.env.OPENAI_BASE_URL) {
              process.env.OPENAI_BASE_URL = def.baseUrl;
              process.env.LOCAL_LLM_BASE_URL = def.baseUrl;
            }
            if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = "local";
            rt.autoRetry = true;
          }
          console.log(`\n  Switched: ${oldProv}:${oldModel} → ${rt.provider}:${rt.model}\n`);
        } else {
          const old = rt.model;
          rt.model = newModel;
          console.log(`\n  Model changed: ${old} → ${rt.model}\n`);
        }
        continue;
      }

      // ─── /provider <name> ─────────────────────────────────────────────────
      // Switch provider (and optionally re-wire local-server env vars).
      if (line === "/provider" || line.startsWith("/provider ")) {
        const arg = line.slice("/provider".length).trim();
        if (!arg) {
          console.log(`\n  Current provider: ${rt.provider}` +
            (localBrandLabel(rt.provider) ? c.dim(` (${localBrandLabel(rt.provider)})`) : "") +
            `\n  Usage: /provider <name>` +
            `\n  Known local brands: lmstudio, ollama, vllm` +
            `\n  Cloud examples:    openai, anthropic, google, xai, openrouter\n`);
        } else {
          const oldProv = rt.provider;
          rt.provider = arg;
          if (LOCAL_PROVIDERS.has(arg)) {
            const def = LOCAL_BRAND_DEFAULTS[arg];
            if (def && !process.env.OPENAI_BASE_URL) {
              process.env.OPENAI_BASE_URL = def.baseUrl;
              process.env.LOCAL_LLM_BASE_URL = def.baseUrl;
            }
            if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = "local";
            rt.autoRetry = true;
          }
          console.log(`\n  Provider: ${oldProv} → ${rt.provider}` +
            (localBrandLabel(rt.provider) ? c.dim(` (${localBrandLabel(rt.provider)} via openai-compatible client)`) : "") + "\n");
        }
        continue;
      }

      // ─── /time, /verbose ──────────────────────────────────────────────────
      if (line === "/time") {
        rt.showTiming = !rt.showTiming;
        console.log(`\n  Timing display: ${rt.showTiming ? "on" : "off"}\n`);
        continue;
      }
      if (line === "/verbose") {
        rt.verbose = !rt.verbose;
        console.log(`\n  Verbose mode: ${rt.verbose ? "on" : "off"}\n`);
        continue;
      }

      // ─── /auto-retry [on|off|N] ───────────────────────────────────────────
      if (line === "/auto-retry" || line.startsWith("/auto-retry ")) {
        const arg = line.slice("/auto-retry".length).trim();
        if (arg === "off" || arg === "0") {
          rt.autoRetry = false;
          console.log(`\n  Auto-retry: off\n`);
        } else if (arg === "on") {
          rt.autoRetry = true;
          console.log(`\n  Auto-retry: on (max ${rt.autoRetryMax})\n`);
        } else if (arg) {
          const n = parseInt(arg, 10);
          if (n >= 1 && n <= 10) {
            rt.autoRetry = true; rt.autoRetryMax = n;
            console.log(`\n  Auto-retry: on (max ${n})\n`);
          } else {
            console.log(`\n  Usage: /auto-retry [on|off|1-10]\n`);
          }
        } else {
          rt.autoRetry = !rt.autoRetry;
          console.log(`\n  Auto-retry: ${rt.autoRetry ? `on (max ${rt.autoRetryMax})` : "off"}\n`);
        }
        continue;
      }

      // ─── Memory commands ──────────────────────────────────────────────────
      if (line.startsWith("/remember ")) {
        const text = line.slice("/remember ".length).trim();
        if (!text) { console.log("\n  Usage: /remember <text>\n"); continue; }
        try {
          const ts = new Date().toISOString().replace("T", " ").slice(0, 16);
          appendFileSync(memoryLogPath, `[${ts}] ${text}\n`);
          console.log(`\n  Remembered: ${text}\n`);
        } catch (err) {
          console.log("\n  " + c.red("× ") + `could not write memory.log: ${(err as Error).message}\n`);
        }
        continue;
      }
      if (line === "/memories" || line.startsWith("/memories ")) {
        const term = line.slice("/memories".length).trim();
        if (!existsSync(memoryLogPath)) { console.log("\n  No memory.log yet.\n"); continue; }
        try {
          const all = readFileSync(memoryLogPath, "utf-8")
            .split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (all.length === 0) { console.log("\n  memory.log is empty.\n"); continue; }
          if (term) {
            const lower = term.toLowerCase();
            const matches = all.filter((l) => l.toLowerCase().includes(lower));
            if (matches.length === 0) console.log(`\n  No memories matching "${term}".\n`);
            else {
              console.log(`\n  Memories matching "${term}" (${matches.length}):\n`);
              for (const m of matches) console.log(`    ${m}`);
              console.log("");
            }
          } else {
            const recent = all.slice(-10);
            console.log(`\n  Recent memories (${recent.length} of ${all.length}):\n`);
            for (const m of recent) console.log(`    ${m}`);
            console.log("");
          }
        } catch { console.log("\n  Could not read memory.log.\n"); }
        continue;
      }

      // ─── File / repo commands ─────────────────────────────────────────────
      if (line.startsWith("/cat ")) {
        const p = line.slice("/cat ".length).trim();
        const safe = p ? safePath(p) : null;
        if (!safe) { console.log("\n  Bad or out-of-repo path.\n"); continue; }
        if (!existsSync(safe)) { console.log(`\n  File not found: ${p}\n`); continue; }
        try {
          const lines = readFileSync(safe, "utf-8").split(/\r?\n/);
          const pad = String(lines.length).length;
          console.log("");
          for (let i = 0; i < lines.length; i++) {
            console.log(`  ${String(i + 1).padStart(pad)}. ${lines[i]}`);
          }
          console.log("");
        } catch (err) { console.log("\n  " + c.red("× ") + (err as Error).message + "\n"); }
        continue;
      }
      if (line.startsWith("/md ")) {
        const p = line.slice("/md ".length).trim();
        const safe = p ? safePath(p) : null;
        if (!safe) { console.log("\n  Bad or out-of-repo path.\n"); continue; }
        if (!existsSync(safe)) { console.log(`\n  File not found: ${p}\n`); continue; }
        try {
          console.log("");
          console.log(renderMarkdown(readFileSync(safe, "utf-8")));
          console.log("");
        } catch (err) { console.log("\n  " + c.red("× ") + (err as Error).message + "\n"); }
        continue;
      }
      if (line === "/git") {
        console.log("");
        try {
          const status = execFileSync("git", ["status", "--short"],
            { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
          if (status.trim()) {
            console.log("  Changes:");
            for (const s of status.trimEnd().split("\n")) console.log(`    ${s}`);
          } else {
            console.log("  Working tree clean.");
          }
          const diffStat = execFileSync("git", ["diff", "--stat"],
            { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
          if (diffStat.trim()) {
            console.log("");
            for (const s of diffStat.trimEnd().split("\n")) console.log(`    ${s}`);
          }
        } catch (err) { console.log("  " + c.red("× ") + (err as Error).message); }
        console.log("");
        continue;
      }
      if (line === "/diff" || line.startsWith("/diff ")) {
        const target = line.slice("/diff".length).trim();
        const args = target ? ["diff", "--", target] : ["diff"];
        console.log("");
        try {
          const out = execFileSync("git", args,
            { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
          if (out.trim()) process.stdout.write(out);
          else console.log("  No differences.");
        } catch (err) { console.log("  " + c.red("× ") + (err as Error).message); }
        console.log("");
        continue;
      }
      if (line.startsWith("/run ")) {
        const cmd = line.slice("/run ".length).trim();
        if (!cmd) { console.log("\n  Usage: /run <command>\n"); continue; }
        // /run is deliberately a free-form shell escape (the user is the
        // attacker as well as the victim here), but we still cap timeout.
        console.log("");
        try {
          const out = execSync(cmd, {
            encoding: "utf-8", timeout: 30_000,
            stdio: ["pipe", "pipe", "pipe"],
          });
          process.stdout.write(out);
          if (!out.endsWith("\n")) console.log("");
        } catch (err: unknown) {
          const e = err as { stdout?: string; stderr?: string; status?: number };
          if (e.stdout) process.stdout.write(e.stdout);
          if (e.stderr) process.stderr.write(e.stderr);
          console.log(`  [exit ${e.status ?? "?"}]`);
        }
        console.log("");
        continue;
      }

      // ─── Prompt-management commands ───────────────────────────────────────
      if (line === "/retry") {
        if (!lastPrompt) { console.log("\n  No previous prompt to retry.\n"); continue; }
        console.log(`\n  Retrying: ${lastPrompt.length > 60 ? lastPrompt.slice(0, 57) + "..." : lastPrompt}`);
        await turn(lastPrompt, "Retrying");
        continue;
      }
      if (line === "/again") {
        if (!lastPrompt) { console.log("\n  No previous prompt to retry.\n"); continue; }
        try {
          const t = allocateThread(null);
          const oldId = current.id;
          current = t;
          console.log(`\n  New thread #${t.id} (was #${oldId}); re-sending last prompt.`);
          await turn(lastPrompt, "Thinking");
        } catch (err) { console.log("\n  " + c.red("× ") + (err as Error).message + "\n"); }
        continue;
      }
      if (line === "/best-of" || line.startsWith("/best-of ")) {
        const n = parseInt(line.slice("/best-of".length).trim(), 10);
        if (!n || n < 2 || n > 10) {
          console.log("\n  Usage: /best-of <n>  (n = 2–10)\n"); continue;
        }
        if (!lastPrompt) { console.log("\n  No previous prompt to retry.\n"); continue; }
        console.log(`\n  Sending the last prompt ${n} times in fresh throwaway threads…\n`);
        const saved = current;
        const savedAutoRetry = rt.autoRetry;
        rt.autoRetry = false;
        const results: Array<{ id: number; reply: string; ms: number }> = [];
        for (let i = 1; i <= n; i++) {
          try {
            const t = allocateThread(null);
            const t0 = Date.now();
            const { reply } = await runTurn(t, lastPrompt, rt, `best-of ${i}/${n}`);
            results.push({ id: t.id, reply, ms: Date.now() - t0 });
          } catch (err) {
            results.push({ id: -1, reply: `[error] ${(err as Error).message}`, ms: 0 });
          }
        }
        rt.autoRetry = savedAutoRetry;
        current = saved;
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          console.log(`  ── Response ${i + 1}/${n}` +
            `${r.id > 0 ? ` (thread #${r.id})` : ""} (${formatDuration(r.ms)}) ──`);
          console.log(renderMarkdown(r.reply));
          console.log("");
        }
        continue;
      }
      if (line === "/multiline") {
        console.log("\n  Multiline mode: type freely; enter a blank line to send.\n");
        const lines: string[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const more = await ask("  ... ");
          if (more.trim() === "") break;
          lines.push(more);
        }
        const full = lines.join("\n").trim();
        if (!full) { console.log("  (empty, cancelled)\n"); continue; }
        await turn(full, "Thinking");
        continue;
      }

      // ─── Unknown command ──────────────────────────────────────────────────
      if (line.startsWith("/")) {
        const cmd = line.split(/\s/)[0];
        console.log(`\n  Unknown command: ${cmd}  (type /help)\n`);
        continue;
      }

      // ─── Regular prompt ───────────────────────────────────────────────────
      await turn(line, "Thinking");
    }
  } finally {
    rl.close();
    cleanup();
  }
}

// ─── Guided recovery flows ────────────────────────────────────────────────────
// These NEVER call process.exit().  They return a possibly-updated runtime
// shape so main() can decide whether to proceed.  All output goes through
// `say.*` (stdout) — no red-on-white stderr.

type RuntimeCfg = { provider: string; model: string; thinking: string | undefined };

/**
 * Friendly prompt for a single line; returns "" on Ctrl-C/EOF rather than
 * throwing, so callers can treat it as "user backed out".
 */
async function promptLine(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  try {
    return await new Promise<string>((res) => {
      rl.question(question, (a: string) => res(a ?? ""));
    });
  } catch {
    return "";
  } finally {
    rl.close();
  }
}

/** Show the "how to persist this env var" instructions, no prompts. */
function printPersistHints(keyName: string, valueHint = "your-key-here"): void {
  console.log("    " + c.dim("To persist for future sessions:"));
  console.log("      " + c.cyan(`PowerShell  `) + c.gray(`setx ${keyName} "${valueHint}"`));
  console.log("      " + c.cyan(`bash/zsh    `) + c.gray(`export ${keyName}="${valueHint}"   # add to ~/.bashrc`));
  console.log("    " + c.dim("(setx values apply to NEW terminal windows.)"));
  console.log("");
}

/**
 * Recover from a missing cloud API key without crashing.  Offers four paths:
 *   1. Paste the key now (session-scoped).
 *   2. Switch to a local LLM (OpenAI-compatible endpoint).
 *   3. Show persistence instructions and quit.
 *   4. Quit.
 * Returns the (possibly updated) runtime config to use, or null to quit.
 */
async function guideMissingApiKey(cfg: RuntimeCfg): Promise<RuntimeCfg | null> {
  const keyName = PROVIDER_KEY_MAP[cfg.provider] ?? `${cfg.provider.toUpperCase()}_API_KEY`;

  console.log("");
  console.log("  " + c.yellow(c.bold("─ Setup needed ──────────────────────────────────────────────────────")));
  console.log("");
  console.log("    " + c.bold(`Provider "${cfg.provider}" needs an API key`));
  console.log("    " + c.dim(`The environment variable ${c.bold(keyName)}${c.dim(" is not set.")}`));
  console.log("");
  console.log("    " + c.bold("How would you like to continue?"));
  console.log("      " + c.cyan("[1]") + "  Paste your API key now " + c.dim("(used for this session only)"));
  console.log("      " + c.cyan("[2]") + "  Use a local LLM instead " + c.dim("(LM Studio, Ollama, vLLM…)"));
  console.log("      " + c.cyan("[3]") + "  Show how to set the env var permanently, then quit");
  console.log("      " + c.cyan("[q]") + "  Quit");
  console.log("");

  while (true) {
    const choice = (await promptLine("    Choice [1/2/3/q]: ")).trim().toLowerCase();

    if (choice === "" || choice === "q" || choice === "quit" || choice === "exit") {
      return null;
    }

    if (choice === "1") {
      console.log("");
      say.hint("Paste your key and press Enter. It is not saved to disk.");
      const key = (await promptLine("    " + c.cyan(`${keyName} = `))).trim();
      if (!key) { say.warn("No key entered.", "Try again or pick another option."); continue; }
      process.env[keyName] = key;
      say.ok(`Key set for this session (${key.length} chars).`);
      printPersistHints(keyName, key.slice(0, 4) + "…" + key.slice(-4));
      return cfg;
    }

    if (choice === "2") {
      console.log("");
      console.log("    " + c.bold("Local LLM setup"));
      console.log("    " + c.dim("Pick the local server you are running. They all speak the"));
      console.log("    " + c.dim("OpenAI-compatible Chat Completions API, so pi talks to them"));
      console.log("    " + c.dim("through its 'openai' provider client (you'll see that in"));
      console.log("    " + c.dim("pi's diagnostics) but the launcher will label things by brand."));
      console.log("");
      console.log("      " + c.cyan("[a]") + " LM Studio    " + c.gray("http://localhost:1234/v1"));
      console.log("      " + c.cyan("[b]") + " Ollama       " + c.gray("http://localhost:11434/v1"));
      console.log("      " + c.cyan("[c]") + " vLLM         " + c.gray("http://localhost:8000/v1"));
      console.log("      " + c.cyan("[d]") + " Other openai-compatible endpoint");
      console.log("");
      let brand: "lmstudio" | "ollama" | "vllm" | "openai" = "lmstudio";
      while (true) {
        const b = (await promptLine("    Server [a/b/c/d]: ")).trim().toLowerCase();
        if (b === "" || b === "a" || b === "lmstudio" || b === "lm-studio") { brand = "lmstudio"; break; }
        if (b === "b" || b === "ollama") { brand = "ollama"; break; }
        if (b === "c" || b === "vllm")   { brand = "vllm"; break; }
        if (b === "d" || b === "other" || b === "openai") { brand = "openai"; break; }
        say.warn(`Unrecognised choice: "${b}"`, "Pick a, b, c, or d.");
      }
      const defaults = LOCAL_BRAND_DEFAULTS[brand] ?? { label: "openai-compatible", baseUrl: "http://localhost:1234/v1" };
      const url = (await promptLine(`    Base URL [${defaults.baseUrl}]: `)).trim() || defaults.baseUrl;
      const modelDefault = cfg.model || "local-model";
      const newModel = (await promptLine(`    Model id  [${modelDefault}]: `)).trim() || modelDefault;
      process.env.LOCAL_LLM_BASE_URL = url;
      process.env.OPENAI_BASE_URL = url;
      process.env.OPENAI_API_KEY = "local";
      say.ok(`${defaults.label} endpoint set: ${url}`);
      say.hint(`Provider label: ${brand}  (pi sees --provider openai under the hood; --api-key local is sent on every turn so it won't complain about missing keys).`);
      console.log("");
      return { provider: brand, model: newModel, thinking: cfg.thinking };
    }

    if (choice === "3") {
      console.log("");
      printPersistHints(keyName);
      say.info("Once set, run `bun run chat` again. Goodbye.");
      return null;
    }

    say.warn(`Unrecognised choice: "${choice}"`, "Pick 1, 2, 3, or q.");
  }
}

/** Friendly handler for missing pi binary. */
function guidePiNotInstalled(triedPaths: string[]): void {
  say.error(
    "The `pi` binary isn't installed yet.",
    "This project uses @earendil-works/pi-coding-agent under the hood, " +
    "which is added when you run `bun install` in the .github-minimum-intelligence/ folder."
  );
  console.log("    " + c.bold("To fix:"));
  console.log("      " + c.gray("cd .github-minimum-intelligence"));
  console.log("      " + c.gray("bun install"));
  console.log("");
  console.log("    " + c.dim("Checked these locations:"));
  for (const p of triedPaths) console.log("      " + c.dim(p));
  console.log("");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  mkdirSync(threadsDir, { recursive: true });
  mkdirSync(sessionsDir, { recursive: true });

  // Read-only subcommands don't need pi settings or an API key.
  if (args.list) { cmdList(); return; }
  if (args.rmRef !== null) { cmdRemove(args.rmRef); return; }

  let cfg: RuntimeCfg = resolveRuntimeConfig();

  // ── Validate config BEFORE creating threads ─────────────────────────────
  // (so quitting from the guide doesn't leave orphan thread #1 behind.)
  if (!isLocalProvider(cfg.provider)) {
    const keyName = PROVIDER_KEY_MAP[cfg.provider];
    if (keyName && !process.env[keyName]) {
      const updated = await guideMissingApiKey(cfg);
      if (!updated) { console.log("  " + c.dim("Goodbye.")); return; }
      cfg = updated;
    }
  }

  // ── Locate pi binary; guide the user if it's missing ────────────────────
  let piBin: string;
  try {
    piBin = locatePiBin();
  } catch (err) {
    // Extract the candidate list out of the throw message for the guide.
    const msg = (err as Error).message;
    const m = msg.match(/not found in any of: ([^\n]+)/);
    const candidates = m ? m[1].split(", ") : [];
    guidePiNotInstalled(candidates);
    return;
  }

  // ── Resolve / create the active thread ──────────────────────────────────
  let activeThread: Thread | null = null;
  if (args.newThread) {
    activeThread = allocateThread(args.newName);
    say.ok(
      `Created thread #${activeThread.id}` +
      `${activeThread.name ? ` ("${activeThread.name}")` : ""}.`
    );
    if (!args.prompt && !args.threadRef) return;
  }
  if (!activeThread) {
    if (!args.threadRef) {
      activeThread = await interactiveStart(cfg.provider, cfg.model, cfg.thinking);
      if (!activeThread) { console.log("  " + c.dim("Goodbye.")); return; }
    } else {
      activeThread = resolveThreadRef(args.threadRef);
      if (!activeThread) {
        say.warn(
          `Unknown thread "${args.threadRef}".`,
          "Use `--list` to see existing threads, or `--new` to create one. " +
          "Closed-world: unknown refs are never auto-created."
        );
        return;
      }
    }
  }

  // Auto-retry default: on for local providers (flaky/slow), off for cloud
  // (failures are usually configuration errors, not transient).
  const rt: RuntimeState = {
    provider: cfg.provider, model: cfg.model, thinking: cfg.thinking,
    showTiming: false, verbose: false,
    autoRetry: isLocalProvider(cfg.provider),
    autoRetryMax: 3,
    piBin,
  };

  // One-shot mode.
  if (args.prompt) {
    try {
      const { reply } = await runTurn(activeThread, args.prompt, rt, "Thinking");
      console.log("");
      console.log(renderMarkdown(reply || "(no text reply produced)"));
    } catch (err) {
      say.error("Turn failed", (err as Error).message);
    }
    return;
  }

  await repl(activeThread, rt);
}

main();

