# FUTURE.md — Where GMI Can Go From Here

A deep analysis of how **GitHub Minimum Intelligence (GMI)** can evolve, informed by
**GitHub Agentic Workflows (gh-aw)** — the natural-language, Markdown-authored,
compiled-to-YAML workflow framework published at
<https://github.github.com/gh-aw>.

> *TL;DR* — GMI today is a single-purpose conversational agent that lives inside
> a repo. gh-aw is a general-purpose **engine** for declaring many such agents
> in Markdown, with first-class safety primitives (safe-outputs, sandboxing,
> compiled `.lock.yml` artifacts, MCP tool brokering). GMI's most powerful
> next move is to keep its identity (*"the repo is the mind"*) and adopt
> gh-aw's **declarative surface area** so that one Minimum-Intelligence repo
> becomes a *garden* of small, auditable, Markdown-defined agents — not just
> one chat box bolted to Issues.
>
> **Working assumption from here down:** every local AI agent **thinks in
> its own git branch**. A personality is a long-lived branch (`gmi/<name>`)
> that owns its own `AGENTS.md` overlay, its own `state/sessions/`, and its
> own commit history. Crossing into "many agents per repo" is then *free* —
> it is just `git checkout -b gmi/triage`. Concurrency, memory isolation,
> identity drift, and roll-back all collapse into primitives git already
> ships. See [`BRANCH-UPGRADE.md`](./BRANCH-UPGRADE.md) for the concrete
> engineering changes this implies.

---

## 1. Snapshot: what each project actually is

### GMI today

- **One workflow** (`github-minimum-intelligence-agent.yml`) + **one
  orchestrator** (`lifecycle/agent.ts`) + **one personality folder** (`.pi/`).
- **One interaction surface**: a GitHub Issue (open or comment).
- **One memory model**: every prompt/response is committed as a JSONL session
  under `state/sessions/`, keyed to the issue number via `state/issues/N.json`.
- **One trust model**: only repo owners/members/collaborators can trigger it;
  the runner has `contents: write`, `issues: write`, `actions: write`.
- **Many LLM providers**, **modular skills** in `.pi/skills/`, **self-install
  & self-upgrade** via `workflow_dispatch`.

### gh-aw in one paragraph

gh-aw turns Markdown files (with YAML frontmatter declaring `on:`,
`permissions:`, `tools:`, `safe-outputs:`, `engine:`) into **compiled,
strongly-guarded `.lock.yml` GitHub Actions**. The agent itself runs
**read-only by default**; any write to GitHub (label, comment, PR, issue,
review) happens in a **separate, least-privileged job** that consumes
**schema-validated structured output** from the agent. Tooling is exposed via
**MCP** servers, allowlisted per workflow. The model is pluggable
(Copilot / Claude / Codex / Gemini). The result is *intent-as-code* with
guard-rails baked into the pipeline.

### The honest comparison

| Axis | GMI today | gh-aw |
|---|---|---|
| Authoring model | TypeScript + one YAML workflow | **Markdown workflows** compiled to YAML |
| # of agents per repo | 1 (the issue-responder) | N (one per `.md` file in `.github/workflows/`) |
| Trigger surface | `issues`, `issue_comment`, `workflow_dispatch` | Any GitHub event, `schedule`, `command`, reusable workflow |
| Write boundary | Agent runs with `contents: write` directly | Agent is read-only; **safe-outputs** job performs writes after validation |
| Tooling | Whatever the LLM SDK / pi-mono gives it | **MCP servers**, allowlisted per workflow |
| Memory | Git-committed JSONL sessions | Mostly stateless per run (caches/artifacts available) |
| Identity / personality | Strong (`AGENTS.md`, hatching, `BOOTSTRAP.md`) | Weak; identity is per-workflow Markdown |
| Multi-provider | Yes (8+ providers) | Yes (Copilot, Claude, Codex, Gemini) |
| Install footprint | One folder + one workflow, self-installing | One CLI (`gh aw`) + per-workflow `.md` + `.lock.yml` |

**Reading between the lines:** gh-aw is strong where GMI is weak
(safety surface, multi-agent fan-out, declarative authoring) and GMI is
strong where gh-aw is weak (persistent memory, single-issue conversational
UX, zero external tooling, identity).

---

## 2. The strategic question

> Is GMI a **product** (an issue-bot) or a **platform** (a way of running
> any agent inside a repo)?

Today the README pitches GMI as a product — "An AI agent that lives in your
GitHub repo." gh-aw's existence forces a choice:

1. **Stay a product.** Lean harder into the one thing nobody else does well:
   *persistent, git-committed, issue-threaded memory*. Let gh-aw own the
   "many small agents" space.
