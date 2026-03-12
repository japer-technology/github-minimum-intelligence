# Analysis: How to Install and Update GitHub Minimum Intelligence

This document catalogues every installation path, upgrade procedure, and post-install configuration step for GitHub Minimum Intelligence. It covers the three primary installation methods, the upgrade mechanism, development setup for contributors, and the auxiliary deployment workflows (GitHub Pages, repository activation).

---

## 1. Prerequisites

All installation methods share the same baseline requirements.

| Requirement | Purpose | How to get it |
|---|---|---|
| A GitHub repository (new or existing) | Host for the agent — issues as conversation, Git as memory, Actions as runtime | `git init my-repo && cd my-repo` or use an existing repo |
| [Git](https://git-scm.com/) | Version control, state storage, conflict resolution | Pre-installed on most systems; `git --version` to verify |
| [Bun](https://bun.sh) | TypeScript runtime for the installer, agent orchestrator, and dependency management | `curl -fsSL https://bun.sh/install \| bash` |
| An LLM API key | Powers the AI agent (at least one provider required) | See Section 4 below |

Bun is only required locally for methods 1 and 2. Once files are committed and pushed, GitHub Actions uses its own Bun installation (pinned to version 1.2 via `oven-sh/setup-bun@v2`).

---

## 2. Installation Methods

There are three ways to add Minimum Intelligence to a repository.

| Method | Best for | GitHub App bot identity? | Approximate setup time |
|---|---|---|---|
| Quick setup script | Fastest — one command | No (uses `GITHUB_TOKEN`) | < 5 minutes |
| Manual copy | Full control, offline-friendly | No (uses `GITHUB_TOKEN`) | 5–10 minutes |
| GitHub App | Multi-repo, centralised permissions | Yes | ~15 minutes |

---

### 2.1 Method 1: Quick Setup Script (Recommended)

Run a single command from the root of any git repository:

```bash
curl -fsSL https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/script/setup.sh | bash
```

Alternatively, download and run manually:

```bash
wget https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/script/setup.sh
bash setup.sh
```

**What the script does (`.github-minimum-intelligence/script/setup.sh`):**

| Step | Detail |
|---|---|
| Preflight checks | Verifies `git` is installed, the current directory is inside a git repository, and `bun` is available |
| Install vs. upgrade detection | Checks whether `.github-minimum-intelligence/` already exists and reads `VERSION` for comparison |
| Download | Fetches the latest ZIP from `github.com/japer-technology/github-minimum-intelligence/archive/refs/heads/main.zip` into a temporary directory |
| Fresh install | Copies `.github-minimum-intelligence/` into the repo root, removes the source repo's `state/` directory, and resets `AGENTS.md` and `.pi/settings.json` to their default templates |
| Run installer | Executes `bun .github-minimum-intelligence/install/MINIMUM-INTELLIGENCE-INSTALLER.ts` (see Section 3) |

**After the script finishes:**

1. Add your LLM API key as a GitHub repository secret (see Section 4).
2. Commit and push:
   ```bash
   git add -A && git commit -m "Add minimum-intelligence" && git push
   ```
3. Open an issue in your repository — the agent replies automatically.

---

### 2.2 Method 2: Manual Copy

Use this when you want to inspect every file before it enters your repository.

**Step 1 — Download and copy the framework folder**

Download the latest ZIP from [github.com/japer-technology/github-minimum-intelligence](https://github.com/japer-technology/github-minimum-intelligence/archive/refs/heads/main.zip), extract it, and copy the `.github-minimum-intelligence/` folder into your repository root.

**Step 2 — Run the installer**

```bash
bun .github-minimum-intelligence/install/MINIMUM-INTELLIGENCE-INSTALLER.ts
```

This creates the workflow and issue template files under `.github/` (see Section 3).

**Step 3 — Install dependencies**

```bash
cd .github-minimum-intelligence && bun install
```

Installs the single runtime dependency (`@mariozechner/pi-coding-agent` 0.57.1).

**Step 4 — Add your LLM API key**

See Section 4 below.

**Step 5 — Commit and push**

```bash
git add -A
git commit -m "Add minimum-intelligence"
git push
```

**Step 6 — Open an issue**

Create a new issue in the GitHub UI. The agent picks it up and replies as a comment.

---

### 2.3 Method 3: GitHub App (Multi-Repo)

Running Minimum Intelligence as a GitHub App gives it its own bot identity, consistent permissions across repositories, and centralised multi-repo management.

**Step 1 — Register the GitHub App**

Use the included `app-manifest.json` (`.github-minimum-intelligence/install/app-manifest.json`):

- Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**.
- Scroll to the bottom and click **Register a GitHub App from a manifest**.
- Paste the contents of `app-manifest.json` and submit.

Or register programmatically:

```bash
curl -X POST https://github.com/settings/apps/new \
  -H "Accept: application/json" \
  -d @.github-minimum-intelligence/install/app-manifest.json
```

After registration you receive an **App ID** (numeric) and a **private key** (`.pem` file).

The manifest requests these permissions and events:

| Setting | Value |
|---|---|
| `issues` | write |
| `contents` | write |
| `actions` | write |
| `metadata` | read |
| Events | `issues`, `issue_comment`, `installation`, `installation_repositories` |

**Step 2 — Store App credentials as repository secrets**

In the repository where the agent workflow lives, go to **Settings → Secrets and variables → Actions** and add:

| Secret name | Value |
|---|---|
| `APP_ID` | The numeric App ID from the app's settings page |
| `APP_PRIVATE_KEY` | The full contents of the downloaded `.pem` private key file |

**Step 3 — Install the App on target repositories**

Go to the app's **Install** page (linked from its settings) and install it on the repositories where you want the agent to respond. The app needs read/write access to Issues, Contents, and Actions.

When installed on a new repository, the `github-minimum-intelligence-installation` workflow (`.github-minimum-intelligence/install/github-minimum-intelligence-installation.yml`) automatically creates a welcome issue with setup instructions.

**Step 4 — Add agent files to each target repository**

The GitHub App handles authentication, but each target repo still needs the agent code. From the root of each target repository, run:

```bash
curl -fsSL https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/script/setup.sh | bash
```

Or manually copy the `.github-minimum-intelligence/` folder.

**Step 5 — Add your LLM API key to each target repository**

See Section 4 below. Each target repo needs its own API key secret.

---

## 3. The Installer Script

Both Method 1 and Method 2 invoke the installer (`MINIMUM-INTELLIGENCE-INSTALLER.ts`). The script supports fresh installation and upgrades (via the `--upgrade` flag, passed automatically by `setup.sh`).

**Invocation:**

```bash
# Fresh install
bun .github-minimum-intelligence/install/MINIMUM-INTELLIGENCE-INSTALLER.ts

# Upgrade
bun .github-minimum-intelligence/install/MINIMUM-INTELLIGENCE-INSTALLER.ts --upgrade
```

**What the installer creates or updates:**

| Action | Source (in `install/`) | Destination | Fresh install | Upgrade |
|---|---|---|---|---|
| Create directories | — | `.github/workflows/`, `.github/ISSUE_TEMPLATE/` | Created if missing | Created if missing |
| Agent workflow | `github-minimum-intelligence-agent.yml` | `.github/workflows/github-minimum-intelligence-agent.yml` | Copied | Always overwritten |
| Hatch issue template | `ISSUE_TEMPLATE/github-minimum-intelligence-hatch.md` | `.github/ISSUE_TEMPLATE/github-minimum-intelligence-hatch.md` | Copied | Always overwritten |
| Chat issue template | `ISSUE_TEMPLATE/github-minimum-intelligence-chat.md` | `.github/ISSUE_TEMPLATE/github-minimum-intelligence-chat.md` | Copied | Always overwritten |
| Agent identity | `MINIMUM-INTELLIGENCE-AGENTS.md` | `.github-minimum-intelligence/AGENTS.md` | Copied from template | Preserved (not overwritten) |
| LLM settings | `settings.json` | `.github-minimum-intelligence/.pi/settings.json` | Copied from template | Preserved (not overwritten) |
| Dependencies | — | `.github-minimum-intelligence/node_modules/` | `bun install` | `bun install` |

---

## 4. Adding an LLM API Key

After installation, add at least one API key as a **GitHub repository secret**:

1. Go to **Settings → Secrets and variables → Actions** in your repository.
2. Click **New repository secret**.
3. Set the name and value from the table below.

| Provider | Secret name | Where to get it |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/) |
| Anthropic | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| Google Gemini | `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/) |
| xAI (Grok) | `XAI_API_KEY` | [console.x.ai](https://console.x.ai/) |
| OpenRouter | `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai/) |
| Mistral | `MISTRAL_API_KEY` | [console.mistral.ai](https://console.mistral.ai/) |
| Groq | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com/) |

Only one key is required. The agent reads `.pi/settings.json` to determine which provider to use, and validates that the corresponding secret is present at runtime. If the secret is missing, it posts an error comment on the issue with setup instructions.

---

## 5. Configuration

### 5.1 Choosing an LLM Provider and Model

Edit `.github-minimum-intelligence/.pi/settings.json`:

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-5.4",
  "defaultThinkingLevel": "high"
}
```

| Field | Values | Default |
|---|---|---|
| `defaultProvider` | `openai`, `anthropic`, `google`, `xai`, `openrouter`, `mistral`, `groq` | `openai` |
| `defaultModel` | Any model supported by the chosen provider | `gpt-5.4` |
| `defaultThinkingLevel` | `low`, `medium`, `high` | `high` |

Example model choices per provider:

| Provider | Example models |
|---|---|
| OpenAI | `gpt-5.4`, `gpt-5.3-codex`, `gpt-5.3-codex-spark` |
| Anthropic | `claude-sonnet-4-20250514` |
| Google | `gemini-2.5-pro`, `gemini-2.5-flash` |
| xAI | `grok-3`, `grok-3-mini` |
| OpenRouter | `deepseek/deepseek-r1`, `deepseek/deepseek-chat`, or any model on [openrouter.ai](https://openrouter.ai/) |
| Mistral | `mistral-large-latest` |
| Groq | `deepseek-r1-distill-llama-70b` |

### 5.2 Agent Identity (Hatching)

The agent's personality is stored in `.github-minimum-intelligence/AGENTS.md`. To create or change the identity:

1. Open a new issue using the **🥚 Hatch** template.
2. The agent reads `.pi/BOOTSTRAP.md` and guides you through co-creating its name, nature, vibe, and emoji.
3. The resulting identity is written to `AGENTS.md` and persists across all future sessions.

To edit the identity directly, modify `AGENTS.md` by hand and commit.

### 5.3 Agent Behaviour

Session-wide behavioural rules are defined in `.github-minimum-intelligence/.pi/APPEND_SYSTEM.md`. This file is read by the agent at the start of every session.

### 5.4 Skills

Modular capabilities live in `.github-minimum-intelligence/.pi/skills/`. Included skills:

- **skill-creator** — Framework for creating new skills (with Python scripts for init, validate, and package).
- **memory** — Append-only memory logging system.

Custom skills can be added by creating a new directory under `.pi/skills/` with a `SKILL.md` file.

---

## 6. Upgrading

### 6.1 Upgrade Procedure

**Option A — Via the workflow (simplest):**

Run the workflow manually from the Actions tab (the same `workflow_dispatch` used for initial installation). The `install` job compares the local `VERSION` against the template `VERSION` and upgrades automatically when a newer version is available. User files (`AGENTS.md`, `.pi/`, `state/`) are preserved.

**Option B — Via the setup script (local):**

Run the same setup command used for installation:

```bash
curl -fsSL https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/script/setup.sh | bash
```

The script detects the existing installation, compares version numbers (from `.github-minimum-intelligence/VERSION`), and exits early if already up to date.

### 6.2 What the Upgrade Does

| Step | Detail |
|---|---|
| Back up user files | Copies `AGENTS.md`, `.pi/settings.json`, the entire `.pi/` directory, and `state/` to a temporary location |
| Replace framework | Removes old `.github-minimum-intelligence/` and copies the new version from the downloaded archive |
| Remove source state | Deletes the new version's `state/` directory (prevents inheriting the source repo's session history) |
| Restore user files | Copies back `AGENTS.md`, the `.pi/` directory (including `settings.json`, `APPEND_SYSTEM.md`, custom skills), and `state/` |
| Run installer | Executes `MINIMUM-INTELLIGENCE-INSTALLER.ts --upgrade` to update workflows and issue templates |

### 6.3 Preservation Table

| Component | Fresh install | Upgrade |
|---|---|---|
| `AGENTS.md` (agent identity) | Initialised from template | Preserved |
| `.pi/settings.json` (model config) | Initialised from template | Preserved |
| `.pi/` (skills, system prompt, bootstrap) | Copied from source | Preserved |
| `state/` (session history, issue mappings) | Removed (clean start) | Preserved |
| `lifecycle/` (agent orchestrator) | Copied from source | Updated |
| `install/` (installer and templates) | Copied from source | Updated |
| `docs/` (documentation) | Copied from source | Updated |
| `package.json` and `bun.lock` (dependencies) | Copied from source | Updated |
| `.github/workflows/` (agent workflow) | Created by installer | Overwritten by installer |
| `.github/ISSUE_TEMPLATE/` (issue templates) | Created by installer | Overwritten by installer |

### 6.4 After Upgrading

1. Review the changes: `git diff`
2. Commit and push:
   ```bash
   git add -A && git commit -m "Upgrade minimum-intelligence" && git push
   ```

---

## 7. Development Setup (Contributors)

This path is for contributors working on the Minimum Intelligence framework itself, as described in `CONTRIBUTING.md`.

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/<your-fork>/github-minimum-intelligence.git
   cd github-minimum-intelligence
   ```

2. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Install dependencies**:
   ```bash
   cd .github-minimum-intelligence && bun install
   ```

4. **Verify the installer runs cleanly**:
   ```bash
   bun .github-minimum-intelligence/install/MINIMUM-INTELLIGENCE-INSTALLER.ts
   ```

5. **Add an LLM API key** as a repository secret for end-to-end testing (see Section 4).

6. **Create a branch, make changes, and submit a pull request** against `main`.

There are no build or lint scripts in `package.json`. TypeScript is executed directly by Bun without a compilation step. The project has no test suite infrastructure — verification is done by running the installer and testing the agent via GitHub Issues.

---

## 8. Auxiliary Workflows

### 8.1 Repository Activation (`github-minimum-intelligence-readme.yml`)

This workflow triggers on `pull_request` events. Its purpose is to detect when the `REMOVE_BEFORE_FLIGHT` badge has been removed from `README.md` (indicating the repository has been customised from the template) and activate the repository by:

1. Creating an `ACTIVATED.md` file.
2. Deleting the activation workflow itself (self-removing).
3. Committing and pushing the changes.

If the badge is still present, the workflow does nothing (the repo is still inert).

### 8.2 Agent Workflow (`github-minimum-intelligence-agent.yml`)

This is the core workflow that powers the AI agent and deploys GitHub Pages. It is installed by the installer (Section 3) and runs automatically.

