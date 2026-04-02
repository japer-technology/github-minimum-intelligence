# Brainstorm: Repackaging UX Components via GitHub Pages

This document brainstorms ideas for UX components that do not fit directly inside GitHub's native interface (Issues, Actions, Pull Requests) but could be delivered through GitHub Pages — either as the Pages themselves, as resources served by Pages that users download and invoke locally, or as hybrid approaches where Pages serves as a distribution mechanism for tools that operate outside the browser.

The core tension: GMI's "GitHub as Infrastructure" principle means the canonical interaction surface is GitHub Issues. But there are UX needs that Issues cannot serve — configuration, visualisation, onboarding, diagnostics, and offline tooling. This brainstorm explores how GitHub Pages can bridge that gap without violating the principle.

---

## 1. Design Principle: Pages as Accessible Front Door

GitHub Pages should make the project accessible to audiences who will never navigate GitHub's developer-centric interface. The key distinction is not "extension vs. replacement" but "who is the audience?"

| Pattern | Example | Audience | Alignment |
|---|---|---|---|
| **Pages as read-only view** | Published documentation, session viewer | Non-developers, evaluators | ✅ High — makes Git content legible without Git literacy |
| **Pages as tool distribution** | Downloadable CLI scripts, configuration generators | New adopters | ✅ High — GitHub serves the file; user runs it locally |
| **Pages as interactive tool** | Browser-based config editor, issue composer | New adopters, maintainers | ✅ Medium-High — adds guided UX that GitHub's native interface lacks |
| **Pages as application** | Full chat interface, dashboard with state | All audiences | ⚠️ Medium — risk of competing with GitHub's native interface for developer tasks |

The previous framing treated any Pages functionality beyond read-only views as a deviation from "GitHub as Infrastructure." The revised framing recognises that Pages serves a *different audience* from GitHub Issues. Developers use Issues; everyone else — the people who need to understand, evaluate, fund, or approve the agent — uses Pages. These surfaces are complementary, not competing.

The risk to watch for is *audience bleed*: if Pages starts serving developer-facing workflows (code editing, issue management, real-time agent interaction), it competes with GitHub's native interface and the architectural concern applies. As long as Pages serves non-developer audiences and one-time setup tasks, it is an accessibility surface, not a replacement surface.

---

## 2. Category A: Pages as Read-Only Views

These ideas use Pages to present information that already exists in the repository but is difficult to consume through GitHub's file browser.

### 2.1 Agent Interaction Gallery

**Concept:** A curated gallery of past agent interactions rendered as readable web pages. Each page shows the full conversation: user request, agent reasoning, tool calls, code changes, and final response.

**How Pages serves it:** Static HTML files generated from session JSONL during the build step. One HTML file per curated session. An index page lists available sessions with title, date, and topic.

**Value:** Demonstrates agent capabilities to prospective adopters without requiring repository access. Acts as a portfolio of the agent's work.

**GitHub-native alignment:** Content originates from Git-tracked session files. Pages is a rendering layer, not a data layer.

---

### 2.2 Architecture Explorer

**Concept:** An interactive documentation site that visualises GMI's architecture — file structure, workflow triggers, event flow, state management — with clickable diagrams that link to the actual source files in the repository.

**How Pages serves it:** Static HTML with embedded SVG diagrams (generated from Mermaid or D2 during the build step). Diagrams link to `github.com/<owner>/<repo>/blob/main/<path>` for source navigation.

**Value:** Makes the project's architecture comprehensible to newcomers who would otherwise need to read 20+ Markdown files and a workflow YAML to understand how the pieces fit together.

**GitHub-native alignment:** All content derives from repository files. The diagrams are a generated view, not new data.

---

### 2.3 Governance Dashboard

**Concept:** A single page that displays the current DEFCON level, active security advisories, the Four Laws compliance status, and links to governance documents. Updated automatically when governance files change.

