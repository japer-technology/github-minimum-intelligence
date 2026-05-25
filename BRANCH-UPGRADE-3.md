# BRANCH-UPGRADE-3.md — GMI Meets SOR

Upgrade ideas for crossing **GitHub Minimum Intelligence (GMI)** with the
**Society of Repo (SOR)** ideas in
[`japer-technology/forgejo-society`](https://github.com/japer-technology/forgejo-society).

`BRANCH-UPGRADE.md` says the cheapest way to make many GMI minds is to let
each one think in its own `gmi/<name>` branch. SOR says a forge can host a
governed ecology of agencies, critics, censors, memory, services, channels,
settlements, and human authority. The interesting upgrade is not simply
"more agents." It is:

> **branches become agencies, pull requests become settlements, and git history
> becomes the society's memory.**

This document sketches what becomes possible when GMI's branch-per-personality
model is treated as a minimum SOR runtime.

---

## 0. Core synthesis

GMI's branch upgrade and SOR's repo society are the same shape at different
scales.

| GMI branch upgrade | SOR / Forgejo Society concept | Synthesis |
| --- | --- | --- |
| `gmi/<name>` branch | agency / critic / censor / role | A branch can be a personality *or* an institutional role. |
| Branch-local `state/`, `.pi/`, `AGENTS.md`, `memory.log` | state, workspace, memory, identity | Every role carries its own cortex. |
| `gmi/index.yml` | authority / manifest registry | Installed personalities become a governed society roster. |
| Resolver job | perception / intake agency | Event routing is the first cognitive act. |
| Safe-output apply job | authority boundary / act phase | Thinking and acting are separated by policy. |
| Cross-branch PR | settlement | Branch disagreement becomes reviewable governance. |
| `gmi-mcp branch.read()` | inter-agency channel | Minds can read one another without mutating one another. |
| Branch GC | evolution / retirement | Unused agencies can decay, archive, or retire. |

The minimal claim in `BRANCH-UPGRADE.md` is "one personality = one branch."
The SOR-strengthened claim is:

> **one governed cognitive role = one branch, with authority declared on
> `main` and memory kept on the role branch.**

---

## 1. Rename the mental model: from personalities to society branches

Keep the `gmi/<name>` naming convention, but broaden its meaning.

Some branches are personalities:

- `gmi/main`
- `gmi/researcher`
- `gmi/teacher`
- `gmi/spock`

Some are agencies:

- `gmi/intake`
- `gmi/triage`
- `gmi/codebase-cartographer`
- `gmi/archivist`

Some are critics:

- `gmi/critic-evidence`
- `gmi/critic-risk`
- `gmi/critic-staleness`
- `gmi/critic-scope`

Some are censors or suppressors:

- `gmi/censor-secret-smeller`
- `gmi/censor-workflow-danger`
- `gmi/censor-cloud-egress`
- `gmi/suppressor-high-entropy`

Some are integration roles:

- `gmi/conscious-presenter`
- `gmi/commit-steward`
- `gmi/guardian`
- `gmi/standup`

This keeps GMI simple: every role is still just a branch. But it gives SOR a
place to land without requiring GMI to become a multi-repo Forgejo installation
on day one.

---

## 2. Turn `gmi/index.yml` into a tiny authority registry

`BRANCH-UPGRADE.md` proposes `gmi/index.yml` as the list of installed
personalities. SOR wants a governed roster: authority levels, allowed writes,
triggers, critics, censors, services, and human gates.

Upgrade the index from a catalogue into a minimum constitution:

```yaml
roles:
  - name: triage
    branch: gmi/triage
    kind: agency
    family: perception
    authority: act
    triggers: [issues.opened, issues.labeled]
    safe_outputs:
      add_labels:
        allowed: [bug, feature, question, duplicate, security-review]
      add_comment: true
    critics: [critic-evidence, critic-scope]
    censors: [censor-secret-smeller, censor-authority]

  - name: critic-risk
    branch: gmi/critic-risk
    kind: critic
    authority: read
    triggers: [candidate_action.created]
    writes: false

  - name: guardian
    branch: gmi/guardian
    kind: guardian
    authority: govern
    triggers: [pull_request.opened]
    reviews_cross_branch_prs: true
```

The key upgrade is that the resolver no longer only asks "which personality
should answer?" It asks:

1. Which roles activate for this stimulus?
2. Which critics must object before action?
3. Which censors must run before tools or output?
4. Which role, if any, is allowed to speak publicly?
5. Which branch is allowed to commit the memory?

The default install can still ship a one-role `gmi/main`. The index simply
leaves room for a society.

---

## 3. Branches as imagination, not only identity

`BRANCH-UPGRADE.md` treats long-lived branches as identities. SOR's runtime
pipeline also needs temporary candidate spaces: hypotheses, imagined patches,
blocked actions, and rejected settlements.

Add short-lived imagination branches:

```text
gmi/<role>                         # long-lived role memory
gmi/imagine/<issue>/<candidate>    # candidate action branch
gmi/settle/<issue>/<settlement>    # settlement branch
gmi/archive/<role>/<date>          # retired branch tag/branch
```

Flow:

1. `gmi/intake` routes the issue.
2. `gmi/codebase-cartographer` reads relevant files.
3. `gmi/patch-imaginer` creates `gmi/imagine/123/candidate-1`.
4. Critics read the candidate branch and write objections on their own
   branches.
5. `gmi/commit-steward` opens a PR from the candidate branch to `main` or to
   the relevant `gmi/<role>` branch.
6. `gmi/archivist` records the settlement outcome in durable memory.

The result is SOR-style cognition using plain git:

- candidate branches are thoughts,
- PRs are proposed reality revisions,
- closed PRs are rejected hypotheses,
- merged PRs are settled decisions,
- merge conflicts are real disagreements.

---

## 4. Make pull requests the settlement layer

SOR has explicit settlements. GMI already has the perfect substrate: PRs.

Cross-branch PRs can become the canonical settlement record:

| PR direction | Meaning |
| --- | --- |
| `gmi/triage → gmi/main` | A specialist wants the main personality to remember something. |
| `gmi/critic-risk → gmi/triage` | A critic proposes changing an agency's behaviour. |
| `gmi/imagine/123/candidate-1 → main` | A candidate action wants to become repo reality. |
| `gmi/main → main` | The public GMI personality wants to self-upgrade the install. |
| `main → gmi/<role>` | Human-curated project changes are propagated into role memory. |

Each PR should carry structured settlement metadata:

```yaml
stimulus: issue-123
frame: code-change
proposed_by: gmi/patch-imaginer
reviewed_by:
  - gmi/critic-risk
  - gmi/censor-secret-smeller
  - human:maintainer
authority_required: human
outcome: pending
memory_targets:
  - gmi/archivist:memory/decisions/
```

This lets GMI gain SOR's governance without inventing a new database. The PR is
the active settlement; the merge commit is the decision; the archived metadata
is the memory.

---

## 5. Split memory into branch-local state and society memory

`BRANCH-UPGRADE.md` makes memory branch-local by default. SOR distinguishes
`state/`, `workspace/`, and `memory/`.

GMI can adopt that distinction without changing the branch primitive:

```text
state/       # per-run trace, branch-local
workspace/   # active attention and pending settlements, branch-local
memory/      # durable, append-only, branch-local unless promoted
```

Then add one special society-level path on `main`:

```text
.github-minimum-intelligence/society/
  index.yml
  authority.yml
  settlements/
  channels/
  services/
  policy/
```

Rule:

- role-local memory lives on the role branch;
- society-wide law lives on `main`;
- promotion from role memory to society memory happens by PR;
- corrections are append-only supersessions, not silent edits.

This preserves the branch isolation that makes GMI attractive while giving SOR
a place for shared governance.

---

## 6. Make `gmi-mcp` a society bus

`BRANCH-UPGRADE.md` already proposes:

- `branch.list()`
- `branch.read(branch, path, range?)`

SOR suggests extending `gmi-mcp` into a narrow, read-mostly society bus:

| Method | Purpose |
| --- | --- |
| `role.list()` | Read installed roles from `gmi/index.yml`. |
| `role.manifest(name)` | Read authority, triggers, safe outputs, critics, censors. |
| `branch.read(branch, path, range?)` | Read another branch's mind. |
| `settlement.list(status?)` | List open cross-branch PR settlements. |
| `settlement.read(id)` | Read PR metadata, objections, reviews, outcome. |
| `memory.search(branch, query)` | Search one role's durable memory. |
| `memory.propose(target_branch, patch)` | Produce a PR-shaped proposal, not a direct write. |
| `channel.call(peer, service, payload)` | Later: governed inter-repo call through an allowlisted channel. |

The bus should stay asymmetric:

- reads are cheap and common;
- writes are proposals;
- only the apply/safe-output job mutates git;
- no role gets an API for silent mutation of another role's branch.

That gives GMI an SOR-compatible nervous system while keeping git as the
source of truth.

---

## 7. Import critics and censors before importing more agents

The tempting path is to add many personalities first. SOR argues the safer path
is to add inhibition first.

Early GMI/SOR roles worth shipping:

1. `gmi/censor-secret-smeller`
2. `gmi/censor-workflow-danger`
3. `gmi/censor-authority`
4. `gmi/critic-evidence`
5. `gmi/critic-scope`
6. `gmi/critic-risk`
7. `gmi/guardian`

These roles do not make GMI more flashy. They make it governable.

The first visible upgrade should be that every GMI action can say:

> "This was proposed by X, challenged by Y, censored by Z, and settled by H."

That sentence is the bridge between a chatbot and a society.

---

## 8. Treat safe-outputs as SOR authority

`FUTURE.md`, `PIVOT.md`, and `BRANCH-UPGRADE.md` all circle the same point:
the thinking job should be read-only, and a separate apply job should perform
validated writes.

SOR gives that split a vocabulary:

- the agent job is perception, memory, criticism, and proposal;
- the safe-output job is authorised action;
- censors run before tool grant and before output application;
- the authority registry decides what the role may do;
- human approval is required for governance, workflow, secret, or egress
  changes.

Instead of treating safe-outputs as an implementation detail, make them the
unit of institutional authority:

```yaml
authority:
  read:
    safe_outputs: []
  draft:
    safe_outputs: [artifact]
  propose:
    safe_outputs: [create_pull_request]
  act:
    safe_outputs: [add_comment, add_labels, push_to_role_branch]
  govern:
    safe_outputs: [request_review, approve_settlement]
  human:
    safe_outputs: [merge_to_main, change_authority]
```

Then every branch role has an authority ceiling. The apply job enforces the
intersection of:

1. role authority,
2. event frame,
3. branch target,
4. path allowlist,
5. censor verdict,
6. human approval if required.

---

## 9. Collapse SOR's three-repo model into GMI phases

Forgejo Society describes three installed repos:

1. `forgejo-intelligence` — the human doorway;
2. `forgejo-society` — the governed cognitive ecology;
3. `forgejo-labour` — the code/execution doorway.

GMI can emulate this on GitHub before it needs three repos:

| SOR repo | GMI branch-era equivalent |
| --- | --- |
| intelligence | `gmi/main` plus issue/comment UX |
| society | `gmi/index.yml`, role branches, critics, censors, settlements |
| labour | candidate branches plus apply jobs and code-focused roles |

Later, when GMI runs on self-hosted Forgejo, these can split into actual repos.
Until then, branches let GMI prototype the same topology inside one GitHub
repository.

This is the migration insight:

> **GMI branches are a single-repo rehearsal for SOR repos.**

---

## 10. Add services and channels as opt-in branch contracts

SOR's inter-repo communication model uses services, channels, bridges,
authority checks, and audit. GMI can introduce the vocabulary in a smaller
form.

On `main`:

```text
.github-minimum-intelligence/society/
  services/
    pr-review.yml
    triage.yml
    memory-digest.yml
  channels/
    local-branches.yml
    peer-repos/
```

Examples:

- `service: pr-review` is fulfilled by `gmi/pr-review`.
- `service: memory-digest` is fulfilled by `gmi/standup`.
- `channel: local-branches` allows `branch.read()` but denies writes.
- `channel: peer-repo/foo` later allows a remote GMI or SOR repo to request a
  service by issue, dispatch event, or signed activity.

The first version can be entirely local. The important thing is the discipline:
no role calls another role casually. It uses a declared service over an
allowlisted channel.

---

## 11. Make the public voice a conscious presenter branch

SOR distinguishes internal agencies from the visible presenter. GMI today has
one voice. The branch upgrade can preserve that while allowing internal
diversity:

- many branches may think;
- many critics may object;
- many censors may veto;
- only `gmi/conscious-presenter` writes the final public response unless the
  event is explicitly delegated.

This avoids the worst multi-agent UX: a user opens one issue and gets five
incompatible bot comments.

The resolver should be able to activate a society, but the final step should
select one presenter:

```text
event
  → intake
  → agencies think
  → critics object
  → censors veto
  → settlement chooses outcome
  → conscious-presenter speaks
  → archivist remembers
```

That is SOR's cognitive loop expressed through GMI branches.

---

## 12. Reinterpret branch conflicts as useful disagreement

In normal automation, merge conflicts are failures. In GMI-meets-SOR, they are
evidence.

If `gmi/critic-risk` and `gmi/codebase-cartographer` both propose edits to the
same policy file, the conflict is not noise. It means two cognitive roles
touched the same governance surface with incompatible claims.

Add a conflict memory path:

```text
.github-minimum-intelligence/society/conflicts/
  <date>-<branch-a>-vs-<branch-b>.md
```

Each record should capture:

- branches involved;
- files in conflict;
- stimulus that caused the conflict;
- critic/censor verdicts;
- human settlement;
- follow-up memory entries.

This turns git's rough edge into SOR's deliberation surface.

---

## 13. Bootstrap path: minimum GMI/SOR society

A minimum shippable GMI/SOR upgrade can be much smaller than full Forgejo
Society.

Ship in this order:

1. **Branch-aware checkout and apply** from `BRANCH-UPGRADE.md`.
2. **`gmi/index.yml` with `kind`, `authority`, `triggers`, and
   `safe_outputs`.**
3. **One presenter:** `gmi/main` or `gmi/conscious-presenter`.
4. **One agency:** `gmi/triage`.
5. **One critic:** `gmi/critic-evidence`.
6. **One censor:** `gmi/censor-secret-smeller`.
7. **One guardian:** `gmi/guardian` for cross-branch PRs.
8. **One settlement convention:** cross-branch PR metadata.
9. **One MCP method beyond reads:** `settlement.read(id)`.
10. **One memory promotion path:** role branch → PR → `gmi/main` or `main`.

That is enough to demonstrate the conceptual leap:

- GMI still installs like GMI.
- It still speaks through one issue interface.
- But internally it is now a small governed society.

---

## 14. What not to do yet

Avoid these early traps:

- Do not start with many public personalities.
- Do not introduce a database.
- Do not let branches write directly to one another.
- Do not make every role a separate workflow before the branch resolver works.
- Do not add remote channels before local branch channels are boring.
- Do not let "society" mean unbounded autonomy; authority must shrink, not
  expand.
- Do not weaken the default install. The first-run experience should still be
  one workflow, one issue, one answer.

The point is to make GMI more governable before making it more powerful.

---

## 15. Bottom line

`BRANCH-UPGRADE.md` finds the primitive: **a mind can be a branch**.

Forgejo Society / SOR adds the institution around that primitive:

- agencies that propose,
- critics that object,
- censors that forbid,
- guardians that review,
- presenters that speak,
- archivists that remember,
- humans that settle.

The combined upgrade is a path from:

> one repo with one helpful issue bot

to:

> one repo whose branches form a governed cognitive society, with every
> thought, objection, veto, action, and memory recorded as git history.

GMI should not try to swallow all of SOR at once. It should take the smallest
SOR-shaped step: make the branch roster an authority registry, make
cross-branch PRs settlements, and make the first non-default branches critics
and censors before they are personalities.

That is where GMI meets SOR without losing the "minimum" in its name.
