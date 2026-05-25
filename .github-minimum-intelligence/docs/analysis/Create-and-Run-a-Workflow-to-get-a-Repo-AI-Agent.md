# Create and Run a Single Workflow to Get a Repo AI Agent in GitHub Issue Management

> One workflow file. One manual run. Then your repository gets an AI agent that works inside GitHub Issues.

This manual is for Git users and GitHub users who want the fastest path from **plain repository** to **repo-native AI issue agent**.

The model here is simple:

- you add **one workflow file**
- you run it **once** from the **Actions** tab
- it installs the agent files into the repo
- after that, the same workflow responds to **new issues** and **new issue comments**

No separate backend. No browser extension. No external dashboard. No new place to manage context.

Your repo stays the system of record.

And just as important: **you keep complete control**.

- Add the workflow, and the agent can run.
- Disable or remove the workflow, and the agent stops.
- Delete the secret, and the model cannot run.
- Remove `.github-minimum-intelligence/`, and the repo-local agent framework is gone.

That is the whole trust model: no hidden control plane, no always-on service, no vendor-owned memory outside your repository unless you choose to wire one in yourself.

---

## What you get

After setup, your repository gets an AI agent that:

- responds to **new GitHub issues**
- responds to **new comments on issues**
- remembers issue conversations through committed state
- can read and modify files in the repo
- can commit its work back to the default branch
- lives inside normal GitHub workflows, permissions, issues, and git history

In short:

> your issue tracker becomes an AI work surface

---

## The fastest possible version

1. Add one workflow file at:
   - `.github/workflows/github-minimum-intelligence-agent.yml`
2. Add one LLM secret to the repo:
   - easiest default: `OPENAI_API_KEY`
3. Commit and push
4. Open **Actions** in GitHub and run the workflow once with **Run workflow**
5. Wait for the workflow to commit `.github-minimum-intelligence/` into the repo
6. Open an issue
7. The agent replies inside GitHub Issue Management

---

## Best-fit use case

Use this install path if you want:

- the smallest install surface
- a GitHub-native AI agent
- no manual copy/paste of a whole framework folder
- a repo-level assistant for issue intake, triage, discussion, and execution
- a setup Git users can understand instantly

---

## Requirements

You need:

- a GitHub repository
- GitHub **Issues** enabled
- GitHub **Actions** enabled
- permission level of **write**, **maintain**, or **admin** on the repo
- at least one LLM API key as a repository secret

Recommended easiest path:

- provider: **OpenAI**
- secret: `OPENAI_API_KEY`

Supported secrets in the workflow:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `XAI_API_KEY`
- `OPENROUTER_API_KEY`
- `MISTRAL_API_KEY`
- `GROQ_API_KEY`

---

## Before you start

This single-file install method uses one workflow that does two jobs:

### Job 1: install on manual run
When you run it via `workflow_dispatch`, it:

- checks out your repo
- downloads the latest `.github-minimum-intelligence` folder from the template repo
- copies it into your repository
- initializes defaults
- commits the result back to your default branch

### Job 2: act as the live issue agent
After the framework folder exists, the same workflow listens to:

- `issues.opened`
- `issue_comment.created`

That means the workflow you create for installation is also the workflow that powers the agent afterward.

---

## Step 1 — Add one repository secret

Go to:

**Repository → Settings → Secrets and variables → Actions**

Add at least one secret.

### Easiest default

- **Name:** `OPENAI_API_KEY`
- **Value:** your OpenAI API key

### If you prefer another provider
You can use one of these instead:

| Provider | Secret name |
|---|---|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| xAI | `XAI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |

> Note: the default installed settings point to OpenAI. If you use another provider, install first, then edit `.github-minimum-intelligence/.pi/settings.json` and commit the change.

---

## Step 2 — Create the single workflow file

Create this file in your repository:

```text
.github/workflows/github-minimum-intelligence-agent.yml
```

Paste in the following workflow:

```yaml
name: github-minimum-intelligence-agent

on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]
  workflow_dispatch:

permissions:
  contents: write
  issues: write
  actions: write