**How Pages serves it:** A static HTML page that reads from a `governance-status.json` file generated during the build step. The JSON is derived from parsing governance Markdown files for structured metadata.

**Value:** Provides a single-URL answer to "what is the current safety posture of this agent?" — useful for compliance reviews and stakeholder communication.

**GitHub-native alignment:** All data originates from repository files. The dashboard is a projection, not a separate system of record.

---

### 2.4 Changelog and Release Notes Browser

**Concept:** A browsable, searchable changelog derived from Git commit history and release tags. Shows what changed, when, and why — with links to the relevant commits and issues.

**How Pages serves it:** Static HTML generated from `git log`, release tags, and any CHANGELOG.md file. Searchable via client-side JavaScript (e.g., lunr.js).

**Value:** Makes the project's evolution visible without requiring `git log` access. Useful for adopters tracking changes between versions.

**GitHub-native alignment:** Git history is the canonical source. The changelog page is a formatted view.

---

## 3. Category B: Pages as Tool Distribution

These ideas use Pages as a file server — distributing scripts, configurations, or tools that users download and run locally. The user's local environment is the execution surface, not the browser.

### 3.1 One-Line Installer via Pages

**Concept:** Serve the `setup.sh` installer script from GitHub Pages so users can install GMI with a single `curl | bash` command pointing to the Pages URL.

```bash
curl -fsSL https://<user>.github.io/<repo>/install.sh | bash
```

**How Pages serves it:** The install script is a static file in `public-fabric/install.sh`, deployed alongside the existing site.

**Value:** Simpler installation URL than the raw GitHub content URL. The Pages URL is stable, memorable, and not tied to a specific branch or commit SHA.

**GitHub-native alignment:** High — the script lives in the repository and is served by GitHub infrastructure. No external hosting.

**Considerations:**

- `curl | bash` has well-known security concerns; provide a checksum or GPG signature alongside the script
- The script should be pinned to a release tag, not `main`, to avoid serving unstable versions

---

### 3.2 Configuration Generator

**Concept:** A browser-based form on Pages that generates a `.pi/settings.json` file tailored to the user's preferences. The user fills in options (model provider, thinking budget, compaction settings, enabled tools) and downloads the resulting JSON file.

**How Pages serves it:** A static HTML page with JavaScript form logic. No backend — the JSON is generated entirely client-side and offered as a file download.

**Value:** Simplifies initial configuration by guiding users through available options. Reduces errors from manual JSON editing. Acts as interactive documentation for settings.json.

**GitHub-native alignment:** Medium-High — the tool generates a file that the user places in their repository. Pages serves the tool; the output goes into Git.

**Example UX flow:**

1. User visits `https://<user>.github.io/<repo>/configure`
2. Form presents options with descriptions and defaults
3. User adjusts settings
4. User clicks "Download settings.json"
5. User places the file at `.pi/settings.json` in their repository

---

### 3.3 Issue Template Generator

**Concept:** A browser-based tool that generates GitHub Issue Template YAML files based on user preferences. Users select which template types they want (chat, code review, bug report) and customise labels, assignees, and body prompts.

**How Pages serves it:** Static HTML with JavaScript. The generated YAML files are offered as a downloadable ZIP or individual file downloads.

**Value:** Issue templates have a non-trivial YAML schema. A generator reduces the barrier to customisation.

**GitHub-native alignment:** High — the output is a GitHub-native artifact (issue template YAML) that the user commits to their repository.

---

### 3.4 Prompt Template Library

**Concept:** A browsable library of `.pi/prompts/*.md` templates that users can preview, customise, and download. Each template includes documentation, example inputs, and expected agent behaviour.

**How Pages serves it:** Static HTML pages generated from the prompts in the repository. Each template has a "preview" tab (rendered Markdown) and a "download" button (raw Markdown file).

**Value:** Encourages adoption of prompt templates by making them discoverable and previeable. Users can see what a code-review prompt looks like before adding it to their repository.

