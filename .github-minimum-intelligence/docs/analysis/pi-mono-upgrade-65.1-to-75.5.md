# pi-mono Update: v0.65.1 → v0.75.5 (Earendil Works Migration)

## 1. Overview

This document outlines the full scope of changes required to update GitHub Minimum Intelligence's core dependency — `@mariozechner/pi-coding-agent` — from **v0.65.1** to **v0.75.5**. Beyond the usual version bump, this update also covers the project's relocation to a **new GitHub owner and npm scope**: `badlogic/pi-mono` → `earendil-works/pi`, with packages re-published under `@earendil-works/*`. The release span covers **25 releases** (v0.67.4 through v0.75.5) including 6 releases with breaking changes, supply-chain hardening work, a new minimum Node.js version, and many fixes directly relevant to GMI's non-interactive `--mode json` usage.

| Item | Detail |
|------|--------|
| **Current version** | `0.65.1` (pinned in `.github-minimum-intelligence/package.json`) |
| **Target version** | `0.75.5` |
| **Releases spanned** | 25 (v0.67.4 – v0.75.5; note that v0.66.* and v0.67.0–v0.67.3 do not exist as published releases) |
| **Breaking change releases** | v0.68.0, v0.69.0, v0.70.0, v0.71.0, v0.72.0, v0.73.0, v0.75.0 |
| **Package name change** | `@mariozechner/pi-coding-agent` → `@earendil-works/pi-coding-agent` |
| **Repository change** | `github.com/badlogic/pi-mono` → `github.com/earendil-works/pi` |
| **New runtime requirement** | Node.js **>= 22.19.0** (v0.75.0) |
| **Announcement** | https://pi.dev/news/2026/5/7/pi-has-a-new-home |

---

## 2. Ownership / Scope Migration (`badlogic/pi-mono` → `earendil-works/pi`)

### 2.1 What Changed

In early May 2026 the pi-mono project moved from Mario Zechner's personal GitHub account to the **Earendil Works** organization. The change has three observable surfaces:

| Surface | Old | New |
|---------|-----|-----|
| **GitHub repository** | `github.com/badlogic/pi-mono` | `github.com/earendil-works/pi` |
| **npm package (CLI)** | `@mariozechner/pi-coding-agent` | `@earendil-works/pi-coding-agent` |
| **npm scope (all packages)** | `@mariozechner/*` (pi-ai, pi-agent-core, pi-tui, …) | `@earendil-works/*` |
| **Release notes / issue links** | `github.com/badlogic/pi-mono/issues/...` | `github.com/earendil-works/pi/issues/...` (mixed during transition) |

Mario Zechner remains a primary maintainer; the move is governance/ownership only. The CLI binary name (`pi`), settings layout (`.pi/`), session JSONL format, and CLI flags are all unchanged.

### 2.2 First-Class Support in pi for the Migration

- **v0.73.1** added migration support to `pi update --self`: when the version-check endpoint reports a renamed package, the self-update flow now uninstalls the old global package before installing the new one. GMI does not use `pi update --self` (it pins a specific version in `package.json`), but anyone running pi standalone benefits.
- **v0.74.0** is effectively the "rename" release — its changelog entry is purely "Updated repository links and package references for the move to `earendil-works/pi-mono` and `@earendil-works/*` package scopes."
- From **v0.74.1** onward, all changelogs reference `@earendil-works/pi-ai` and `@earendil-works/pi-tui` as the sources of inherited behavior changes, and issue links resolve under `earendil-works/pi`.

### 2.3 Implication for GMI

GMI must change the **package name** in `package.json`, regenerate `bun.lock`, and update **all documentation references** that point at the old repository URL or scoped package name. There are no API/CLI changes that flow from the ownership move itself — only the dependency identifier changes.

The old `@mariozechner/pi-coding-agent` package is being deprecated; future fixes and releases will only land under `@earendil-works/pi-coding-agent`. Staying on the old name is a dead end.

---

## 3. Release-by-Release Changelog Summary

> Note: pi-mono skipped from v0.65.1 to v0.67.4 with no intervening published releases.

### v0.67.4

- **New**: `--no-context-files` (`-nc`) disables automatic `AGENTS.md` / `CLAUDE.md` discovery for clean runs without project context injection.
- **New**: `loadProjectContextFiles()` exported as a standalone utility for extensions/SDK consumers.
- **New**: `after_provider_response` extension hook — inspect provider HTTP status codes/headers immediately after each response and before stream consumption.
- Added Claude Opus 4.7 model for Anthropic and improved Anthropic prompt-cache breakpoint placement on tool definitions.
- Fix: shutdown kills tracked detached bash child processes on exit signals — **relevant for GMI**: avoids orphaned `gh`/`git` subprocesses left over after a JSON-mode run.
- Fix: `find` and `grep` no longer stall or become unresponsive on broad searches; `find` cancellation and `gitignore` discovery are now abort-aware.

### v0.67.5

- Fix: Opus 4.7 adaptive thinking config across Anthropic and Bedrock providers.
- Fix: Zellij `Shift+Enter` regression (interactive only).

### v0.67.6

- **New**: prompt templates support an `argument-hint` frontmatter field for `/` autocomplete dropdowns. **Useful for GMI**: applies to GMI's `.pi/prompts/code-review.md` and `.pi/prompts/issue-triage.md` if they ever get arguments.
- **New**: compact interactive startup header with `Ctrl+O` to expand (interactive only).
- **New**: markdown links rendered as OSC 8 hyperlinks on supporting terminals.
- Fix: `find` tool returning no results for path-based glob patterns such as `src/**/*.spec.ts` — `fd` now runs in full-path mode when patterns contain `/`.
- Fix: `find` tool nested `.gitignore` handling — sibling-directory ignore rules no longer cross-pollute.
- Fix: OpenAI Responses prompt caching for non-`api.openai.com` base URLs now sends `session_id` and `x-client-request-id` cache-affinity headers unconditionally.

### v0.67.67

