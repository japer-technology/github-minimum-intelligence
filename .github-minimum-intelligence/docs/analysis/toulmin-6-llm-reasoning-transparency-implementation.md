# Implementation Outline: LLM Reasoning Transparency

This document outlines the concrete changes required to implement Recommendation 6 from [Toulmin Lessons](toulmin-lessons.md) — capturing and surfacing the agent's chain-of-thought alongside its output, closing the transparency gap between auditable actions and opaque intent.

---

## 1. Current State

The infrastructure for reasoning transparency is partially in place. The following table summarizes what exists and what is missing:

| Component | Current State | Gap |
|---|---|---|
| Thinking-level output from the model | Enabled — `defaultThinkingLevel: "high"` in `.pi/settings.json` | None |
| Pi JSON mode event stream | Active — `--mode json` emits JSONL with `thinking` content blocks | None |
| Capture of thinking blocks | **Missing** — `jq` pipeline in `agent.ts` filters to `type == "text"` only, discarding `type == "thinking"` blocks | Core gap |
| Reasoning storage | **Missing** — no `state/reasoning/` directory exists | Storage gap |
| Reasoning display to user | **Missing** — only final text content is posted as an issue comment | Presentation gap |
| Commit-level reasoning metadata | **Missing** — commit messages are generic (`minimum-intelligence: work on issue #N`) | Traceability gap |

---

## 2. Changes to `lifecycle/agent.ts`

This is where the majority of implementation work occurs. Four distinct modifications are needed.

### 2.1 Extract Thinking Blocks from Pi Output

**Current behavior** (approximate lines 348–354): A `tac` + `jq` pipeline extracts only the final assistant `text` content from `/tmp/agent-raw.jsonl`, discarding all `thinking` blocks.

**Required change**: Add a second `jq` extraction pass that pulls `thinking` content from the JSONL stream. The thinking blocks appear as `{ "type": "thinking", "thinking": "..." }` within `message.content[]` arrays on `assistant` role messages.

```
jq -r 'select(.message.role == "assistant")
  | .message.content[]?
  | select(.type == "thinking")
  | .thinking' /tmp/agent-raw.jsonl
```

**Considerations**:

- Thinking blocks can be large (tens of thousands of tokens at `high` level). The extraction should concatenate them in chronological order, not reversed via `tac`.
- Multiple assistant messages may each contain thinking blocks; all should be captured.
- If no thinking blocks are present (e.g., model does not support extended thinking), the result should gracefully be empty.

### 2.2 Persist Reasoning to `state/reasoning/`

**Required change**: After extracting thinking content, write it to a file at `state/reasoning/<issueNumber>-<timestamp>.md` with structured frontmatter.

The file should contain:

| Section | Content |
|---|---|
| **Header** | Issue number, timestamp, model, provider |
| **Key Observations** | Extracted from thinking blocks — the codebase observations that informed the decision |
| **Alternatives Considered** | Extracted or summarized from thinking — approaches evaluated and rejected |
| **Confidence & Limitations** | Any hedging language or uncertainty expressed in thinking |
| **Full Transcript** | Complete thinking block text for post-hoc review |

**Considerations**:

- The `state/reasoning/` directory must be created if it does not exist (`mkdir -p`).
- Files should be committed alongside code changes so they are preserved in Git history.
- A `.gitattributes` entry (`state/reasoning/*.md merge=union`) could prevent merge conflicts on concurrent runs, consistent with the existing `memory.log merge=union` pattern.

### 2.3 Post Reasoning Summary as Issue Comment

**Current behavior** (approximate lines 357–363): The agent posts the extracted assistant text as a single issue comment via `gh issue comment`.

**Required change**: Before posting the final code-change comment, post a separate reasoning summary comment (or prepend a collapsible reasoning section to the existing comment). The summary should include:

- A brief statement of the key observations from the codebase
- Alternative approaches considered and why they were rejected
- Confidence level and known limitations

**Format recommendation**: Use a collapsible `<details>` block to keep the comment scannable:

