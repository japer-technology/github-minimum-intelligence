# Analysis: How to Install via Create and Run Workflow

This document describes the **Create and Run Workflow** installation method — the simplest path to installing GitHub Minimum Intelligence. You add one workflow file to your repository, trigger it, and the workflow installs everything else automatically.

---

## 1. Overview

The entire installation reduces to a single file: `.github/workflows/github-minimum-intelligence-agent.yml`. Once committed and triggered via `workflow_dispatch`, its `install` job downloads the latest `.github-minimum-intelligence/` folder from the template repository, commits it to your default branch, and configures the agent to run on future issue and comment events.

No local tooling is required. Everything runs inside GitHub Actions.

| Aspect | Detail |
|---|---|
| Files to create | 1 — the workflow YAML |
| Local tools required | None (Git and a browser are sufficient) |
| GitHub Actions required | Yes |
| Approximate setup time | < 5 minutes |

---

## 2. Prerequisites

| Requirement | Purpose |
|---|---|
| A GitHub repository | Host for the agent — issues as conversation, Git as memory, Actions as runtime |
| GitHub Actions enabled | The workflow runs as a GitHub Action (`workflow_dispatch` trigger) |
| At least one LLM API key | Powers the AI agent (see Section 5) |

No local installation of Bun, Node.js, or any other runtime is needed. The workflow provisions its own environment.

---

## 3. Step-by-Step Installation

### 3.1 Create the Workflow File

Create the file `.github/workflows/github-minimum-intelligence-agent.yml` in your repository.

