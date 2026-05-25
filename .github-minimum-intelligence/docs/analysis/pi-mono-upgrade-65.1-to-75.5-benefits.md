# pi-mono Update v0.65.1 → v0.75.5 — Benefits of the Upgrade

This document is a companion to [`pi-mono-upgrade-65.1-to-75.5.md`](./pi-mono-upgrade-65.1-to-75.5.md). Where that document is a comprehensive change-by-change analysis with required actions, this one extracts and explains — in plain terms — **why GMI should do the upgrade**. Each benefit is grouped by theme, names the version that introduced it, and explains the concrete payoff for GitHub Minimum Intelligence's non-interactive `--mode json` usage running inside GitHub Actions.

---

## 1. Why Upgrade At All — Executive Summary

Staying on `@mariozechner/pi-coding-agent@0.65.1` is a dead end: the package has been renamed to `@earendil-works/pi-coding-agent`, the GitHub repository has moved to `earendil-works/pi`, and the old scope will receive no further fixes or releases. Beyond that mechanical reason, the 25-release span between v0.65.1 and v0.75.5 delivers the following classes of benefit:

1. **Reliability in CI** — fewer hangs, fewer orphaned processes, fewer transient-error failures, and live output for long-running shell commands.
2. **Security and supply-chain hygiene** — cleared `npm audit` findings, a published `npm-shrinkwrap.json`, lifecycle-script allowlists, and a fix for a `grep`/`find` argument-injection weakness.
3. **Determinism and model-prompt quality** — locale-independent dates, XML-tagged system-prompt boundaries, and stable behavior across runners.
4. **Operational visibility** — `willRetry` on `agent_end`, incremental bash streaming, more accurate truncation messaging, and richer diagnostics on Codex transport fallbacks.
5. **Forward-compatible plumbing** — env-var session-directory config, `--no-context-files`/`--no-builtin-tools` flags, additional providers and models, and a path off the legacy `@sinclair/typebox` alias.
6. **Long-term governance** — first-class organizational stewardship under Earendil Works rather than a single personal account.

All of this is achieved with a small, contained set of mandatory changes (package rename, lockfile regenerate, one extension import, documentation updates, Node-version verification).

---

## 2. Reliability Benefits in `--mode json` / GitHub Actions

GMI's primary execution mode is `pi --mode json` invoked from a GitHub Actions runner. The releases between v0.65.1 and v0.75.5 contain a series of fixes that directly target the failure modes of exactly this profile.

### 2.1 No More Orphaned `gh` / `git` Subprocesses on Shutdown (v0.67.4)

Prior to v0.67.4, when an agent run terminated (signal, timeout, or normal exit) any detached bash children — typically `gh` API calls or `git` operations — could be left running. On a GitHub Actions runner this manifested as a job that "completed" but left zombie processes consuming the runner until the workflow as a whole reaped them. v0.67.4 explicitly tracks and kills these on exit signals.

### 2.2 OpenAI Codex WebSocket Sessions Closed on Shutdown (v0.73.0)

If GMI ever points at a Codex transport (directly or via a proxy), prior versions could keep a cached WebSocket session alive past the end of a `--print` / JSON-mode run, hanging the entire Node process and therefore the Actions job. v0.73.0 closes these sessions during shutdown. This is one of the most impactful single fixes for CI reliability.

### 2.3 Transient Network Failures Are Auto-Retried (v0.67.67)

`Network connection lost.` is now classified as retryable. CI runners frequently see brief network blips (egress proxies, NAT timeouts, transient DNS). Before this fix, a single blip during streaming was a hard failure that aborted the whole agent turn; after, it is retried transparently.

### 2.4 Long-Running Local-LLM / Provider Streams No Longer Cut Off at 5 Minutes (v0.70.0, v0.74.1)

The previous global undici dispatcher imposed an effective 5-minute idle timeout on SSE streams. Long completions (compaction, deep reasoning, large diffs) sometimes died mid-stream. v0.70.0 removed the global timeout in favor of per-provider deadlines; v0.74.1 routed Node 26 OpenAI-compatible streams through pi's dispatcher; v0.75.4 exposes idle-timeout configuration. The end result is fewer mid-stream disconnects on slow or chunky providers.

### 2.5 File-Descriptor Leak Fix on Truncated Bash Output (v0.70.3)

