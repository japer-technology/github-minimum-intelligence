# Analysis: Capability Flag Files

This document analyses what the `github-minimum-intelligence` repository already does, identifies the natural extension points for additional GitHub UX surface areas (PRs, Discussions, Wiki, etc.), and proposes a flag-file convention that lets repo owners activate only the capabilities they want — making the live feature set visible at a glance from the repository file tree.

---

## 1. What the Repo Currently Does

The core system is a single self-contained folder (`.github-minimum-intelligence/`) that turns any GitHub repository into an AI-agent workspace with three active capabilities:

| Capability | Trigger | Workflow Job | Flag Required? |
|---|---|---|---|
| **Issue Agent** | `issues.opened`, `issue_comment.created` | `run-agent` | No — always on |
| **GitHub Pages** | `push` to default branch | `run-gitpages` | Soft-flag: `public-fabric/` directory |
| **Self-Installer / Upgrader** | `workflow_dispatch` | `run-install` | No — always available |

### 1.1 Issue Agent

The primary feature. When an issue is opened or commented on by an authorised collaborator, the agent:

1. Loads or creates a per-issue conversation session from `state/sessions/`.
2. Builds a prompt from the issue title, body, or comment body.
3. Runs the `pi` LLM binary with that prompt (and session context on resumption).
4. Extracts the assistant's final text reply from the JSONL output.
5. Commits all session state and any repo edits back to the default branch.
6. Posts the reply as an issue comment with 🚀 / 👍 / 👎 reaction indicators.

The agent respects a hard authorisation gate: only collaborators with `write`, `maintain`, or `admin` permission can trigger it. All others are silently rejected with a 👎 reaction.

### 1.2 GitHub Pages

A soft-flag exists today: if `.github-minimum-intelligence/public-fabric/` is present, the `run-gitpages` job publishes it as a GitHub Pages site on every push to `main`. If the directory is absent, the job emits a warning and skips gracefully. This is the first working example of the flag-file pattern already in the codebase.

### 1.3 Self-Installer / Upgrader

Triggered manually via `workflow_dispatch`. Downloads the latest template from `japer-technology/github-minimum-intelligence`, compares `VERSION`, and either installs fresh or upgrades (preserving user files: `AGENTS.md`, `.pi/`, `state/`). Skips if already at the latest version.

### 1.4 What Is Not Yet Covered

The system currently only listens to two GitHub event types (`issues` and `issue_comment`). The following GitHub UX surfaces generate no agent response at all:

- Pull requests (opened, reviewed, merged, closed)
- GitHub Discussions (created, answered, commented)
- Wiki (page created or updated)
- Push commits (beyond Pages re-deploy)
- Releases (published, drafted)
- Scheduled / cron-based reports
- Security and dependency alerts
- Project boards and milestones

---

## 2. The Flag-File Pattern

### 2.1 Why Flag Files

A flag file is a marker whose **existence alone** activates a feature. No configuration is required inside it (though a flag file may optionally contain YAML or JSON for feature-level settings). The benefits are:

| Property | Explanation |
|---|---|
| **Visible** | Anyone can `ls` the flags directory and immediately know what is live |
| **Auditable** | Git history shows exactly when each capability was enabled or disabled |
| **Reversible** | Deleting a flag file disables the feature — no workflow edits needed |
| **Composable** | Multiple flags can be combined independently |
| **Safe by default** | A fresh install activates nothing extra; expansion is opt-in |
| **Testable** | CI can check for flag files to drive conditional steps without environment variables |

### 2.2 Proposed Flag Directory

```
.github-minimum-intelligence/
  flags/
    enable-pr-review          ← pull request review capability
    enable-discussions        ← GitHub Discussions capability
    enable-wiki               ← Wiki read/write capability
    enable-issue-triage       ← auto-label and triage issues
    enable-pr-summary         ← auto-summarise PRs on open
    enable-release-notes      ← auto-generate release notes
    enable-dependency-review  ← review Dependabot/Renovate PRs
    enable-commit-digest      ← daily/weekly commit digest
    enable-stale-management   ← manage stale issues and PRs
    enable-scheduled-reports  ← periodic repo health reports
```

Each flag file is empty (or contains optional YAML settings). The workflow checks for file existence before activating the corresponding job or step:

