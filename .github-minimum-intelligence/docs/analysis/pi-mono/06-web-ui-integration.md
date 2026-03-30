# Implementation: Web UI Integration

This document details the implementation plan for evaluating and potentially integrating `@mariozechner/pi-web-ui` into the GMI public-fabric, as identified in the [implementation plan](implementation-plan.md).

---

## 1. Current State

### 1.1 Public-Fabric Architecture

GMI's public-facing website is a static page deployed to GitHub Pages:

```
.github-minimum-intelligence/public-fabric/
├── index.html        # Single-page renderer
└── status.json       # Content data (sections, badges, links)
```

The page displays project status, feature descriptions, and documentation links. It is purely informational — there is no interactive chat or AI functionality.

### 1.2 pi-web-ui Package

`@mariozechner/pi-web-ui` provides web components for AI chat interfaces:

- Pre-built chat UI with session management
- Support for sessions, artifacts, and attachments
- IndexedDB-backed storage for browser-based persistence
- Compatible with pi's JSONL event format
- No backend required — can connect directly to LLM APIs from the browser

---

## 2. Use Case Evaluation

### 2.1 Interactive Demo Page

**Concept:** Add an interactive chat interface to public-fabric where visitors can talk to the GMI agent directly in their browser, without needing to create a GitHub issue.

**Architecture:**

```
Browser
  └─ pi-web-ui components
       └─ Direct LLM API call (using visitor's API key)
            └─ Model responds with pi agent capabilities
```

**Pros:**
- Zero backend infrastructure — aligns with "GitHub as Infrastructure" principle
- Demonstrates pi agent capabilities interactively
- Could load the same `.pi/` configuration as the GitHub Actions agent

**Cons:**
- Requires the visitor to provide their own API key (or a shared key, which creates cost/security concerns)
- Browser-based agent has no access to the repository (no `bash`, `read`, `write` tools)
- Session state lives in IndexedDB (browser-local), not in Git
- Significantly different from the actual GitHub Issues experience

### 2.2 Session Viewer

**Concept:** Use pi-web-ui to render past agent sessions (stored as JSONL in `state/sessions/`) as readable chat transcripts on the public-fabric website.

**Architecture:**

```
GitHub Actions
  └─ Agent runs, produces state/sessions/*.jsonl
       └─ Build step converts JSONL to static HTML via pi-web-ui
            └─ Published to GitHub Pages
```

**Pros:**
- Shows real agent interactions with full context
- No API key required (read-only)
- Demonstrates actual agent capabilities

**Cons:**
- Session transcripts may contain sensitive information (issue contents, code diffs)
- Additional build step required
- Session files can be large (hundreds of KB per conversation)

### 2.3 Assessment

| Use Case | Feasibility | Value | Recommendation |
|---|---|---|---|
| Interactive demo | Medium | Medium | Defer — API key requirement limits accessibility |
| Session viewer | High | Medium | Consider — but only for selected/curated sessions |
| Chat interface replacement | Low | Low | Not recommended — GitHub Issues is the primary interface |

---

## 3. Implementation Approach (Session Viewer)

If the session viewer use case is pursued:

### Step 1: Evaluate pi-web-ui Components

```bash
npm install @mariozechner/pi-web-ui
```

Review the package's exported components:

- Chat message rendering
- Session tree navigation
- Tool call display
- Code block rendering

### Step 2: Build a Session Converter

Create a build script that:

1. Reads selected JSONL session files from `state/sessions/`
2. Filters out sensitive content (if any)
3. Renders to static HTML using pi-web-ui components
4. Outputs to `public-fabric/sessions/`

### Step 3: Integrate with GitHub Pages Deployment

Update the workflow's `run-gitpages` job to include the session HTML files:

```diff
 - name: Upload GitHub Pages artifact
   uses: actions/upload-pages-artifact@v4
   with:
     path: .github-minimum-intelligence/public-fabric
```

### Step 4: Add Navigation

Update `public-fabric/index.html` or `status.json` to link to the session viewer pages.

---

## 4. Alternative: Lightweight Session Viewer Without pi-web-ui

Instead of pulling in the full pi-web-ui package, a simpler approach:

1. Create a `session-viewer.html` page in public-fabric
2. Use vanilla JavaScript to parse JSONL and render messages
3. Load session data from a static JSON file generated during the build step

This avoids a new dependency and keeps the public-fabric minimal.

```html
<!-- session-viewer.html (simplified) -->
<script>
  fetch("sessions/curated.json")
    .then(r => r.json())
    .then(messages => {
      messages.forEach(msg => {
        const el = document.createElement("div");
        el.className = `message ${msg.role}`;
        el.textContent = msg.text;
        document.getElementById("chat").appendChild(el);
      });
    });
</script>
```

---

## 5. Decision Matrix

| Factor | pi-web-ui | Vanilla JS |
|---|---|---|
| Rich rendering (code blocks, tool calls) | ✅ | ❌ (manual) |
| Session tree navigation | ✅ | ❌ |
| Dependency weight | ~50–100 KB | 0 |
| Maintenance burden | Track pi-web-ui updates | Self-maintained |
| Alignment with "minimal infrastructure" | Medium | High |

**Recommendation:** Start with the vanilla JS approach for a proof of concept. Migrate to pi-web-ui only if the rendering requirements exceed what vanilla JS can reasonably provide.

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Session data contains sensitive information | High | High | Curate sessions manually; never auto-publish |
| pi-web-ui API changes | Medium | Medium | Pin version; test before upgrading |
| Increased build complexity | Medium | Low | Keep as optional build step; don't block deployment |
| Browser compatibility | Low | Low | pi-web-ui uses modern web standards |

---

## 7. Prerequisites

1. **Session curation process** — Define which sessions are safe to publish
2. **Sensitive content filter** — Build tooling to redact API keys, personal information, or proprietary code from session transcripts
3. **Build step** — Create a script to convert JSONL to publishable format

---

## 8. Summary

The pi-web-ui package offers rich chat rendering components that could enhance public-fabric with an interactive demo or session viewer. However, the interactive demo requires visitors to provide API keys (limiting accessibility), and the session viewer requires careful content curation to avoid exposing sensitive information. The recommended approach is to start with a lightweight vanilla JS session viewer for curated transcripts and evaluate pi-web-ui for upgrade if richer rendering is needed.

*Estimated effort: 4–8 hours (session viewer with vanilla JS), 8–16 hours (with pi-web-ui integration). Risk: Medium. Priority: P3 — defer until core features are stable.*
