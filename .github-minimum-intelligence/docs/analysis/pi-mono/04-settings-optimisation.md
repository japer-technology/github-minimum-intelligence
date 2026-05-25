# Implementation: Settings Optimisation

This document details the implementation plan for optimising pi's settings configuration to improve performance, cost efficiency, and output quality, as identified in the [implementation plan](implementation-plan.md).

---

## 1. Current State

The current `.pi/settings.json`:

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

This configures the essential provider, model, thinking, compaction, and retry settings. Several additional settings available in pi-coding-agent are not configured.

---

## 2. Available Settings Not Currently Configured

| Setting | Type | Default | Description |
|---|---|---|---|
| `thinkingBudgets` | object | Built-in defaults | Custom token budgets per thinking level |
| `hideThinkingBlock` | boolean | `false` | Hide thinking blocks in output |
| `quietStartup` | boolean | `false` | Hide startup header |
| `branchSummary.reserveTokens` | number | `16384` | Tokens reserved for branch summarisation |
| `branchSummary.skipPrompt` | boolean | `false` | Skip "Summarise branch?" prompt |
| `enabledModels` | string[] | All | Model patterns for cycling |
| `shellCommandPrefix` | string | — | Prefix for every bash command |
| `enableSkillCommands` | boolean | `true` | Register skills as `/skill:name` commands |

Additionally, the `PI_CACHE_RETENTION` environment variable controls extended prompt caching but is not set in the workflow.

---

## 3. Recommended Changes

### 3.1 Extended Prompt Caching (`PI_CACHE_RETENTION`)

**What:** Set `PI_CACHE_RETENTION=long` in the workflow environment to enable extended prompt caching.

**Effect:**
- **Anthropic:** Cache TTL increases from default (~5 minutes) to 1 hour
- **OpenAI:** Cache TTL increases from default to 24 hours

**Why:** In a GitHub Actions environment, multiple issue conversations may use similar system prompts and context within a short time window. Extended caching reduces token costs by reusing cached prompt prefixes across workflow runs.

**Implementation:**

```diff
 # In .github/workflows/github-minimum-intelligence-agent.yml
 env:
   ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
   OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
+  PI_CACHE_RETENTION: long
```

**Cost impact:** Prompt caching reduces input token costs. With Anthropic, cached input tokens are charged at 10% of the full rate. With OpenAI, cached input tokens are charged at 50% of the full rate.

---

### 3.2 Thinking Budgets (`thinkingBudgets`)

**What:** Configure explicit token budgets for each thinking level to control costs.

**Why:** The default thinking budgets may be unnecessarily generous for a CI-environment agent. Setting explicit budgets ensures predictable token usage per conversation turn.

**Recommended configuration:**

```json
{
  "thinkingBudgets": {
    "minimal": 1024,
    "low": 4096,
    "medium": 10240,
    "high": 32768
  }
}
```

**Trade-off:** Lower budgets reduce cost but may limit the model's ability to reason through complex tasks. The `high` level at 32768 tokens is sufficient for most code analysis and generation tasks. If the agent struggles with complex multi-step reasoning, increase `high` to 65536.

**Decision:** Defer this change unless cost becomes a concern. The default budgets are reasonable for the current usage pattern.

---

### 3.3 Quiet Startup (`quietStartup`)

**What:** Set `quietStartup: true` to suppress the startup header in output.

**Why:** In `--mode json`, the startup header is included in the JSONL event stream. While it doesn't affect functionality, suppressing it reduces output noise and slightly improves log readability.

**Implementation:**

```diff
 {
   "defaultProvider": "openai",
   "defaultModel": "gpt-5.4",
   "defaultThinkingLevel": "high",
+  "quietStartup": true,
```

**Impact:** Minimal. Purely cosmetic for headless operation.

---

### 3.4 Hide Thinking Blocks (`hideThinkingBlock`)

**What:** Set `hideThinkingBlock: true` to suppress thinking blocks from the JSONL output stream.

**Why:** The agent's `jq` pipeline already filters for `type == "text"` content, ignoring thinking blocks. Setting this flag at the pi level prevents thinking blocks from being emitted at all, reducing JSONL file size and `tee` output volume.

**Trade-off:** If [LLM reasoning transparency](../toulmin-6-llm-reasoning-transparency-implementation.md) is implemented (capturing thinking blocks for audit), this setting must remain `false`. The two features are mutually exclusive.

**Decision:** Do **not** enable this if reasoning transparency is planned. Enable only if thinking blocks are definitively not needed.

---

### 3.5 Shell Command Prefix (`shellCommandPrefix`)

**What:** Set a prefix that is prepended to every bash command the agent executes.

**Why:** Useful for setting shell options that improve reliability:

```json
{
  "shellCommandPrefix": "set -euo pipefail;"
}
```

**Trade-off:** `set -e` causes commands to fail on first error, which may break some multi-step commands the agent constructs. `set -u` causes undefined variable references to fail, which may break commands that rely on optional variables.

**Decision:** Defer. The agent's bash commands are constructed by the LLM and may not be compatible with strict shell options. This is better addressed per-command rather than globally.

---

## 4. Proposed Settings File

Incorporating the recommended changes:

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-5.4",
  "defaultThinkingLevel": "high",
  "quietStartup": true,
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

And the workflow environment addition:

```yaml
env:
  PI_CACHE_RETENTION: long
```

---

## 5. Implementation Steps

### Step 1: Add `PI_CACHE_RETENTION` to Workflow

```diff
 # In .github/workflows/github-minimum-intelligence-agent.yml, run-agent env block
 env:
   ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
   OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
+  PI_CACHE_RETENTION: long
```

### Step 2: Add `quietStartup` to Settings

```diff
 {
   "defaultProvider": "openai",
   "defaultModel": "gpt-5.4",
   "defaultThinkingLevel": "high",
+  "quietStartup": true,
   "compaction": {
```

### Step 3: Monitor Token Usage

After deploying the changes, monitor:

- **Cache hit rate:** Check if prompt caching is effective across workflow runs
- **Token usage per conversation:** Compare before and after to quantify savings
- **Agent behaviour:** Verify no regression in response quality

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `PI_CACHE_RETENTION` not supported by provider | Low | None | Unsupported providers ignore the variable |
| `quietStartup` hides useful debug info | Low | Low | Startup info is still in JSONL events; check `/tmp/agent-raw.jsonl` |
| Thinking budget too low | Low | Medium | Monitor agent performance; increase budget if reasoning quality degrades |
| Cache eviction between runs | Medium | Low | Cache is best-effort; no functional dependency on cache hits |

---

## 7. Summary

Two immediate changes provide measurable benefit with zero risk: adding `PI_CACHE_RETENTION=long` to the workflow environment (reduces token costs via extended prompt caching) and adding `quietStartup: true` to settings (reduces output noise). Thinking budgets and shell command prefix are deferred unless specific cost or reliability concerns emerge. The `hideThinkingBlock` setting should remain `false` if LLM reasoning transparency is planned.

*Estimated effort: 15 minutes. Risk: Minimal.*
