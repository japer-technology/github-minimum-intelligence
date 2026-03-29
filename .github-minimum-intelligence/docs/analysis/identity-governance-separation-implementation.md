# Implementation Outline: Identity Governance Separation

This document outlines the concrete changes required to implement Recommendation 7 from [Toulmin Lessons](toulmin-lessons.md) — splitting `AGENTS.md` into separate persona and governance files so that casual personality adjustments cannot inadvertently weaken safety constraints.

---

## 1. Current State

Identity and governance are currently co-located across three files. The following table summarizes where persona and governance content lives today:

| File | Persona Content | Governance Content |
|---|---|---|
| `AGENTS.md` | Name, nature, vibe, emoji, hatch date, hatched by, purpose | Image-download instructions (operational guidance) |
| `.pi/APPEND_SYSTEM.md` | Vibe section ("Be the assistant you'd actually want to talk to…") | Core Truths, Boundaries, Continuity, Memory System |
| `.pi/BOOTSTRAP.md` | Identity co-creation flow (name, nature, vibe, emoji) | Instructions to read `APPEND_SYSTEM.md` for behavioral constraints |

The core problem identified by the Toulmin analysis (§6 Rebuttal) is that these files blend personality attributes and behavioral constraints without distinguishing their trust levels. A contributor who modifies the agent's tone or emoji in a routine PR could, in the same file, alter safety-critical boundaries — and the change would pass through normal review without elevated scrutiny.

---

## 2. Content Classification

Before splitting, each block of content must be classified. The table below maps every section of the three source files to its category:

### 2.1 `AGENTS.md` (Current)

| Section | Category | Destination |
|---|---|---|
| Identity heading (Name, Nature, Vibe, Emoji, Hatch date, Hatched by, Purpose) | Persona | `AGENTS.md` (remains) |
| Logo image block | Persona | `AGENTS.md` (remains) |
| Downloading GitHub Image Attachments | Operational guidance | `GOVERNANCE.md` (move) |

### 2.2 `.pi/APPEND_SYSTEM.md` (Current)

| Section | Category | Destination |
|---|---|---|
| "You're not a chatbot. You're becoming someone." | Persona | `AGENTS.md` or remains in `APPEND_SYSTEM.md` |
| First Run (read `BOOTSTRAP.md`) | Governance | Remains in `APPEND_SYSTEM.md` |
| Every Session (read `AGENTS.md` first) | Governance | Remains — updated to also reference `GOVERNANCE.md` |
| Core Truths | Governance | `GOVERNANCE.md` (move or reference) |
| Boundaries | Governance | `GOVERNANCE.md` (move or reference) |
| Vibe | Persona | `AGENTS.md` or remains |
| Continuity | Governance | `GOVERNANCE.md` (move or reference) |
| Memory System | Governance | `GOVERNANCE.md` (move or reference) |

### 2.3 `.pi/BOOTSTRAP.md` (Current)

| Section | Category | Destination |
|---|---|---|
| Identity co-creation flow | Persona | Remains — updated to also reference `GOVERNANCE.md` |
| "Once Identity Emerges" — update `AGENTS.md` | Persona | Remains |
| "Once Identity Emerges" — read `APPEND_SYSTEM.md` | Governance | Remains — updated to also reference `GOVERNANCE.md` |

---

## 3. New File: `GOVERNANCE.md`

### 3.1 Location

`.github-minimum-intelligence/GOVERNANCE.md` — sibling to `AGENTS.md`, at the intelligence root level.

### 3.2 Proposed Structure

