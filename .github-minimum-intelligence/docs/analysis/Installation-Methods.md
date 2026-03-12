# Analysis: Auto-Copy Workflow File to Consuming Repos

**Question:** What mechanisms could be implemented in [`japer-technology/github-minimum-intelligence`](https://github.com/japer-technology/github-minimum-intelligence) to facilitate automatically copying `.github/workflows/github-minimum-intelligence-agent.yml` into consuming repositories?

**Target file:** `https://github.com/japer-technology/github-minimum-intelligence/.github/workflows/github-minimum-intelligence-agent.yml`
**Destination:** `.github/workflows/github-minimum-intelligence-agent.yml` in the consuming repo

---

## Current State

Today, the installation process is **manual**:
1. User manually copies `github-minimum-intelligence-agent.yml` into their repo's `.github/workflows/` directory
2. User triggers the workflow via `workflow_dispatch`
3. The workflow's `install` job downloads the rest of the framework (`.github-minimum-intelligence/` folder) from the source repo via `curl` + ZIP extraction

The workflow file itself is the **bootstrap entry point** — everything else is self-installing. The core challenge is: **how do you get that first file into the repo automatically?**

---

## All Approaches

### 1. Raw URL Download Script (curl/wget one-liner)

**What to add to the source repo:** A documented `curl` one-liner in the README, and optionally a small shell script (e.g., `install.sh`) at the repo root.

**How it works:**
```bash
# One-liner — run from the root of the consuming repo
mkdir -p .github/workflows && curl -sL \
  "https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github/workflows/github-minimum-intelligence-agent.yml" \
  -o .github/workflows/github-minimum-intelligence-agent.yml
```

Or with a hosted install script:
```bash
curl -sL https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/install.sh | bash
```

**What to add to the source repo:**
- `install.sh` at repo root that downloads the workflow file and optionally commits it
- Documentation of the one-liner in the README

**Pros:** Zero dependencies, works anywhere, trivially simple
**Cons:** Requires user to run a command locally, no auto-update mechanism
**Complexity:** Minimal

---

### 2. GitHub CLI (`gh`) Extension

**What to add to the source repo:** A `gh` CLI extension (e.g., `gh-gmi`) that copies the workflow file into the current repo.

**How it works:**
```bash
gh extension install japer-technology/gh-gmi
gh gmi install
```

The extension would be a separate repo (e.g., `japer-technology/gh-gmi`) containing a shell script or Go binary that:
1. Downloads the workflow YAML from the source repo
2. Places it in `.github/workflows/`
3. Optionally commits and pushes

**What to add to the source repo:**
- Reference/link to the `gh` extension in README
- Alternatively, the extension could live as a subdirectory with a symlink or be published separately

**Pros:** Familiar to GitHub-centric users, scriptable, updatable via `gh extension upgrade`
**Cons:** Requires `gh` CLI installed, requires a separate extension repo
**Complexity:** Low-Medium

---

### 3. GitHub Template Repository

**What to add to the source repo:** Enable the "Template repository" setting in the source repo's Settings page.

**How it works:**
- Source repo is marked as a template repository
- Users click "Use this template" → "Create a new repository" on GitHub
- New repo is created with all files from the template, including `.github/workflows/github-minimum-intelligence-agent.yml`

**What to add to the source repo:**
- Enable Settings → General → Template repository checkbox
- Ensure the repo structure is clean for templating (remove issue state, session files, etc.)
- Add a `.github/template-cleanup` script or post-creation instructions

**Pros:** Native GitHub feature, one-click setup, copies everything including the workflow
**Cons:** Only works for **new** repos (not existing ones like `gmi`), copies entire repo not just the workflow, no update mechanism
**Complexity:** Minimal (just a settings toggle)

---

### 4. GitHub Actions Reusable Workflow (`workflow_call`)

**What to add to the source repo:** Refactor the workflow to be callable via `workflow_call`, then consuming repos reference it directly.

**How it works:**
Instead of copying the workflow file, consuming repos create a thin wrapper:

```yaml
# .github/workflows/github-minimum-intelligence-agent.yml (in consuming repo)
name: github-minimum-intelligence-agent
on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]
  workflow_dispatch:

jobs:
  agent:
    uses: japer-technology/github-minimum-intelligence/.github/workflows/github-minimum-intelligence-agent.yml@main
    secrets: inherit
```

**What to add to the source repo:**
- Add `on: workflow_call:` trigger to the workflow
- Define `inputs:` and `secrets:` for any configurable values
- Document the thin-wrapper pattern for consuming repos

**Pros:** Always up-to-date (references source directly), minimal file in consuming repo, native GitHub feature
**Cons:** Reusable workflows have limitations (max 4 levels of nesting, limited `permissions` control, all jobs must be in the called workflow), the consuming repo still needs a stub file, cross-repo `workflow_call` requires the source repo to be public
**Complexity:** Medium (requires refactoring the workflow)

---

### 5. Organization-Level Starter Workflow (`.github` Repository)

**What to add:** Create a repo named `japer-technology/.github` with a `workflow-templates/` directory.

**How it works:**
```
japer-technology/.github/
└── workflow-templates/
    ├── github-minimum-intelligence-agent.yml
    └── github-minimum-intelligence-agent.properties.json
```

The `.properties.json` file:
```json
{
  "name": "GitHub Minimum Intelligence Agent",
  "description": "AI agent powered by GitHub Issues",
  "iconName": "robot",
  "categories": ["AI", "Automation"]
}
```

When any user in the `japer-technology` org goes to Actions → "New workflow", this template appears as a suggested starter workflow. Clicking it creates a PR or commit adding the workflow file.

**What to add to the source repo:**
- Create the `japer-technology/.github` repo (separate repo)
- Add the workflow template and properties JSON
- Keep it in sync with the source workflow (manually or via CI)

**Pros:** Native GitHub UI integration, discoverable within the org, one-click add from Actions tab
**Cons:** Only works within the same GitHub organization, requires a separate `.github` repo, still manual (user must click to add), no auto-update
**Complexity:** Low

---

### 6. GitHub App / Bot

**What to add to the source repo:** Build and register a GitHub App that automatically installs the workflow file.

**How it works:**
1. Register a GitHub App (e.g., "GMI Installer")
2. When installed on a repo, the app:
   - Creates a PR adding `.github/workflows/github-minimum-intelligence-agent.yml`
   - Or directly commits the file to the default branch
3. Optionally watches for version changes and creates update PRs

**What to add to the source repo:**
- GitHub App manifest (`app.yml`) or registration instructions
- A small server/serverless function (e.g., Cloudflare Worker, AWS Lambda, or GitHub Actions) that handles the `installation` webhook
- Probot framework could simplify development

**Pros:** Fully automated, can handle updates, professional UX
**Cons:** Requires hosting infrastructure (unless using GitHub Actions as the backend), requires maintaining a GitHub App registration, most complex option
**Complexity:** High

---

### 7. Repository Dispatch + Installer Workflow

**What to add to the source repo:** A workflow in the **source** repo that, when triggered, creates a PR or pushes the workflow file to a target repo.

**How it works:**
```yaml
# In github-minimum-intelligence repo
name: distribute-workflow
on:
  workflow_dispatch:
    inputs:
      target_repo:
        description: 'Target repo (owner/name)'
        required: true
jobs:
  distribute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Copy workflow to target
        env:
          GH_TOKEN: ${{ secrets.TARGET_REPO_PAT }}
        run: |
          gh api repos/${{ inputs.target_repo }}/contents/.github/workflows/github-minimum-intelligence-agent.yml \
            --method PUT \
            -f message="chore: install github-minimum-intelligence workflow" \
            -f content="$(base64 -w0 .github/workflows/github-minimum-intelligence-agent.yml)"
```

**What to add to the source repo:**
- A new workflow file (e.g., `distribute.yml`)
- A Personal Access Token or GitHub App token with write access to target repos
- Documentation for how to trigger it

**Pros:** Centralized control, can batch-update multiple repos, audit trail via workflow runs
**Cons:** Requires a PAT/token with cross-repo write access (security concern), manual trigger per target repo
**Complexity:** Medium

---

### 8. Git Submodule

**What to add to the source repo:** Nothing special — the source repo is already structured for this.

**How it works in the consuming repo:**
```bash
git submodule add https://github.com/japer-technology/github-minimum-intelligence.git .gmi-upstream
# Then symlink or copy the workflow file
cp .gmi-upstream/.github/workflows/github-minimum-intelligence-agent.yml .github/workflows/
```

**What to add to the source repo:**
- Documentation for submodule-based installation
- Optionally a `Makefile` or script that copies files from the submodule to the right locations

**Pros:** Native git feature, version pinning via commit SHA, `git submodule update` for updates
**Cons:** Submodules are notoriously confusing, adds the entire source repo, requires a copy step for the workflow file, GitHub Actions doesn't run workflows from submodule paths
**Complexity:** Medium (due to submodule UX issues)

---

### 9. Git Subtree

**What to add to the source repo:** Nothing — this is a consuming-repo-side technique.

**How it works in the consuming repo:**
```bash
git subtree add --prefix=.gmi-upstream \
  https://github.com/japer-technology/github-minimum-intelligence.git main --squash
cp .gmi-upstream/.github/workflows/github-minimum-intelligence-agent.yml .github/workflows/
```

Update:
```bash
git subtree pull --prefix=.gmi-upstream \
  https://github.com/japer-technology/github-minimum-intelligence.git main --squash
```

**What to add to the source repo:**
- Documentation for subtree-based installation
- A script that automates the subtree pull + file copy

**Pros:** No `.gitmodules` confusion, files are fully committed to the consuming repo, updates via `subtree pull`
**Cons:** Pulls the entire source repo into a subdirectory, still requires a copy step, subtree commands are verbose
**Complexity:** Medium

---

### 10. NPM / Bun Package with Postinstall Script

**What to add to the source repo:** Publish the workflow file as part of an npm package with a `postinstall` script.

**How it works:**
```bash
npm install @japer-technology/github-minimum-intelligence --save-dev
# postinstall script automatically copies the workflow file
```

The package's `package.json`:
```json
{
  "name": "@japer-technology/github-minimum-intelligence",
  "scripts": {
    "postinstall": "mkdir -p ../../.github/workflows && cp workflow.yml ../../.github/workflows/github-minimum-intelligence-agent.yml"
  }
}
```

**What to add to the source repo:**
- npm package configuration
- `postinstall` script that copies the workflow file to the correct location
- Publish to npm or GitHub Packages registry

**Pros:** Familiar to JS developers, version management via npm, `npm update` for upgrades
**Cons:** Requires Node.js/npm in the consuming project, `postinstall` path resolution is fragile, unconventional for non-JS projects
**Complexity:** Medium

---

### 11. GitHub Releases with Attached Assets

**What to add to the source repo:** Attach the workflow YAML file as a release asset on each GitHub Release.

**How it works:**
```bash
# Download the latest release asset
gh release download --repo japer-technology/github-minimum-intelligence \
  --pattern "github-minimum-intelligence-agent.yml" \
  --dir .github/workflows/
```

**What to add to the source repo:**
- A CI workflow that creates releases and attaches the workflow file as an asset
- Tag-based versioning (already uses `VERSION` file)
- Documentation for the `gh release download` command

**Pros:** Version-pinned downloads, `gh` CLI integration, release notes for changelog
**Cons:** Requires `gh` CLI or API calls, still manual per-repo
**Complexity:** Low

---

### 12. GitHub Actions Composite Action for Self-Installation

**What to add to the source repo:** Create an `action.yml` at the repo root that makes the source repo usable as a GitHub Action.

**How it works:**
The consuming repo creates a one-time setup workflow:
```yaml
# .github/workflows/setup-gmi.yml
name: Setup GMI
on: workflow_dispatch
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: japer-technology/github-minimum-intelligence@main
        with:
          action: install-workflow
      - run: |
          git add .github/workflows/github-minimum-intelligence-agent.yml
          git commit -m "chore: install GMI workflow"
          git push
```

**What to add to the source repo:**
- `action.yml` at the repo root defining a composite action
- The action copies the workflow file to the workspace

**Pros:** Native GitHub Actions integration, versioned via tags/branches
**Cons:** Still requires a bootstrap workflow in the consuming repo (chicken-and-egg), composite actions can't directly modify the calling workflow's repo without checkout
**Complexity:** Medium

---

### 13. Copier / Cookiecutter Template

**What to add to the source repo:** A `copier.yml` or `cookiecutter.json` configuration that makes the repo a project template.

**How it works:**
```bash
# Using Copier
pipx install copier
copier copy gh:japer-technology/github-minimum-intelligence my-project

# Using Cookiecutter
pipx install cookiecutter
cookiecutter gh:japer-technology/github-minimum-intelligence
```

**What to add to the source repo:**
- `copier.yml` or `cookiecutter.json` at repo root
- Template variables for customization (repo name, LLM provider, etc.)
- Jinja2 template syntax in files that need customization

**Pros:** Interactive setup with customization prompts, `copier update` for upgrades (Copier only), widely used in the Python ecosystem
**Cons:** Requires Python/pipx, adds template syntax to source files, overkill for copying one file
**Complexity:** Medium

---

### 14. Scheduled Sync Workflow in the Consuming Repo

**What to add to the source repo:** Nothing required in the source repo — but documentation or a template for the sync workflow.

**How it works in the consuming repo:**
```yaml
# .github/workflows/sync-gmi-workflow.yml
name: Sync GMI Workflow
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download latest workflow
        run: |
          curl -sL "https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github/workflows/github-minimum-intelligence-agent.yml" \
            -o .github/workflows/github-minimum-intelligence-agent.yml
      - name: Commit if changed
        run: |
          git diff --quiet || (git add . && git commit -m "chore: sync GMI workflow" && git push)
```

**What to add to the source repo:**
- Provide this sync workflow as a template in the README or `install/` directory
- Document the sync pattern

**Pros:** Automatic updates, no manual intervention after initial setup, consuming repo controls the schedule
**Cons:** Requires an initial bootstrap (chicken-and-egg for the first workflow), scheduled workflows consume Actions minutes
**Complexity:** Low

---

### 15. GitHub Actions `peter-evans/create-pull-request` Pattern (Centralized Updater)

**What to add to the source repo:** A workflow that opens PRs on all known consuming repos when the workflow file changes.

**How it works:**
```yaml
# In source repo: .github/workflows/distribute-updates.yml
name: Distribute Workflow Updates
on:
  push:
    paths:
      - '.github/workflows/github-minimum-intelligence-agent.yml'
    branches: [main]
jobs:
  update-consumers:
    strategy:
      matrix:
        repo: [japer-technology/gmi, japer-technology/other-repo]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: ${{ matrix.repo }}
          token: ${{ secrets.CROSS_REPO_PAT }}
      - name: Copy updated workflow
        run: |
          mkdir -p .github/workflows
          curl -sL "https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github/workflows/github-minimum-intelligence-agent.yml" \
            -o .github/workflows/github-minimum-intelligence-agent.yml
      - uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.CROSS_REPO_PAT }}
          commit-message: "chore: update GMI workflow to latest"
          title: "Update github-minimum-intelligence-agent workflow"
          branch: update-gmi-workflow
```

**What to add to the source repo:**
- Distribution workflow with matrix of target repos
- A PAT with cross-repo write access
- A registry file listing consuming repos (e.g., `consumers.json`)

**Pros:** Fully automated push-based updates, consuming repos get PRs for review, centrally managed
**Cons:** Requires maintaining a list of consumers, requires cross-repo PAT, PRs add review overhead
**Complexity:** Medium-High

---

### 16. Dependabot-Style Version File + Sync

**What to add to the source repo:** Publish version metadata that consuming repos can poll.

**How it works:**
1. Source repo publishes a `latest.json` (e.g., via GitHub Pages or as a release):
   ```json
   {
     "version": "1.0.1",
     "workflow_url": "https://raw.githubusercontent.com/.../github-minimum-intelligence-agent.yml",
     "sha256": "abc123..."
   }
   ```
2. Consuming repos have a scheduled workflow that checks `latest.json`, compares versions, and updates if needed

**What to add to the source repo:**
- Automated publishing of `latest.json` on release
- SHA256 checksum for integrity verification
- Documentation for the polling pattern

**Pros:** Version-aware updates, integrity checking, consuming repos control when to update
**Cons:** Two-part system (publisher + consumer), requires initial setup in consuming repos
**Complexity:** Medium

---

## Summary Comparison Matrix

| # | Method | Changes to Source Repo | Works for Existing Repos | Auto-Updates | Complexity | Dependencies |
|---|--------|----------------------|--------------------------|-------------|------------|-------------|
| 1 | **curl/wget one-liner** | Add `install.sh` + docs | ✅ | ❌ | � Minimal | None |
| 2 | **`gh` CLI extension** | Separate extension repo | ✅ | Via `gh extension upgrade` | � Low-Med | `gh` CLI |
| 3 | **Template repository** | Enable setting | ❌ (new repos only) | ❌ | � Minimal | None |
| 4 | **Reusable workflow** | Add `workflow_call` trigger | ✅ | ✅ (always latest) | � Medium | None |
| 5 | **Starter workflow** | `.github` org repo | ✅ | ❌ | � Low | Org membership |
| 6 | **GitHub App** | App registration + hosting | ✅ | ✅ | � High | Server hosting |
| 7 | **Repository dispatch** | Add distribute workflow | ✅ | Manual trigger | � Medium | Cross-repo PAT |
| 8 | **Git submodule** | Documentation only | ✅ | Via `submodule update` | � Medium | Git |
| 9 | **Git subtree** | Documentation only | ✅ | Via `subtree pull` | � Medium | Git |
| 10 | **npm package** | Publish to npm | ✅ | Via `npm update` | � Medium | Node.js/npm |
| 11 | **GitHub Releases** | Release automation | ✅ | Manual download | � Low | `gh` CLI |
| 12 | **Composite action** | Add `action.yml` | ✅ | ✅ (via ref) | � Medium | Bootstrap workflow |
| 13 | **Copier/Cookiecutter** | Add template config | ✅ | Via `copier update` | � Medium | Python |
| 14 | **Scheduled sync workflow** | Template in docs | ✅ | ✅ (scheduled) | � Low | Bootstrap workflow |
| 15 | **Centralized PR updater** | Distribute workflow | ✅ | ✅ (push-based) | � Med-High | Cross-repo PAT |
| 16 | **Version file + poll** | Publish `latest.json` | ✅ | ✅ (poll-based) | � Medium | Bootstrap workflow |

---

## Recommendations

### For Immediate Implementation (Low Effort, High Value)

1. **Add `install.sh` to the source repo** (Method 1) — A simple shell script that downloads and places the workflow file. Zero dependencies, works everywhere:
   ```bash
   #!/bin/bash
   mkdir -p .github/workflows
   curl -sL "https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github/workflows/github-minimum-intelligence-agent.yml" \
     -o .github/workflows/github-minimum-intelligence-agent.yml
   echo "✅ Workflow installed. Now: git add, commit, push, then trigger via Actions tab."
   ```

2. **Add a starter workflow template** (Method 5) — Create `japer-technology/.github/workflow-templates/` for org-wide discoverability.

3. **Publish the workflow as a GitHub Release asset** (Method 11) — Tag releases and attach the YAML file for versioned downloads.

### For Long-Term Auto-Updates

4. **Refactor to a reusable workflow** (Method 4) — This is the most "GitHub-native" auto-update approach. Consuming repos reference the source workflow directly and always get the latest version. However, this requires significant refactoring of the current monolithic workflow.

5. **Provide a sync workflow template** (Method 14) — Ship a `sync-gmi-workflow.yml` template that consuming repos can add alongside the main workflow. This gives auto-updates with minimal source repo changes.

### The Chicken-and-Egg Problem

The fundamental challenge is: **you need a workflow file to install workflow files**. The very first file must always be copied manually (or via a script/CLI outside of GitHub Actions). Methods 1, 2, 5, and 11 solve the initial bootstrap. Methods 4, 14, 15, and 16 solve ongoing updates. A complete solution combines one bootstrap method with one update method.