**GitHub-native alignment:** High — templates originate from the repository and return to the user's repository as files.

---

### 3.5 Extension Marketplace (Lightweight)

**Concept:** A catalog page listing available pi extensions with descriptions, installation instructions, compatibility notes, and one-click download. Not a full marketplace — more like a curated list with download links.

**How Pages serves it:** Static HTML generated from an `extensions-catalog.json` file in the repository. Each extension entry links to its source file for review and offers a download button.

**Value:** Extensions are currently discoverable only by browsing the `.pi/extensions/` directory. A catalog page makes them visible and encourages adoption.

**GitHub-native alignment:** High — extensions are repository files. The catalog is a navigable index of existing content.

---

## 4. Category C: Pages as Interactive Tools

These ideas use Pages for interactive functionality that goes beyond read-only viewing or file distribution. They operate in the browser and may create or manipulate data.

### 4.1 Session Diagnostic Tool

**Concept:** A browser-based tool where users can upload a session JSONL file and get a diagnostic report: token counts, tool call frequency, error events, compaction triggers, and turn-by-turn timing analysis.

**How Pages serves it:** Static HTML with JavaScript. The JSONL file is parsed entirely client-side. No data is sent to any server.

**Value:** Helps users understand agent behaviour, diagnose problems, and optimise settings. Currently, diagnosing a slow or expensive session requires manual JSONL inspection with Unix tools.

**GitHub-native alignment:** Medium — the tool runs in the browser, but operates on Git-tracked artifacts (session JSONL files). No server-side state.

**Privacy:** The JSONL file never leaves the user's browser. This is important because session files may contain sensitive content.

---

### 4.2 AGENTS.md Composer

**Concept:** A browser-based guided editor for creating and editing `AGENTS.md` files. Provides structured fields for the agent's identity, personality, operating instructions, and governance rules, then generates the Markdown file.

**How Pages serves it:** Static HTML with JavaScript form logic. The composed Markdown is offered as a file download.

**Value:** AGENTS.md is the most important configuration file in GMI, but writing one from scratch is daunting. A guided composer makes the structure visible and the process approachable.

**GitHub-native alignment:** Medium-High — the output is a repository file. The composer is a one-time tool, not an ongoing interaction surface.

---

### 4.3 Workflow Validator

**Concept:** A browser-based tool where users can paste or upload their GitHub Actions workflow YAML and get validation feedback: are all required secrets referenced? Are the trigger conditions correct? Is the concurrency group configured? Does the agent job have the correct permissions?

**How Pages serves it:** Static HTML with JavaScript. YAML parsing and validation happen client-side.

**Value:** Workflow misconfiguration is a common source of installation failures. A validator catches errors before the first workflow run.

**GitHub-native alignment:** Medium — operates on a GitHub-native artifact (workflow YAML) but runs in the browser rather than through GitHub's own validation.

---

### 4.4 Cost Estimator

**Concept:** A browser-based calculator that estimates monthly API costs based on the user's expected usage patterns: issues per week, average turns per issue, model provider, and thinking budget.

**How Pages serves it:** Static HTML with JavaScript. Cost tables are embedded or loaded from a static JSON file. No API calls.

**Value:** API cost is a common concern for adopters. A concrete estimate (even approximate) reduces uncertainty.

**GitHub-native alignment:** Medium — the calculator is a standalone tool with no direct connection to the repository, but it supports adoption of the GitHub-native system.

---

### 4.5 Settings Diff Tool

**Concept:** A browser-based tool that compares a user's current `settings.json` against the recommended defaults. Highlights missing keys, deprecated settings, and values that differ from defaults. Suggests optimisations based on the user's provider and model.

**How Pages serves it:** Static HTML with JavaScript. The user pastes or uploads their `settings.json`; the tool compares it against a reference JSON embedded in the page.

**Value:** As settings.json evolves, users' configurations may drift from recommended values. A diff tool makes maintenance visible.