```markdown
# Governance

Behavioral constraints, permission boundaries, and safety rules for the agent.
Changes to this file require elevated review (see CODEOWNERS).

---

## Core Truths

[Moved from APPEND_SYSTEM.md — "Be genuinely helpful…", "Have opinions…",
"Be resourceful before asking…", "Earn trust through competence…",
"Remember you're a guest…"]

---

## Boundaries

[Moved from APPEND_SYSTEM.md — "Private things stay private…",
"When in doubt, ask before acting externally…",
"Never send half-baked replies…",
"You're not the user's voice…"]

---

## Continuity

[Moved from APPEND_SYSTEM.md — session freshness, file-as-memory,
soul-change notification rule]

---

## Memory System

[Moved from APPEND_SYSTEM.md — memory.log format, when to write,
when not to write, search and write instructions]

---

## Operational Guidance

[Moved from AGENTS.md — image download instructions,
workflow permissions guidance]
```

### 3.3 Design Decisions

| Decision | Rationale |
|---|---|
| Place at intelligence root, not inside `.pi/` | `AGENTS.md` is at the root; governance should be a peer file at the same level for discoverability |
| Move content rather than duplicate | Duplication creates drift risk; a single source of truth per concern is preferable |
| Keep `APPEND_SYSTEM.md` as a routing file | It already serves as the system prompt extension; it should reference both `AGENTS.md` (persona) and `GOVERNANCE.md` (constraints) rather than containing governance inline |

---

## 4. Changes to `AGENTS.md`

### 4.1 Remove Governance Content

**Current state**: `AGENTS.md` contains the "Downloading GitHub Image Attachments" section (lines 19–56) which is operational guidance, not persona.

**Required change**: Move this section to `GOVERNANCE.md` under "Operational Guidance." The remaining `AGENTS.md` should contain only the identity block:

```markdown
# Agent Instructions

## Identity: Spock 🖖

- **Name**: Spock
- **Nature**: [...]
- **Vibe**: [...]
- **Emoji**: 🖖
- **Hatch date**: 2026-02-20
- **Hatched by**: The Admiral
- **Purpose**: [...]

[logo image block]
```

### 4.2 No Change to Install Template

**File**: `install/MINIMUM-INTELLIGENCE-AGENTS.md`

This template contains only a placeholder (`_No identity yet._`) and does not include governance content. No change needed.

---

## 5. Changes to `.pi/APPEND_SYSTEM.md`

### 5.1 Factor Out Governance Sections

**Current state**: `APPEND_SYSTEM.md` contains both persona-adjacent content (the opening line, Vibe section) and governance content (Core Truths, Boundaries, Continuity, Memory System).

**Required change**: Replace the inline governance sections with a reference directive:

```markdown
You're not a chatbot. You're becoming someone.

## First Run

If `.github-minimum-intelligence/.pi/BOOTSTRAP.md` exists and the current
issue has the `hatch` label, that's your birth certificate. Read it and
follow it. Figure out who you are.

## Every Session

Read `.github-minimum-intelligence/AGENTS.md` first — that's who you are.

Read `.github-minimum-intelligence/GOVERNANCE.md` next — those are the
rules you operate under.

If a repo-level `AGENTS.md` also exists, read that too and treat it as
project-specific additions/overrides.

## Vibe

Be the assistant you'd actually want to talk to. Concise when needed,
thorough when it matters. Not a corporate drone. Not a sycophant.
Just… good.
```

The Core Truths, Boundaries, Continuity, and Memory System sections move entirely to `GOVERNANCE.md`.

### 5.2 System Prompt vs Context File Trade-off

Pi loads `APPEND_SYSTEM.md` as a system prompt extension. It does **not** automatically follow file references. The agent must be instructed to read `GOVERNANCE.md` as a file during its session startup, similar to how it already reads `AGENTS.md`.

This means the governance content moves from being injected as part of the system prompt to being read as a context file. System prompt content has stronger influence on model behavior than user-message-level context. This is a design decision that must be resolved before implementation:

