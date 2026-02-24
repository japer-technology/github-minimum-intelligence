# QUESTION: WHERE?

## Where does this agent actually live?

The most important claim in this repository is not merely that an AI agent can write code. It is that the agent can be *located*—architecturally, operationally, and institutionally—inside the same place the team already works: the repository.

Most AI tooling answers “where” with a product name: a hosted app, a vendor dashboard, a remote memory store, a hidden orchestration layer. Minimum Intelligence answers differently. The README and design documents point to a tighter topology: **the repository is both habitat and boundary**.

So if we ask, “Where is the intelligence?”, the precise answer is:

- In issue threads as dialogue,
- In GitHub Actions as runtime,
- In checked-in files as policy,
- In git history as memory,
- In commits as evidence.

“Where” is not a metaphor here. It is a systems design decision.

---

## Where is runtime?

Runtime lives in the CI runner, not on your laptop and not in an opaque vendor backend. The core loop is triggered by issue activity, then executed by GitHub Actions with a full checkout of the repository. That means the agent operates in the same concrete filesystem developers reason about—real paths, real configs, real project structure.

This location choice matters because it removes representational drift. In chat-first tooling, the model sees a pasted subset of the codebase, often stale or partial. Here, the agent can inspect actual files directly. It does not infer your layout; it reads it. It does not trust summaries; it can run commands.

In practical terms, “where runtime happens” determines whether the agent is speculating from text or acting in an environment. Minimum Intelligence chooses environment.

---

## Where is memory?

Memory lives in git-managed state files under `.github-minimum-intelligence/state/`, linked to issue numbers and session transcripts. This is a radical but simple move: long-term context is stored as repository data, then versioned like everything else.

That gives memory properties traditional assistants struggle to provide consistently:

- **Persistence**: it survives process exits and time gaps.
- **Auditability**: every revision can be inspected in history.
- **Diffability**: changes in conversation state are comparable.
- **Recoverability**: rollback is a normal git operation.

In other words, memory is *where your source of truth already is*. There is no separate “AI memory product” to trust, migrate, or lose.

---

## Where is identity?

Identity lives in checked-in markdown—especially `AGENTS.md` and bootstrap guidance in the `.pi/` and `.github-minimum-intelligence/` scaffolding. Persona, behavioral constraints, and interaction style are not frozen in a hidden system prompt controlled elsewhere. They are authored as files.

This turns identity into governance-by-repository:

- Teammates can review personality changes in diffs.
- Maintainers can revert regressions in agent behavior.
- Branches can test variant identities safely.
- Ownership of “how the agent behaves” sits with the repo, not a SaaS toggle.

So when we ask where the agent’s “character” resides, the answer is: in the same reviewable configuration surface as any other engineering policy.

---

## Where is authority?

Authority lives in existing GitHub permissions and workflow scopes. The app manifest and workflow permissions express what the agent may read or write (`issues`, `contents`, `actions`, `metadata`), and those grants are first-class repository governance primitives—not custom ACL logic invented by a new platform.

That means no governance fork is required to adopt AI collaboration. The same structures that control human contributors (roles, branch protections, review flow, token scopes) bound the agent too.

This is an underappreciated part of “where”: authority is colocated with the institution already responsible for code changes.

---

## Where is installation complexity?

Installation lives in files you can inspect (`setup.sh`, installer scripts, workflow templates), and the resulting system is copied directly into your repository as `.github-minimum-intelligence/`. No external control plane is required.

The operational implication is strong: if you can clone your repo, you can inspect the full AI stack that governs it. If upstream changes in a direction you dislike, pinning or forking works the same way it does for any dependency.

So the “where” of setup is intentionally mundane: the working tree. That mundanity is the point.

---

## Where does collaboration happen?

Collaboration happens where maintainers already coordinate work: GitHub Issues and comments. Prompts are not exported to a separate chat product; they are attached to the same artifact trail as planning, triage, and delivery.

This produces a subtle but meaningful alignment:

- The question lives with the ticket.
- The answer lives with the ticket.
- The resulting change lives in git.
- The rationale remains discoverable to future contributors.

The repository stops being a passive code bucket and becomes an active conversational workspace with durable institutional memory.

---

## Where does trust come from?

Trust comes from location transparency.

When the full loop is repo-native, each step is inspectable:

- inputs (issues/comments),
- execution environment (workflow runs),
- behavior policy (checked-in instructions),
- state transitions (commits/diffs),
- outputs (responses and code changes).

Nothing essential is displaced to hidden backend state. The system is not trusted because it claims to be safe; it is trusted because its critical mechanics are observable where your engineering process already observes everything else.

---

## Final answer

So, where is Minimum Intelligence?

It is in the repository, but more specifically:

- **running** in Actions,
- **remembering** in git-tracked state,
- **speaking** through issues,
- **behaving** via markdown policy,
- **acting** through commits,
- **governed** by repo permissions.

The project’s central insight is that “where” determines “who controls it.” By placing intelligence inside the repo’s existing technical and social boundaries, Minimum Intelligence turns AI from an external service into a native collaborator—auditable, forkable, and answerable to the same rules as everyone else.
