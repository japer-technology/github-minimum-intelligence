# Risk Matrix: Extension Enhancements

This document provides a detailed risk assessment for the extension enhancements proposed in [03-extension-enhancements.md](../03-extension-enhancements.md), evaluating risks from both perspectives — the risk of implementing each extension and the risk of *not* implementing it.

---

## 1. Risks of Implementing

### 1.1 Permission Gate Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| PG-01 | Regex bypass via command reformulation | High | Medium | **High** | Document as guardrail, not security control; do not rely on for security guarantees |
| PG-02 | False positive blocks legitimate operation | Medium | Medium | **Medium** | Start with minimal blocklist (catastrophic commands only); expand based on observed agent behaviour |
| PG-03 | LLM wastes tokens retrying blocked operations | Medium | Low | **Low** | Block messages should be clear and actionable; include alternative approaches |
| PG-04 | Extension error prevents all bash commands | Low | High | **High** | Wrap regex matching in try/catch; allow command on extension error |
| PG-05 | Stakeholders mistakenly treat as security control | Medium | High | **High** | Explicit documentation: "This is an accident-prevention guardrail, not a sandbox" |

### 1.2 Path Protection Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| PP-01 | Bash tool bypasses all protections | High | Medium | **High** | Either extend to cover bash write operations or defer entirely |
| PP-02 | Agent learns to use bash for all file writes | Medium | Medium | **Medium** | Monitor agent behaviour; if it consistently bypasses, the extension is counterproductive |
| PP-03 | Protected paths list becomes stale | Medium | Low | **Low** | Review protected paths when new sensitive files are added to the project |
| PP-04 | Block message causes LLM to avoid all file writes | Low | Medium | **Medium** | Block message should specify exactly which path is protected and why |
| PP-05 | Interaction with permission gate on overlapping commands | Low | Low | **Low** | Acceptable — both extensions would block; the agent sees one block message |

### 1.3 GitHub Issue Context Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| IC-01 | `gh` CLI not authenticated in Actions environment | Low | High | **High** | `GITHUB_TOKEN` is already passed; `gh` uses it automatically |
| IC-02 | `gh` CLI command syntax changes in future version | Low | Medium | **Medium** | Pin `gh` version in workflow; test after upgrades |
| IC-03 | Tool timeout on large issues/PRs | Low | Medium | **Medium** | 15-second timeout already set; consider pagination for large result sets |
| IC-04 | Increased tool count confuses LLM tool selection | Low | Low | **Low** | Tool descriptions are specific; LLM should select correctly |
| IC-05 | Issue number injection via untrusted input | Low | Medium | **Medium** | `gh` CLI validates issue numbers; non-existent issues return an error |

### 1.4 Agent Metadata Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| AM-01 | Timestamp becomes stale during long sessions | Medium | Low | **Low** | Timestamp is refreshed at each agent invocation; staleness only affects within a single long run |
| AM-02 | `before_agent_start` event not honoured in `--mode json` | Low | Medium | **Medium** | Test before deployment; fall back to no metadata injection if unsupported |
| AM-03 | Environment variables leak sensitive information | Low | Medium | **Medium** | Only inject `GITHUB_REPOSITORY`, `GITHUB_RUN_ID`, `GITHUB_SERVER_URL` — no secrets |
| AM-04 | System prompt modification affects agent behaviour | Low | Low | **Low** | Metadata is appended, not prepended; agent's core instructions are unaffected |

---

## 2. Risks of NOT Implementing

### 2.1 Risks of No Permission Gate

| ID | Risk | Likelihood | Impact | Severity | Mitigation (Without Extension) |
|---|---|---|---|---|---|
| NPG-01 | Agent executes destructive command (`rm -rf /`) | Low | Critical | **High** | Trust in LLM's training not to generate destructive commands; rely on GitHub Actions runner isolation |
| NPG-02 | Agent runs `sudo` in non-root context | Low | Low | **Low** | GitHub Actions runners don't have passwordless sudo by default; command fails safely |
| NPG-03 | Agent force-pushes and loses git history | Low | Medium | **Medium** | Branch protection rules prevent force-push to protected branches |

### 2.2 Risks of No Path Protection

| ID | Risk | Likelihood | Impact | Severity | Mitigation (Without Extension) |
|---|---|---|---|---|---|
| NPP-01 | Agent modifies `.env` with secrets | Low | High | **High** | `.env` files should not be committed; `.gitignore` should exclude them |
| NPP-02 | Agent edits GitHub Actions workflows | Low | High | **High** | Addressed by [security hardening analysis](../../toulmin-4-rebuttal-driven-security-hardening-implementation.md) staged-diff path check |
| NPP-03 | Agent modifies `.pi/settings.json` | Low | Medium | **Medium** | Settings are loaded at startup; runtime modifications take effect only on next invocation |

### 2.3 Risks of No Issue Context Tools