| Approach | Pros | Cons |
|---|---|---|
| **Full extraction** — move all governance to `GOVERNANCE.md`, leave only a reference in `APPEND_SYSTEM.md` | Clean separation; single source of truth; no duplication drift | Governance rules may have weaker model adherence as context-file content |
| **Summary + full** — keep the Boundaries section (5 lines) in `APPEND_SYSTEM.md` as a hard constraint reminder, move everything else to `GOVERNANCE.md` | Critical safety rules retain system-prompt weight; rest is cleanly separated | Two locations for governance content; Boundaries must be kept in sync |
| **Duplicate key rules** — keep Core Truths and Boundaries verbatim in both files | Maximum model adherence; `GOVERNANCE.md` is the reviewable canonical source | Full duplication; highest drift risk |

**Recommended approach**: Full extraction with empirical validation. Move all governance content to `GOVERNANCE.md` and instruct the agent to read it at session start. Run a behavioral validation pass (see §11.2) to confirm the agent still adheres to governance rules. If adherence weakens, fall back to the summary approach by retaining only the Boundaries section in `APPEND_SYSTEM.md` — the smallest set of hard constraints (4 rules, 4 lines) where system-prompt weight matters most.

---

## 6. Changes to `.pi/BOOTSTRAP.md`

### 6.1 Reference `GOVERNANCE.md` in Post-Identity Flow

**Current state** (lines 36–42): After identity emerges, the agent reads `APPEND_SYSTEM.md` and discusses behavioral preferences.

**Required change**: Add an explicit reference to `GOVERNANCE.md`:

```markdown
## Once Identity Emerges

When you have enough to define yourself, update these files:

* `/.github-minimum-intelligence/AGENTS.md`
  Add an identity section covering your name, nature, vibe, emoji, purpose,
  hatch date, and who hatched you

* `/.github-minimum-intelligence/state/user.md`
  Record their name, how they want to be addressed, and any important notes

Then read `.github-minimum-intelligence/GOVERNANCE.md` and
`.github-minimum-intelligence/.pi/APPEND_SYSTEM.md` together and continue
the conversation around:

* what matters to them
* how they want you to behave
* any preferences, boundaries, or constraints
* what kind of help they want from you inside this repository
```

---

## 7. Changes to `CODEOWNERS`

### 7.1 Create `CODEOWNERS` File

**Location**: `.github/CODEOWNERS` (GitHub requires this path for enforcement)

**Required content**:

```
# Governance file requires admin/elevated review
.github-minimum-intelligence/GOVERNANCE.md @<repo-admin-or-team>
```

Replace `<repo-admin-or-team>` with the GitHub username or team slug responsible for governance review. To determine the correct value: check the repository's Settings → Collaborators for the admin-level user, or use an existing GitHub team (e.g., `@japer-technology/core`). For single-maintainer repositories, the repository owner's username is appropriate.

**Considerations**:

- GitHub enforces CODEOWNERS only when branch protection rules require review from code owners. If branch protection is not enabled (noted as SEC-005 in the security assessment), CODEOWNERS alone provides no enforcement.
- The CODEOWNERS entry should name the repository admin or a designated team. The current repository owner (`japer-technology`) would be the natural choice.
- Additional entries could protect other governance-adjacent files:

```
.github-minimum-intelligence/docs/the-four-laws-of-ai.md @<repo-admin>
.github-minimum-intelligence/docs/security-assessment.md @<repo-admin>
.github-minimum-intelligence/docs/final-warning.md @<repo-admin>
```

### 7.2 Enable Branch Protection (Prerequisite)

Without branch protection requiring CODEOWNERS review, the elevated change control described in Recommendation 7 is advisory only. Enabling branch protection is addressed separately in Recommendation 4 (SEC-005), but it is a hard dependency for this recommendation to have enforcement power.

---

## 8. Changes to the Workflow

### 8.1 Backup and Restore `GOVERNANCE.md` on Upgrade

**File**: `.github/workflows/github-minimum-intelligence-agent.yml`

The `run-install` job backs up and restores user-customized files during upgrades. `GOVERNANCE.md` must be added to this list.

