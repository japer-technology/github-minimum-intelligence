# Ramifications of v0.65.1: Maximising pi-mono for GMI

The upgrade from v0.57.1 to v0.65.1 brought 17 releases of improvements into GMI's runtime. This document analyses the *ramifications* — what v0.65.1 unlocks, what it demands, and what it means for extracting maximum value from pi-mono as the agent substrate.

---

## 1. What v0.65.1 Changed About GMI's Ceiling

Before the upgrade, GMI was running on a version with known defects in its core pipeline: bash output truncation, concurrent file mutation races, compaction message drops, and unclean JSONL output. These weren't theoretical risks — they were active reliability limits. Removing them doesn't just fix bugs; it raises the ceiling on what GMI can reliably attempt.

| Capability | Before (v0.57.1) | After (v0.65.1) | Ramification |
|---|---|---|---|
| Bash output | Truncated at 2000 lines | Full output persisted to temp file | Agent can now safely run commands with large output (test suites, build logs, large diffs) without silent data loss |
| File mutations | Race conditions on concurrent edit+write | Serialized in request order | Agent can do rapid multi-file edits without corruption — enables more ambitious refactoring |
| Compaction | Messages dropped on repeated compaction | Re-summarises from kept boundary | Long conversations (10+ turns on a single issue) are now reliable, not degrading |
| JSONL output | Startup chatter contaminated stdout | Clean protocol stream | The `tac` + `jq` extraction pipeline is now robust, not fragile |
| Tool execution | Sequential | Parallel | Multi-tool turns (grep + read + bash) run concurrently — directly reduces Actions billing |
| Startup time | All provider SDKs loaded | Lazy loading on first use | Faster cold start in Actions — only the configured provider loads |
| Edit schema | Mixed single/multi-edit shapes | `edits[]` as sole schema | Fewer invalid tool calls and retries — more tokens spent on work, less on schema errors |

**The ramification:** GMI is no longer constrained by its runtime. The constraints have shifted upstream to *what GMI asks the agent to do* and *how well it equips the agent to do it*.

---

## 2. The promptSnippet Mandate

The v0.59.0 breaking change — custom tools without `promptSnippet` are excluded from the system prompt — has a ramification beyond the immediate fix already applied to `github-context.ts`.

**Every future extension must include `promptSnippet`.**

This is not optional. Without it, the tool exists in the runtime but is invisible to the LLM. The extension loads, the tool registers, the handler runs — but the LLM never calls it because it doesn't know it exists. This is a silent failure mode: no error, no warning, just a tool that never fires.

**Ramification for the extension plans (03-extension-enhancements.md):** All four proposed extensions (permission-gate, path-protection, github-issue-context, agent-metadata) use event hooks (`on("tool_call")`, `on("before_agent_start")`), not registered tools. Event hooks don't need `promptSnippet` — they intercept, they don't advertise. But the `github-issue-context` extension proposes three new tools (`github_issue_context`, `github_issue_comments`, `github_pr_status`). Each of these **must** include `promptSnippet` or the upgrade renders them invisible.

**Ramification for the skill system:** Custom skills discovered from `.pi/skills/` define their interface in `SKILL.md`. Skills are not affected by the `promptSnippet` requirement — they operate through markdown instructions, not tool registration. The distinction matters: skills teach the LLM a workflow; extensions give it a function.

---

## 3. Parallel Tool Execution: Implications for Extension Design

v0.58.0 made extension tool calls execute in parallel by default. This has three non-obvious ramifications:

### 3.1 Shared State is Now Unsafe

If two extensions modify the same global state (a log file, a counter, a shared variable), parallel execution creates a race condition. GMI's current single extension (`github-context.ts`) has no shared state, but the proposed extensions in 03-extension-enhancements.md introduce event-intercepting extensions that evaluate tool calls against pattern lists. If `permission-gate.ts` and `path-protection.ts` both intercept the same `tool_call` event, they run concurrently. Both are stateless pattern matchers — safe for parallel execution. But any future extension that accumulates state (e.g., a call counter, a rate limiter, a conversation log) must be designed for concurrent access.

### 3.2 Order of Interception is Not Guaranteed