- **New**: Bedrock bearer-token authentication via `AWS_BEARER_TOKEN_BEDROCK`.
- Fix: Mistral Small 4 default thinking, Qwen chat-template thinking replay, exported HTML transcript selection, git package update notification flakes.
- Fix: **system prompt dates use stable `YYYY-MM-DD` format** instead of locale-dependent output — **important for GMI**: keeps GitHub Actions agent prompts deterministic across runners.
- Fix: auto-retry treats `Network connection lost.` as retryable — **relevant for GMI**: reduces hard failures on transient network blips in CI.
- Fix: missing root exports for `RpcClient` and RPC protocol types.
- Fix: `tool_result` / `afterToolCall` extension handling for error results — `details` and `isError` overrides are now preserved.
- Fix: Bun binary asset path resolution honors `PI_PACKAGE_DIR`.
- Fix: parallel tool-call finalization converts `afterToolCall` hook throws into error tool results instead of aborting the remaining tool batch.

### v0.67.68

Empty release.

### v0.68.0 — **⚠️ Breaking Changes**

- **New**: configurable streaming working indicator for extensions via `ctx.ui.setWorkingIndicator()`.
- **New**: `/clone` duplicates the current active branch into a new session; `ctx.fork()` accepts `position: "before" | "at"`.
- **⚠️ Breaking — does NOT impact GMI**: SDK `createAgentSession({ tools })` now expects `string[]` tool names instead of `Tool[]` instances. **GMI uses the CLI**, where `--tools read,bash,edit,write,grep,find,ls` is already the comma-separated name-allowlist shape — **no change required**.
- **⚠️ Breaking — does NOT impact GMI**: removed prebuilt cwd-bound tool exports from `@mariozechner/pi-coding-agent` (`readTool`, `bashTool`, …). Use `createReadTool(cwd)` etc. SDK-only.
- **⚠️ Breaking — does NOT impact GMI**: removed ambient `process.cwd()` defaults from `DefaultResourceLoader`, `loadProjectContextFiles()`, `loadSkills()`. SDK-only.
- **⚠️ Breaking — IMPACTS GMI (interactive flag semantics)**: `--no-tools` now disables all tools by default rather than only built-ins. GMI does not pass `--no-tools`, so this is informational.
- Fix: `sessionDir` in `settings.json` now expands `~` — **relevant for GMI** if migrating off `--session-dir` (see §6.5).
- Fix: `edit` tool coerces stringified `edits` JSON before validation — **relevant for GMI**: fewer edit retries when models pass `edits` as a string.

### v0.68.1

- **New**: Fireworks provider with `FIREWORKS_API_KEY`.
- **New**: configurable inline tool image width via `terminal.imageWidthCells` (interactive only).
- Fix: parallel tool-call rows leave the pending state as soon as each tool finalizes.
- Fix: Anthropic streaming hardened against malformed tool-call JSON; deprecated `fine-grained-tool-streaming` beta replaced with per-tool `eager_input_streaming`.
- Fix: Bedrock runtime endpoint resolution stops pinning built-in regional endpoints over `AWS_REGION` / `AWS_PROFILE`.

### v0.69.0 — **⚠️ Breaking Changes**

- **New**: **TypeBox 1.x migration** for extensions and SDK integrations. TypeBox-native tool argument validation works in eval-restricted runtimes (Cloudflare Workers).
- **New**: stacked extension autocomplete providers via `ctx.ui.addAutocompleteProvider(...)`.
- **New**: terminating tool results via `terminate: true` — custom tools can end the current batch without paying for an automatic follow-up LLM turn.
- **New**: OSC 9;4 terminal progress indicators during agent streaming (default-off after v0.70.0).
- **⚠️ Breaking — IMPACTS GMI**: first-party migration from `@sinclair/typebox` 0.34.x to `typebox` 1.x. New extensions should `import { Type } from "typebox"`. Legacy extension loading still **aliases the root `@sinclair/typebox` package**, so GMI's `github-context.ts` continues to work with its current `import { Type } from "@sinclair/typebox"`. However, the `@sinclair/typebox/compiler` subpath is **no longer shimmed** — not used by GMI. See §6.3 for the optional but recommended cleanup.
- **⚠️ Breaking — does NOT impact GMI**: session-replacement commands invalidate captured pre-replacement extension `pi`/`ctx` references. GMI's extension does not call `ctx.newSession()`, `ctx.fork()`, or `ctx.switchSession()`. **No change required**.

### v0.70.0 — **⚠️ Breaking Change**

- **New**: searchable auth provider login flow (interactive `/login`).
- **New**: GPT-5.5 Codex (`openai-codex/gpt-5.5`) with `xhigh` reasoning. **Relevant for GMI**: GMI's `settings.json` is configured for `openai`/`gpt-5.5`/`high`; this release is when GPT-5.5 Codex variants were added.
- **New**: `--no-builtin-tools` / `createAgentSession({ noTools: "builtin" })` disables only built-in tools while keeping extension tools active.
- **⚠️ Breaking — does NOT impact GMI**: OSC 9;4 terminal progress indicators disabled by default (interactive cosmetic).
- Fix: `pi-coding-agent` no longer ships `uuid@11` (npm audit moderate finding); now depends on `uuid@14`.
- Fix: long local-LLM SSE streams no longer abort at 5 minutes via undici body/headers timeouts — global dispatcher timeouts removed; provider SDKs continue to enforce their own deadlines via `retry.provider.timeoutMs`.

### v0.70.1

- **New**: DeepSeek provider with `DEEPSEEK_API_KEY`.
- **New**: provider request timeout/retry controls via `retry.provider.{timeoutMs,maxRetries,maxRetryDelayMs}`.
- Fix: Windows git package installs no longer break with `fatal: Too many arguments` when install paths contain spaces.

### v0.70.2

- Fix: provider retry/timeout forwarding omits undefined values to avoid downstream SDK validation errors (`timeout must be an integer`).

### v0.70.3