```yaml
- name: Check capability flags
  id: flags
  run: |
    check() { [ -f ".github-minimum-intelligence/flags/$1" ] && echo "true" || echo "false"; }
    echo "pr_review=$(check enable-pr-review)"         >> "$GITHUB_OUTPUT"
    echo "discussions=$(check enable-discussions)"     >> "$GITHUB_OUTPUT"
    echo "wiki=$(check enable-wiki)"                   >> "$GITHUB_OUTPUT"
    echo "issue_triage=$(check enable-issue-triage)"   >> "$GITHUB_OUTPUT"
    echo "pr_summary=$(check enable-pr-summary)"       >> "$GITHUB_OUTPUT"
    echo "release_notes=$(check enable-release-notes)" >> "$GITHUB_OUTPUT"
```

Individual jobs then gate themselves:

```yaml
run-pr-review:
  if: >-
    github.event_name == 'pull_request'
    && steps.flags.outputs.pr_review == 'true'
```

### 2.3 Relation to Root Folders

The flag-file pattern pairs naturally with additional root-level capability folders (analogous to `.github-minimum-intelligence/`). A flag file signals intent; the corresponding root folder (e.g. `.github-pr-intelligence/`, `.github-discussions-intelligence/`) contains the implementation. This keeps each capability self-contained and allows independent versioning and upgrading.

---

## 3. Proposed Capability Flag Files

### 3.1 `enable-pr-review`

| Property | Detail |
|---|---|
| **Trigger events** | `pull_request`: `opened`, `ready_for_review`, `synchronize` |
| **What it does** | Agent reads the PR description, diff summary, and changed file list; posts a structured review comment covering intent, risks, and suggestions |
| **Auth gate** | Same collaborator check as the issue agent |
| **Session model** | One session per PR number (mirrors the per-issue model) |
| **Interaction** | Pairs with `enable-pr-summary` (summary fires first, review fires on `ready_for_review`) |
| **Risk** | High token usage on large diffs; needs diff size guard |

### 3.2 `enable-discussions`

| Property | Detail |
|---|---|
| **Trigger events** | `discussion_comment.created` |
| **What it does** | Agent joins GitHub Discussions threads as a participant; answers questions, surfaces related issues/PRs, and updates the discussion answer if it has "answerable" category |
| **Auth gate** | Open by default (Discussions are often public Q&A); optionally constrain to collaborators via flag file contents |
| **Session model** | One session per discussion ID |
| **Risk** | Public Discussions allow non-collaborator triggers — LLM cost must be considered |

### 3.3 `enable-wiki`

| Property | Detail |
|---|---|
| **Trigger events** | `gollum` (wiki page created or updated) |
| **What it does** | Agent reads the new/updated wiki page, checks for inconsistencies with the codebase, and optionally creates a linked issue or posts a comment on any open issue that references the updated page |
| **Auth gate** | Standard collaborator check |
| **Session model** | Stateless per gollum event (no persistent conversation needed) |
| **Risk** | Wiki is a separate git repo; checkout step must explicitly `git clone` the wiki |

### 3.4 `enable-issue-triage`

| Property | Detail |
|---|---|
| **Trigger events** | `issues.opened` (runs alongside or before the issue agent) |
| **What it does** | Agent classifies the issue (bug / feature / question / docs / security), applies the appropriate label, and sets priority based on description content — without necessarily posting a full LLM reply |
| **Auth gate** | Runs regardless of actor (public repos need triage on all issues) |
| **Session model** | Stateless (one-shot classification) |
| **Risk** | Runs on all opened issues including bot-created ones — needs bot-author filter |

### 3.5 `enable-pr-summary`

| Property | Detail |
|---|---|
| **Trigger events** | `pull_request.opened`, `pull_request.edited` |
| **What it does** | Agent generates a concise PR summary (what changed, why, risk level) and either posts it as a comment or edits a designated section of the PR description |
| **Auth gate** | Collaborator check |
| **Session model** | Stateless (regenerates on each edit) |
| **Interaction** | Complements `enable-pr-review`; summary is lightweight, review is deeper |

### 3.6 `enable-release-notes`

| Property | Detail |
|---|---|
| **Trigger events** | `release.published`, `release.created` |
| **What it does** | Agent reads the commits and merged PRs since the previous release, drafts structured release notes, and either updates the release body or posts them to the releases discussion |
| **Auth gate** | Collaborator check |
| **Session model** | Stateless per release event |
| **Risk** | Large repos with many merged PRs since last release → high token count |

### 3.7 `enable-dependency-review`

