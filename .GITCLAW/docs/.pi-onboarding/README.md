# 🦞 GITCLAW .pi Onboarding

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/gitclaw/main/.GITCLAW/.GITCLAW-LOGO.png" alt="GitClaw" width="500">
  </picture>
</p>

This folder documents the `.pi` agent configuration system that powers gitclaw. It covers identity, memory, skills, and behavior configuration — everything that shapes how the agent operates.

## What is .pi?

`.pi` is the agent configuration and personality system that powers gitclaw. It sits at `.GITCLAW/.pi/` and defines:

- **Who** the agent is (identity, personality, vibe)
- **How** it thinks (LLM provider, model, thinking level)
- **What** it knows how to do (skills — modular capability packages)
- **What** it remembers (persistent memory across sessions)
- **How** it behaves (system prompt, boundaries, core truths)

When an issue is opened or commented on, gitclaw spins up a fresh agent session. `.pi` is the first thing it reads. It's the agent's soul on disk.

## Documentation Map

| Document | What it covers |
|----------|---------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | How `.pi` components connect — file structure, data flow, session lifecycle |
| [CAPABILITIES.md](CAPABILITIES.md) | Everything `.pi` can do — conversations, file I/O, memory, self-modification |
| [SKILLS.md](SKILLS.md) | The skill system — built-in skills, creating new ones, progressive disclosure |
| [CONFIGURATION.md](CONFIGURATION.md) | Settings, providers, models, and runtime customization |
| [PERSONALITY.md](PERSONALITY.md) | Identity, hatching, continuity, and the philosophy behind agent personality |

## Quick Start

1. **Read `ARCHITECTURE.md`** to understand how the pieces fit together.
2. **Read `CAPABILITIES.md`** to see what the agent can actually do.
3. **Skim `CONFIGURATION.md`** to know what knobs you can turn.
4. **Read `PERSONALITY.md`** if you want to understand (or customize) the agent's identity.
5. **Dive into `SKILLS.md`** when you're ready to extend what the agent knows.

## The 30-Second Version

`.pi` turns a generic LLM into a persistent, opinionated, skillful agent that lives in your repo. It wakes up fresh every session but remembers everything through files committed to git. It has a name, a personality, and boundaries. It can learn new skills, recall past conversations, and evolve alongside your project.

That's `.pi`. Now go read the docs.