Multiple `on("tool_call")` handlers may fire in any order. If `permission-gate.ts` blocks a `bash rm -rf /` command, but `path-protection.ts` also intercepts the same call, the first `{ block: true }` response wins. The second handler may or may not execute. Design extensions to be independently correct — don't rely on another extension having already filtered a call.

### 3.3 Parallel Tool Calls Amplify Token Savings

When the LLM calls `grep` + `read` + `ls` in a single turn, all three execute concurrently. The wall-clock time is `max(grep, read, ls)` rather than `sum(grep, read, ls)`. This directly reduces GitHub Actions minutes. The ramification: **enabling more tools (`grep`, `find`, `ls`) is more valuable at v0.65.1 than it was at v0.57.1**, because the additional tools can run in parallel with existing ones instead of competing for sequential execution slots.

---

## 4. Compaction Correctness: Unlocking Long Conversations

The v0.63.1 fix for repeated compaction dropping messages is the most consequential reliability fix in the upgrade. Before this fix, long multi-turn issue conversations had a degradation cliff: after enough turns, compaction would lose messages, the agent would lose context, and responses would become incoherent. The agent effectively had a conversation half-life.

**Ramification for settings:** GMI's current compaction settings (`keepRecentTokens: 30000`, `reserveTokens: 16384`) were chosen conservatively because compaction was unreliable. With the fix in place, these values can be re-evaluated:

| Setting | Current | Consideration |
|---|---|---|
| `keepRecentTokens` | 30000 | Could be increased further. With reliable compaction, the cost of compacting (summarisation tokens) is now predictable, and more recent context improves response quality |
| `reserveTokens` | 16384 | Controls how much buffer is kept free for the model's response. 16K is generous for most responses. Could be decreased to 8192 if the model consistently generates shorter responses, freeing more context for conversation history |

**Ramification for multi-agent conversations:** If GMI conversations regularly exceed 15–20 turns (e.g., long-running issues with multiple sub-tasks), compaction correctness means the agent can now maintain coherent context across the entire conversation. This enables use cases that were previously impractical: multi-day issue resolution, iterative code review with multiple rounds of feedback, and complex multi-step refactoring guided by conversation.

---

## 5. `defineTool()` and `ctx.signal`: Modernising Extensions

v0.65.0 introduced `defineTool()` — a standalone helper for creating custom tool definitions with full TypeScript parameter type inference. v0.63.2 introduced `ctx.signal` for cancellation forwarding.

### 5.1 `defineTool()` Ramification

The current `github-context.ts` uses the older `pi.registerTool({...})` pattern. `defineTool()` provides:

- Full TypeScript type inference for parameters — no need for `any` casts on `params`
- Standalone tool definitions that can be imported and tested independently
- Consistent tool definition shape across the codebase

**Ramification:** When adding new tools (the three proposed in `github-issue-context.ts`), prefer `defineTool()` over `registerTool()`. This creates a consistency debt with the existing `github-context.ts`, which should be migrated at the same time to avoid two styles in the extensions directory.

### 5.2 `ctx.signal` Ramification

`github-context.ts` currently uses `execSync` — a blocking call with a 15-second timeout. With `ctx.signal`, the extension can forward cancellation from pi into the subprocess:

```
Current:  execSync("gh repo view ...", { timeout: 15_000 })
Possible: execFile("gh", [...], { signal: ctx.signal })
```

**Ramification:** If the user cancels a conversation mid-turn (rare in `--mode json`, but possible via workflow cancellation), the `gh` subprocess is killed immediately instead of running to its 15-second timeout. This is a minor improvement for a single tool, but becomes significant as more tools are added — three new `gh`-calling tools means three potential 15-second zombie processes on cancellation without `ctx.signal`.

---

## 6. `sessionDir` Setting: Separating Configuration from Invocation

v0.63.0 allows `sessionDir` in `settings.json` instead of `--session-dir` on the CLI. Currently, `agent.ts` computes the session directory path at runtime and passes it via `--session-dir`.

**Ramification:** Moving `sessionDir` to `settings.json` would remove one argument from the `agent.ts` pi invocation, making the CLI call simpler. However, the path is relative and depends on the working directory at the time pi resolves it. The `.pi/settings.json` lives in `.github-minimum-intelligence/.pi/`, so a relative `sessionDir` would resolve from there — which differs from the current resolution from `agent.ts`'s working directory.