- **New**: `pi update` can now update pi itself in addition to installed pi packages (interactive convenience; GMI pins versions).
- **New**: Azure Cognitive Services endpoint support for Azure OpenAI Responses deployments.
- **New**: suppressible Anthropic extra-usage billing warning via `warnings.anthropicExtraUsage`.
- Fix: Bedrock prompt-caching and adaptive-thinking capability checks for inference profile ARNs.
- Fix: bash executor temp output streams no longer leak file descriptors when output is truncated by line count — **relevant for GMI**: long-running `bun test` or `gh` invocations.
- Fix: long local-LLM SSE streams no longer abort at 5 minutes — see v0.70.0.

### v0.70.4

- Fix: packaged `pi` startup failing because the session selector imported a source-only utility path.

### v0.70.5

- Fix: HTML export trailing padding cosmetics.

### v0.70.6

- **New**: Cloudflare Workers AI provider with `CLOUDFLARE_API_KEY`/`CLOUDFLARE_ACCOUNT_ID`.
- **New**: Pi version checks now identify with a `pi/<version>` user agent against `pi.dev`.
- Fix: file discovery falls back to `fdfind` when `fd` is unavailable — **relevant for GMI**: Debian/Ubuntu GitHub Actions runners that don't ship `fd`.

### v0.71.0 — **⚠️ Breaking Change**

- **⚠️ Breaking — does NOT impact GMI**: removed built-in Google Gemini CLI and Google Antigravity provider support. GMI uses `openai`, so unaffected. Anyone configured for `google-gemini-cli` or `google-antigravity` must migrate.
- **New**: Cloudflare AI Gateway, Moonshot AI, and Mistral Medium 3.5 built-in support.
- **New**: extension APIs to replace finalized `message_end` messages, wrap custom editor factories, and observe thinking-level changes.
- **New**: `PI_CODING_AGENT_SESSION_DIR` env var as an equivalent to `--session-dir` — **directly relevant for GMI**: could replace the `--session-dir` CLI flag in `agent.ts` (see §6.5).
- **New**: top-level `name` on `pi.registerProvider()` for friendlier `/login` display.
- Updated `@anthropic-ai/sdk` to clear `GHSA-p7fg-763f-g4gf` audit findings.
- Fix: project context discovery loads `AGENTS.MD` in addition to `AGENTS.md`.
- Fix: `grep` and `find` tool argument injection for flag-like search patterns — **security relevant**.

### v0.71.1

- **New**: `websocket-cached` transport for OpenAI Codex (ChatGPT subscription auth) — keeps a single WebSocket open and sends only delta items per request.

### v0.72.0 — **⚠️ Breaking Change**

- **New**: Xiaomi MiMo Token Plan provider.
- **New**: **model thinking level metadata** — models declare supported thinking levels via `thinkingLevelMap`, replacing the old `reasoningEffortMap`.
- **New**: custom provider per-model `baseUrl` overrides honored by `pi.registerProvider()`.
- **New**: agent loop `shouldStopAfterTurn` callback for graceful post-turn exit.
- **⚠️ Breaking — does NOT impact GMI**: `compat.reasoningEffortMap` in `models.json` and `pi.registerProvider()` replaced by model-level `thinkingLevelMap`. GMI does not ship a `models.json` or call `registerProvider`. **No change required**.

### v0.72.1

Empty release.

### v0.73.0 — **⚠️ Breaking Change**

- **New**: **incremental bash output streaming** — bash tool output now appears while commands run instead of only after completion. **Relevant for GMI**: improves visibility in JSON-mode for long-running commands.
- **New**: compact `read` rendering for Pi docs / context files / skills in interactive mode.
- **⚠️ Breaking — does NOT impact GMI**: built-in `xiaomi` provider switched from Token Plan AMS to Xiaomi's API billing endpoint; affected users must switch to `xiaomi-token-plan-*` providers. GMI uses `openai`.
- Fix: OpenAI Codex WebSocket transport falls back to SSE when setup fails and surfaces transport diagnostics in the assistant message.
- Fix: OpenAI Codex WebSocket transport keeping `--print` and **JSON mode processes alive after the response** by closing cached WebSocket sessions during session shutdown — **critical for GMI** when Codex transports are used: prevents agent processes from hanging in CI runs.
- Fix: interactive sessions now exit when terminal input is lost.

### v0.73.1

- **New**: self-update support for the **npm scope migration** (`@mariozechner/pi-coding-agent` → `@earendil-works/pi-coding-agent`) via `pi update --self`. GMI pins versions and does not use this path.
- **New**: interactive OAuth login selection for providers that present multiple login choices.
- **New**: JSONC-style `models.json` parsing — comments and trailing commas allowed.
- Fix: `pi -p` no longer treats prompts that start with YAML frontmatter as extension flags — **relevant for GMI**: GMI's prompts in `.pi/prompts/*.md` start with YAML frontmatter; if a future invocation pipes a templated prompt body to `-p`, this fix prevents misinterpretation.
- Fix: HTML session exports strip skill wrapper XML from rendered user messages.
- Fix: OpenAI Codex Responses requests now send a non-empty system prompt.

### v0.74.0 — **Repository / scope rename**

- Updated repository links and package references for the move to `earendil-works/pi-mono` and `@earendil-works/*` package scopes. This is the cutover release for the ownership migration described in §2.

### v0.74.1

- **New**: **image generation support** in `@earendil-works/pi-ai`, including built-in OpenRouter image generation.
- **New**: Together AI provider with `/login` API-key auth.
- **New**: Windows ARM64 standalone binaries.
- **New**: improved terminal/markdown rendering (list indentation, task-list checkboxes, large markdown robustness, inline image placement).
- Fix: Node 26 OpenAI-compatible streams no longer time out after 5 idle minutes — routed through pi's undici dispatcher.
- Fix: `--resume` session listing caps in-flight session metadata loads — avoids OOM on large session histories. **Relevant for GMI**: long-lived issue threads accumulate sessions.
- Fix: auto-retry for Anthropic streams that end before `message_stop`.
- Fix: compaction summary calls clamp requested output tokens to model limits.

### v0.74.2

- Fix: `pi update` on Node 20 now explains that newer Pi releases require Node >= 22.19.0 instead of reporting a successful no-op update.
- Fix: self-update package-manager commands pass `--ignore-scripts`.

### v0.75.0 — **⚠️ Breaking Change**

