# Repository Exploration Index

This document indexes all exploration materials created to understand the GitHub Minimum Intelligence project.

---

## Quick Navigation

**New to this project?** Start here:
1. [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) — 5-minute overview
2. [EXPLORATION_SUMMARY.md](EXPLORATION_SUMMARY.md) — Executive summary
3. [README.md](README.md) — Official project documentation

**Want comprehensive details?**
- [EXPLORATION.md](EXPLORATION.md) — Complete 22 KB analysis of all aspects

**Original project documentation:**
- [.github-minimum-intelligence/docs/index.md](.github-minimum-intelligence/docs/index.md) — Master documentation index
- [.github-minimum-intelligence/docs/the-repo-is-the-mind.md](.github-minimum-intelligence/docs/the-repo-is-the-mind.md) — Architectural thesis

---

## What Each Document Covers

### QUICK_START_GUIDE.md
**Length:** ~7 KB | **Audience:** Newcomers
- What is this? (30-second explanation)
- Why it matters (comparison table)
- The core loop (2 minutes to understand)
- 5-minute setup instructions
- Safety model overview
- Key architecture decisions
- Documentation map
- LLM provider options
- Real example walkthrough
- Common Q&A
- Next steps

**Best for:** Getting oriented fast and understanding the value proposition

### EXPLORATION_SUMMARY.md
**Length:** 9.7 KB | **Audience:** Technical leads, architects
- Core mission & philosophy (1-page summary)
- Repository structure at a glance
- Documentation overview (20+ files, 2,728 lines)
- The 6 foundational questions mapped
- Writing style guide
- Technical infrastructure (dependencies, providers, workflow)
- Safety & governance framework
- Security posture
- How to write analysis documents for this project
- Key files to know

**Best for:** Understanding project scope and technical decisions

### EXPLORATION.md
**Length:** 22 KB | **Audience:** Deep understanding seekers, contributors
- **Section 1:** Overall purpose and goals (philosophy, Four Laws, proof statement)
- **Section 2:** Complete directory structure of `.github-minimum-intelligence/`
- **Section 3:** Existing analysis documents (detailed breakdown)
- **Section 4:** All documentation in `.github-minimum-intelligence/docs/` (index, security docs, DEFCON levels)
- **Section 5:** Build/lint/test infrastructure (GitHub Actions, setup, no traditional CI)
- **Section 6:** Overall repo structure & key files (README, agent config, AGENTS.md, PACKAGES.md)
- **Section 7:** Writing style & documentation patterns (format, tone, depth)
- **Section 8:** Key technical architecture points (execution loop, session state, authorization)
- **Section 9:** Dependencies & LLM providers (7 supported, infrastructure needs)
- **Section 10:** Critical safety & governance framework (Four Laws, DEFCON levels, security)
- **Section 11:** How to contribute analysis documents (guidelines, topics)

**Best for:** Complete understanding before contributing; reference document

---

## Document Structure & Contents

### Existing Project Documentation

**Location:** `.github-minimum-intelligence/docs/`

| Type | Count | Lines | Purpose |
|------|-------|-------|---------|
| Analysis | 1 | 217 | `github-data-size-limits.md` — LLM context limits for GitHub data |
| Questions | 6 | ~625 | "What/Who/When/Where/How/How Much?" — Philosophical foundation |
| Security | 5 | 1,332 | Assessments, warnings, incident response, Four Laws |
| Architecture | 1 | 120 | `the-repo-is-the-mind.md` — Core thesis |
| **Total** | **20+** | **2,728** | Complete governance & technical framework |

### Analysis Document Format (from existing example)

The single existing analysis document (`github-data-size-limits.md`, 217 lines) demonstrates the expected format:

```
1. Opening context (2–3 sentences)
2. Numbered sections (1–7) with subsections
3. Tables for organized data
4. Practical guidance mixed with theory
5. Failure modes / edge cases
6. Mitigation / best practices
7. Quick reference summary
```

**Tone:** Technical but accessible, evidence-based, cautious about limitations, practical

---

## Project at a Glance

### The Core Value
Repository-native AI agent that proves:
- ✅ Full agency in a folder (no external servers)
- ✅ Persistent memory via Git (no database)
- ✅ All interactions auditable and reversible
- ✅ Zero vendor lock-in (npm package)
- ✅ Explicit governance (Four Laws)
- ✅ Multi-provider LLM support (7 options)

### The Execution Model
```
User posts issue
  → GitHub Actions triggered
    → Bun + pi-coding-agent runs
      → LLM reasons, generates tool calls
        → Agent executes (read/write/bash)
          → Changes committed to git
            → Reply posted to issue
              → 👍 or 👎 reaction added
```

