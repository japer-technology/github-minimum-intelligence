# Changelog

All notable changes to GitHub Minimum Intelligence are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.6] — 2026-04-09

### Changed

- Moved GitHub Pages deployment (`run-gitpages`) to a dedicated workflow at `.github/workflows/gmi-public-fabric.yml`, separating concerns from the main agent workflow.

### Fixed

- Corrected relative links in `docs/` from `../../` to `../` for README.md and sibling files.

### Removed

- Removed DEFCON and Four Laws of AI references from all primary docs and analysis files.
- Removed `transition-to-defcon-*.md` files and cleaned up all references.
- Deleted `docs/order-act-locally.md`.

### Improved

- Polished `the-repo-is-the-mind.md` for redundancy, structure, and navigation.
- Polished `question-*.md` files for factual accuracy and precision.
- Updated `CONTRIBUTING.md` and `security-assessment.md`.

---

## [1.1.5] — 2026-04-08

### Added

- `PI_CACHE_RETENTION=long` environment variable and `quietStartup: true` setting for optimized prompt caching.
- `ramifications-of-65.1.md` analysis document exploring the pi-mono maximisation path.

### Fixed

- Resolved recursive `.pi` folder creation during upgrade — prevented `.pi` directory nesting when backup/restore runs on persistent runners.

---

## [1.1.4] — 2026-04-07

### Changed

- Upgraded pi-mono from v0.57.1 to v0.65.1 — a major runtime update bringing improved session management, compaction, and retry logic.
- Moved pi-mono update documentation to `docs/analysis/pi-mono-upgrade-57.1-to-65.1.md`.

---

## [1.1.3] — 2026-04-06

### Fixed

- Fixed `.pi` directory nesting during upgrade — `cp -R` was creating subdirectories inside existing directories instead of replacing them. Added `rm -rf` cleanup before restore.
- Second round of `.pi` directory nesting fixes with defensive cleanup in the upgrade workflow.

---

## [1.1.2] — 2026-04-02

### Added

- Rethought `06-web-ui-integration` analysis: framed "making GitHub programmerville disappear" as a feature, not a bug.
- Added weighted score methodology and risk severity calculation notes to analysis documents.

---

## [1.1.1] — 2026-03-31

### Added

- Enabled additional built-in pi tools (`grep`, `find`, `ls`) in the agent invocation, expanding the agent's read-only capabilities.
- Added pi-mono feature implementation plan and feature-specific analysis documents.
- Added SDK migration analysis with pros/cons, risk matrix, and decision framework.
- Added extension enhancements analysis, decision framework, risk matrix, and extension brainstorm.
- Added `06-web-ui-integration` analysis: for/against analysis, decision framework, risk matrix, and GitPages UX brainstorm.
- Added Toulmin model alternate analytical views: critical theory, formal logic, rhetoric, debate frameworks, scientific method, and Toulmin model documents.
- Added `gmi-argument-fixes.md` — cross-analysis synthesis of 37 recommended argument improvements.
- Added implementation outlines for LLM Reasoning Transparency (Toulmin §6), Rebuttal-Driven Security Hardening (Toulmin §4), and Identity Governance Separation (Toulmin §7).

### Changed

- Renamed analysis files for consistency: `Architecture-Study.md` → `description-architecture-study.md`, `github-as-infrastructure.md` → `description-github-as-infrastructure.md`.
- Cleaned up stale analysis documents: removed `openclaw-implementation.md`, `agenticana-implementation.md`, `Capability-Flag-Files.md`, `how-to-install-and-update.md`, `REPOMIX.md`.

---

## [1.1.0] — 2026-03-29

_First tagged release. Marks the transition from rapid iteration to versioned stability._

### Added

- Architecture Study document.
- Toulmin model argumentation analysis (`.TOULMIN.md` → `docs/analysis/toulmin.md`).
- Access control analysis and policy engine design (`.CONTROL.md`).
- `toulmin-lessons.md` — actionable lessons extracted from the Toulmin analysis.
- Toulmin changes master list (`toulmin-changes.md`).

### Fixed

- Filtered out PR comments from the `issue_comment` trigger in the `run-agent` job — the agent no longer responds to pull request review comments.

### Changed

- Updated agent workflow version to 1.1.0.

---

## [1.0.8] — 2026-03-18

### Fixed

- Corrected broken relative links in documentation files inside `.github-minimum-intelligence/`.
- Agent now posts an issue comment before throwing a push-failure error, so users see feedback even when the push fails.

---

## [1.0.6] — 2026-03-15

### Added

- pi-mono feature utilisation: compaction and retry settings in `.pi/settings.json`, prompt templates for `code-review` and `issue-triage`, and the `github_repo_context` custom tool extension.
- Public-fabric `status.json` updated to match current repository state.