- **⚠️ Breaking — VERIFY for GMI**: **minimum Node.js raised to 22.19.0**. **Action required**: confirm the GitHub Actions workflow uses a Node toolchain that satisfies this floor (or relies entirely on Bun's bundled runtime, in which case this is a moot point for runtime, but `pi update --self` / npm installs of pi packages still need Node 22.19+). See §6.6.
- Fix: compaction summary calls use custom agent stream functions, preserving proxy-backed LLM routing.
- Fix: **system prompt and context file boundaries use explicit XML tags instead of Markdown headings** — reduces inconsistent boundary ingestion by models. **Relevant for GMI**: improves how `AGENTS.md` and `.pi/APPEND_SYSTEM.md` are delimited in the assembled system prompt.
- Fix: user-scoped npm pi packages install under `~/.pi/agent/npm/` instead of npm's global package root — avoids permission errors with system-managed Node installs.
- Fix: Mistral requests no longer fail after the global fetch proxy/timeout workaround.
- Fix: default output token requests for models whose advertised output limit is effectively their full context window.

### v0.75.1

- Fix: config selectors scale their visible row count to terminal height.
- Fix: Anthropic-compatible API-key requests ignore unrelated `ANTHROPIC_AUTH_TOKEN` environment values.
- Fix: Amazon Bedrock message conversion skips unknown content blocks instead of failing the stream.
- Fix: Azure OpenAI Responses and OpenAI Responses error formatting prefix HTTP status codes onto `errorMessage` so transient 5xx/429 errors are correctly matched by the auto-retry classifier.
- Fix: JSON parse failures for compressed fetch responses under Node 26.0 — undici fetch globals installed alongside pi's global dispatcher.
- Fix: npm-family package commands on Windows handle install prefixes containing spaces.
- Removed non-working OpenAI Codex fast model variants.

### v0.75.2

- Fix: Bun-compiled release binaries failing to start when Bun's built-in undici shim lacks npm undici's `install` export.
- Fix: Windows external editor handoff for vim/nvim from the TUI.
- Fix: Windows npm self-updates move loaded native dependency packages out of the active install before reinstalling pi.

### v0.75.3

- Fix: undici 8 HTTP/2 destroyed-session races crashing the Node CLI by preserving the previous HTTP/1.1-only fetch dispatcher behavior.

### v0.75.4

- **New**: **Hardened npm install and release path** — pi ships the CLI with a generated `npm-shrinkwrap.json` for transitive dependencies, blocks accidental lockfile changes, verifies dependency pinning and lifecycle-script allowlists in checks, disables lifecycle scripts for self-update and local release installs where supported, and smoke-tests isolated npm and Bun installs before release.
- **New**: interactive update notes after `pi update` show the installed version's changelog.
- **New**: exported image resize utilities for SDK consumers.
- Changed source syntax to avoid TypeScript constructs that require JavaScript emit — sources remain compatible with Node.js strip-only TypeScript checks.
- Fix: system prompt tells models to resolve pi docs and examples under **absolute package paths** before reading topic-specific relative references.
- Fix: extension `ctx.abort()` during tool-call preflight stops later confirmations and restores queued input.
- Fix: AgentSession retry, compaction, and event settlement use the awaited agent lifecycle; added `willRetry` to `agent_end` session events — **relevant for GMI**: post-run JSONL consumers can now reliably detect retry-in-progress vs. terminal end states.
- Fix: OpenAI prompt cache keys clamped to the provider's 64-character limit.
- Fix: HTTP idle timeout configuration so long-running provider streams can avoid premature idle disconnects.

### v0.75.5

- **New**: cleaner collapsed `read` tool cards — show only the read line until expanded (interactive cosmetic).
- **New**: faster file tools on Windows via async filesystem operations during streaming.
- **New**: more reliable `pi update` and git package installs — reconciles pinned git refs and preserves package settings.
- **New**: custom Anthropic-compatible adaptive thinking via `compat.forceAdaptiveThinking` in custom provider model configs.
- **New**: standard unified patch on edit tool result details for SDK consumers.
- Replaced the inherited optional `koffi` dependency for Windows VT input with a vendored native helper — smaller install size.
- Fix: package/resource path handling for Windows and glob/pattern resolution.
- Fix: config pattern matching resolves patterns from the correct base directory.
- Fix: Amazon Bedrock provider loading under strict package managers by inheriting the declared `@smithy/node-http-handler` dependency.
- Fix: Amazon Bedrock Claude requests send the model output token cap by default — avoids Bedrock's 4096-token default truncation.
- Fix: exported session HTML escapes quote characters in attribute values.
- Fix: GitHub Copilot device-code login keeps opening the verification URL in browser-capable environments while ignoring browser launch failures for headless use.
- Fix: final bash tool cards avoid rendering duplicate full-output truncation paths.
- Fix: bash tool truncation line counts ignore the trailing newline as an extra output line — **relevant for GMI**: more accurate truncation messaging on `gh` / `bun test` output.

---

## 4. Breaking Changes Impact Assessment for GMI

### 4.1 IMPACTS GMI — npm Scope and GitHub Org Migration (v0.73.1 / v0.74.0)

**What changed**: `@mariozechner/pi-coding-agent` → `@earendil-works/pi-coding-agent`; `badlogic/pi-mono` → `earendil-works/pi`.

**Impact on GMI**: The dependency name in `.github-minimum-intelligence/package.json` must change, the lockfile must be regenerated, and every documentation reference that names the old scope or links to `github.com/badlogic/pi-mono` must be updated.

**Required change**: see §6.1, §6.2, §7.

### 4.2 IMPACTS GMI — Node.js Minimum Raised to 22.19.0 (v0.75.0)

**What changed**: pi requires Node.js >= 22.19.0.

**Impact on GMI**: GMI's lifecycle runs `pi` as a child of `Bun.spawn(...)` (see `lifecycle/agent.ts:331`). Bun ships its own runtime, but **pi itself is invoked via the `node_modules/.bin/pi` shim, which is a Node script** — so a Node 22.19+ install must be present on the runner. The standard GitHub-hosted `ubuntu-latest` image ships Node >= 22 in 2026, but workflows that pin Node 20 (or use `actions/setup-node@v4` to install an older version) will break. See §6.6 for the verification step.

### 4.3 DOES NOT IMPACT GMI — SDK Tool-Array Shape Change (v0.68.0)

**What changed**: SDK `createAgentSession({ tools })` now expects `string[]` of tool names.

**Impact on GMI**: GMI uses the CLI, and `--tools read,bash,edit,write,grep,find,ls` is already a comma-separated name list. **No change required**.

### 4.4 DOES NOT IMPACT GMI — Prebuilt cwd-bound Tool Exports Removed (v0.68.0)

**What changed**: `readTool`, `bashTool`, `editTool`, `writeTool`, `grepTool`, `findTool`, `lsTool`, `readOnlyTools`, `codingTools` and their `*ToolDefinition` siblings removed from `@mariozechner/pi-coding-agent`. Use `createReadTool(cwd)` etc.

**Impact on GMI**: GMI's `github-context.ts` extension does not import any of these. **No change required**.

### 4.5 DOES NOT IMPACT GMI — Ambient cwd Removed From Resource Helpers (v0.68.0)

**What changed**: `DefaultResourceLoader`, `loadProjectContextFiles()`, `loadSkills()` require explicit cwd/agent-dir inputs.

**Impact on GMI**: GMI's extension does not call any of these. **No change required**.

### 4.6 DOES NOT IMPACT GMI — TypeBox 1.x Migration (v0.69.0)

**What changed**: First-party migration from `@sinclair/typebox` 0.34.x to `typebox` 1.x. Legacy extension loading still aliases the root `@sinclair/typebox` package; only `@sinclair/typebox/compiler` is no longer shimmed.

**Impact on GMI**: GMI's `.pi/extensions/github-context.ts` does `import { Type } from "@sinclair/typebox"` and **does not import from `@sinclair/typebox/compiler`**. The alias keeps it working. **No mandatory change required**, but switching the import to `typebox` is the long-term direction (see §6.3).

### 4.7 DOES NOT IMPACT GMI — Session-Replacement Invalidation (v0.69.0)

**What changed**: After `ctx.newSession()`, `ctx.fork()`, or `ctx.switchSession()`, stale captured `pi`/`ctx` references throw instead of silently targeting the wrong session. `withSession` callback added for post-switch work.

**Impact on GMI**: GMI's extension does not call any session-replacement APIs. **No change required**.

### 4.8 DOES NOT IMPACT GMI — Google Gemini CLI / Antigravity Removed (v0.71.0)

**What changed**: Removed built-in `google-gemini-cli` and `google-antigravity` provider support.

**Impact on GMI**: GMI defaults to `openai`/`gpt-5.5`. **No change required**.

### 4.9 DOES NOT IMPACT GMI — `reasoningEffortMap` → `thinkingLevelMap` (v0.72.0)

**What changed**: `models.json` and `pi.registerProvider()` model definitions now use model-level `thinkingLevelMap` instead of `compat.reasoningEffortMap`.

**Impact on GMI**: GMI does not ship a `models.json` or register custom providers. **No change required**.

### 4.10 DOES NOT IMPACT GMI — Xiaomi Provider Endpoint Switch (v0.73.0)

**What changed**: Built-in `xiaomi` provider switched from Token Plan AMS to API billing. Users should switch to regional `xiaomi-token-plan-*` providers if they were on Token Plan.

**Impact on GMI**: GMI uses `openai`. **No change required**.

### 4.11 DOES NOT IMPACT GMI — OSC 9;4 Terminal Progress Default-Off (v0.70.0)

**What changed**: OSC 9;4 progress indicators default to off; controlled by `terminal.showTerminalProgress`.

**Impact on GMI**: Interactive cosmetic. JSON mode does not emit OSC 9;4. **No change required**.

---

## 5. Bug Fixes and Features Most Relevant to GMI

These fixes/features directly address issues GMI has experienced or is susceptible to in its `--mode json` / GitHub Actions usage:

| Fix / Feature | Version | Impact |
|---------------|---------|--------|
| **Stable `YYYY-MM-DD` system prompt dates** | v0.67.67 | Deterministic prompts across runners/locales |
| **Auto-retry treats "Network connection lost." as retryable** | v0.67.67 | Reduces hard failures on transient CI network blips |
| **Detached bash child processes killed on shutdown** | v0.67.4 | Avoids orphaned `gh`/`git` subprocesses |
| **`find` cancellation and broad-search responsiveness** | v0.67.4 | Faster, abort-aware repository searches |
| **`grep`/`find` flag-like search pattern argument injection fix** | v0.71.0 | Security: prevents pattern fragments from being interpreted as flags |
| **`find` tool path-glob (e.g. `src/**/*.spec.ts`) now matches** | v0.67.6 | Common file-discovery patterns work as expected |
| **Bash executor temp file descriptor leak fix on line-count truncation** | v0.70.3 | Avoids fd exhaustion on long-running jobs |
| **Bash truncation line count ignores trailing newline** | v0.75.5 | More accurate truncation messaging |
| **Incremental bash output streaming** | v0.73.0 | Live output for long-running commands in JSON mode |
| **OpenAI Codex WebSocket sessions closed on shutdown** | v0.73.0 | Prevents JSON-mode processes from hanging in CI |
| **`pi -p` does not treat YAML-frontmatter prompts as extension flags** | v0.73.1 | Safer when piping templated prompts |
| **`AGENTS.MD` (capitalized) also loaded** | v0.71.0 | Case-insensitive project context discovery |
| **`fd` → `fdfind` fallback** | v0.70.6 | Works on Debian/Ubuntu runners without `fd` shim |
| **XML-tagged system prompt / context file boundaries** | v0.75.0 | More consistent model ingestion of `AGENTS.md` and `.pi/APPEND_SYSTEM.md` |
| **`sessionDir` setting expands `~`** | v0.68.1 | Portable session-directory config |
| **`PI_CODING_AGENT_SESSION_DIR` env var** | v0.71.0 | Optional replacement for `--session-dir` CLI flag |
| **`--resume` session metadata loads capped** | v0.74.1 | Avoids OOM on large session histories |
| **`willRetry` on `agent_end` session events** | v0.75.4 | JSONL consumers can distinguish in-flight retry vs. terminal end |
| **HTTP idle timeout config for long-running streams** | v0.75.4 | Avoids premature idle disconnects on slow providers |
| **OpenAI cache key clamped to 64 chars** | v0.75.4 | Avoids provider-side validation failures |
| **`uuid@11` → `uuid@14`** (audit moderate cleared) | v0.70.0 | Clean `npm audit` for downstream installs |
| **`@anthropic-ai/sdk` audit GHSA-p7fg-763f-g4gf cleared** | v0.71.0 | Closes known vulnerability |
| **Supply-chain hardening: `npm-shrinkwrap.json`, lifecycle-script allowlist** | v0.75.4 | Reproducible installs; defense against transitive-dep tampering |
| **Compaction summaries use custom agent stream functions** | v0.75.0 | Preserves proxy-backed LLM routing for compaction |
| **`agent_end` `willRetry` and AgentSession lifecycle settlement** | v0.75.4 | Reliable end-of-stream detection |

### 5.1 Highlight: Bash Output Streaming (v0.73.0)

The biggest user-visible runtime change. Prior to v0.73.0, `bash` tool output appeared only when the command finished; GMI runs that invoked long-running `bun test`, `gh pr checks`, or large `git log` operations could appear to hang. From v0.73.0 onward, output streams incrementally into the JSONL transcript.

### 5.2 Highlight: XML-Tagged System Prompt Boundaries (v0.75.0)

The default system prompt now wraps context files (`AGENTS.md`, `CLAUDE.md`) and skill contents in explicit XML tags rather than Markdown headings. This reduces a long-standing failure mode where models would treat a context-file section heading as an instruction boundary or confuse a Markdown heading inside a context file with a system-prompt section. GMI's `AGENTS.md` and `.pi/APPEND_SYSTEM.md` benefit automatically.

### 5.3 Highlight: Supply-Chain Hardening (v0.75.4)

The CLI now ships with an `npm-shrinkwrap.json`, blocks accidental lockfile changes in releases, verifies dependency pinning and lifecycle-script allowlists during checks, and disables lifecycle scripts for self-update and local release installs. This materially improves the security posture of installing `@earendil-works/pi-coding-agent` in CI.

---

## 6. Required Code Changes

### 6.1 `package.json` — Package Rename and Version Bump

**File**: `.github-minimum-intelligence/package.json`

```json
{
  "dependencies": {
    "@earendil-works/pi-coding-agent": "0.75.5"
  }
}
```

Remove the `@mariozechner/pi-coding-agent` entry entirely; the old name will not receive further updates.

### 6.2 `bun.lock` — Regenerate

**Action**: Run `cd .github-minimum-intelligence && bun install` to regenerate the lockfile. Expect substantial churn: `@mariozechner/pi-ai`, `@mariozechner/pi-agent-core`, `@mariozechner/pi-tui`, and `@mariozechner/pi-coding-agent` will be removed, and their `@earendil-works/*` replacements added. Transitive dependencies (`@anthropic-ai/sdk`, `openai`, `@google/genai`, `undici`, `uuid`, `typebox`, `@smithy/node-http-handler`, …) will move to newer pinned versions.

### 6.3 `github-context.ts` — Update Import Path

**File**: `.github-minimum-intelligence/.pi/extensions/github-context.ts`

Two updates, neither strictly mandatory (legacy aliases remain) but both recommended:

1. **Import the type from the new package name**:
   ```typescript
   import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
   ```
2. **Optionally migrate `Type` import to `typebox` 1.x** (v0.69.0):
   ```typescript
   import { Type } from "typebox";
   ```
   The current `import { Type } from "@sinclair/typebox"` continues to work via the legacy alias, but `typebox` is the documented direction for new extensions and SDK integrations.

Add `typebox` (or keep `@sinclair/typebox`) as an explicit dev dependency if Bun cannot resolve it transitively.

### 6.4 CLI Flags Verification

**File**: `.github-minimum-intelligence/lifecycle/agent.ts` (lines ~310–329)

All flags currently used by GMI remain valid in v0.75.5:

| Flag | Status |
|------|--------|
| `--mode json` | ✅ Valid |
| `--tools read,bash,edit,write,grep,find,ls` | ✅ Valid (name-allowlist shape) |
| `--provider <P>` | ✅ Valid |
| `--model <M>` | ✅ Valid |
| `--thinking <T>` | ✅ Valid |
| `--session-dir <D>` | ✅ Valid (or replace with `PI_CODING_AGENT_SESSION_DIR` env, v0.71.0) |
| `-p <prompt>` | ✅ Valid; v0.73.1 fixed YAML-frontmatter handling |
| `--session <S>` | ✅ Valid |

No mandatory `agent.ts` change required.

### 6.5 Optional — Replace `--session-dir` With `PI_CODING_AGENT_SESSION_DIR` or `settings.json`

v0.71.0 added `PI_CODING_AGENT_SESSION_DIR` as an environment-variable equivalent to the `--session-dir` flag. Combined with v0.68.1's `~` expansion in `sessionDir`, GMI could move session-directory config out of `agent.ts` entirely. Recommend deferring to a separate PR — the current path is computed at runtime relative to cwd, so any move needs explicit testing of relative-path resolution semantics.

### 6.6 Verify Node.js >= 22.19.0 in the Workflow

**File**: `.github/workflows/*.yml` and any `actions/setup-node@v4` invocations.

**Action**:
- Confirm no workflow pins a Node version below 22.19.0.
- If `actions/setup-node` is used, set `node-version: '22.19.0'` (or `'22'` / `'lts/*'` if that resolves to >= 22.19.0).
- If only Bun is installed and `pi` is run through Bun's runtime, this is informational — but the `node_modules/.bin/pi` shim is a Node script, so a Node toolchain must be present on the runner.
- GitHub-hosted `ubuntu-latest`, `ubuntu-24.04`, and `ubuntu-22.04` images all ship Node >= 22 by mid-2026, but explicit pinning is still wise.

---

## 7. Documentation Updates Required

All references to `0.65.1`, `@mariozechner/pi-coding-agent`, and `github.com/badlogic/pi-mono` must be updated.

### 7.1 `PACKAGES.md`

**File**: `.github-minimum-intelligence/PACKAGES.md` (line ~12)

Update the dependency table:
```
| [@earendil-works/pi-coding-agent](https://github.com/earendil-works/pi) | 0.75.5 | ... |
```

### 7.2 `security-assessment.md`

**File**: `.github-minimum-intelligence/docs/security-assessment.md`

Update all references to the package name, version, and source URL. Highlight the v0.75.4 supply-chain hardening (`npm-shrinkwrap.json`, lifecycle-script allowlist) and the cleared GHSA-p7fg-763f-g4gf audit finding (v0.71.0) in the dependency-risk section.

### 7.3 `public-fabric/status.json`

**File**: `.github-minimum-intelligence/public-fabric/status.json`

Update the pinned version reference from `"0.65.1"` to `"0.75.5"` and the package identifier from `@mariozechner/pi-coding-agent` to `@earendil-works/pi-coding-agent`.

### 7.4 `pi-mono-feature-utilization.md`

**File**: `.github-minimum-intelligence/docs/analysis/pi-mono-feature-utilization.md`

Update the version reference and re-audit feature coverage. New features now available include incremental bash streaming, `PI_CODING_AGENT_SESSION_DIR`, `terminate: true` tool results, `ctx.ui.addAutocompleteProvider`, `after_provider_response` hook, `--no-context-files`, `--no-builtin-tools`, `argument-hint` prompt-template frontmatter, XML-tagged context boundaries, and the `willRetry` `agent_end` field.

### 7.5 `description-architecture-study.md` / `description-github-as-infrastructure.md`

Update version references from `0.57.1`/`0.65.1` to `0.75.5` and any owner/repo URL changes.

### 7.6 `pi-mono/implementation-plan.md` and `pi-mono/ramifications-of-65.1.md`

Update version references; consider adding a companion `ramifications-of-75.5.md` if the project keeps per-version ramification notes.

### 7.7 `github-action-startup-performance.md`

If this document benchmarks against `0.65.1`, re-benchmark against `0.75.5` (lazy provider loading from v0.59.0 already applies; v0.73.0's incremental bash streaming changes perceived runtime).

### 7.8 Previous Upgrade Note (`pi-mono-upgrade-57.1-to-65.1.md`)

Add a footer cross-reference pointing at this document, so anyone landing on the older upgrade note can find the current one.

---

## 8. Testing Plan

### 8.1 Pre-Update Verification

1. `cd .github-minimum-intelligence && bun install --frozen-lockfile` — confirm the current `0.65.1` lock is valid.
2. Run an end-to-end agent invocation in a sandbox repository as a baseline.

### 8.2 Update Steps

1. Replace `@mariozechner/pi-coding-agent: 0.65.1` with `@earendil-works/pi-coding-agent: 0.75.5` in `package.json`.
2. Run `cd .github-minimum-intelligence && bun install` to regenerate `bun.lock`.
3. Update `github-context.ts` import paths (§6.3).
4. Update all documentation version and URL references (§7).
5. Confirm CI runner Node version satisfies >= 22.19.0 (§6.6).

### 8.3 Post-Update Verification

1. `cd .github-minimum-intelligence && node_modules/.bin/pi --version` — expect `0.75.5`.
2. Smoke test:
   ```
   pi --mode json \
      --tools read,bash,edit,write,grep,find,ls \
      --provider openai --model gpt-5.5 \
      -p "List files in the current directory"
   ```
   Confirm JSONL output parses cleanly.
3. Run a session with `--session-dir` + `--session` (resume path) — verify continuity.
4. Run a multi-turn issue conversation in a test repository — verify compaction correctness (v0.74.1 clamps output tokens; v0.75.0 routes through custom stream functions).
5. Verify the `github_repo_context` tool registers and is callable.
6. Run a long-output command (`find / -type f 2>/dev/null | head -3000`) — verify streaming output appears incrementally (v0.73.0) and truncation messaging is accurate (v0.75.5).
7. Trigger a real issue comment in a test repository — verify the full GMI lifecycle.
8. `bun pm audit` after `bun install` — confirm no high/critical findings (v0.70.0 and v0.71.0 cleared known audit notes).

---

## 9. Risk Assessment

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **Node < 22.19 on runner breaks pi startup** | Medium | High | Verify `actions/setup-node` config (§6.6); GitHub-hosted images already meet floor |
| Package rename breaks lockfile resolution | Low | Medium | `bun install` produces a fresh lock; verify `bun.lock` shows `@earendil-works/*` entries only |
| Missed documentation reference to old scope/repo | Medium | Low | Grep for `mariozechner`, `badlogic/pi-mono`, `0.65.1`, `0.57.1` across the repo |
| TypeBox alias dropped in a future minor release | Low | Medium | Migrate `github-context.ts` import to `typebox` proactively (§6.3) |
| Session JSONL schema change between v0.65.1 and v0.75.5 | Very Low | Medium | Session JSONL has remained backward-compatible; `prepareArguments` hook handles old edit schemas; existing session files resume cleanly |
| Provider SDK changes alter cost reporting | Low | Low | Inspect `agent_end` events in JSONL; v0.75.4's `willRetry` field is additive |
| Incremental bash streaming changes JSONL ordering | Low | Low | Output now arrives in `message_update` events progressively; `tac`/`jq` consumers that only read the final `message_end` are unaffected |
| Supply-chain hardening (`npm-shrinkwrap.json`) conflicts with `bun.lock` | Low | Low | Bun reads `package.json` directly; the npm shrinkwrap shipped inside the package only affects npm consumers |
| `@earendil-works/pi-coding-agent` not yet published when GMI updates | Very Low | High | Verify availability on npm before merging the version bump |

---

## 10. Dependency Version Changes (Notable Transitives)

Based on the release notes, the following transitive dependency versions have likely changed:

| Package | From (v0.65.1) | To (v0.75.5) | Notes |
|---------|----------------|--------------|-------|
| `@mariozechner/pi-coding-agent` | 0.65.1 | — | Replaced by `@earendil-works/pi-coding-agent` |
| `@earendil-works/pi-coding-agent` | — | 0.75.5 | New direct dependency name |
| `@mariozechner/pi-ai` | (transitive) | — | Replaced by `@earendil-works/pi-ai` |
| `@mariozechner/pi-agent-core` | (transitive) | — | Replaced by `@earendil-works/pi-agent-core` |
| `@mariozechner/pi-tui` | (transitive) | — | Replaced by `@earendil-works/pi-tui` |
| `typebox` | (n/a) | ^1.x | New TypeBox 1.x package alongside legacy `@sinclair/typebox` alias |
| `@anthropic-ai/sdk` | older | Updated to clear GHSA-p7fg-763f-g4gf | v0.71.0 |
| `uuid` | 11.x (transitive) | 14.x | v0.70.0; clears npm-audit moderate |
| `undici` | ^7.x | 8.x (with HTTP/2 fixes) | v0.75.0 / v0.75.3 |
| `@smithy/node-http-handler` | (transitive) | declared dependency of `@earendil-works/pi-ai` | v0.75.5 |
| `jiti` | `@mariozechner/jiti` fork | upstream `jiti` 2.7 | v0.73.1 |

Exact resolved versions will be recorded in the regenerated `bun.lock`.

---

## 11. Rollback Plan

If the update causes issues:

1. Revert `package.json` to `@mariozechner/pi-coding-agent: 0.65.1`.
2. Restore the original `bun.lock` from git history.
3. Revert the import-path change in `github-context.ts`.
4. Revert documentation version/URL references.
5. Commit and push.

The update is entirely contained within `.github-minimum-intelligence/` and does not affect repository structure or workflow logic. Note that **`@mariozechner/pi-coding-agent` is deprecated upstream** — rollback should be considered a temporary measure, not a steady state.

---

## 12. Recommended Follow-Up Work

After the version bump is merged and verified:

1. **Re-audit `pi-mono-feature-utilization.md`** — cover incremental bash streaming, `PI_CODING_AGENT_SESSION_DIR`, `terminate: true` tool results, autocomplete providers, `after_provider_response` hook, XML-tagged context boundaries, `--no-context-files`, `--no-builtin-tools`, `willRetry`, `argument-hint`.
2. **Evaluate `PI_CODING_AGENT_SESSION_DIR` migration** — replace the `--session-dir` CLI flag with the env var for cleaner separation of config from invocation (§6.5).
3. **Evaluate `typebox` 1.x migration** for `github-context.ts` (§6.3) to remove reliance on the legacy alias.
4. **Evaluate `defineTool()` migration** (still recommended from the previous upgrade plan) for better TypeScript type inference in the extension.
5. **Adopt `willRetry` in JSONL consumers** if any downstream tooling discriminates between retry-in-progress and terminal end states.
6. **Consider the new `--no-context-files` flag** for ad-hoc agent runs where `AGENTS.md` injection is undesirable.
7. **Monitor releases past v0.75.5** — supply-chain hardening (v0.75.4) and the npm scope migration (v0.74.0) suggest the project is investing in long-term governance; expect a v0.76+ within weeks.
8. **Add a `ramifications-of-75.5.md`** companion under `docs/analysis/pi-mono/` if that per-version ramification convention is maintained.

---

## 13. Summary

The update from v0.65.1 to v0.75.5 brings **25 releases** of improvements alongside the project's **migration from `badlogic/pi-mono` (`@mariozechner/*`) to `earendil-works/pi` (`@earendil-works/*`)**. The most impactful changes for GMI are:

- **Package and repository rename** — the mandatory mechanical update; the old scope is deprecated.
- **Node.js >= 22.19.0 required** (v0.75.0) — verify CI runner toolchain.
- **Incremental bash output streaming** (v0.73.0) — long-running commands no longer appear to hang.
- **XML-tagged system prompt boundaries** (v0.75.0) — cleaner ingestion of `AGENTS.md` and `.pi/APPEND_SYSTEM.md`.
- **Supply-chain hardening** (v0.75.4) — `npm-shrinkwrap.json`, lifecycle-script allowlist, isolated install smoke tests.
- **Stable `YYYY-MM-DD` system prompt dates** (v0.67.67) — deterministic prompts across runners.
- **`grep`/`find` flag-injection security fix** (v0.71.0) — closes an argument-handling weakness.
- **OpenAI Codex WebSocket sessions closed on shutdown** (v0.73.0) — prevents JSON-mode processes from hanging in CI.
- **`willRetry` on `agent_end` events** (v0.75.4) — JSONL consumers get reliable retry-vs-terminal discrimination.
- **TypeBox 1.x** (v0.69.0) — legacy alias keeps GMI's current import working; migration is optional but recommended.

The only **mandatory code changes** beyond the version bump are:
1. The package rename in `package.json` (§6.1) and lockfile regeneration (§6.2).
2. The import path update in `github-context.ts` (§6.3).
3. Documentation reference updates across the analysis and assessment docs (§7).
4. Confirming Node >= 22.19.0 on the CI runner (§6.6).

All other breaking changes either don't affect GMI's CLI-based usage or are gated behind legacy aliases. The update is moderate-risk (primarily the package rename and Node version floor) with substantial reward — it addresses several CI-relevant reliability issues and brings GMI onto the maintained `@earendil-works/*` track.

---

## 14. References

- New project home: [github.com/earendil-works/pi](https://github.com/earendil-works/pi)
- Old project home (archived/deprecated): [github.com/badlogic/pi-mono](https://github.com/badlogic/pi-mono)
- Migration announcement: [pi.dev/news/2026/5/7/pi-has-a-new-home](https://pi.dev/news/2026/5/7/pi-has-a-new-home)
- New npm package: [npmjs.com/package/@earendil-works/pi-coding-agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)
- Previous upgrade analysis: [`pi-mono-upgrade-57.1-to-65.1.md`](./pi-mono-upgrade-57.1-to-65.1.md)