jobs:
  install:
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.repository.default_branch }}

      - name: Check for .github-minimum-intelligence
        id: check-folder
        run: |
          if [ -d ".github-minimum-intelligence" ]; then
            echo "exists=true" >> "$GITHUB_OUTPUT"
            echo "✅ .github-minimum-intelligence already exists — nothing to do."
          else
            echo "exists=false" >> "$GITHUB_OUTPUT"
            echo "✅ .github-minimum-intelligence not found — will install."
          fi

      - name: Download and install from template
        if: steps.check-folder.outputs.exists == 'false'
        run: |
          set -euo pipefail

          curl -fsSL "https://github.com/japer-technology/github-minimum-intelligence/archive/refs/heads/main.zip" \
            -o /tmp/template.zip
          unzip -q /tmp/template.zip -d /tmp/template

          EXTRACTED=$(ls -d /tmp/template/github-minimum-intelligence-*)
          TARGET=".github-minimum-intelligence"

          cp -R "$EXTRACTED/$TARGET" "$TARGET"

          # Remove vendored dependencies — installed at runtime via bun install
          rm -rf "$TARGET/node_modules"

          # Remove the source repo's state — must not be carried over
          rm -rf "$TARGET/state"

          # Initialise defaults for fresh install
          cp "$TARGET/install/MINIMUM-INTELLIGENCE-AGENTS.md" "$TARGET/AGENTS.md"
          mkdir -p "$TARGET/.pi"
          cp "$TARGET/install/settings.json" "$TARGET/.pi/settings.json"

      - name: Commit and push
        if: steps.check-folder.outputs.exists == 'false'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          git add .github-minimum-intelligence/

          if git diff --cached --quiet; then
            echo "No changes to commit."
          else
            git commit -m "chore: install .github-minimum-intelligence from template"
            git push
          fi

  run-agent:
    runs-on: ubuntu-latest
    concurrency:
      group: github-minimum-intelligence-${{ github.repository }}-issue-${{ github.event.issue.number }}
      cancel-in-progress: false
    if: >-
      (github.event_name == 'issues')
      || (github.event_name == 'issue_comment' && !endsWith(github.event.comment.user.login, '[bot]'))
    steps:
      - name: Authorize
        id: authorize
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          PERM=$(gh api "repos/${{ github.repository }}/collaborators/${{ github.actor }}/permission" --jq '.permission' 2>/dev/null || echo "none")
          echo "Actor: ${{ github.actor }}, Permission: $PERM"
          if [[ "$PERM" != "admin" && "$PERM" != "maintain" && "$PERM" != "write" ]]; then
            echo "::error::Unauthorized: ${{ github.actor }} has '$PERM' permission"
            exit 1
          fi
          # Add indicator reaction
          if [[ "${{ github.event_name }}" == "issue_comment" ]]; then
            REACTION_ID=$(gh api "repos/${{ github.repository }}/issues/comments/${{ github.event.comment.id }}/reactions" -f content=rocket --jq '.id' 2>/dev/null || echo "")
            if [[ -n "$REACTION_ID" ]]; then RID_JSON="\"$REACTION_ID\""; else RID_JSON="null"; fi
            echo '{"reactionId":'"$RID_JSON"',"reactionTarget":"comment","commentId":${{ github.event.comment.id }},"issueNumber":${{ github.event.issue.number }},"repo":"${{ github.repository }}"}' > /tmp/reaction-state.json
          else
            REACTION_ID=$(gh api "repos/${{ github.repository }}/issues/${{ github.event.issue.number }}/reactions" -f content=rocket --jq '.id' 2>/dev/null || echo "")
            if [[ -n "$REACTION_ID" ]]; then RID_JSON="\"$REACTION_ID\""; else RID_JSON="null"; fi
            echo '{"reactionId":'"$RID_JSON"',"reactionTarget":"issue","commentId":null,"issueNumber":${{ github.event.issue.number }},"repo":"${{ github.repository }}"}' > /tmp/reaction-state.json
          fi

      - name: Reject
        if: ${{ failure() && steps.authorize.outcome == 'failure' }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          if [[ "${{ github.event_name }}" == "issue_comment" ]]; then
            gh api "repos/${{ github.repository }}/issues/comments/${{ github.event.comment.id }}/reactions" -f content=-1
          else
            gh api "repos/${{ github.repository }}/issues/${{ github.event.issue.number }}/reactions" -f content=-1
          fi

      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.repository.default_branch }}
          fetch-depth: 0

      - name: Check for .github-minimum-intelligence
        id: check-folder
        run: |
          if [ -d ".github-minimum-intelligence" ]; then
            echo "exists=true" >> "$GITHUB_OUTPUT"
          else
            echo "exists=false" >> "$GITHUB_OUTPUT"
            echo "::notice::.github-minimum-intelligence folder not found, skipping."
          fi

      - name: Setup Bun
        if: steps.check-folder.outputs.exists == 'true'
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.2"

      - name: Cache dependencies
        if: steps.check-folder.outputs.exists == 'true'
        uses: actions/cache@v4
        with:
          path: .github-minimum-intelligence/node_modules
          key: mi-deps-${{ hashFiles('.github-minimum-intelligence/bun.lock') }}

      - name: Install dependencies
        if: steps.check-folder.outputs.exists == 'true'
        run: cd .github-minimum-intelligence && bun install --frozen-lockfile

      - name: Run
        if: steps.check-folder.outputs.exists == 'true'
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          XAI_API_KEY: ${{ secrets.XAI_API_KEY }}
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: bun .github-minimum-intelligence/lifecycle/agent.ts
```

---

## Step 3 — Commit and push the workflow

Use your normal Git flow.

Example:

```bash
git add .github/workflows/github-minimum-intelligence-agent.yml
git commit -m "Add repo AI agent workflow"
git push
```

---

## Step 4 — Run the workflow once

In GitHub:

1. Open the repository
2. Click **Actions**
3. Open **github-minimum-intelligence-agent**
4. Click **Run workflow**
5. Choose the default branch
6. Click **Run workflow** again

This first manual run is the bootstrap step.

### What should happen
The workflow should:

- download the template
- create `.github-minimum-intelligence/`
- commit it to the repo
- push the commit automatically

Expected commit message:

```text
chore: install .github-minimum-intelligence from template
```

---

## Step 5 — Confirm the install landed in the repo

After the workflow finishes, you should see this folder in the repository root:

```text
.github-minimum-intelligence/
```

Important files you should now have:

```text
.github-minimum-intelligence/AGENTS.md
.github-minimum-intelligence/.pi/settings.json
.github-minimum-intelligence/lifecycle/agent.ts
.github-minimum-intelligence/install/
.github-minimum-intelligence/docs/
```

This is the repo-local brain, behavior, and runtime scaffolding for the agent.

---

## Step 6 — Open an issue and talk to the agent

Now the same workflow is live for issue handling.

Create a new issue like:

### Example issue 1 — simple
**Title:**
```text
Audit the README and suggest improvements
```

**Body:**
```text
Please review the repository README.
Find missing setup details, weak sections, and unclear developer instructions.
Reply with a plan first.
```

### Example issue 2 — implementation
**Title:**
```text
Add a manual for installing the issue agent
```

**Body:**
```text
Create a markdown manual that explains the one-workflow installation path.
Keep it GitHub-native and target Git users.
```

### What you should see
Within seconds to a minute:

- a � reaction appears on the issue or comment
- the workflow runs
- the agent replies as a comment
- if it changes files, it may commit them back to the repo

---

## Optional — Hatch the agent identity

By default, the installed `AGENTS.md` contains a blank identity state.

If you want to turn the agent into a named repo character with a clear vibe and purpose:

1. create an issue
2. add the label `hatch`
3. ask the agent who it should be

The bootstrap flow is designed to help define:

- name
- nature
- vibe
- emoji
- purpose

That identity is then stored in:

```text
.github-minimum-intelligence/AGENTS.md
```

So the agent persona becomes versioned repo state, not hidden vendor config.

---

## Optional — Switch providers after install

The default installed settings are:

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-5.4",
  "defaultThinkingLevel": "high"
}
```

