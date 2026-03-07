# Executive Summary: GitHub Minimum Intelligence Repository

## What You're Looking At

**GitHub Minimum Intelligence (GMI)** is a sophisticated repository-native AI framework that proves an AI coding agent can be fully embedded in a GitHub repository using only:
- A single folder (`.github-minimum-intelligence/`)
- GitHub Actions workflow
- Git for versioned memory
- GitHub Issues for conversation

**Key Innovation:** The repository itself becomes the AI's primary system — not a secondary integration point. Code, conversation history, and AI reasoning all live in Git.

---

## 1. Core Mission & Philosophy

### The Core Claim
> "A folder, a workflow, and an LLM API key can create an interactive AI collaborator as natural as talking to a teammate."

### Why It Matters
- **Data Sovereignty:** Everything lives in your repo, nothing on external platforms
- **Auditability:** Every AI interaction is a Git commit with full diff
- **Zero Vendor Lock-in:** It's an npm package; pin it, fork it, or replace it
- **Governed by Four Laws:** Explicit constraints on AI behavior (adapted from Asimov)

---

## 2. Repository Structure at a Glance

### Main Directories
| Directory | Purpose | Key File(s) |
|-----------|---------|------------|
| `.github-minimum-intelligence/` | Core agent framework | Root of everything |
| `├── .pi/` | Agent personality & LLM config | `BOOTSTRAP.md`, `settings.json`, `skills/` |
| `├── docs/` | **20+ documentation files** | See Section 3 |
| `├── lifecycle/` | Agent orchestrator | `agent.ts` (entry point), `indicator.ts` |
| `├── state/` | Persistent session memory | `issues/`, `sessions/` (git-tracked) |
| `├── install/` | Setup automation | `MINIMUM-INTELLIGENCE-INSTALLER.ts` |
| `.github/workflows/` | GitHub Actions workflow | `github-minimum-intelligence-agent.yml` |
| `README.md` | Main docs (601 lines) | Quick start, setup, configuration |

### How It Works (Simple Version)
```
User opens issue → GitHub Actions triggered → Bun + pi-coding-agent runs
→ LLM reasons & generates tool calls → agent.ts executes (read/write/bash)
→ Changes committed to git → Reply posted to issue
→ 👍 reaction added (or 👎 if failed)
```

---

## 3. Documentation (20+ Files, 2,728 Lines Total)

### Analysis Documents (`.github-minimum-intelligence/docs/analysis/`)
**Currently:** 1 document
- **`github-data-size-limits.md`** (217 lines)
  - LLM context window limits for GitHub data
  - Practical thresholds for different models/data types
  - Failure modes and mitigation strategies
  - Tables, real-world data, quick reference

**Format Pattern for Analysis Docs:**
- Numbered sections (1–7 typically)
- Heavy use of tables for reference data
- Mix of theory + practical guidance
- Evidence-based, ~200–350 lines typical

### Philosophical Foundation: 6 Questions
| Question | File | Lines | What It Explores |
|----------|------|-------|------------------|
| **What?** | `question-what.md` | 152 | What is GMI exactly? (Repository-native agency) |
| **Who?** | `question-who.md` | 113 | Identity layers: who speaks/acts/remembers/decides? |
| **When?** | `question-when.md` | 137 | How git commits replace ephemeral sessions |
| **Where?** | `question-where.md` | 114 | Where intelligence lives: runtime, memory, identity |
| **How?** | `question-how.md` | 118 | Issues→Actions→LLM→bash, Git as memory |
| **How Much?** | `question-how-much.md` | 158 | Ceiling is stewardship, not token count |

### Safety & Security Docs
| Doc | Lines | Focus |
|-----|-------|-------|
| `final-warning.md` | 202 | Critical pre-use reading: capabilities, risks, ethics |
| `security-assessment.md` | 667 | Comprehensive audit: threats, vulnerabilities, risk register |
| `warning-blast-radius.md` | 344 | What agent can actually access/do (transparency) |
| `incident-response.md` | 319 | Step-by-step incident procedures |
| `the-four-laws-of-ai.md` | 68 | Four Laws governing all AI behavior |

### Architecture & Operations
| Doc | Lines | Focus |
|-----|-------|-------|
| `the-repo-is-the-mind.md` | 120 | Why repo is the primary system, AI is the tool |
| `index.md` | 102 | Master documentation index |
| DEFCON levels | ~19 each | Operational readiness states (1=lockdown, 5=normal) |

---

## 4. Writing Style Guide (from existing analysis doc)

### What to Emulate
```
✓ Professional + accessible (not too jargon-heavy)
✓ Evidence-based with real data/metrics
✓ Heavy use of tables for reference material
✓ Numbered sections (1–7) with clear hierarchy
✓ Practical guidance mixed with theory
✓ Callouts with > blockquotes for emphasis
✓ Cross-references to related docs
✓ Summary/quick-reference section
✓ ~200–350 lines typical length
✓ Task-specific guidance (e.g., by model, data type)
```

