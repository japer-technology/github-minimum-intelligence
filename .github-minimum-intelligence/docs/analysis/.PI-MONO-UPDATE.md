# pi-mono Update: v0.57.1 → v0.65.1

## 1. Overview

This document outlines the full scope of changes required to update GitHub Minimum Intelligence's core dependency — `@mariozechner/pi-coding-agent` — from **v0.57.1** to **v0.65.1**. The update spans **17 releases** (v0.58.0 through v0.65.1) and includes 5 releases with breaking changes, numerous bug fixes directly impacting GMI's non-interactive `--mode json` usage, and new features that unlock significant capability improvements.

| Item | Detail |
|------|--------|
| **Current version** | `0.57.1` (pinned in `.github-minimum-intelligence/package.json`) |
| **Target version** | `0.65.1` |
| **Releases spanned** | 17 (v0.58.0 – v0.65.1) |
| **Breaking change releases** | v0.59.0, v0.62.0, v0.63.0, v0.64.0, v0.65.0 |
| **Source** | [github.com/badlogic/pi-mono/releases](https://github.com/badlogic/pi-mono/releases) |

---

## 2. Release-by-Release Changelog Summary

### v0.58.0

- **Extension tool calls now execute in parallel** — previously sequential. This directly improves agent run time when multiple tools are called in a single turn.
- Claude Opus 4.6, Sonnet 4.6, and Bedrock models now have **1M token context windows** (up from 200K).
- `GOOGLE_CLOUD_API_KEY` environment variable support for the `google-vertex` provider.
- Extensions can supply deterministic session IDs via `newSession()`.
- Fix: default system prompt uses date-only (not time), improving prompt cacheability across reloads and resumed sessions.
- Fix: retry regex now matches `server_error` and `internal_error` from providers, improving automatic retry coverage.
- Fix: tool result images now sent correctly in `function_call_output` items for OpenAI Responses API.
- Fix: startup crash when downloading `fd`/`ripgrep` on first run (timeout increased from 10s to 120s).

### v0.58.1

- Added `pi uninstall` alias for `pi install --uninstall`.
- Fix: OpenAI Codex websocket protocol and SSE stream termination.
- Fix: extension `session_start` hook firing before TUI was ready — **directly relevant**: GMI's `github-context.ts` extension uses registration at startup.
- Fix: Bedrock prompt caching enabled for non-Claude models causing API errors.
- Fix: Qwen models via OpenAI-compatible providers (new `qwen-chat-template` compat mode).
- Fix: `models.json` provider compat flags not being honored for custom model definitions.
- Fix: skill discovery recursion past skill root directories.
- Fix: startup crash fix for `fd`/`ripgrep` download (pipeline fix).
- Fix: npm package installs tied to active Node version now configurable via `npmCommand`.

### v0.58.2

- Fix: fuzzy `edit` matching now normalizes Unicode compatibility variants — reduces false "oldText not found" failures.
- Fix: `/model <ref>` exact matching for model IDs containing `/`.
- Fix: Anthropic OAuth manual login and token refresh.

### v0.58.3 – v0.58.4

- v0.58.3: Maintenance release.
- v0.58.4: Fix: steering messages now wait until the current assistant message's tool-call batch fully finishes instead of skipping pending tool calls. **Important for GMI**: prevents premature tool-call termination during complex multi-tool operations.

### v0.59.0

- **Faster startup** via lazy-loading `@mariozechner/pi-ai` provider SDKs on first use instead of import time — directly reduces GitHub Actions wall time.
- Better provider retry behavior when providers return error messages as responses.
- Better terminal integration via OSC 133 markers.
- **⚠️ Breaking Change**: Custom tool system prompt behavior changed — extension tools are included in the `Available tools` section **only** when they provide `promptSnippet`. Omitting `promptSnippet` now leaves the tool out of that section instead of falling back to `description`.
- Fix: provider retry handling treats error messages as retryable failures.
- Fix: Claude 4.6 context window overrides in bundled model metadata.

### v0.60.0

- **Session forking** via `--fork <path|id>` CLI flag.
- Extensions and SDK callers can reuse pi's built-in local bash backend via `createLocalBashOperations()`.
- **⚠️ Breaking Change**: Startup no longer auto-updates unpinned npm/git packages. Use `pi update` explicitly.
- Fix: active model selection refreshes immediately after provider registrations.
- Fix: print mode merges piped stdin into initial prompt when both are provided.
- Fix: OpenAI Responses replay normalizes oversized resumed tool call IDs.

### v0.61.0

- Namespaced keybinding IDs and unified keybinding manager.
- JSONL session export and import via `/export <path.jsonl>` and `/import <path.jsonl>`.
- **⚠️ Breaking Change**: Interactive keybinding IDs are now namespaced (auto-migrated). Extension author migration required for keybinding references.
- Fix: **concurrent `edit` and `write` mutations targeting the same file now run serially** — prevents interleaved writes from overwriting each other. **Critical for GMI**: the agent frequently does edit+write in rapid succession.
- Fix: RPC mode redirects unexpected stdout writes to stderr so JSONL responses remain parseable.
- Fix: auto-retry with tool-using retry responses waits for full retry loop.
- Fix: CLI startup suppresses process warnings from leaking into print/RPC output.
- Fix: Windows bash execution hanging for detached descendants.

### v0.61.1

- Added `ToolCallEventResult` type exports for typed `tool_call` handler return values.
- Updated default models for `zai`, `cerebras`, `minimax`, and `minimax-cn`.
- Fix: `createAgentSession({ agentDir })` derives default session path from provided `agentDir`.

### v0.62.0

- **Built-in tools as extensible ToolDefinitions** — extension authors can now override rendering of built-in read/write/edit/bash/grep/find/ls tools.
- **Unified source provenance via `sourceInfo`** — all resources, commands, tools, skills, and prompt templates carry structured `sourceInfo`.
- AWS Bedrock cost allocation tagging.
- **⚠️ Breaking Changes**:
  - `ToolDefinition.renderCall` and `renderResult` semantics changed.
  - Slash command provenance uses `sourceInfo` instead of `location`/`path`.
  - Removed legacy `source` fields from `Skill` and `PromptTemplate`.
  - Removed `ResourceLoader.getPathMetadata()`.
  - Removed `extensionPath` from `RegisteredCommand` and `RegisteredTool`.
- Fix: extension command name conflicts now get numeric suffixes.
- Fix: **print and JSON mode takes over stdout during startup** — keeps package-manager chatter off protocol stdout. **Important for GMI**: cleaner JSONL output parsing.
- Fix: `pi update` for git packages skips destructive steps when already up-to-date.
- Fix: Anthropic thinking disable handling sends correct payload.

### v0.63.0

- **`sessionDir` setting in `settings.json`** — session storage can be configured without `--session-dir` CLI flag. **Directly useful for GMI**: can move session-dir config from CLI to settings.json.
- **Edit tool multi-edit support** — one call can update multiple disjoint regions in the same file.
- **⚠️ Breaking Changes**:
  - `ModelRegistry.getApiKey(model)` replaced by `getApiKeyAndHeaders(model)` (SDK only — does not affect CLI usage).
  - Removed deprecated `minimax` and `minimax-cn` direct model IDs.
- Fix: **file mutation queue ordering** — concurrent edit/write operations stay serialized in request order.
- Fix: `models.json` shell-command auth and headers resolve at request time (not cached).
- Fix: Google and Vertex cost calculation fixes (cached token double-counting).
- Fix: added missing `ajv` direct dependency — previously relied on transitive install.
- Fix: **print and JSON modes emit `session_shutdown` before exit** — extensions can release long-lived resources, non-interactive runs terminate cleanly. **Important for GMI**.
- Fix: RPC `get_session_stats` exposes `contextUsage`.
- Fix: GitHub Copilot OpenAI Responses fixes for `gpt-5-mini`.
- Fix: `@` autocomplete debouncing and stale content fixes.

### v0.63.1

- Added `gemini-3.1-pro-preview-customtools` model for `google-vertex`.
- Fix: **repeated compactions dropping messages** — re-summarizes from previous kept boundary. **Critical for GMI**: long multi-turn issue conversations depend on compaction correctness.
- Fix: interactive compaction UI updates rebuilt through unified events.
- Fix: **skill discovery stops recursing once a directory contains `SKILL.md`** — affects GMI's `.pi/skills/memory` and `.pi/skills/skill-creator`.
- Fix: edit tool diff rendering for multi-edit operations.
- Fix: auto-compaction overflow recovery for Ollama models.
- Fix: built-in tool overrides honor custom renderers.

### v0.63.2

- **`ctx.signal` for cancellation** in extension handlers — can forward cancellation into nested model calls, `fetch()`, and other abort-aware work.
- Built-in `edit` tool input now uses `edits[]` as the **only** replacement shape — reduces invalid tool calls caused by mixed schemas.
- Fix: large multi-edit TUI rendering defers to settled result.

### v0.64.0

- **`prepareArguments` hook on ToolDefinition** — lets extensions normalize or migrate raw model arguments before schema validation. The built-in `edit` tool uses this to support old single-edit schema sessions.
- **`ctx.ui.setHiddenThinkingLabel()`** for extensions to customize collapsed thinking block labels.
- **⚠️ Breaking Change**: `ModelRegistry` no longer has a public constructor — use `ModelRegistry.create()` or `ModelRegistry.inMemory()` (SDK only — does not affect CLI usage).
- Fix: extension-queued user messages refresh the pending-message list.
- Fix: TUI cell size response handling.
- Fix: Kitty keyboard protocol numpad key normalization.

### v0.65.0

- **Session runtime API**: `createAgentSessionRuntime()` and `AgentSessionRuntime` — closure-based runtime that recreates cwd-bound services on every session switch. Startup, `/new`, `/resume`, `/fork`, and import all use the same creation path.
- **`defineTool()` helper** — create standalone custom tool definitions with full TypeScript parameter type inference. **Useful for GMI's github-context.ts extension**.
- **Label timestamps in `/tree`** — toggle with `Shift+T`.
- **Unified diagnostics model** — arg parsing, service creation, session option resolution, and resource loading return structured diagnostics (`info`/`warning`/`error`) instead of logging or exiting.
- **⚠️ Breaking Changes**:
  - **Removed `session_switch` and `session_fork` extension events** → use `session_start` with `event.reason` (`"startup" | "reload" | "new" | "resume" | "fork"`).
  - **Removed session-replacement methods from `AgentSession`** → use `AgentSessionRuntime`.
  - **Removed `session_directory` from extension and settings APIs**.
  - **Unknown single-dash CLI flags (e.g., `-s`) now produce errors** instead of being silently ignored.
- Fix: startup resource loading reuses initial `ResourceLoader` — extensions are not loaded twice.
- Fix: retry settlement waits for full retry cycle.
- Fix: Bedrock throttling errors no longer misidentified as context overflow.
- Fix: theme `export` colors resolve theme variables correctly.

### v0.65.1

- Fix: **bash output truncation** — always persist full output to temp file, preventing data loss when output exceeds 2000 lines. **Critical for GMI**: agent frequently runs commands with large output in GitHub Actions.
- Fix: RpcClient forwards subprocess stderr to parent process in real-time.
- Fix: theme file watcher handles async `fs.watch` error events.
- Fix: stored session cwd handling — resuming a session whose original directory no longer exists now fails with a clear error in non-interactive mode.
- Fix: **resource collision precedence** — project and user skills, prompt templates, and themes override package resources consistently. **Important for GMI**: ensures `.pi/skills/` and `.pi/prompts/` take precedence.
- Fix: OpenAI-compatible completions streaming usage accounting.
- Fix: CLI extension paths passed through to package manager.
- Fix: **piped stdin runs with `--mode json` preserve JSONL output** instead of falling back to plain text. **Relevant for GMI's JSON-mode usage**.
- Fix: interactive command docs updated (removed `/exit` reference).

---

## 3. Breaking Changes Impact Assessment for GMI

### 3.1 IMPACTS GMI — `promptSnippet` Required for Custom Tools (v0.59.0)

**What changed**: Extension tools without `promptSnippet` are no longer included in the `Available tools` system prompt section.

**Impact on GMI**: The `github-context.ts` extension registers a tool with `name`, `label`, `description`, and `parameters` — but no `promptSnippet`. After this update, the LLM may not be aware that the `github_repo_context` tool exists unless `promptSnippet` is added.

**Required change**: Add a `promptSnippet` field to the tool registration in `.pi/extensions/github-context.ts`:

```typescript
pi.registerTool({
  name: "github_repo_context",
  label: "GitHub Repository Context",
  description: "Returns structured metadata about the current GitHub repository...",
  promptSnippet: "Use github_repo_context to get repository metadata (name, description, default branch, visibility, topics, language) instead of constructing gh CLI commands.",
  parameters: Type.Object({}),
  async execute(_toolCallId, _params, _signal) { ... }
});
```

### 3.2 IMPACTS GMI — `sourceInfo` Replaces Legacy Fields (v0.62.0)

**What changed**: `Skill.source`, `PromptTemplate.source`, `RegisteredCommand.extensionPath`, and `RegisteredTool.extensionPath` removed in favor of `sourceInfo`.

**Impact on GMI**: GMI does not programmatically access skill/tool provenance fields at runtime. The extension registers a tool but never reads `.source` or `.extensionPath` from other resources. **No code changes required**, but the internal representation is different. Any future code that inspects tool/skill metadata must use the new `sourceInfo` structure.

### 3.3 DOES NOT IMPACT GMI — `getApiKey` → `getApiKeyAndHeaders` (v0.63.0)

**What changed**: SDK method `ModelRegistry.getApiKey(model)` replaced by `getApiKeyAndHeaders(model)`.

**Impact on GMI**: GMI uses the CLI (`pi` binary), not the SDK. The agent spawns `pi --mode json` as a subprocess. **No changes required**.

### 3.4 DOES NOT IMPACT GMI — `ModelRegistry` Constructor Removed (v0.64.0)

**What changed**: `ModelRegistry` no longer has a public constructor.

**Impact on GMI**: CLI-only usage. **No changes required**.

### 3.5 DOES NOT IMPACT GMI — Session Events Removed (v0.65.0)

**What changed**: `session_switch`, `session_fork`, and `session_directory` events removed.

**Impact on GMI**: The `github-context.ts` extension does not use any of these events. It only calls `pi.registerTool()`. **No changes required**.

### 3.6 VERIFY — Unknown Single-Dash Flags Error (v0.65.0)

**What changed**: Unknown single-dash CLI flags (e.g., `-s`) now produce errors instead of being silently ignored.

**Impact on GMI**: The agent invokes pi with these flags:
```
pi --mode json --tools read,bash,edit,write,grep,find,ls --provider <P> --model <M> [--thinking <T>] --session-dir <D> -p <prompt> [--session <S>]
```

The `-p` flag is the standard prompt flag and is a known flag. All other flags use double-dash (`--mode`, `--tools`, etc.). **No changes required** — but this should be verified during testing.

### 3.7 DOES NOT IMPACT GMI — Package Auto-Update Removed (v0.60.0)

**What changed**: Startup no longer auto-updates unpinned packages.

**Impact on GMI**: GMI pins `@mariozechner/pi-coding-agent` to an exact version in `package.json`. `bun install --frozen-lockfile` is used in the workflow. **No changes required**.

### 3.8 DOES NOT IMPACT GMI — Keybinding Namespacing (v0.61.0)

**What changed**: Interactive keybinding IDs are now namespaced.

**Impact on GMI**: GMI runs in non-interactive `--mode json`. Keybindings are irrelevant. **No changes required**.

### 3.9 DOES NOT IMPACT GMI — Deprecated MiniMax Model IDs Removed (v0.63.0)

**What changed**: Direct `minimax` and `minimax-cn` model IDs removed.

**Impact on GMI**: GMI defaults to `openai` / `gpt-5.4`. MiniMax is not used. **No changes required**.

---

## 4. Bug Fixes Most Relevant to GMI

These fixes directly address issues that GMI has experienced or is susceptible to in its `--mode json` / GitHub Actions usage:

| Fix | Version | Impact |
|-----|---------|--------|
| **Bash output truncation** — full output preserved to temp file | v0.65.1 | Prevents silent data loss in commands with >2000 lines of output |
| **Concurrent edit/write serialization** — same-file mutations run serially | v0.61.0 | Prevents interleaved writes from overwriting each other |
| **File mutation queue ordering** — operations stay in request order | v0.63.0 | Ensures deterministic file modification behavior |
| **Repeated compaction fix** — messages no longer dropped | v0.63.1 | Critical for long multi-turn issue conversations |
| **JSON/print mode stdout isolation** — startup chatter removed from output | v0.62.0 | Cleaner JSONL parsing in agent.ts |
| **Session shutdown in JSON/print mode** — `session_shutdown` emitted on exit | v0.63.0 | Extensions can clean up; non-interactive runs terminate cleanly |
| **Piped stdin JSONL preservation** — `--mode json` output stays JSONL | v0.65.1 | Ensures `tac`/`jq` pipeline works correctly |
| **Provider retry improvements** — error messages treated as retryable | v0.59.0 | Reduces hard failures in CI environment |
| **Retry settlement** — waits for full retry cycle | v0.65.0 | Prevents stale state after transient errors |
| **Resource collision precedence** — project resources override packages | v0.65.1 | GMI's `.pi/` skills/prompts take priority |
| **Skill discovery recursion fix** — stops at `SKILL.md` | v0.63.1 | Correct discovery of GMI's custom skills |
| **Steering messages wait for tool completion** | v0.58.4 | Prevents premature tool-call termination |
| **Extension session_start timing** — fires after TUI ready | v0.58.1 | Ensures github-context.ts extension loads reliably |
| **Bedrock throttling → compaction misidentification** | v0.65.0 | Prevents unnecessary compaction on rate-limit errors |
| **Added missing `ajv` dependency** | v0.63.0 | Fixes standalone installs without transitive resolution |
| **Lazy provider loading** — faster startup | v0.59.0 | Reduces GitHub Actions wall time |

---

## 5. New Features Beneficial to GMI

### 5.1 Parallel Tool Execution (v0.58.0)

Extension tool calls now execute in parallel by default. When the agent calls multiple tools in a single turn (e.g., `read` + `bash` + `grep`), they run concurrently rather than sequentially. This directly reduces agent run time and GitHub Actions billing.

### 5.2 Lazy Provider Loading (v0.59.0)

Provider SDKs are loaded on first use, not at import time. Since GMI typically uses only one provider per run (e.g., `openai`), unused provider SDKs (Anthropic, Bedrock, Google, etc.) are never loaded. This reduces startup time.

### 5.3 `sessionDir` Setting (v0.63.0)

Session storage can now be configured in `settings.json` instead of via the `--session-dir` CLI flag:

```json
{
  "sessionDir": "../../state/sessions"
}
```

**Opportunity**: GMI currently passes `--session-dir` in `agent.ts`. This could be moved to `settings.json` for cleaner separation of configuration from invocation. However, the relative path is computed at runtime based on the cwd, so this change requires careful evaluation of path resolution semantics.

### 5.4 Multi-Edit Tool (v0.63.0)

The `edit` tool now supports updating multiple disjoint regions in a single call. This reduces tool-call count and improves agent efficiency for multi-point file edits.

### 5.5 `edits[]` as Sole Edit Schema (v0.63.2)

The edit tool now uses `edits[]` as the only replacement shape, eliminating the mixed single/multi-edit schema that caused repeated invalid tool calls and retries. This improves reliability.

### 5.6 `defineTool()` Helper (v0.65.0)

A new `defineTool()` helper creates standalone custom tool definitions with full TypeScript parameter type inference. GMI's `github-context.ts` extension could benefit from migrating to this API for better type safety:

```typescript
import { defineTool } from "@mariozechner/pi-coding-agent";

export default defineTool({
  name: "github_repo_context",
  // ... full type inference for parameters
});
```

### 5.7 `ctx.signal` for Extension Cancellation (v0.63.2)

Extension handlers can now use `ctx.signal` to forward cancellation into nested model calls, `fetch()`, and other abort-aware work. GMI's `github-context.ts` extension could use this for the `execSync` call to `gh`.

### 5.8 `prepareArguments` Hook (v0.64.0)

Extensions can attach a `prepareArguments` hook to tool definitions to normalize or migrate raw model arguments before schema validation. This provides backward compatibility when tool schemas evolve.

### 5.9 Unified Diagnostics (v0.65.0)

Arg parsing, service creation, and resource loading now return structured diagnostics (`info`/`warning`/`error`) instead of logging or exiting. The application layer decides presentation and exit behavior. This improves error reporting in non-interactive mode.

### 5.10 1M Token Context Window (v0.58.0)

Claude Opus 4.6, Sonnet 4.6, and related Bedrock models now use a 1M token context window. If GMI users configure Claude as their provider, they benefit from 5× more context capacity.

---

## 6. Required Code Changes

### 6.1 `package.json` — Version Bump

**File**: `.github-minimum-intelligence/package.json`

```json
{
  "dependencies": {
    "@mariozechner/pi-coding-agent": "0.65.1"
  }
}
```

### 6.2 `bun.lock` — Regenerate

**Action**: Run `cd .github-minimum-intelligence && bun install` to regenerate the lockfile with the new version and its updated transitive dependencies. The lock file will change substantially — the `@mariozechner/pi-ai`, `@mariozechner/pi-agent-core`, `@mariozechner/pi-tui`, and `@mariozechner/pi-coding-agent` entries will all update to 0.65.1, and transitive dependency versions may shift.

### 6.3 `github-context.ts` — Add `promptSnippet`

**File**: `.github-minimum-intelligence/.pi/extensions/github-context.ts`

**Reason**: v0.59.0 breaking change requires `promptSnippet` for custom tools to appear in the system prompt.

Add `promptSnippet` to the `registerTool()` call:

```typescript
pi.registerTool({
  name: "github_repo_context",
  label: "GitHub Repository Context",
  description:
    "Returns structured metadata about the current GitHub repository: " +
    "name, description, default branch, visibility, topics, and language. " +
    "Use this when you need to understand the repository you are working in.",
  promptSnippet:
    "Use the github_repo_context tool to retrieve repository metadata (name, description, " +
    "default branch, visibility, topics, primary language) instead of constructing gh CLI commands.",
  parameters: Type.Object({}),
  async execute(_toolCallId, _params, _signal) {
    // ... existing implementation unchanged
  },
});
```

### 6.4 CLI Flags Verification

**File**: `.github-minimum-intelligence/lifecycle/agent.ts` (line ~310-329)

**Action**: Verify all CLI flags used are valid in v0.65.1. Current flags:

| Flag | Status |
|------|--------|
| `--mode json` | ✅ Valid |
| `--tools read,bash,edit,write,grep,find,ls` | ✅ Valid |
| `--provider <P>` | ✅ Valid |
| `--model <M>` | ✅ Valid |
| `--thinking <T>` | ✅ Valid |
| `--session-dir <D>` | ✅ Valid |
| `-p <prompt>` | ✅ Valid (short form of `--prompt`) |
| `--session <S>` | ✅ Valid |

All flags are valid. No changes to `agent.ts` CLI invocation required.

### 6.5 Optional — Migrate `--session-dir` to `settings.json`

**Files**: `.github-minimum-intelligence/.pi/settings.json` and `.github-minimum-intelligence/lifecycle/agent.ts`

The new `sessionDir` setting (v0.63.0) allows session directory configuration in settings.json. However, GMI computes the session directory path at runtime relative to the working directory, so this migration requires evaluating whether `sessionDir` in settings.json resolves relative to the `.pi/` directory or the cwd. **Recommend deferring** this change to a separate PR after verifying path resolution semantics.

---

## 7. Documentation Updates Required

### 7.1 `PACKAGES.md`

**File**: `.github-minimum-intelligence/PACKAGES.md` (line 12)

Update version from `0.57.1` to `0.65.1`:
```
| [@mariozechner/pi-coding-agent](https://github.com/badlogic/pi-mono) | 0.65.1 | ... |
```

### 7.2 `security-assessment.md`

**File**: `.github-minimum-intelligence/docs/security-assessment.md` (lines 112, 368, 389)

Update all three references from `0.57.1` to `0.65.1`.

### 7.3 `public-fabric/status.json`

**File**: `.github-minimum-intelligence/public-fabric/status.json` (line 336)

Update version from `"0.57.1"` to `"0.65.1"`.

### 7.4 `pi-mono-feature-utilization.md`

**File**: `.github-minimum-intelligence/docs/analysis/pi-mono-feature-utilization.md` (line 13)

Update version reference from `v0.57.1` to `v0.65.1`. This document should also be updated to reflect newly available features (multi-edit, defineTool, sessionDir setting, ctx.signal, unified diagnostics), though a full re-audit is recommended as a separate effort.

### 7.5 `description-architecture-study.md`

**File**: `.github-minimum-intelligence/docs/analysis/description-architecture-study.md` (line 21)

Update version reference from `0.57.1` to `0.65.1`.

### 7.6 `description-github-as-infrastructure.md`

**File**: `.github-minimum-intelligence/docs/analysis/description-github-as-infrastructure.md` (line 27)

Update version reference from `0.57.1` to `0.65.1`.

### 7.7 `implementation-plan.md`

**File**: `.github-minimum-intelligence/docs/analysis/pi-mono/implementation-plan.md` (lines 3, 182)

Update version references from `v0.57.1` to `v0.65.1`.

---

## 8. Testing Plan

### 8.1 Pre-Update Verification

1. Run `cd .github-minimum-intelligence && bun install --frozen-lockfile` — confirm current lock is valid.
2. Run `bun run lifecycle/agent.ts` in a test context — verify current behavior baseline.

### 8.2 Update Steps

1. Update `package.json` to `"0.65.1"`.
2. Run `cd .github-minimum-intelligence && bun install` to regenerate `bun.lock`.
3. Apply the `promptSnippet` change to `github-context.ts`.
4. Update all documentation version references.

### 8.3 Post-Update Verification

1. Verify `pi --version` outputs `0.65.1` from `node_modules/.bin/pi`.
2. Run `pi --mode json --tools read,bash,edit,write,grep,find,ls --provider openai --model gpt-5.4 -p "What files are in the current directory?"` — confirm basic operation.
3. Test with `--session` and `--session-dir` flags — verify session continuity.
4. Trigger a real issue comment in a test repository — verify end-to-end workflow.
5. Verify the `github_repo_context` tool appears in the system prompt (check JSONL output for the tool in the system message).
6. Test a multi-turn conversation to verify compaction behavior.
7. Test a long output command (`find / -type f 2>/dev/null | head -3000`) to verify bash output truncation fix.

---

## 9. Risk Assessment

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| `promptSnippet` omission causes tool invisibility | **High** if not addressed | **High** — tool becomes unusable | Add `promptSnippet` to `github-context.ts` (§6.3) |
| Transitive dependency conflicts | Low | Medium | `bun install` will surface any conflicts; pin versions if needed |
| JSONL output format changes | Very Low | High | The `message_end` event structure is stable; verify `jq` filter works against v0.65.1 JSONL output |
| Unknown flag rejection | Very Low | High | All current flags verified valid (§6.4); test CLI invocation post-update |
| Session file format changes | Very Low | Medium | Session JSONL schema has remained backward-compatible; v0.64.0 added `prepareArguments` for edit tool schema migration |
| `edit` tool schema change (`edits[]` only) | Low | Low | The LLM generates tool calls based on current system prompt; the new `edits[]` schema is simpler and less error-prone |
| Provider SDK API changes (transitive) | Low | Medium | GMI uses CLI, not SDK; transitive SDK updates are internal to pi |

---

## 10. Dependency Version Changes (Notable Transitives)

Based on the release notes, the following transitive dependency versions have likely changed:

| Package | From (approx.) | To (approx.) | Notes |
|---------|----------------|--------------|-------|
| `@anthropic-ai/sdk` | ^0.73.0 | Latest compatible | Anthropic API client |
| `@aws-sdk/client-bedrock-runtime` | ^3.983.0 | Latest compatible | AWS Bedrock client |
| `openai` | 6.26.0 | Latest compatible | OpenAI API client |
| `@google/genai` | ^1.40.0 | Latest compatible | Google Generative AI SDK |
| `ajv` | (transitive) | ^8.17.1 (direct) | Now a direct dependency (v0.63.0 fix) |
| `undici` | ^7.19.1 | Latest compatible | HTTP client |

The exact versions will be resolved by `bun install` and recorded in `bun.lock`.

---

## 11. Rollback Plan

If the update causes issues:

1. Revert `package.json` to `"0.57.1"`.
2. Restore the original `bun.lock` from git history.
3. Revert the `promptSnippet` addition to `github-context.ts` (harmless to keep but cleaner to revert).
4. Revert documentation version references.
5. Commit and push.

The update is entirely contained within `.github-minimum-intelligence/` and does not affect repository structure or workflow logic.

---

## 12. Recommended Follow-Up Work

After the version bump is merged and verified:

1. **Re-audit pi-mono feature utilization** — Update `pi-mono-feature-utilization.md` to cover new features available in v0.65.1 (multi-edit, `defineTool()`, `ctx.signal`, `sessionDir`, unified diagnostics, `prepareArguments`).
2. **Evaluate `defineTool()` migration** — Consider refactoring `github-context.ts` to use `defineTool()` for better TypeScript type inference.
3. **Evaluate `sessionDir` migration** — Consider moving `--session-dir` from CLI flags to `settings.json` once path resolution semantics are verified.
4. **Evaluate `ctx.signal` adoption** — The extension's `execSync` call to `gh` could be converted to an async call with signal forwarding for better cancellation support.
5. **Evaluate multi-edit benefits** — The agent now has access to multi-region edits, which may improve code modification efficiency.
6. **Monitor for v0.65.2+** — v0.65.2 has already been released; review its changelog for additional relevant fixes.

---

## 13. Summary

The update from v0.57.1 to v0.65.1 brings **17 releases** of improvements. The most impactful changes for GMI are:

- **Parallel tool execution** (v0.58.0) — faster agent runs
- **Concurrent file mutation serialization** (v0.61.0) — prevents data corruption
- **Compaction correctness fixes** (v0.63.1) — reliable long conversations
- **Bash output truncation fix** (v0.65.1) — no more silent data loss
- **JSONL output stability** (v0.62.0, v0.65.1) — cleaner output parsing
- **Lazy provider loading** (v0.59.0) — faster startup
- **Multi-edit tool** (v0.63.0) — more efficient code modifications
- **Edit schema simplification** (v0.63.2) — fewer invalid tool calls

The only **mandatory code change** beyond the version bump is adding `promptSnippet` to the `github-context.ts` extension (v0.59.0 breaking change). All other breaking changes either don't affect GMI's CLI-based usage or have been verified as non-impacting.

The update is low-risk with high reward — it addresses several known reliability issues in the non-interactive JSON-mode pipeline that GMI depends on.
