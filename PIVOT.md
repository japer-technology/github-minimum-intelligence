# PIVOT.md — The Concrete Engineering Pivot to gh-aw

A deep, file-level analysis of what would have to change in **GitHub
Minimum Intelligence (GMI)** to *fully* utilise
[**GitHub Agentic Workflows (gh-aw)**](https://github.github.com/gh-aw),
the Markdown-authored, YAML-compiled, safety-first agentic workflow framework
shipped by GitHub Next (`github/gh-aw`).

This document is a companion to [`FUTURE.md`](./FUTURE.md). FUTURE.md sketches
the strategy and a five-phase roadmap. PIVOT.md does three different jobs:

1. **Inventories what's actually in the repo today** (file by file) and tags
   each thing as *keep*, *replace*, *split*, or *delete*.
2. **Specifies the target shape** of a fully gh-aw-native GMI — frontmatter,
   safe-outputs, MCP boundaries, the compiled `.lock.yml` artefact, and the
   identity/memory primitives that gh-aw does **not** provide.
3. **Stress-tests FUTURE.md.** Where is FUTURE.md right? Where is it
   under-specified, optimistic, or quietly self-contradictory? What did it
   miss?

The goal is to leave a reader with enough detail to start the work on a
Monday morning — not just enthusiasm for the direction.

---

## 0. TL;DR of the pivot

- The single biggest blocker to "fully using gh-aw" is that **the agent job
  holds `contents: write`, `issues: write`, and `actions: write` and calls
  `git push` itself** (workflow lines 70–74; `agent.ts` lines 390–415).
  gh-aw's entire safety model is incompatible with this. Until that split
  happens, every other gh-aw primitive (safe-outputs, network isolation,
  sanitised inputs, `strict: true`) is theatre.
- The agent's **session memory model overlaps but does not align with
  gh-aw's built-in memory primitives.** gh-aw ships three: `cache-memory`
  (ephemeral, Actions-cache-backed), `repo-memory` (a dedicated
  `memory/agent-notes` git branch), and `comment-memory` (state pinned to
  the triggering issue/PR). None of them is the same shape as GMI's
  `state/sessions/*.jsonl` + `memory.log` on `main`. The honest question
  is not "how do we add memory to gh-aw?" — it is "do we adopt
  `repo-memory` and lose git-on-main as the audit surface, or keep
  GMI's model and pay the price of a paired apply job?" PIVOT picks the
  latter in §3.2 and explains why; FUTURE.md does not engage the question.
- The `pi-mono` runtime (`bun run` of `lifecycle/agent.ts` calling the `pi`
  CLI) **cannot be one of gh-aw's five supported engines**
  (`copilot | claude | codex | gemini | opencode`). Fully utilising gh-aw
  means **giving up `pi`-as-engine** and re-expressing the prompt as a
  natural-language Markdown body. FUTURE.md does not name this trade-off;
  it should be the first slide of any internal pitch.
- The install story (`workflow_dispatch` → curl zip → cp -R, lines 95–230 of
  the workflow) **collides head-on with `gh aw compile`'s assumption that the
  repo owner runs the CLI locally**. The right answer is *not* a bespoke
  curl-and-tar dance: gh-aw ships an official setup action
  (`github/gh-aw/actions/setup-cli@<version>`) and an
  `agentics-maintenance.yml` operator workflow that exposes `upgrade`,
  `disable`/`enable`, `safe_outputs` replay, and `create_labels` over
  `workflow_dispatch`. Wire those in and the user still never installs a
  CLI. FUTURE.md gestures at this in §4.3 but does not nail the mechanism.
- gh-aw is not a single product — it is **a CLI, an `agentic-workflows`
  MCP tool, an `actions/setup-cli` GitHub Action, an operator
  workflow (`agentics-maintenance.yml`), a shared-workflow library
  (`githubnext/agentics` consumed via `gh aw add`), an egress firewall
  (`gh-aw-firewall`), and an MCP gateway (`gh-aw-mcpg`)**. FUTURE.md and
  the current draft of PIVOT both treat gh-aw as if it were only the
  compiler. §6 below maps the full interaction surface and picks which
  pieces GMI should adopt where.
- Most of GMI's defensible value (`AGENTS.md`, `state/sessions/*.jsonl`, the
  hatch ritual, `memory.log`, the `.pi/skills/` library) is **orthogonal to
  gh-aw**. The pivot does not threaten it; it reframes it. The right
  packaging is a **`gmi-mcp` server** that any gh-aw workflow — GMI's own or
  third-party — can allowlist.

If the project does only one of the things in this document, do **§3.1**
(read-only agent + safe-outputs job). Everything else is a downstream
beneficiary of that one cut.

---

## 1. Inventory: what's in the repo today, what happens to it

The file paths below are relative to repo root.

### 1.1 Workflows

| Path | Today | Pivot verdict |
|---|---|---|
| `.github/workflows/github-minimum-intelligence-agent.yml` | One 450-line YAML hand-coded workflow with two jobs (`run-install`, `run-agent`). `run-agent` has `contents: write`, `issues: write`, `actions: write` and executes `agent.ts` which calls `git push`. | **Split.** Becomes (a) one gh-aw Markdown workflow `.github/workflows/gmi-issue-agent.md` compiled to `.lock.yml`, with `permissions: { contents: read, issues: read }` and an `add-comment:` safe-output; and (b) a small **memory-apply** workflow (see §3.2) that consumes a sanitised JSONL delta artifact. The `run-install` job moves to its own non-agentic workflow (it never needed the agent runtime). |
| `.github/workflows/gmi-public-fabric.yml` | Publishes a `status.json` to a public surface. | **Keep as-is**; it is a plain GitHub Action, not an agentic one, and gh-aw has nothing to add. |

