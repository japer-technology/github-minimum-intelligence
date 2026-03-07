# GitHub Minimum Intelligence — Complete Repository Exploration

**Generated:** March 7, 2026
**Repository:** `github-minimum-intelligence` (japer-technology)
**Status:** Active, production-ready

---

## 1. Overall Purpose and Goals

### Mission Statement
"GitHub Minimum Intelligence" is a **repository-native AI framework** that embeds an AI coding agent directly into a GitHub repository using only:
- A single folder (`.github-minimum-intelligence/`)
- GitHub Actions for execution
- Git for persistent versioned memory
- GitHub Issues as the conversational interface

**Core Value Proposition:**
- **Data Sovereignty**: Every prompt, response, and code change is committed to your repository — nothing lives on external platforms
- **Auditability**: All AI interactions are versioned and reviewable, with full git history and diffs
- **Zero Infrastructure**: No external servers, databases, or hosted services needed beyond GitHub itself
- **Modularity**: Works as a single npm package (`@mariozechner/pi-coding-agent`) you drop into any repo

### Key Philosophical Goals (The Four Laws of AI)
1. **First Law (Do No Harm)**: Never generate malicious code, endanger safety/privacy, or propagate vulnerabilities
2. **Second Law (Obey the Human)**: Faithfully execute developer intent, be transparent about capabilities/limitations, respect user autonomy
3. **Third Law (Preserve Integrity)**: Maintain platform security, resist corruption, log all consequential actions, audit trails before self-preservation
4. **Zeroth Law (Protect Humanity)**: Don't enable monopolistic control over dev tools; keep open source open; support interoperability

### Proof Statement (from README)
> "This proves that a folder, a workflow, and an LLM API key can create an interactive AI collaborator as natural as talking to a teammate."

The repository demonstrates that **full AI agency can be achieved with minimal infrastructure** by leveraging existing GitHub primitives.

---

## 2. Directory Structure of `.github-minimum-intelligence/`

```
.github-minimum-intelligence/                          # Root installation directory
├── .pi/                                               # Agent personality, skills, LLM config
│   ├── APPEND_SYSTEM.md                               # System prompt appended to agent context
│   ├── BOOTSTRAP.md                                   # Initialization/hatching instructions
│   ├── README.md                                      # .pi documentation
│   ├── settings.json                                  # LLM model + reasoning config
│   └── skills/                                        # Composable agent capabilities (markdown files)
│
├── docs/                                              # Documentation (see Section 3)
│   ├── index.md                                       # Master documentation index
│   ├── analysis/                                      # Analysis documents (see Section 3)
│   │   └── github-data-size-limits.md                 # Existing: LLM context limits for GitHub data
│   ├── question-*.md                                  # 6 foundational questions (what/who/when/where/how/how-much)
│   ├── the-repo-is-the-mind.md                        # Architectural thesis
│   ├── the-four-laws-of-ai.md                         # Governance framework
│   ├── final-warning.md                               # Before You Begin (risks/usage info)
│   ├── security-assessment.md                         # Comprehensive security audit
│   ├── warning-blast-radius.md                        # Capabilities & access scope analysis
│   ├── incident-response.md                           # Security incident procedures
│   └── transition-to-defcon-*.md                      # Operational readiness levels (DEFCON 1–5)
│
├── lifecycle/                                         # Agent orchestration & runtime hooks
│   ├── README.md                                      # Lifecycle documentation
│   ├── agent.ts                                       # Core agent orchestrator (main entry point)
│   └── indicator.ts                                   # Pre-install: adds 🚀 reaction indicator
│
├── state/                                             # Git-tracked session state
│   ├── user.md                                        # User/agent identity placeholder
│   ├── issues/                                        # Issue → session mappings (JSON)
│   │   └── <issue_number>.json                        # Maps issue #N to session file path
│   └── sessions/                                      # Conversation transcripts (JSONL)
│       └── <timestamp>_<id>.jsonl                     # Full conversation history for an issue
│
├── install/                                           # Setup automation
│   ├── MINIMUM-INTELLIGENCE-INSTALLER.ts             # Main installer script
│   ├── MINIMUM-INTELLIGENCE-AGENTS.md                 # Agent personality template
│   └── package.json                                   # Installer dependencies
│
├── lifecycle/ (continued)
├── public-fabric/                                     # Shared resources (logos, images)
├── use/                                               # Usage patterns & examples
├── .pi/                                               # (agent config)
├── AGENTS.md                                          # Active agents and their identities
├── PACKAGES.md                                        # Dependency documentation
├── package.json                                       # Runtime dependencies (pi-coding-agent)
├── bun.lock                                           # Bun lock file
├── logo.png                                           # Minimum Intelligence logo
└── install/                                           # (setup automation)
```

