# Implementation: Additional Built-in Tools

This document details the implementation plan for enabling pi's additional built-in tools (`grep`, `find`, `ls`) in the GMI agent, as identified in the [implementation plan](implementation-plan.md).

---

## 1. Current State

Pi's default tool set is `read,bash,edit,write`. The agent currently relies on the `bash` tool for all file search and directory listing operations, requiring the LLM to construct shell commands from memory:

```bash
# Current approach — agent constructs these via bash tool
find . -name "*.ts" -type f
grep -rn "TODO" src/
ls -la .github-minimum-intelligence/
```

Pi also ships three additional built-in tools that are not enabled by default:

| Tool | Purpose | Equivalent bash |
|---|---|---|
| `grep` | Pattern search across files with structured output | `grep -rn` / `rg` |
| `find` | File discovery by name, type, size, modification time | `find` |
| `ls` | Directory listing with metadata | `ls -la` |

---

## 2. Why Enable These Tools

### 2.1 Structured Output

Built-in tools return structured data that the LLM can parse reliably, rather than requiring the LLM to parse bash output (which varies by platform, locale, and command flags).

### 2.2 Reduced Token Usage

A tool call like `grep(pattern: "TODO", path: "src/")` is more token-efficient than constructing a bash command string, interpreting the output format, and handling edge cases (binary files, permission errors, etc.).

### 2.3 Safety

Built-in tools are read-only. Unlike `bash`, they cannot modify the filesystem, execute arbitrary code, or make network requests. Enabling them gives the agent efficient read access without expanding the write surface.

### 2.4 Reliability

The LLM occasionally constructs incorrect bash flags (e.g., GNU vs BSD `grep` differences, missing `--` separators for filenames with dashes). Built-in tools abstract these platform differences.

---

## 3. Implementation Options

### Option A: CLI Flag in `agent.ts`

Add `--tools read,bash,edit,write,grep,find,ls` to the pi invocation arguments:

```typescript
// In agent.ts, piArgs construction (around line 309)
const piArgs = [
  piBin,
  "--mode", "json",
  "--tools", "read,bash,edit,write,grep,find,ls",
  "--provider", configuredProvider,
  "--model", configuredModel,
  ...(configuredThinking ? ["--thinking", configuredThinking] : []),
  "--session-dir", sessionsDirRelative,
  "-p", prompt,
];
```

**Pros:** Explicit, visible in code, no settings file change.
**Cons:** Adds a hard-coded tool list to agent.ts; must be updated if pi adds new tools.

### Option B: No Change Required

Pi's default tool set (`read,bash,edit,write`) already includes `bash`, which can perform all the operations that `grep`, `find`, and `ls` provide. The LLM can already search files, list directories, and find patterns via bash commands.

The additional tools are convenience wrappers that improve token efficiency and reliability. If the LLM is performing well with bash-based approaches, this change provides marginal benefit.

**Recommendation:** **Option A** — Explicit tool enablement via CLI flag. The structured output from built-in tools reduces token waste and improves reliability, especially for large repositories where bash `grep` output can be verbose.

---

## 4. Implementation Steps

### Step 1: Update `agent.ts`

Add the `--tools` flag to the pi invocation:

```diff
 const piArgs = [
   piBin,
   "--mode", "json",
+  "--tools", "read,bash,edit,write,grep,find,ls",
   "--provider", configuredProvider,
   "--model", configuredModel,
```

### Step 2: Verify in Local Test

Run the agent with a test issue that requires file search operations. Verify that the agent uses the `grep`, `find`, or `ls` tools instead of constructing bash equivalents.

### Step 3: Monitor Token Usage

Compare token usage before and after enabling additional tools across several issue conversations. The built-in tools should reduce total tokens by avoiding verbose bash output parsing.

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tool name conflicts with extensions | Low | Low | Built-in tool names (`grep`, `find`, `ls`) are standard; unlikely to conflict with custom extensions |
| LLM confusion with more tool options | Low | Low | These tools have clear, distinct purposes; modern LLMs handle tool selection well |
| Behaviour change in existing conversations | Low | Low | Session continuity preserves context; new tool availability is additive |

---

## 6. Rollback Plan

Remove the `--tools` flag from `agent.ts`. Pi will revert to its default tool set (`read,bash,edit,write`). No session data or configuration is affected.

---

## 7. Summary

Enabling `grep`, `find`, and `ls` as built-in tools is a single-line change in `agent.ts` that gives the agent structured, read-only file search and directory listing capabilities. The change reduces token usage, improves reliability across platforms, and does not expand the write surface. This is the lowest-effort, highest-return item in the implementation plan.

*Estimated effort: 15 minutes. Risk: Minimal.*