| Property | Detail |
|---|---|
| **Trigger events** | `pull_request.opened` where actor is `dependabot[bot]` or `renovate[bot]` |
| **What it does** | Agent reads the dependency diff, checks for known issues (changelog, semver bump type, breaking changes), and posts a structured assessment comment |
| **Auth gate** | Triggered by bot actor — flag file is the only gate |
| **Session model** | Stateless per PR |
| **Risk** | Requires external changelog/package-registry reads; may need additional tools |

### 3.8 `enable-commit-digest`

| Property | Detail |
|---|---|
| **Trigger events** | `schedule` (e.g. daily at 08:00 UTC) |
| **What it does** | Agent reads commits from the past 24 hours (or since last digest), summarises activity by author and area, and posts the digest as a new issue (pinned) or updates a running "digest" issue |
| **Auth gate** | No actor gate (scheduled, no human trigger) |
| **Session model** | Stateless per schedule run |
| **Risk** | Scheduled jobs run even when there is no activity — add a commit-count guard |

### 3.9 `enable-stale-management`

| Property | Detail |
|---|---|
| **Trigger events** | `schedule` (e.g. weekly) |
| **What it does** | Agent identifies issues and PRs with no activity for a configurable period, posts a "is this still relevant?" comment, and optionally applies a `stale` label; closes confirmed-stale items after a second inactivity period |
| **Auth gate** | No actor gate (scheduled) |
| **Session model** | Stateless per item |
| **Risk** | Closing issues automatically is high-blast-radius; default should be label-only with close opt-in |

### 3.10 `enable-scheduled-reports`

| Property | Detail |
|---|---|
| **Trigger events** | `schedule` (e.g. monthly) |
| **What it does** | Agent generates a repo health report (open issue trends, PR throughput, contributor activity, dependency age) and posts it as a new issue or commits it to `public-fabric/` for Pages display |
| **Auth gate** | No actor gate (scheduled) |
| **Session model** | Stateless per schedule run |
| **Interaction** | Output can feed `public-fabric/` for Pages display (complements the existing Pages capability) |

---

## 4. Implementation Approach

### 4.1 Workflow Structure

The current single workflow file (`github-minimum-intelligence-agent.yml`) handles all three jobs. As capabilities grow, the recommended structure is:

```
.github/workflows/
  github-minimum-intelligence-agent.yml    ← issue agent + Pages + installer (current)
  github-minimum-intelligence-pr.yml       ← PR capabilities (gated by enable-pr-*)
  github-minimum-intelligence-social.yml   ← Discussions + Wiki (gated by enable-*)
  github-minimum-intelligence-schedule.yml ← all scheduled capabilities
```

Each new workflow file should:

1. Check out the repo.
2. Run a `check-flags` step that reads the relevant flag files.
3. Conditionally execute capability steps based on flag outputs.
4. Reuse the same Bun + `pi` agent stack already present.

### 4.2 Flag File Reading Pattern

```yaml
- name: Check capability flags
  id: flags
  run: |
    FLAGS_DIR=".github-minimum-intelligence/flags"
    check() {
      [ -f "$FLAGS_DIR/$1" ] && echo "true" || echo "false"
    }
    echo "pr_review=$(check enable-pr-review)"     >> "$GITHUB_OUTPUT"
    echo "pr_summary=$(check enable-pr-summary)"   >> "$GITHUB_OUTPUT"
    # add further flags here
```

### 4.3 Upgrade Safety

The run-install upgrader already preserves user files (`AGENTS.md`, `.pi/`, `state/`). The `flags/` directory must be added to the preserved list so that enabling a flag survives an upgrade:

```bash
[ -d "$TARGET/flags" ] && cp -R "$TARGET/flags" "$BACKUP/flags"
# ...and restore after replace:
[ -d "$BACKUP/flags" ] && cp -R "$BACKUP/flags" "$TARGET/flags"
```

### 4.4 Flag File Format (Optional Settings)

A flag file may be empty (presence = enabled) or contain YAML for feature-level settings:

```yaml
# .github-minimum-intelligence/flags/enable-pr-review
stale_threshold_days: 14
post_as: comment        # comment | review
max_diff_lines: 2000    # skip review if diff exceeds this
```

The workflow step reads optional settings with a fallback to defaults when the file is empty or the key is absent.

---

## 5. Interaction Matrix