| Setting | Value |
|---|---|
| Triggers | `issues: [opened]`, `issue_comment: [created]`, `push` to `main`, `workflow_dispatch` |
| Permissions | `contents: write`, `issues: write`, `actions: write`, `pages: write`, `id-token: write` |
| Concurrency | Agent: grouped by repository + issue number; Pages: grouped by `pages`; neither cancels in-progress runs |
| Runtime | Ubuntu latest, Bun 1.2, cached `node_modules` |

**Agent execution sequence (on issue/comment events):**

1. **Authorise** — Verifies the actor has `admin`, `maintain`, or `write` permission via `gh api`. Adds a 🚀 reaction to indicate the agent is starting. Rejects unauthorised users with a 👎 reaction.
2. **Checkout** — Clones the repository with full history (`fetch-depth: 0`).
3. **Setup Bun** — Installs Bun 1.2 via `oven-sh/setup-bun@v2`.
4. **Cache** — Restores `.github-minimum-intelligence/node_modules/` from cache (keyed on `bun.lock` hash).
5. **Install** — Runs `bun install --frozen-lockfile`.
6. **Run** — Executes `bun .github-minimum-intelligence/lifecycle/agent.ts` with all provider API keys available as environment variables.

**GitHub Pages deployment (on push to `main`):**