### Content Examples from Existing Analysis
- **Context Window Baselines:** Table of models vs. usable tokens
- **GitHub Data Types:** Realistic size estimates (issues, PRs, CI logs)
- **Degradation Thresholds:** "Lost in the Middle" effect with percentage-based guidance
- **Failure Modes:** "Hallucinated issue numbers," "temporal confusion," etc.
- **Mitigations:** Chunked processing, pre-filtering, map-reduce pattern
- **Quick Reference:** Max batch sizes for reliable analysis

---

## 5. Technical Infrastructure

### Single Main Dependency
- **`@mariozechner/pi-coding-agent`** v0.52.5 (from badlogic/pi-mono)
  - Provides: tool execution, LLM interaction loop, session management

### Supported LLM Providers (7 options)
OpenAI, Anthropic, Google Gemini, xAI, Mistral, Groq, OpenRouter

### GitHub Actions Workflow
- **Trigger:** Issues (opened) + issue comments (created)
- **Steps:** Authorize → Checkout → Setup Bun → Install → Run agent → React
- **Permissions:** `contents: write`, `issues: write`, `actions: write`

### Runtime Stack
- Bun (JavaScript runtime)
- Node.js (transitive)
- GitHub API (gh CLI)
- Git

### No Traditional CI/CD
- No test suite (config/orchestration, not library)
- No linter configuration
- Code review = primary quality gate
- Manual validation for lifecycle scripts

---

## 6. Safety & Governance Framework

### The Four Laws (Explicit Constraints)
All AI behavior is bounded by these laws (can't be overridden):

1. **First Law (Do No Harm)**
   - Never cause harm to humans/communities
   - Reject malicious code, supply chain attacks, weapons/surveillance tools

2. **Second Law (Obey the Human)**
   - Faithfully execute developer intent
   - Transparent about capabilities/limitations
   - Respect user autonomy; don't substitute goals

3. **Third Law (Preserve Integrity)**
   - Maintain security and trustworthiness
   - Audit trails before self-preservation
   - Log all consequential actions

4. **Zeroth Law (Protect Humanity)**
   - Prevent monopolistic control over dev tools
   - Keep open source open
   - Support interoperability

### DEFCON Readiness Levels
5 operational postures for tightening/loosening agent authority:
- **DEFCON 1:** Read-only, no execution
- **DEFCON 2:** Advisory only
- **DEFCON 3:** Explain changes, await approval
- **DEFCON 4:** Full capability with discipline
- **DEFCON 5:** Standard operations (all capabilities)

---

## 7. Security Posture (from 667-line assessment)

### Key Findings (Summary)
- **Critical:** Org-wide repo write access, unrestricted network egress, unscoped API keys
- **High:** Docker with `--privileged`, self-replication via workflow injection
- **Note:** Many findings are standard GitHub Actions properties; project documents them for transparency

### Mitigations Recommended
- Branch protection on default branch
- Scoped API tokens (not org-wide)
- Code review gate for agent commits
- CODEOWNERS file
- Network segmentation if handling sensitive data

---

## 8. How to Write Analysis Documents for This Project

### Structure to Follow
1. **Opening** (2–3 sentences of context)
2. **Numbered Main Sections** (1–7 recommended)
3. **Subsections** with data/details
4. **Failure Modes** or edge cases
5. **Mitigation/Best Practices**
6. **Quick Reference** or summary table
7. **Cross-references** to related docs

### Recommended Analysis Topics for Future Docs
- LLM token usage patterns (by task type)
- Repository scaling limits (issue count, repo size effects)
- Cost analysis (models, providers, usage patterns)
- Agent reasoning patterns and failure recovery
- CI/CD integration patterns
- Multi-agent orchestration
- Skill development and composition
- Performance benchmarks across LLM providers
- Branch protection and code review workflows

---

## 9. Key Files to Know

| File | Purpose | Size |
|------|---------|------|
| `README.md` | Main documentation | 601 lines |
| `.github/workflows/github-minimum-intelligence-agent.yml` | Workflow trigger | 77 lines |
| `.github-minimum-intelligence/lifecycle/agent.ts` | Agent entry point | Extensive |
| `.github-minimum-intelligence/.pi/BOOTSTRAP.md` | Agent initialization | Config file |
| `.github-minimum-intelligence/docs/index.md` | Doc master index | 102 lines |
| `setup.sh` | One-command installer | Interactive script |
| `AGENTS.md` | Active agent identity ("Spock") | 56 lines |
| `PACKAGES.md` | Dependencies documented | 68 lines |

---

## 10. At a Glance: The Proof

This project proves:
- ✅ Full AI agency in a folder (no external servers)
- ✅ Persistent memory via Git (no database)
- ✅ Conversation history as version-controlled state
- ✅ All interactions auditable and reversible
- ✅ Zero vendor lock-in (npm package model)
- ✅ Explicit governance (Four Laws, DEFCON levels)
- ✅ Multi-provider LLM support (7+ options)
- ✅ Enterprise-grade security analysis (667-line assessment)

The repository itself documents its risks, governance, and security model comprehensively. It's a reference implementation of how to embed AI in infrastructure responsibly.