The source file is maintained in the template repository:
[**View workflow source →**](https://github.com/japer-technology/github-minimum-intelligence/blob/main/.github/workflows/github-minimum-intelligence-agent.yml)

**Option A — Direct link (fastest):**

Open the following URL in your browser, replacing `OWNER` and `REPO` with your repository's owner and name:

```
https://github.com/OWNER/REPO/new/main?filename=.github/workflows/github-minimum-intelligence-agent.yml
```

This opens the GitHub **Create new file** editor with the correct path and filename already filled in. Copy the [workflow source](https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github/workflows/github-minimum-intelligence-agent.yml), paste it into the editor, and commit directly to your default branch.

> **Tip:** You do not need to type or remember the file path — the `filename` URL parameter sets it automatically.

**Option B — From the GitHub UI (manual):**

1. Navigate to your repository on GitHub.
2. Click **Add file → Create new file**.
3. Enter the path: `.github/workflows/github-minimum-intelligence-agent.yml`
4. Paste the [workflow source](https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github/workflows/github-minimum-intelligence-agent.yml) into the editor.
5. Commit directly to your default branch.

**Option C — From the command line:**

```bash
mkdir -p .github/workflows

curl -fsSL \
  "https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github/workflows/github-minimum-intelligence-agent.yml" \
  -o .github/workflows/github-minimum-intelligence-agent.yml

git add .github/workflows/github-minimum-intelligence-agent.yml
git commit -m "chore: add github-minimum-intelligence workflow"
git push
```

### 3.2 Run the Workflow

1. Go to the **Actions** tab of your repository.
2. Select **github-minimum-intelligence-agent** from the workflow list on the left.
3. Click **Run workflow** → select your default branch → click the green **Run workflow** button.

This triggers the `workflow_dispatch` event, which activates the `install` job.

### 3.3 What the Install Job Does

The `install` job runs automatically when the workflow is dispatched manually. It performs the following steps:

| Step | What happens |
|---|---|
| **Checkout** | Clones the repository at the default branch |
| **Check for existing install** | Looks for the `.github-minimum-intelligence/` directory. If it already exists, the job exits — nothing is overwritten |
| **Download template** | Fetches the latest ZIP archive from `github.com/japer-technology/github-minimum-intelligence/archive/refs/heads/main.zip` |
| **Extract and copy** | Extracts `.github-minimum-intelligence/` from the archive into the repository root |
| **Clean source state** | Removes `node_modules/` (reinstalled at runtime) and `state/` (prevents inheriting the template repo's session history) |
| **Initialise defaults** | Copies `AGENTS.md` and `.pi/settings.json` from the install templates |
| **Commit and push** | Commits the new `.github-minimum-intelligence/` folder and pushes to the default branch |

After this job completes, your repository contains the full `.github-minimum-intelligence/` directory and the agent is ready to respond to issues.

### 3.4 Add an LLM API Key

See Section 5 below.

### 3.5 Open an Issue

Create a new issue in your repository. The agent adds a 🚀 reaction within seconds and posts a reply comment within 1–2 minutes.

---

## 4. How the Workflow File Operates After Installation

Once installed, the same workflow file serves three purposes — it never needs to be replaced or supplemented with additional workflows.

| Trigger | Job | What it does |
|---|---|---|
| `workflow_dispatch` (manual) | `install` | Downloads and installs `.github-minimum-intelligence/` if not already present |
| `issues: [opened]` | `run-agent` | Launches the AI agent when a new issue is created |
| `issue_comment: [created]` | `run-agent` | Launches the AI agent when a comment is added to an issue (bot comments are ignored) |
| `push` to `main` | `deploy-pages` | Deploys static content from `.github-minimum-intelligence/public-fabric/` to GitHub Pages |

### 4.1 Agent Execution Sequence

When an issue or comment event fires, the `run-agent` job:

1. **Authorises** the actor — verifies `admin`, `maintain`, or `write` permission. Adds a 🚀 reaction as a launch indicator.
2. **Checks out** the repository with full history.
3. **Sets up Bun** (version 1.2 via `oven-sh/setup-bun@v2`).
4. **Restores cached dependencies** from `actions/cache@v5`, keyed on `bun.lock`.
5. **Installs dependencies** via `bun install --frozen-lockfile`.
6. **Runs the agent** — executes `bun .github-minimum-intelligence/lifecycle/agent.ts` with all configured API keys.

### 4.2 Permissions

The workflow declares these permissions at the top level:

| Permission | Why |
|---|---|
| `contents: write` | Agent commits files (state, conversation transcripts, code changes) |
| `issues: write` | Agent posts reply comments and adds reactions |
| `actions: write` | Required for workflow-level operations |
| `pages: write` | GitHub Pages deployment |
| `id-token: write` | OIDC token for Pages deployment |

---

## 5. Adding an LLM API Key

After the install job completes, add at least one API key as a **GitHub repository secret**:

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

Only one key is required. The agent reads `.pi/settings.json` to determine which provider to use.

---

## 6. Updating

To update to the latest version, the `install` job only runs when `.github-minimum-intelligence/` does not exist. For updates, use the setup script from the repository root:

```bash
curl -fsSL https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/script/setup.sh | bash
```

The script detects the existing installation, compares version numbers (from `.github-minimum-intelligence/VERSION`), backs up user customisations (`AGENTS.md`, `.pi/`, `state/`), replaces framework files, and restores the backups.

See [How to Install and Update](how-to-install-and-update.md) for the full upgrade procedure and preservation table.

---

## 7. Verification

After the install job finishes and you have added an API key, verify the setup:

| Check | How |
|---|---|
| Install job succeeded | **Actions** tab → the `github-minimum-intelligence-agent` run shows a green ✅ on the `install` job |
| Files are present | The repository now contains `.github-minimum-intelligence/VERSION` |
| Workflow is active | **Actions** tab → `github-minimum-intelligence-agent` appears in the workflow list |
| API key is configured | **Settings → Secrets and variables → Actions** shows at least one provider key |
| Agent responds | Open a new issue — the agent adds a 🚀 reaction and posts a reply |

---

## 8. Summary

The **Create and Run Workflow** method is the most minimal installation path for GitHub Minimum Intelligence. It requires creating a single file (`.github/workflows/github-minimum-intelligence-agent.yml`), committing it, and triggering the workflow manually from the Actions tab. The workflow's `install` job downloads the latest `.github-minimum-intelligence/` folder from the template repository, configures defaults, and commits everything to the default branch — no local tooling, no build steps, no manual file copying.

After installation, the same workflow file continues to serve as the runtime for the AI agent (responding to issues and comments), the installer (via `workflow_dispatch`), and the GitHub Pages deployer (on push to `main`). Adding an LLM API key as a repository secret is the only remaining step before the agent is fully operational.