2. **Become a platform.** Re-architect so GMI is the **memory + identity +
   conversational layer** that *runs on top of* gh-aw-style declarative
   agents. Each "skill" becomes a Markdown workflow; GMI is the long-lived
   character that owns and orchestrates them.
3. **Both.** Keep the one-folder install and the single-issue UX as the
   default front door, but compile that experience down to gh-aw-style
   primitives underneath, so power users can add, remove, and audit
   individual agents like Lego.

This document argues for **option 3**, executed in phases. The rest of the
file describes what that looks like concretely.

---

## 3. What gh-aw teaches us that GMI should adopt

### 3.1 Read-only agent + safe-outputs job

Today `lifecycle/agent.ts` runs inside a job with `contents: write` and
`issues: write` and calls `git commit && git push` itself. That is the
*single largest piece of blast radius* in the project — and the
`warning-blast-radius.md` doc effectively admits it.

gh-aw's pattern is:

1. **Agent job**: read-only token, no secrets, sandbox network egress.
2. **Output**: a structured JSON document (`create-issue`, `add-comment`,
   `push-to-pull-request-branch`, …).
3. **Safe-outputs job**: separate runner, *only* the permissions needed for
   the actions actually requested, validates each action against an
   allowlist before executing.

**GMI port:** split `lifecycle/agent.ts` into:

- `lifecycle/think.ts` — produces a `session-delta.json` describing
  *intended* state changes: new JSONL lines, files to write, issue
  reactions, comments to post, optional PR proposals.
- `lifecycle/apply.ts` — runs in a second job, validates the delta against
  a schema, applies it, and commits.

Even before gh-aw is adopted as the engine, this single refactor would
reduce prompt-injection risk dramatically, because *the LLM never holds the
write token*.

### 3.2 Declarative authoring of new behaviours

A new GMI capability today means a new `.pi/skills/*.md` file *and* trust
that the agent will pick it up at the right moment. A new gh-aw behaviour
is a new Markdown file with a frontmatter that says *exactly* when it runs
and what it can do.

**GMI port:** introduce
`.github-minimum-intelligence/agents/<name>.md`:

```markdown
---
on:
  issues: { types: [labeled] }
  if: github.event.label.name == 'triage'
inherits: .pi/                # personality, memory, identity
safe-outputs:
  add-labels: { allowed: [bug, feature, question, duplicate] }
  add-comment: {}
---
# Triage Sub-Agent
You are GMI in its "triage" mood. Read the issue and pick exactly one label…
```

These compile to either:
- a `.lock.yml` (gh-aw style), or
- a routing table consumed by the existing single workflow.

Either way, **the unit of extension stops being TypeScript** and becomes
Markdown — matching gh-aw's authoring ergonomics and GMI's own
"`AGENTS.md` is the source of truth" instinct.

### 3.3 MCP as the tool boundary

`pi-mono` already gives the agent shell-like tools (`read,grep,find,ls`,
plus implicit edit/run). gh-aw exposes tools via **MCP servers** declared
per workflow, with explicit allowlists.

**GMI port:** ship a **GMI MCP server** (`gmi-mcp`) that exposes:

- `session.read(issue_no, range)` — read prior turns of a conversation.
- `session.search(query)` — semantic search across all session JSONLs.
- `session.summarise(issue_no)` — produce / refresh a stored summary.
- `repo.history(path, since)` — what changed near this file, by whom.
- `identity.get()` — read `AGENTS.md` plus hatching state.

This turns GMI's *unique* asset (years of committed conversation) into
a tool any agent — GMI itself, a gh-aw workflow, an external Copilot
session — can call. The "repo is the mind" claim becomes a *programmable*
mind, not just an archive.

### 3.4 Compiled, auditable artifacts

gh-aw's `.lock.yml` is brilliant: humans write intent, machines run a
reviewable lock file, and `git diff` on the lock catches drift. GMI
generates state but no compiled artifact — every behavioural change is
implicit in `agent.ts` or skill prose.

**GMI port:** every install/upgrade run should write
`.github-minimum-intelligence/.lock/agent-plan.yml` describing the
*derived* configuration (which provider, which skills are active, which
MCP tools are exposed, which events are subscribed). Reviewers diff the
lock file in PRs the way they diff `package-lock.json`.

### 3.5 Beyond a single issue thread

gh-aw runs on schedules, on PR events, on review comments, on labels, on
`workflow_run`. GMI runs on opened issues and their comments. Extending
GMI to the full event surface — *without* losing its conversational
identity — is the biggest user-visible upgrade available.

Concrete first targets:
- **PR review agent**: comment on PRs, leave review-thread comments,
  remember per-PR context (`state/prs/<n>.json`).
- **Scheduled "morning standup"**: cron-triggered, posts an issue summary
  of what changed in the repo overnight, asks the maintainer one question.