Deploys static content from `.github-minimum-intelligence/public-fabric/` to GitHub Pages. `actions/configure-pages@v5` is called with `enablement: true`, which auto-enables Pages when the repo is created from a template. No additional setup is required beyond having GitHub Pages available on the repository (free for public repos, requires GitHub Pro/Team/Enterprise for private repos).

**Environment variables passed to the agent:**

```
ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY,
XAI_API_KEY, OPENROUTER_API_KEY, MISTRAL_API_KEY,
GROQ_API_KEY, GITHUB_TOKEN
```

---

## 9. File and Directory Reference

A complete map of what is installed and where it lives.

```
repository-root/
├── .github/
│   ├── workflows/
│   │   ├── github-minimum-intelligence-agent.yml    ← Installed by installer (agent + Pages)
│   │   └── github-minimum-intelligence-readme.yml   ← Copied from source (activation)
│   └── ISSUE_TEMPLATE/
│       ├── github-minimum-intelligence-hatch.md     ← Installed by installer
│       └── github-minimum-intelligence-chat.md      ← Installed by installer
│
└── .github-minimum-intelligence/
    ├── VERSION                          ← Version tracking (e.g. 1.0.0)
    ├── package.json                     ← Runtime dependency declaration
    ├── bun.lock                         ← Dependency lock file
    ├── AGENTS.md                        ← Agent identity (preserved on upgrade)
    ├── PACKAGES.md                      ← Dependency documentation
    ├── .pi/
    │   ├── settings.json                ← LLM provider config (preserved on upgrade)
    │   ├── APPEND_SYSTEM.md             ← Session-wide system prompt
    │   ├── BOOTSTRAP.md                 ← First-run identity prompt
    │   └── skills/                      ← Modular skill packages
    ├── install/
    │   ├── MINIMUM-INTELLIGENCE-INSTALLER.ts  ← Installer script
    │   ├── settings.json                ← Default settings template
    │   ├── MINIMUM-INTELLIGENCE-AGENTS.md     ← Default AGENTS.md template
    │   ├── app-manifest.json            ← GitHub App manifest
    │   ├── github-minimum-intelligence-agent.yml       ← Workflow source template
    │   ├── github-minimum-intelligence-installation.yml ← App installation handler
    │   ├── github-minimum-intelligence-readme.yml      ← Activation workflow source
    │   ├── package.json                 ← Installer dependencies (empty)
    │   ├── ISSUE_TEMPLATE/              ← Issue template sources
    │   └── workflows/                   ← Additional workflow sources
    ├── lifecycle/
    │   ├── agent.ts                     ← Core agent orchestrator
    │   └── README.md                    ← Lifecycle documentation
    ├── state/
    │   ├── issues/                      ← Issue-to-session mappings (JSON)
    │   ├── sessions/                    ← Conversation transcripts (JSONL)
    │   └── user.md                      ← User profile
    ├── script/
    │   └── setup.sh                     ← One-command installer/upgrader
    ├── docs/                            ← Documentation
    └── public-fabric/                   ← Static assets for GitHub Pages
```

