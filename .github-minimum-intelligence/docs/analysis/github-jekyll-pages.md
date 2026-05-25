# Analysis: GitHub Pages Jekyll as a Minimum Intelligence Primitive

GitHub Pages with Jekyll is GitHub's built-in static site generator. It reads Markdown files from a repository, processes them through Jekyll, and publishes a website — no external hosting, no CI pipeline to configure, no deployment credentials to manage. For a project whose architecture thesis is "the repository is the mind," Pages represents something specific: the mind's ability to publish a legible, navigable view of itself using nothing beyond what the repository already contains.

This document examines where GitHub Pages Jekyll aligns with Minimum Intelligence's design goals, where it creates new capability, and where its constraints matter.

---

## 1. Architectural Alignment

Minimum Intelligence builds on four GitHub-native primitives:

| Primitive | Role |
|---|---|
| **GitHub Issues** | Conversation interface |
| **GitHub Actions** | Compute / execution runtime |
| **Git** | Persistent, versioned memory |
| **GitHub Secrets** | Credential management |

GitHub Pages is a fifth primitive that has been available all along. It converts repository content into a published website with zero additional infrastructure. Enabling it requires a single setting in the repository configuration — no new dependencies, no external services, no additional trust boundaries.

This is precisely the pattern Minimum Intelligence follows: compose GitHub's own primitives to deliver capability that would otherwise require external tooling.

---

## 2. The Documentation Is Already There

The `.github-minimum-intelligence/docs/` directory currently contains 20+ Markdown files spanning architecture, security, governance, analysis, and foundational philosophy. These files already have:

- a central `index.md` with structured navigation tables,
- consistent heading hierarchy and cross-document links,
- horizontal rules as section separators,
- relative links between documents.

Jekyll processes Markdown natively. The existing documentation tree is nearly Jekyll-ready without modification. The gap between "documentation that lives in a repository" and "documentation published as a browsable site" is, in this case, a configuration toggle — not a migration effort.

### 2.1 What Jekyll Adds Over Raw Markdown Browsing

GitHub already renders Markdown files in the repository browser. Jekyll adds:

| Capability | Raw GitHub Markdown | Jekyll on GitHub Pages |
|---|---|---|
| Navigation / sidebar | Manual links only | Auto-generated from front matter or data files |
| Search | GitHub code search only | Client-side search (lunr.js, etc.) |
| Consistent layout | None — each file renders independently | Shared templates, headers, footers |
| Custom URL structure | Tied to file path | Configurable permalinks |
| Collections | Flat directory listing | Typed groupings (analyses, sessions, questions) |
| Metadata display | Not rendered | Front matter fields rendered in templates |
| RSS / Atom feed | Not available | Auto-generated for new content |

The value is not that any single capability is transformative. It is that all of them emerge from files already in the repository, processed by infrastructure GitHub provides for free.

---

## 3. Agent-Generated Content as Published Knowledge

The Minimum Intelligence agent already produces structured Markdown as its primary output format. Session transcripts are committed to git. Analysis documents are written to the `docs/analysis/` directory. Every interaction generates content that accumulates in the repository.

Jekyll turns this accumulation into a browsable knowledge base without requiring the agent to do anything differently. The workflow becomes:

1. User opens an issue.
2. Agent reasons, responds, and commits artifacts (Markdown files, code, transcripts).
3. Jekyll builds. New content is published automatically.

There is no "publish" step. There is no content management system. The repository's existing commit-and-push cycle _is_ the publishing pipeline.

### 3.1 Front Matter as Structured Metadata

Jekyll's front matter block allows structured metadata at the top of any Markdown file:

```yaml
---
title: "GitHub Data Size Limits for LLM Processing"
category: analysis
date: 2025-06-15
tags: [context-window, github-api, data-limits]
---
```

This metadata is invisible when viewing raw Markdown but becomes queryable by Jekyll templates. The agent could add front matter to documents it generates, enabling:

- automatic categorization of analyses, sessions, and governance docs,
- chronological ordering of agent-produced content,
- tag-based filtering across the knowledge base,
- structured feeds of new content.

The front matter convention is also fully compatible with raw Markdown rendering — GitHub simply ignores the YAML block when displaying files in the repository browser.

### 3.2 Collections for Document Types

Jekyll collections map naturally to the existing documentation structure:

| Collection | Source Directory | Content |
|---|---|---|
| `analyses` | `docs/analysis/` | Technical analyses (data limits, this document, future studies) |
| `questions` | `docs/` | Foundational questions (what, who, when, where, how, how much) |
| `governance` | `docs/` | Security assessments, incident response, operational readiness, governance framework |
| `sessions` | `state/sessions/` | Agent conversation transcripts |

Each collection gets its own index page, its own feed, and its own rendering rules — all driven by the files that already exist.

---

## 4. Extending "The Repo Is the Mind"

The project's architectural thesis states:

> The repository stops being "where code ends up" and becomes "where reasoning accumulates."

GitHub Pages adds a corollary: **accumulated reasoning becomes publishable without leaving the repository.**

This matters for several reasons:

### 4.1 Legibility at Scale

Twenty Markdown files in a directory are navigable. Two hundred are not — at least not through GitHub's file browser. Jekyll provides the organizational layer (navigation, search, categorization) that makes a growing knowledge base accessible as it scales.

### 4.2 External Accessibility

