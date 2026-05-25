# BRANCH-UPGRADE.md — Multi-Personality GMI via Git Branches

A concrete engineering plan for turning **GitHub Minimum Intelligence
(GMI)** from a single agent on `main` into an arbitrary number of
agents, each one a long-lived branch in the same repo.

This document is the operational companion to [`FUTURE.md`](./FUTURE.md)
§4.4 and Phase 3, and slots underneath [`PIVOT.md`](./PIVOT.md). FUTURE
explains *why* branches are the right primitive; PIVOT explains how
gh-aw shapes the surrounding refactor; this file is the diff list.

> **Core assumption.** Every local AI agent **thinks inside its own git
> branch.** A personality is a branch (`gmi/<name>`). The repo's default
> branch (`main`) is reserved for human-curated state and for the
> canonical `gmi/main` personality the public meets on first install.
> Crossing into multi-agent territory is then a `git checkout -b` — no
> new repo, no new workflow file, no new install.

---

## 0. TL;DR

- **One personality = one branch.** Naming convention `gmi/<name>`.
- **The agent job checks out its own branch, not `main`.** All thinking,
  memory writes, and self-mutations happen on that branch.
- **`state/`, `.pi/`, `AGENTS.md`, `memory.log` all become branch-local.**
  Concurrency between agents is *free* because they never touch the
  same paths on the same ref.
- **Cross-agent reads are explicit:** `git show gmi/other:path` via the
  `gmi-mcp` server. No agent can silently mutate another's mind.
- **Cross-agent writes are pull requests.** Two agents disagreeing
  produces a merge conflict — a human reviews and picks.
- **Issue/PR routing** is by label, slash command, or `@gmi-<name>`
  mention. A tiny router job on `main` dispatches the event to the
  correct branch's workflow.
- **The default install is unchanged.** A first-time user still installs
  one workflow file, opens one issue, and meets one personality
  (`gmi/main`). Everything else is opt-in.

If you implement only one section, implement **§2 (workflow checkout
target)** — it unlocks every other section.

---

## 1. Current shape (what we are changing)

Today, the workflow defined in
`.github/workflows/github-minimum-intelligence-agent.yml` runs
`lifecycle/agent.ts` on a runner that:

- Checks out `main` (or whatever ref the triggering event points at).
- Reads `.pi/`, writes JSONL to `state/sessions/`, updates
  `state/issues/<n>.json`, and `git push`es back to the same branch.
- Holds `contents: write`, `issues: write`, `actions: write`.

There is exactly one personality, one identity, one memory tree, and
one writer. Two issues opened seconds apart race on `state/sessions/`
and the loser eats a `non-fast-forward` push rejection.

The branch upgrade rewrites every assumption in that paragraph.

---

## 2. Workflow changes

### 2.1 Resolve the target branch *first*

Add a leading `resolve` job that decides which `gmi/<name>` branch
should handle this event, before any LLM cost is paid:

| Trigger                         | Branch resolution                                          |
| ------------------------------- | ---------------------------------------------------------- |
| Issue opened                    | Label `gmi:<name>` → `gmi/<name>`; default `gmi/main`.     |
| Issue comment with `/gmi <verb>`| `gmi/<verb>` if it exists; else `gmi/main`.                |
| `@gmi-<name>` mention           | `gmi/<name>`.                                              |
| Pull request opened             | `gmi/pr-review`.                                           |
| `schedule:` cron                | Specified per cron entry (`gmi/standup`, `gmi/digest`, …). |
| `workflow_dispatch`             | Input `personality`, default `main`.                       |