| ID | Risk | Likelihood | Impact | Severity | Mitigation (Without Extension) |
|---|---|---|---|---|---|
| NIC-01 | Agent constructs incorrect `gh` command | Medium | Low | **Low** | Agent retries with corrected command; minimal token waste |
| NIC-02 | Agent omits useful JSON fields in `gh` query | Medium | Low | **Low** | Incomplete but functional; agent can re-query with additional fields |
| NIC-03 | Multi-step `gh` queries waste tokens | Medium | Low | **Low** | Acceptable overhead for current usage patterns |

### 2.4 Risks of No Agent Metadata

| ID | Risk | Likelihood | Impact | Severity | Mitigation (Without Extension) |
|---|---|---|---|---|---|
| NAM-01 | Agent generates incorrect timestamps | Medium | Low | **Low** | Agent can use `date` command via bash |
| NAM-02 | Agent unaware of Actions run context | Low | Low | **Low** | Rarely needed; agent can check `$GITHUB_RUN_ID` via bash |

---

## 3. Risk Comparison

### 3.1 Critical and High Risks by Decision

| Decision | Critical Risks | High Risks | Total High+ |
|---|---|---|---|
| Implement permission gate | 0 | 3 (PG-01, PG-04, PG-05) | 3 |
| Don't implement permission gate | 0 | 1 (NPG-01) | 1 |
| Implement path protection | 0 | 1 (PP-01) | 1 |
| Don't implement path protection | 0 | 2 (NPP-01, NPP-02) | 2 |
| Implement issue context | 0 | 1 (IC-01) | 1 |
| Don't implement issue context | 0 | 0 | 0 |
| Implement metadata | 0 | 0 | 0 |
| Don't implement metadata | 0 | 0 | 0 |

### 3.2 Net Risk Assessment

| Extension | Implement Risk | Don't Implement Risk | Net Direction |
|---|---|---|---|
| **Permission gate** | 3 high risks | 1 high risk | **Implement carries more risk** |
| **Path protection** | 1 high risk | 2 high risks | **Don't implement carries more risk** (but see §4.1) |
| **Issue context** | 1 high risk | 0 high risks | **Implement carries more risk** (but the risk is already mitigated) |
| **Metadata** | 0 high risks | 0 high risks | **Neutral** |

---

## 4. Key Risk Interactions

### 4.1 Path Protection Paradox

Path protection has a paradoxical risk profile: *not* implementing it carries more high risks (2) than implementing it (1), but the implementation's effectiveness is undermined by the bash bypass (PP-01). This means:

- **Not implementing:** Real risk of workflow modification and secret exposure
- **Implementing:** Creates incomplete protection that may not actually prevent the above risks

The resolution depends on whether the bash bypass is addressed:
- **If addressed:** Path protection becomes genuinely protective; implement
- **If not addressed:** Path protection is cosmetic; rely on alternative mitigations (`.gitignore`, branch protection, staged-diff checks)

### 4.2 Permission Gate Trust Calibration

The permission gate's three high risks (PG-01, PG-04, PG-05) all stem from the same root cause: regex-based command filtering is inherently incomplete. However, the risk of *not* implementing (NPG-01: destructive command execution) is severe even if unlikely.

The risk calculus favours implementing the gate **if and only if** stakeholders understand its limitations. The key mitigation is documentation and expectation management, not code improvement.

### 4.3 Issue Context Authentication Dependency

Risk IC-01 (gh CLI not authenticated) is shared with the existing `github-context.ts` extension. If `GITHUB_TOKEN` is not set, both the existing and proposed extensions fail. This is already mitigated by the workflow configuration. Implementing the issue context extension does not increase this shared risk.

### 4.4 Cascading Extension Failure

If one extension throws an uncaught error during load, pi's extension loader behaviour determines whether other extensions are affected:

- **Independent loading (expected):** Each extension loads in its own try/catch; one failure doesn't affect others
- **Sequential loading (risk):** An uncaught throw during one extension's `default()` export halts loading of subsequent extensions

This risk is common to all extensions and should be verified once, not per-extension.

---

## 5. Risk-Adjusted Implementation Recommendation

| Extension | Recommendation | Rationale |
|---|---|---|
| **Issue context** | ✅ Implement | 1 high risk (already mitigated); 0 high risks of not implementing. Net-positive on productivity. |
| **Metadata** | ✅ Implement | 0 high risks either way. Low cost, mild benefit, zero downside. |
| **Permission gate** | ⚠️ Implement with conditions | More implementation risks than non-implementation risks, but the non-implementation risk (destructive command) is severe. Implement only with explicit guardrail documentation. |
| **Path protection** | ❌ Defer | Implementation risk (bash bypass) undermines the value proposition. Rely on alternative mitigations until the bypass is resolved. |

---

## 6. Summary

The risk matrix reveals that the security-oriented extensions (permission gate, path protection) have asymmetric risk profiles — they carry implementation risks that the productivity-oriented extensions (issue context, metadata) do not. The permission gate is worth implementing despite its risks because it addresses a low-likelihood but severe consequence (accidental destructive command). Path protection should be deferred because its primary risk (bash bypass) undermines its core value. Issue context and metadata extensions are low-risk additions that should be implemented first.

*Risk assessment based on GMI's deployment context (GitHub Actions, single-maintainer, early-stage) as of 2026-03-30.*
