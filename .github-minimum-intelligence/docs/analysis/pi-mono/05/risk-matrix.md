# Risk Matrix: SDK Migration

This document provides a detailed risk assessment for the SDK migration proposed in [05-sdk-migration.md](../05-sdk-migration.md), evaluating risks from both perspectives — the risk of migrating and the risk of *not* migrating.

---

## 1. Risks of Migrating to the SDK

### 1.1 Implementation Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| M-01 | SDK API breaking changes between pi-coding-agent versions | Medium | High | **Critical** | Pin exact version in package.json; test against each upgrade before adopting |
| M-02 | Session file format incompatibility between CLI and SDK modes | Low | High | **High** | Validate with existing session files; maintain dual-write during transition |
| M-03 | Extension loading path resolution differs from CLI | Low | Medium | **Medium** | Test `github-context.ts` loading explicitly; add startup validation |
| M-04 | In-process SDK crash takes down entire agent.ts | Low | High | **High** | Wrap SDK calls in try/catch with timeout; consider Worker thread isolation |
| M-05 | Regression in assistant text extraction | Medium | High | **Critical** | Run parallel (subprocess + SDK) and compare outputs before cutover |

### 1.2 Operational Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| M-06 | Loss of `/tmp/agent-raw.jsonl` diagnostic artifact | High | Medium | **High** | Implement equivalent JSONL writer via SDK event listener |
| M-07 | Memory pressure from in-process execution | Low | Medium | **Medium** | Monitor process memory; set `--max-old-space-size` if needed |
| M-08 | Dual code path maintenance during transition | High | Low | **Medium** | Set a time-boxed validation window (2 weeks); force decision at end |
| M-09 | Bun runtime incompatibility with SDK internals | Low | High | **High** | SDK is designed for Bun, but test edge cases (Worker threads, native modules) |

### 1.3 Strategic Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| M-10 | Deeper vendor lock-in to pi-coding-agent API surface | Medium | Medium | **Medium** | Define an internal abstraction layer; isolate SDK calls behind a function boundary |
| M-11 | Migration effort diverts from higher-priority features | Medium | Medium | **Medium** | Only migrate when triggered by a concrete subprocess limitation |
| M-12 | SDK deprecation or abandonment by upstream | Low | High | **High** | Monitor pi-mono repository activity; maintain subprocess code until SDK is proven stable |

---

## 2. Risks of NOT Migrating (Remaining on Subprocess)

### 2.1 Technical Debt Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| S-01 | `jq` filter breaks on future JSONL schema change | Low | High | **High** | Monitor pi-mono release notes; test `jq` filter against new JSONL samples |
| S-02 | Shell pipeline silently drops or truncates output | Low | High | **High** | Add output validation (check `agentText` is non-empty before posting) |
| S-03 | Binary error handling masks root cause of failures | Medium | Medium | **Medium** | Parse pi's stderr or JSONL error events for richer diagnostics |

### 2.2 Feature Limitation Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| S-04 | Cannot implement reasoning transparency without event access | Medium | Medium | **Medium** | Defer reasoning transparency; or parse JSONL post-hoc (brittle) |
| S-05 | No token/cost tracking for budget management | Low | Low | **Low** | Use provider dashboard for cost monitoring |
| S-06 | Cannot intercept tool calls for security filtering | Medium | High | **High** | Use pi extensions for permission gates instead (already planned) |

### 2.3 Maintenance Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| S-07 | External tool availability changes on GitHub runners | Low | Medium | **Low** | `tee`, `tac`, `jq` are standard Unix tools; extremely unlikely to be removed |
| S-08 | Shell pipeline complexity deters contributors | Low | Low | **Low** | Document the pipeline with inline comments (already done) |

---

## 3. Risk Comparison

### 3.1 Critical Risks by Path

| Path | Critical Risks | Count |
|---|---|---|
| Migrate | M-01 (API breaks), M-05 (extraction regression) | 2 |
| Stay | None at critical severity | 0 |

### 3.2 High Risks by Path

| Path | High Risks | Count |
|---|---|---|
| Migrate | M-02, M-04, M-06, M-09, M-12 | 5 |
| Stay | S-01, S-02, S-06 | 3 |

### 3.3 Aggregate Risk Profile

| Metric | Migrate | Stay |
|---|---|---|
| Total identified risks | 12 | 8 |
| Critical severity | 2 | 0 |
| High severity | 5 | 3 |
| Medium severity | 4 | 3 |
| Low severity | 1 | 2 |

The migration path carries a higher aggregate risk profile. The status quo path has fewer and lower-severity risks, with the most significant being the `jq` filter fragility (S-01) and the inability to intercept tool calls for security filtering (S-06).

---

## 4. Key Risk Interactions

### 4.1 Migration Cascade Risk

Risks M-01 through M-05 can cascade: an SDK API change (M-01) could affect session file format (M-02), which could break extension loading (M-03), leading to silent extraction failure (M-05). The subprocess model's simplicity means its failure modes are independent — a `jq` failure does not affect session file integrity.

### 4.2 Security Feature Dependency

Risk S-06 (cannot intercept tool calls) is partially mitigated by the planned extension-based permission gates ([03-extension-enhancements.md](../03-extension-enhancements.md)). Extensions run inside pi and can block dangerous operations before they execute. The SDK would provide an additional interception layer in `agent.ts`, but it is not the only mechanism available.

### 4.3 Reasoning Transparency Trade-off

Risk S-04 (cannot implement reasoning transparency) is a genuine feature gap, but it can be addressed by post-hoc JSONL parsing of the `/tmp/agent-raw.jsonl` file. This is less elegant than SDK event listeners but avoids the migration entirely. The trade-off is increased complexity in the transparency feature rather than in the invocation layer.

---

## 5. Risk-Adjusted Recommendation

Given that:

- The migration path introduces 2 critical risks with no critical risks on the stay path
- The most impactful stay-path risk (S-06) is mitigable through extensions
- The second most impactful stay-path risk (S-01) has not manifested in practice
- The migration effort diverts from higher-priority P1/P2 features

The risk-adjusted recommendation is to **remain on the subprocess model** until a trigger event occurs (see [decision-framework.md](decision-framework.md)).

---

## 6. Summary

The SDK migration introduces more risks (12) at higher severity (2 critical, 5 high) than remaining on the subprocess model (8 risks, 0 critical, 3 high). The migration's critical risks — API stability and extraction regression — are inherent to the transition and cannot be fully mitigated in advance. The subprocess model's highest risks — `jq` fragility and limited event access — are mitigable through incremental improvements (output validation, JSONL post-processing, extension-based security gates) that do not require the full migration.

*Risk assessment based on GMI's deployment context (GitHub Actions, single-maintainer, early-stage) as of 2026-03-30.*
