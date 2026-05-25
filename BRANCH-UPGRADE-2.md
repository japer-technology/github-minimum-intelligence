# BRANCH-UPGRADE-2.md — GMI meets Society of Repo

A second-pass design note for **GitHub Minimum Intelligence (GMI)**: what
happens when the *branch-per-personality* model from
[`BRANCH-UPGRADE.md`](./BRANCH-UPGRADE.md) is read through the lens of
[**Society of Repo (SOR)**](https://github.com/japer-technology/forgejo-society),
the multi-repository cognitive architecture published by Japer Technology
on top of Forgejo.

BRANCH-UPGRADE.md answered: *how do many agents share one repo without
stepping on each other?* The answer was: **a personality is a branch.**

SOR answers a different, larger question: *how do many agencies share a
forge without dissolving into one opaque mind?* Its answer is: **a role
is a repository,** under a written constitution, with named critics,
censors, memory, workspace, and services.

This document is the diff between those two answers — and the upgrade
ideas that fall out when you let them meet in one repo, then one org,
then one federation. It sits *on top of* BRANCH-UPGRADE.md (not in
place of it) and is the companion to [`FUTURE.md`](./FUTURE.md)
§4.4/Phase 4–5 and [`PIVOT.md`](./PIVOT.md) §3.

> **Working assumption.** A GMI personality is still a branch
> (`gmi/<name>`). A SOR *role* is still a repo. The upgrade is to give
> each branch a **role** — agency, critic, censor, memory, workspace,
> governance, service — and to let those roles graduate from
> *branches in one repo* to *repos in one org* without rewriting the
> agent. Branches are the larva; repos are the imago. Same animal.

---

## 0. TL;DR

- **SOR has seven role-shapes; GMI has one.** BRANCH-UPGRADE.md lets
  GMI host many personalities but treats them all as conversational
  peers. SOR insists on **typed roles** (agency, assembly, memory,
  critic, censor, governance, workspace, optionally service). Adopt
  the typology: `gmi/<role>/<name>`, e.g. `gmi/critic/evidence`,
  `gmi/memory/episodic`, `gmi/censor/egress`.
- **A workspace branch is the global blackboard.** Borrow SOR's
  *workspace* concept: a single `gmi/workspace` branch that no
  personality owns, that every personality reads, and that records
  the *current focus* and *active settlements* as commits. The
  Issue/PR thread is the stimulus; the workspace branch is the
  shared scratchpad.
- **Critics and censors are first-class branches, not optional tone.**
  `gmi/critic/*` branches *object* to proposed actions via review
  comments on the cross-branch PR; `gmi/censor/*` branches *block*
  them via a required-status check. Neither writes to `main`. Neither
  needs `contents: write` outside its own ref.
- **Governance is a file, not a feature.** A `CONSTITUTION.md` on
  `main` (plus an `authority-registry.yml`) enumerates which role may
  do what. Every safe-output is gated against it. The constitution
  is editable only by PR to `main`.
- **Memory is split by *kind*, not by *personality*.** SOR separates
  *frames*, *K-lines*, *episodic*, and *failure* memory. Map each to
  its own `gmi/memory/<kind>` branch. Today's `state/sessions/` is
  episodic memory; promote the rest.
- **The single repo is the larval Society.** When a `gmi/<role>/<name>`
  branch outgrows its blast-radius budget, the GC workflow can
  *promote* it to a sibling repo (`gmi-critic-evidence`) with an
  identical layout, an MCP bridge, and a constitution reference.
  Branches → repos → federation, with no rewrite at any step.
- **GMI stays single-install.** A first-time user still installs one
  workflow file and meets one personality (`gmi/agency/main`). All
  role infrastructure is opt-in, indexed in `gmi/index.yml`, and
  invisible until a second role is hatched.

If you implement only one section, implement **§3 (role typology +
workspace branch)** — it is the smallest change that converts a flock
of branches into a society.

---

## 1. What SOR has that BRANCH-UPGRADE.md does not

BRANCH-UPGRADE.md is a *concurrency and identity* upgrade. It makes
many GMI personalities cohabit one repo safely. It is intentionally
silent on what those personalities are *for* and how they argue.

SOR contributes four primitives BRANCH-UPGRADE.md never names:

| SOR primitive            | What it adds                                                           | GMI's current substitute  |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------- |
| **Typed roles**          | Agencies *propose*, critics *object*, censors *block*, memory *records*, workspace *focuses*, governance *authorises*. | "Personality" — untyped. |
| **Global workspace**     | A single ref where the current focus, active settlements, and recent K-lines live. Every role reads it; only the workspace coordinator writes. | The Issue thread itself. |
| **Constitution + registry** | A written law plus a machine-readable map from role → permitted action. | Per-personality safe-outputs frontmatter. |
| **Memory typology**      | Frames (templates), K-lines (recent activations), episodic (events), failure (lessons). | One `state/sessions/*.jsonl` per issue. |

The five SOR "quiet reversals" (the forge is the mind; intelligence is
a governed society; capability is granted by files; cognition persists
as git objects; sovereignty is structural) are *almost* already true of
GMI. What SOR makes explicit, GMI implies. The upgrade is to stop
implying.

---

## 2. What GMI has that SOR's GitHub mirror cannot have

The trade goes both ways. SOR is designed for self-hosted Forgejo on
owned hardware because its runtime assumptions — long-lived runners,
local egress controls, owned secrets — cannot be safely honoured on a
shared forge. GMI lives on GitHub by design and inherits a different
set of strengths:

- **gh-aw safe-outputs.** A typed, schema-validated channel from the
  read-only agent to the privileged apply job. SOR has no direct
  equivalent on GitHub because GitHub is not its execution target.
- **Branch protection + required checks.** A first-class, UI-visible
  enforcement primitive for "censor must approve before merge."
- **Issues/PRs as the stimulus surface.** Free, federated, already
  populated with humans.
- **One-file install.** SOR's bootstrap is a multi-repo provisioning
  exercise; GMI's is `workflow_dispatch`.

So: GMI should not try to *be* a Forgejo Society. It should be the
**GitHub-native, single-repo larval form** of one — a society that
fits in a branch graph until it doesn't, and then promotes itself out
into an org. This document is the design for that larval form.

---

## 3. Role typology and the workspace branch

### 3.1 Branch naming becomes `gmi/<role>/<name>`

Today BRANCH-UPGRADE.md proposes `gmi/<name>` (e.g. `gmi/triage`,
`gmi/pr-review`). Extend the convention to encode role:

```
gmi/agency/<name>      # proposes actions; consumes stimuli
gmi/assembly/<name>    # summarises agencies into higher-level briefs
gmi/critic/<name>      # objects to weak proposals; never blocks alone
gmi/censor/<name>      # blocks forbidden actions; required check
gmi/memory/<kind>      # frames | k-lines | episodic | failure
gmi/workspace          # the singleton blackboard (see §3.3)
gmi/governance         # the constitution-keeper (see §4)
gmi/service/<name>     # exposes a capability to other roles (or repos)
```

The resolver in BRANCH-UPGRADE.md §2.1 gains one column: it now also
emits `role=<role>` as a job output. Safe-outputs allowlists become
role-defaulted, with per-personality overrides:

| Role        | Default safe-outputs                     |
| ----------- | ---------------------------------------- |
| agency      | `add-comment`, `create-pull-request`     |
| assembly    | `add-comment`, `update-issue`            |
| critic      | `create-pull-request-review-comment`     |
| censor      | `set-check-status` (failure halts merge) |
| memory      | (no GitHub-side outputs; commits only)   |
| workspace   | `update-issue` (focus label only)        |
| governance  | (no auto outputs; PR-only)               |
| service     | per-service frontmatter                  |

The `index.yml` from BRANCH-UPGRADE.md §6.1 gains a `role:` key per
entry. Two personalities of the same role can coexist
(`gmi/critic/evidence` and `gmi/critic/scope`); they are siblings, not
duplicates.

### 3.2 Backwards compatibility

`gmi/main` from BRANCH-UPGRADE.md becomes an alias for
`gmi/agency/main`. The resolver accepts both forms during a deprecation
window. The user-visible label (`gmi:main`) stays the same.

### 3.3 The `gmi/workspace` branch

A singleton branch that no personality owns and that every role reads.
Its layout:

```
workspace/
  focus.json              # what issue/PR the society is attending to
  settlements/<id>.json   # accepted proposals awaiting apply
  k-lines/<topic>.jsonl   # recently activated frames per topic
  agenda.md               # human-readable digest, regenerated on commit
```

The workspace branch is updated by a tiny `gmi/coordinator` job (the
only writer) that runs after each agency proposal and each critic
objection. Every other personality fetches `gmi/workspace` read-only at
the start of its think step. This gives GMI a *global blackboard*
without a database — the SOR move, expressed in git.

Concurrency on `gmi/workspace` is serialised by a single workflow-level
concurrency group (`gmi-workspace`); the coordinator is the only thing
that races against itself, and its writes are append-only.

---

## 4. Governance: the constitution as code

### 4.1 `CONSTITUTION.md` on `main`

A short, human-authored, PR-reviewable file that enumerates:

- **Authority registry** — which role may produce which safe-output.
- **Stability tiers** — which branches are protected, which are
  experimental, which are archive-only.
- **Refusal clauses** — what no personality may do regardless of prompt
  (rewrite history on `main`, delete a memory branch, push to a
  censor's branch, etc.).
- **Cross-role escalation** — when a critic's objection becomes a
  censor's block (e.g. two critics objecting on the same PR auto-
  promotes to a censor review).

The constitution is machine-readable enough to be validated. A
`.github-minimum-intelligence/authority.yml` is generated from it on
every PR and consumed by the safe-outputs job; a mismatch fails the
build. This is the GitHub-shaped echo of SOR's
`THE-SOCIETY-OF-REPO/01-governance/`.

### 4.2 `gmi/governance` is the constitution-keeper

A personality whose only job is to:

- React to PRs that touch `CONSTITUTION.md` or `authority.yml`.
- Diff the proposed authority registry against the current one and
  post a plain-English explanation to the PR.
- Refuse to merge a constitutional change that lacks a human approver
  (enforced by branch protection + CODEOWNERS, not by the agent).

`gmi/governance` has *no* write access outside its own branch. Its
power is rhetorical and procedural, not technical — which is the SOR
position on governance: **law lives in files, enforcement lives in
review.**

### 4.3 Self-amendment

The constitution can be amended by a PR that:

1. Modifies `CONSTITUTION.md`.
2. Has a `gov:amend` label applied by a human (not by GMI).
3. Is approved by `CODEOWNERS` for `CONSTITUTION.md`.
4. Passes `gmi/governance`'s diff-explanation check.

This is the same pattern as a software-foundation bylaw change,
expressed in branch-protection rules. The agent participates; it does
not legislate.

---

## 5. Critics, censors, and the cross-branch PR

### 5.1 The proposal pipeline

Today (post-BRANCH-UPGRADE.md), a personality's proposal lands as a
PR from `gmi/<name> → main`. With roles, the pipeline lengthens:

```
stimulus (issue)
   │
   ▼
gmi/agency/<name>   ── proposes ──▶ PR to gmi/workspace
                                    │
                                    ▼
                          gmi/critic/*   ── review-comment ──▶
                                    │
                                    ▼
                          gmi/censor/*   ── required check ──▶
                                    │
                                    ▼
                          coordinator merges into gmi/workspace
                                    │
                                    ▼
                  apply job emits safe-output (label/comment/PR-to-main)
```

Notice the layering: agencies write to *workspace*, not `main`.
Workspace then triggers the apply job. `main` is touched only by a
deliberate, separately-reviewed PR — exactly the gh-aw safety model,
but with critic and censor branches sitting *inside* the PR review
flow as bots with distinct identities.

### 5.2 Critics

A critic is a personality whose only output is a review comment on a
PR to `gmi/workspace`. Critics are typed by *what they object to*:

- `gmi/critic/evidence` — "this proposal cites no commit, no log, no
  prior settlement."
- `gmi/critic/scope` — "this proposal exceeds the issue's stated
  ask."
- `gmi/critic/risk` — "this proposal touches a protected path or
  exceeds a cost budget."

A critic's objection is *advisory*. Two critics objecting on the same
PR auto-promote (see §4.1) to a censor review.

### 5.3 Censors

A censor is a personality whose output is a *required check status*
on the PR. A red censor blocks the merge; there is no override. Censor
personalities are deliberately narrow:

- `gmi/censor/egress` — "this PR adds an outbound network call to a
  non-allowlisted host."
- `gmi/censor/authority` — "this PR proposes a safe-output not
  permitted to the proposing role."
- `gmi/censor/secret` — "this PR introduces a likely secret."

Censors are the only personalities GMI is *allowed* to call from the
required-checks list on `main`. This is enforceable in branch
protection settings on day one.

### 5.4 Why this is safe on GitHub specifically

GitHub's required-status-check + branch-protection model is the exact
shape SOR's censor pattern wants. A censor is a personality whose
*only* surface is a check run; it is the cheapest possible safety
primitive. SOR has to build this on Forgejo; GMI gets it from the
platform for free.

---

## 6. Memory, typed

BRANCH-UPGRADE.md keeps memory branch-local: each personality's
`state/sessions/` lives on its own branch. SOR splits memory by *kind*
across repos. Split it by *kind* across branches:

| Branch                       | Holds                                                                 |
| ---------------------------- | --------------------------------------------------------------------- |
| `gmi/memory/episodic`        | Every session transcript (today's `state/sessions/*.jsonl`).          |
| `gmi/memory/frames`          | Reusable templates: "how a triage issue is shaped," "how a PR review is structured." Frames are versioned Markdown + JSON schema. |
| `gmi/memory/k-lines`         | Recent activation traces — which frames fired on which issues. Useful for "have we seen this before?" lookups. |
| `gmi/memory/failure`         | Post-mortems on settlements that were reverted, censored, or that the human rejected. Distinct from episodic so failures are not buried. |

Personalities continue to keep *short-term* memory on their own branch
(today's behaviour). The memory branches are *long-term, shared,
read-mostly* stores, written by `gmi/coordinator` on settlement and
read by anyone via the `gmi-mcp` `branch.read` API introduced in
BRANCH-UPGRADE.md §4.3.

This single change converts GMI from "a chat log per issue" into
something with a genuine working memory: a personality can ask
"what frame did `gmi/agency/triage` invoke last time we saw an issue
that looked like this?" by reading `gmi/memory/k-lines`.

---

## 7. Service branches and the org-scale exit

SOR's *service repos* expose capabilities to other societies. The
GitHub-shaped version is a `gmi/service/<name>` branch that:

- Defines, in frontmatter, a typed input/output schema.
- Is invoked via `repository_dispatch` or a `workflow_call`-style
  hand-off from another personality.
- Is the **graduation slot**: when a service grows past the
  blast-radius budget of "a branch in this repo," the GC workflow
  proposes promotion to a sibling repo (`org/gmi-service-<name>`).

The promotion proposal is itself a PR to `main` containing:

1. A new entry in `gmi/index.yml` pointing at the external repo.
2. A `services/<name>.lock.yml` describing the dispatch contract.
3. A CODEOWNERS update.

Once promoted, the in-repo branch becomes a thin client: it forwards
calls to the external repo via `repository_dispatch` and records the
exchange in its own memory branch. *Nothing else changes.* The
personality that consumes the service does not learn it has moved.

This is the on-ramp from "a branch graph in one repo" to "a Society of
Repo across an org" without ever forcing a rewrite. BRANCH-UPGRADE.md
is the larval architecture; service-promotion is the metamorphosis.

---

## 8. Cross-repo federation (the far end)

The far end of this road is multi-org federation, à la SOR's
`FORGEJO-SOCIETY-THE-FEDERATION/`. Spell out only what GMI needs to
not foreclose it:

- **Stable role names.** A `gmi/critic/evidence` branch in repo A must
  be addressable from repo B by the same name. The `gmi-mcp` server
  gains a `society.locate(role, name)` method that returns either a
  local branch ref or an external repo + ref.
- **A federation manifest on `main`.** `gmi/federation.yml` lists
  external societies this repo will talk to, by org, with allowlisted
  roles. Federation is *opt-in per role*: a repo can expose its
  critics to others without exposing its memory.
- **Cross-repo PR-as-message.** A message from society A to society B
  is a PR opened by a service branch in A against a workspace branch
  in B. The reply is a PR back. There is no JSON-RPC surface; the
  protocol is git.
- **The constitution governs federation.** A federated message is
  subject to the *recipient's* authority registry, not the sender's.
  This is the cheapest way to make federation safe: every society is
  sovereign over its own censors.

None of this needs to ship in the first cut. It needs to remain
*reachable* from the first cut.

---

## 9. Migration plan (delta over BRANCH-UPGRADE.md §8)

BRANCH-UPGRADE.md ships eight steps. This document adds five more,
strictly after step 8 of that plan and strictly preserving the
single-install user experience.

9.  **Introduce role-prefixed branch naming.** `gmi/main` aliases
    `gmi/agency/main`. Resolver emits `role=<role>`. Index entries
    grow a `role:` key. No user-visible change.
10. **Hatch `gmi/workspace` and `gmi/coordinator`.** Singleton
    blackboard + the only writer to it. All existing personalities
    learn to read it; none yet write proposals through it. Pure
    add-on.
11. **Convert proposals to flow through `gmi/workspace`.** Personality
    PRs target `gmi/workspace` instead of `main`. Apply job consumes
    workspace settlements and emits safe-outputs to `main`. This is
    the irreversible step; gate it behind a feature flag in
    `gmi/index.yml`.
12. **Ship `CONSTITUTION.md`, `authority.yml`, and `gmi/governance`.**
    Begin enforcing role → safe-output mapping at apply time. Critics
    and censors are *defined* in the constitution before any are
    hatched.
13. **Hatch the first critic and the first censor.**
    `gmi/critic/evidence` (advisory) and `gmi/censor/secret`
    (blocking). These two prove the review-comment + required-check
    pipeline end-to-end on a real PR.
14. **Split memory by kind.** Promote today's `state/sessions/` to
    `gmi/memory/episodic`. Add empty `frames`, `k-lines`, `failure`
    branches. Document the read-mostly contract.
15. **Define the service-branch graduation rule.** Document, but do
    not yet automate, the branch → sibling-repo promotion path.
    Federation manifest stays a stub.

Each step is independently shippable. Each is reversible up to step
11. After step 11, `main` no longer accepts direct agent writes; this
is *the* moment GMI becomes a society rather than an agent with many
hats.

---

## 10. Risks and counter-arguments

- **Role inflation.** Once roles exist, the temptation is to invent
  ten of them. Resist: the constitution lists *seven* (eight if you
  count service), and that is the upper bound until a second society
  exists to federate with. Branch GC (BRANCH-UPGRADE.md §6.2)
  archives un-indexed `gmi/critic/*`, `gmi/agency/*`, etc.
  aggressively.
- **Workspace bottleneck.** `gmi/workspace` is a single ref with one
  writer. On a high-traffic repo this serialises everything. Mitigate
  by sharding workspace per *focus* (`gmi/workspace/<issue-area>`)
  only when measured contention demands it. Do not pre-shard.
- **Constitution drift vs. authority registry.** The human-readable
  `CONSTITUTION.md` and the machine-readable `authority.yml` will
  diverge if both can be hand-edited. Solve by generating `authority.yml`
  from `CONSTITUTION.md` in CI and refusing PRs where the generated
  file disagrees with the committed one.
- **Critic theatre.** A critic that always objects is noise; a critic
  that never objects is decoration. The failure-memory branch is the
  feedback signal: track, per critic, whether its objections
  correlate with later reverts. Critics that don't earn their keep
  get archived.
- **Censor false positives block real work.** A censor's `failure`
  status is hard-blocking. Mitigate by requiring each censor to ship
  with a documented override path that requires a human review on
  `main` (no agent can bypass a censor; a CODEOWNER can).
- **Federation is a gravity well.** "Cross-repo PR-as-message" sounds
  cheap until two societies disagree about whose constitution applies.
  This is why §8 keeps federation opt-in *per role* and recipient-
  governed: the only way to scale safely is to never let the sender
  vote.
- **GMI is no longer a "minimum" intelligence.** This is the real
  risk. The defence is that the *single-install experience is
  preserved at every step*: nothing in this document forces a user
  past `gmi/agency/main` until they hatch a second role themselves.
  The society is opt-in all the way down.

---

## 11. Bottom line

BRANCH-UPGRADE.md gave each agent a branch of its own. That was the
upgrade from *one mind* to *many minds in one repo*. It did not yet
answer what the many minds are *for*, how they *disagree*, or what
*authorises* them to act.

Society of Repo answers those questions for self-hosted Forgejo on
owned hardware. This document is the translation of those answers
into the GitHub-native, single-repo idiom GMI was born in:

- A **role** is a branch prefix.
- A **workspace** is a singleton branch.
- A **constitution** is a file on `main`.
- A **critic** is a review comment.
- A **censor** is a required check.
- A **memory** is a typed branch.
- A **service** is the graduation slot to a sibling repo.
- A **federation** is a manifest of recipients, each sovereign.

None of these are new primitives. All of them are things GitHub
already ships and humans already use. The upgrade is, again, to **stop
pretending an AI agent is special** and let it have what every
human-run organisation has had since git itself: roles, review, law,
memory, and a way to talk across the wall to the next organisation
over.

The repo was already the mind. The branch graph is already the
society. The work is to *name the roles aloud* so the society can
admit, in writing, what it is.
