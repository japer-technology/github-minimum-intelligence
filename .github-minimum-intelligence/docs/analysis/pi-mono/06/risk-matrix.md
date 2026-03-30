# Risk Matrix: Web UI Integration

This document provides a detailed risk assessment for the web UI integration proposed in [06-web-ui-integration.md](../06-web-ui-integration.md), evaluating risks from both perspectives — the risk of implementing each use case and the risk of *not* implementing it.

---

## 1. Risks of Implementing: Interactive Demo

### 1.1 User Experience Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| ID-01 | Visitors mistake the demo for the full product | High | High | **Critical** | Prominent disclaimer: "This is a limited preview. The full experience requires GitHub Issues." |
| ID-02 | Visitors enter API key on untrusted page | Medium | High | **High** | Serve only from the project's own GitHub Pages domain; explain key usage clearly |
| ID-03 | Most visitors abandon at the API key prompt | High | Medium | **High** | No mitigation possible without a shared key or removing the requirement |
| ID-04 | Browser-based agent produces confusing errors without repo tools | High | Medium | **High** | Restrict available tools; pre-configure system prompt for demo context |
| ID-05 | Visitors compare demo unfavourably to full-featured AI chat products | Medium | Medium | **Medium** | Set expectations explicitly; focus on the Issues-based model as the differentiator |

### 1.2 Security Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| ID-06 | API key exposure via browser dev tools or network inspection | Low | High | **High** | All calls are direct browser-to-LLM; keys are not sent to GMI infrastructure. Document this clearly |
| ID-07 | Shared/sponsored API key abuse | High | High | **Critical** | Do not use a shared key. Require visitors to provide their own. Alternatively, use a replay-based demo |
| ID-08 | XSS or injection via chat input rendered in the browser | Low | Medium | **Medium** | pi-web-ui components should sanitise output; verify before deployment |

### 1.3 Architectural Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| ID-09 | Creates precedent for building web UIs outside GitHub | Medium | High | **High** | Document as a one-time exception; do not extend to full interaction |
| ID-10 | IndexedDB state diverges from Git state model | High | Medium | **High** | Accept as inherent limitation; clearly document that demo sessions are not persisted to Git |
| ID-11 | Pressure to add features to the web UI over time | Medium | Medium | **Medium** | Define strict scope limits at implementation time; enforce in code review |

---

## 2. Risks of Implementing: Session Viewer

### 2.1 Content Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| SV-01 | Published session contains API keys or credentials | Medium | Critical | **Critical** | Manual curation before publishing; automated pattern scanning for common secret formats |
| SV-02 | Published session contains personally identifiable information | Medium | High | **High** | Redact author names, email addresses, and usernames from published sessions |
| SV-03 | Published session reveals security vulnerability before patch | Low | Critical | **Critical** | Never publish sessions that discuss unreleased security fixes; add to curation checklist |
| SV-04 | Published session contains proprietary source code | Medium | High | **High** | For public repositories, source code is already public. For forks used in private repos, do not publish |
| SV-05 | Curated sessions create a misleading impression of agent reliability | Medium | Medium | **Medium** | Include sessions with failures and error recovery, not only successes |

### 2.2 Operational Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| SV-06 | Build step fails silently; stale sessions published | Medium | Low | **Low** | Add build step validation; check output file count and freshness |
| SV-07 | Session JSONL format changes between pi versions | Low | Medium | **Medium** | Pin pi-coding-agent version; test session rendering after upgrades |
| SV-08 | Published sessions become outdated and no longer represent current agent behaviour | High | Medium | **High** | Date-stamp each published session; add a "last verified" annotation |
| SV-09 | Large session files (100+ KB) increase page load time | Medium | Low | **Low** | Paginate long sessions; lazy-load message blocks |
| SV-10 | Curation becomes an ongoing maintenance burden | High | Medium | **High** | Budget curation time explicitly; do not commit to continuous publishing |

### 2.3 Dependency Risks (If Using pi-web-ui)

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| SV-11 | pi-web-ui component API changes break rendering | Medium | Medium | **Medium** | Pin version; test before upgrading |
| SV-12 | pi-web-ui is discontinued or abandoned | Low | Medium | **Medium** | Vanilla JS fallback is always available; pi-web-ui is not required |
| SV-13 | pi-web-ui bundle size exceeds acceptable threshold | Low | Low | **Low** | Current estimate is 50–100 KB; acceptable for a documentation page |

---

## 3. Risks of NOT Implementing

### 3.1 Risks of No Interactive Demo

| ID | Risk | Likelihood | Impact | Severity | Mitigation (Without Demo) |
|---|---|---|---|---|---|
| NID-01 | Prospective adopters cannot evaluate the agent before installation | Medium | Medium | **Medium** | Provide detailed README with screenshots and example interactions |
| NID-02 | Project appears less capable than competitors with live demos | Low | Low | **Low** | Focus messaging on architectural advantages rather than demo flashiness |
| NID-03 | Technical decision-makers lack evidence to justify adoption | Low | Medium | **Medium** | Provide written case studies or recorded sessions in documentation |

### 3.2 Risks of No Session Viewer