### Key Files
- **README.md** — 601 lines of main documentation
- **setup.sh** — One-command installer
- **.github/workflows/github-minimum-intelligence-agent.yml** — Workflow trigger
- **.github-minimum-intelligence/lifecycle/agent.ts** — Orchestrator entry point
- **.github-minimum-intelligence/.pi/** — Agent personality config

### Supported LLM Providers
OpenAI, Anthropic, Google Gemini, xAI, Mistral, Groq, OpenRouter

---

## Recommended Reading Path

### Path A: Quick Understanding (15 minutes)
1. [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)
2. [README.md](README.md) — skim first 100 lines
3. [.github-minimum-intelligence/docs/the-repo-is-the-mind.md](.github-minimum-intelligence/docs/the-repo-is-the-mind.md)

### Path B: Technical Deep Dive (45 minutes)
1. [EXPLORATION_SUMMARY.md](EXPLORATION_SUMMARY.md)
2. [EXPLORATION.md](EXPLORATION.md) — sections 1–6
3. [.github-minimum-intelligence/docs/security-assessment.md](.github-minimum-intelligence/docs/security-assessment.md) — skim
4. [.github-minimum-intelligence/docs/analysis/github-data-size-limits.md](.github-minimum-intelligence/docs/analysis/github-data-size-limits.md)

### Path C: Complete Understanding (2+ hours)
1. All of Path B
2. [EXPLORATION.md](EXPLORATION.md) — full read
3. All 6 foundational question documents
4. [.github-minimum-intelligence/docs/final-warning.md](.github-minimum-intelligence/docs/final-warning.md)
5. [.github-minimum-intelligence/docs/the-four-laws-of-ai.md](.github-minimum-intelligence/docs/the-four-laws-of-ai.md)

### Path D: Contribution Ready (3+ hours)
1. All of Path C
2. [.github-minimum-intelligence/AGENTS.md](.github-minimum-intelligence/AGENTS.md)
3. [.github-minimum-intelligence/PACKAGES.md](.github-minimum-intelligence/PACKAGES.md)
4. [CONTRIBUTING.md](CONTRIBUTING.md)
5. Study the existing analysis document structure
6. Review recommended future analysis topics in [EXPLORATION.md](EXPLORATION.md#11-summary-how-to-contribute-analysis-documents)

---

## Key Concepts Explained Concisely

### Data Sovereignty
Every prompt you write and every response the agent produces is committed to your repository. Nothing lives on external platforms.

### The Four Laws
Explicit constraints governing AI behavior:
1. Do No Harm (never cause harm)
2. Obey the Human (faithfully execute intent)
3. Preserve Integrity (maintain security)
4. Protect Humanity (keep dev tools open)

### DEFCON Levels
5 operational readiness postures for tightening/loosening agent authority:
- **DEFCON 1** — Read-only mode (maximum security)
- **DEFCON 5** — Normal operations (default)

### Session Continuity
- Issue #N is a persistent conversation thread
- Each comment loads prior session history from git
- Agent remembers everything via `.github-minimum-intelligence/state/`

### Repository as Memory
- Session transcripts are committed as JSONL files
- Full git history is searchable and auditable
- State management is transparent (git operations)

---

## Creating New Analysis Documents

**Location:** `.github-minimum-intelligence/docs/analysis/`

**Format Guidelines:**
```
1. Opening context (2–3 sentences)
2. Numbered main sections (typically 1–7)
3. Subsections with specific data
4. Tables for reference material
5. Practical examples or failure modes
6. Mitigation / best practice section
7. Quick reference or summary
```

**Length:** ~200–350 lines typical
**Tone:** Technical but accessible, evidence-based, practical, cautious

**Candidate Topics:**
- LLM token usage patterns by task type
- Repository scaling limits (issue count, repo size)
- Cost analysis (models, providers, usage patterns)
- Performance benchmarks across LLM providers
- Agent reasoning patterns and failure recovery
- CI/CD integration patterns
- Multi-agent orchestration
- Security hardening checklist

---

## Quick Reference: What to Read When

| Goal | Document | Time |
|------|----------|------|
| Quick intro | QUICK_START_GUIDE.md | 5 min |
| Understand core concept | the-repo-is-the-mind.md | 10 min |
| Before using | final-warning.md | 15 min |
| Setup & install | README.md + setup.sh | 10 min |
| Security review | security-assessment.md | 30 min |
| Architecture details | EXPLORATION.md sections 1–8 | 30 min |
| Contributing | EXPLORATION.md section 11 + CONTRIBUTING.md | 20 min |
| Deep context limits | analysis/github-data-size-limits.md | 15 min |
| Writing your own analysis | EXPLORATION.md section 7 + 11 | 20 min |

---

## Project Statistics

| Metric | Value |
|--------|-------|
| Total documentation | 20+ files, 2,728 lines |
| Main README | 601 lines |
| GitHub Actions workflow | 77 lines |
| Existing analysis docs | 1 document (217 lines) |
| Security documentation | 1,332 lines |
| LLM providers supported | 7 |
| Setup time | ~5 minutes |
| Installation footprint | ~200 KB |

---

## Exploration Artifacts Created

This exploration produced 3 new documents:

1. **QUICK_START_GUIDE.md** — Introduction & 5-minute overview
2. **EXPLORATION_SUMMARY.md** — Executive summary (10 sections)
3. **EXPLORATION.md** — Complete analysis (11 sections)
4. **EXPLORATION_INDEX.md** ← You are here

---

## Next Steps

1. **Choose your path** (Quick, Technical, Complete, or Contribution-Ready) above
2. **Read the recommended documents** for your path
3. **Install and experiment** (run `setup.sh`, open an issue)
4. **Explore `.github-minimum-intelligence/docs/`** for deeper dives
5. **Contribute** by writing analysis documents or improving the system

---

**Generated:** March 7, 2026  
**Repository:** github-minimum-intelligence (japer-technology)  
**Status:** Complete exploration, ready for contribution
