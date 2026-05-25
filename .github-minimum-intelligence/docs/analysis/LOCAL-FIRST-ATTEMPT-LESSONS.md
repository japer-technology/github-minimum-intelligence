# LOCAL-FIRST-ATTEMPT-LESSONS

> **Status (2026-05-25): implementation complete.** All §4 ROI items 1–12 are
> shipped in `lifecycle/local-chat.ts`. §3.4 has a regression test in
> `lifecycle/local-chat.test.ts` (run with `bun test`). §3.2 is enforced: all
> non-user shell calls use `execFileSync`; only `/run <command>` uses
> `execSync` deliberately (it is the user's own command line). §2.4 is
> documented in [README-VSC.md](README-VSC.md). The sections below are kept
> as historical record of the decision-making.

A feature inventory and design-decision log from the earlier local-runner
prototype at `C:\Users\The Federation\Documents\GitHub\gmi-local-2`.

That repo contains two scripts (`local-agent.ts`, `local-chat.ts`) and a
sibling docs folder (`.github-intelligence-local/`) that pre-dates the
current `lifecycle/local-chat.ts` in this workspace. This document
catalogues everything they did that we **might** or **should** consider
adopting here, and flags the parts we should deliberately *not* copy.

Source paths referenced below:

- `gmi-local-2/.github-intelligence-local/README.md`
- `gmi-local-2/.github-minimum-intelligence/lifecycle/local-agent.ts`
- `gmi-local-2/.github-minimum-intelligence/lifecycle/local-chat.ts`
- `gmi-local-2/.github-minimum-intelligence/.pi/settings.json`
- `gmi-local-2/.github-minimum-intelligence/package.json`

---

## 1. Features we should likely adopt

### 1.1 Local-LLM (OpenAI-compatible) endpoint support
Why: the single biggest gap in our current `local-chat.ts` — it assumes a
cloud provider with a `*_API_KEY`. The prototype handled LM Studio /
Ollama / vLLM transparently:

- New env vars: `LOCAL_PROVIDER`, `LOCAL_MODEL`, `LOCAL_THINKING`,
  `LOCAL_LLM_BASE_URL`, `LOCAL_SESSION_NAME`, `LOCAL_PROMPT`.
- When provider is `openai` and `LOCAL_LLM_BASE_URL` is set, forward it
  into `OPENAI_BASE_URL` and inject a placeholder `OPENAI_API_KEY=local`
  so the SDK does not reject the request.
- Recognise `lmstudio` as a first-class provider value.
- Document `defaultThinkingLevel` as *removable* — most local models
  reject it.

### 1.2 EPIPE-safe stdout/stderr
Both scripts install `process.stdout/err.on("error", ...)` handlers that
swallow `EPIPE` and exit cleanly. Useful any time the runner is piped
into `more`, `head`, a VS Code task that closes its consumer early, etc.
Our current `local-chat.ts` will crash with an unhandled error in that
case.

### 1.3 Markdown rendering of assistant replies
Uses `marked` + `marked-terminal` + `ansi-regex` to render the final
assistant text with ANSI styling in the terminal. Adds three deps but
hugely improves readability of code blocks, lists, and headings. Ours
prints raw markdown source.

### 1.4 Spinner / "Thinking…" activity indicator
Simple braille-frame spinner driven by `setInterval`, cleared with a
carriage-return blank line. Critical UX for slow local models where a
single turn can take 30–60 s.

### 1.5 Automatic retry with bounded attempts
Both scripts share this:

- Env-driven `LOCAL_AUTO_RETRY` (default on) and `LOCAL_RETRY_MAX`
  (default 3, capped 1–10).
- Triggers on non-zero `pi` exit code **and** on empty assistant text.
- Prints `⟳ Retry n/N…` and `✓ Got response on attempt n/N`.
- Local models hallucinate empty turns or transient HTTP errors
  routinely; this turns a flaky tool into a usable one.

### 1.6 Subprocess lifecycle / cleanup
- Track the active `pi` child in `activePiProcess`.
- Install `SIGINT` / `SIGTERM` handlers that `try { pi.kill() } catch`.
- Ensures Ctrl+C does not leave orphan `pi` processes streaming JSONL
  into a dead terminal — a real problem on Windows.

### 1.7 Cross-platform binary detection
```ts
const piBin = existsSync(base + ".exe") ? base + ".exe"
            : existsSync(base) ? base : null;
```
Cleaner than our current `process.platform === "win32" ? "pi.cmd" : "pi"`
because Bun's `pi` shim is actually `.exe` (not `.cmd`) on some Windows
installs depending on how `bun install` linked it.

### 1.8 Dynamic prompt with repo + branch + session
`buildPromptString()` produces e.g. `repo (main) [refactor] > ` by
calling `git rev-parse --abbrev-ref HEAD` and `--show-toplevel` lazily.
Massively orients the user when juggling multiple worktrees in VS Code.

### 1.9 `/status` command
Single-screen dashboard: provider, model, thinking level, current
session name + turn count + on-disk size, git branch, memory entry
count, timing toggle, verbose toggle, auto-retry config, uptime.
Excellent for debugging "why is this turn slow / why is my key not
being read".

### 1.10 `/help` discoverability
Long, grouped command list (Session / Model & Config / Memory / Files &
Repo / Prompt / General). Ours has no `/help` at all.

### 1.11 Memory log (`/remember` + `/memories`)
Append-only `memory.log` next to `state/`. `/remember <text>` writes
`[YYYY-MM-DD HH:MM] text\n`; `/memories [term]` greps or shows last
10. Cheap, file-based, agent-readable persistent scratchpad.

### 1.12 Session management commands
Worth adopting as-is, mapped onto our closed-world IDs:

- `/sessions` — list with turn count, size, mtime, "← active" marker.
- `/session <name>` — switch.
- `/rename <name>` — `renameSync` the JSONL.
- `/new` — start a fresh session (we already have `--new`; expose
  inside the REPL too).
- `/history` — condensed user/assistant preview (≤80 char per turn).
- `/export md` — dump session as readable Markdown with turn headers.

### 1.13 In-REPL filesystem inspection
- `/cat <path>` — line-numbered file print.
- `/md <path>` — render a markdown file with `marked-terminal`.
- `/git` — `git status --short` + `git diff --stat`.
- `/diff [path]` — `git diff` (uses `execFileSync` with arg array, not
  string interpolation — see §3.2).
- `/run <command>` — `execSync` with 30 s timeout.

These reduce context-switching to a second terminal. The `safePath()`
helper that rejects anything resolving outside the git root is good
practice for any of these we adopt.

### 1.14 Prompt-management commands
- `/retry` — re-send the last user prompt in the same session.
- `/again` — start a fresh session and re-send.
- `/best-of <n>` — send the last prompt N times (each in an isolated
  throwaway session), print all responses with timing. Very useful for
  comparing local-model determinism.
- `/multiline` — switch to "type freely, blank line submits" mode.

### 1.15 `/model <name>` mid-session swap
Mutates `currentModel` for subsequent turns without restarting the
runner. Trivial to add and high value when prototyping.

### 1.16 `/time` and `/verbose` toggles
- `/time` appends `─ 12.4s · 184 words` after each response.
- `/verbose` prints `[verbose] N JSONL events received` after each
  turn. Both are toggleable and off by default.

### 1.17 `/clear`
Plain `\x1B[2J\x1B[H`. Tiny, but expected by anyone coming from
`bash`/`pwsh`.

### 1.18 Banner with session-resume status
On startup prints provider, model, thinking, and
`"resuming <name> (N turns)"` vs `"new session <name>"`. Sets correct
expectations about whether prior memory is being loaded.

### 1.19 Save raw JSONL of the last run
`local-agent.ts` writes the *complete* stdout to
`state/local-last-run.jsonl` regardless of exit code. Enables
post-mortem debugging of pi event streams without rerunning.

### 1.20 Defensive `mkdirSync(..., { recursive: true })` everywhere
Both scripts do this on every path before use. We do it once at the top
of `main()`; matching their style makes the helpers individually safer
when invoked from tests or new entry points later.

---

## 2. Features to consider with caution

### 2.1 `local-agent.ts` (single-shot, non-interactive) as a sibling entry point
Our `local-chat.ts` already supports `bun run chat --thread N "prompt"`
for one-shot use. Adding a *second* script duplicates the API-surface.
**Recommendation:** keep our one entry point but document its one-shot
mode prominently; do not port `local-agent.ts` verbatim.

### 2.2 `marked` + `marked-terminal` + `ansi-regex` dependencies
+200 KB of node_modules. Worth it for §1.3, but means the local runner
is no longer "Bun + Node stdlib only" — which is a quiet selling point
of the current README-VSC.md. Document the trade-off.

### 2.3 `LOCAL_*` environment-variable naming
The prototype uses `LOCAL_PROVIDER` etc. to *override* `.pi/settings.json`.
We deliberately read settings only. The env-override pattern is handy
for one-off experiments, but if we adopt it we must update README-VSC
and document precedence (env > settings > defaults).

### 2.4 `defaultThinkingLevel` removal for local models
Their `settings.json` simply omits the field. Our code passes
`--thinking` whenever set. Adopt: continue to omit when undefined
(already true), and update the docs to say "delete this line if using
a local model that rejects it".

---

## 3. Features / patterns we should NOT copy

### 3.1 User-supplied session names with no closed-world identity
`local-chat.ts` lets the user type `/session refactor` and silently
creates a new session on typo. This is the exact "weak" pattern we
rejected for our runner. **Do not regress.** If we add `/session`,
make it require an existing thread (matching our `--thread <ref>`
semantics) and route `/new --name refactor` through `allocateThread()`.

### 3.2 `execSync(cmd)` with string interpolation in `/run`
`/run <command>` does `execSync(cmd, ...)` on raw user input. That's
fine *for the user themselves* (it's their shell), but the same script
uses `execSync("git diff …")` with no arg array in places we *should*
use `execFileSync`. Their `/diff` already does the safer thing — apply
that consistently.

### 3.3 Session attribution by "newest mtime"
`findLatestSession()` in their script grabs the newest `.jsonl` in the
directory after each turn and binds the chat to it. This is exactly
the racy attribution we replaced with the snapshot/diff approach in
`runTurn()`. **Do not regress.**

### 3.4 Nested-directory artefact bug
Their own docs flag this: running `pi` with a relative
`--session-dir` from an unexpected cwd creates
`.github-minimum-intelligence/.github-minimum-intelligence/state/sessions/`.
Our `runTurn()` already passes an absolute repo-root `cwd` to
`Bun.spawn` and a repo-relative `--session-dir`, which avoids the bug.
**Worth a regression test.**

### 3.5 `tmpclaude-*` files at the repo root
Their docs list these as "runtime artefacts". They are leaked tool
scratch files from `pi`. We should add `tmpclaude-*` (and
`tmp*-{pid}` patterns) to `.gitignore` proactively.

### 3.6 Empty `--tools` (default tool set)
`local-agent.ts` and their `local-chat.ts` both invoke `pi` *without*
`--tools`, accepting whatever pi-mono's default is. Our runner
explicitly passes `read,bash,edit,write,grep,find,ls` so the local
behaviour matches `agent.ts` exactly. **Keep ours.**

### 3.7 Old pi-mono version pin
Their `package.json` pins `@mariozechner/pi-coding-agent ^0.52.5`; we
pin `0.75.5` (`@earendil-works/pi-coding-agent`). Do not downgrade.

---

## 4. Suggested next steps (ordered by ROI)

1. **EPIPE handlers + SIGINT/SIGTERM cleanup** (§1.2, §1.6) — ~10
   lines, prevents crashes, no design impact.
2. **Local-LLM support** (§1.1) — biggest functional gap; gate behind
   a `localProvider` flag in `.pi/settings.json` and the `LOCAL_*`
   env vars.
3. **Spinner + `/help` + banner** (§1.4, §1.10, §1.18) — pure UX.
4. **Auto-retry** (§1.5) — turns flaky local-model sessions into
   workable ones; safe even for cloud providers (default off there?).
5. **`/status`, `/model`, `/time`, `/verbose`** (§1.9, §1.15, §1.16) —
   each is small and orthogonal.
6. **REPL session commands** (§1.12) — map onto our closed-world IDs:
   `/list` (alias of CLI `--list`), `/new [--name]`, `/switch <ref>`
   (NOT `/session` — keep verbs distinct from the racy prototype).
7. **Markdown rendering** (§1.3) — accept the three new deps;
   document.
8. **In-REPL `/git`, `/diff`, `/cat`, `/md`** (§1.13) — with
   `safePath()` and `execFileSync` only.
9. **`memory.log` + `/remember` + `/memories`** (§1.11).
10. **`/retry`, `/again`, `/best-of`, `/multiline`** (§1.14).
11. **`tmpclaude-*` to `.gitignore`** (§3.5).
12. **Save last raw JSONL** (§1.19) for post-mortem debugging.

---

## 5. Things in the prototype that confirm decisions we already made

- They reverse-walk JSONL events for `message_end` with assistant role
  and ≥1 text block — exactly our `extractFinalAssistantText`.
- They `mkdirSync` state dirs idempotently before use — same as us.
- They cap retry attempts (1–10) — same defensive bounding we use on
  `MAX_ALLOC_ATTEMPTS`.
- They forbid path traversal in `/cat`/`/md`/`/run` via a repo-root
  check — analogous to our `ALIAS_PATTERN` defensive validation.
- They route `pi` stderr to the parent terminal (`stderr: "inherit"`)
  rather than buffering — same as us, same reason (surface provider
  errors immediately).