If you want Anthropic, Gemini, Groq, OpenRouter, xAI, or Mistral instead, edit:

```text
.github-minimum-intelligence/.pi/settings.json
```

Example for Anthropic:

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "high"
}
```

Then commit and push.

Also make sure the matching repo secret exists.

---

## What this single workflow is actually doing

This is why Git users tend to like this setup.

It is not doing anything magical.

It is just composing normal GitHub primitives:

- **Issues** for conversation
- **Issue comments** for follow-ups
- **Actions** for execution
- **Git** for history and state
- **Repo files** for prompts, memory, and agent behavior
- **Repository secrets** for model access

That means:

- setup is inspectable
- behavior is versioned
- memory is file-backed
- changes are committed
- rollback is still just Git

---

## Why this install path is attractive

### Minimal friction
You are not copying a giant starter kit manually.

### Repo-native
The AI lives where the work already lives.

### Git-native
Everything that matters becomes a file, commit, comment, or workflow run.

### Team-friendly
Permissions map to normal GitHub repo permissions.

### Operationally obvious
If it breaks, you inspect the workflow run and the repo history.

### Fully under your control
The agent only runs because the repository allows it to run. Remove the workflow, disable Actions, or delete the provider secret, and the agent stops. That is hard control, not a marketing claim.

---

## Verification checklist

Use this checklist after setup.

### Repository settings
- [ ] Issues are enabled
- [ ] Actions are enabled
- [ ] You have write/maintain/admin permission

### Files
- [ ] `.github/workflows/github-minimum-intelligence-agent.yml` exists
- [ ] `.github-minimum-intelligence/` exists after the manual run
- [ ] `.github-minimum-intelligence/.pi/settings.json` exists
- [ ] `.github-minimum-intelligence/AGENTS.md` exists

### Secrets
- [ ] At least one provider secret exists
- [ ] If using default config, `OPENAI_API_KEY` exists

### Runtime behavior
- [ ] Manual workflow run succeeded
- [ ] The install commit was pushed by GitHub Actions
- [ ] A new issue triggers the workflow
- [ ] The issue gets a � reaction
- [ ] The agent replies with a comment

---

## Troubleshooting

## 1. The workflow does not appear in Actions
Check:

- the file path is exactly `.github/workflows/github-minimum-intelligence-agent.yml`
- the YAML committed successfully
- Actions are enabled for the repository

## 2. The workflow runs but nothing is installed
Check the **install** job logs.

The most common causes:

- the repo default branch was not pushable by the workflow
- Actions permissions are restricted
- the repo already had `.github-minimum-intelligence/`

## 3. The agent does not respond to issues
Check:

- `.github-minimum-intelligence/` exists in the repo
- a provider secret exists
- `.github-minimum-intelligence/.pi/settings.json` matches that provider
- the issue author has enough repository permission if your workflow is enforcing write/maintain/admin-only interaction

## 4. The workflow reacts but fails during runtime
Open the workflow logs and look for:

- missing API key secret
- provider mismatch in `settings.json`
- dependency install failure in the Bun step

## 5. External contributors cannot use it
That is expected with the current authorization logic.

The workflow explicitly allows only users with:

- `admin`
- `maintain`
- `write`

Unauthorized actors are rejected.

---

## Security and permission model

This workflow requests:

```yaml
permissions:
  contents: write
  issues: write
  actions: write