- **`/gmi` slash commands** in issue comments: a tiny router that maps
  `/gmi summarise`, `/gmi forget last`, `/gmi ship-it` to specific
  sub-agents — exactly the use case gh-aw's `command:` trigger is for.

Because every sub-agent runs **on its own branch** (see §4.4 and
`BRANCH-UPGRADE.md`), fan-out across these event types stops being a
concurrency problem: the PR-review agent commits to `gmi/pr-review`, the
standup agent to `gmi/standup`, and the `/gmi` router dispatches each
slash command to the branch whose name matches the verb. There is no
shared mutable state on `main`; the only place branches meet is a
deliberate, reviewable merge.

---

## 4. What gh-aw cannot do that GMI should double down on

If GMI just becomes "gh-aw with a personality folder", it loses. The
defensible core is the things gh-aw deliberately *doesn't* try to be.

### 4.1 Persistent, versioned, queryable memory

`state/sessions/*.jsonl` is GMI's crown jewel and gh-aw has no equivalent.
Future work:

- **Per-session summaries** committed alongside the raw JSONL, refreshed
  whenever the session grows past a threshold. Cheap recall in future runs.
- **Cross-session embeddings** stored in `state/index/` as a flat file
  vector store (no DB, still "repo = storage"). Enables
  `session.search(query)` above.
- **Memory garbage collection** as an explicit, user-triggered ritual,
  not a silent background job — auditability is the whole point.
- **Memory provenance**: every committed turn already names the user and
  the model; expose this as a first-class header in the JSONL schema so
  diffs are meaningful.

### 4.2 A character, not a function

The `hatch` flow, `AGENTS.md`, `BOOTSTRAP.md` — these are deliberate.
gh-aw has no notion of a single, continuous character that persists across
workflows. GMI does, and it should *enforce* that identity across whatever
new entry points it grows:

- An `identity-broker` step that injects `AGENTS.md` + recent memory into
  any sub-agent's system prompt.
- A single `name` and `voice` that the PR-review agent, the standup agent,
  and the triage agent all share unless explicitly overridden.
- A "soul file" version field so identity migrations are visible in git.

### 4.3 Zero-infrastructure install

gh-aw needs a CLI (`gh aw compile`) to be useful. GMI's *"copy one
workflow file, click Run, done"* story is genuinely better for the
median user. Whatever refactor happens, the install bar must not rise.

If GMI adopts compilation, it should compile **inside the workflow**
(`run-install` job already runs on every dispatch) so users never need
to install a CLI locally. The `.lock.yml`/`agent-plan.yml` is just a
git-committed artifact, not a developer dependency.

### 4.4 Branches as identity containers

gh-aw treats the repository as a single namespace: every workflow file
sits on the default branch and every run mutates the same tree. That is
fine for stateless CI, but it actively *fights* GMI's "the repo is the
mind" thesis the moment you want more than one mind in the same repo.

GMI's leverage is that **git already solves multi-personality
concurrency** — it just has not been used that way for agents yet. The
upgrade is to treat **each agent personality as a long-lived branch**:

- `gmi/main` is the canonical, shipped personality (the one users meet
  when they first install GMI).
- `gmi/triage`, `gmi/standup`, `gmi/pr-review`, `gmi/researcher`, etc.
  are sibling branches, each with their own `AGENTS.md` overlay, their
  own `state/sessions/`, their own `memory.log`, their own opinion.
- A new personality is `git checkout -b gmi/<name> gmi/main` plus a
  prompt edit — *that is the entire bootstrap*. No new workflow file,
  no new repo, no new install ritual.
- Cross-pollination is a PR from one `gmi/*` branch into another (or
  into `main`). Two agents disagreeing produces a merge conflict, which
  is the **right** user experience: a human reviews the diff and picks.

This is the cheapest possible "multi-agent per repo" primitive, because
git did all the hard work in 2005. Concurrency is `git fetch`. Identity
isolation is the working tree. Roll-back is `git reset`. Memory
federation is `git cherry-pick`. Audit is `git log`.

See [`BRANCH-UPGRADE.md`](./BRANCH-UPGRADE.md) for the file-level changes
this requires (workflow checkout target, state paths, branch naming,
apply-job push target, GC of stale agent branches, and the safe-outputs
schema additions needed so a personality can open PRs against `main`
without holding write access to `main` itself).

---

## 5. A phased roadmap

Each phase is independently shippable and preserves backward compatibility.

### Phase 1 — *Safety first* (no user-visible change)

1. Split `lifecycle/agent.ts` into `think.ts` (read-only) and `apply.ts`
   (writes from validated delta).
2. Run them as two GitHub Actions jobs with separate permission scopes.
3. Add a schema (`state/schema/session-delta.schema.json`) and validate
   in `apply.ts`.
4. Document the new trust boundary in `warning-blast-radius.md`.

