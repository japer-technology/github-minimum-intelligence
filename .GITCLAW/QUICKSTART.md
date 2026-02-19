# Quick Start

Get a personal AI agent running in any GitHub repo in under 5 minutes. No servers, no infrastructure — just GitHub Issues and Actions.

## Prerequisites

- A GitHub repository (new or existing)
- [Bun](https://bun.sh) installed locally
- An [Anthropic API key](https://console.anthropic.com/)

## Setup

**1. Add gitclaw to your repo**

Copy the `.GITCLAW` folder into your repository root, then run the install script:

```bash
bun .GITCLAW/install.ts
```

This sets up the GitHub Actions workflow and issue templates.

**2. Install dependencies**

```bash
cd .GITCLAW && bun install
```

**3. Add your API key**

In your GitHub repo, go to **Settings → Secrets and variables → Actions** and create a secret:

- **Name**: `ANTHROPIC_API_KEY`
- **Value**: your Anthropic API key

**4. Commit and push**

```bash
git add -A
git commit -m "Add gitclaw"
git push
```

**5. Open an issue**

Go to your repo's **Issues** tab and create a new issue. Write anything — ask a question, request a file, start a conversation. The agent picks it up automatically.

That's it. The agent replies as a comment on the issue.

## What happens when you open an issue

```
You open an issue
    → GitHub Actions triggers the agent workflow
    → The agent reads your issue, thinks, and responds
    → Its reply appears as a comment (👀 shows while it's working)
    → The conversation is saved to git for future context
```

Comment on the same issue to continue the conversation. The agent picks up where it left off.

## Hatching — give the agent a personality

Use the **🥚 Hatch** issue template (or create an issue with the `hatch` label) to go through a guided conversation where you and the agent figure out its name, personality, and vibe together.

This is optional. The agent works without hatching, but it's more fun with a personality.

## What's in the `.GITCLAW` folder

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Agent identity — name, personality, instructions |
| `lifecycle/main.ts` | Core orchestrator that runs on every issue |
| `.pi/settings.json` | LLM provider, model, and thinking level |
| `.pi/APPEND_SYSTEM.md` | System prompt loaded every session |
| `.pi/skills/` | Modular skill packages |
| `state/` | Session history and issue mappings |

## Common tweaks

**Change the model** — edit `.GITCLAW/.pi/settings.json`:

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "low"
}
```

**Make it read-only** — add `--tools read,grep,find,ls` to the agent args in `lifecycle/main.ts`.

**Filter by label** — edit `.github/workflows/agent.yml` to only trigger on issues with a specific label.

## Next steps

- Read [the full README](README.md) for details on security, configuration, and how storage works
- Explore [the onboarding docs](docs/onboard/README.md) for deep dives into architecture, capabilities, skills, and personality