### Fixed

- Improved error handling: `console.warn` for non-fatal parse failures, `JSON.parse` error handling for malformed data, null comment body handling.
- Removed `!` from `RESERVED_PREFIXES` to prevent false-positive filtering.

---

## [1.0.5] — 2026-03-15

### Fixed

- GitHub Pages workflow now deploys after agent commits on all event types, using `needs: [run-agent, run-install]` with `if: always() && !cancelled()` and `ref: main`.

---

## [1.0.4] — 2026-03-14

### Fixed

- Used `if/then/fi` for conditional file copies in the upgrade workflow to prevent non-zero exit codes under `set -euo pipefail`.
- Wrapped top-level code in `async main()` to resolve ESM top-level return error.

---

## [1.0.3] — 2026-03-13

### Added

- Reserved-prefix filtering: the agent now skips issues and comments prefixed for other AI agents.
- Analysis documents for Agenticana and OpenClaw implementation explorations.
- Public-fabric website updates: added missing sections, fixed inaccuracies, added anchor IDs.

### Fixed

- Agent now posts an issue comment before throwing push-failure errors, so users always see feedback.
- Fixed stale GitHub Actions version references in documentation.
- Updated GitHub Actions to Node.js 24 compatible versions.

### Changed

- Updated workflow install/upgrade to exclude `public-fabric` from template copy.

---

## [1.0.0] — 2026-03-11

_First stable release under the `.github-minimum-intelligence` directory name._

### Added

- One-workflow installation: run the workflow once from **Actions → Run workflow** and the agent installs itself.
- Upgrade support: subsequent workflow runs detect version differences and upgrade automatically, preserving user-customised `AGENTS.md`, `.pi/`, and `state/` directories.
- GitHub Pages deployment integrated into the agent workflow.
- Installation guide and updated documentation for the new repo install approach.

### Changed

- Consolidated the entire framework under `.github-minimum-intelligence/`.
- Simplified workflow to a single file at `.github/workflows/github-minimum-intelligence-agent.yml`.

---

## [0.x] — 2026-02-23 to 2026-03-10

_Pre-1.0 development under the `.github-minimum-intelligence` name after the rebrand from `.minimum-intelligence`._

### Added

- GitHub App conversion exploration and multiple install option support.
- Documentation essays: `question-what.md`, `question-how.md`, `question-who.md`, `question-when.md`, `question-where.md`, `question-how-much.md`, `the-repo-is-the-mind.md`, `questions.md`.
- Security assessment, incident response plan, capabilities analysis (blast radius), and final warning documents.
- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.

### Changed

- Renamed `.minimum-intelligence` → `.github-minimum-intelligence` to follow GitHub's dotfile convention.
- Renamed install/lifecycle files to standard names (`agent.ts`, `AGENTS.md`, `settings.json`).
- Replaced install-time TypeScript scripts with shell-based workflow steps.

---

## [Prehistory] — 2026-02-04 to 2026-02-23

_The project's earliest days. Originally named `.GITCLAW`, the framework was conceived, built, and iterated through 149 pull requests in the original repository before being reborn as GitHub Minimum Intelligence._

### Added

- Initial commit: proof-of-concept AI agent living inside a GitHub repo.
- `.GITCLAW` directory structure with `.pi/` agent configuration, lifecycle scripts, and session state management.
- Bootstrap workflow installer for one-click setup.
- Hatch system: guided personality creation via issue templates.
- Quick-start guide and multi-provider LLM configuration.
- Documentation: architecture analysis, possibilities report, roadmap.
- Support for Anthropic, OpenAI, Google Gemini, xAI, DeepSeek, Mistral, Groq, and OpenRouter.

### Changed

- Evolved through multiple naming iterations: `.GITCLAW` → `.minimum-intelligence` → `.github-minimum-intelligence`.
- Moved from a complex multi-file installer to a single workflow file.
- Consolidated scattered READMEs, quickstarts, and docs into a unified documentation structure.

### Fixed

- Resolved workflow push issues from issue events.
- Fixed `.gitattributes` handling during install.
- Fixed state folder creation under the addon directory.
- Fixed `bun install --frozen-lockfile` by adding `package.json`.
- Fixed hatch template paths and agent processing errors.
- Addressed GitHub App token handling, Anthropic API key routing, and file creation errors.
- Improved error management with `MAX_COMMENT_LENGTH` extraction and template literals.

---

_Built by [Japer Technology](https://github.com/japer-technology). Powered by [pi-mono](https://github.com/badlogic/pi-mono). Licensed under [MIT](LICENSE.md)._

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/logo.png" alt="Minimum Intelligence" width="500">
  </picture>
</p>
