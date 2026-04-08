# Master Change List — Toulmin-Derived Improvements for GMI

> Every rebuttal is a backlog item; every qualifier is a scope boundary.

This document consolidates every concrete change to GitHub Minimum Intelligence (GMI) identified by the [Toulmin Model of Argumentation](toulmin.md) and the [Toulmin Lessons](toulmin-lessons.md) analyses. Each entry traces back to the specific Toulmin component (Rebuttal, Qualifier, or Enhancement subsection) that motivates it, and records the current implementation status.

---

## 1. Legend

| Column | Meaning |
|---|---|
| **ID** | Stable reference for tracking |
| **Source** | Toulmin section and component that motivates the change |
| **File(s)** | Repository paths affected |
| **Status** | `Not started` · `Partial` · `Done` |

---

## 2. Agent Reasoning & Transparency

Changes that make the agent's reasoning process inspectable alongside its actions.

| ID | Change | Source | File(s) | Status |
|---|---|---|---|---|
| T-01 | Create a `toulmin-reasoning` skill file that instructs the agent to emit structured Claim / Grounds / Warrant / Rebuttal blocks when proposing non-trivial changes | §7.4, Lessons §1 | `.pi/skills/toulmin-reasoning.md` (new) | Not started |
| T-02 | Extend pi JSON mode output to include a `reasoning` field that downstream tooling can parse | Lessons §1.Implementation.2 | `.pi/settings.json`, pi integration | Not started |
| T-03 | Capture and commit the agent's chain-of-thought alongside its output — post a reasoning summary as an issue comment before committing code changes | §4 Rebuttal (LLM opacity), Lessons §6 | `lifecycle/agent.ts` | Not started |
| T-04 | Enable thinking-level output capture in the pi JSON mode pipeline | Lessons §6.Implementation.1 | `.pi/settings.json`, pi integration | Not started |
| T-05 | Create `state/reasoning/` directory to store full reasoning transcripts for post-hoc review | Lessons §6.Implementation.3 | `state/reasoning/` (new directory) | Not started |

---

## 3. Runtime Ethical Guardrails

Changes that move the ethical governance constraints from prompt-level aspiration to enforceable runtime constraints.

| ID | Change | Source | File(s) | Status |
|---|---|---|---|---|
| T-06 | Add input validation — reject or sanitize prompts containing known injection patterns before they reach the LLM | §5 Rebuttal, Lessons §2 | `lifecycle/agent.ts` | Not started |
| T-07 | Add output filtering — scan agent-generated diffs for dangerous patterns (credential exposure, workflow self-modification, destructive shell commands) before committing | §5 Rebuttal, Lessons §2 | `lifecycle/agent.ts` | Not started |
| T-08 | Add action sandboxing — restrict the set of shell commands the agent can execute to an explicit allowlist, enforced outside the LLM's control | §5 Rebuttal, Lessons §2 | `lifecycle/agent.ts`, `allowed-commands.json` (new) | Not started |
| T-09 | Log and reject any action that fails validation, recording the violation in the agent's commit history for auditability | Lessons §2.Implementation.3 | `lifecycle/agent.ts` | Not started |

---

## 4. Security Hardening (Rebuttal-Driven)

Changes that directly address the security gaps identified as rebuttals to the Trust and Ethical claims.

| ID | Change | Source | File(s) | Status |
|---|---|---|---|---|
| T-10 | Add workflow self-modification detection — reject diffs that touch `.github/workflows/` files (addresses SEC-008 self-replication) | §4 Rebuttal (SEC-008), Lessons §4 | `lifecycle/agent.ts` | Not started |
| T-11 | Restrict outbound network access to LLM API endpoints only via Actions firewall rules (addresses SEC-002 unrestricted network egress) | §4 Rebuttal (SEC-002), Lessons §4 | `.github/workflows/github-minimum-intelligence-agent.yml` | Not started |
| T-12 | Document and enforce branch protection rules as part of the install process (addresses SEC-005 no branch protection) | §4 Rebuttal (SEC-005), Lessons §4 | `install/` scripts, `README.md` | Not started |
| T-13 | Audit and minimize `GITHUB_TOKEN` permissions in the workflow YAML (addresses SEC-003 token scope) | §4 Rebuttal (SEC-003), Lessons §4 | `.github/workflows/github-minimum-intelligence-agent.yml` | Not started |

---

## 5. Documentation & Scope

Changes that qualify claims honestly and state boundaries explicitly.

| ID | Change | Source | File(s) | Status |
|---|---|---|---|---|
| T-14 | Add a **Scope & Limitations** section to `README.md` stating where GMI excels and where it does not (single-repo strong; multi-repo weak; real-time weak; air-gapped not supported) | §7.3, Lessons §3 | `README.md`, root `README.md` (mirror) | Not started |
| T-15 | Add a corresponding scope/limitations section in `public-fabric/status.json` for the landing page | Lessons §3.Implementation.2 | `public-fabric/status.json` | Not started |
| T-16 | Make implicit arguments explicit throughout documentation — state the reasoning connecting evidence to conclusion, not just the conclusion | §7.1 | All documentation files | Not started |
| T-17 | Map each security finding to the Toulmin claim it rebuts — integrate the security assessment into the argumentative structure rather than keeping it standalone | §7.5, Lessons §4 | `SECURITY.md`, `docs/analysis/toulmin.md` | Not started |