| Flag | Conflicts With | Complements | Depends On |
|---|---|---|---|
| `enable-pr-review` | — | `enable-pr-summary` | None |
| `enable-pr-summary` | — | `enable-pr-review` | None |
| `enable-discussions` | — | `enable-issue-triage` | None |
| `enable-wiki` | — | `enable-issue-triage` | None |
| `enable-issue-triage` | — | `enable-discussions`, `enable-wiki` | None |
| `enable-release-notes` | — | `enable-commit-digest` | None |
| `enable-dependency-review` | — | `enable-pr-review` | None |
| `enable-commit-digest` | `enable-scheduled-reports` (overlap) | `enable-release-notes` | Schedule trigger |
| `enable-stale-management` | — | `enable-scheduled-reports` | Schedule trigger |
| `enable-scheduled-reports` | `enable-commit-digest` (partial overlap) | `public-fabric/` Pages | Schedule trigger |

---

## 6. Cost and Resource Implications

Each new capability consumes GitHub Actions minutes and LLM API tokens. The table below gives indicative costs per activation at typical repo activity levels:

| Flag | Actions minutes / activation | Typical LLM tokens / activation | Notes |
|---|---|---|---|
| `enable-pr-review` | 1–3 min | 2 000–20 000 | Varies with diff size |
| `enable-pr-summary` | 0.5–1 min | 500–3 000 | Lightweight |
| `enable-discussions` | 1–2 min | 1 000–8 000 | Risk: public triggers on open repos |
| `enable-wiki` | 1–2 min | 500–5 000 | Low frequency |
| `enable-issue-triage` | 0.5–1 min | 200–1 000 | One-shot classification |
| `enable-release-notes` | 1–3 min | 3 000–30 000 | Scales with release scope |
| `enable-dependency-review` | 1–2 min | 1 000–5 000 | Frequency driven by dep update cadence |
| `enable-commit-digest` | 1–2 min / day | 1 000–5 000 / day | Scheduled; guard on zero-commit days |
| `enable-stale-management` | 1–3 min / week | 500–2 000 / item | Scales with open item count |
| `enable-scheduled-reports` | 2–5 min / month | 5 000–30 000 / report | Monthly; infrequent |

Recommendations:
- Add diff-size guards to `enable-pr-review` and `enable-release-notes` to avoid runaway token usage.
- Add a commit-count guard to `enable-commit-digest` to skip runs with zero activity.
- For `enable-discussions` on public repos, consider rate-limiting (e.g. respond only to discussions opened by collaborators) or adding explicit cost controls in the flag file.

---

## 7. Priority Ordering

Based on user impact, implementation complexity, and blast radius risk:

| Priority | Flag | Rationale |
|---|---|---|
| 1 | `enable-pr-review` | Highest developer value; extends the proven issue-agent pattern to PRs with minimal new infrastructure |
| 2 | `enable-pr-summary` | Low cost, high visibility; pairs naturally with PR review |
| 3 | `enable-issue-triage` | Reduces maintainer overhead on busy repos; stateless (low risk) |
| 4 | `enable-dependency-review` | High value for repos using Dependabot/Renovate; limited blast radius |
| 5 | `enable-discussions` | Extends reach to Discussions; needs public-repo cost consideration |
| 6 | `enable-release-notes` | High value at release time; infrequent activation |
| 7 | `enable-commit-digest` | Useful for team visibility; scheduled, low risk |
| 8 | `enable-stale-management` | Valuable for project hygiene; default to label-only (no auto-close) |
| 9 | `enable-wiki` | Niche; requires separate wiki repo checkout |
| 10 | `enable-scheduled-reports` | High value for project health visibility; builds on earlier capabilities |

---

## Summary

The `github-minimum-intelligence` repository currently delivers three capabilities: an Issues-based AI conversation agent, a GitHub Pages site publisher, and a self-installer. The Pages publisher already uses a soft flag-file pattern (the presence of `public-fabric/` controls deployment), confirming the approach is natural for this codebase.

The proposed `flags/` directory convention extends this pattern to ten new GitHub UX surface areas — pull requests, discussions, wiki, triage, release notes, dependency review, commit digests, stale management, and scheduled reports. Each flag is a zero-configuration marker file: present means active, absent means inactive, git history records when it changed.

This approach satisfies the original requirement: the repo owner can see exactly what is live by listing the `flags/` directory, without reading workflow YAML. Capabilities are opt-in (safe by default), reversible (delete the file), and auditable (git-tracked). The implementation reuses the existing Bun + `pi` agent stack with no new runtime dependencies, and the upgrade path is straightforward: add `flags/` to the preserved-files list in the installer.
