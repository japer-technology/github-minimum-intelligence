# Implementation Plan: pi-mono Feature Completion

This document outlines the implementation plan for features identified in [pi-mono-feature-utilization.md](../pi-mono-feature-utilization.md) that remain unimplemented, plus additional pi-mono capabilities discovered during a comprehensive audit of the [pi-mono repository](https://github.com/badlogic/pi-mono) (packages/coding-agent v0.57.1+).

---

## 1. Current State

### 1.1 Implemented Features

The original feature utilization audit identified 9 feature categories. Seven were already in use at the time of the audit, and two more (P0) have since been implemented:

| Feature | Priority | Status |
|---|---|---|
| CLI Invocation (`--mode json`) | — | ✅ In use |
| Session Management (`--session-dir`, `--session`) | — | ✅ In use |
| Settings (`.pi/settings.json`) | — | ✅ In use |
| System Prompt Extension (`APPEND_SYSTEM.md`) | — | ✅ In use |
| Bootstrap Protocol (`BOOTSTRAP.md`) | — | ✅ In use |
| Context Files (`AGENTS.md`) | — | ✅ In use |
| Skills (memory, skill-creator) | — | ✅ In use |
| Compaction Settings | P0 | ✅ Implemented |
| Retry Settings | P0 | ✅ Implemented |
| Extensions (github-context.ts) | P1 | ✅ Implemented |
| Prompt Templates (code-review, issue-triage) | P1 | ✅ Implemented |

### 1.2 Unimplemented Features (from original audit)

| Feature | Original Priority | Status |
|---|---|---|
| Pi Packages / pi-skills (web search) | P2 | ❌ Not implemented |
| SDK Migration | P3 | ❌ Not implemented |
| Web UI Integration | P3 | ❌ Not implemented |
| Direct LLM API | P4 | ❌ Not implemented |
| RPC Mode | Skip | ❌ Not applicable |

### 1.3 Features Not in Original Audit

A review of the current pi-mono coding agent README and settings documentation reveals additional capabilities not covered in the original audit:

| Feature | Category | Description |
|---|---|---|
| Additional built-in tools | CLI | `grep`, `find`, `ls` tools beyond the default `read,bash,edit,write` |
| Thinking budgets | Settings | Custom token budgets per thinking level (`thinkingBudgets`) |
| Shell command prefix | Settings | `shellCommandPrefix` for every bash command |
| `PI_CACHE_RETENTION` | Environment | Extended prompt caching (Anthropic: 1h, OpenAI: 24h) |
| Hide thinking blocks | Settings | `hideThinkingBlock` to suppress thinking in output |
| Branch summary | Settings | `branchSummary.reserveTokens` and `branchSummary.skipPrompt` |
| Model cycling | Settings | `enabledModels` for Ctrl+P model cycling |
| Quiet startup | Settings | `quietStartup` to hide startup header |
| Extension event hooks | Extensions | Rich lifecycle (tool_call interception, before_agent_start, context injection) |
| Custom commands | Extensions | `pi.registerCommand()` for `/command` registration |
| Session forking | CLI | `--fork` for branching conversations |
| File arguments | CLI | `@file` syntax for including files in prompts |
| Permission gates | Extensions | Block or confirm dangerous operations |
| Path protection | Extensions | Block writes to sensitive files |
| Custom compaction | Extensions | `session_before_compact` event hook |
| Git checkpointing | Extensions | Stash/restore at each turn |

---

## 2. Revised Priority Matrix

Incorporating both the original audit items and newly discovered features, prioritised for a headless GitHub Actions deployment:

| Feature | Effort | Impact | Priority | Plan |
|---|---|---|---|---|
| Additional built-in tools (`grep`, `find`, `ls`) | Low | High | **P1** | [01-additional-tools.md](01-additional-tools.md) |
| Pi Skills — brave-search | Medium | High | **P1** | [02-pi-skills-web-search.md](02-pi-skills-web-search.md) |
| Extension suite (permission gates, path protection) | Medium | High | **P2** | [03-extension-enhancements.md](03-extension-enhancements.md) |
| Settings optimisation (cache retention, thinking budgets) | Low | Medium | **P2** | [04-settings-optimisation.md](04-settings-optimisation.md) |
| SDK migration | High | Medium | **P3** | [05-sdk-migration.md](05-sdk-migration.md) |
| Web UI integration | Medium | Low | **P3** | [06-web-ui-integration.md](06-web-ui-integration.md) |
| Direct LLM API | Medium | Low | **P4** | Deferred — see §5 |
| RPC Mode | Low | None | **Skip** | Not applicable |

---

## 3. Implementation Order

### Phase 1 — Low-effort, high-impact (configuration-only)

1. **Enable additional built-in tools** — Add `grep`, `find`, `ls` to the pi invocation via `--tools` flag. Zero code change in `agent.ts`; alternatively configure in `.pi/settings.json`. These tools give the agent structured file search and directory listing without relying on bash one-liners.

2. **Settings optimisation** — Add `PI_CACHE_RETENTION=long` environment variable to the workflow, configure `thinkingBudgets` for cost control, and add `hideThinkingBlock: true` to reduce JSONL output noise.

### Phase 2 — Medium-effort, high-impact (new files, minor code changes)

3. **Pi Skills — brave-search** — Install the `brave-search` skill from [pi-skills](https://github.com/badlogic/pi-skills) as a project-local package. Requires a `BRAVE_API_KEY` secret and `npm install` in the skill directory.

4. **Extension enhancements** — Add extensions for permission gates (block `rm -rf`, `sudo`, etc.), path protection (block writes to `.env`, `node_modules/`, `.github/`), and agent response metadata injection.

### Phase 3 — High-effort, medium-impact (architecture changes)

5. **SDK migration** — Replace the subprocess + `tee` + `tac` + `jq` pipeline with direct TypeScript SDK usage. Requires restructuring `agent.ts` from shell-pipe orchestration to async/await event processing.

### Phase 4 — Future enhancements

6. **Web UI integration** — Evaluate `@mariozechner/pi-web-ui` for an interactive chat page on public-fabric.

---

## 4. Feature Plan Documents

Each feature has a dedicated implementation plan document in this directory:

| Document | Feature | Priority |
|---|---|---|
| [01-additional-tools.md](01-additional-tools.md) | Enable `grep`, `find`, `ls` built-in tools | P1 |
| [02-pi-skills-web-search.md](02-pi-skills-web-search.md) | Install brave-search skill for web research | P1 |
| [03-extension-enhancements.md](03-extension-enhancements.md) | Permission gates, path protection, metadata | P2 |
| [04-settings-optimisation.md](04-settings-optimisation.md) | Cache retention, thinking budgets, output control | P2 |
| [05-sdk-migration.md](05-sdk-migration.md) | Replace subprocess with TypeScript SDK | P3 |
| [06-web-ui-integration.md](06-web-ui-integration.md) | Interactive chat on public-fabric | P3 |

---

## 5. Deferred Features

### 5.1 Direct LLM API (`pi-ai`)

`@mariozechner/pi-ai` provides a unified streaming LLM API with automatic model discovery and cost tracking. It could be used for lightweight tasks (summarising a comment, classifying an issue) at lower cost than the full coding agent.

**Why deferred:** The coding agent's tool-calling capability is central to GMI's value proposition. Direct API usage would add a second dependency and a second code path for marginal efficiency gains. The cost difference is minimal when the agent already handles tool execution overhead as part of its core loop.

**Revisit when:** Per-token cost becomes a concern, or a use case emerges that specifically needs raw LLM output without tool calling (e.g., automated PR summaries at scale).

### 5.2 RPC Mode

Pi supports JSON-RPC mode over stdin/stdout for non-Node.js integrations. Since `agent.ts` runs under Bun (a JavaScript runtime), the SDK (§5) is the natural programmatic interface. RPC mode adds protocol overhead with no benefit in this environment.

**Recommendation:** Skip permanently.

---

## 6. Dependencies and Prerequisites

| Feature | Prerequisites |
|---|---|
| Additional tools | None (configuration-only) |
| Pi Skills — brave-search | `BRAVE_API_KEY` secret, `npm install` in skill directory |
| Extension enhancements | None (uses existing extension infrastructure) |
| Settings optimisation | None (configuration-only) |
| SDK migration | Understanding of pi-coding-agent SDK API, significant agent.ts refactor |
| Web UI integration | `@mariozechner/pi-web-ui` package evaluation, public-fabric architecture decision |

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Additional tools increase attack surface | Low | Medium | Tools are read-only (`grep`, `find`, `ls`); no write capability |
| brave-search API key exposure | Low | High | Use GitHub encrypted secrets; never log the key |
| Permission gate false positives | Medium | Low | Start with conservative allowlist; tune based on agent behavior |
| SDK migration breaks output pipeline | Medium | High | Implement behind feature flag; keep subprocess fallback |
| pi-coding-agent version drift | Low | Medium | Pin version in package.json; test upgrades in staging |

---

## 8. Success Criteria

| Feature | Metric |
|---|---|
| Additional tools | Agent successfully uses `grep`/`find`/`ls` tools instead of bash equivalents |
| brave-search | Agent can answer questions requiring current web information |
| Extension enhancements | Dangerous operations are blocked; sensitive files are protected |
| Settings optimisation | Reduced token usage per conversation; extended cache hit rates |
| SDK migration | Same functional behaviour; eliminated shell pipeline; cleaner error handling |
| Web UI integration | Interactive chat available at public-fabric URL |

---

## 9. Summary

Of the 9 feature categories in the original pi-mono audit, all P0 and P1 items have been implemented (compaction, retry, extensions, prompt templates). The remaining unimplemented features are P2–P4 items (pi packages, SDK migration, web UI, direct LLM API) plus newly discovered capabilities not in the original audit (additional built-in tools, thinking budgets, cache retention, permission gates, path protection).

The revised priority matrix promotes **additional built-in tools** and **pi-skills web search** to P1 based on their high impact and alignment with the "GitHub as Infrastructure" principle. Both require minimal code changes — tools are a CLI flag addition, and skills use pi's existing project-local installation mechanism.

The highest-effort item remains the **SDK migration** (P3), which would replace the subprocess + shell pipeline with native TypeScript integration. This is deferred until the current subprocess approach shows concrete limitations.

*Analysis based on pi-mono repository (github.com/badlogic/pi-mono), pi-coding-agent v0.57.1, and GMI codebase as of 2026-03-30.*
