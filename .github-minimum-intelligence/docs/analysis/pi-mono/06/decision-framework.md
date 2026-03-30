# Decision Framework: Web UI Integration

This document provides a structured framework for deciding when (and whether) to proceed with web UI integration as described in [06-web-ui-integration.md](../06-web-ui-integration.md). The framework is trigger-based: implementation should be initiated by concrete conditions being met, not by a predetermined schedule.

---

## 1. Decision Principle

Web UI integration introduces a **new interaction surface** that competes with the canonical GitHub Issues interface. Adding a surface is easy; removing it creates expectations debt. The decision should therefore be conservative: implement only when the value is demonstrable and the prerequisites are satisfied.

**Rule:** Do not implement proactively. Implement when concrete adoption or transparency needs arise that cannot be met through the existing GitHub-native interface.

---

## 2. Scope: Two Independent Decisions

The source document proposes two use cases that should be evaluated independently:

| Use Case | Decision Type | Reversibility |
|---|---|---|
| Interactive demo | Reversibility-neutral (can be removed without data loss) | High |
| Session viewer | Reversibility-neutral (can be removed; sessions remain in Git) | High |

Both use cases are individually reversible — deleting the HTML files and build step removes the feature cleanly. However, once published, external links to session viewer pages create a soft dependency that discourages removal.

---

## 3. Trigger Events: Session Viewer

### 3.1 Prerequisites (All Must Be Met)

These are not triggers — they are preconditions. The session viewer should not be considered until all are satisfied:

| ID | Prerequisite | Verification |
|---|---|---|
| P-01 | P1 features from [implementation-plan.md](../implementation-plan.md) are complete | Additional tools and web search are implemented and tested |
| P-02 | P2 features are complete or in progress | Extension enhancements and settings optimisation are implemented |
| P-03 | At least 3 representative sessions exist that are safe for public consumption | Sessions reviewed for sensitive content; no API keys, credentials, or PII |
| P-04 | A content redaction process is documented | Written procedure for reviewing and sanitising session transcripts |
| P-05 | public-fabric is stable and actively maintained | index.html and status.json are current; GitPages deployment is reliable |

### 3.2 Soft Triggers (Evaluate Implementation)

Once all prerequisites are met, the following events should prompt an implementation evaluation:

| ID | Trigger | Evidence Required |
|---|---|---|
| T-01 | Prospective adopters ask "can I see what the agent does?" | Three or more requests for a demo or example session |
| T-02 | External documentation or blog posts need to link to example interactions | A concrete need for a stable URL showing agent behaviour |
| T-03 | Governance review requires published evidence of agent behaviour | An audit, compliance check, or stakeholder review that needs visible session data |
| T-04 | The project's public visibility increases to a point where the status page alone is insufficient | GitHub stars, forks, or inbound traffic suggest broader interest |

### 3.3 Non-Triggers (Do Not Implement)

These conditions, on their own, do not justify implementation:

| Condition | Why It Is Not a Trigger |
|---|---|
| "The page looks empty without a demo" | Aesthetic concerns do not justify architectural additions |
| "pi-web-ui has nice components" | Available tooling is not a reason to build features |
| "Other projects have chat demos" | Competitive comparison does not override architectural principles |
| "We should show off the agent" | Marketing impulse should be satisfied by documentation and README, not by a new UI surface |
| "Sessions are already in Git; why not publish them?" | Availability of data does not mean it should be published without curation |

---

## 4. Trigger Events: Interactive Demo

### 4.1 Hard Prerequisite

The interactive demo should not be implemented unless the Experience Gap Problem (see [analysis.md §3.2](analysis.md)) is resolved. Resolution requires one of:

| ID | Resolution Path | Feasibility |
|---|---|---|
| R-01 | Browser-based agent gains access to repository tools (bash, read, write) | Very Low — requires a backend or WebContainer runtime |
| R-02 | A sandbox repository is created for the demo with pre-loaded content | Medium — reduces experience gap but still differs from real usage |
| R-03 | The demo is replaced by a guided replay of a real session | High — no live LLM needed; accurate representation |

Without R-01, R-02, or R-03, the interactive demo will misrepresent the product. Misrepresentation is worse than having no demo.

### 4.2 Additional Prerequisites

Even if the experience gap is resolved:

| ID | Prerequisite | Verification |
|---|---|---|
| D-01 | A funding model exists for API costs (if using a shared key) | Budget allocated; cost monitoring in place |
| D-02 | Rate limiting is implemented to prevent abuse | Per-session token limits; per-IP cooldown |
| D-03 | The demo is clearly labelled as a limited preview, not the full experience | UI copy explicitly states: "This demo does not represent the full agent experience. See GitHub Issues for the complete interaction model." |

