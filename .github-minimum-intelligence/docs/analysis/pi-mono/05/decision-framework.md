# Decision Framework: SDK Migration

This document provides a structured framework for deciding when (and whether) to proceed with the SDK migration described in [05-sdk-migration.md](../05-sdk-migration.md). The framework is trigger-based: migration should be initiated by concrete events, not by a predetermined schedule.

---

## 1. Decision Principle

The subprocess-to-SDK migration is a **reversibility-reducing** decision — once the subprocess code is removed, the old approach must be reconstructed from scratch to roll back. Reversibility-reducing decisions should be deferred until the evidence for proceeding is strong and the cost of inaction is tangible.

**Rule:** Do not migrate proactively. Migrate reactively when the subprocess approach demonstrably fails or blocks a required capability.

---

## 2. Trigger Events

The following events should trigger a migration evaluation. Each trigger is a concrete, observable condition — not a subjective assessment.

### 2.1 Hard Triggers (Migrate Immediately)

These events indicate the subprocess approach has failed or become untenable:

| ID | Trigger | Evidence Required |
|---|---|---|
| T-01 | `jq` filter produces incorrect output on valid JSONL | A specific JSONL event that is valid per pi's schema but is incorrectly filtered by the current `jq` expression |
| T-02 | Pi JSONL schema change breaks the extraction pipeline | A pi-coding-agent release that changes the `message_end` event structure in a way the `jq` filter cannot handle |
| T-03 | `tee`, `tac`, or `jq` removed from GitHub Actions runners | An Ubuntu runner image update that removes one of the required tools |
| T-04 | Pi deprecates `--mode json` CLI output | An upstream announcement or release note indicating the JSONL CLI output will be removed |

### 2.2 Soft Triggers (Evaluate Migration)

These events indicate the subprocess approach is limiting GMI's capabilities. They warrant a cost-benefit evaluation but do not mandate immediate migration:

| ID | Trigger | Evidence Required |
|---|---|---|
| T-05 | A planned feature requires real-time event access | A feature specification that cannot be implemented with post-hoc JSONL parsing |
| T-06 | Token/cost tracking becomes a requirement | A budgeting or operational need that requires per-run token counts, not achievable through provider dashboards |
| T-07 | Error handling inadequacy causes user-facing problems | Three or more incidents where the binary exit code produced a misleading error message that confused users |
| T-08 | Extension loading behaves differently in CLI vs. SDK | A bug or limitation in CLI extension loading that the SDK handles correctly |
| T-09 | Mid-conversation intervention is needed | A requirement to programmatically pause, modify, or cancel an agent session while it is running |

### 2.3 Non-Triggers (Do Not Migrate)

These conditions, on their own, do not justify migration:

| Condition | Why It Is Not a Trigger |
|---|---|
| "The SDK is cleaner" | Architectural preference is not a functional requirement |
| "We should use the latest API" | Newness is not a benefit; stability is |
| "Other projects use the SDK" | GMI's deployment context (headless, CI, non-interactive) differs from typical SDK consumers |
| "We might need event access someday" | Speculative future needs should not drive present-day refactoring |
| "The shell pipeline is hard to read" | Add comments and documentation; do not rewrite |

---

## 3. Evaluation Process

When a trigger event occurs, follow this evaluation process:

### Step 1: Document the Trigger

Record the specific event, the evidence, and the impact on GMI's functionality. File it as a GitHub issue with the `architecture` label.

### Step 2: Assess Alternative Mitigations

Before committing to the full SDK migration, evaluate whether the trigger can be addressed by a smaller change:

| Trigger | Alternative Mitigation |
|---|---|
| T-01, T-02 | Update the `jq` filter; add JSONL schema validation |
| T-05 | Parse the existing JSONL file post-hoc for the specific event needed |
| T-06 | Parse token usage from JSONL events without the full SDK |
| T-07 | Parse pi's stderr for error details; add JSONL error event handling |
| T-09 | Use process signals (`SIGTERM`) for session cancellation |

If an alternative mitigation resolves the trigger with less effort and risk, prefer it.

### Step 3: Cost-Benefit Comparison

If no alternative mitigation is sufficient, compare the migration cost against the cost of the workaround:

| Factor | Migration | Workaround |
|---|---|---|
| Implementation effort | 4–8 hours (one-time) | Varies (per workaround) |
| Ongoing maintenance | SDK version tracking | Workaround-specific maintenance |
| Risk profile | See [risk-matrix.md](risk-matrix.md) | Lower (smaller change) |
| Future trigger resolution | Resolves all soft triggers | Resolves only the current trigger |

If the accumulated workaround maintenance exceeds the one-time migration effort, migration becomes cost-effective.

### Step 4: Decision

| Outcome | Action |
|---|---|
| Alternative mitigation resolves the trigger | Apply the mitigation; close the issue; do not migrate |
| Migration is cost-effective | Proceed with the phased migration plan in [05-sdk-migration.md](../05-sdk-migration.md) |
| Neither is clearly better | Defer for 30 days; re-evaluate if additional triggers accumulate |

---

## 4. Migration Readiness Checklist

If the decision is to proceed with migration, verify these prerequisites before starting:

| # | Prerequisite | Status |
|---|---|---|
| 1 | Pi-coding-agent SDK API is stable (no breaking changes in last 3 releases) | ☐ |
| 2 | SDK documentation covers all features used by GMI (sessions, extensions, skills) | ☐ |
| 3 | Local test environment can run the SDK with the same provider/model as production | ☐ |
| 4 | Existing session files load correctly in the SDK's SessionManager | ☐ |
| 5 | `github-context.ts` extension loads and registers its tool via the SDK | ☐ |
| 6 | Feature flag (`GMI_USE_SDK`) is implemented for parallel operation | ☐ |
| 7 | Rollback plan is documented (revert commit, re-enable subprocess path) | ☐ |
| 8 | Validation window is defined (recommended: 2 weeks of parallel operation) | ☐ |

---

## 5. Post-Migration Validation

After migration, verify these conditions before removing the subprocess code:

| # | Validation | Method |
|---|---|---|
| 1 | Assistant text extraction matches subprocess output | Run both paths on 10+ issue comments; compare output |
| 2 | Session files are compatible with existing mappings | Resume 3+ existing conversations; verify continuity |
| 3 | Extensions load and register tools | Confirm `github_repo_context` tool appears in agent capabilities |
| 4 | Error handling produces specific messages | Trigger known error conditions (invalid model, rate limit); verify messages |
| 5 | No memory leaks over multiple invocations | Monitor process memory across 20+ sequential runs |
| 6 | Diagnostic logging equivalent to JSONL file | Verify event logs contain the same information as `/tmp/agent-raw.jsonl` |

---

## 6. Current Status

As of 2026-03-30:

- **No hard triggers** have occurred. The `jq` filter has not failed on valid JSONL output.
- **No soft triggers** have been activated. No planned feature has been blocked by the subprocess model.
- **Recommendation:** Do not migrate. Review this framework when the next pi-coding-agent version is released or when a new feature is proposed that requires event access.

---

## 7. Summary

The SDK migration decision should be driven by concrete trigger events, not by architectural preference or speculative future needs. Hard triggers (pipeline failure, tool removal, upstream deprecation) mandate immediate migration. Soft triggers (feature requirements, error handling needs) warrant evaluation but may be resolvable through smaller changes. The current recommendation is to remain on the subprocess model and re-evaluate when a trigger event occurs.

*Framework derived from the analysis in [analysis.md](analysis.md) and [risk-matrix.md](risk-matrix.md). Applies to GMI's pi-coding-agent integration as of 2026-03-30.*