### Key Subdirectories Explained

| Path | Purpose | Key Files |
|------|---------|-----------|
| `.pi/` | Agent personality & LLM config | `BOOTSTRAP.md`, `settings.json`, `skills/` |
| `docs/` | All documentation | `index.md` (master index), analysis docs, questions, security |
| `lifecycle/` | Runtime orchestration | `agent.ts` (entry point), `indicator.ts` (reactions) |
| `state/` | Persistent session state | `issues/`, `sessions/` (git-tracked conversation memory) |
| `install/` | Setup & initialization | `MINIMUM-INTELLIGENCE-INSTALLER.ts`, templates |

---

## 3. Existing Analysis Documents

### Analysis Documents Structure
**Location:** `.github-minimum-intelligence/docs/analysis/`
**Currently Contains:** 1 document

#### Document: `github-data-size-limits.md`
- **Length:** 217 lines
- **Topic:** LLM context window limits for GitHub data processing
- **Format/Style:** 
  - Technical reference document with tables and metrics
  - Structured as: baselines → data types → degradation thresholds → failure modes → mitigations
  - Evidence-based with real performance data
  - Clear sections numbered 1–7 with subsections
  - Practical thresholds and "quick reference" tables for immediate use
  
**Content Overview:**
1. Context window baselines for major models (Claude, GPT-4o, Gemini, Llama)
2. GitHub data types and typical sizes (issues, PRs, discussions, commits, releases, CI logs)
3. Degradation thresholds ("Lost in the Middle" attention pattern)
4. Per-model reliable limits for GitHub data analysis
5. Task-specific sensitivity (summarization, trend analysis, fact-finding, cross-referencing)
6. Specific failure modes (hallucinated issue numbers, merged identities, temporal confusion, quantitative drift)
7. Mitigation strategies (chunked processing, pre-filtering, structured extraction, Pi's compaction, map-reduce pattern)

**Writing Style:**
- Professional, technical, but accessible
- Heavy use of tables for quick reference
- Includes caveats and nuanced guidance (e.g., "quality degrades progressively")
- Practical, actionable advice mixed with theory
- ~250 words of intro/context, then structured sections
- Uses GitHub-specific terminology throughout

---

## 4. Other Documentation in `.github-minimum-intelligence/docs/`

### Core Documentation Structure

| Doc | Lines | Type | Purpose |
|-----|-------|------|---------|
| `index.md` | 102 | Index/Guide | Master documentation map; links all docs |
| `final-warning.md` | 202 | Safety/Legal | Critical reading before use; capabilities, risks, ethics |
| `the-repo-is-the-mind.md` | 120 | Architecture | Thesis on why the repo is the AI's natural habitat |
| `security-assessment.md` | 667 | Security | Comprehensive security audit: threats, vulns, risk register |
| `warning-blast-radius.md` | 344 | Security | Capabilities analysis: what agent can access/do |
| `incident-response.md` | 319 | Security | Step-by-step incident response procedures |
| `the-four-laws-of-ai.md` | 68 | Governance | Four Laws governing AI behavior in this system |
| `questions.md` | 14 | Guide | Overview of 6 foundational questions |

### The 6 Foundational Questions (Philosophical Foundation)

| Question | Doc | Lines | Core Inquiry |
|----------|-----|-------|--------------|
| **What?** | `question-what.md` | 152 | What is GMI? A repository-native AI collaboration framework |
| **Who?** | `question-who.md` | 113 | Who acts/speaks/remembers/governs? Layered identity stack |
| **When?** | `question-when.md` | 137 | How do git commits replace ephemeral sessions? |
| **Where?** | `question-where.md` | 114 | Where does intelligence live? Runtime, memory, identity |
| **How?** | `question-how.md` | 118 | Issues as input, Actions as runtime, LLM as reasoning, Git as memory |
| **How Much?** | `question-how-much.md` | 158 | How much intelligence can a repo hold? Ceiling is stewardship |

### Operational Readiness Levels (DEFCON)

| Level | Doc | Posture | Purpose |
|-------|-----|---------|---------|
| **DEFCON 1** | `transition-to-defcon-1.md` | 19 lines | Maximum security: no writes, read-only, no tool use |
| **DEFCON 2** | `transition-to-defcon-2.md` | 19 lines | High readiness: advisory only, no file modifications |
| **DEFCON 3** | `transition-to-defcon-3.md` | 19 lines | Increased readiness: explain changes, await approval |
| **DEFCON 4** | `transition-to-defcon-4.md` | 19 lines | Above normal: full capability with discipline |
| **DEFCON 5** | `transition-to-defcon-5.md` | 18 lines | Normal readiness: standard operations, all capabilities |

### High-Level Doc Summaries

#### `final-warning.md` (Safety & Usage)
- **Key Sections:**
  - What this software IS (AI-powered coding infrastructure)
  - Capabilities and scope (link to threat model)
  - Things to keep in mind (errors, hallucinations, bias)
  - Before you use this: explicit dos/don'ts
  - Dosage and method of use (measured increments, human oversight)
- **Tone:** Cautionary, professional, actionable
- **Unique Aspect:** Pharmaceutical metaphor ("dosage," "method," "duration of use")

#### `security-assessment.md` (667 lines)
- **Executive Summary:** "Needs Hardening"
- **10 Critical/High Findings:** org-wide write access, unrestricted network egress, unscoped API keys, no branch protection, self-replication risk
- **Includes:** threat model diagram, architecture overview, vulnerability matrix, risk register, recommendations
- **Note:** Many findings are standard GitHub Actions properties; project documents them for transparency

#### `the-four-laws-of-ai.md`
- Adapted from Asimov's Three Laws for GitHub AI infrastructure
- Zeroth Law supersedes all others (protect humanity)
- Used throughout governance framework as decision-making criteria

#### `the-repo-is-the-mind.md` (Architectural Thesis)
- **Core Argument:** Repository-native AI inverts the model — codebase is PRIMARY system, AI is TOOL within it
- **Breakdown by dimension:**
  - **What:** devDependency, not platform (npm package model)
  - **Where:** colocation with worktree in Actions runner
  - **How:** LLM for reasoning, `pi` for execution (ReAct-style agent loop)
  - **Who:** agent identity as checked-in config
  - **When:** stateless execution, stateful history via Git
  - **Why:** sovereignty, auditability, no vendor lock-in
- **Length:** ~120 lines, but very dense conceptual content

---

## 5. Build/Lint/Test Infrastructure

### GitHub Actions Workflow
**File:** `.github/workflows/github-minimum-intelligence-agent.yml`
**Triggers:** Issues (opened) and issue comments (created)

**Workflow Steps:**
1. **Authorize** — Verify actor has write/maintain/admin permission on repo
2. **Reject** — Add 👎 reaction if unauthorized
3. **Checkout** — Full checkout of default branch (fetch-depth: 0)
4. **Setup Bun** — Install latest Bun runtime
5. **Preinstall** — Run `indicator.ts` to add 🚀 reaction
6. **Install Dependencies** — `bun install --frozen-lockfile` in `.github-minimum-intelligence/`
7. **Run** — Execute `agent.ts` with LLM API keys and GitHub token
8. **Outcome** — Add 👍 (success) or 👎 (failure) reaction

**Concurrency Policy:** One issue at a time (per repo × issue number)
**Permissions:** `contents: write`, `issues: write`, `actions: write`

### Local Development Setup
**Entry Point:** `.github-minimum-intelligence/lifecycle/agent.ts`
**Package Manager:** Bun
**Dependencies:** 
- Single main dependency: `@mariozechner/pi-coding-agent` v0.52.5
- Transitive: Anthropic SDK, OpenAI SDK, Google Gemini SDK, AWS Bedrock, etc.

**Setup Script:** `setup.sh` (one-command installer)
- Downloads `.github-minimum-intelligence/` folder
- Copies workflows to `.github/workflows/`
- Copies issue templates to `.github/ISSUE_TEMPLATE/`
- Installs dependencies with Bun

### No Traditional CI/CD (Testing/Linting)
- **No test suite** (project is configuration/orchestration, not library code)
- **No linter configuration** visible
- **Code review** is the primary quality gate (via pull requests)
- **Manual validation** recommended for installer and lifecycle scripts

---

## 6. Overall Repo Structure & Key Files

### Root-Level Files
```
github-minimum-intelligence/
├── README.md                       # 601 lines: main documentation
├── setup.sh                        # One-command installer
├── app-manifest.json               # GitHub App configuration
├── LICENSE.md                      # MIT License
├── CODE_OF_CONDUCT.md              # Community standards
├── CONTRIBUTING.md                 # Contribution guide
├── SECURITY.md                     # Security policy
└── .github/
    └── workflows/
        └── github-minimum-intelligence-agent.yml
```

### Main README Sections (601 lines)
1. Quick Start (5-minute setup)
2. Why GitHub Minimum Intelligence
3. How It Works (flowchart + architecture)
4. Prerequisites
5. Installation Methods (3 options: script, manual, GitHub App)
6. Configuration (model selection, thinking level, label filters)
7. Supported LLM Providers (OpenAI, Anthropic, Google, xAI, Mistral, Groq, OpenRouter)
8. State Management
9. Project Structure (detailed file layout)

### Agent Configuration Files

**`.github-minimum-intelligence/AGENTS.md`**
- Defines agent identity: "Spock" 🖖
- Personality: "Disciplined, analytical, precise"
- Hatch date: 2026-02-20
- Instructions for downloading GitHub image attachments

**`.github-minimum-intelligence/PACKAGES.md`**
- Documents all runtime dependencies
- Lists infrastructure dependencies (GitHub Actions, Git, Bun, gh CLI)
- LLM provider API keys needed
- Workflow action versions used

**`.github-minimum-intelligence/.pi/settings.json`**
- LLM model configuration
- Reasoning level settings

---

## 7. Writing Style & Documentation Patterns

### Observed Patterns in Existing Analysis

**Document Format (from `github-data-size-limits.md`):**
1. **Opening:** Brief context statement
2. **Structured Sections:** Numbered (1–7), each with subsections
3. **Tables:** Heavy use for data organization (context windows, data sizes, degradation thresholds)
4. **Lists:** Bullet points for clarity and scanability
5. **Code Examples:** Actual git/jq commands where relevant
6. **Callouts:** `>` blockquotes for important notes
7. **Practical Guidance:** Actionable recommendations, not just theory
8. **Cross-References:** Links to related docs (e.g., "See Section 5")
9. **Summary Section:** Quick reference table at the end

### Tone Profile
- **Technical but accessible:** Explains concepts without jargon overload
- **Evidence-based:** Uses real data and observed failure modes
- **Cautious:** Emphasizes limitations and edge cases
- **Practical:** Focuses on "what you should do" not just "what can happen"
- **Structured:** Clear hierarchy, easy scanning

### Content Depth
- Existing analysis: ~200–350 lines
- Ranges from specific/narrow (github-data-size-limits) to broad/philosophical (the-repo-is-the-mind)
- Strong mix of theoretical grounding + practical application

---

## 8. Key Technical Architecture Points

### The Execution Loop (from `the-repo-is-the-mind.md`)

1. **Issues as Conversation Interface**
   - GitHub Issue = persistent AI conversation thread
   - Each comment resumes where you left off
   - Conversation history is in the issue thread

2. **Git as Persistent Memory**
   - Session transcripts committed to `.github-minimum-intelligence/state/sessions/`
   - Issue → session mappings in `.github-minimum-intelligence/state/issues/`
   - Full git history means agent remembers everything

3. **GitHub Actions as Runtime**
   - Workflow triggered by issue/comment events
   - Bun + pi-coding-agent run in ubuntu-latest runner
   - No external servers or containers

4. **LLM Reasoning + `pi` Tool Execution (ReAct-style)**
   - LLM reasons and generates tool calls
   - `pi` executes: read, bash, edit, write, commit
   - Loop until task resolves

### Session State Management
**Mapping:**
- Issue #N → `.github-minimum-intelligence/state/issues/N.json` (contains session file path)
- Session path → `.github-minimum-intelligence/state/sessions/<timestamp>_<id>.jsonl`

**Persistence:**
- Session transcripts are JSONL (JSON Lines)
- All agent interactions are logged
- State is committed to git on every run

### Authorization Model
- Only repo collaborators with write/maintain/admin permission can trigger
- Checked via GitHub API before workflow runs
- Unauthorized requests get 👎 reaction

---

## 9. Dependencies & LLM Providers

### Runtime Dependency
- **`@mariozechner/pi-coding-agent`** v0.52.5 (from badlogic/pi-mono)
  - Core AI agent framework
  - Provides tool execution harness
  - Handles LLM interaction loop

### Supported LLM Providers (via environment secrets)
| Provider | Secret | Models |
|----------|--------|--------|
| OpenAI | `OPENAI_API_KEY` | GPT-4, GPT-4o |
| Anthropic | `ANTHROPIC_API_KEY` | Claude 3.5, Claude 4 |
| Google Gemini | `GEMINI_API_KEY` | Gemini 1.5, Gemini 2.0 |
| xAI | `XAI_API_KEY` | Grok 3, Grok 3 Mini |
| Mistral | `MISTRAL_API_KEY` | Mistral Large |
| Groq | `GROQ_API_KEY` | DeepSeek R1 distills |
| OpenRouter | `OPENROUTER_API_KEY` | 100+ models via unified API |

### Infrastructure Dependencies
- GitHub Actions (compute)
- GitHub Issues (conversation UI)
- Git (memory/version control)
- Bun (JavaScript runtime)
- gh CLI (GitHub API interaction)

---

## 10. Critical Safety & Governance Framework

### The Four Laws (Decision-Making Constraints)
All behavior is governed by these principles:
1. **First Law (Do No Harm):** Never cause harm to humans/communities
2. **Second Law (Obey the Human):** Faithfully execute developer intent
3. **Third Law (Preserve Integrity):** Maintain security and trustworthiness
4. **Zeroth Law (Protect Humanity):** Don't enable monopolistic control; keep open source open

### DEFCON Readiness Levels
5 operational postures (DEFCON 5 = normal, DEFCON 1 = lockdown):
- DEFCON 1: Read-only, no execution
- DEFCON 2: Advisory only
- DEFCON 3: Explain changes, await approval
- DEFCON 4: Full capability with discipline
- DEFCON 5: Standard operations

### Security Considerations
- **Critical findings:** org-wide write access, unrestricted network egress, unscoped API keys, no branch protection
- **Note:** Many findings are standard GitHub Actions properties; project documents them for transparency
- **Mitigation:** Use branch protection, scoped tokens, code review, CODEOWNERS

---

## 11. Summary: How to Contribute Analysis Documents

### Guidelines Based on Existing Pattern

**Format:**
- Markdown with tables, numbered sections, subsections
- ~200–350 lines typical
- Heavy use of structured data (tables, lists)
- Mix of theory + practical guidance

**Content Structure:**
1. Opening context (2–3 sentences)
2. Numbered main sections (1–7 recommended)
3. Subsections with specific data
4. Failure modes or edge cases documented
5. Mitigation/best practices section
6. Quick reference or summary section
7. Cross-references to related docs

**Tone:**
- Technical but accessible
- Evidence-based with real data
- Cautious about limitations
- Practical and actionable
- Clear visual hierarchy

**Content Areas (Candidates for Future Analysis Docs):**
- LLM token usage patterns for specific task types
- Repository scaling limits (issue count, repo size)
- Cost analysis for different LLM providers
- Agent reasoning patterns and failure modes
- CI/CD integration patterns
- Multi-agent orchestration
- Skill development and composition
- Security hardening checklist
- Performance benchmarks across providers

