# Extension Brainstorm: Additional GMI Extensions

This document brainstorms additional pi extensions that would make sense in GMI beyond those proposed in [03-extension-enhancements.md](../03-extension-enhancements.md). Each extension is evaluated for feasibility, value, and alignment with GMI's "GitHub as Infrastructure" philosophy.

---

## 1. Criteria for Good GMI Extensions

An extension is a good fit for GMI if it:

1. **Works headless** — fully functional in `--mode json` (no UI dependency)
2. **Uses GitHub as infrastructure** — leverages Issues, Actions, Git, or Pages as its substrate
3. **Reduces LLM cognitive load** — wraps complex operations in structured tools
4. **Fails gracefully** — errors return informative messages, not crashes
5. **Adds no external dependencies** — uses `node:child_process`, `gh` CLI, or Git; no third-party APIs
6. **Is independently reversible** — deleting the `.ts` file removes the extension cleanly

---

## 2. High-Value Extensions

### 2.1 Token Budget Tracker

**Mechanism:** `tool_call` interception + `registerTool`

**Purpose:** Track cumulative token usage across tool calls within a session and warn or halt when approaching a configurable budget.

**How it works:**
- Intercepts each `tool_call` event and counts characters in input/output as a proxy for tokens
- Provides a `token_budget_status` tool the LLM can query to check remaining budget
- At 80% of budget, appends a warning to the next tool response: "Approaching token budget — prioritise completion"
- At 100% of budget, returns `{ block: true }` on non-essential tool calls (allow `write`, `edit`; block `bash`)

**Why it makes sense:** GMI runs on API credits. Without budget awareness, the agent can consume unlimited tokens on complex tasks. A budget tracker provides soft cost control without requiring the SDK migration.

| Criterion | Assessment |
|---|---|
| Headless compatible | ✅ |
| Uses GitHub infra | Partially (budget stored in state directory via Git) |
| Reduces LLM load | ✅ (self-awareness of budget reduces over-exploration) |
| No external deps | ✅ |
| Reversible | ✅ |

**Estimated effort:** 2–3 hours. **Priority:** P2.

---

### 2.2 Diff Summary Extension

**Mechanism:** `registerTool`

**Purpose:** Provide a tool that generates a structured summary of the current Git diff, so the agent can check its own work before committing.

**How it works:**
- Registers a `git_diff_summary` tool
- Runs `git diff --stat` and `git diff --name-only` to produce a file-level summary
- Optionally runs `git diff` on individual files with a character limit per file
- Returns structured output: files changed, lines added/removed, total delta

**Why it makes sense:** The agent often makes changes across multiple files and needs to verify completeness before committing. Currently it runs `git diff` via bash and parses the raw output. A structured tool reduces tokens wasted on raw diff output and provides a consistent format.

| Criterion | Assessment |
|---|---|
| Headless compatible | ✅ |
| Uses GitHub infra | ✅ (Git as version control) |
| Reduces LLM load | ✅ (structured vs. raw diff output) |
| No external deps | ✅ |
| Reversible | ✅ |

**Estimated effort:** 1–2 hours. **Priority:** P2.

---

### 2.3 Label-Based Routing Extension

**Mechanism:** `before_agent_start` context injection

**Purpose:** Inject label-specific instructions into the agent's system prompt based on the issue's labels, enabling different behaviour for different issue types.

**How it works:**
- At session start, reads the issue's labels from `$GITHUB_EVENT_PATH` or via `gh issue view`
- Maps labels to prompt fragments:

| Label | Injected Instruction |
|---|---|
| `bug` | "Focus on reproducing the bug first. Create a failing test before fixing." |
| `documentation` | "This is a documentation task. Do not modify source code." |
| `security` | "Treat this as a security-sensitive issue. Do not expose details in public comments." |
| `refactor` | "Preserve all existing tests. Run the test suite before and after changes." |
| `question` | "This is a question, not a task. Provide a clear, cited answer without making code changes." |

- Appends the matched instructions to the system prompt

**Why it makes sense:** GMI currently treats all issues identically. Label-based routing allows repository owners to guide agent behaviour through GitHub's native classification system — consistent with the "GitHub as Infrastructure" principle.

| Criterion | Assessment |
|---|---|
| Headless compatible | ✅ |
| Uses GitHub infra | ✅ (Labels as classification) |
| Reduces LLM load | ✅ (pre-filtered instructions reduce decision-making) |
| No external deps | ✅ |
| Reversible | ✅ |

