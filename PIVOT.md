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
- The agent's **session memory model is fundamentally incompatible with
  safe-outputs** as currently specified — gh-aw's write job knows how to
  `add-comment` / `add-labels` / `create-issue`, but it does not know how to
  append a JSONL transcript to `state/sessions/*.jsonl`. GMI must either
  ship a custom safe-output type (a memory-commit MCP service consumed by the
  apply job) or accept that memory writes live in a non-gh-aw sidecar.
  FUTURE.md elides this; it is the single hardest design question in the pivot.
- The `pi-mono` runtime (`bun run` of `lifecycle/agent.ts` calling the `pi`
  CLI) **cannot be one of gh-aw's four supported engines**
  (`copilot | claude | codex | gemini | opencode`). Fully utilising gh-aw
  means **giving up `pi`-as-engine** and re-expressing the prompt as a
  natural-language Markdown body. FUTURE.md does not name this trade-off;
  it should be the first slide of any internal pitch.
- The install story (`workflow_dispatch` → curl zip → cp -R, lines 95–230 of
  the workflow) **collides head-on with `gh aw compile`'s assumption that the
  repo owner runs the CLI locally**. The right answer is to ship a tiny
  `gh aw compile` step *inside* the existing `run-install` job — the user
  still never installs a CLI. FUTURE.md gestures at this in §4.3 but does
  not nail the mechanism.
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
| The 150+ lines of `run-install` bash in the workflow | Curl zip, unzip, cp, gitignore tweaks, commit/push. | **Split.** The download/copy logic stays. A new step — `gh aw compile` — runs inside the same job, producing `.lock.yml` files committed alongside the Markdown sources. The user still never needs a local CLI. |
| `.github-minimum-intelligence/VERSION` | Semver. | **Add** a parallel `GH_AW_VERSION` pin so compiled lockfiles are reproducible across upgrade cycles. |

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
| **`engine: copilot \| claude \| codex \| gemini \| opencode`** | Pluggable model with credentials wired in by gh-aw. | Eight providers via `pi-mono` selected from `settings.json`. | **High.** GMI loses its 8-provider matrix down to gh-aw's 4 (and loses `pi` itself). This is the single biggest *capability* loss. Mitigation: keep `pi`-mode available behind a `engine: pi` opt-out that *doesn't* compile with `gh aw compile` (degrades to today's workflow). |
| **`safe-outputs:`** | Schema-validated structured output consumed by a separate write-only job. Built-ins: `add-comment`, `add-labels`, `create-issue`, `create-pull-request`, `create-discussion`, `push-to-pull-request-branch`, `upload-artifact`, `assign-to-agent`, `create-pull-request-review-comment`. | None. The agent posts comments by calling `gh api` itself. | Medium. The mapping for the issue-bot is `safe-outputs: { add-comment: {} }`. The harder case is *memory*: there is no built-in `commit-files` safe-output. See §3.2. |
| **`network:` allowlist** | Egress firewall via `gh-aw-firewall`. | None — runner has full egress. | Low; just opt in. |
| **`tools.bash: [cat, grep, jq, …]`** | Explicit allowlist of shell commands the agent may invoke. | None — the `pi` agent has whatever `pi-mono` gives it. | Medium. Today's skills assume free-form shell. Each skill needs an audit pass to declare its minimum allowlist. |
| **`tools.github.mode: gh-proxy`** | Pre-authenticated `gh` CLI through a proxy; faster than a local MCP server. | The agent uses `gh` directly with `GITHUB_TOKEN`. | Low. |
| **MCP server allowlist** | Tools are exposed via MCP servers declared per workflow. | `pi-mono` exposes tools opaquely. | Medium. Worth doing because it is the right place to plug `gmi-mcp` in (§4.1). |
| **`strict: true`** | Compile-time validator rejects ambiguous frontmatter. | N/A. | Free — turn on after Phase 1. |
| **Sanitised event content** (`${{ steps.sanitized.outputs.text }}`) | Pre-stripped of `@mentions`, bot triggers, prompt-injection bait. | The agent sees the raw issue body. | **High value, low effort.** This is the cheapest security upgrade in the document. |
| **Slash-command trigger** (`on: { slash_command: { name: review, … } }`) | Built-in router for `/foo` in issue/PR comments. | None — would need to be coded. | Free; gives GMI `/gmi summarise` for free (FUTURE.md §3.5). |
| **`schedule:` triggers in natural language** (`daily on weekdays`) | Cron without remembering cron syntax. | None. | Free. |
| **Compiled `.lock.yml`** | Reviewable artefact that catches drift; a `package-lock.json` for agents. | None — every behavioural change is implicit in `agent.ts`. | Free once `gh aw compile` runs in-workflow. |
| **`gh aw compile --actionlint --zizmor --poutine`** | Static security scanning bundle. | None — there is no compile step. | Low; add to `run-install`. |
| **`@include` / `imports:`** | Reusable Markdown fragments shared across workflows. | None — duplication is the norm. | Low; the natural home for `APPEND_SYSTEM.md` and `AGENTS.md` injection. |

The honest count: of the **fourteen** primitives above, GMI today uses
**one and a half** (the `gh` CLI and a primitive form of permissions). A
"fully utilising" GMI uses **twelve** (everything except `engine:` for `pi`
holdouts and the memory-commit case where a custom output type is needed).

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

### 3.2 The memory-commit gap in safe-outputs

This is the question FUTURE.md sidesteps and the question that determines
whether gh-aw is *adoptable* or merely *compatible*.

gh-aw's safe-outputs cover **GitHub-API writes**. They do not cover
**writes to the repo's working tree**. GMI's central value proposition is
exactly the latter. There are three credible paths:

1. **Custom safe-output type.** Petition `github/gh-aw` to add a
   `commit-files:` safe-output with a path allowlist and a max-size cap.
   Probably the right long-term answer; politically slow. Until then, GMI
   can't ship a "pure gh-aw" implementation.
2. **Artifact + paired apply workflow** (the path recommended in §3.1).
   100% works today, zero changes to gh-aw, costs one extra workflow file
   per repo and a few seconds of `workflow_run` latency. **Recommended
   default.**
3. **`push-to-pull-request-branch` ab-use.** gh-aw already has a
   `push-to-pull-request-branch` safe-output. One could imagine the
   memory-delta being pushed to a long-lived `gmi/memory` branch as a PR
   that auto-merges. This is clever and creepy; auto-merging bot PRs back
   into `main` recreates the very blast radius the pivot is trying to
   reduce. **Not recommended.**

FUTURE.md should pick option 2 explicitly. PIVOT.md does so here.

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

### 4.3 In-workflow compilation

FUTURE.md §4.3 promises "compilation inside the workflow (no CLI)". The
mechanism is one step inside `run-install`:

```yaml
- name: Compile agentic workflows
  if: steps.check-folder.outputs.action != 'skip'
  run: |
    # Pin gh-aw to GH_AW_VERSION in the repo.
    VERSION="$(cat .github-minimum-intelligence/GH_AW_VERSION)"
    curl -fsSL "https://github.com/github/gh-aw/releases/download/${VERSION}/gh-aw_linux_amd64.tar.gz" \
      | tar -xz -C /tmp
    /tmp/gh-aw compile --purge --strict
```

Then the existing commit step picks up both the `.md` workflows and
their `.lock.yml` siblings. The user still never installs a CLI. The
compile step also runs `--actionlint --zizmor --poutine` as a build-time
security gate.

Two things FUTURE.md misses about this:

- **The `.lock.yml` files have to be in git for the workflows to run at
  all.** gh-aw is the compiler; GitHub Actions runs the lockfile. So
  every PR a contributor makes to a `.md` workflow ships with a recompile,
  and reviewers diff the lockfile. This needs CI enforcement
  (`gh aw compile --check` in PR CI) or the lockfile will silently drift.
- **The `GH_AW_VERSION` pin is mandatory.** The gh-aw release notes
  (per the upstream README) warn about a billing-impact bug in
  0.68.4–0.71.3. Floating versions are not safe. The install job must
  refuse to compile if `GH_AW_VERSION` falls in a known-bad range; the
  list lives next to `VERSION` and gets bumped on upgrade.

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
- **Engine lock-in.** Going from 8 providers (today) to 4
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

## 6. A minimum-viable pivot in one page

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

## 7. Closing argument

`FUTURE.md` ends with a claim: *"The future GMI keeps its soul and
borrows gh-aw's spine."* That is the right tagline. PIVOT.md's
contribution is to make the spine literal:

- Spine, vertebra by vertebra, is the **fourteen primitives** in §2.
- The soul, organ by organ, is the **three pieces in §4** that gh-aw
  will not absorb: persistent committed memory, a versioned identity
  broker, a four-step zero-CLI install.
- The single nerve connecting them is the **`session-delta.json`
  contract** in §3.1 — without it, every other promise is hand-wave.
- The first incision is the **read/write split** in §3.1, executed as
  two phases (1a in-workflow, 1b cross-workflow) rather than the one
  FUTURE.md sketches.

Do those, and a year from now GMI is a polished single-agent product on
the surface, a multi-agent gh-aw-native system in the middle, and a
git-committed conversational memory at the core — installable in four
clicks, auditable in `git diff`, and impossible to confuse with any
other agent in the ecosystem.

Don't do them, and gh-aw eats the use case.