| ID | Risk | Likelihood | Impact | Severity | Mitigation (Without Viewer) |
|---|---|---|---|---|---|
| NSV-01 | Agent transparency claims are not backed by visible evidence | Medium | Medium | **Medium** | Point to raw session files in the repository for those willing to inspect them |
| NSV-02 | Governance reviews lack published audit trail | Low | Medium | **Medium** | Provide repository access to auditors; point to `state/sessions/` directory |
| NSV-03 | No public demonstration of real agent capabilities | Medium | Medium | **Medium** | Use README examples, screenshots, or screen recordings |
| NSV-04 | Knowledge accumulation is not visible to external observers | Low | Low | **Low** | Not critical at current project scale |

---

## 4. Risk Comparison

### 4.1 Critical Risks by Path

| Path | Critical Risks | Count |
|---|---|---|
| Implement interactive demo | ID-01 (misrepresentation), ID-07 (shared key abuse) | 2 |
| Implement session viewer | SV-01 (credential leak), SV-03 (vuln disclosure) | 2 |
| No implementation | None | 0 |

### 4.2 High Risks by Path

| Path | High Risks | Count |
|---|---|---|
| Implement interactive demo | ID-02, ID-03, ID-04, ID-06, ID-09, ID-10 | 6 |
| Implement session viewer | SV-02, SV-04, SV-08, SV-10 | 4 |
| No implementation | None | 0 |

### 4.3 Aggregate Risk Profile

| Metric | Interactive Demo | Session Viewer | No Implementation |
|---|---|---|---|
| Total identified risks | 11 | 13 | 7 |
| Critical severity | 2 | 2 | 0 |
| High severity | 6 | 4 | 0 |
| Medium severity | 3 | 5 | 4 |
| Low severity | 0 | 2 | 3 |

The interactive demo has the most severe risk profile (2 critical + 6 high). The session viewer has more total risks but they are distributed at lower severity. "No implementation" has the lowest risk profile overall, with all risks at medium or below.

---

## 5. Key Risk Interactions

### 5.1 Curation Failure Cascade

If a session viewer curation failure occurs (SV-01, SV-02, SV-03, or SV-04), the consequence is not merely data exposure — it undermines the project's credibility on transparency and governance. The same project that publishes DEFCON levels and security assessments would have leaked sensitive data through its own published sessions. The reputational damage cascades beyond the specific incident.

**Implication:** The curation process must be treated as a security control, not a content workflow. Failed curation is a security incident, not an editorial oversight.

### 5.2 Experience Gap Amplification

Risk ID-01 (misrepresentation) interacts with risk ID-05 (unfavourable comparison). If visitors both misunderstand what the demo represents *and* find it inferior to competing products, the net effect is negative adoption impact — the opposite of the demo's intent. The demo becomes an anti-demonstration.

**Implication:** If the interactive demo is ever implemented, the experience gap must be resolved first (see [decision-framework.md §4.1](decision-framework.md)). A demo that accurately represents a limited capability is acceptable; a demo that inaccurately represents a diminished capability is not.

### 5.3 Maintenance Burden Accumulation

Risks SV-08 (outdated sessions) and SV-10 (curation burden) compound over time. Each published session requires periodic verification that it still represents current agent behaviour. As the session library grows, the verification burden grows proportionally. Without explicit budgeting, this creates an unfunded mandate that gradually degrades the session viewer's value.

**Implication:** The session viewer should have a strict maximum published session count (e.g., 5–10 sessions). Old sessions should be archived (removed from the viewer, retained in Git) as new ones are added.

---

## 6. Risk-Adjusted Recommendation

| Use Case | Recommendation | Rationale |
|---|---|---|
| **Interactive demo** | ❌ Do not implement | 2 critical + 6 high risks; experience gap problem is disqualifying; API key barrier eliminates target audience |
| **Session viewer** | ⚠️ Implement conditionally | 2 critical + 4 high risks, but all are mitigable through curation; value is genuine if prerequisites are met |
| **No implementation** | ✅ Safest option | 0 critical/high risks; acceptable medium risks mitigable through documentation |

If the session viewer is implemented, the following risk controls are mandatory:

| Control | Purpose | Maps to Risk |
|---|---|---|
| Manual curation review before every publication | Prevent credential and PII leaks | SV-01, SV-02 |
| Automated secret scanning on session content | Defense in depth for curation failures | SV-01 |
| Security-fix embargo check | Prevent pre-patch vulnerability disclosure | SV-03 |
| Published session count cap (5–10) | Prevent unbounded maintenance burden | SV-08, SV-10 |
| Date and version stamp on every session | Enable staleness detection | SV-08 |
| Include failure sessions alongside success sessions | Prevent misleading reliability impression | SV-05 |

---

## 7. Summary

The risk matrix reveals a clear hierarchy: the interactive demo carries the highest risk (2 critical, 6 high) with the lowest reward (experience gap undermines its value); the session viewer carries moderate risk (2 critical, 4 high) with moderate reward (genuine transparency and adoption value, contingent on content curation); and no implementation carries the lowest risk (0 critical or high) with the lowest reward (no public demonstration). The interactive demo's critical risks — product misrepresentation and API key abuse — are inherent to the concept and cannot be fully mitigated. The session viewer's critical risks — credential leaks and vulnerability disclosure — are operational and mitigable through a robust curation process treated as a security control.

*Risk assessment based on GMI's deployment context (GitHub Actions, single-maintainer, early-stage, "GitHub as Infrastructure" philosophy) as of 2026-03-30.*