**Verdict:** Defer. The current approach works, and the path resolution semantics need verification before migrating. The risk of getting the relative path wrong is high (sessions stored in the wrong directory = lost conversation continuity), and the reward is low (one fewer CLI flag).

---

## 7. Multi-Edit Tool: More Ambitious Refactoring

v0.63.0 introduced multi-edit support — one tool call can update multiple disjoint regions in the same file. Combined with the file mutation queue ordering fix (same version), the agent can now:

1. Edit three separate functions in the same file in one tool call
2. Guarantee edits apply in the specified order
3. Avoid the previous pattern of three separate `edit` tool calls with potential interleaving

**Ramification for token efficiency:** Each tool call has overhead — the LLM generates the tool call, pi executes it, and the result is returned to the LLM. Multi-edit reduces this overhead by 2/3 for a typical three-region edit. At `gpt-5.4` pricing, this translates to measurable per-conversation savings.

**Ramification for the agent's editing behaviour:** The LLM will naturally adopt the `edits[]` schema because v0.63.2 made it the only shape. There is no action required from GMI — this is a transparent improvement. But it's worth noting in evaluations: if the agent previously failed on complex multi-point edits, re-test — the failure mode may be resolved.

---

## 8. Maximising pi-mono: The Untapped Feature Map

Cross-referencing the upgrade doc, feature utilization audit, and implementation plan, here is the current state of pi-mono feature extraction:

### 8.1 Fully Utilised

| Feature | Status | Value Extracted |
|---|---|---|
| CLI `--mode json` | ✅ Active | Core pipeline |
| Session management | ✅ Active | Multi-turn continuity |
| Settings (provider, model, thinking) | ✅ Active | Model configuration |
| Compaction | ✅ Active | Long conversation support |
| Retry | ✅ Active | Transient failure resilience |
| `APPEND_SYSTEM.md` | ✅ Active | Behavioural guidelines |
| `BOOTSTRAP.md` | ✅ Active | Identity setup |
| `AGENTS.md` | ✅ Active | Project instructions |
| Skills (memory, skill-creator) | ✅ Active | Agent capabilities |
| Extension (github-context) | ✅ Active | Repository metadata |
| Prompt templates (code-review, issue-triage) | ✅ Active | Standardised workflows |
| Additional tools (grep, find, ls) | ✅ Active | Structured file search |

### 8.2 Available but Not Utilised — Highest ROI

| Feature | Effort | Impact | Blocker |
|---|---|---|---|
| `PI_CACHE_RETENTION=long` | 1 line in workflow | Token cost reduction (10% Anthropic, 50% OpenAI cached input rate) | None — pure configuration |
| `quietStartup: true` | 1 line in settings.json | Cleaner JSONL, slightly less output noise | None — pure configuration |
| Permission gate extension | ~50 lines TypeScript | Blocks destructive commands | None — uses existing event hooks |
| Path protection extension | ~40 lines TypeScript | Blocks writes to sensitive files | None — uses existing event hooks |
| brave-search skill | Install + API key | Web research capability | Requires `BRAVE_API_KEY` secret |
| Additional GitHub tools extension | ~120 lines TypeScript | Issue/PR context without `gh` construction | None — extends existing pattern |

### 8.3 Available but Appropriately Deferred

| Feature | Reason for Deferral |
|---|---|
| SDK migration | Subprocess works; high effort, medium reward |
| Web UI integration | Requires content curation; not core to agent function |
| Direct LLM API (`pi-ai`) | Adds second code path for marginal savings |
| `sessionDir` in settings | Path resolution semantics unverified |
| `thinkingBudgets` | Default budgets are adequate; tune only if cost is a concern |
| `shellCommandPrefix` | LLM-generated commands may not be compatible with `set -euo pipefail` |
| `hideThinkingBlock` | Conflicts with potential reasoning transparency implementation |

### 8.4 Not Applicable

