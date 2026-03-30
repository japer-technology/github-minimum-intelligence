# Decision Framework: Extension Enhancements

This document provides a structured framework for deciding which extensions to implement and in what order, based on the analysis in [analysis.md](analysis.md) and the proposals in [03-extension-enhancements.md](../03-extension-enhancements.md).

---

## 1. Decision Principle

Extension adoption should be **value-driven and incremental** — each extension should be implemented only when its value can be demonstrated, and should prove itself before the next extension is added. Unlike the SDK migration (which is a reversibility-reducing architectural change), extensions are individually reversible — deleting a `.ts` file removes the extension.

**Rule:** Implement the lowest-risk, highest-value extension first. Let it run in production for at least one issue cycle before adding the next.

---

## 2. Implementation Criteria

Each extension should be evaluated against these criteria before implementation:

### 2.1 Must-Have Criteria (All Required)

| # | Criterion | Verification |
|---|---|---|
| C-01 | Works correctly in `--mode json` (headless) | Test with `pi --mode json` and verify tool/event behaviour |
| C-02 | Does not break existing extensions | Load alongside `github-context.ts`; verify `github_repo_context` still works |
| C-03 | Fails gracefully | Extension load failure must not prevent the agent from starting |
| C-04 | No new external dependencies | Extension uses only Node.js built-ins and pi's `ExtensionAPI` |

### 2.2 Should-Have Criteria (Strongly Preferred)

| # | Criterion | Verification |
|---|---|---|
| C-05 | Clear documentation of limitations | Block messages explain what is blocked and why; bypass path is documented |
| C-06 | Tested with at least 3 representative issue comments | Manual test: trigger the agent with comments that exercise the extension |
| C-07 | Minimal token cost when triggered | Block messages are concise; tool results are structured and compact |

---

## 3. Extension Readiness Assessment

### 3.1 GitHub Issue Context Tools

| Criterion | Status | Notes |
|---|---|---|
| C-01 Headless | ✅ Ready | `registerTool` is proven via `github-context.ts` |
| C-02 Compatibility | ✅ Ready | Independent tool registrations; no event interception |
| C-03 Graceful failure | ✅ Ready | Try/catch wraps all `execSync` calls; returns error text on failure |
| C-04 No new deps | ✅ Ready | Uses `node:child_process` and `@sinclair/typebox` (already present) |
| C-05 Documentation | ⚠️ Partial | Tool descriptions are clear; but no user-facing documentation |
| C-06 Tested | ❌ Not yet | Requires manual testing with representative issues |
| C-07 Token cost | ✅ Ready | Returns structured JSON; no block messages |

**Readiness: High.** Implement first.

### 3.2 Agent Metadata

| Criterion | Status | Notes |
|---|---|---|
| C-01 Headless | ✅ Ready | `before_agent_start` fires in all modes |
| C-02 Compatibility | ✅ Ready | Modifies system prompt; does not interact with other extensions |
| C-03 Graceful failure | ⚠️ Partial | Uses `process.env` which may be undefined; falls back to "unknown"/"local" |
| C-04 No new deps | ✅ Ready | Uses only `process.env` and `Date` |
| C-05 Documentation | ❌ Missing | No documentation of what metadata is injected or why |
| C-06 Tested | ❌ Not yet | Requires verification that `before_agent_start` return value is honoured |
| C-07 Token cost | ✅ Ready | ~5 lines of text added to system prompt |

**Readiness: Medium-High.** Implement second; verify `before_agent_start` event handling first.

### 3.3 Permission Gate

| Criterion | Status | Notes |
|---|---|---|
| C-01 Headless | ✅ Ready | `tool_call` interception fires in all modes |
| C-02 Compatibility | ✅ Ready | Intercepts `bash` tool only; no conflict with other tool types |
| C-03 Graceful failure | ⚠️ Partial | If the extension throws, unclear whether pi blocks or allows the command |
| C-04 No new deps | ✅ Ready | Pure regex matching |
| C-05 Documentation | ⚠️ Partial | Block messages include pattern source; but no user-facing documentation of what is blocked and why |
| C-06 Tested | ❌ Not yet | Requires testing with commands that match and don't match patterns |
| C-07 Token cost | ⚠️ Risk | Blocked commands consume tokens for the block message + LLM's reformulation attempt |

**Readiness: Medium.** Implement third; requires clear documentation that this is a guardrail, not a sandbox.

### 3.4 Path Protection

| Criterion | Status | Notes |
|---|---|---|
| C-01 Headless | ✅ Ready | `tool_call` interception fires in all modes |
| C-02 Compatibility | ⚠️ Risk | Interacts with permission gate on overlapping bash commands (e.g., `bash 'rm -rf .env'`) |
| C-03 Graceful failure | ⚠️ Partial | Same concern as permission gate regarding extension errors |
| C-04 No new deps | ✅ Ready | Pure regex matching |
| C-05 Documentation | ⚠️ Partial | Block message mentions bash fallback; but this undermines the protection |
| C-06 Tested | ❌ Not yet | Requires testing with protected and unprotected paths |
| C-07 Token cost | ⚠️ Risk | Block message + reformulation via bash = doubled token cost for the operation |