```markdown
<details>
<summary>🧠 Reasoning Transparency</summary>

### Key Observations
- ...

### Alternatives Considered
- ...

### Confidence & Limitations
- ...

</details>
```

**Considerations**:

- The reasoning summary must be shorter than the full thinking transcript. A truncation or summarization strategy is needed — either extract the first N characters, or instruct the agent (via prompt) to produce a structured reasoning summary as part of its output.
- The `MAX_COMMENT_LENGTH` constant (currently 60 000) applies to the combined comment body. The reasoning section should be budgeted within this limit.
- If thinking content is empty (model did not produce it), the reasoning section should be omitted entirely rather than posting an empty block.

### 2.4 Enrich Commit Messages with Reasoning Reference

**Current behavior**: Commit messages are static strings: `minimum-intelligence: work on issue #<N>`.

**Required change**: Append a reference to the reasoning file in the commit message body (not the subject line), for example:

```
minimum-intelligence: work on issue #42

Reasoning: state/reasoning/42-2026-03-29T03-01-43.md
```

This creates a direct link from Git history to the reasoning transcript without changing the subject-line convention.

---

## 3. Changes to Pi Settings and Configuration

### 3.1 Verify Thinking-Level Output Capture

**File**: `.pi/settings.json`

No change needed to the settings file itself — `defaultThinkingLevel: "high"` is already configured. However, verify that the `--thinking high` flag is actually being passed to pi at runtime. In `agent.ts`, the flag is conditionally included:

```typescript
...(configuredThinking ? ["--thinking", configuredThinking] : [])
```

This reads `configuredThinking` from the settings. If the field is missing or empty, thinking is silently disabled. Add a log line confirming the thinking level at startup.

### 3.2 Evaluate Pi JSON Mode Event Coverage

Confirm that pi's `--mode json` output includes `thinking` content blocks in the JSONL stream. The memory skill documentation references `type: "thinking"` as a valid content block type, but this should be empirically verified by inspecting a raw JSONL session file.

If pi strips thinking blocks from JSON output (some providers do this), this would need to be addressed upstream in pi or via a pi extension.

---

## 4. Changes to State Directory Structure

### 4.1 Create `state/reasoning/` Directory

**Action**: Add the directory and a `.gitkeep` file to ensure it persists in version control:

```
.github-minimum-intelligence/state/reasoning/.gitkeep
```

### 4.2 Update `.gitattributes`

**Action**: Add a merge strategy for reasoning files to prevent merge conflicts during concurrent agent runs:

```
state/reasoning/*.md merge=union
```

This mirrors the existing `.gitattributes` entry for `memory.log`.

### 4.3 Consider `.gitignore` Implications

The raw JSONL file (`/tmp/agent-raw.jsonl`) is already in `/tmp/` and excluded. The `state/reasoning/` files should be committed (they are the transparency record), so no `.gitignore` change is needed. However, if reasoning files grow large, a rotation or archival strategy should be defined.

---

## 5. Changes to Skills and Prompts

### 5.1 New `toulmin-reasoning` Skill (Optional)

**Path**: `.pi/skills/toulmin-reasoning/SKILL.md`

Create a skill file that instructs the agent to structure its reasoning output using the Toulmin model when making non-trivial proposals. This skill would:

- Trigger when the agent is about to propose a code change or architectural decision
- Instruct the agent to include a structured block (Claim, Grounds, Warrant, Rebuttal) in its response
- Complement the automated thinking-block extraction with an explicit agent-authored reasoning summary

This is referenced in Recommendation 1 of `toulmin-lessons.md` and synergizes with Recommendation 6.

### 5.2 Prompt Modification for Reasoning Summary

**File**: The prompt construction section of `agent.ts` (or the system prompt files it loads)

Add an instruction directing the agent to include a brief `## Reasoning` section at the end of its response when it produces code changes. This gives the agent an opportunity to produce a human-readable summary rather than relying solely on raw thinking-block extraction.

---

## 6. Changes to Extensions

### 6.1 Reasoning Capture Extension (Alternative Approach)

