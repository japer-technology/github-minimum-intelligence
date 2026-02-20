# .GITCLAW 🦞 An AI Agent As An Add-On

### Move or copy GITHUB-INSTALLER.yml to workflows to install

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/gitclaw/main/.GITCLAW/GITCLAW-LOGO.png" alt="GitClaw" width="500">
  </picture>
</p>

A personal AI assistant that runs entirely through GitHub Issues and Actions. Drop a single `.GITCLAW` folder into any repo and you have a fully functional AI agent — no servers, no external services, no extra infrastructure.

> **New here?** Check the [Quick Start](QUICKSTART.md) to get running in under 5 minutes.

Powered by the [pi coding agent](https://github.com/badlogic/pi-mono). Every issue becomes a chat thread with an AI agent. Conversation history is committed to git, giving the agent long-term memory across sessions. It can search prior context, edit or summarize past conversations, and all changes are versioned.

Since the agent can read and write files, you can build an evolving software project that updates itself as you open issues. Try asking it to set up a GitHub Pages site, then iterate on it issue by issue.

### Benefits

- **Single folder, any repo** — copy `.GITCLAW/` in and run the install script. Nothing to host or maintain.
- **Zero infrastructure** — runs on GitHub Actions with your repo as the only backend.
- **Persistent memory** — conversations are committed to git, so the agent remembers everything across sessions.
- **Full auditability** — every interaction is versioned; review or roll back any change the agent made.

## How it works

1. **Create an issue** → the agent processes your request and replies as a comment.
2. **Comment on the issue** → the agent resumes the same session with full prior context.
3. **Everything is committed** → sessions and changes are pushed to the repo after every turn.

The agent reacts with 👀 while working and removes it when done.

### Repo as storage

All state lives in the repo:

```
.GITCLAW/state/
  issues/
    1.json          # maps issue #1 -> its session file
  sessions/
    2026-02-04T..._abc123.jsonl    # full conversation for issue #1
```

Since sessions are in git, the agent can grep its own history and edit or summarize past conversations.

## Setup — Add to Any Repo

gitclaw lives entirely inside a `.GITCLAW` folder that you drop into your repository.

1. **Copy the `.GITCLAW` folder** into your repo's root.
2. **Run the install script** to set up workflows and templates:
   ```bash
   bun .GITCLAW/install/GITCLAW-INSTALLER.ts
   ```
3. **Install dependencies:**
   ```bash
   cd .GITCLAW && bun install
   ```
4. **Add your Anthropic API key** — go to **Settings → Secrets and variables → Actions** and create a secret named `ANTHROPIC_API_KEY`.
5. **Commit and push** the changes.
6. **Open an issue** — the agent starts automatically.

The install script copies the workflow and issue template into the right places. Agent identity/instructions can live entirely in `.GITCLAW/AGENTS.md` (repo-root `AGENTS.md` is optional for project-local overrides). Everything gitclaw needs to run lives inside `.GITCLAW/`.

### What's inside `.GITCLAW/`

```
.GITCLAW/
  install/
    GITCLAW-INSTALLER.ts    # Setup script — installs workflows & templates
    GITCLAW-WORKFLOW-AGENT.yml    # GitHub Actions workflow template
    hatch.md              # Issue template for bootstrapping agent identity
    GITCLAW-AGENTS.md       # Default agent identity file installed as AGENTS.md
  lifecycle/
    GITCLAW-AGENT.ts      # Core agent orchestrator
    GITCLAW-INDICATOR.ts  # Adds 👀 reaction on issue activity
    GITCLAW-ENABLED.ts    # Fail-closed guard — verifies opt-in sentinel exists
  .pi/                    # Agent personality & skills config
  AGENTS.md               # Agent identity file
  install/package.json  # Dependencies
  install/package-lock.json # NPM lockfile
  bun.lock                # Bun lockfile
```

## Security

The workflow only responds to repository **owners, members, and collaborators**. Random users cannot trigger the agent on public repos.

If you plan to use gitclaw for anything private, **make the repo private**. Public repos mean your conversation history is visible to everyone, but get generous GitHub Actions usage.

## Configuration

Edit `.github/workflows/agent.yml` to customize:

- **Model:** Add `--provider` and `--model` flags to the `pi` command.
- **Tools:** Restrict with `--tools read,grep,find,ls` for read-only analysis.
- **Thinking:** Add `--thinking high` for harder tasks.
- **Trigger:** Adjust the `on:` block to filter by labels, assignees, etc.

## Acknowledgments

Built on top of [pi-mono](https://github.com/badlogic/pi-mono) by [Mario Zechner](https://github.com/badlogic).

Thanks to [ymichael](https://github.com/ymichael) for nerdsniping me with the idea of an agent that runs in GitHub Actions.