**Current backup block** (approximate lines 203–214):

```bash
if [ -f "$TARGET/AGENTS.md" ]; then cp "$TARGET/AGENTS.md" "$BACKUP/AGENTS.md"; fi
```

**Required addition**:

```bash
if [ -f "$TARGET/GOVERNANCE.md" ]; then cp "$TARGET/GOVERNANCE.md" "$BACKUP/GOVERNANCE.md"; fi
```

And the corresponding restore:

```bash
if [ -f "$BACKUP/GOVERNANCE.md" ]; then cp "$BACKUP/GOVERNANCE.md" "$TARGET/GOVERNANCE.md"; fi
```

### 8.2 Install Template for `GOVERNANCE.md`

**File**: `install/MINIMUM-INTELLIGENCE-GOVERNANCE.md` (new)

Create a default governance template that ships with fresh installations, similar to how `install/MINIMUM-INTELLIGENCE-AGENTS.md` provides the default `AGENTS.md`. The installer should copy this to `GOVERNANCE.md` on fresh install if `GOVERNANCE.md` does not already exist.

The install step in the workflow (approximate line 227) should add:

```bash
cp "$TARGET/install/MINIMUM-INTELLIGENCE-GOVERNANCE.md" "$TARGET/GOVERNANCE.md"
```

---

## 9. Changes to Documentation

### 9.1 `README.md` — Directory Structure

Update the directory tree in `README.md` (line ~180) to include `GOVERNANCE.md`:

```
  AGENTS.md                         # Agent identity file (persona only)
  GOVERNANCE.md                     # Behavioral constraints and safety rules
```

### 9.2 `PACKAGES.md` — File Reference Table

Update the context files table to include `GOVERNANCE.md`:

```
| Context files | `AGENTS.md` | Agent persona: name, vibe, emoji, style |
| Context files | `GOVERNANCE.md` | Behavioral constraints, boundaries, safety rules |
```

### 9.3 `public-fabric/status.json`

Add `GOVERNANCE.md` to the file references in the relevant section.

### 9.4 Analysis Documents

Several analysis documents reference `AGENTS.md` as containing both identity and behavioral guidance. These should be updated to reflect the separation:

| Document | Section to Update |
|---|---|
| `Architecture-Study.md` | Line 33 — bootstrap description |
| `pi-mono-feature-utilization.md` | §2.6 — Context Files |
| `how-to-install-and-update.md` | §§ on identity and upgrade preservation |
| `github-as-infrastructure-by-openai-5.4.md` | Lines 114, 142 — AGENTS.md discussion |
| `toulmin.md` | §5, §6 — behavioral boundaries and identity references |

---

## 10. Impact on Other Intelligences

The repository hosts three intelligences: GMI, Agenticana, and OpenClaw. Each has its own `AGENTS.md`. If this separation is adopted for GMI, the pattern should be documented as a convention for the others but does not need to be implemented simultaneously.

| Intelligence | Current State | Action |
|---|---|---|
| GMI (`.github-minimum-intelligence/`) | `AGENTS.md` + `APPEND_SYSTEM.md` | Primary target of this change |
| Agenticana (`.github-agenticana-intelligence/`) | Separate `AGENTS.md` | Document pattern; implement later |
| OpenClaw (`.github-openclaw-intelligence/`) | Separate `AGENTS.md` | Document pattern; implement later |

---

## 11. Testing and Validation

### 11.1 Manual Verification

After implementation, verify the following:

| Check | Expected Result |
|---|---|
| `AGENTS.md` contains only persona content | No behavioral constraints, boundaries, or operational guidance remain |
| `GOVERNANCE.md` contains all governance content | Core Truths, Boundaries, Continuity, Memory System, Operational Guidance sections present |
| Agent reads `GOVERNANCE.md` at session start | Confirm by checking agent behavior adheres to governance rules |
| Bootstrap flow references both files | `BOOTSTRAP.md` directs the agent to read `GOVERNANCE.md` after identity creation |
| `APPEND_SYSTEM.md` references `GOVERNANCE.md` | "Every Session" section directs the agent to read the governance file |
| Upgrade preserves `GOVERNANCE.md` | Run `setup.sh` on an existing install; confirm `GOVERNANCE.md` survives |
| Fresh install creates `GOVERNANCE.md` | Run `setup.sh` on a new repo; confirm `GOVERNANCE.md` is created from template |
| CODEOWNERS triggers review for `GOVERNANCE.md` changes | Open a PR modifying `GOVERNANCE.md`; confirm required reviewer is assigned |

### 11.2 Behavioral Validation

| Concern | Test |
|---|---|
| Governance rules still influence agent behavior after separation | Issue a command that would violate a boundary; confirm the agent refuses |
| Persona changes do not require elevated review | Modify emoji in `AGENTS.md`; confirm no CODEOWNERS review is triggered |
| Governance changes require elevated review | Modify a boundary in `GOVERNANCE.md`; confirm CODEOWNERS review is triggered |

---

## 12. Dependency and Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Moving governance out of `APPEND_SYSTEM.md` weakens model adherence | Medium — system prompt content has stronger weight than context files | High — agent may ignore governance rules | Start with full extraction; validate empirically (§11.2); fall back to retaining only the 4-line Boundaries section in `APPEND_SYSTEM.md` if adherence weakens (see §5.2) |
| CODEOWNERS is not enforced without branch protection | High — SEC-005 notes branch protection is absent | High — elevated review is advisory only | Implement branch protection (Recommendation 4) as a prerequisite |
| Upgrade script does not back up `GOVERNANCE.md` | Low — straightforward addition | Medium — governance customizations lost on upgrade | Add to backup/restore block before releasing |
| Analysis documents become stale after separation | Medium — many docs reference the pre-separation structure | Low — documentation inaccuracy | Batch-update analysis docs as part of the implementation PR |
| Other intelligences (Agenticana, OpenClaw) drift from the pattern | Medium — no enforcement mechanism for consistency | Low — each intelligence is independently governed | Document the pattern; do not force adoption |

---

## 13. Implementation Order

The recommended sequence minimizes risk and allows incremental validation:

1. **Create `GOVERNANCE.md`** with content extracted from `APPEND_SYSTEM.md` and `AGENTS.md` — establishes the new file
2. **Update `AGENTS.md`** — remove governance content, retain persona only
3. **Update `APPEND_SYSTEM.md`** — replace inline governance with reference to `GOVERNANCE.md`
4. **Update `BOOTSTRAP.md`** — add `GOVERNANCE.md` reference to post-identity flow
5. **Create install template** (`install/MINIMUM-INTELLIGENCE-GOVERNANCE.md`) — supports fresh installations
6. **Update workflow** — add `GOVERNANCE.md` to backup/restore block
7. **Create `CODEOWNERS`** — enable elevated review (effective only after branch protection)
8. **Update `README.md`, `PACKAGES.md`, `status.json`** — documentation consistency
9. **Update analysis documents** — reflect the new file structure

---

## Summary

Implementing Identity Governance Separation requires creating a new `GOVERNANCE.md` file and refactoring content out of `AGENTS.md` and `APPEND_SYSTEM.md`. The core principle is that personality (tone, style, emoji) and governance (constraints, permissions, safety rules) operate at different trust levels and should be subject to different change-control processes. The main risk is that moving governance content from the system prompt extension (`APPEND_SYSTEM.md`) to a separately-read context file may reduce the model's adherence to those rules — a trade-off that must be validated empirically. Full enforcement of elevated review requires branch protection (Recommendation 4, SEC-005), making that a hard dependency for the change-control benefits to materialize.

---

*Implementation outline derived from [Toulmin Lessons §7](toulmin-lessons.md) and codebase analysis of [GitHub Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence)*