| Feature | Reason |
|---|---|
| RPC mode | Bun runtime; SDK is the natural programmatic interface |
| `pi-mom` | Slack bot; GMI's interface is GitHub Issues |
| `pi-tui` | Terminal UI; GMI runs headless |
| `pi-pods` | GPU pod management; GMI uses hosted APIs |
| Interactive keybindings | `--mode json` is non-interactive |
| `enabledModels` cycling | No interactive model switching in CI |

---

## 9. The Maximum Extraction Path

To get the maximum from pi-mono at v0.65.1, the following actions are ordered by effort-to-impact ratio:

### Phase 0 — Configuration-Only (minutes, zero code)

1. **Add `PI_CACHE_RETENTION=long`** to the workflow `env:` block. Immediate token cost reduction on every conversation.
2. **Add `quietStartup: true`** to `.pi/settings.json`. Cleaner output, less noise in JSONL processing.

### Phase 1 — Security Extensions (hours, low risk)

3. **Add `permission-gate.ts`** extension. Intercepts `tool_call` events, blocks destructive bash patterns. No `promptSnippet` needed — event hooks are invisible to the LLM by design.
4. **Add `path-protection.ts`** extension. Blocks `write`/`edit` to sensitive paths (`.env`, `.github/workflows/`, `.git/`, keys). Same pattern as permission gate.

### Phase 2 — Capability Expansion (hours, medium effort)

5. **Add `github-issue-context.ts`** extension with three tools. **Must include `promptSnippet`** on all three tools (v0.59.0 mandate). Prefer `defineTool()` (v0.65.0) over `registerTool()`.
6. **Install brave-search skill**. Requires `BRAVE_API_KEY` repository secret. Project-local installation in `.pi/skills/brave-search/`.

### Phase 3 — Modernisation (hours, medium risk)

7. **Migrate `github-context.ts`** to use `defineTool()` and `ctx.signal`. Brings the existing extension in line with v0.65.0+ best practices.
8. **Re-evaluate compaction settings**. With reliable compaction, consider increasing `keepRecentTokens` beyond 30000 or decreasing `reserveTokens` to 8192 for conversations that consistently produce shorter responses.

### Phase 4 — Architecture (days, high effort — defer until needed)

9. **SDK migration**. Replace subprocess + `tee` + `tac` + `jq` with native TypeScript SDK. Only pursue when the subprocess pipeline hits a concrete limitation.

---

## 10. Risks of Maximisation

Extracting more from pi-mono is not risk-free:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Extension sprawl creates maintenance burden | Medium | Medium | Cap at 4–5 extensions; each must justify its existence |
| More tools = more ways the LLM can fail | Low | Medium | Built-in tools (grep, find, ls) are read-only; new tools should be read-only where possible |
| Security extensions create false sense of safety | Medium | High | Document that extensions are guardrails, not sandboxes. `bash` can bypass path protection |
| brave-search introduces external API dependency | Low | Medium | Free tier is generous (2000/month); degrade gracefully if key is missing |
| `PI_CACHE_RETENTION` increases cost if cache fills with stale prompts | Very Low | Low | Cache eviction is provider-managed; GMI doesn't control TTL beyond the hint |
| `defineTool()` migration breaks existing tool if schema changes | Low | High | Test migration in isolation; verify tool appears in system prompt post-migration |

---

## 11. Summary

v0.65.1 is not just a version bump — it's a capability unlock. The reliability fixes (bash truncation, compaction, file mutation races, JSONL output) removed the runtime as the bottleneck. The new features (parallel tools, multi-edit, `defineTool()`, `ctx.signal`, `sessionDir`) provide better primitives for building on top of pi-mono.

GMI currently utilises 12 of pi-mono's feature categories — a strong baseline. The maximum extraction path adds 6 more (cache retention, quiet startup, permission gate, path protection, issue context tools, web search) through a phased approach that starts with zero-code configuration changes and escalates to medium-effort extensions.

The most important ramification of v0.65.1 is strategic: **the constraint has moved from "can the runtime handle it" to "have we equipped the agent well enough."** Every feature added from this point is an investment in the agent's capability, not a workaround for runtime limitations.

*Analysis based on pi-mono v0.65.1 changelog, pi-mono-feature-utilization.md, pi-mono/ implementation plans, and GMI codebase as of 2026-04-08.*