**Estimated effort:** 2–3 hours. **Priority:** P1.

---

### 2.4 Session Checkpoint Extension

**Mechanism:** `tool_call` interception (post-execution)

**Purpose:** Create Git stash checkpoints after each tool call that modifies files, enabling rollback to any point in the agent's work.

**How it works:**
- After each `write`, `edit`, or `bash` tool call that modifies files (detected via `git status --porcelain`):
  1. Stage all changes: `git add -A`
  2. Create a stash: `git stash push -m "checkpoint-<turn>-<tool>"`
  3. Pop the stash immediately: `git stash pop`
- Provides a `session_rollback` tool that lets the agent roll back to a previous checkpoint
- On session end, cleans up stash entries

**Why it makes sense:** The agent sometimes makes a series of changes that collectively break something. Currently, recovering requires either the agent re-editing files or manually reverting. Checkpoints allow targeted rollback without losing all progress.

**Caveat:** Uses `git stash`, which can conflict with the main Git workflow if not carefully managed. Must be thoroughly tested with the existing commit/push pipeline.

| Criterion | Assessment |
|---|---|
| Headless compatible | ✅ |
| Uses GitHub infra | ✅ (Git as checkpoint mechanism) |
| Reduces LLM load | ✅ (rollback vs. manual re-editing) |
| No external deps | ✅ |
| Reversible | ✅ (stash entries are transient) |

**Estimated effort:** 4–6 hours. **Priority:** P3 (complexity and Git interaction risk).

---

### 2.5 Response Quality Gate Extension

**Mechanism:** `tool_call` interception on response submission

**Purpose:** Validate the agent's response before it is posted as an issue comment. Check for common quality issues: empty responses, responses that are just error messages, excessively long responses, and responses that contain raw stack traces.

**How it works:**
- Intercepts tool calls that submit responses (if implemented as a tool) or as a post-processing step
- Checks:
  - Response is non-empty
  - Response is not exclusively an error message or stack trace
  - Response length is within a configurable maximum
  - Response does not contain obvious secrets (API keys, tokens, passwords) — using simple pattern matching (not a security guarantee)
- If validation fails, returns `{ block: true }` with a message asking the agent to reformulate

**Why it makes sense:** The agent occasionally produces low-quality responses (empty, error-only, or excessively verbose). A quality gate prevents these from reaching the user, improving the perception of reliability.

