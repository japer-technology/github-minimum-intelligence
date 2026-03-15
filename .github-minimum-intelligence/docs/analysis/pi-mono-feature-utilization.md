# Analysis: pi-mono Feature Utilization

GitHub Minimum Intelligence depends on a single package from the [pi-mono](https://github.com/badlogic/pi-mono) monorepo — `@mariozechner/pi-coding-agent`. This document audits which pi-mono features GMI currently uses, which remain untapped, and which additions deliver the highest value for a "GitHub as Infrastructure" deployment where the agent runs non-interactively in `--mode json` inside GitHub Actions.

---

## 1. pi-mono Package Landscape

The monorepo publishes seven packages:

| Package | Description | Used by GMI |
|---|---|---|
| `@mariozechner/pi-coding-agent` | Interactive coding agent CLI | **Yes** (v0.57.1) |
| `@mariozechner/pi-ai` | Unified multi-provider LLM API | No (transitive only) |
| `@mariozechner/pi-agent-core` | Agent runtime with tool calling and state management | No (transitive only) |
| `@mariozechner/pi-web-ui` | Web components for AI chat interfaces | No |
| `@mariozechner/pi-mom` | Slack bot delegating to pi coding agent | No |
| `@mariozechner/pi-tui` | Terminal UI library with differential rendering | No (transitive only) |
| `@mariozechner/pi-pods` | CLI for managing vLLM deployments on GPU pods | No |

GMI installs only `pi-coding-agent` and relies on it both as a CLI binary and as the provider of the `.pi/` configuration contract (settings, skills, extensions, context files).

---

## 2. Features Currently Used

### 2.1 CLI Invocation (`--mode json`)

The agent spawns the `pi` binary as a subprocess:

```
pi --mode json --provider <P> --model <M> [--thinking <T>] --session-dir <D> -p <prompt> [--session <S>]
```

JSON mode emits newline-delimited events on stdout. The agent pipes output through `tee` for live logging and post-processes with `tac` + `jq` to extract the final assistant reply.

### 2.2 Session Management

Pi's built-in session system (`--session-dir`, `--session`) provides multi-turn conversation continuity across workflow runs. Session transcripts are stored as `.jsonl` files under `state/sessions/` and mapped per-issue via `state/issues/<N>.json`.

### 2.3 Settings (`.pi/settings.json`)

Three settings are configured:

| Setting | Value |
|---|---|
| `defaultProvider` | `openai` |
| `defaultModel` | `gpt-5.4` |
| `defaultThinkingLevel` | `high` |

### 2.4 System Prompt Extension (`APPEND_SYSTEM.md`)

A project-level `APPEND_SYSTEM.md` appends behavioral guidelines to pi's default system prompt, defining personality traits, memory system usage, and interaction philosophy.

### 2.5 Bootstrap Protocol (`BOOTSTRAP.md`)

First-run identity setup is handled via `BOOTSTRAP.md`, which guides the agent through self-discovery when triggered by the `hatch` label.

### 2.6 Context Files (`AGENTS.md`)

Pi loads `AGENTS.md` at startup for project-specific instructions and agent identity. GMI maintains this at `.github-minimum-intelligence/AGENTS.md`.

### 2.7 Skills (2 of 2 custom)

Two skills are installed in `.pi/skills/`:

| Skill | Purpose |
|---|---|
| `memory` | Search and recall from `state/memory.log` and session transcripts |
| `skill-creator` | Framework for creating new agent skills |

---

## 3. Features Not Used

### 3.1 Compaction Settings

Pi supports automatic context compaction to prevent context window exhaustion during long conversations. The default configuration is:

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

**Impact of omission:** Long multi-turn conversations on a single issue can exhaust the model's context window. Pi's default auto-compaction is enabled, but GMI does not tune `reserveTokens` or `keepRecentTokens` for its specific usage pattern (GitHub Actions with large tool outputs).

**Recommendation:** Configure compaction explicitly. GitHub Actions tool outputs (file diffs, build logs) tend to be large, so increasing `keepRecentTokens` preserves more recent context for accurate responses.

### 3.2 Retry Settings

Pi supports automatic retry with exponential backoff for transient LLM API errors:

```json
{
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000,
    "maxDelayMs": 60000
  }
}
```

**Impact of omission:** Transient rate-limit or server errors from LLM providers cause the pi process to exit non-zero, which the agent treats as a hard failure. The user sees a 👎 reaction and must re-trigger manually.

**Recommendation:** Enable retry explicitly. CI environments are particularly susceptible to rate-limit spikes during concurrent workflow runs.

### 3.3 Extensions (`.pi/extensions/`)

Pi loads TypeScript extensions that can register custom tools callable by the LLM, intercept events, and modify agent behaviour. Extensions work in all modes including `--mode json`.

**Impact of omission:** The agent relies solely on pi's four built-in tools (`read`, `write`, `edit`, `bash`). GitHub-specific operations (fetching issue metadata, listing PRs, querying Actions status) require the agent to construct `gh` CLI invocations from scratch each time.

**Recommendation:** Add a project-local extension providing GitHub-aware tools (issue context, PR summaries, workflow status) that reduce prompt complexity and improve response reliability.

### 3.4 Prompt Templates (`.pi/prompts/`)

Pi loads reusable prompt templates from `.pi/prompts/`. In non-interactive mode, these can be referenced by skills or included in the system context.

**Impact of omission:** Common patterns (code review, issue triage, release notes) are re-described in each user prompt rather than standardised.

**Recommendation:** Add prompt templates for recurring GitHub workflows. Skills and the system prompt can reference these for consistency.

### 3.5 Pi Packages

Pi supports installing third-party packages that bundle extensions, skills, prompts, and themes:

```bash
pi install npm:@foo/pi-tools
pi install git:github.com/user/repo
```

**Impact of omission:** Skills like `brave-search`, `transcribe`, and document processing from public repositories are not available.

**Recommendation:** Evaluate [pi-skills](https://github.com/badlogic/pi-skills) for web search capability. Project-local installs (`.pi/git/`, `.pi/npm/`) keep dependencies committed alongside the repo, consistent with the "GitHub as Infrastructure" principle.

### 3.6 SDK Mode

Pi exports a TypeScript SDK for programmatic usage:

```typescript
import { createAgentSession, SessionManager } from "@mariozechner/pi-coding-agent";
const { session } = await createAgentSession({ ... });
await session.prompt("What files are in the current directory?");
```

**Impact of omission:** The agent spawns pi as a subprocess and parses JSONL output with shell tools (`tac`, `jq`). This works but adds process overhead and fragile text extraction.

**Recommendation:** The SDK would eliminate the subprocess boundary and simplify output extraction. However, it requires restructuring `agent.ts` from shell-pipe orchestration to async/await TypeScript. This is a higher-effort change best deferred until the subprocess approach shows limitations.

### 3.7 RPC Mode

Pi supports a JSON-RPC mode over stdin/stdout for non-Node.js integrations:

```bash
pi --mode rpc
```

**Impact of omission:** Minimal. RPC mode targets integrations from languages other than JavaScript/TypeScript. Since agent.ts runs under Bun, the SDK (§3.6) is the more natural programmatic interface.

### 3.8 Web UI Package (`pi-web-ui`)

`@mariozechner/pi-web-ui` provides web components for AI chat interfaces with sessions, artifacts, and attachments.

**Impact of omission:** The public-fabric website uses a custom static page (`index.html` + `status.json`). It does not provide an interactive chat interface.

**Recommendation:** Evaluate for a future "live demo" page on public-fabric. The IndexedDB-backed storage and pre-built chat components could enable browser-based interaction without any backend, aligning with the zero-infrastructure principle. Not recommended for immediate adoption — the current static public-fabric is simpler and more appropriate for status/documentation.

### 3.9 Direct LLM API (`pi-ai`)

`@mariozechner/pi-ai` provides a unified streaming LLM API with automatic model discovery and cost tracking.

**Impact of omission:** All LLM interaction goes through the pi coding agent, which includes tool execution overhead. Lightweight tasks (summarising a comment, classifying an issue) could use the direct API at lower cost.

**Recommendation:** Defer. The coding agent's tool-calling capability is central to GMI's value proposition. Direct API usage would add a second dependency and a second code path for marginal efficiency gains.

---

## 4. Priority Matrix

| Feature | Effort | Impact | Priority |
|---|---|---|---|
| Compaction settings | Low | High | **P0** — prevents context exhaustion |
| Retry settings | Low | High | **P0** — resilience in CI environment |
| Extensions (GitHub tools) | Medium | High | **P1** — reduces prompt complexity |
| Prompt templates | Low | Medium | **P1** — standardises common workflows |
| Pi packages (web search) | Low | Medium | **P2** — adds web research capability |
| SDK migration | High | Medium | **P3** — simplifies architecture |
| Web UI integration | Medium | Low | **P3** — future enhancement |
| Direct LLM API | Medium | Low | **P4** — marginal optimisation |
| RPC mode | Low | None | **Skip** — not applicable |

---

## 5. Implementation: Settings Enhancement

The most impactful change with the smallest footprint is enhancing `.pi/settings.json` to configure compaction and retry behaviour explicitly:

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-5.4",
  "defaultThinkingLevel": "high",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 30000
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000,
    "maxDelayMs": 60000
  }
}
```

The `keepRecentTokens` value is set to 30 000 (above pi's default of 20 000) because GitHub Actions tool outputs — file diffs, build logs, `gh` CLI results — are typically larger than interactive coding session outputs. Retaining more recent context improves continuity in multi-turn issue conversations.

---

## 6. Implementation: Prompt Templates

Adding `.pi/prompts/` with templates for recurring GitHub workflows:

| Template | Purpose |
|---|---|
| `code-review.md` | Structured code review checklist |
| `issue-triage.md` | Issue classification and labelling |

These templates are loaded by pi at startup and available to the agent's context. Skills can reference them for consistent output formatting.

---

## 7. Implementation: GitHub Context Extension

A project-local extension at `.pi/extensions/github-context.ts` that registers a custom tool providing structured GitHub context to the LLM:

| Tool | Description |
|---|---|
| `github_repo_context` | Returns repository metadata (description, topics, default branch, visibility) via `gh` CLI |

This eliminates the need for the LLM to construct `gh api` calls from memory for common context-gathering operations, reducing prompt tokens and improving reliability.

---

## 8. Excluded Packages

Three pi-mono packages are not recommended for GMI integration:

| Package | Reason for Exclusion |
|---|---|
| `pi-mom` | Slack bot; GMI's interface is GitHub Issues, not Slack |
| `pi-tui` | Terminal UI; GMI runs headless in GitHub Actions |
| `pi-pods` | GPU pod management; GMI uses hosted LLM APIs, not self-hosted models |

---

## 9. Summary

GMI currently uses 7 of pi-mono's feature categories (CLI invocation, session management, settings, system prompt extension, bootstrap protocol, context files, and skills). The highest-impact additions are compaction and retry settings (zero-code, configuration-only), followed by prompt templates and a lightweight GitHub context extension.

The "GitHub as Infrastructure" principle is well served by pi-mono's project-local configuration model: all settings, skills, extensions, and prompt templates live in `.pi/` inside the committed repository. No host-level configuration, external databases, or runtime services are required — the entire agent configuration is versioned alongside the code it operates on.