The bash executor leaked file descriptors when output was truncated by line count. On long sessions (e.g., issue conversations that span hours or trigger repeated `bun test` runs), this could exhaust the runner's fd table. v0.70.3 closes those temp streams correctly.

### 2.6 `find` Cancellation and Broad-Search Responsiveness (v0.67.4)

Broad `find` invocations could stall or become unresponsive, and cancellation didn't abort in-flight scans. v0.67.4 makes both `find` and `grep` abort-aware, with `gitignore` discovery participating in cancellation. Agents that try a too-broad search recover quickly instead of wasting a turn.

### 2.7 `find` Path-Globs (`src/**/*.spec.ts`) Now Match (v0.67.6)

A common model behavior is to search with path-style glob patterns. Prior to v0.67.6, `find` returned no results for these. v0.67.6 detects the `/` and switches `fd` to full-path mode. Fewer dead-end search turns, faster convergence to the right files.

### 2.8 `fd` → `fdfind` Fallback (v0.70.6)

Debian/Ubuntu installs `fd-find` as `fdfind` rather than `fd`. The GitHub Actions `ubuntu-latest` image follows this convention. v0.70.6 makes pi automatically fall back to `fdfind`, removing the need to maintain a shim or symlink in the workflow.

### 2.9 More Accurate Bash Truncation Messaging (v0.75.5)

Bash truncation line counts no longer treat a trailing newline as an extra line. Models that read truncation messages get a count that matches what they actually see, which improves their decisions about whether to re-run with narrower output.

### 2.10 `--resume` Caps Session Metadata Loads (v0.74.1)

For repositories with very long-running issue threads, the session directory can accumulate many JSONL transcripts. Listing them for `--resume` previously could OOM the agent on startup. v0.74.1 caps in-flight metadata loads to avoid this.

### 2.11 Compaction Summaries Preserve Proxy Routing and Clamp Output Tokens (v0.75.0, v0.74.1)

Long agent runs eventually compact. v0.74.1 clamps the compaction summary's requested output tokens to the model's true limit (avoiding provider rejections); v0.75.0 routes compaction summaries through the configured custom stream functions (preserving proxy-backed LLM routing). Both make multi-turn issue conversations more durable.

---

## 3. Security and Supply-Chain Benefits

Several of the changes in this window directly improve GMI's posture against dependency and tooling risk — relevant because GMI installs pi into a CI runner that has access to GitHub credentials.

### 3.1 Supply-Chain Hardening of the pi Release Path (v0.75.4)

This is the single biggest security improvement in the span. v0.75.4 introduces:

- A generated `npm-shrinkwrap.json` shipped with the CLI — pins every transitive dependency at install time so two installations of the same pi version cannot resolve to different transitive trees.
- Blocked accidental lockfile changes in the release process.
- Verified dependency pinning and lifecycle-script allowlists during checks.
- Disabled lifecycle scripts for self-update and local release installs where supported.
- Isolated npm and Bun install smoke tests before release.

Net effect: reproducible installs of `@earendil-works/pi-coding-agent` and meaningful defense-in-depth against transitive-dep tampering — exactly the threat model that matters when a package is installed unattended into a CI environment with a GitHub token in scope.

### 3.2 `grep` / `find` Flag-Like Argument Injection Fixed (v0.71.0)

A search pattern beginning with `-` could previously be interpreted as a flag by the underlying tool. v0.71.0 escapes/separates these so a model-generated pattern cannot smuggle a flag through the `grep` or `find` tool. This closes a low-severity but real argument-handling weakness.

### 3.3 Audit Findings Cleared