**Caveat:** This is architecturally tricky — the response is posted via `agent.ts` (which constructs the issue comment from the agent's text output), not via a tool call that the extension can intercept. This extension may require changes to `agent.ts` to expose a response validation hook.

| Criterion | Assessment |
|---|---|
| Headless compatible | ✅ |
| Uses GitHub infra | ✅ (Issues as response surface) |
| Reduces LLM load | ❌ (adds post-processing; doesn't reduce LLM work) |
| No external deps | ✅ |
| Reversible | ✅ |

**Estimated effort:** 3–4 hours. **Priority:** P3 (requires `agent.ts` changes).

---

## 3. Medium-Value Extensions

### 3.1 File Tree Context Extension

**Mechanism:** `registerTool`

**Purpose:** Provide a `project_file_tree` tool that returns a structured directory listing with annotations (file sizes, last modified dates, language indicators) to help the agent navigate unfamiliar repositories.

**Why it makes sense:** The agent often runs `find` or `ls -R` to understand project structure. A structured tool provides the same information in a compact, token-efficient format with relevant metadata.

| Feasibility | Value | Priority |
|---|---|---|
| High | Medium | P2 |

---

### 3.2 Convention Detector Extension

**Mechanism:** `before_agent_start` context injection

**Purpose:** At session start, detect common project conventions (indentation style, naming conventions, test framework, package manager) by inspecting configuration files (`.editorconfig`, `tsconfig.json`, `package.json`, `.eslintrc`) and inject a summary into the system prompt.

**Why it makes sense:** The agent sometimes generates code that doesn't match the project's conventions (tabs vs. spaces, single vs. double quotes, test file naming). Auto-detected conventions reduce style mismatches without requiring the user to document them.

| Feasibility | Value | Priority |
|---|---|---|
| Medium | Medium | P2 |

---

### 3.3 Issue Cross-Reference Extension

**Mechanism:** `registerTool`

**Purpose:** Provide a `find_related_issues` tool that searches for issues related to the current one by keyword, label, or author. Helps the agent avoid duplicating work or understand the broader context of a task.

**Why it makes sense:** Duplicate or related issues are common. The agent currently has no way to search for related issues unless specifically instructed. This tool enables proactive discovery.

| Feasibility | Value | Priority |
|---|---|---|
| High (uses `gh issue list` + filters) | Medium | P2 |

---

### 3.4 Commit Message Convention Extension

**Mechanism:** `tool_call` interception

**Purpose:** Intercept `bash` tool calls that contain `git commit -m` and validate the commit message against a configurable convention (Conventional Commits, project-specific prefix).

**Why it makes sense:** Consistent commit messages improve project history readability. The agent generates commit messages that sometimes don't match the project's convention.

| Feasibility | Value | Priority |
|---|---|---|
| Medium (regex matching on commit messages) | Low-Medium | P3 |

---

### 3.5 Run History Extension

**Mechanism:** `registerTool`

**Purpose:** Provide a `previous_runs` tool that returns a summary of the agent's previous runs on this issue, including what was changed, what was committed, and whether the run succeeded or failed.

**Why it makes sense:** When the agent resumes a session, it relies on session transcripts for context. A structured run history provides a compact, searchable summary that is cheaper than re-reading the full transcript.

| Feasibility | Value | Priority |
|---|---|---|
| High (reads `state/issues/<N>.json` and Git log) | Medium | P2 |

---

## 4. Low-Value / Deferred Extensions

### 4.1 Notification Extension

Sends a webhook notification when the agent completes a task. Low value in the current GitHub-native model because GitHub already notifies on issue comments.

### 4.2 Self-Improvement Extension

Records which tool calls failed and adjusts future behaviour. Architecturally complex; overlaps with pi's built-in skill/memory system.

### 4.3 Multi-Repo Context Extension

Fetches context from other repositories in the same organisation. Requires cross-repo `GITHUB_TOKEN` permissions; complicates the security model.

### 4.4 Code Snippet Search Extension

Searches the web for code examples. Overlaps with the proposed [brave-search skill](../02-pi-skills-web-search.md); should not be duplicated.

---

## 5. Priority Summary

| Priority | Extension | Type | Effort |
|---|---|---|---|
| **P1** | Label-based routing | Context injection | 2–3h |
| **P2** | Token budget tracker | Interception + tool | 2–3h |
| **P2** | Diff summary | Tool | 1–2h |
| **P2** | File tree context | Tool | 1–2h |
| **P2** | Convention detector | Context injection | 2–3h |
| **P2** | Issue cross-reference | Tool | 1–2h |
| **P2** | Run history | Tool | 2–3h |
| **P3** | Session checkpoint | Interception + tool | 4–6h |
| **P3** | Response quality gate | Interception | 3–4h |
| **P3** | Commit message convention | Interception | 2–3h |

---

## 6. Thematic Grouping

### 6.1 GitHub-Native Extensions (Use GitHub as Infrastructure)

- Label-based routing
- Issue cross-reference
- Run history

These extensions reinforce GMI's core philosophy by using GitHub's native constructs (labels, issues, Git log) as the agent's operational substrate.

### 6.2 Agent Self-Awareness Extensions

- Token budget tracker
- Diff summary
- Convention detector

These extensions give the agent awareness of its own resource consumption, work product, and environment.

### 6.3 Quality Control Extensions

- Response quality gate
- Commit message convention
- Session checkpoint

These extensions add checks and safeguards to the agent's output quality.

---

## 7. Summary

Beyond the four extensions proposed in [03-extension-enhancements.md](../03-extension-enhancements.md), there are at least ten additional extensions that align with GMI's architecture and deployment model. The highest-value addition is **label-based routing**, which uses GitHub's native classification system to guide agent behaviour — a direct expression of the "GitHub as Infrastructure" principle. Other high-value extensions include **token budget tracking** (cost control), **diff summary** (work verification), and **convention detection** (style consistency).

All proposed extensions follow pi's extension patterns (auto-discovered from `.pi/extensions/`, loaded via `jiti`, headless-compatible) and require no changes to `agent.ts` or the GitHub Actions workflow.

*Brainstorm based on GMI's architecture as of 2026-03-30, pi-coding-agent extension API, and the "GitHub as Infrastructure" design philosophy.*