---

## 6. Identity & Governance Separation

Changes that separate persona configuration from behavioral constraints.

| ID | Change | Source | File(s) | Status |
|---|---|---|---|---|
| T-18 | Create `GOVERNANCE.md` — factor governance-related behavioral constraints, permission boundaries, and safety rules out of `AGENTS.md` into a dedicated file | §6 Rebuttal, Lessons §7 | `GOVERNANCE.md` (new), `AGENTS.md` | Not started |
| T-19 | Add a `CODEOWNERS` entry requiring admin approval for `GOVERNANCE.md` changes | Lessons §7.Implementation.2 | `.github/CODEOWNERS` (new) | Not started |
| T-20 | Update `BOOTSTRAP.md` to reference both `AGENTS.md` (persona) and `GOVERNANCE.md` (constraints) during agent setup | Lessons §7.Implementation.3 | `.pi/BOOTSTRAP.md` | Not started |

---

## 7. Review Process

Changes that elevate code review from "does this work?" to "is this warranted?"

| ID | Change | Source | File(s) | Status |
|---|---|---|---|---|
| T-21 | Add a Toulmin review checklist to `CONTRIBUTING.md` with three structured questions: Grounds check, Warrant challenge, Rebuttal search | §7.6, Lessons §5 | `CONTRIBUTING.md` | Not started |
| T-22 | Create a `toulmin-review` label that signals a PR requires structured argumentative review | Lessons §5.Implementation.2 | GitHub repo labels | Not started |

---

## 8. Multi-Repo Awareness

Changes that extend GMI's applicability beyond the single-repo boundary.

| ID | Change | Source | File(s) | Status |
|---|---|---|---|---|
| T-23 | Create a `cross-repo-context` skill that fetches file contents from related repositories via the GitHub API (Phase 1: read-only) | §2 Rebuttal, Lessons §8 | `.pi/skills/cross-repo-context.md` (new), `.pi/extensions/` (new) | Not started |
| T-24 | Define a cross-repo linking convention in issue templates (Phase 2) | Lessons §8.Implementation.2 | `.github/ISSUE_TEMPLATE/` | Not started |
| T-25 | Design coordinated multi-repo PR orchestration via a lightweight orchestration issue (Phase 3 — deferred until governance model is mature) | Lessons §8.Implementation.3 | Design doc (future) | Not started |

---

## 9. Priority Ordering

The Toulmin lessons recommend the following priority grouping:

| Priority | Theme | IDs |
|---|---|---|
| **1 — Critical** | Runtime enforcement over prompt-level aspiration | T-06, T-07, T-08, T-09, T-10 |
| **2 — High** | Rebuttal-driven security hardening | T-11, T-12, T-13, T-17 |
| **3 — High** | Reasoning transparency over opaque action | T-01, T-03, T-04, T-05 |
| **4 — Medium** | Governance separation over monolithic configuration | T-18, T-19, T-20 |
| **5 — Medium** | Honest scoping over universal claims | T-14, T-15, T-16 |
| **6 — Low** | Structured review over ad-hoc evaluation | T-21, T-22 |
| **7 — Low** | Multi-repo awareness (incremental, deferred Phase 3) | T-23, T-24, T-25 |
| **—** | JSON mode integration (depends on pi upstream) | T-02, T-04 |

---

## 10. Summary

This master list contains **25 distinct changes** derived from the Toulmin model's application to GMI. They decompose into:

- **5** agent reasoning & transparency improvements
- **4** runtime ethical guardrail implementations
- **4** security hardening items mapped to specific SEC findings
- **4** documentation and scope qualification updates
- **3** identity/governance separation tasks
- **2** review process enhancements
- **3** multi-repo awareness phases

Every change traces to a specific Toulmin component — a Rebuttal that identifies a boundary, a Qualifier that scopes a claim, or an Enhancement subsection (§7.x) that proposes structural improvement. The priority ordering follows the Toulmin lessons' principle: enforce first, then illuminate, then separate, then scope, then review, then extend.

No change on this list exists in the current codebase. The `lifecycle/agent.ts` has basic input validation (reserved prefix checking, API key validation) but none of the output filtering, diff scanning, or sandboxing recommended here. `AGENTS.md` contains persona attributes only — governance content has not been factored out because `GOVERNANCE.md` does not yet exist. The `CONTRIBUTING.md` lacks Toulmin review guidance, and the `README.md` lacks explicit scope qualifiers.

---

*Derived from [toulmin.md](toulmin.md) and [toulmin-lessons.md](toulmin-lessons.md), applied to [GitHub Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence)*
