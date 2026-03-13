# Analysis: Agenticana Implementation Alongside GitHub Minimum Intelligence

A design for running [Agenticana](https://github.com/ashrafmusa/agenticana) — a 20-agent Sovereign AI Developer OS — alongside the GitHub Minimum Intelligence (GMI) agent in the same repository. GMI responds to comments beginning with `!`, Agenticana responds to comments beginning with `~`, and both coexist without conflict.

---

## 1. The Two-Intellect Model

The GMI was designed as a single-agent system: one issue triggers one reasoning chain, one response. Agenticana introduces a fundamentally different architecture — twenty specialist agents with shared memory, swarm dispatch, multi-agent debate, and cost-aware model routing.

Rather than replacing the GMI or merging the two systems, the design places them side by side in the same repository. Each intellect owns a distinct comment prefix:

| Prefix | Intellect | Folder | Workflow |
|--------|-----------|--------|----------|
| `!` | GitHub Minimum Intelligence | `.github-minimum-intelligence/` | `.github/workflows/github-minimum-intelligence-agent.yml` |
| `~` | Agenticana Intelligence | `.github-agenticana-intelligence/` | `.github/workflows/.github-agenticana-intelligence-agent.yml` |

A comment beginning with `!` activates the GMI. A comment beginning with `~` activates Agenticana. A comment beginning with neither is ignored by both. An issue opened with `!` in the title activates the GMI; an issue opened with `~` in the title activates Agenticana.

This prefix-routing model is the simplest possible dispatch mechanism. It requires no labels, no metadata, and no routing service. The user declares intent with a single character.

---

## 2. Why Two Intellects

### 2.1 Different Strengths

The GMI is a generalist — a single LLM session that persists across comments, excels at conversational flow, and operates with minimal overhead (~1.5–3 minutes per invocation). It is fast, cheap, and sufficient for most repository questions.

Agenticana is a specialist constellation — twenty agents with distinct domains, model tiers, skill sets, and cost profiles. It excels at tasks that benefit from multiple perspectives: security audits, architecture debates, full-stack reviews, and cross-cutting analysis. It is more expensive but qualitatively richer.

### 2.2 Different Cost Profiles

| Dimension | GMI | Agenticana |
|-----------|-----|------------|
| Agents per invocation | 1 | 1–20 |
| Actions minutes (typical) | 1.5–3 min | 3–25 min |
| LLM calls per invocation | 1 | 1–13 (simulacrum) |
| Model tier | Single (configured) | Variable (router-selected) |
| Monthly budget (free tier) | ~600–1 300 invocations | ~80–400 invocations |

### 2.3 User Choice

The prefix model gives the user explicit control. Quick questions get `!` (GMI — fast, cheap). Complex multi-perspective tasks get `~` (Agenticana — thorough, deliberate). The user never wonders which intellect will respond because they choose.

---

## 3. Prefix Routing: Implementation

### 3.1 GMI Workflow Change

The existing GMI workflow at `.github/workflows/github-minimum-intelligence-agent.yml` currently triggers on all `issue_comment.created` events (excluding bots). To implement prefix routing, the `run-agent` job's `if:` guard adds a prefix check:

**Current guard (line 301):**
```yaml
if: >-
  (github.event_name == 'issues')
  || (github.event_name == 'issue_comment' && !endsWith(github.event.comment.user.login, '[bot]'))
```

**Updated guard:**
```yaml
if: >-
  (github.event_name == 'issues' && startsWith(github.event.issue.title, '!'))
  || (github.event_name == 'issue_comment'
      && !endsWith(github.event.comment.user.login, '[bot]')
      && startsWith(github.event.comment.body, '!'))
```

For `issues.opened` events, the title must begin with `!`. For `issue_comment.created` events, the comment body must begin with `!`. Comments without the prefix are silently ignored.

### 3.2 Agenticana Workflow

The Agenticana workflow at `.github/workflows/.github-agenticana-intelligence-agent.yml` mirrors the GMI workflow structure but routes on `~`:

```yaml
if: >-
  (github.event_name == 'issues' && startsWith(github.event.issue.title, '~'))
  || (github.event_name == 'issue_comment'
      && !endsWith(github.event.comment.user.login, '[bot]')
      && startsWith(github.event.comment.body, '~'))
```

### 3.3 Prompt Stripping

Both agents strip their prefix character before passing the prompt to the LLM. In `agent.ts` (for GMI) and the equivalent Agenticana lifecycle script, the prompt is trimmed:

```typescript
// Strip the prefix character and leading whitespace
if (eventName === "issue_comment") {
  prompt = event.comment.body.replace(/^[!~]\s*/, "");
} else {
  prompt = `${title.replace(/^[!~]\s*/, "")}\n\n${body}`;
}
```

The prefix is a routing signal, not part of the user's question.

### 3.4 Mixed Conversations

An issue can contain both `!` and `~` comments. The GMI responds only to `!` comments. Agenticana responds only to `~` comments. Each maintains its own session state independently. The issue thread becomes a multi-intellect conversation:

```
User:       ! What dependencies does this project have?
GMI:        [responds with dependency analysis]
User:       ~ Review this project's security posture
Agenticana: [Security Auditor responds with vulnerability analysis]
User:       ! Summarize what we've discussed
GMI:        [summarizes the full issue thread including Agenticana's response]
```

Both agents can read the full issue thread (it is public GitHub data), but each only activates on its own prefix. This means the GMI's summary can incorporate Agenticana's analysis and vice versa.

---

## 4. The `.github-agenticana-intelligence` Folder

### 4.1 Directory Structure

The Agenticana folder mirrors the GMI's folder convention but contains the additional structures needed for multi-agent orchestration:

```
.github-agenticana-intelligence/
├── AGENTS.md                          # Identity file (constellation, not singular)
├── VERSION                            # Agenticana version
├── package.json                       # Dependencies (pi-coding-agent + Python bridge)
├── lifecycle/
│   └── agent.ts                       # Lifecycle orchestrator (dispatch + execution)
├── .pi/
│   ├── settings.json                  # Default provider, model, thinking level
│   └── BOOTSTRAP.md                   # Agent bootstrap instructions
├── agents/                            # 20 specialist definitions
│   ├── orchestrator.yaml
│   ├── orchestrator.md
│   ├── security-auditor.yaml
│   ├── security-auditor.md
│   ├── frontend-specialist.yaml
│   ├── frontend-specialist.md
│   ├── backend-specialist.yaml
│   ├── backend-specialist.md
│   └── ...                            # 16 more specialist pairs
├── skills/                            # Three-tier skill hierarchy
│   ├── core/                          # Tier 1 — always loaded
│   ├── domain/                        # Tier 2 — loaded per specialist
│   └── utility/                       # Tier 3 — loaded on demand
├── dispatch.yaml                      # Routing manifest (labels → agents)
├── router/                            # Model Router (complexity scoring)
│   └── model-router.ts
├── state/
│   ├── issues/                        # Issue → session mapping
│   ├── sessions/                      # JSONL transcripts per specialist
│   └── reasoning-bank/
│       └── decisions.json             # Shared decision memory (committed)
├── docs/
│   └── decisions/                     # ADRs from simulacrum debates
├── install/
│   ├── MINIMUM-INTELLIGENCE-AGENTS.md
│   └── settings.json
└── public-fabric/                     # Optional GitHub Pages site
    └── index.html
```

### 4.2 Key Differences from GMI

| Aspect | GMI (`.github-minimum-intelligence/`) | Agenticana (`.github-agenticana-intelligence/`) |
|--------|-------|------------|
| Agents | 1 (generalist) | 20 (specialists) |
| Identity | Single `AGENTS.md` | `AGENTS.md` + 20 YAML/MD pairs in `agents/` |
| Skills | Built into pi agent | Three-tier hierarchy in `skills/` |
| Routing | None (single agent) | `dispatch.yaml` + Model Router |
| Memory | `state/sessions/*.jsonl` | Sessions + ReasoningBank (`decisions.json`) |
| Decisions | Inline in conversation | Committed ADRs in `docs/decisions/` |
| Model selection | Static (configured) | Dynamic (router-selected per task complexity) |

### 4.3 The Dispatch Manifest

The `dispatch.yaml` file maps issue labels to specialists. When a `~` comment arrives, the lifecycle script reads the issue's labels and determines which agent(s) to invoke:

```yaml
default_agent: orchestrator
auto_route: true

routes:
  - label: security
    agent: security-auditor
    model_tier: pro
    skills: [core, vulnerability-scanner, red-team-tactics]

  - label: frontend
    agent: frontend-specialist
    model_tier: flash
    skills: [core, nextjs-react-expert]

  - label: backend
    agent: backend-specialist
    model_tier: flash
    skills: [core, backend]

  - label: architecture
    mode: simulacrum
    agents: [orchestrator, backend-specialist, security-auditor]
    model_tier: pro

  - label: review
    mode: swarm
    agents: [security-auditor, test-engineer]
    model_tier: flash
```

If no label matches, the orchestrator handles the request (or the Model Router auto-selects based on task analysis).

---

## 5. The Agenticana Workflow

### 5.1 Workflow File

The workflow at `.github/workflows/.github-agenticana-intelligence-agent.yml` follows the same three-job structure as the GMI workflow:

| Job | Purpose | Trigger |
|-----|---------|---------|
| `run-install` | Self-installer / upgrader | `workflow_dispatch` |
| `run-agent` | Dispatch and execute specialist agents | `issues.opened` (title starts with `~`) or `issue_comment.created` (body starts with `~`) |
| `run-gitpages` | Publish public-fabric to GitHub Pages | `push` to `main` |

### 5.2 The Dispatch Job

Unlike the GMI workflow (which has a single execution path), the Agenticana workflow includes a dispatch phase that branches into three execution modes:

```yaml
jobs:
  route:
    needs: authorize
    runs-on: ubuntu-latest
    outputs:
      agents: ${{ steps.dispatch.outputs.agents }}
      mode: ${{ steps.dispatch.outputs.mode }}
    steps:
      - uses: actions/checkout@v6
      - name: Dispatch
        id: dispatch
        run: |
          # Read issue labels
          # Parse dispatch.yaml
          # Output agents and mode (single/swarm/simulacrum)

  execute:
    needs: route
    strategy:
      matrix:
        agent: ${{ fromJson(needs.route.outputs.agents) }}
      fail-fast: false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - name: Run specialist
        run: |
          # Load agent config from agents/${{ matrix.agent }}.yaml
          # Load skills per agent's tier
          # Execute agent with issue context
          # Post result as issue comment
          # Commit session + ReasoningBank update
```

The matrix strategy fans out one job per selected specialist. For a single-agent invocation, the matrix has one entry. For a three-agent swarm, it has three entries running in parallel.

### 5.3 Concurrency

Each intellect manages its own concurrency group:

```yaml
# GMI
concurrency:
  group: github-minimum-intelligence-${{ github.repository }}-issue-${{ github.event.issue.number }}
  cancel-in-progress: false

# Agenticana
concurrency:
  group: github-agenticana-intelligence-${{ github.repository }}-issue-${{ github.event.issue.number }}
  cancel-in-progress: false
```

Since the concurrency groups are different, the GMI and Agenticana can run simultaneously on the same issue without blocking each other. This is intentional — a user can ask the GMI a quick question while Agenticana is running a longer analysis.

---

## 6. Shared Repository, Separate Minds

### 6.1 State Isolation

Each intellect maintains its own state directory:

```
.github-minimum-intelligence/state/     # GMI sessions
.github-agenticana-intelligence/state/   # Agenticana sessions + ReasoningBank
```

There is no shared state between the two systems. The GMI does not read Agenticana's ReasoningBank. Agenticana does not read the GMI's sessions. Each intellect's committed state is self-contained and independently diffable, reviewable, and revertible.

### 6.2 Shared Context via Issue Thread

Although state is isolated, both intellects can read the issue thread. When the GMI responds to `! Summarize this discussion`, it sees Agenticana's prior comments in the issue. When Agenticana processes `~ What did the GMI suggest?`, it sees the GMI's prior comments. The issue thread is the shared context — not because the agents share internal state, but because GitHub Issues are public conversation surfaces.

### 6.3 Git Commit Identity

Each intellect uses a distinct git identity to avoid confusion in `git log`:

| Intellect | Committer Name | Committer Email |
|-----------|---------------|-----------------|
| GMI | `github-minimum-intelligence[bot]` | `github-minimum-intelligence[bot]@users.noreply.github.com` |
| Agenticana | `github-agenticana-intelligence[bot]` | `github-agenticana-intelligence[bot]@users.noreply.github.com` |

`git log --author="github-agenticana"` shows only Agenticana's commits. `git log --author="github-minimum"` shows only the GMI's commits.

### 6.4 Push Conflict Resolution

When both intellects finish simultaneously and attempt to push, the existing push-retry-with-rebase pattern handles it. Both workflows use the same retry loop (up to 10 retries with increasing backoff). Since their state directories are disjoint, rebase merges are conflict-free — each intellect modifies only its own files.

---

## 7. Agenticana's Specialist Architecture

### 7.1 The Twenty Agents

Agenticana's 20 specialist agents map to distinct domains. Each agent has a YAML specification (model tier, skills, behavioral constraints) and a Markdown persona file (priorities, style, operational guidelines):

| Agent | Domain | Model Tier | Key Skills |
|-------|--------|------------|------------|
| Orchestrator | Planning, delegation | Pro | Core + Architecture |
| Frontend Specialist | UI, components, styling | Flash | Core + NextJS/React |
| Backend Specialist | API, server, database | Flash | Core + Backend |
| Database Architect | Schema, queries, optimization | Flash | Core + Database |
| Security Auditor | Vulnerabilities, compliance | Pro | Core + Vulnerability Scanner |
| Penetration Tester | Offensive security testing | Pro | Core + Red Team Tactics |
| Test Engineer | Testing strategy, coverage | Flash | Core + TDD |
| Performance Optimizer | Profiling, latency | Flash | Core + Performance |
| Debugger | Bug investigation, root cause | Flash | Core + Systematic Debugging |
| DevOps Engineer | CI/CD, infrastructure | Flash | Core + DevOps |
| Documentation Writer | Docs, guides, API docs | Lite | Core + Documentation |
| Product Manager | Requirements, prioritization | Flash | Core + Product |
| Code Archaeologist | Legacy code understanding | Flash | Core + Codebase Analysis |
| Game Developer | Game logic, rendering | Flash | Core + Game Dev |
| SEO Specialist | Search optimization | Lite | Core + SEO |
| Mobile Developer | Mobile apps, responsive | Flash | Core + Mobile |
| QA Automation Engineer | Test automation, CI | Flash | Core + QA |
| Explorer Agent | Research, discovery | Lite | Core + Research |
| Product Owner | Backlog, acceptance criteria | Flash | Core + Agile |
| Project Planner | Roadmap, milestones | Flash | Core + Planning |

### 7.2 Three Execution Modes

**Single agent** — one specialist handles the request. Selected by label or auto-routing. Most common mode.

**Swarm** — multiple specialists work in parallel on different aspects. Each posts its own comment. Results are naturally aggregated in the issue thread. Used for labels like `review` or `full-stack`.

**Simulacrum** — structured multi-agent debate. Specialists propose, critique, revise, and vote. The Orchestrator synthesizes a final decision. The outcome is documented as an Architecture Decision Record (ADR) committed to `docs/decisions/`. Used for the `architecture` label.

### 7.3 The ReasoningBank

Agenticana's shared memory — the ReasoningBank — records successful agent decisions with structured metadata:

```json
{
  "id": "rb-001",
  "task": "Build JWT auth system",
  "agent": "backend-specialist",
  "decision": "bcrypt cost=12 + httpOnly cookies + 15min access token",
  "outcome": "Deployed, 0 security issues found",
  "success": true,
  "tags": ["auth", "jwt", "backend"]
}
```

When committed to git at `.github-agenticana-intelligence/state/reasoning-bank/decisions.json`, every decision gains the properties of source code: versioned, diffable, blameable, and revertible. The ReasoningBank is the institutional memory that makes Agenticana learn from its own work across sessions.

Embedding vectors (used for cosine similarity retrieval) are regenerated at runtime from the committed structured data rather than committed themselves. This keeps diffs meaningful and avoids opaque binary blobs in the git history.

---

## 8. Cost and Operational Constraints

### 8.1 Actions Minutes Budget

Running two intellects doubles the baseline workflow triggers but not necessarily the cost, because each invocation is user-initiated (prefix-gated). A practical monthly budget on the free tier (2 000 minutes):

| Allocation | Minutes | Estimated Invocations |
|------------|---------|----------------------|
| GMI (`!` comments) | 60% (1 200 min) | ~400–800 |
| Agenticana single-agent (`~` comments) | 25% (500 min) | ~100–200 |
| Agenticana swarm | 10% (200 min) | ~20–40 |
| Agenticana simulacrum | 5% (100 min) | ~5–7 |
| **Total** | 2 000 min | ~525–1 047 |

### 8.2 Model Router

The Model Router is what makes twenty agents economically feasible. It scores task complexity and selects the cheapest adequate model:

| Complexity Score | Tier | Example Models | Cost per 1M Input Tokens |
|-----------------|------|----------------|--------------------------|
| 0–30 | Lite | GPT-4o-mini, Claude 3 Haiku | $0.15–0.25 |
| 31–60 | Flash | Gemini 2.0 Flash, Claude 3.5 Sonnet | $0.50–3.00 |
| 61–85 | Pro | GPT-4o, Claude 3.5 Opus | $2.50–15.00 |
| 86–100 | Pro-Extended | GPT-5.4, Claude 4 | $5.00–30.00 |

Without the router, defaulting every invocation to Pro would cost 3–10× more. The router's complexity scorer pays for itself immediately.

### 8.3 Git Storage

Annual state growth for both intellects at moderate usage:

| Data Type | GMI | Agenticana | Combined |
|-----------|-----|------------|----------|
| Session transcripts | 15–150 MB | 15–150 MB | 30–300 MB |
| ReasoningBank | — | 0.9–3.6 MB | 0.9–3.6 MB |
| Attestations | — | 3–6 MB | 3–6 MB |
| **Total** | 15–150 MB | ~19–160 MB | **~34–310 MB** |

This is well within GitHub's 5 GB comfortable operating range for repositories.

---

## 9. Governance

### 9.1 Shared Authorization

Both intellects use the same authorization model — only collaborators with `write`, `maintain`, or `admin` access can trigger either agent. This is enforced at the workflow level via the GitHub API permission check. There is no scenario where a user can invoke Agenticana but not the GMI, or vice versa.

### 9.2 Agenticana's Additional Governance

Agenticana layers additional governance atop the shared authorization:

| Governance Layer | Mechanism | Source |
|-----------------|-----------|--------|
| Access control | Collaborator permissions | GitHub (shared) |
| Prefix routing | `!` / `~` comment prefix | Workflow `if:` guard |
| Pre-merge validation | Guardian Mode (Sentinel + lint + secret scan) | Agenticana |
| Decision attestation | Proof-of-Work (cryptographic commit attestation) | Agenticana |
| Cost control | Model Router tier selection + budget guardrails | Agenticana |
| Operational readiness | DEFCON levels (inherited from repository governance) | Shared |

### 9.3 Bot Loop Prevention

Both workflows filter out bot comments (`!endsWith(github.event.comment.user.login, '[bot]')`). Additionally, the prefix routing prevents cross-activation: the GMI's response (posted by `github-minimum-intelligence[bot]`) does not start with `~`, so it cannot trigger Agenticana. Agenticana's response (posted by `github-agenticana-intelligence[bot]`) does not start with `!`, so it cannot trigger the GMI.

This double guard (bot username filter + prefix filter) eliminates infinite loop scenarios even if one guard fails.

---

## 10. Installation and Coexistence

### 10.1 Installation Sequence

1. **GMI is already installed** — the `.github-minimum-intelligence/` folder and workflow already exist.
2. **Install Agenticana** — run the Agenticana workflow manually (`workflow_dispatch`) to create the `.github-agenticana-intelligence/` folder, its dependencies, and the specialist definitions.
3. **Update GMI workflow** — modify the existing GMI workflow's `if:` guard to require the `!` prefix. This is the only change to the existing GMI system.
4. **Add API keys** — Agenticana may use different providers for different specialists. Add the required API key secrets.

### 10.2 Independent Upgrades

Each intellect has its own `VERSION` file and self-installer job. Upgrading the GMI does not affect Agenticana, and vice versa. This independence is critical — a failed Agenticana upgrade should never break the GMI.

### 10.3 Removal

Removing Agenticana is clean:

1. Delete `.github-agenticana-intelligence/` folder.
2. Delete `.github/workflows/.github-agenticana-intelligence-agent.yml`.
3. Optionally revert the GMI workflow's `if:` guard to remove the `!` prefix requirement (restoring the original behavior where all comments trigger the GMI).

The GMI continues to function unchanged. No Agenticana state or configuration leaks into the GMI's folder.

---

## 11. What Agenticana Teaches the GMI

The [GitHub Fabric analysis](https://github.com/japer-technology/github-fabric) of Agenticana revealed that a 20-agent system breaks the single-agent assumption that most GitHub-native AI frameworks make. Rethinking this for the GMI's context produces specific lessons:

### 11.1 Modules Can Be Plural

The GMI is one agent, one mind. Agenticana shows that a module can be a constellation — twenty specialists sharing one memory, one governance model, and one repository. The two-intellect model accommodates both architectures without forcing either to change.

### 11.2 Memory Can Be Institutional

The GMI's memory is conversational — session transcripts that record what happened. Agenticana's ReasoningBank is institutional — structured decisions that record what was learned. When committed to git, this institutional memory becomes a body of professional judgment that persists across sessions, agents, and collaborators.

### 11.3 Routing Is Infrastructure

The `!` / `~` prefix model is the simplest possible routing. But the pattern extends: additional intellects could claim other prefixes (`@` for a code reviewer, `#` for a project planner). Comment prefixes become a lightweight dispatch surface that requires no external infrastructure.

### 11.4 Governance Composes

The GMI's authorization model (collaborator permissions) composes cleanly with Agenticana's validation model (Guardian Mode, Proof-of-Work). Each layer adds confidence. And because all of it is committed to git, the governance is an auditable, diffable, revertible property of the repository itself.

---

## 12. Summary

Two intellects, one repository. The GMI answers on `!` — fast, cheap, conversational. Agenticana answers on `~` — thorough, multi-perspective, deliberate. They share authorization, share the issue thread as a conversation surface, and share the git repository as storage — but maintain completely separate state, separate workflows, and separate identities.

The implementation requires:

| Component | Path | Purpose |
|-----------|------|---------|
| Agenticana folder | `.github-agenticana-intelligence/` | Specialist agents, skills, router, state, ReasoningBank |
| Agenticana workflow | `.github/workflows/.github-agenticana-intelligence-agent.yml` | Dispatch and execute specialists on `~` |
| GMI workflow update | `.github/workflows/github-minimum-intelligence-agent.yml` | Add `!` prefix guard to existing `if:` condition |
| GMI agent.ts update | `.github-minimum-intelligence/lifecycle/agent.ts` | Strip `!` prefix before passing prompt to LLM |
| Dispatch manifest | `.github-agenticana-intelligence/dispatch.yaml` | Label → specialist routing table |

The prefix model is extensible. Today it is `!` and `~`. Tomorrow it could be five intellects, each claiming a character, each contributing a different kind of intelligence to the repository's collective mind. The commit graph records all of it — every question, every response, every decision, every debate — as the repository's permanent institutional memory.

The [githubification](https://github.com/japer-technology/githubification) project asked: how do you make Agenticana run on GitHub? The answer is: place it next to the GMI, give it its own prefix, and let the repository be the mind for both.