Instead of modifying `agent.ts` directly, reasoning capture could be implemented as a pi extension at `.pi/extensions/reasoning-capture.ts`. The extension would:

1. Intercept `message_end` events for assistant messages
2. Extract `thinking` content blocks
3. Write them to `state/reasoning/`
4. Expose a `get_reasoning_summary` tool the agent can call to retrieve its own reasoning for inclusion in comments

**Trade-off**: An extension approach is more modular but requires pi's extension API to support event interception (not just tool registration). If the extension API does not support this, `agent.ts` modification is the more reliable path.

---

## 7. Changes to the Workflow

### 7.1 No Workflow YAML Changes Required

The workflow at `.github/workflows/github-minimum-intelligence-agent.yml` does not need modification for this feature. The reasoning capture happens entirely within the agent's TypeScript execution, which the workflow already invokes via `bun .github-minimum-intelligence/lifecycle/agent.ts`.

### 7.2 Git Add Scope

The existing `git add -A` in `agent.ts` will automatically pick up new files in `state/reasoning/`. No change to the staging logic is needed.

---

## 8. Testing and Validation

### 8.1 Manual Verification

After implementation, verify the following for a single agent run:

| Check | Expected Result |
|---|---|
| `/tmp/agent-raw.jsonl` contains `thinking` blocks | Confirm pi outputs them in JSON mode |
| `state/reasoning/<issue>-<timestamp>.md` is created | File exists with structured content |
| Issue comment includes reasoning section | Collapsible `<details>` block is visible |
| Commit message references reasoning file | `git log` shows reasoning path in body |
| Empty thinking gracefully handled | No empty reasoning section posted when thinking is absent |

### 8.2 Size and Performance Considerations

| Concern | Mitigation |
|---|---|
| Thinking blocks can be very large (50k+ tokens) | Truncate the posted summary; store full transcript only in file |
| Additional `jq` pass adds processing time | Negligible — JSONL file is already on disk |
| `state/reasoning/` files accumulate over time | Define a retention policy (e.g., keep last 50 files, archive older ones) |
| Comment length budget consumed by reasoning | Cap reasoning section at ~5 000 characters within the 60 000 limit |

---

## 9. Dependency and Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pi does not emit thinking blocks in JSON mode | Low — documentation references them | High — feature is inoperable | Verify empirically before implementation; fall back to session file extraction |
| Thinking content contains sensitive information | Medium — model may reference API keys or tokens in reasoning | High — committed to Git | Add a sanitization pass before persisting (strip patterns matching known secret formats) |
| Large reasoning files slow down Git operations | Low — Markdown files compress well | Medium — degraded clone performance | Implement file rotation or move to a separate branch |
| Concurrent agent runs create merge conflicts in reasoning files | Low — concurrency group prevents parallel runs on same issue | Low | `merge=union` in `.gitattributes` as defense-in-depth |

---

## 10. Implementation Order

The recommended sequence minimizes risk and allows incremental validation:

1. **Create `state/reasoning/` directory** with `.gitkeep` — zero-risk structural change
2. **Add the `jq` extraction for thinking blocks** in `agent.ts` — core data capture
3. **Write reasoning files to disk** — persistence without user-visible change
4. **Add collapsible reasoning section to issue comments** — user-visible transparency
5. **Enrich commit messages** — traceability improvement
6. **Add `toulmin-reasoning` skill** (optional) — structured reasoning enhancement
7. **Add sanitization pass** — security hardening for persisted reasoning
8. **Define retention policy** — long-term maintainability

---

## Summary

Implementing LLM Reasoning Transparency requires changes concentrated in `lifecycle/agent.ts`, with supporting changes to the state directory structure and optionally to the skills system. The core work is capturing `thinking` content blocks that pi already generates but the agent currently discards. The infrastructure — high thinking level, JSON mode pipeline, session management, `gh` CLI integration — is already in place. The primary engineering effort is extraction, persistence, and presentation of reasoning data that flows through the system today without being surfaced.

---

*Implementation outline derived from [Toulmin Lessons §6](toulmin-lessons.md) and codebase analysis of [GitHub Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence)*