The resolver emits `branch=gmi/<name>` as a job output. If the branch
does not exist, the resolver falls back to `gmi/main` and posts a
one-line comment ("No `gmi/<name>` personality is installed; routing to
`gmi/main`.") instead of failing.

### 2.2 `actions/checkout` uses the resolved branch

```yaml
- uses: actions/checkout@v4
  with:
    ref: ${{ needs.resolve.outputs.branch }}
    fetch-depth: 0           # we need history for memory/MCP reads
```

This is the single most important change. Every existing read in
`agent.ts` (`.pi/`, `state/sessions/`, `AGENTS.md`) now naturally
returns *that personality's* view.

### 2.3 Apply job pushes to the same branch

After the read-only `think` job (see FUTURE.md §3.1) produces
`session-delta.json`, the `apply` job:

- Checks out the same `gmi/<name>` branch.
- Validates the delta against the schema.
- Commits and pushes back to `gmi/<name>` only.
- **Never pushes to `main`.** If the delta proposes a repo change (e.g.
  a code fix the agent wants merged), it opens a PR from `gmi/<name>`
  to `main` via a `safe-outputs: create-pull-request` action.

### 2.4 Concurrency keys are per branch

```yaml
concurrency:
  group: gmi-${{ needs.resolve.outputs.branch }}-${{ github.event.issue.number || github.run_id }}
  cancel-in-progress: false
```

Two personalities never serialize against each other. Two events on the
same personality still serialize (push contention on the same branch).

---

## 3. Repository layout changes

Nothing about the on-disk layout *has* to change — the win comes from
the fact that the layout is now scoped to a branch. The few additions
that *do* live on `main`:

```
.github/workflows/github-minimum-intelligence-agent.yml   # unchanged file, new resolve+checkout logic
.github-minimum-intelligence/
  agents/
    main.md          # frontmatter: branch=gmi/main, triggers, safe-outputs
    triage.md        # frontmatter: branch=gmi/triage, …
    pr-review.md     # …
    standup.md       # …
  index.yml          # canonical list of installed personalities (see §6)
```

The per-branch layout is **identical to today's GMI** — `.pi/`,
`state/sessions/`, `state/issues/`, `AGENTS.md`, `memory.log`. A
personality branch is just "GMI as it always was, but on a non-default
ref." That is the upgrade's whole appeal: it adds no new mental model,
it just declines to share one across personalities.

### 3.1 The `gmi/main` branch

`gmi/main` is a regular `gmi/*` branch that happens to be the
default-recipient of unrouted events. It tracks `main` for non-state
files (workflows, READMEs, code) via a periodic merge job:

```
main ────●────●────●────●────●─────────  (humans + curated)
              \         \
gmi/main  ─────●─────────●───────●─────  (personality memory + .pi/)
                        merge      thinks
```

Merges from `main → gmi/main` are automatic and routine. Merges from
`gmi/main → main` are PRs, reviewed by humans. The same shape applies
to every other `gmi/<name>` branch.

---

## 4. Identity, memory, and the MCP boundary

### 4.1 Per-branch identity overlay

Each `gmi/<name>` branch carries its own `AGENTS.md` and optionally its
own `.pi/skills/`. The identity-broker (FUTURE.md §4.2) loads, in order:

1. `AGENTS.md` from `main` — the project-wide soul file.
2. `AGENTS.md` from `gmi/<name>` — the personality overlay (tone, role,
   allowed verbs, refusal style).
3. The recent `state/sessions/*.jsonl` from `gmi/<name>` — short-term
   memory.

If `gmi/<name>` has no overlay, the personality is the canonical GMI
voice with a different memory tree — useful for "same agent, isolated
context" experiments.

### 4.2 Memory is branch-local by default

`state/sessions/`, `state/issues/`, and `memory.log` live on the
personality branch. There is no shared mutable memory. This kills an
entire class of race conditions today's GMI quietly papers over by
serializing every event through a single concurrency group.

### 4.3 Cross-branch reads via `gmi-mcp`

The `gmi-mcp` server (FUTURE.md §3.3) gains two methods so any
personality can *read* (never write) any sibling's mind:

- `branch.list()` — enumerate `gmi/*` branches and their metadata.
- `branch.read(branch, path, range?)` — `git show gmi/<branch>:<path>`,
  optionally a byte range; never mutates.

This is how the standup agent on `gmi/standup` can summarize what
`gmi/pr-review` saw yesterday without either branch sharing storage.

### 4.4 Cross-branch writes are pull requests

If `gmi/triage` decides `gmi/main` should remember a fact, it opens a
PR from `gmi/triage → gmi/main` via the safe-outputs apply job. A human
(or a guardian personality, see §7) reviews. There is no API for one
agent to push to another's branch. Ever.

---

## 5. Routing and surface area

### 5.1 Issue & comment dispatch

A label `gmi:<name>` (added by humans or by `gmi/triage`) pins the
issue to that personality. Once pinned, every subsequent comment on
that issue routes to the same branch — the conversation stays with the
personality that started it. `state/issues/<n>.json` on `gmi/<name>`
records the binding; the resolver consults it before falling back to
the label.

### 5.2 Slash commands

`/gmi <verb>` in a comment maps to `gmi/<verb>` if such a branch
exists. `/gmi help` lists installed personalities from `gmi/index.yml`.
`/gmi handoff <name>` rebinds the issue and re-runs the new
personality, recording the handoff in both branches' memory.

### 5.3 PR review, scheduled, dispatch

- **PR opened / synchronized** → `gmi/pr-review`.
- **Cron** → whichever branch the cron entry names.
- **`workflow_dispatch`** → branch chosen by the dispatcher input.

### 5.4 Bootstrap a new personality

```
git fetch origin gmi/main
git checkout -b gmi/researcher gmi/main
# edit AGENTS.md to describe the new voice
git commit -am "hatch gmi/researcher"
git push -u origin gmi/researcher
# add an entry to gmi/index.yml on main via a PR
```

That is the entire ritual. The same `workflow_dispatch` install action
can automate it (`personality=researcher`, `from=gmi/main`).

---

## 6. Lifecycle: GC, archival, audit

### 6.1 `gmi/index.yml`

A single YAML file on `main` that lists active personalities. The
resolver in §2.1 only routes to branches present in the index — a
branch can exist without being installed (e.g. a draft). This makes
the install set reviewable in a PR.

```yaml
personalities:
  - name: main
    branch: gmi/main
    purpose: Default conversational agent.
  - name: triage
    branch: gmi/triage
    triggers: [issues.opened]
  - name: pr-review
    branch: gmi/pr-review
    triggers: [pull_request.opened, pull_request.synchronize]
  - name: standup
    branch: gmi/standup
    triggers: [schedule]
```

### 6.2 Branch GC

A scheduled workflow on `main` runs weekly and:

- Lists `gmi/*` branches.
- For each branch with no commits in N days **and** no entry in
  `gmi/index.yml`, opens a PR archiving the branch (tag
  `archive/gmi/<name>/<date>`, delete the branch).
- Never deletes a branch that is in the index; instead flags it.

### 6.3 Audit via `git log`

Because every personality's every thought is a commit on a branch with
a stable name, `git log gmi/<name> -- state/sessions/` is the entire
audit trail. No database, no extra UI. A human can `git diff
gmi/triage..gmi/main -- state/sessions/` to see where two personalities
disagreed about the same issue.

---

## 7. Safety and trust

The branch upgrade does **not** weaken the existing trust model; if
anything it strengthens it by reducing blast radius per agent.

- The agent runs with write access to **one branch**, not to `main`.
  Branch protection on `main` is therefore meaningful for the first
  time (today's GMI is a trusted writer to `main` by design).
- The apply job's safe-outputs allowlist is **per personality**, set in
  the agent's frontmatter. `gmi/triage` may add labels but not create
  PRs; `gmi/pr-review` may comment but not push to `main`.
- A **guardian personality** (`gmi/guardian`) can be installed whose
  sole job is to review cross-branch PRs from other personalities. It
  has no write access of its own — only the ability to approve or
  request changes.
- Prompt injection on `gmi/triage` cannot taint `gmi/main`'s memory,
  because the only path between them is a reviewable PR.

---

## 8. Migration plan (what to ship, in order)

Each step is independently shippable and preserves the current install.

1. **Create `gmi/main`** as a branch tracking today's `main`. Add the
   resolver job described in §2.1; default everything to `gmi/main`.
   Outwardly nothing changes; internally the workflow is now
   branch-aware.
2. **Move `state/` writes off `main`.** The apply job pushes to
   `gmi/main`. Add a one-way merge job (`main → gmi/main`) for
   non-state files. Branch protection on `main` becomes possible.
3. **Add `gmi/index.yml`.** Reviewable list of installed personalities;
   the resolver consults it.
4. **Ship `gmi/triage`.** First sibling personality; proves the model
   with a small, low-risk surface (labels-only safe-outputs).
5. **Add `branch.list` / `branch.read` to `gmi-mcp`.** Cross-branch
   reads become a typed API rather than implicit `git` calls.
6. **Ship `gmi/pr-review` and `gmi/standup`.** Two more personalities
   that exercise PR events and `schedule:` triggers respectively.
7. **Add the GC workflow** (§6.2) and the guardian personality (§7).
8. **Document the `git checkout -b gmi/<name>`** bootstrap as the
   official way to add a personality — no admin UI, no extra tool.

---

## 9. Risks and counter-arguments

- **Branch sprawl.** Cheap to create, easy to abuse. Mitigated by
  `gmi/index.yml` (only indexed branches receive events) plus GC.
- **Merge conflict UX.** When two personalities edit the same file and
  a human merges, conflicts will arise. This is *the right surface* —
  but it must be visible and survivable. A `gmi/conflicts/` log on
  `main` records every cross-branch PR that conflicted, with the
  personalities involved.
- **Stale identity overlays.** A `gmi/<name>` branch can drift far from
  `main`'s `AGENTS.md`. The identity-broker (§4.1) should warn when an
  overlay was forked from an `AGENTS.md` that is more than M commits
  behind.
- **Cost of `fetch-depth: 0`.** Personalities need history for memory
  reads. On large repos this is expensive. Mitigation: shallow fetch
  for the working tree, plus a sparse fetch of `state/sessions/` only.
- **GitHub UI doesn't visualize "agent branches".** True; this is a
  documentation problem, not a technical one. `gmi/index.yml` plus a
  README badge listing live personalities covers the gap until/unless
  a richer surface exists.
- **Default-branch protection conflicts with self-upgrade.** GMI today
  rewrites its own workflow file on `main`. Post-upgrade, self-upgrade
  happens on `gmi/main` and proposes a PR to `main` like any other
  cross-branch write. This is *more* auditable, but slower; document
  the new flow in `BOOTSTRAP.md`.

---

## 10. Bottom line

The repo is already the mind. Branches are already the way git lets
many minds share one repo without stepping on each other. The upgrade
is just to **stop pretending an AI agent is special** and let it have
what every human contributor has had for twenty years: a branch of its
own.

Once each agent thinks in its own branch, "multi-agent per repo" stops
being an architecture problem and becomes a naming convention. That is
the entire point.