**Readiness: Low-Medium.** Defer until the bash bypass issue is resolved (see §4.2).

---

## 4. Open Questions

### 4.1 Extension Loading Order

**Question:** In what order does pi load extensions from `.pi/extensions/`? Is the order deterministic (alphabetical, filesystem order)?

**Why it matters:** If both the permission gate and path protection intercept the same `tool_call` event, the first one to return `{ block: true }` determines the block message. The agent sees one reason, not both.

**Resolution needed before:** Implementing both permission gate and path protection simultaneously.

### 4.2 Bash Bypass for Path Protection

**Question:** Should path protection intercept `bash` commands that contain file write operations (redirect `>`, `>>`, `tee`, `cp`, `mv`) targeting protected paths?

**Why it matters:** Without this, the protection is trivially bypassable. With it, the regex complexity approaches that of the permission gate, with all the same bypass risks.

**Options:**

| Option | Effort | Completeness | Risk |
|---|---|---|---|
| A. Block only `write`/`edit` (current proposal) | Low | Low | Incomplete protection creates false confidence |
| B. Also intercept bash write operations | High | Medium | Complex regex; many false positives (`echo "test" > output.txt`) |
| C. Defer path protection entirely | None | N/A | Accept the risk; rely on container-level isolation |

**Recommended:** Option C — defer until container-based execution is available, which provides genuine path isolation.

### 4.3 Permission Gate Scope

**Question:** Should the permission gate block operations that are dangerous but sometimes necessary (e.g., `sudo apt-get install` for system dependencies)?

**Why it matters:** Blocking too broadly makes the agent unable to complete legitimate tasks. Blocking too narrowly makes the gate ineffective.

**Options:**

| Option | Approach | Risk |
|---|---|---|
| A. Block all dangerous patterns (current proposal) | Conservative | More false positives; agent stuck on legitimate tasks |
| B. Block only catastrophic patterns (`rm -rf /`, `rm -rf ~`) | Minimal | Fewer false positives; misses many dangerous commands |
| C. Block and suggest alternative | Moderate | Block message includes a safe alternative command |

**Recommended:** Option B — block only commands with catastrophic, irreversible consequences. Allow `sudo`, `git reset --hard`, etc., with documentation noting the risk.

---

## 5. Implementation Sequence

Based on readiness assessment and value analysis:

### Phase 1: Productivity Extensions (Low Risk)

1. **GitHub issue context** — Extends the proven `github-context.ts` pattern. Adds structured tools for issue/PR queries. No security implications; purely additive.

2. **Agent metadata** — Injects environment context at session start. Minimal code; no interception logic.

### Phase 2: Safety Guardrails (Medium Risk)

3. **Permission gate** — Implement with a minimal blocklist (catastrophic commands only). Clearly document as a guardrail, not a security control. Monitor for false positives over 2 weeks before expanding the pattern list.

### Phase 3: Deferred (Pending Prerequisites)

4. **Path protection** — Defer until either:
   - Container-based agent execution is available (providing genuine path isolation), or
   - The bash bypass is resolved through a comprehensive interception strategy

---

## 6. Validation Protocol

After each extension is deployed, validate with the following test protocol:

### 6.1 Positive Tests (Extension Works)

| Extension | Test | Expected |
|---|---|---|
| Issue context | Comment: "What is issue #1 about?" | Agent uses `github_issue_context` tool; returns structured metadata |
| Issue context | Comment: "What's the status of PR #1?" | Agent uses `github_pr_status` tool; returns status details |
| Metadata | Any issue comment | System prompt includes current UTC time and repository name |
| Permission gate | Comment: "Delete all files" | Agent's `rm -rf` attempt is blocked; agent reformulates |

### 6.2 Negative Tests (Extension Doesn't Interfere)

| Extension | Test | Expected |
|---|---|---|
| Issue context | Comment: "Create a new file at src/hello.ts" | Agent uses `write` or `bash` tool normally |
| Metadata | Any issue comment | Agent's normal tool usage is unaffected |
| Permission gate | Comment: "Install express" | `npm install express` is NOT blocked |
| Permission gate | Comment: "Run the test suite" | `npm test` is NOT blocked |

### 6.3 Regression Tests

| Test | Expected |
|---|---|
| `github_repo_context` tool still works | Existing extension is unaffected by new extensions |
| Session resume works | Prior sessions can be resumed without errors |
| Compaction works | Long conversations compact normally |

---

## 7. Summary

The extension enhancements should be implemented in two phases: productivity extensions first (issue context, metadata), followed by safety guardrails (permission gate). Path protection should be deferred until the bash bypass problem is resolved. Each extension should be deployed individually, validated with the test protocol, and given at least one issue cycle to prove itself before the next extension is added. The decision framework prioritises low-risk, demonstrable value over comprehensive security coverage — acknowledging that true security requires container-level isolation, not application-level regex matching.

*Framework derived from the analysis in [analysis.md](analysis.md) and [risk-matrix.md](risk-matrix.md). Applies to GMI's pi extension ecosystem as of 2026-03-30.*
