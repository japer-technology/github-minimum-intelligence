# .minimum-intelligence 🦞 An AI Agent As A Drop In

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/minimum-intelligence/main/.minimum-intelligence/MINIMUM-INTELLIGENCE-LOGO.png" alt="Minimum Intelligence" width="500">
  </picture>
</p>

### [🦞Quick Start](MINIMUM-INTELLIGENCE-QUICKSTART.md) · [🦞Internals](docs/MINIMUM-INTELLIGENCE-Internal-Mechanics.md) · [🦞Possibilities](docs/MINIMUM-INTELLIGENCE-Possibilities.md) · [🦞Road Map](docs/MINIMUM-INTELLIGENCE-Roadmap.md) · [🦞The Idea](docs/MINIMUM-INTELLIGENCE-The-Idea.md)

A personal AI assistant that runs entirely through GitHub Issues and Actions. Drop a single `.minimum-intelligence` folder into any repo and you have a fully functional AI agent — no servers, no external services, no extra infrastructure.

> **New here?** Check the [Quick Start](MINIMUM-INTELLIGENCE-QUICKSTART.md) to get running in under 5 minutes.

Powered by the [pi coding agent](https://github.com/badlogic/pi-mono). Every issue becomes a chat thread with an AI agent. Conversation history is committed to git, giving the agent long-term memory across sessions. It can search prior context, edit or summarize past conversations, and all changes are versioned.

Since the agent can read and write files, you can build an evolving software project that updates itself as you open issues. Try asking it to set up a GitHub Pages site, then iterate on it issue by issue.

### Why Minimum Intelligence

| Capability | Why it matters |
|---|---|
| **Single folder, any repo** | Copy `.minimum-intelligence/` in and run the install script. Nothing to host or maintain. |
| **Zero infrastructure** | Runs on GitHub Actions with your repo as the only backend. |
| **Persistent memory** | Conversations are committed to git — the agent remembers everything across sessions. |
| **Full auditability** | Every interaction is versioned; review or roll back any change the agent made. |
| **Multi-provider LLM support** | Works with Anthropic, OpenAI, Google Gemini, xAI, DeepSeek, Mistral, Groq, and any OpenRouter model. |
| **Modular skill system** | Agent capabilities are self-contained Markdown files — user-extensible and composable. |
| **Personality hatching** | Give the agent a name, personality, and vibe through a guided conversation. |
| **Fail-closed security** | Agent does nothing unless explicitly opted in via a sentinel file. |

## How It Works

1. **Create an issue** → the agent processes your request and replies as a comment.
2. **Comment on the issue** → the agent resumes the same session with full prior context.
3. **Everything is committed** → sessions and changes are pushed to the repo after every turn.

The agent reacts with 👀 while working and removes it when done.

### Repo as Storage

All state lives in the repo:

```
.minimum-intelligence/state/
  issues/
    1.json          # maps issue #1 → its session file
  sessions/
    2026-02-04T..._abc123.jsonl    # full conversation for issue #1
```

Each issue number is a stable conversation key — `issue #N` → `state/issues/N.json` → `state/sessions/<session>.jsonl`. When you comment on an issue weeks later, the agent loads that linked session and continues. No database, no session cookies — just git.

## Setup — Add to Any Repo

minimum-intelligence lives entirely inside a `.minimum-intelligence` folder that you drop into your repository.

1. **Copy the `.minimum-intelligence` folder** into your repo's root.
2. **Run the install script** to set up workflows and templates:
   ```bash
   bun .minimum-intelligence/install/MINIMUM-INTELLIGENCE-INSTALLER.ts
   ```
3. **Install dependencies:**
   ```bash
   cd .minimum-intelligence && bun install
   ```
4. **Add your LLM API key** — go to **Settings → Secrets and variables → Actions** and create a secret for your chosen provider (e.g. `ANTHROPIC_API_KEY`). See [Supported Providers](#supported-providers) below.
5. **Commit and push** the changes.
6. **Open an issue** — the agent starts automatically.

> **Automated install:** You can also copy `MINIMUM-INTELLIGENCE-INSTALLER.yml` to `.github/workflows/` and trigger the bootstrap workflow from the Actions tab. See [install/README.md](install/README.md) for details.

The install script copies the workflow and issue template into the right places. Agent identity and instructions live in `.minimum-intelligence/AGENTS.md`. Everything minimum-intelligence needs to run lives inside `.minimum-intelligence/`.

### Hatching — Give the Agent a Personality

Use the **🥚 Hatch** issue template (or create an issue with the `hatch` label) to go through a guided conversation where you and the agent figure out its name, personality, and vibe together. This is optional — the agent works without hatching — but it's more fun with a personality.

### What's Inside `.minimum-intelligence/`

```
.minimum-intelligence/
  .pi/                              # Agent personality & skills config
    settings.json                   # LLM provider, model, and thinking level
    APPEND_SYSTEM.md                # System prompt loaded every session
    BOOTSTRAP.md                    # First-run identity prompt
    skills/                         # Modular skill packages
  install/
    MINIMUM-INTELLIGENCE-INSTALLER.ts            # Setup script — installs workflows & templates
    MINIMUM-INTELLIGENCE-WORKFLOW-AGENT.yml      # GitHub Actions workflow template
    MINIMUM-INTELLIGENCE-TEMPLATE-HATCH.md       # Issue template for personality hatching
    MINIMUM-INTELLIGENCE-AGENTS.md               # Default agent identity file
    package.json                    # Installer dependencies
  lifecycle/
    MINIMUM-INTELLIGENCE-AGENT.ts                # Core agent orchestrator
    MINIMUM-INTELLIGENCE-INDICATOR.ts            # Adds/removes 👀 reaction on issue activity
    MINIMUM-INTELLIGENCE-ENABLED.ts              # Fail-closed guard — verifies opt-in sentinel
  docs/                             # Architecture, roadmap, and design docs
  tests/                            # Validation tests
  state/                            # Session history and issue mappings (git-tracked)
  AGENTS.md                         # Agent identity file
  MINIMUM-INTELLIGENCE-ENABLED.md                # Sentinel file — delete to disable the agent
  MINIMUM-INTELLIGENCE-QUICKSTART.md             # Quick start guide
  LICENSE.md                        # MIT license
  package.json                      # Runtime dependencies
```

## Supported Providers

Set `defaultProvider` and `defaultModel` in `.minimum-intelligence/.pi/settings.json` and add the matching API key as a repository secret:

| Provider | `defaultProvider` | Example model | API key secret |
|---|---|---|---|
| Anthropic | `anthropic` | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai` | `gpt-5.3-codex`, `gpt-5.3-codex-spark` | `OPENAI_API_KEY` |
| Google Gemini | `google` | `gemini-2.5-pro`, `gemini-2.5-flash` | `GEMINI_API_KEY` |
| xAI (Grok) | `xai` | `grok-3`, `grok-3-mini` | `XAI_API_KEY` |
| DeepSeek | `openrouter` | `deepseek/deepseek-r1` | `OPENROUTER_API_KEY` |
| Mistral | `mistral` | `mistral-large-latest` | `MISTRAL_API_KEY` |
| Groq | `groq` | `deepseek-r1-distill-llama-70b` | `GROQ_API_KEY` |
| OpenRouter | `openrouter` | any model on [openrouter.ai](https://openrouter.ai/) | `OPENROUTER_API_KEY` |

> **Tip:** See the [Quick Start](MINIMUM-INTELLIGENCE-QUICKSTART.md#common-tweaks) for copy-paste `settings.json` examples for each provider.

## Security

The workflow only responds to repository **owners, members, and collaborators**. Random users cannot trigger the agent on public repos.

The agent uses a **fail-closed guard**: every workflow run checks for the sentinel file `MINIMUM-INTELLIGENCE-ENABLED.md`. If it's missing, the workflow exits immediately. Delete or rename this file to disable the agent without removing any code.

If you plan to use minimum-intelligence for anything private, **make the repo private**. Public repos mean your conversation history is visible to everyone, but get generous GitHub Actions usage.

## Configuration

**Change the model** — edit `.minimum-intelligence/.pi/settings.json`:

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "low"
}
```

**Make it read-only** — add `--tools read,grep,find,ls` to the agent args in `lifecycle/MINIMUM-INTELLIGENCE-AGENT.ts`.

**Filter by label** — edit `.github/workflows/MINIMUM-INTELLIGENCE-WORKFLOW-AGENT.yml` to only trigger on issues with a specific label.

**Adjust thinking level** — set `defaultThinkingLevel` to `"low"`, `"medium"`, or `"high"` in `settings.json` for different task complexities.

## Documentation

| Document | Description |
|---|---|
| [Quick Start](MINIMUM-INTELLIGENCE-QUICKSTART.md) | Get running in under 5 minutes — setup, providers, and common tweaks |
| [The Idea](docs/MINIMUM-INTELLIGENCE-The-Idea.md) | The philosophical vision — why a repo-native AI agent matters |
| [Internal Mechanics](docs/MINIMUM-INTELLIGENCE-Internal-Mechanics.md) | Architecture, workflow steps, session management, and data model |
| [Possibilities](docs/MINIMUM-INTELLIGENCE-Possibilities.md) | Current and future use cases, skill ideas, and design space |
| [GitHub Possibilities](docs/MINIMUM-INTELLIGENCE-The-GitHub-Possibilities.md) | Analysis of every GitHub platform feature and what it means for Minimum Intelligence |
| [Roadmap](docs/MINIMUM-INTELLIGENCE-Roadmap.md) | Phased plan from issue bot to full-platform agent |
| [Cloud vs Local](docs/MINIMUM-INTELLIGENCE-Cloud-vs-Local.md) | Cloud (GitHub Actions) vs Local (pi CLI) — UX, capabilities, and trade-offs |
| [Pi Agent Docs](docs/MINIMUM-INTELLIGENCE-Pi/MINIMUM-INTELLIGENCE-Pi-README.md) | Deep dive into the `.pi` agent configuration system |
| [Install Guide](install/README.md) | Detailed install process and installer workflow reference |

## Acknowledgments

Built on top of [pi-mono](https://github.com/badlogic/pi-mono) by [Mario Zechner](https://github.com/badlogic).

Thanks to [ymichael](https://github.com/ymichael) for nerdsniping me with the idea of an agent that runs in GitHub Actions.
