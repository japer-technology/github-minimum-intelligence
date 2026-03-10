# Analysis: How the GitHub Action Invokes pi

This document traces the complete path from a GitHub event (issue opened or comment posted) to the `pi` coding agent receiving a prompt and producing a response. Every step between "user types in a GitHub issue" and "pi begins its first LLM call" is described, including binary resolution, argument construction, session continuity, output extraction, and state persistence.

---

## 1. Trigger: GitHub Webhook Events

The workflow file `.github/workflows/github-minimum-intelligence-agent.yml` listens for two event types:

| Event | Trigger Condition |
|---|---|
| `issues: [opened]` | A new issue is created in the repository |
| `issue_comment: [created]` | A comment is posted on an existing issue |

Bot-authored comments are excluded at the workflow level: the `if` condition rejects any `issue_comment` event where the comment author's login ends with `[bot]`. This prevents the agent from responding to its own replies.

The workflow runs with `contents: write`, `issues: write`, and `actions: write` permissions. Concurrency is scoped per-issue (`github-minimum-intelligence-${{ github.repository }}-issue-${{ github.event.issue.number }}`) with `cancel-in-progress: false`, meaning a second event for the same issue queues behind the first rather than cancelling it.

---

## 2. Pre-Agent Pipeline

Before `agent.ts` executes, the workflow runs five sequential steps that prepare the environment:

| Step | Action | Purpose |
|---|---|---|
| **Authorize** | Inline shell using `gh api` | Checks that the actor has `admin`, `maintain`, or `write` permission on the repository. Adds a 🚀 reaction to the triggering issue or comment as a visual indicator. Writes reaction metadata to `/tmp/reaction-state.json` for the agent's `finally` block. |
| **Reject** | Conditional inline shell | Runs only if Authorize fails. Adds a 👎 reaction to signal rejection. |
| **Checkout** | `actions/checkout@v4` | Clones the repository with `fetch-depth: 0` (full history) at the default branch. Full history is required because the agent performs `git push` with a `git pull --rebase` conflict-resolution loop. |
| **Setup Bun** | `oven-sh/setup-bun@v2` | Installs the Bun runtime, pinned to version `1.2`. |
| **Cache + Install** | `actions/cache@v4` then `bun install --frozen-lockfile` | Restores `.github-minimum-intelligence/node_modules` from cache (keyed on the `bun.lock` hash) and runs `bun install` inside the `.github-minimum-intelligence/` directory to ensure all dependencies — including the `pi` binary — are present. |

After these steps complete, the workflow invokes:

```yaml
run: bun .github-minimum-intelligence/lifecycle/agent.ts
```

This is the single entry point into the agent orchestrator. All environment variables for LLM provider API keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`) and `GITHUB_TOKEN` are injected by the workflow step.

---

## 3. Agent Startup: Event Parsing and Configuration

`agent.ts` begins by reading two data sources:

### 3.1 GitHub Event Payload

The full webhook payload is read from `$GITHUB_EVENT_PATH` (a JSON file written by the Actions runner):

```typescript
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, "utf-8"));
```

From this payload the agent extracts:
- `event.issue.number` — the issue number (present on both `issues` and `issue_comment` payloads).
- `event.issue.title` and `event.issue.body` — used for `issues` events to build the prompt.
- `event.comment.body` — used for `issue_comment` events as the prompt.
- `event.repository.default_branch` — the branch to push changes to (falls back to `"main"`).

For issue body content, the agent uses the webhook payload directly to avoid an API round-trip. If the body is 65 536 characters or longer (the webhook truncation limit), it falls back to a `gh issue view` API call to retrieve the full text.

### 3.2 Pi Settings

Provider and model configuration is read from `.github-minimum-intelligence/.pi/settings.json`:

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-5.3-codex",
  "defaultThinkingLevel": "high"
}
```

These values are passed explicitly as CLI arguments to `pi`. This prevents configuration drift from any host-level `~/.pi/settings.json` that might exist on the runner image. The agent validates that both `defaultProvider` and `defaultModel` are present and throws immediately if either is missing.

The agent also validates that the corresponding API key environment variable is set for the configured provider. If missing, it posts a diagnostic comment to the issue explaining how to configure the secret before throwing.

---

## 4. Session Resolution

Minimum Intelligence maintains per-issue conversation state so that follow-up comments on the same issue resume the prior context rather than starting fresh.

### 4.1 State Layout

| Path | Content |
|---|---|
| `.github-minimum-intelligence/state/issues/<number>.json` | Maps an issue number to its session file path |
| `.github-minimum-intelligence/state/sessions/<timestamp>.jsonl` | The `pi` session transcript (newline-delimited JSON events) |

### 4.2 Resolution Logic

1. The agent checks for a mapping file at `state/issues/<issueNumber>.json`.
2. If the mapping exists and the referenced session file is still on disk, the mode is set to `"resume"` and the session path is recorded.
3. If the mapping is absent or the session file has been deleted, the mode is `"new"` — a fresh session will be created.