### 4.3 Current Recommendation

**Do not implement the interactive demo.** None of the resolution paths (R-01 through R-03) have been pursued, and the experience gap remains unresolved. If a demonstration is needed, pursue R-03 (guided replay) as an alternative — it requires no API key, no backend, and accurately represents the agent's capabilities.

---

## 5. Implementation Evaluation Process

When a trigger event occurs, follow this process:

### Step 1: Verify Prerequisites

Check all prerequisites in §3.1 (for session viewer) or §4.1–4.2 (for interactive demo). If any prerequisite is unmet, defer implementation until it is satisfied.

### Step 2: Assess Value Against Cost

| Factor | Session Viewer | Interactive Demo |
|---|---|---|
| Estimated implementation effort | 4–8 hours | 8–16 hours |
| Ongoing curation effort | 1–2 hours per published session | API cost monitoring; abuse prevention |
| Value to prospective adopters | High (shows real capabilities) | Low-Medium (limited capabilities) |
| Alignment with architecture | Medium | Low |

### Step 3: Choose Implementation Approach

For the session viewer:

| Approach | When to Choose |
|---|---|
| Vanilla JS | Start here. Sufficient for text rendering, basic code blocks, and message threading |
| pi-web-ui | Upgrade when vanilla JS cannot handle tool call visualisation, session tree navigation, or artifact display |
| Jekyll integration | Consider if the session viewer should be part of a broader Jekyll-powered documentation site (see [github-jekyll-pages.md](../../github-jekyll-pages.md)) |

For the interactive demo:

| Approach | When to Choose |
|---|---|
| Guided replay | Preferred approach. Pre-recorded session plays back in the browser |
| Live demo with user API key | Only if R-01 or R-02 is resolved and the experience gap is addressed |
| Sandbox repository demo | If a dedicated demo repository with pre-loaded content is available |

### Step 4: Implement Incrementally

1. Build the minimum viable version (one curated session, vanilla JS renderer)
2. Deploy to a sub-path of public-fabric (e.g., `public-fabric/sessions/`)
3. Do not link from the main page until the rendering quality is validated
4. Collect feedback from 3+ external viewers before expanding

### Step 5: Evaluate After 30 Days

After 30 days of deployment:

| Signal | Interpretation | Action |
|---|---|---|
| Sessions are being viewed (measurable via GitHub Pages analytics) | Value is being delivered | Continue; expand curated session library |
| No measurable traffic | Value is not being consumed | Evaluate whether the sessions are linked, discoverable, or interesting |
| Sensitive content incident | Curation process failed | Pause publishing; review and improve redaction process |
| pi-web-ui update breaks rendering | Dependency risk materialised | Revert to vanilla JS; reassess dependency |

---

## 6. Decision Record Template

When a decision is made (implement or defer), record it in this format:

```markdown
### Decision: [Session Viewer / Interactive Demo]

**Date:** YYYY-MM-DD
**Trigger:** [Which trigger event occurred]
**Prerequisites met:** [List P-01 through P-05 status]
**Decision:** [Implement / Defer / Reject]
**Rationale:** [Brief explanation]
**Approach:** [Vanilla JS / pi-web-ui / Guided replay / Other]
**Review date:** [30 days from implementation, or next trigger event]
```

---

## 7. Current Status

As of 2026-03-30:

- **Prerequisites P-01 and P-02** are not fully met. P1 and P2 features from the implementation plan are in progress but not complete.
- **Prerequisite P-03** is not met. No sessions have been reviewed for public consumption.
- **Prerequisite P-04** is not met. No content redaction process exists.
- **No triggers** have been activated. No adoption requests, governance reviews, or external linking needs have been identified.
- **Recommendation:** Do not implement either use case. Revisit when P1/P2 features are complete and adoption interest creates a concrete need for public demonstration.

---

## 8. Summary

The web UI integration decision should be driven by concrete adoption or transparency needs, not by the availability of pi-web-ui components or by competitive pressure. The session viewer has a viable path to implementation but requires five prerequisites to be met first — most importantly, a content curation process and the completion of higher-priority features. The interactive demo should not be implemented until the experience gap problem is resolved, with guided replay (R-03) as the recommended alternative. Both decisions are independently reversible, which lowers the stakes but does not eliminate the ongoing maintenance cost once deployed.

*Framework derived from the analysis in [analysis.md](analysis.md) and [risk-matrix.md](risk-matrix.md). Applies to GMI's public-fabric as of 2026-03-30.*