- **v0.70.0** — `uuid@11` (transitive npm-audit moderate finding) replaced with `uuid@14`. Downstream `bun pm audit` and `npm audit` come back clean for that finding.
- **v0.71.0** — `@anthropic-ai/sdk` updated to a version that clears [GHSA-p7fg-763f-g4gf](https://github.com/advisories/GHSA-p7fg-763f-g4gf).

Both are no-effort wins for GMI's dependency-risk surface in `security-assessment.md`.

### 3.4 `--no-builtin-tools` for Stricter Sandboxing (v0.70.0)

A new CLI flag (`--no-builtin-tools` / `createAgentSession({ noTools: "builtin" })`) disables only the built-in tools while keeping extension tools active. For specialized agent runs (e.g., a read-only triage agent that only needs `github_repo_context`), GMI can shrink the tool surface without losing its extension. Not adopted by default today, but available.

---

## 4. Determinism and Prompt-Quality Benefits

GMI runs across different runner images, dates, and locales. Two changes in this window directly improve prompt and behavior consistency.

### 4.1 Stable `YYYY-MM-DD` Dates in the System Prompt (v0.67.67)

System prompts used to inject locale-dependent date strings, so an `en-US` runner and a `de-DE` runner could produce subtly different prompts and model responses. v0.67.67 standardizes on `YYYY-MM-DD`. GMI's agent prompts are now byte-identical across runners.

### 4.2 XML-Tagged System Prompt and Context File Boundaries (v0.75.0)

Previously, context files like `AGENTS.md`, `CLAUDE.md`, and skill bodies were spliced into the system prompt using Markdown headings as delimiters. Models would occasionally treat a heading **inside** a context file as a new system-prompt section, or treat a system-prompt heading as user-authored content. v0.75.0 switches to explicit XML tags. GMI's `AGENTS.md` and `.pi/APPEND_SYSTEM.md` are now ingested with unambiguous boundaries — fewer cases of the model misattributing instructions.

### 4.3 `AGENTS.MD` Capitalization Variant Also Loaded (v0.71.0)

Project context discovery now loads `AGENTS.MD` in addition to `AGENTS.md`. A trivial robustness fix that prevents a silent context-loss failure mode on case-sensitive filesystems where a contributor saved the file with an unexpected case.

### 4.4 `pi -p` Treats YAML-Frontmatter Prompts Correctly (v0.73.1)

A prompt starting with `---` (YAML frontmatter) was previously misinterpreted by the `-p` parser as an extension flag. v0.73.1 fixes this. GMI's templated prompts under `.pi/prompts/*.md` use YAML frontmatter; future use of `-p` with templated bodies is now safe.

### 4.5 OpenAI Prompt Cache Keys Clamped to 64 Characters (v0.75.4)

Provider-side validation previously rejected cache keys longer than the 64-character limit. v0.75.4 clamps them, so prompt caching keeps working for long key derivations.

### 4.6 OpenAI Codex Responses Always Sends a Non-Empty System Prompt (v0.73.1)

A subtle correctness fix that avoids provider-side errors when the assembled system prompt was empty after extension filtering.

---

## 5. Visibility and Diagnostics Benefits

GMI's downstream tooling consumes the JSONL transcript. Several changes in this window make that transcript more informative.

### 5.1 `willRetry` on `agent_end` Session Events (v0.75.4)

Previously, a downstream consumer could not reliably distinguish "this `agent_end` is the final terminal state" from "this `agent_end` is followed by an automatic retry". v0.75.4 adds a `willRetry` boolean. Any JSONL consumer that classifies success vs. failure (status badges, comment posting, telemetry) now gets the right answer on the first event.

### 5.2 Incremental Bash Output Streaming (v0.73.0)

This is the single most user-visible runtime change. Before v0.73.0, the bash tool emitted output only when the command finished. A `bun test`, `gh pr checks`, or large `git log` invocation looked like a hung agent for the duration of the command. From v0.73.0 onward, output streams incrementally into the JSONL transcript via `message_update` events. For GMI:

- Action logs show live progress instead of long silent gaps.
- The agent's own reasoning can observe partial output (the streamed deltas are still consolidated for model context, but human observers see them in real time).

### 5.3 OpenAI Codex WebSocket Falls Back to SSE With Diagnostics (v0.73.0)

When the Codex WebSocket transport fails to set up, pi now transparently falls back to SSE and surfaces the transport-fallback information in the assistant message. Easier root-cause analysis when Codex transport misbehaves.

### 5.4 Bedrock Skips Unknown Content Blocks Instead of Failing (v0.75.1)

A defensive fix that keeps Bedrock-backed runs from failing the entire stream on an unrecognized content block — useful for any future Bedrock proxy setups.

### 5.5 Azure / OpenAI Responses Error Formatting Prefixes HTTP Status (v0.75.1)

`errorMessage` now starts with the HTTP status code, so the auto-retry classifier correctly identifies transient 5xx/429 errors. Fewer "looks like an error string but isn't matched as retryable" misclassifications.

### 5.6 Anthropic Auto-Retry on Stream-End-Before-`message_stop` (v0.74.1)

Streams that ended without the terminator now retry automatically rather than failing the turn.

---

## 6. Forward-Compatible Plumbing and New Features GMI Can Adopt

These are not mandatory but represent capabilities GMI can pull in incrementally to simplify its codebase or expand its agent's repertoire.

### 6.1 `PI_CODING_AGENT_SESSION_DIR` Env Var (v0.71.0)

A drop-in environment-variable equivalent to the `--session-dir` CLI flag. Combined with v0.68.1's `~` expansion in `settings.json`'s `sessionDir`, GMI can move session-directory configuration out of `agent.ts` entirely, cleanly separating runtime configuration from invocation logic.

### 6.2 `--no-context-files` (`-nc`) (v0.67.4)

Disables automatic `AGENTS.md` / `CLAUDE.md` discovery for clean runs without project context injection. Useful for ad-hoc agent invocations where the project context is irrelevant or actively harmful (e.g., a sanitized triage run).

### 6.3 `after_provider_response` Extension Hook (v0.67.4)

Lets extensions inspect provider HTTP status codes and headers immediately after each response. GMI could use this to record provider-side metrics or surface rate-limit / quota state in the JSONL.

### 6.4 `terminate: true` Tool Results (v0.69.0)

Custom tools can end the current batch without paying for an automatic follow-up LLM turn. For specialized GMI tools whose result is itself the answer, this saves a round trip.

### 6.5 `argument-hint` Prompt-Template Frontmatter (v0.67.6)

GMI's `.pi/prompts/code-review.md` and `.pi/prompts/issue-triage.md` can declare argument hints; useful if those prompts ever get parameters.

### 6.6 TypeBox 1.x Migration Path (v0.69.0)

Pi migrates to upstream `typebox` 1.x while keeping a legacy alias for `@sinclair/typebox` so GMI's `github-context.ts` continues to work unchanged. The benefit: TypeBox 1.x validates tool arguments in eval-restricted runtimes (e.g., Cloudflare Workers) and is the documented direction for new extensions. GMI can migrate at its own pace without immediate pressure.

### 6.7 New Providers and Models (Various)

- **GPT-5.5 Codex** (`openai-codex/gpt-5.5`) with `xhigh` reasoning (v0.70.0).
- **Claude Opus 4.7** with improved Anthropic prompt-cache breakpoint placement (v0.67.4).
- **DeepSeek**, **Fireworks**, **Together AI**, **Mistral Medium 3.5**, **Moonshot AI**, **Cloudflare Workers AI**, **Cloudflare AI Gateway**, **Bedrock bearer-token auth**, **Azure Cognitive Services endpoints**, **Xiaomi MiMo Token Plan**.
- **Custom Anthropic-compatible adaptive thinking** via `compat.forceAdaptiveThinking` (v0.75.5).

GMI today is pinned to `openai`/`gpt-5.5`/`high`, but the broader provider matrix means future configuration changes have far more options without further upstream work.

### 6.8 Per-Provider Retry / Timeout Controls (v0.70.1, v0.70.2)

`retry.provider.{timeoutMs,maxRetries,maxRetryDelayMs}` lets GMI tune resilience per provider in `settings.json` instead of relying on built-in defaults. Combined with v0.70.2's fix to omit undefined values, this is now safe to configure piecemeal.

### 6.9 Suppressible Anthropic Extra-Usage Billing Warning (v0.70.3)

`warnings.anthropicExtraUsage` setting silences the noisy "extra usage" warning when it does not apply.

### 6.10 Image Generation Support (v0.74.1)

`@earendil-works/pi-ai` now supports image generation including built-in OpenRouter image generation. Out of scope for GMI today, but available if GMI ever needs to attach generated images to issue comments.

### 6.11 JSONC `models.json` Parsing (v0.73.1)

Comments and trailing commas are now allowed in `models.json`. Easier-to-author custom model files if GMI ever ships one.

### 6.12 Standard Unified Patch on Edit Tool Results (v0.75.5)

Edit tool results include a standard unified-patch detail for SDK consumers. Future GMI tooling that wants to surface diffs from agent edits has a structured input to work from.

### 6.13 Faster File Tools on Windows (v0.75.5)

Async filesystem operations during streaming. Irrelevant for the current Linux runners; future-proofs cross-platform contributors.

---

## 7. Governance and Maintenance Benefits

### 7.1 Earendil Works Organization Stewardship (v0.74.0)

The move from `badlogic/pi-mono` (a personal account) to `earendil-works/pi` (an organization) is governance, not API change, but it is a meaningful benefit:

- Multiple maintainers and bus-factor reduction.
- A long-term home for the project's npm scope, issue tracker, and release process.
- Aligns GMI's most critical upstream dependency with an organization that has explicit governance, rather than relying solely on a single individual's account.

### 7.2 First-Class Self-Update Migration Support (v0.73.1)

Even though GMI pins versions and does not use `pi update --self`, the existence of self-update support for the npm scope migration means standalone pi installations on contributor machines migrate cleanly. Reduces friction for any contributor who has pi installed globally.

### 7.3 Improved Standalone-Binary Coverage (v0.74.1, v0.75.2)

Windows ARM64 standalone binaries (v0.74.1) and Bun-compiled binary startup fixes (v0.75.2) broaden the set of environments where pi just works.

### 7.4 Better `pi update` Diagnostics on Old Node (v0.74.2)

`pi update` on Node 20 now explains that newer Pi releases require Node >= 22.19.0 instead of silently reporting a successful no-op update. Saves debugging time for contributors with a stale Node toolchain.

---

## 8. Cost-of-Upgrade vs. Benefits

The required code changes are small and contained:

1. Rename one dependency in `package.json` and regenerate `bun.lock`.
2. Update one import path in `.pi/extensions/github-context.ts`.
3. Refresh documentation references (versions, owner/scope URLs).
4. Verify the workflow's Node toolchain is >= 22.19.0 (the standard GitHub-hosted images already are).

Against this, GMI gets:

- A maintained upstream on the only path that will receive future fixes and releases.
- Roughly two dozen reliability and correctness fixes targeting `--mode json` / GitHub Actions specifically.
- A material upgrade to the package's supply-chain posture (`npm-shrinkwrap.json`, lifecycle-script allowlists, cleared audit findings).
- Two notable prompt-quality improvements (stable dates; XML-tagged context boundaries).
- Live bash streaming, which qualitatively transforms the experience of watching a long-running agent step in the Actions log.
- A `willRetry` signal that makes JSONL consumers correct on the first event rather than reactive.
- A broader provider and model matrix for future configuration.
- Several optional simplifications (env-var session dir, `typebox` 1.x, `--no-context-files`, `--no-builtin-tools`).

The benefit-to-effort ratio is high, and continuing to defer the upgrade compounds risk because the old `@mariozechner/pi-coding-agent` package will not be updated again.

---

## 9. Top Ten Benefits at a Glance

For quick reference and for use in PR descriptions or release notes:

| # | Benefit | Version |
|---|---------|---------|
| 1 | Maintained, governed upstream under Earendil Works (old scope deprecated) | v0.74.0 |
| 2 | Supply-chain hardening (`npm-shrinkwrap.json`, lifecycle allowlist, install smoke tests) | v0.75.4 |
| 3 | Incremental bash output streaming — no more "hung agent" appearance | v0.73.0 |
| 4 | OpenAI Codex WebSocket sessions closed on shutdown — no more hung JSON-mode processes in CI | v0.73.0 |
| 5 | XML-tagged system prompt / context file boundaries — cleaner ingestion of `AGENTS.md` | v0.75.0 |
| 6 | Stable `YYYY-MM-DD` dates in the system prompt — deterministic across runners | v0.67.67 |
| 7 | `grep` / `find` flag-injection fix — closes a real argument-handling weakness | v0.71.0 |
| 8 | Auto-retry on transient `Network connection lost.` errors | v0.67.67 |
| 9 | `willRetry` on `agent_end` events — accurate retry-vs-terminal classification for JSONL consumers | v0.75.4 |
| 10 | Cleared audit findings (`uuid`, `@anthropic-ai/sdk` GHSA-p7fg-763f-g4gf) | v0.70.0, v0.71.0 |

---

## 10. References

- Companion upgrade plan: [`pi-mono-upgrade-65.1-to-75.5.md`](./pi-mono-upgrade-65.1-to-75.5.md)
- Previous upgrade analysis: [`pi-mono-upgrade-57.1-to-65.1.md`](./pi-mono-upgrade-57.1-to-65.1.md)
- Feature utilization audit: [`pi-mono-feature-utilization.md`](./pi-mono-feature-utilization.md)
- New project home: [github.com/earendil-works/pi](https://github.com/earendil-works/pi)
- Migration announcement: [pi.dev/news/2026/5/7/pi-has-a-new-home](https://pi.dev/news/2026/5/7/pi-has-a-new-home)
- New npm package: [npmjs.com/package/@earendil-works/pi-coding-agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)