---

## 10. Post-Install Verification

After completing any installation method, verify the setup is working:

| Check | How |
|---|---|
| Files are present | `ls .github-minimum-intelligence/VERSION` should show the version file |
| Workflow is installed | `ls .github/workflows/github-minimum-intelligence-agent.yml` should exist |
| Issue templates are installed | `ls .github/ISSUE_TEMPLATE/github-minimum-intelligence-*.md` should show hatch and chat templates |
| Dependencies are installed | `ls .github-minimum-intelligence/node_modules/.bin/pi` should exist |
| Changes are pushed | `git status` should show a clean working tree after committing |
| API key is configured | Check **Settings → Secrets and variables → Actions** in the GitHub UI |
| Agent responds | Open a new issue — the agent should add a 🚀 reaction within seconds and post a reply comment within 1–2 minutes |
| State is committed | After the first agent run, `ls .github-minimum-intelligence/state/issues/` should contain a JSON file and `ls .github-minimum-intelligence/state/sessions/` should contain a JSONL transcript |

---

## 11. Summary

GitHub Minimum Intelligence provides three installation paths, each targeting a different use case:

| Method | Command | Preserves identity on upgrade | Multi-repo support |
|---|---|---|---|
| Quick setup script | `curl ... \| bash` | Yes | One repo at a time |
| Manual copy | Download ZIP + `bun ... INSTALLER.ts` | Yes | One repo at a time |
| GitHub App | Register app + install on repos + `curl ... \| bash` per repo | Yes | Centralised |

All three paths converge on the same result: a `.github-minimum-intelligence/` directory in the repository root, a workflow under `.github/workflows/`, issue templates under `.github/ISSUE_TEMPLATE/`, and at least one LLM API key stored as a GitHub secret.

Upgrades use the same command as installation (`setup.sh`). The script detects an existing installation, backs up user customisations (`AGENTS.md`, `.pi/`, `state/`), replaces framework files, and restores the backups. Version tracking via the `VERSION` file ensures the upgrade exits early if already current.

The system requires zero external infrastructure. GitHub Actions is the sole compute runtime, Git is the memory layer, and GitHub Issues is the conversation interface. The only external dependency is an API key from one of seven supported LLM providers.
