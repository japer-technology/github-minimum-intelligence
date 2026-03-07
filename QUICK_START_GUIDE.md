# Quick Start: Understanding GitHub Minimum Intelligence

*Start here if you're new to this project and want to understand it fast.*

---

## What Is This? (30 seconds)

A proof that you can embed a full AI coding agent **directly in a GitHub repository** using:
- One folder (`.github-minimum-intelligence/`)
- GitHub Actions (no external servers)
- Git (for memory)
- GitHub Issues (for chat)

**Result:** Your repo becomes an interactive AI workspace. All conversations and code changes are versioned and owned by you.

---

## Why Does It Matter?

| Traditional AI Tool | GitHub Minimum Intelligence |
|---|---|
| Chat on external platform | Chat in GitHub Issues |
| Data on vendor's servers | Data in your repo |
| Copy-paste outputs | Changes committed automatically |
| Session expires | Full git history is your memory |
| Vendor controls behavior | You control everything (it's just code) |

---

## The Core Loop (2 minutes to understand)

1. **You open a GitHub issue** with a question or request
2. **GitHub Actions workflow triggers** automatically
3. **Agent runs:**
   - Reads the issue body
   - Loads prior session history (if this is a follow-up)
   - Calls the LLM to reason about your request
   - Executes tools (read files, run bash, edit code)
   - Commits changes to git
4. **Agent posts a reply** as an issue comment
5. **React with 👍 or 👎** to indicate success/failure
6. **On next comment**, agent resumes the same conversation (full history loaded from git)

**That's it.** No copy-paste, no external dashboards, no session timeouts.

---

## The 5-Minute Setup

```bash
# From your repo root:
curl -fsSL https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/setup.sh | bash

# Then:
# 1. Add your LLM API key as a GitHub secret (e.g., OPENAI_API_KEY)
# 2. git add -A && git commit -m "Add minimum-intelligence" && git push
# 3. Open an issue in your repo — agent replies automatically!
```

That's genuinely all you need.

---

## What Gets Installed

```
.github-minimum-intelligence/
├── .pi/                    # Agent personality ("Spock" by default)
├── docs/                   # 20+ documentation files
├── lifecycle/              # agent.ts (the actual orchestrator)
├── state/                  # Where session memory is stored
├── install/                # Setup automation
├── AGENTS.md               # Agent identity
└── package.json            # Single dependency: @mariozechner/pi-coding-agent

.github/workflows/
└── github-minimum-intelligence-agent.yml  # Triggers on issue/comment
```

**Total footprint:** ~200 KB of configuration + dependencies

---

## The Safety Model (in One Section)

**The Four Laws** (adapted from Asimov):

1. **Do No Harm** — Never generate malicious code or cause harm
2. **Obey the Human** — Execute developer intent faithfully
3. **Preserve Integrity** — Maintain security; audit trails before self-preservation
4. **Protect Humanity** — Keep dev tools open and not monopolized

**DEFCON Levels** (if you need to tighten control):
- **DEFCON 1** — Read-only mode
- **DEFCON 2** — Advisory only
- **DEFCON 3** — Explain changes, wait for approval
- **DEFCON 4** — Full capability with discipline
- **DEFCON 5** — Normal operations (default)

---

## Key Architecture Decisions (5 bullets)

1. **Issues = Conversation** — Each GitHub issue is a persistent conversation thread
2. **Git = Memory** — Session transcripts are committed and full git history is available
3. **Actions = Runtime** — Bun + pi-coding-agent runs in ubuntu-latest (no servers)
4. **LLM + Pi = Thinking + Doing** — LLM reasons, `pi` executes (read/write/bash)
5. **Everything Auditable** — Every interaction is a commit; full `git log` transparency

---

## Documentation Map (Know Where to Look)

| Goal | Read This |
|------|-----------|
| **Quick setup** | `README.md` |
| **Understand philosophy** | `docs/the-repo-is-the-mind.md` |
| **Before using:** risks + ethics | `docs/final-warning.md` |
| **Security audit** | `docs/security-assessment.md` |
| **Capabilities + limits** | `docs/warning-blast-radius.md` |
| **6 foundational questions** | `docs/question-what.md`, `docs/question-who.md`, etc. |
| **LLM data size limits** | `docs/analysis/github-data-size-limits.md` |
| **Full index** | `docs/index.md` |

---

## LLM Providers (Pick One)

All of these work (set as GitHub secret):

- `OPENAI_API_KEY` — GPT-4, GPT-4o
- `ANTHROPIC_API_KEY` — Claude 3.5, Claude 4
- `GEMINI_API_KEY` — Gemini 1.5, 2.0
- `XAI_API_KEY` — Grok 3, Grok 3 Mini
- `MISTRAL_API_KEY` — Mistral Large
- `GROQ_API_KEY` — DeepSeek R1 distills
- `OPENROUTER_API_KEY` — 100+ models via unified API

**Default:** OpenAI (in config), but easily changed.

---

## Real Example: What Happens When You Use It

**You post an issue:**
```
@spock, can you refactor the auth module to use async/await?
```

**Agent does:**
1. Loads the issue body
2. Loads prior session history (if this is issue #5 and you've chatted before)
3. Calls LLM: "User wants refactoring; here's the codebase context"
4. LLM reasons: "I'll use these tools: read the auth file, edit it, test it"
5. Agent executes each step:
   - Reads `src/auth.ts`
   - Edits it with refactored code
   - Runs tests via bash
6. Commits changes: `git commit -m "Refactor auth module: async/await"`
7. Posts reply in the issue with details
8. Adds 👍 reaction

**All of this is permanent:**
- Conversation is in the issue thread
- Changes are in `git log`
- Session transcript is in `.github-minimum-intelligence/state/sessions/`
- You can review, revert, or blame anything

---

## Common Questions

**Q: Can I trust AI-generated code?**  
A: No more than any untrusted code. Always review. The advantage here is that review is easy—it's all in git with full diffs.

**Q: What if the agent breaks something?**  
A: `git revert`. Anything can be undone because everything is committed.

**Q: Can I customize the agent's personality?**  
A: Yes. The agent is defined in `.github-minimum-intelligence/.pi/` and `AGENTS.md`. Modify and commit to change behavior.

**Q: Is my code secure?**  
A: Your repo is as secure as your GitHub repo. The agent runs with the same permissions as any Actions workflow. See `docs/security-assessment.md` for details.

**Q: How much does it cost?**  
A: Just the LLM API cost (OpenAI, Anthropic, etc.). No platform fees. GitHub Actions compute is free/included.

**Q: Can I use this in production?**  
A: Yes, but review every agent-generated change before merging. Same as any automation.

---

## Next Steps

1. **Read:** `README.md` (601 lines, but structured for skimming)
2. **Read:** `docs/final-warning.md` (critical pre-use info)
3. **Skim:** `docs/the-repo-is-the-mind.md` (understand the philosophy)
4. **Install:** Run `setup.sh`
5. **Test:** Open an issue, see the agent respond
6. **Explore:** Browse `.github-minimum-intelligence/docs/` for deep dives

---

## File Structure Cheat Sheet

```
Root/
├── README.md               ← Start here (main docs)
├── setup.sh                ← One-command install
├── EXPLORATION.md          ← Full repo analysis (you're reading this!)
└── .github-minimum-intelligence/
    ├── .pi/                ← Agent personality config
    ├── docs/               ← 20+ docs (start with index.md)
    ├── lifecycle/          ← agent.ts (entry point)
    ├── state/              ← Session memory (git-tracked)
    └── install/            ← Setup automation

.github/workflows/
└── github-minimum-intelligence-agent.yml  ← Workflow definition
```

---

## The Big Picture

This repo demonstrates that **you don't need external platforms** to have a capable AI agent. With GitHub's primitives (Issues, Actions, Git) and an LLM API key, you get:

- ✅ Full AI capability in your codebase
- ✅ All memory in version control
- ✅ All interactions auditable and reversible
- ✅ Zero vendor lock-in
- ✅ Complete transparency
- ✅ No data leaving your control

That's the "minimum intelligence" proof: minimal infrastructure, maximum agency, complete ownership.

---

**Ready?** → Install with `setup.sh` and open an issue in your repo.

**Want deeper understanding?** → Read `docs/the-repo-is-the-mind.md` (120 lines, very worth it).

**Concerned about security?** → Read `docs/final-warning.md` and `docs/security-assessment.md`.