**GitHub-native alignment:** Medium — operates on a repository file but runs in the browser.

---

## 5. Category D: Pages as Progressive Web App (PWA) Host

These ideas use Pages to host a Progressive Web App that provides offline-capable, installable functionality.

### 5.1 Offline Session Reader

**Concept:** A PWA that caches published sessions for offline reading. Users can browse agent interactions on mobile or in disconnected environments.

**How Pages serves it:** PWA manifest and service worker served from Pages. Session data cached via service worker.

**Value:** Niche — useful for reviewing sessions during commutes or in low-connectivity environments.

**GitHub-native alignment:** Low-Medium — the PWA is a separate application, though it renders Git-tracked content.

---

### 5.2 Mobile Issue Composer

**Concept:** A PWA with a mobile-optimised interface for composing and submitting GitHub Issues. Pre-populates issue templates and provides a better mobile UX than GitHub's own mobile issue creation.

**How Pages serves it:** PWA hosted on Pages. Uses the GitHub API (with the user's Personal Access Token) to submit issues.

**Value:** Mobile issue creation on GitHub is clunky. A purpose-built composer could reduce friction.

**GitHub-native alignment:** Low — this essentially rebuilds part of GitHub's UI, which conflicts with the "use GitHub's native interface" principle. Only justified if mobile agent interaction is a priority and GitHub's mobile experience is genuinely inadequate.

---

## 6. Priority Assessment

| ID | Idea | Category | Effort | Value | Alignment | Priority |
|---|---|---|---|---|---|---|
| 2.1 | Agent Interaction Gallery | A (Read-only) | 4–8h | High | High | **P2** |
| 2.2 | Architecture Explorer | A (Read-only) | 8–16h | Medium | High | P3 |
| 2.3 | Governance Dashboard | A (Read-only) | 4–6h | Medium | High | P3 |
| 2.4 | Changelog Browser | A (Read-only) | 4–8h | Low-Medium | High | P4 |
| 3.1 | One-Line Installer | B (Distribution) | 1–2h | High | High | **P1** |
| 3.2 | Configuration Generator | B (Distribution) | 4–8h | High | Medium-High | **P2** |
| 3.3 | Issue Template Generator | B (Distribution) | 4–6h | Medium | High | P3 |
| 3.4 | Prompt Template Library | B (Distribution) | 4–8h | Medium | High | P3 |
| 3.5 | Extension Marketplace | B (Distribution) | 4–8h | Medium | High | P3 |
| 4.1 | Session Diagnostic Tool | C (Interactive) | 8–12h | High | Medium | **P2** |
| 4.2 | AGENTS.md Composer | C (Interactive) | 6–10h | High | Medium-High | **P2** |
| 4.3 | Workflow Validator | C (Interactive) | 6–10h | Medium-High | Medium | P3 |
| 4.4 | Cost Estimator | C (Interactive) | 2–4h | Medium | Medium | P3 |
| 4.5 | Settings Diff Tool | C (Interactive) | 4–6h | Medium | Medium | P3 |
| 5.1 | Offline Session Reader | D (PWA) | 8–12h | Low | Low-Medium | P4 |
| 5.2 | Mobile Issue Composer | D (PWA) | 12–20h | Low-Medium | Low | P4 |

---

## 7. Thematic Grouping

### 7.1 Adoption Accelerators

Ideas that reduce the friction of first-time adoption:

- **One-Line Installer** (P1) — removes the setup ceremony barrier
- **Configuration Generator** (P2) — removes the "blank JSON file" barrier
- **AGENTS.md Composer** (P2) — removes the "blank Markdown file" barrier
- **Cost Estimator** (P3) — removes the "how much will this cost?" uncertainty

These form a natural adoption funnel: install → configure → personalise → estimate costs.

### 7.2 Transparency and Trust

Ideas that make the agent's behaviour visible and inspectable:

- **Agent Interaction Gallery** (P2) — shows what the agent actually does
- **Session Diagnostic Tool** (P2) — shows how the agent performs
- **Governance Dashboard** (P3) — shows what the project's safety posture is
- **Changelog Browser** (P4) — shows how the project evolves

These reinforce GMI's commitment to transparency and institutional trust.

### 7.3 Maintenance Helpers

Ideas that help existing users maintain and optimise their installation:

- **Settings Diff Tool** (P3) — detects configuration drift
- **Workflow Validator** (P3) — catches misconfiguration
- **Prompt Template Library** (P3) — encourages best practices
- **Extension Marketplace** (P3) — surfaces available capabilities

These reduce the ongoing cost of operating GMI.

---

## 8. The "Download and Invoke" Pattern

Several ideas in Categories B and C share a common pattern: **Pages serves a tool; the user downloads an artifact; the artifact operates inside the repository.** This pattern is worth naming because it resolves the tension between "GitHub as Infrastructure" and "UX beyond GitHub's native surface."

```
GitHub Pages (public) → serves tool
User's browser (private) → generates artifact
User's repository (canonical) → receives artifact via git commit
```

The key properties of this pattern:

1. **No new backend** — Pages is static file serving
2. **No persistent state outside Git** — the tool's output enters the repository as a committed file
3. **Client-side only** — no data leaves the user's browser (important for sensitive configuration)
4. **One-shot usage** — the tool is used once or occasionally; it does not become a persistent UI dependency
5. **Output is auditable** — the generated file can be reviewed, diffed, and version-controlled like any other repository file

This pattern preserves the "GitHub as Infrastructure" principle while acknowledging that some interactions — initial configuration, one-time setup, diagnostic analysis — are better served by a guided browser tool than by a text editor and a documentation page.

---

## 9. Relationship to pi-web-ui

Most ideas in this brainstorm **do not require pi-web-ui**. The only ideas that would benefit from it are:

| Idea | pi-web-ui Relevance |
|---|---|
| Agent Interaction Gallery (2.1) | Would use pi-web-ui for rich session rendering |
| Session Diagnostic Tool (4.1) | Could use pi-web-ui components for JSONL event display |
| Offline Session Reader (5.1) | Would use pi-web-ui for mobile-friendly session rendering |

All other ideas are self-contained tools that use standard HTML, CSS, and JavaScript. This means GMI can pursue the majority of these ideas without taking a dependency on pi-web-ui — the dependency question is isolated to the session-related features.

---

## 10. Summary

GitHub Pages serves as an accessible front door for people who will never navigate GitHub's developer-centric interface. The design principle is audience separation: developers interact through Issues; evaluators, stakeholders, and new adopters interact through Pages. Read-only views (Category A) and tool distribution (Category B) are highest-value because they make programmerville disappear for the widest audience. Interactive tools (Category C) are valuable when they guide one-time setup tasks that are otherwise daunting (configuring settings.json, writing AGENTS.md, validating workflows). PWAs (Category D) are lowest priority due to maintenance cost and narrow audience.

The highest-value ideas form an **adoption funnel**: a one-line installer (P1) → a configuration generator (P2) → an AGENTS.md composer (P2) → an interaction gallery (P2). Together, these reduce the three biggest adoption barriers: installation friction, configuration complexity, and capability uncertainty — all without requiring the adopter to understand GitHub's developer interface.

The "download and invoke" pattern — where Pages serves a client-side tool that generates a file the user commits to their repository — is the key architectural insight. It extends the user experience beyond GitHub's native interface while keeping the canonical data flow inside Git. For non-developers, the pattern goes further: read-only views like the session viewer require no Git interaction at all, making the agent's work legible to anyone with a web browser.

*Brainstorm based on GMI's architecture, public-fabric deployment, and the principle that a UX making GitHub's "programmerville" disappear is a good thing. As of 2026-03-30.*