*Why first:* it lowers blast radius today, and it is the prerequisite
for everything that follows (sub-agents, MCP exposure, gh-aw interop).

### Phase 2 — *Memory as a service*

1. Add per-session summary files and a flat-file embedding index under
   `state/index/`.
2. Ship `gmi-mcp` (a tiny Node/Bun MCP server) exposing `session.read`,
   `session.search`, `session.summarise`, `repo.history`, `identity.get`.
3. Use it *from GMI itself* first — the agent calls its own MCP tools
   instead of poking the filesystem directly. Forcing dogfooding shakes
   out the API.

### Phase 3 — *Many agents, one mind*

1. Adopt **branch-per-personality** (see §4.4 and `BRANCH-UPGRADE.md`):
   the workflow checks out `gmi/<name>` instead of `main`, the apply
   job pushes to that same branch, and `state/` paths become branch-
   local by construction.
2. Introduce `.github-minimum-intelligence/agents/*.md` with frontmatter
   (`on:`, `safe-outputs:`, `inherits:`, `branch:`).
3. Compile them at install/upgrade time into either:
   - additional jobs inside the existing workflow (low-friction), or
   - sibling `.github/workflows/gmi-<name>.yml` files (gh-aw-style).
4. First three concrete sub-agents, each on its own branch:
   **`gmi/triage`**, **`gmi/standup`**, **`gmi/pr-review`**.
5. All sub-agents share identity via the identity-broker and memory via
   `gmi-mcp`; cross-branch reads happen through `git show gmi/<other>:…`
   so no agent can silently mutate another's mind.

### Phase 4 — *Interop with gh-aw*

1. Allow a GMI sub-agent to be *expressed* directly as a gh-aw Markdown
   workflow, with GMI providing the MCP memory/identity tools.
2. Publish `gmi-mcp` as a standalone package so any gh-aw workflow in any
   repo can opt into "I want GMI-style memory" by allowlisting the
   server.
3. At this point GMI is both a polished single-agent product *and* a
   memory/identity sidecar for the gh-aw ecosystem.

### Phase 5 — *Power moves*

- **Multi-repo memory federation**: a GMI repo can publish a sanitised
  digest of its memory; another GMI repo can subscribe (via a workflow
  that pulls and verifies). Still git-only, still auditable.
- **Local mode**: the same agent runs against a local checkout via the
  same MCP server and the same Markdown agent files — no GitHub Actions
  required. The repo really *is* the mind, online or offline.
- **Time-travel debugging**: because every turn is committed, ship a
  one-shot replay tool that re-runs a session against a different model
  / different skills to compare behaviour. This is uniquely possible
  *because* of the git-as-memory choice and is impossible with gh-aw.

---

## 6. Risks and counter-arguments

- **Scope creep kills the "minimum" in the name.** Every phase above
  should be opt-in. The default install must remain "one workflow file,
  one issue, one reply". If a phase forces complexity onto the
  beginner, it shipped wrong.
- **gh-aw may absorb the memory story.** Plausible. Mitigation: publish
  `gmi-mcp` early as a standalone, documented MCP server so the
  *interface* survives even if gh-aw gains its own implementation.
- **Two jobs cost more minutes.** True but small; the read-only job is
  the long one (LLM call), the apply job is seconds. Measure, document.
- **Identity drift across many sub-agents.** Real risk; the
  identity-broker + soul-file versioning above exists specifically to
  catch it. Treat identity as a schema, not as vibes.
- **Compilation introduces a hidden language.** Keep it inside the
  workflow (no CLI), keep the input Markdown human-first, and always
  commit the compiled artifact so reviewers see what actually runs.
- **Branch sprawl.** Personality-per-branch is cheap to create and
  therefore cheap to abuse. Mitigation: a `gmi/*` naming convention, a
  GC workflow that archives or deletes branches with no commits in N
  days, and a single `gmi/index` file on `main` that lists the active
  personalities the way a `CODEOWNERS` file lists humans. See
  `BRANCH-UPGRADE.md` §6.

---

## 7. Bottom line

gh-aw shows the world that **agents-as-Markdown**, **read-only by
default**, **safe-outputs as the write boundary**, and **MCP as the tool
boundary** are the right primitives for agentic CI.

GMI shows the world that **the repository itself can be the agent's
mind** — that conversations, identity, and state can live as ordinary
git history, owned entirely by the user.

The future GMI is the one that **keeps its soul and borrows gh-aw's
spine**: a persistent, characterful, memory-rich agent whose every action
is a validated, declarative, auditable Markdown workflow committed back
to the only database that matters — the repo.

That GMI is still installable in four steps. It still answers when you
open an issue. But underneath, it is a small, safe, declarative
multi-agent system that any reviewer can read, any user can extend in
Markdown, and any future engine — gh-aw or its successor — can host
without GMI losing what made it GMI.