### 1.2 Orchestrator code

| Path | Today | Pivot verdict |
|---|---|---|
| `.github-minimum-intelligence/lifecycle/agent.ts` (467 lines) | Fetches issue, resolves/creates session, runs `pi` binary, extracts reply via `tac | jq`, writes JSONL, git-commits, pushes with retry, posts comment, swaps reactions. | **Delete in its current form.** Its responsibilities split three ways: (1) prompt assembly → frontmatter + Markdown body of a gh-aw workflow; (2) `pi` execution → replaced by one of gh-aw's supported engines; (3) git-commit of memory → moved into a separate apply job that consumes a structured `session-delta.json` (see §3.2). Some helpers (push retry, JSONL extraction) survive as utilities in the apply job. |
| `.github-minimum-intelligence/lifecycle/local-chat.ts` + `local-chat.test.ts` | Local-only conversation runner. | **Keep.** Provides the offline mode FUTURE.md §5 (Phase 5) wants. Should be re-pointed at the new `gmi-mcp` server so local mode and CI mode share one memory API. |

### 1.3 Identity and personality

| Path | Today | Pivot verdict |
|---|---|---|
| `.github-minimum-intelligence/AGENTS.md` | The agent's "soul file". | **Keep, elevate.** Becomes the single source of identity injected into every sub-agent's system prompt by the *identity broker* (§4.2). Add a `soul_version:` field so identity migrations are reviewable in git diffs. |
| `.github-minimum-intelligence/.pi/APPEND_SYSTEM.md` | Boilerplate appended to every `pi` run. | **Re-author as Markdown body fragment** included by every gh-aw workflow via the gh-aw `imports:` / `@include` mechanism (one of the few features gh-aw provides that GMI doesn't yet exploit). |
| `.github-minimum-intelligence/.pi/BOOTSTRAP.md` | The hatch ritual prompt. | **Becomes a gh-aw workflow:** `gmi-hatch.md` triggered by `issues: { types: [labeled] } if: github.event.label.name == 'hatch'`. The hatch ritual is exactly the kind of one-shot, narrowly scoped agent gh-aw was designed for. |
| `.github-minimum-intelligence/.pi/skills/{memory,skill-creator}` | `pi`-specific skill definitions. | **Re-platform as MCP tools** exposed by `gmi-mcp` (see §4.1). Skills are GMI's plug-in surface; right now they are tightly coupled to `pi`. Decoupling them is a prerequisite for being engine-agnostic. |
| `.github-minimum-intelligence/.pi/prompts/{code-review,issue-triage}.md` | Library of prompt templates. | **Promote to first-class gh-aw workflows:** `gmi-code-review.md` (on `pull_request_review`) and `gmi-triage.md` (on `issues.labeled`). Each gains its own frontmatter, safe-output declaration, and `.lock.yml`. |
| `.github-minimum-intelligence/.pi/extensions/github-context.ts` | `pi` runtime hook to read GH context. | **Delete.** gh-aw injects this via `${{ github.* }}` and sanitised step outputs. |

### 1.4 State and memory

| Path | Today | Pivot verdict |
|---|---|---|
| `.github-minimum-intelligence/state/sessions/*.jsonl` | Per-conversation transcripts; committed every turn. | **Keep the storage; change the writer.** No longer written by the agent job — written by the apply job after schema validation. |
| `.github-minimum-intelligence/state/issues/N.json` | Mapping of issue # → session file. | **Keep, generalise.** Expand to `state/threads/<kind>/<n>.json` where `<kind> ∈ {issue, pr, discussion, schedule}`. The PR/standup/discussion sub-agents FUTURE.md proposes all need their own thread kinds. |
| `memory.log` (created on demand at repo root) | Append-only long-term memory with `merge=union` git attribute. | **Keep verbatim.** This is one of the few pieces of the design that works *because* it is git-native. gh-aw has nothing equivalent and likely won't — keep it as is and expose it via `gmi-mcp memory.search`. |
| `.github-minimum-intelligence/state/user.md` | Per-user notes. | **Keep**; expose read access through `gmi-mcp identity.get_user()`. |

### 1.5 Install / upgrade

| Path | Today | Pivot verdict |
|---|---|---|
| `.github-minimum-intelligence/install/MINIMUM-INTELLIGENCE-AGENTS.md` + `settings.json` | Templates copied on fresh install. | **Keep, extend.** Add a third default file: a stub `.github/workflows/gmi-issue-agent.md` so a freshly installed repo is gh-aw-ready out of the box. |
| The 150+ lines of `run-install` bash in the workflow | Curl zip, unzip, cp, gitignore tweaks, commit/push. | **Split and shrink.** The download/copy logic stays. The bespoke `curl … gh-aw_linux_amd64.tar.gz` step is replaced by `uses: github/gh-aw/actions/setup-cli@<GH_AW_VERSION>` followed by `gh aw compile --strict --purge` in the same job. A second new workflow `agentics-maintenance.yml` (installed verbatim from gh-aw) gives operators `workflow_dispatch` buttons for `upgrade`, `disable`/`enable`, `safe_outputs` replay, and `create_labels`. The user still never needs a local CLI. |
| `.github-minimum-intelligence/VERSION` | Semver. | **Add** a parallel `GH_AW_VERSION` pin so compiled lockfiles are reproducible across upgrade cycles. The `setup-cli` action consumes this pin; `agentics-maintenance.yml`'s `upgrade` button bumps it. The install job must refuse to run when `GH_AW_VERSION` falls in the retired 0.68.4–0.71.3 billing-bug range. |
| *(new)* `agentics-maintenance.yml` | n/a today | **Add.** Shipped by gh-aw itself; copy on first install. Provides the operator-facing UI that replaces most of today's `workflow_dispatch` install flow and the future "upgrade gh-aw" path. |

### 1.6 Docs

| Path | Today | Pivot verdict |
|---|---|---|
| `docs/warning-blast-radius.md`, `docs/security-assessment.md`, `docs/incident-response.md` | Security writeups based on the current (single-job, `contents: write`) model. | **Rewrite** after Phase 1 lands. The blast-radius doc currently exists because the agent holds the write token; after the split, most of its claims are obsolete and should be replaced with a "gh-aw safe-outputs threat model" doc. |

---

## 2. What "fully utilising gh-aw" actually means

FUTURE.md says "borrow gh-aw's spine". This section pins down what that
spine *is*, primitive by primitive, against the gh-aw reference
(`github/gh-aw` → `.github/aw/github-agentic-workflows.md`).

| gh-aw primitive | What it gives you | GMI's current equivalent | Cost of adoption |
|---|---|---|---|
| **Markdown + YAML frontmatter** as the unit of authoring | A workflow is one human-readable file with `on:`, `permissions:`, `tools:`, `safe-outputs:`, `engine:`, `network:`, `strict:`, `timeout-minutes:` in frontmatter and a natural-language body. | A 450-line hand-authored YAML + a 467-line TS orchestrator. | Low *intellectually*, large *physically*. Most of the value is realised once the first workflow compiles. |
| **`engine: copilot \| claude \| codex \| gemini \| opencode`** | Pluggable model with credentials wired in by gh-aw. **Five** engines, not four. | Eight providers via `pi-mono` selected from `settings.json`. | **High.** GMI loses its 8-provider matrix down to gh-aw's 5 (and loses `pi` itself). This is the single biggest *capability* loss. Mitigation: keep `pi`-mode available behind a `engine: pi` opt-out that *doesn't* compile with `gh aw compile` (degrades to today's workflow). |
| **`safe-outputs:`** | Schema-validated structured output consumed by a separate write-only job. Built-ins: `add-comment`, `add-labels`, `add-pr-comment`, `create-issue`, `create-pull-request`, `create-discussion` (with `close-older-discussions:` and `close-older-issues:`), `push-to-pull-request-branch`, `upload-artifact` (incl. `skip-archive: true`), `assign-to-agent`, `create-pull-request-review-comment`, and `noop` for "produced nothing". | None. The agent posts comments by calling `gh api` itself. | Medium. The mapping for the issue-bot is `safe-outputs: { add-comment: {} }`. The harder case is *memory*; see §3.2 for the four-way decision. |
| **Built-in memory primitives** (`cache-memory`, `repo-memory`, `comment-memory`; `repo-memory` optionally surfaced as a GitHub Wiki via `wiki: true`) | gh-aw ships three persistence backends: Actions-cache-backed ephemeral state (`cache-memory`), a dedicated `memory/agent-notes` git branch (`repo-memory`, optionally projected to the repo's Wiki), and inline state pinned to the triggering issue/PR (`comment-memory`). | `state/sessions/*.jsonl` + `memory.log` committed to `main`. | **Strategic decision, not a free upgrade.** `repo-memory` overlaps with GMI's value proposition; adopting it forfeits "memory on `main`, diffable in PRs". See §3.2. |
| **`network:` allowlist** + **Agent Workflow Firewall (AWF)** | Egress firewall via `gh-aw-firewall`. Domain-based allow-listing, activity logging. | None — runner has full egress. | Low; just opt in. |
| **`tools.bash: [cat, grep, jq, …]`** | Explicit allowlist of shell commands the agent may invoke. | None — the `pi` agent has whatever `pi-mono` gives it. | Medium. Today's skills assume free-form shell. Each skill needs an audit pass to declare its minimum allowlist. |
| **`tools.github.mode: gh-proxy`** | Pre-authenticated `gh` CLI through a proxy; faster than a local MCP server. | The agent uses `gh` directly with `GITHUB_TOKEN`. | Low. |
| **MCP server allowlist** + **MCP Gateway (`gh-aw-mcpg`)** | Tools are exposed via MCP servers declared per workflow. The optional MCP Gateway routes all MCP calls through one HTTP gateway for centralised access management and auditing. | `pi-mono` exposes tools opaquely. | Medium. Worth doing because it is the right place to plug `gmi-mcp` in (§4.1), and the gateway makes per-tool audit free. |
| **`strict: true`** | Compile-time validator rejects ambiguous frontmatter. | N/A. | Free — turn on after Phase 1. |
| **Sanitised event content** (`${{ steps.sanitized.outputs.text }}`) | Pre-stripped of `@mentions`, bot triggers, prompt-injection bait. | The agent sees the raw issue body. | **High value, low effort.** This is the cheapest security upgrade in the document. |
| **`{{#if}}` templating + context expressions** | Conditional Markdown body fragments using GitHub Actions context (`${{ … }}`) and gh-aw's `{{#if}}` / `{{else}}` blocks. | None — branching is done in TS. | Free; collapses several per-trigger workflow variants into one Markdown file. |
| **Slash-command trigger** (`on: { slash_command: { name: review, … } }`) | Built-in router for `/foo` in issue/PR comments. | None — would need to be coded. | Free; gives GMI `/gmi summarise` for free (FUTURE.md §3.5). |
| **`schedule:` triggers in natural language** (`daily on weekdays`) | Cron without remembering cron syntax. | None. | Free. |
| **`skip-if-match:`** and **`forks: ["*"]`** policies | Per-trigger deduplication (so scheduled workflows don't fan out duplicate issues) and explicit fork access (PRs from forks are blocked by default). | None — fork PRs are currently allowed to run the full agent. | Free; addresses one of the largest unhandled blast-radius classes in today's GMI. |
| **Compiled `.lock.yml`** | Reviewable artefact that catches drift; a `package-lock.json` for agents. | None — every behavioural change is implicit in `agent.ts`. | Free once `gh aw compile` runs in-workflow (see §4.3). |
| **`gh aw compile --strict --actionlint --zizmor --poutine`** | Static security scanning bundle baked into the compiler. | None — there is no compile step. | Low; runs inside `setup-cli`-equipped install job. |
| **`@include` / `imports:` + `gh aw add <url>`** | Reusable Markdown fragments shared across workflows, and a CLI subcommand to pull workflows from external sources (e.g. `githubnext/agentics`) as managed imports. | None — duplication is the norm; nothing pulls from an upstream catalogue. | Low; the natural home for `APPEND_SYSTEM.md` and `AGENTS.md` injection, and a future channel for shipping GMI's own workflows as a consumable library. |
| **`agentics-maintenance.yml`** | An operator-facing workflow shipped by gh-aw exposing `workflow_dispatch` actions: `disable`/`enable` (kill-switch all agentic workflows), `upgrade` (bump gh-aw, open a PR), `safe_outputs` (replay outputs of a past run), `create_labels` (materialise labels referenced in `safe-outputs`). | None — every operator action is a manual edit + push. | Free; copy verbatim on install. Closest existing analogue of GMI's hatch ritual. |
| **`gh-aw-actions` (shared GitHub Actions library)** | Composite actions used by compiled `.lock.yml` files, including `actions/setup-cli` that installs the CLI in any GitHub Actions runner. | n/a. | Free; replaces the bespoke `curl … tar -xz` step (§4.3). |
| **`agentic-workflows` MCP tool** | Lets a Copilot-Cloud or Copilot-Chat agent run `compile`/`status`/`logs`/`audit`/`add`/`update`/`upgrade`/`fix`/`mcp-inspect` against a repo's gh-aw configuration without a local `gh` install. | n/a. | Free; the primary "GMI maintains itself" surface (see §6). |

---

## 3. The two surgeries that unblock everything

FUTURE.md is right that Phase 1 (split read-only thinking from privileged
writing) is the prerequisite. It under-specifies *how*. Here is the spec.

### 3.1 The read/write split

**Today**

```
run-agent (contents: write, issues: write, actions: write)
  └─ agent.ts                       # reads issue, runs pi, writes JSONL,
                                    # git commits, git pushes, posts comment,
                                    # adds reactions
```

**Target**

```
gmi-issue-agent.md                  # gh-aw Markdown workflow
  permissions: { contents: read, issues: read, actions: read }
  network: { allowed: [defaults, github] }
  engine: copilot                   # or claude/codex/gemini
  tools:
    github: { mode: gh-proxy, toolsets: [default] }
    bash: [cat, grep, jq, rg, tail, head]
    mcp:
      gmi-memory:                   # custom; see §4.1
        command: ["bun", ".github-minimum-intelligence/mcp/server.ts"]
  safe-outputs:
    add-comment: {}
    add-reaction: { allowed: [+1, -1, rocket] }
    upload-artifact:                # carries the session-delta.json
      name: session-delta
      path: /tmp/session-delta.json
  strict: true
  timeout-minutes: 15
  ---
  <Markdown body: identity + APPEND_SYSTEM.md + task-specific instructions>

gmi-memory-apply.yml                # plain GitHub Action (NOT agentic)
  on: workflow_run:
    workflows: [gmi-issue-agent]
    types: [completed]
  permissions: { contents: write }
  ─ download-artifact session-delta
  ─ validate against schema (state/schema/session-delta.schema.json)
  ─ apply: append JSONL lines, write state/issues/N.json, optionally write
           files declared in delta.files[]
  ─ git commit + git push (with the same retry-on-conflict loop now in agent.ts)
```

Two real consequences FUTURE.md does not call out:

1. **`workflow_run` is the right glue, not in-workflow chaining.** The
   agentic workflow must end and *publish an artifact*; the apply workflow
   triggers on completion and downloads it. This is the only pattern that
   satisfies "the agent never holds the write token" while also being
   restartable and auditable. In-workflow `needs:` doesn't help — the
   agent job and the apply job would share a runner and a token if they're
   in the same workflow file.
2. **The session-delta schema is GMI's new contract.** It is *more*
   load-bearing than the API of `agent.ts` ever was, because everything —
   sub-agents, third-party gh-aw workflows that want to write memory,
   the local-chat runner — produces and consumes it. It deserves the
   same treatment as a public REST API: semver, JSON Schema, changelog,
   golden-file tests.

A minimum delta schema:

```
{
  "schema_version": "1",
  "thread": { "kind": "issue", "number": 42 },
  "turns": [                          # appended to sessions/<file>.jsonl
    { "role": "user"|"assistant"|"system", "content": "...",
      "model": "gpt-...", "ts": "ISO8601", "tokens_in": N, "tokens_out": N }
  ],
  "files": [                          # optional; each requires path allowlist
    { "path": ".github-minimum-intelligence/state/...", "op": "write"|"append",
      "content_b64": "..." }
  ],
  "memory_log": [ "Free-text line" ], # appended to memory.log
  "reactions": [ { "target": "comment|issue", "id": N, "content": "+1" } ]
}
```

The apply job's allowlist must restrict `files[].path` to a small set of
prefixes (`state/`, `memory.log`, `AGENTS.md`, `state/user.md`). This is the
guard-rail that survives a fully prompt-injected agent.

### 3.2 The memory question (revised)

The previous draft of this document called this "the memory-commit gap in
safe-outputs" and treated gh-aw as if it had no persistence story. That
was wrong. gh-aw ships **three native memory primitives** (`memory.md` in
the gh-aw reference docs). Reframing the decision honestly:

| gh-aw primitive | Backend | Survives across runs | Visible in `git log main` | Diffable in PR review | Matches GMI's model? |
|---|---|---|---|---|---|
| `cache-memory` | `actions/cache` directory at `/tmp/gh-aw/cache-memory/` populated by `@modelcontextprotocol/server-memory` | Up to 90 days (`retention-days:`) | No | No | No — ephemeral; "first run after expiry" silently re-establishes baseline |
| `repo-memory` | Dedicated git branch (default `memory/agent-notes`) | Indefinitely | Only on the memory branch | Only via cross-branch diff | **Partially** — survives, but on a side-branch, not on `main` |
| `repo-memory` with `wiki: true` | Same as above, surfaced as GitHub Wiki pages | Indefinitely | Wiki history, not `main` | Wiki diff, not PR | Partially |
| `comment-memory` | A pinned comment on the triggering issue/PR | Until the issue is deleted | No | No | No — per-thread, not corpus-wide |
| **GMI today** | `state/sessions/*.jsonl` + `memory.log` committed to `main` | Indefinitely | **Yes** | **Yes** | — (this is the model) |

Two things follow:

1. **gh-aw has memory; GMI's memory is differently shaped.** The pivot
   is not "add memory to gh-aw"; it is "decide whether to swap GMI's
   memory model for `repo-memory` and gain the entire gh-aw safety
   posture for free, or keep memory-on-main and pay the price of a
   paired apply job".
2. **The defensible product story lives or dies on this choice.** Memory
   on `main`, diffable in PRs, reachable by `git log` and `git blame`,
   is the single most distinctive GMI capability. `repo-memory` on a
   side-branch is *technically* persistent but loses every property that
   makes GMI feel different from "Copilot in a workflow". Adopting
   `repo-memory` shrinks the product to "gh-aw plus AGENTS.md".

The recommendation, then, is the same as before (artifact + paired apply
workflow) — but the *reason* is different. It is not because gh-aw can't
persist; it is because gh-aw's persistence does not preserve the
property GMI is built around.

There are four credible paths; pick consciously.

1. **Adopt `repo-memory` and accept the model change.** Lowest engineering
   cost. Loses memory-on-main. Forfeits the time-travel demo. Reduces
   GMI's differentiation. Acceptable only if the team has already decided
   the differentiation isn't worth the maintenance bill.
2. **Artifact + paired apply workflow** (the path recommended below).
   100% works today, zero changes to gh-aw, costs one extra workflow file
   per repo and a few seconds of `workflow_run` latency. Keeps
   memory-on-main. **Recommended default.**
3. **Custom safe-output type.** Petition `github/gh-aw` to add a
   `commit-files:` safe-output with a path allowlist and a max-size cap.
   Politically slow; the right long-term resolution if the gh-aw team
   agrees that "commit to main" is a category of output worth landing
   upstream. Until then, ship option 2.
4. **`push-to-pull-request-branch` ab-use.** The existing safe-output
   could be coerced into pushing memory-deltas to a long-lived
   `gmi/memory` branch as auto-merging PRs. Clever and creepy;
   auto-merging bot PRs back into `main` recreates the very blast radius
   the pivot is trying to reduce. **Not recommended.**

FUTURE.md picks none of these explicitly. PIVOT.md picks option 2 and
treats option 1 as the live alternative — the team should ratify the
choice before any `.lock.yml` ships.

The **artifact-plus-apply pattern** itself is the one already specified
in §3.1; the session-delta schema, the path allowlist, and the
`workflow_run` glue all carry over unchanged.

---

## 4. The GMI-shaped pieces gh-aw can't give you

If GMI does only the work above, it becomes "gh-aw plus a folder of nice
prompts". The defensible product is in three pieces gh-aw will not absorb.

### 4.1 `gmi-mcp` — the memory and identity MCP server

A small, single-file Node/Bun MCP server living at
`.github-minimum-intelligence/mcp/server.ts`. Tools (suggested initial
surface):

| Tool | Purpose | Read/Write |
|---|---|---|
| `session.read(thread_kind, number, range?)` | Stream prior JSONL turns. | R |
| `session.search(query, k=5)` | Top-k semantic hits across all sessions, served from `state/index/`. | R |
| `session.summarise(thread_kind, number)` | Return / refresh a stored summary; *produces a delta*, does not commit. | R+ (returns delta) |
| `memory.search(query)` | Grep + rank over `memory.log`. | R |
| `memory.append(line)` | Returns a memory-delta to be committed by the apply job. | R+ (returns delta) |
| `identity.get()` | `AGENTS.md` + soul-version + recent identity diffs. | R |
| `identity.broker(workflow_name)` | The composed system prompt prefix for any sub-agent — identity, user-notes, the last N relevant memory hits, the `APPEND_SYSTEM.md` boilerplate. | R |
| `repo.history(path, since)` | What changed near this file and by whom. | R |
| `skills.list()` / `skills.read(name)` | The skills library, now MCP-addressable. | R |

Three deliberate constraints:

- **No tool writes the working tree.** Every "write" tool returns a
  delta fragment. The agent assembles fragments into `session-delta.json`
  and emits it as the artifact. The apply job is the only thing that
  touches disk.
- **No tool reads outside `.github-minimum-intelligence/state/`,
  `memory.log`, `AGENTS.md`, `state/user.md`.** This is the privacy
  boundary. Sub-agents that need general filesystem access use gh-aw's
  `tools.edit` / `tools.bash` directly; the MCP server stays narrow.
- **The same server runs in CI and locally.** `local-chat.ts` shells
  out to it the same way the agentic workflow does. This is the only
  way to guarantee that local mode (FUTURE.md §5) and CI mode share
  semantics.

FUTURE.md proposes this server but doesn't bound its surface. Without
bounds, it grows; once it has filesystem-write tools, it has the same
blast radius as today's agent.

### 4.2 The identity broker

A 30-line module — *not* a service — that composes the system-prompt
prefix used by *every* GMI sub-agent. Inputs: `AGENTS.md`, the last 10
lines of `memory.log`, the top-k semantic hits for the current
prompt, `state/user.md`, the workflow name. Output: a deterministic
Markdown blob that goes at the top of every workflow's body via the
gh-aw `@include` mechanism.

Two non-obvious properties:

- **Deterministic ordering.** Identity always first, user notes second,
  long-term memory third, fresh task last. If a sub-agent overrides the
  voice, the override goes *after* identity but *before* the task — a
  fixed slot, not a free-for-all. This prevents the "every sub-agent
  drifts a little" failure FUTURE.md §6 worries about.
- **Versioned.** `AGENTS.md` gains a `soul_version: N` frontmatter line.
  The broker refuses to compose if the soul-version is missing or has
  decreased. Identity migrations become explicit, reviewable events.

### 4.3 In-workflow compilation, the right way

FUTURE.md §4.3 promises "compilation inside the workflow (no CLI)". The
mechanism is **not** a hand-rolled `curl … tar -xz` step. gh-aw ships an
official composite action precisely for this — and a second workflow that
handles upgrades for you. Use both.

```yaml
# inside run-install
- uses: github/gh-aw/actions/setup-cli@v0.74.2   # pin matches GH_AW_VERSION
- run: gh aw compile --strict --purge --actionlint --zizmor --poutine
```

Then the existing commit step picks up both the `.md` workflows and
their `.lock.yml` siblings. The user still never installs a CLI. The
compile step also runs the static security gate as a build-time check.

The upgrade story is delegated entirely to `agentics-maintenance.yml`,
which gh-aw publishes and which the install job should drop in on first
run. It exposes four `workflow_dispatch` actions:

| Action | Effect |
|---|---|
| `upgrade` | Bumps the gh-aw version (and `GH_AW_VERSION` pin), runs codemods via `gh aw fix`, recompiles, opens a PR. |
| `disable` / `enable` | Kill-switch all agentic workflows in one click. |
| `safe_outputs` | Replays the safe outputs of a previous run — invaluable when a write job failed and you want to retry without re-running the agent. |
| `create_labels` | Materialises any labels referenced by `safe-outputs.add-labels` configurations. |

This is the same operator surface GMI was going to have to build by
hand. Adopting it is one `cp` in the install job.

Two things FUTURE.md misses about this:

- **The `.lock.yml` files have to be in git for the workflows to run at
  all.** gh-aw is the compiler; GitHub Actions runs the lockfile. So
  every PR a contributor makes to a `.md` workflow ships with a recompile,
  and reviewers diff the lockfile. This needs CI enforcement
  (`gh aw compile --validate` in PR CI — the `--validate` flag validates
  without emitting lock files, replacing the older `--check` naming the
  earlier draft of this document used) or the lockfile will silently
  drift. The same `setup-cli` action makes the CI step a one-liner.
- **The `GH_AW_VERSION` pin is mandatory.** The gh-aw release notes
  (per the upstream README) warn about a billing-impact bug in
  0.68.4–0.71.3. Floating versions are not safe. The install job must
  refuse to compile if `GH_AW_VERSION` falls in a known-bad range; the
  list lives next to `VERSION` and gets bumped on upgrade. The
  `upgrade` button in `agentics-maintenance.yml` is the right
  enforcement point — it should refuse to land a PR whose target
  version is on the deny-list.

---

## 5. A revised, more honest phasing

FUTURE.md's five phases are directionally right. Two corrections:

### 5.1 Phase 1 is two phases, not one

FUTURE.md's Phase 1 is "split into `think.ts` and `apply.ts` and run them
as two jobs in the same workflow". That is not enough to get gh-aw's
guarantees — same workflow means same `GITHUB_TOKEN` scope policy
unless explicit per-job `permissions:` blocks are used, and same workflow
means the agent can in principle write secrets to artefacts the apply job
will read. The cleaner split is:

- **Phase 1a — same-workflow split.** Two jobs, separate `permissions:`
  blocks, schema-validated delta passed via job output. Ships in days,
  unblocks everything, but the agent job still has whatever the workflow
  declared at the top.
- **Phase 1b — cross-workflow split via `workflow_run`.** The agent
  workflow is read-only top to bottom. A second workflow listens for its
  completion and performs writes. Ships in weeks, but this is the version
  that lets you declare `permissions: read-all` on the agent workflow
  and mean it.

Skip neither.

### 5.2 Phase 4 ("Interop with gh-aw") should be Phase 2

FUTURE.md treats gh-aw interop as a late-stage flourish. That ordering
is backwards: once the read/write split exists, the cheapest next move is
to express *one* sub-agent (the triage agent — simplest, smallest blast
radius, gh-aw's own canonical example) as a gh-aw Markdown workflow with
`engine: copilot`. The win is huge: it dogfoods the new architecture
end-to-end on a non-critical path, it produces the first `.lock.yml` in
the repo, and it lets the team learn the gh-aw operational surface before
the issue-bot itself depends on it. Demoting `gmi-mcp` to *after* this
step is fine — the triage agent doesn't need memory.

### 5.3 What FUTURE.md gets right and shouldn't second-guess

- The framing "keep the soul, borrow the spine" is exactly right.
- The insistence that the *default* install must remain four steps is
  the discipline that keeps GMI distinct from gh-aw. Don't soften this.
- Time-travel debugging (Phase 5) is a genuinely unique capability that
  *only* git-as-memory enables. Make it a public demo as early as you
  can — it is the strongest single argument for the persistence model.

### 5.4 What FUTURE.md is too optimistic about

- **"Phase 1 has no user-visible change."** False. The agent's
  end-to-end latency grows by the duration of one `workflow_run` cycle
  (typically 15–45 seconds). Users will notice. Document it.
- **"`gmi-mcp` published as a standalone package is enough to survive if
  gh-aw absorbs memory."** Only partially. The standalone server saves
  the *interface*; it does not save GMI's *brand*. If gh-aw ships memory,
  GMI's market story needs a different anchor (identity continuity,
  multi-repo federation, time-travel) ready in the same release cycle.
- **"Multi-repo memory federation" (Phase 5).** This collides with the
  privacy posture in `docs/security-assessment.md` — repos contain
  arbitrary user data, and a federation mechanism that publishes a
  "sanitised digest" needs a credible sanitiser. The two paragraphs in
  FUTURE.md aren't a design; they're a research project. Flag it as
  such or drop it from Phase 5.

### 5.5 What FUTURE.md misses entirely

- **Cost.** Splitting one job into two roughly doubles runner-minutes
  for the cheap leg of the work and adds artifact storage. For a
  popular GMI install (dozens of issues/day), this is real money.
  Quantify before promising.
- **Engine lock-in.** Going from 8 providers (today) to 5
  (gh-aw-supported) is a downgrade users will notice — particularly
  those using Groq for speed or Mistral for cost. The mitigation is the
  `engine: pi` opt-out described in §2, which means GMI must support
  *both* compilation paths forever. That's a maintenance commitment the
  roadmap should own up to.
- **The `pi` ecosystem ties.** `pi-mono`, `pi-mcp`, and the `.pi/`
  directory naming are not throwaway choices — they signal alignment
  with a particular runtime. The pivot dilutes that alignment. Decide
  consciously whether GMI's identity remains "the pi agent that lives
  in a repo" or becomes "the agent that lives in a repo".
- **Discoverability of `.lock.yml` drift.** Add a tiny scheduled gh-aw
  workflow (`gmi-self-check.md`, `on: schedule: daily`) that runs
  `gh aw compile --check` and opens an issue if any lockfile is stale.
  Without this, the lockfile becomes the new place bugs hide.
- **Telemetry.** gh-aw emits structured workflow logs. GMI today commits
  every turn to git, which is also a kind of telemetry. The pivot is a
  good moment to decide what is *gh-aw telemetry* (transient, queryable
  via `gh run view`) vs *GMI memory* (durable, committed). Mixing them
  produces a worst-of-both-worlds situation where everything is in two
  places and neither is canonical.

---

## 6. Alternative interaction surfaces with gh-aw

gh-aw is a *compiler*, but the part of gh-aw GMI's operator and
contributors will spend the most time with is not the compiler — it is
one of the **six surfaces** below. PIVOT.md and FUTURE.md both elide
this; the result is a roadmap that treats `gh aw compile` as a verb and
nothing else. The richer surface map matters because the answer to "how
do I upgrade GMI?", "how do I trigger the issue-bot off-cycle?", and
"how do I see why yesterday's run failed?" is different on each one.

| Surface | Where it runs | What it's for | GMI adoption |
|---|---|---|---|
| **`gh aw` CLI** | Local terminal with `gh` auth | Authoring loop (`init`, `compile`, `run`, `logs`, `audit`, `fix`, `add`, `update`, `mcp inspect`) for developers working on workflow Markdown locally | **Recommended for contributors.** Document in CONTRIBUTING; never required of end users. |
| **`agentic-workflows` MCP tool** | GitHub Copilot Cloud, Copilot Chat, Copilot coding agent | Pre-configured MCP server exposing `compile` / `status` / `logs` / `audit` / `audit-diff` / `add` / `update` / `upgrade` / `fix` / `mcp-inspect` so a Copilot session can maintain a repo's gh-aw configuration with no local install | **Adopt as primary self-maintenance surface.** This is the natural answer to "GMI maintains itself" — the issue-bot's own upgrades become a Copilot Chat session that calls `upgrade` and `compile` against this repo. |
| **`github/gh-aw/actions/setup-cli`** | Inside any GitHub Actions runner | Installs the pinned `gh aw` CLI so workflow steps can run `compile`, `fix`, `audit`, `update`, `deploy` from CI | **Adopt** in `run-install`, in PR-CI for lockfile drift checks (`gh aw compile --validate`), and in the daily `gmi-self-check.md` drift sentry (FUTURE.md §6). |
| **`agentics-maintenance.yml`** | The repo itself, via `workflow_dispatch` in the GitHub UI | Operator buttons: `upgrade`, `disable` / `enable`, `safe_outputs` replay, `create_labels` | **Adopt verbatim.** Replaces most of today's bespoke `run-install` UI. Importantly: this is the *only* surface a non-technical end user ever needs. |
| **GitHub MCP `create_workflow_dispatch`** | Any MCP-capable client, including Copilot | The MCP-equivalent of `gh aw run` for environments where the gh-aw CLI is unavailable but the GitHub MCP server is | **Document but don't depend on.** Use it as the documented fallback for "trigger a GMI agent from Copilot Chat without leaving the chat". |
| **`gh aw add <url>` (shared workflow imports)** | Local CLI *or* the `agentic-workflows` MCP tool's `add` | Pulls a workflow from another repo (e.g. `githubnext/agentics`) as a managed import, with version pinning and `gh aw update` for upgrades | **Adopt in two directions.** Inbound: GMI consumes upstream `githubnext/agentics` workflows as starting points instead of re-authoring (e.g. `ci-doctor`). Outbound: GMI *publishes* its triage/PR-review/standup workflows as importables so other repos can `gh aw add japer-technology/github-minimum-intelligence/<workflow>`. This is GMI's most plausible distribution channel post-pivot. |

Two cross-cutting observations.

**The interaction surface is part of the security model.** If end users
only ever touch `agentics-maintenance.yml`'s buttons, then write
permissions on the repo collapse to a small, audited set of
`workflow_dispatch` events — a stronger guarantee than today's
`workflow_dispatch` install flow, which authorises an entire bash script
to run with the repo's token. The pivot is not just about read/write
splits inside the agent; it is also about narrowing what humans can do
without going through gh-aw's vocabulary. Make that visible in the
security writeup.

**The interaction surface is part of the brand.** If the canonical way
to install GMI becomes `gh aw add japer-technology/github-minimum-intelligence/issue-agent`
(the same `<owner>/<repo>/<workflow>` shorthand `gh aw add` accepts for
`githubnext/agentics/ci-doctor`),
then GMI's identity shifts from "the bot whose four-click install you
copy-paste" to "the agent library you pull from a catalogue". That is a
different product. The Phase-1 install should keep the original
four-click path while adding `gh aw add` as the second-class option;
once the catalogue ecosystem matures (and once `agentics-maintenance.yml`
is doing the operator work the install flow used to do), the second
option becomes the first and the original install collapses to a thin
wrapper. The roadmap should set this transition as Phase 5.

---

## 7. A minimum-viable pivot in one page

If a single contributor took this on and could ship only one PR:

```
.github/workflows/
  gmi-triage.md                     # NEW — first gh-aw workflow, on: issues.labeled
  gmi-triage.lock.yml               # NEW — committed compiled artifact
  github-minimum-intelligence-agent.yml
                                    # MODIFIED — run-install gains a "gh aw compile" step
.github-minimum-intelligence/
  GH_AW_VERSION                     # NEW — pins gh-aw release
  install/
    gmi-issue-agent.md.template     # NEW — template for the future Markdown issue agent
```

That PR:

- Adds **zero risk** to the existing issue-bot (it keeps running).
- Produces **one working gh-aw workflow** (the triage agent) end-to-end.
- Forces the repo to learn `gh aw compile`, lockfile review, safe-outputs,
  sanitised inputs, and `strict: true` on a low-stakes target.
- Leaves Phase 1 (the read/write split of the main agent) as the obvious
  next PR.

This is the right shape of the pivot's first commit. The roadmap in
FUTURE.md tells you where to go; this PR is how to take the first step
without betting the product on the second.

---

## 8. Closing argument

`FUTURE.md` ends with a claim: *"The future GMI keeps its soul and
borrows gh-aw's spine."* That is the right tagline. PIVOT.md's
contribution is to make the spine literal — **and to admit that the
spine has joints FUTURE.md didn't draw**.

- Spine, vertebra by vertebra, is the **nineteen primitives** in §2 —
  not fourteen, and including the three native memory primitives
  FUTURE.md treated as missing.
- The soul, organ by organ, is the **three pieces in §4** that gh-aw
  will not absorb: persistent committed memory *on `main`* (the
  conscious non-adoption of `repo-memory`), a versioned identity
  broker, a four-step zero-CLI install.
- The single nerve connecting them is the **`session-delta.json`
  contract** in §3.1 — without it, every other promise is hand-wave.
- The first incision is the **read/write split** in §3.1, executed as
  two phases (1a in-workflow, 1b cross-workflow) rather than the one
  FUTURE.md sketches.
- The skin — what the human actually touches — is the **six interaction
  surfaces** in §6. Most of the project's "do I want to keep building
  GMI?" questions resolve themselves once you decide that the answer
  is `agentics-maintenance.yml` for end users, `agentic-workflows` MCP
  for self-maintenance, and `gh aw add` for distribution.

Do those, and a year from now GMI is a polished single-agent product on
the surface, a multi-agent gh-aw-native system in the middle, a
git-committed conversational memory at the core, and an importable
catalogue entry at the edge — installable in four clicks, auditable in
`git diff`, upgradeable from a Copilot Chat session, and impossible to
confuse with any other agent in the ecosystem.

Don't do them, and gh-aw eats the use case.
