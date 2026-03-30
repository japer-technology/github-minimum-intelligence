# Analysis: Web UI Integration — Arguments For and Against

This document provides a detailed examination of the proposal to integrate `@mariozechner/pi-web-ui` into GMI's public-fabric, as described in [06-web-ui-integration.md](../06-web-ui-integration.md). The analysis evaluates both sides of the decision — why it is a good idea and why it is a bad idea — grounded in GMI's specific deployment context: a headless GitHub Actions agent whose primary interface is GitHub Issues and whose operational philosophy is "GitHub as Infrastructure."

---

## 1. Context

GMI's public-facing website is a static page deployed to GitHub Pages from `public-fabric/` (an `index.html` renderer and a `status.json` content file). It is purely informational — project status, feature descriptions, documentation links. There is no interactive AI functionality.

The proposal in [06-web-ui-integration.md](../06-web-ui-integration.md) evaluates two use cases:

1. **Interactive demo** — a browser-based chat interface where visitors talk to an AI agent directly, using their own API key
2. **Session viewer** — a read-only rendering of past agent sessions as browsable chat transcripts

The question is whether either or both use cases are worth implementing, and whether `pi-web-ui` is the right vehicle — or whether simpler alternatives exist that better align with GMI's architectural commitments.

---

## 2. Arguments For Integration (Good Idea)

### 2.1 Accessibility Beyond GitHub

GMI's current interaction model requires a GitHub account with write access to the repository. This is a hard prerequisite that excludes several audiences:

- Prospective adopters evaluating the project before committing to installation
- Technical managers who want to see the agent in action without repository access
- Developers who want to understand the agent's reasoning style before opening their first issue

A public-facing session viewer eliminates these barriers. It shows real agent interactions without requiring authentication, repository access, or any setup. The audience shifts from "people who have already adopted" to "people who are considering adopting."

**Strength of argument: High.** Adoption friction is a genuine barrier, and read-only transparency is one of the cheapest ways to reduce it.

### 2.2 Concrete Demonstration of Agent Capabilities

The current public-fabric site describes what the agent can do in prose — feature lists, architecture diagrams, and philosophical essays. What it cannot do is *show* what the agent actually does. There is no example of a real conversation, no demonstration of tool use, no visible evidence of the agent's reasoning process.

A session viewer transforms abstract descriptions into concrete evidence. A visitor can see the agent receive a request, reason about it, call tools, handle errors, and produce a result. This is qualitatively different from reading a feature list. It is the difference between "this agent can edit code" and "here is the agent editing code in response to issue #47."

**Strength of argument: High.** Showing is more persuasive than telling, especially for a project whose core claim is that the repository is a sufficient substrate for AI intelligence.

### 2.3 Transparency as a Governance Artifact

GMI's documentation repeatedly emphasises transparency, auditability, and institutional trust. The project's Toulmin-based analyses, DEFCON levels, and security assessments all serve a governance function — they make the system's reasoning and risk posture visible. A session viewer extends this governance commitment to the agent's actual behaviour.

Published session transcripts become a form of operational audit trail:

- Stakeholders can verify that the agent followed instructions
- Security reviewers can inspect tool call patterns for policy compliance
- New contributors can understand how the agent approaches different task types

This aligns with the project's existing commitment to "the repo is the mind" — if the mind's activity is committed to Git, publishing it on Pages is merely making the mind legible at a different URL.

**Strength of argument: Medium-High.** Valuable for trust-building, but only if the curated sessions genuinely represent typical agent behaviour (not cherry-picked successes).

### 2.4 Zero Backend Infrastructure

Both use cases proposed in the source document operate without a backend:

- The interactive demo uses direct browser-to-LLM API calls
- The session viewer renders static content from pre-built HTML or JSON files

This preserves GMI's "no hosted backend" principle. The infrastructure cost is zero — GitHub Pages serves the content, IndexedDB (for the interactive demo) or static files (for the session viewer) provide storage. No servers, no databases, no new trust boundaries.