Repository content requires GitHub access (or at minimum, awareness that the repo exists). A published Pages site is discoverable by search engines, linkable in external documentation, and accessible to stakeholders who may not have GitHub accounts.

### 4.3 Separation of Audience

The repository browser serves contributors and auditors — people who need to see diffs, history, and raw files. A Jekyll site serves consumers of the knowledge — people who want to read analysis, understand governance, or review the agent's published reasoning. These are complementary views of the same content.

### 4.4 The Agent Can Maintain Its Own Site

Because Jekyll sites are just files in a repository, and the agent already modifies files in the repository, the agent can:

- generate new pages,
- update navigation when new content is added,
- rebuild index pages or tag listings,
- add front matter to documents it creates.

The site becomes a maintained artifact of agent activity, not a separate system requiring human intervention. This is consistent with the project's principle that agent behavior should produce first-class Git artifacts.

---

## 5. Practical Constraints

### 5.1 GitHub Pages Limits

| Constraint | Limit |
|---|---|
| Published site size | 1 GB recommended |
| Repository size (soft) | 1 GB recommended, 5 GB hard |
| Build time | 10-minute timeout |
| Bandwidth | 100 GB/month soft limit |
| Builds per hour | 10 (soft limit) |
| Supported Jekyll version | GitHub Pages gem (currently Jekyll 3.10.x) |

For a documentation site generated from agent activity, these limits are generous. The entire current documentation tree is well under 1 MB. Even aggressive agent activity producing hundreds of documents per year would remain far below the size and build-time ceilings.

### 5.2 Jekyll Version Constraints

GitHub Pages runs a specific, pinned Jekyll version with a fixed set of plugins (the `github-pages` gem). This means:

- **No arbitrary plugins.** Only whitelisted plugins are available in GitHub Pages builds.
- **Jekyll 3.x, not 4.x.** Some newer Jekyll features are unavailable.
- **Workaround:** Use GitHub Actions to build with any Jekyll version and deploy to Pages. This uses Actions (already part of the stack) but adds workflow complexity.

For a documentation site driven by Markdown and front matter, the default GitHub Pages Jekyll version is sufficient. Plugin constraints only matter if custom processing is required.

### 5.3 What Does Not Translate Well

| Content Type | Issue |
|---|---|
| Session transcripts (raw) | Often very long. May need truncation or summary views. |
| Binary artifacts | Jekyll does not process images, PDFs, etc. — they pass through as static files but add to site size. |
| Private repositories | GitHub Pages on free plans requires public repos. Private Pages requires GitHub Enterprise or a paid plan. |
| Real-time content | Jekyll is a static generator. Content updates require a build trigger (commit to the publishing branch). |

### 5.4 Build Trigger Integration

Jekyll rebuilds on every push to the configured publishing branch. Since the Minimum Intelligence agent already commits to the repository, builds happen naturally. No additional trigger mechanism is required.

However, each agent interaction that commits files will trigger a Pages rebuild. Under the 10-builds-per-hour soft limit, a burst of rapid agent interactions could temporarily exceed the build quota. In practice, this is unlikely to be a problem for typical usage patterns.

---

## 6. What This Enables

### 6.1 Published Analysis Library

Each document in `docs/analysis/` becomes a permanent, citable page. External teams or stakeholders can reference specific analyses by URL rather than navigating repository file trees.

### 6.2 Governance Transparency

The security assessment, governance framework, operational readiness levels, and incident response procedures — currently accessible only to repository viewers — become a published governance resource. This is relevant for organizations evaluating adoption: they can review the safety model before granting repository access.

### 6.3 Knowledge Accumulation Over Time

As the agent produces more analyses, answers more questions, and generates more documentation, the Jekyll site grows into a searchable knowledge base. This transforms the agent from a reactive tool (responds to issues) into a knowledge-producing system whose output is durably published.

### 6.4 Zero-Infrastructure Publishing

The end-to-end path — user asks question → agent reasons → agent writes Markdown → commit triggers build → content is published — requires:

- no CMS,
- no hosting provider,
- no deployment pipeline beyond what GitHub provides natively,
- no additional secrets or credentials.

This is the "minimum" in Minimum Intelligence applied to publishing: the smallest possible infrastructure that produces a complete result.

---

## 7. Summary

GitHub Pages Jekyll is interesting to Minimum Intelligence not because it is a powerful web framework — it is deliberately simple — but because it completes a loop.

The project already demonstrates that an AI agent can live inside a repository, reason through issues, and commit its work to git. GitHub Pages adds the final step: **the committed work publishes itself.** Reasoning becomes documentation. Documentation becomes a website. The website is the repository. The repository is the mind.

The practical requirements are minimal:

- **Enable GitHub Pages** in repository settings, pointed at the docs directory or a dedicated branch.
- **Add a `_config.yml`** to configure Jekyll (theme, collections, navigation).
- **Optionally add front matter** to existing Markdown files for richer categorization.

No new dependencies. No external services. No additional trust boundaries. Just another GitHub primitive, doing what it was designed to do, applied to content the agent already produces.

The alignment is architectural, not incidental. Every design decision in Minimum Intelligence — Markdown as the primary format, git as the persistence layer, the repository as the coordination surface — happens to be exactly what Jekyll expects. The documentation is already written. The publishing infrastructure is already available. The gap between "knowledge in a repository" and "knowledge on a website" is, in this case, a configuration file.