This resolution determines whether `--session <path>` is appended to the `pi` arguments (§5).

---

## 5. Pi Binary Resolution and Argument Construction

### 5.1 Binary Location

The `pi` binary is resolved as a path within the project's own `node_modules`:

```typescript
const piBin = resolve(minimumIntelligenceDir, "node_modules", ".bin", "pi");
```

This resolves to `.github-minimum-intelligence/node_modules/.bin/pi`. The binary is installed by `bun install` from the `@mariozechner/pi-coding-agent` package declared in `.github-minimum-intelligence/package.json`.

### 5.2 Argument Assembly

The complete argument array is built as follows:

```typescript
const piArgs = [
  piBin,
  "--mode",       "json",
  "--provider",   configuredProvider,
  "--model",      configuredModel,
  ...(configuredThinking ? ["--thinking", configuredThinking] : []),
  "--session-dir", sessionsDirRelative,
  "-p",           prompt,
];

if (mode === "resume" && sessionPath) {
  piArgs.push("--session", sessionPath);
}
```

| Argument | Value | Purpose |
|---|---|---|
| `--mode json` | Always `"json"` | Tells pi to emit newline-delimited JSON events on stdout instead of human-readable text. Required for programmatic output extraction. |
| `--provider` | From `settings.json` | Selects the LLM provider (e.g., `openai`, `anthropic`, `google`). |
| `--model` | From `settings.json` | Selects the specific model within the provider. |
| `--thinking` | From `settings.json` (optional) | Sets the thinking/reasoning level (e.g., `"high"`). Omitted entirely if `defaultThinkingLevel` is not set. |
| `--session-dir` | `.github-minimum-intelligence/state/sessions` | The directory where pi writes session transcript files. Passed as a repo-root-relative path (not absolute) because the pi CLI expects relative paths. |
| `-p` | The user's prompt text | For `issues` events: `"<title>\n\n<body>"`. For `issue_comment` events: the comment body verbatim. |
| `--session` | Path to existing `.jsonl` file (resume only) | Passes the prior session transcript so pi can recall all earlier exchanges for the issue. Only present when resuming an existing conversation. |

### 5.3 Prompt Construction

The prompt passed to `-p` differs by event type:

| Event | Prompt Content |
|---|---|
| `issues` (opened) | `"${title}\n\n${body}"` — the full issue title and body concatenated |
| `issue_comment` (created) | `event.comment.body` — the comment text verbatim |

---

## 6. Process Spawning and Output Streaming

The agent spawns pi as a child process using Bun's native `Bun.spawn`:

```typescript
const pi = Bun.spawn(piArgs, { stdout: "pipe", stderr: "inherit" });
const tee = Bun.spawn(["tee", "/tmp/agent-raw.jsonl"], { stdin: pi.stdout, stdout: "inherit" });
await tee.exited;
```

This creates a two-process pipeline:

1. **`pi`** — the coding agent. Its stdout is piped (captured programmatically). Its stderr is inherited, meaning error output flows directly into the GitHub Actions log for real-time visibility.
2. **`tee`** — receives pi's stdout and writes it to both `/tmp/agent-raw.jsonl` (a temporary file for post-processing) and the Actions log (stdout: inherit).

The `await tee.exited` call blocks until pi finishes writing and tee has flushed all output. The agent then checks pi's exit code; a non-zero exit causes an immediate throw with a message directing the user to the workflow logs.

---

## 7. Output Extraction

Pi writes newline-delimited JSON events to stdout. Each event has a `type` field. The agent needs to extract the final assistant text reply from this stream.

The extraction pipeline:

```typescript
const tac = Bun.spawn(["tac", "/tmp/agent-raw.jsonl"], { stdout: "pipe" });
const jq  = Bun.spawn(
  ["jq", "-r", "-s",
   '[ .[] | select(.type == "message_end" and .message.role == "assistant") '
   + '| select((.message.content // []) | map(select(.type == "text")) | length > 0) ] '
   + '| .[0].message.content[] | select(.type == "text") | .text'],
  { stdin: tac.stdout, stdout: "pipe" }
);
const agentText = await new Response(jq.stdout).text();
```

| Tool | Role |
|---|---|
| `tac` | Reverses the JSONL file so the most recent events appear first. |
| `jq` | Parses the reversed JSON array, finds the first (most recent) `message_end` event where `role == "assistant"` and the content contains at least one `text` block, then extracts the text. |

The `jq` filter handles edge cases where the final event may have empty content (e.g., a 400 API error after a successful tool call) by falling back to an earlier assistant message that contains text.

---

## 8. Post-Processing

After pi completes and the reply text is extracted, the agent performs four operations:

### 8.1 Session Mapping Persistence

The agent identifies the newest `.jsonl` file in the sessions directory (the transcript just written or extended by pi) and writes (or overwrites) the issue-to-session mapping:

```typescript
writeFileSync(mappingFile, JSON.stringify({
  issueNumber,
  sessionPath: latestSession,
  updatedAt: new Date().toISOString(),
}, null, 2) + "\n");
```

This ensures the next run for the same issue can locate and resume the correct session.

### 8.2 Commit and Push

All changes — session transcripts, mapping files, and any repository edits made by the pi agent — are staged, committed, and pushed:

1. `git add -A` — stages everything.
2. `git diff --cached --quiet` — checks for staged changes.
3. `git commit -m "minimum-intelligence: work on issue #<N>"` — commits if dirty.
4. `git push origin HEAD:<defaultBranch>` — pushes to the default branch.

If the push fails (e.g., another agent run pushed first), the agent retries up to 10 times with increasing backoff delays (1 s, 2 s, 3 s, 5 s, 7 s, 8 s, 10 s, 12 s, 12 s, 15 s), running `git pull --rebase -X theirs` between each attempt to auto-resolve conflicts in favour of the remote.

### 8.3 Comment Posting

The extracted reply text is posted as a comment on the originating issue via the GitHub CLI:

```typescript
await gh("issue", "comment", String(issueNumber), "--body", commentBody);
```

The reply is capped at 60 000 characters (below GitHub's ~65 535 character limit for issue comments) to prevent API rejections. If pi produced no text output, a fallback message directs the user to check the repository for file changes and the workflow logs.

### 8.4 Outcome Reaction

A `finally` block runs regardless of success or failure. It reads the reaction state written by the Authorize step (`/tmp/reaction-state.json`) and adds:
- 👍 on success, or
- 👎 on error.

The 🚀 reaction from the Authorize step is left in place in both cases.

---

## 9. Complete Invocation Sequence

The following table summarizes every step from event to response, in execution order:

| # | Component | Action |
|---|---|---|
| 1 | GitHub | Receives webhook, provisions runner, starts workflow |
| 2 | Workflow: Authorize | Checks actor permissions, adds 🚀 reaction, writes `/tmp/reaction-state.json` |
| 3 | Workflow: Checkout | Clones repository with full history |
| 4 | Workflow: Setup Bun | Installs Bun 1.2 runtime |
| 5 | Workflow: Cache + Install | Restores `node_modules` cache, runs `bun install --frozen-lockfile` |
| 6 | Workflow: Run | Executes `bun .github-minimum-intelligence/lifecycle/agent.ts` |
| 7 | agent.ts | Parses event payload, reads `.pi/settings.json`, validates API key |
| 8 | agent.ts | Resolves session (new or resume) from `state/issues/<N>.json` |
| 9 | agent.ts | Builds prompt from issue title+body or comment body |
| 10 | agent.ts | Resolves `pi` binary at `node_modules/.bin/pi` |
| 11 | agent.ts | Constructs argument array: `--mode json --provider <P> --model <M> [--thinking <T>] --session-dir <D> -p <prompt> [--session <S>]` |
| 12 | agent.ts | Spawns `pi` via `Bun.spawn`, pipes stdout through `tee` to `/tmp/agent-raw.jsonl` |
| 13 | pi | Executes LLM calls, streams JSONL events to stdout |
| 14 | agent.ts | Checks pi exit code; throws on non-zero |
| 15 | agent.ts | Extracts final assistant text via `tac` + `jq` pipeline |
| 16 | agent.ts | Writes issue → session mapping to `state/issues/<N>.json` |
| 17 | agent.ts | Commits and pushes all changes (retry loop up to 10 attempts) |
| 18 | agent.ts | Posts extracted text as issue comment (capped at 60 000 chars) |
| 19 | agent.ts (finally) | Adds 👍 or 👎 outcome reaction |

---

## 10. Summary

The `pi` coding agent is invoked through a single, deterministic pipeline: a GitHub webhook triggers a workflow, the workflow prepares the runtime environment and executes `agent.ts`, and `agent.ts` spawns the `pi` binary with explicitly constructed arguments derived from committed configuration and the event payload.

The key design decisions are:

- **Explicit configuration passing.** Provider, model, and thinking level are read from `.pi/settings.json` and passed as CLI arguments, preventing host-level configuration drift.
- **Session continuity.** Per-issue session files enable multi-turn conversations across separate workflow runs without external state stores.
- **JSON mode with post-processing.** Pi runs in `--mode json`, and the agent extracts the final reply using `tac` + `jq` rather than parsing the stream in TypeScript, keeping the orchestration layer minimal.
- **Piped output via tee.** The `pi` → `tee` pipeline provides simultaneous real-time logging (visible in the Actions run) and a persisted copy for extraction.
- **Self-contained dependency.** The pi binary is installed from `@mariozechner/pi-coding-agent` via `bun install` and resolved from the project's own `node_modules`, requiring no global tooling on the runner beyond Bun itself.