```

Why:

- `contents: write` so the agent can commit work and state
- `issues: write` so it can comment and add reactions
- `actions: write` so it can operate cleanly inside workflow automation

This is a repo-writing agent.
Treat it like any automation that can push commits.

Best practices:

- start in a non-critical repo first
- use a dedicated provider key with budget limits if available
- review the installed `.github-minimum-intelligence/` folder
- branch-protect production repos if needed

## Stop, pause, or remove the agent

This setup is reversible.

### To pause the agent temporarily
You have several clean options:

- disable the workflow in GitHub Actions
- disable GitHub Actions for the repo
- remove the provider secret such as `OPENAI_API_KEY`

### To stop the agent completely
Remove the workflow file:

```text
.github/workflows/github-minimum-intelligence-agent.yml
```

Once that workflow is removed, the issue-triggered agent stops running.

### To remove the installed framework too
Also remove:

```text
.github-minimum-intelligence/
```

Then commit and push the deletion.

### Why this matters
This gives you complete and total operational control:

- no workflow = no agent runtime
- no secret = no model access
- no framework folder = no local agent scaffolding

In Git terms, control is explicit, visible, and reversible.

---

## Recommended first three issues

If you want to test real value immediately, open these three issues in order.

### 1. Hatch the identity
```text
Title: Hatch
Body: You just came online. Help me define your name, style, purpose, and emoji.
```
Add label:
```text
hatch
```

### 2. Repository audit
```text
Title: Audit this repo
Body: Read the repository structure, explain what this repo does, and suggest the three highest-value improvements.
```

### 3. First concrete task
```text
Title: Improve docs
Body: Find the weakest documentation page, rewrite it, and commit the change.
```

---

## The short install summary you can paste anywhere

> Add one workflow file, add one API key secret, run the workflow once from Actions, and your repo gets an AI agent that works inside GitHub Issues and issue comments.

---

# Advertising Copy Pack

You asked for the full array of advertising formats and lengths, targeted at Git users. Here it is.

Use these in:

- README intros
- repo descriptions
- release notes
- changelogs
- product pages
- X posts
- LinkedIn posts
- issue templates
- internal announcements
- email launches
- marketplace blurbs
- sponsor blocks

---

## 1) Ultra-short headlines

### 3–5 words
- AI for GitHub Issues
- Your repo gets an agent
- One workflow, live agent
- Git-native issue AI
- Repo AI, no platform
- Install once, issue forever

### 6–8 words
- Turn GitHub Issues into an AI workspace
- Add an AI agent with one workflow
- Your repo now has issue-driven intelligence
- Install once, manage work in Issues
- Repo-native AI for GitHub issue management

### 9–12 words
- Create one workflow, run it once, get an AI repo agent
- Turn GitHub Issues into a working AI collaboration surface
- Install a repo-native AI agent without leaving GitHub
- Give your repository an issue-handling AI with one file

---

## 2) Taglines

### Short tagline
> One workflow file. One run. One repo-native AI agent in GitHub Issues.

### Developer tagline
> GitHub Issues become your AI command surface, backed by Actions and git.

### Git-first tagline
> The repo is the runtime, git is the memory, Issues are the interface.

### Minimal-infra tagline
> No dashboard. No new platform. Just an agent inside the repo you already use.

---

## 3) Description lengths

### 50-ish characters
**Repo AI agent for GitHub Issues**

### 80-ish characters
**Add one workflow and get an AI agent inside GitHub Issues.**

### 120-ish characters
**Create one workflow, run it once, and your repo gets an AI agent for issues and issue comments.**

### 160-ish characters
**Install a repo-native AI agent with one GitHub Actions workflow. Run it once, then manage work directly in GitHub Issues and comments.**

### 220-ish characters
**Drop one workflow into your repository, run it once from Actions, and your repo installs a GitHub-native AI agent that responds in Issues, remembers context, and commits work back through normal git history.**

### 300-ish characters
**This is the fastest path to a repo-native AI assistant: create one workflow file, run it once, and the repository installs its own issue-handling agent. After that, new issues and issue comments become the interaction loop, with state and changes tracked in git.**

---

## 4) GitHub repo description options

### Very short
**AI agent for GitHub Issues, installed with one workflow.**

### Short
**One workflow file installs a repo-native AI agent that works inside GitHub Issues.**

### Medium
**Turn GitHub Issues into an AI work surface. Add one workflow, run it once, and your repo gets an issue-driven agent that can respond, remember, and commit changes.**

---

## 5) README hero copy

### README hero — short
# Add an AI Agent to GitHub Issues with One Workflow

Create one workflow file, run it once, and your repository gets a repo-native AI agent that responds to issues, follows issue comments, and works through normal GitHub Actions and git history.

### README hero — medium
# Your Repository Can Have Its Own AI Agent

No separate platform. No external workspace. No extra control plane.

Just add one GitHub Actions workflow, run it once, and your repository installs an AI agent that lives inside GitHub Issues. Open issues, leave comments, and let the agent read the repo, reason over the work, and commit changes back through standard git flows.

### README hero — long
# Turn GitHub Issues into a Repo-Native AI Work Surface

This install path is built for Git users who want the minimum viable setup with the maximum GitHub-native behavior. Create a single workflow file, trigger it once from the Actions tab, and the repository installs everything it needs to become issue-driven AI infrastructure. From then on, Issues and issue comments become the interaction layer, GitHub Actions becomes the runtime, and git becomes the memory and audit trail.

---

## 6) Social posts

### X / Twitter — short
Add one workflow file. Run it once. Your repo gets an AI agent inside GitHub Issues. No dashboard, no extra platform, just Issues + Actions + git.

### X / Twitter — medium
You can install a repo-native AI agent with a single GitHub Actions workflow.

Create one file, run it once from Actions, and your repo starts responding in GitHub Issues and issue comments. Git is the memory. Issues are the interface.

### X / Twitter — max-style
One workflow file.
One manual run.
Then your repo has an AI agent inside GitHub Issues.

It responds to new issues, follows comments, remembers context, and commits work back through normal git history.

No new platform. Just GitHub, Actions, Issues, and your repo.

### LinkedIn — short
We turned GitHub Issue Management into an AI work surface with one workflow file. Run it once, and the repository installs its own AI agent for issues and issue comments. No external dashboard. Just GitHub-native automation, repo-local state, and normal git history.

### LinkedIn — long
If your team already lives in GitHub, your AI workflow should too.

This setup lets you create a single GitHub Actions workflow, run it one time, and install a repo-native AI agent directly into the repository. After that, GitHub Issues and issue comments become the interface. The agent can read the codebase, reason over requests, remember issue context, and commit changes back into git.

That means less context switching, less platform sprawl, and a much cleaner trust model: workflows, permissions, comments, commits, and files you can actually inspect.

---

## 7) Community post formats

### Hacker News title
Show HN: Install a repo-native AI agent with one GitHub workflow

### Hacker News body
I put together a single-workflow install path for a repo-native AI agent.

You create one workflow file in `.github/workflows/`, run it once via `workflow_dispatch`, and it installs the agent framework into the repo. After that, the same workflow responds to new GitHub issues and new issue comments.

The interesting part is that it stays fully GitHub-native:
- Issues are the conversation surface
- Actions are the runtime
- git is the memory and audit trail
- behavior lives in committed files

### Reddit title
You can add an AI agent to GitHub Issues with one workflow file

### Reddit body
For people who prefer repo-native tooling over external dashboards: this setup lets you install an AI issue agent by adding a single GitHub Actions workflow and running it once. After bootstrap, the repo can respond to issues and issue comments directly inside GitHub.

---

## 8) Release notes / changelog formats

### One line
**Added a one-workflow install path for a repo-native GitHub Issues AI agent.**

### Short release note
This release adds a minimal installation flow: create one workflow file, run it once from GitHub Actions, and the repository bootstraps its own AI issue agent.

### Medium release note
This update introduces the simplest installation path yet. Instead of manually copying the full framework, you can now add a single workflow file and trigger it once with `workflow_dispatch`. The workflow installs `.github-minimum-intelligence/` into the repo, after which the same workflow handles new issues and issue comments.

### Long release note
This release adds a clean single-file bootstrap for repository-native AI issue handling. Users only need to create one workflow under `.github/workflows/` and run it once from the Actions tab. The install job pulls the framework into the repository, initializes the agent files, and commits them to the default branch. After that, the workflow becomes the permanent runtime for issue-driven interaction, allowing the agent to respond to new issues and issue comments directly inside GitHub.

---

## 9) Website and landing page copy

### Hero headline
Install a Repo AI Agent with One Workflow

### Hero subhead
Run one GitHub Actions workflow once and turn GitHub Issues into a repo-native AI workspace.

### Benefit bullets
- No external control plane
- Lives inside GitHub Issues
- Uses Actions as runtime
- Stores behavior and memory in repo files
- Commits work through normal git history

### CTA buttons
- Add the workflow
- Run the installer
- Activate issue AI
- Turn on repo agent
- Get AI in Issues

### Above-the-fold paragraph
This is the shortest path from plain repository to working AI issue agent. Add one workflow file, run it once, and the repository installs everything it needs to respond inside GitHub Issues. From then on, issue threads become the interface, Actions becomes the runtime, and git remains the source of truth.

---

## 10) Email launch copy

### Subject lines
- Add an AI agent to GitHub Issues with one workflow
- One workflow run to turn your repo into an AI issue workspace
- Your repository can now have its own issue agent
- GitHub-native AI, installed in one workflow

### Preheader text
Create one workflow file, run it once, and your repo gets an AI agent inside GitHub Issues.

### Short email
You can now install a repo-native AI agent with a single GitHub Actions workflow.

Add one workflow file, run it once from the Actions tab, and your repository bootstraps an AI agent that responds to GitHub issues and issue comments. No extra platform, no hidden workspace — just GitHub, Actions, and git.

### Medium email
If your team already manages work in GitHub, your AI assistant should show up there too.

This setup creates a repo-native AI agent using a single workflow file. Trigger it once manually, let it install the agent framework into the repository, and from then on the same workflow handles issue-driven conversations. The result is an AI agent that works inside GitHub Issues, follows comment threads, and commits changes through normal git history.

---

## 11) In-product UI copy

### Tooltip
Install the repo AI agent by running this workflow once.

### Banner
This repository can install its own AI issue agent. Run the workflow to activate it.

### Empty state
No repo agent yet. Add the workflow, run it once, and start using AI in GitHub Issues.

### Success state
Repo agent installed. Open an issue to start working with it.

### Failure state
The repo agent could not start. Check workflow logs, provider secrets, and settings.

---

## 12) Sponsor / ad slot copy

### 1 sentence
Turn GitHub Issues into a repo-native AI workspace with one workflow file.

### 2 sentences
Create one workflow, run it once, and your repository gets an AI agent inside GitHub Issues. It replies to issues, follows comments, remembers context, and works through normal git history.

### 3 sentences
Most AI dev tools pull you out of the repo. This one drops directly into it. Add one workflow file, run it once, and your GitHub Issues become the interface for a repo-native AI agent.

---

## 13) Sales-style value props for Git users

- **Git-native:** every important change is still a commit
- **GitHub-native:** issues and comments are the interface
- **Low ceremony:** one workflow file gets you started
- **Auditable:** behavior lives in files and workflow runs
- **Composable:** normal repo permissions still apply
- **Minimal infra:** no separate backend to babysit
- **Fast adoption:** ideal for repos already using Issues + Actions

---

## 14) Persona-targeted versions

### For maintainers
Give your repo an issue-handling AI without introducing a new platform. One workflow file installs the agent and keeps everything inside normal GitHub operations.

### For staff engineers
This is repository-native AI, not dashboard-native AI. Issues are the interaction surface, Actions are the runtime, and git remains the memory and audit trail.

### For platform teams
Standardize AI issue handling across repos with a single workflow pattern. Bootstrap once, keep behavior in versioned repo files, and let GitHub permissions define authority.

### For open source maintainers
Install an AI helper directly in GitHub Issues so repo conversations stay where the contributors already are. No external workspace required.

---

## 15) High-conviction closing lines

- Your repo does not need another platform. It needs one good workflow.
- The fastest way to get AI into issue management is still the GitHub-native way.
- If your team works in GitHub, your agent should too.
- The repo is the runtime. The issue thread is the interface.
- One workflow run is enough to make GitHub Issues AI-active.

---

## Final takeaway

If you want the cleanest install story for a GitHub issue agent, this is it:

> create one workflow file, run it once, and your repo gains an AI agent inside Issue Management

For Git users, that is the whole pitch:

- one file
- one run
- one repo-native agent
- zero dashboard drift
- all the history still lives in git