**Strength of argument: Medium.** True in principle, but the interactive demo does require a new trust boundary (the visitor's API key in the browser) even if it requires no server.

### 2.5 pi-web-ui Component Reuse

If rich session rendering is needed — syntax-highlighted code blocks, tool call visualisation, session tree navigation, artifact display — `pi-web-ui` provides these out of the box. Building equivalent components from scratch would require significant effort.

The package is maintained by the same author as `pi-coding-agent`, so compatibility with GMI's session format (JSONL) is native, not bolted on.

**Strength of argument: Medium.** Relevant only if the rendering requirements exceed what a simple vanilla JS approach can provide. The source document's own recommendation is to start without pi-web-ui.

### 2.6 Existing Build Pipeline Integration

The `run-gitpages` job in the GitHub Actions workflow already deploys `public-fabric/` to GitHub Pages. Adding session HTML files to this directory requires no new workflow steps — they are uploaded alongside existing content. The build integration cost is minimal.

**Strength of argument: Low-Medium.** The deployment path is easy, but the *generation* of session HTML still requires a new build step (JSONL-to-HTML conversion).

### 2.7 Completes the "Published Knowledge" Loop

The [GitHub Pages Jekyll analysis](../../github-jekyll-pages.md) argues that Pages "completes a loop" — the agent reasons, commits, and the committed work publishes itself. A session viewer extends this loop from documentation artifacts to conversation artifacts. The agent's dialogue becomes part of the published knowledge base, not just its written output.

**Strength of argument: Medium.** Architecturally elegant, but the practical value depends on whether anyone actually reads published sessions.

---

## 3. Arguments Against Integration (Bad Idea)

### 3.1 Violation of the "Issues as UI" Principle

GMI's architecture thesis is that GitHub Issues are the primary — and deliberately the *only* — conversational surface. Section 2 of [description-github-as-infrastructure.md](../../description-github-as-infrastructure.md) argues this at length: issues are not a "poor substitute for a real UI" but a "domain-appropriate interface." The system "refuses to build a new front end."

Adding a web-based chat interface — even as a demo — directly contradicts this principle. It creates a second interaction surface that competes with the canonical one. Visitors may conclude that the browser chat is what GMI *is*, rather than understanding that the GitHub Issues experience is the actual product. The demo risks becoming the representative experience, and it is a fundamentally inferior one (no repository access, no tool calling, no Git persistence).

**Strength of argument: High.** This is the strongest argument against the interactive demo. It undermines the project's own thesis.

### 3.2 The Experience Gap Problem

The interactive demo runs pi-web-ui in the browser with no access to the repository. The agent cannot use `bash`, `read`, `write`, or `edit` tools. It cannot inspect files, run tests, or commit changes. It is, at best, a generic chat interface with pi's conversational abilities — stripped of everything that makes GMI distinctive.

A visitor who tries the demo will experience:

- No file editing
- No code review
- No test execution
- No Git operations
- No issue triage
- No repository context

They will conclude that GMI is a chat bot. The actual product — an autonomous coding agent that lives inside the repository — is invisible in this framing. The demo does not demonstrate the product; it demonstrates a diminished shadow of it.

**Strength of argument: Very High.** A demo that misrepresents the product is worse than no demo at all.

### 3.3 API Key Requirement Kills Accessibility

The interactive demo requires visitors to provide their own LLM API key. This immediately re-introduces the adoption friction the demo was supposed to eliminate:

- Most visitors will not have an API key ready
- Those who do may not want to enter it on a third-party website
- A shared/sponsored key creates cost and security concerns

The result is a demo that is accessible only to a subset of the audience that was already technical enough to adopt GMI. It does not reach the evaluators and managers identified in §2.1.

**Strength of argument: High.** The API key requirement is a fundamental usability barrier for the interactive demo use case.

### 3.4 Sensitive Content Risk

Session transcripts may contain:

- Source code from the repository (potentially proprietary)
- Code diffs revealing security patches before they are released
- Personally identifiable information from issue authors
- API keys, tokens, or credentials that appeared in error messages or logs
- Internal project discussions not intended for public consumption

Publishing these transcripts — even curated ones — requires a manual review process that is ongoing, error-prone, and labour-intensive. A single missed redaction could expose sensitive information on a public website.

**Strength of argument: High.** The source document acknowledges this risk ("Curate sessions manually; never auto-publish") but does not address the ongoing labour cost of curation, nor the consequences of a curation failure.

### 3.5 IndexedDB Breaks "Git as Memory"

The interactive demo stores session state in the browser's IndexedDB. This is browser-local, unversioned, and invisible to Git. It directly contradicts the "Git as persistent, versioned memory" principle. Conversations in the browser demo are:

- Not committed to the repository
- Not resumable across devices
- Not auditable by other contributors
- Not durable beyond the browser's storage lifecycle

This creates a class of agent interactions that exist outside the repository's memory model — exactly the shadow state that the project's architecture explicitly warns against.

**Strength of argument: Medium-High.** Applies specifically to the interactive demo. The session viewer (which is read-only, rendering existing Git-tracked sessions) does not have this problem.

### 3.6 New Dependency Maintenance

Adding `@mariozechner/pi-web-ui` introduces a dependency that must be:

- Tracked for version updates
- Tested for compatibility with the session JSONL format
- Monitored for breaking changes in its component API
- Evaluated for browser compatibility
- Rebuilt if the package is discontinued

The source document estimates the dependency at ~50–100 KB. The maintenance burden is not the package size but the API surface coupling — pi-web-ui's rendering components, session tree format, and event display must remain compatible with GMI's session artifacts.

**Strength of argument: Medium.** Manageable for a single dependency, but it is a *new* coupling point in a project that has been careful to minimise external dependencies.

### 3.7 Build Complexity for Session Conversion

The session viewer requires a build step: JSONL → filtered/curated JSON → static HTML. This step must:

- Select which sessions to publish (curation logic)
- Filter sensitive content (redaction logic)
- Convert JSONL events to a renderable format
- Generate HTML pages (with or without pi-web-ui)
- Output to `public-fabric/sessions/`

This is a non-trivial pipeline that must be maintained, tested, and monitored for failures. It adds complexity to the `run-gitpages` workflow job — a job that currently does nothing more than upload a directory.

**Strength of argument: Medium.** The complexity is real but bounded. A vanilla JS approach (recommended in the source document) reduces this to a JSON-generation script and a single HTML file.

### 3.8 Priority Misallocation

The source document rates web UI integration at P3 with 4–16 hours of estimated effort. The same time invested in P1 features (additional tools, web search) or P2 features (extension enhancements, settings optimisation) would deliver higher-impact improvements to the agent's actual capabilities.

Every hour spent on a demo page is an hour not spent on making the real product better. For an early-stage, single-maintainer project, this trade-off matters acutely.

**Strength of argument: Medium.** The opportunity cost is real, but the argument weakens if P1/P2 features are already implemented and the project needs to focus on adoption and visibility.

### 3.9 Architectural Precedent Risk

Implementing a web UI — even as a "demo" — establishes a precedent. Once the UI exists, pressure will build to:

- Add more features to the web interface
- Support real-time interaction (requiring a backend)
- Provide account management and session persistence
- Replicate the Issues experience in the browser

Each step moves further from "GitHub as Infrastructure" toward a conventional web application. The demo becomes a growth vector for scope creep, pulling the project away from its architectural commitments.

**Strength of argument: Medium.** This is a slippery slope argument and should be weighed accordingly, but the pressure pattern is real in software projects.

---

## 4. Comparative Summary

| Dimension | Interactive Demo | Session Viewer | No Implementation |
|---|---|---|---|
| **Accessibility** | Limited (API key required) | High (read-only, public) | Low (GitHub access required) |
| **Accuracy of representation** | Low (no repo access) | High (real sessions) | N/A |
| **Alignment with "GitHub as Infra"** | Low (new UI surface, IndexedDB state) | Medium (publishes Git-tracked content) | High (no deviation) |
| **Sensitive data risk** | Low (no repo data) | High (session transcripts) | None |
| **Maintenance cost** | Medium (pi-web-ui dep + hosting) | Medium (build pipeline + curation) | None |
| **Adoption impact** | Low-Medium (limited by API key) | Medium-High (shows real capabilities) | Low (no demonstration) |
| **Philosophical consistency** | Low | Medium | High |

---

## 5. Weighted Assessment

Assigning weights based on GMI's current maturity and architectural commitments:

| Factor | Weight | Interactive Demo | Session Viewer | No Implementation |
|---|---|---|---|---|
| Architectural alignment | 30% | ★★☆☆☆ | ★★★☆☆ | ★★★★★ |
| Adoption impact | 25% | ★★☆☆☆ | ★★★★☆ | ★★☆☆☆ |
| Implementation cost / risk | 20% | ★★☆☆☆ | ★★★☆☆ | ★★★★★ |
| Representation accuracy | 15% | ★☆☆☆☆ | ★★★★★ | N/A (★★★☆☆) |
| Ongoing maintenance burden | 10% | ★★☆☆☆ | ★★★☆☆ | ★★★★★ |

**Interactive demo weighted score:** 1.90 / 5.00
**Session viewer weighted score:** 3.45 / 5.00
**No implementation weighted score:** 3.90 / 5.00

The "no implementation" option scores highest due to zero cost and perfect architectural alignment. The session viewer scores significantly higher than the interactive demo because it shows real agent capabilities without introducing API key barriers or misrepresenting the product. The interactive demo scores lowest across nearly every dimension.

---

## 6. Use-Case-Specific Verdicts

### 6.1 Interactive Demo: Not Recommended

The interactive demo is a **bad idea in its current form**. The API key requirement limits accessibility, the lack of repository tools misrepresents the product, and browser-local state contradicts the "Git as memory" principle. The demo would show visitors something that is *not* the actual product experience — a chat bot without coding capabilities.

If an interactive demo is desired in the future, a better approach would be a **guided replay** — a pre-recorded session that plays back in the browser, showing the agent's tool calls and reasoning in real time, without requiring an API key or live LLM interaction.

### 6.2 Session Viewer: Conditionally Recommended

The session viewer is a **good idea in principle** but carries operational overhead. It demonstrates real capabilities, requires no API key, and publishes content that is already Git-tracked. However, the sensitive content risk is significant and the curation burden is ongoing.

**Implement only when:**

1. A content curation and redaction process is established
2. At least 3 representative sessions exist that are safe for public consumption
3. P1 and P2 features from the [implementation plan](../implementation-plan.md) are complete

See [decision-framework.md](decision-framework.md) for specific trigger criteria.

---

## 7. The Session Viewer's Unique Value Proposition

If the session viewer is pursued, its strongest contribution is not marketing — it is **architectural proof**. The session viewer makes visible what GMI claims is true:

- That agent conversations produce durable, version-controlled artifacts
- That those artifacts can be published without leaving the repository
- That the agent's reasoning is transparent and auditable
- That "the repo is the mind" is not metaphor but mechanism

A curated session viewer page is a concrete demonstration that the agent's output is first-class Git content — reviewable, publishable, and permanent. This aligns with the [GitHub Pages analysis](../../github-jekyll-pages.md): "The committed work publishes itself."

The risk is that the demonstration becomes the obligation. Once sessions are published, there is an implicit commitment to keep them current, representative, and free of sensitive content. That commitment has ongoing cost.

---

## 8. Summary

The web UI integration proposal contains two distinct use cases with very different risk-reward profiles. The **interactive demo** is a bad idea — it misrepresents the product, requires API keys, and violates core architectural principles. The **session viewer** is a conditionally good idea — it provides genuine transparency and adoption value, but requires careful content curation and should not be pursued until higher-priority features are complete.

The recommended path is:

1. **Do not implement the interactive demo.** The experience gap problem (§3.2) is disqualifying.
2. **Defer the session viewer** until P1/P2 features are complete and a content curation process exists.
3. **When implemented, start with vanilla JS** (as the source document recommends). Migrate to pi-web-ui only if rendering requirements demand it.
4. **Consider a guided replay** as an alternative to the interactive demo — a pre-recorded session that demonstrates real agent capabilities without requiring live LLM interaction.

*Analysis derived from [06-web-ui-integration.md](../06-web-ui-integration.md), [implementation-plan.md](../implementation-plan.md), [description-github-as-infrastructure.md](../../description-github-as-infrastructure.md), and [github-jekyll-pages.md](../../github-jekyll-pages.md). Applies to GMI's public-fabric as of 2026-03-30.*
