# Debate Frameworks — Applied to GitHub Minimum Intelligence

> *"Debate doesn't ask 'Is this true?' — it asks 'Can you defend it against the strongest opposition?'"*

Competitive debate frameworks structure arguments for adversarial testing. Unlike Toulmin (which analyzes argument components) or formal logic (which evaluates validity), debate frameworks assume an opponent who will actively attack every claim. The question is not whether an argument is sound in isolation, but whether it survives the strongest possible counterargument.

This document subjects the core claims of GitHub Minimum Intelligence (GMI) to competitive debate analysis, using the structure of policy debate: **Affirmative case** (the argument for), **Negative case** (the argument against), **Clash** (where they conflict), and **Impact calculus** (which side's consequences matter more).

---

## 1. The Framework

| Component          | Role                                                                    |
|--------------------|-------------------------------------------------------------------------|
| **Resolution**     | The proposition being debated                                            |
| **Affirmative (Aff)** | The side advocating for the resolution; must prove the status quo should change |
| **Negative (Neg)** | The side opposing the resolution; may defend the status quo or propose a counterplan |
| **Clash**          | The specific point where Aff and Neg directly conflict                   |
| **Impact**         | The magnitude, probability, and timeframe of the consequences claimed    |
| **Uniqueness**     | Why the claimed impact only occurs under the proposed plan, not the status quo |
| **Solvency**       | Whether the proposed plan actually resolves the identified problem        |
| **Topicality**     | Whether the argument falls within the scope of the resolution            |

A debate round resolves: *"Weighing **Aff impacts** against **Neg impacts**, which world is preferable?"*

---

## 2. Resolution 1 — Context Fidelity

> **Resolved: AI agents should operate within the repository they assist, rather than as external services.**

### Affirmative Case

**Harm (Status Quo Problem):** External AI tools suffer from a structural context gap. Every interaction starts from zero or relies on lossy context serialization. This produces suggestions that conflict with existing architecture, miss prior decisions, and waste developer time on corrections.

**Plan:** Deploy AI agents as repository-native dependencies (GMI model) — running inside full checkouts with direct access to filesystem, Git history, and issue threads.

**Solvency:** The agent reads the actual codebase, not a summary. Context fidelity is maintained by construction, not by engineering effort.

**Impact:** Higher quality AI suggestions → fewer correction cycles → measurable developer productivity gain. Magnitude: applies to every AI interaction across the project's lifetime.

### Negative Case

**Status Quo Defense:** Modern external AI tools (IDE copilots, cloud-hosted agents) have invested heavily in context management — retrieval-augmented generation, codebase indexing, conversation memory. The context gap is shrinking, not structural.

**Counterplan:** Use an external AI tool with a repository index (vector embedding of the codebase, updated on each push). This provides context fidelity without the constraints of running inside GitHub Actions.

**Disadvantage (DA):** Repository-native deployment introduces a new constraint: the agent is limited to GitHub Actions runners. This means cold-start latency (30–90 seconds per interaction), runner time limits (6 hours), and compute cost (billed per minute). These constraints do not exist for externally hosted agents.

### Clash Matrix

| Issue              | Aff Position                             | Neg Position                              | Advantage |
|--------------------|------------------------------------------|-------------------------------------------|-----------|
| Context quality    | Structural access to full repo           | RAG/indexing closes the gap sufficiently   | Aff (slight) |
| Latency            | Inherent Actions cold-start delay        | Sub-second response in IDE                 | **Neg** |
| Cost               | GitHub Actions minutes (variable)        | Fixed subscription or API cost             | Depends |
| Maintenance        | No separate infra to maintain            | Index must be maintained and updated       | Aff |

### Impact Calculus

The Aff wins on **quality and maintenance** but loses on **latency**. For asynchronous workflows (code review, issue triage), the latency disadvantage is irrelevant and Aff wins clearly. For synchronous workflows (pair programming, live debugging), Neg wins decisively. **Verdict: Aff wins for async use cases; Neg wins for sync.**

---

## 3. Resolution 2 — Infrastructure Reuse

> **Resolved: AI systems should repurpose existing platform primitives rather than building dedicated infrastructure.**

### Affirmative Case

**Harm:** Every new infrastructure component increases attack surface, operational burden, and cognitive load. The AI tooling ecosystem is producing a proliferation of new services (vector databases, orchestration layers, agent frameworks) that most teams cannot effectively maintain.

**Plan:** Use GitHub Issues for conversation, Actions for compute, and Git for memory. No new backends, no new auth systems, no new data stores.

**Solvency:** GMI demonstrates that a functioning AI agent can be built entirely from existing primitives. The existence proof is the project itself.

**Impact:** Zero additional infrastructure → zero additional maintenance burden → lower total cost of ownership. Unique to the plan because dedicated infrastructure inherently adds components.

### Negative Case

**Topicality Challenge:** "Repurpose existing primitives" conflates two different things: (a) using a platform's API as intended, and (b) using a platform's features in ways they were not designed for. Using Issues as a conversation layer for an AI agent is category (b) — it works despite design intent, not because of it.

**Counterplan:** Build a minimal dedicated agent service that uses GitHub's API for triggers and Git for storage, but adds a purpose-built conversation layer and job queue. This captures the benefits of existing infrastructure while avoiding the impedance mismatch of forcing Issues and Actions into roles they were not designed for.

**Disadvantage:** Repurposing primitives creates **hidden costs**:

| Hidden cost                        | Example                                           |
|------------------------------------|----------------------------------------------------|
| Feature ceiling                    | Issues lack structured data; workarounds needed     |
| Vendor lock-in                     | Entire system depends on GitHub's platform decisions |
| Impedance mismatch                 | Actions' cold-start model is wrong for interactive AI |
| Debugging difficulty               | Failures in repurposed primitives are harder to diagnose |

### Clash Matrix

| Issue              | Aff Position                             | Neg Position                              | Advantage |
|--------------------|------------------------------------------|-------------------------------------------|-----------|
| Complexity         | Zero new components                      | Minimal additions, purpose-fit            | Aff |
| Fitness for purpose| Sufficient for current needs             | Primitives are misused                    | **Neg** |
| Vendor lock-in     | GitHub is already a dependency           | Dependency is deepened by repurposing     | **Neg** |
| Adoption barrier   | `npm install` — done                     | Requires deployment of additional services| Aff |

### Impact Calculus

The Aff wins on **adoption simplicity** — the ability to install with a single command is a powerful practical advantage. The Neg wins on **long-term scalability** — purpose-built infrastructure handles growth better than repurposed primitives. **Verdict: Aff wins for small-scale and initial adoption; Neg wins for scaling and long-term maintenance.**

---

## 4. Resolution 3 — Trust Through Transparency

> **Resolved: AI systems are more trustworthy when every action is auditable through version control.**

### Affirmative Case

**Harm:** Platform-hosted AI tools operate behind opaque APIs. Users cannot inspect the system prompt, the reasoning process, or the full history of model behavior. This opacity creates a trust deficit that inhibits adoption by security-conscious teams.

**Plan:** Make every agent action a Git commit — diffable, attributable, and reversible. Publish the agent's full configuration (persona, constraints, behavioral rules) as checked-in files.

**Solvency:** Git provides structural guarantees: immutability (commits cannot be altered without changing the hash), attribution (every commit has an author), and reversibility (`git revert`). These are not features that can be toggled off.

**Impact:** Teams can adopt AI assistance without sacrificing audit requirements. Magnitude: enables AI adoption in security-conscious environments that would otherwise reject it entirely.

### Negative Case

**Concession and Distinction:** The Neg concedes that auditability is valuable but argues it is **necessary, not sufficient** for trust.

**Disadvantage (Audit Theater):** Auditability without capacity to review creates *audit theater* — the appearance of oversight without the substance. If the agent commits faster than humans can review, the audit trail becomes a historical record, not a control mechanism.

| Trust component       | Addressed by Git audit? | Gap                                   |
|-----------------------|------------------------|---------------------------------------|
| Action transparency   | ✓ Yes                  | —                                      |
| Reasoning transparency| ✗ No                   | Commits record results, not derivations|
| Real-time oversight   | ✗ No                   | Review is post-hoc, not pre-action     |
| Safety guarantees     | ✗ No                   | Audit ≠ prevention                     |

**Counterplan:** Pair the Git audit trail with **pre-action review gates** — the agent proposes changes but does not commit until a human approves. This addresses the trust gap that pure post-hoc auditing cannot.

### Clash Matrix

| Issue              | Aff Position                             | Neg Position                              | Advantage |
|--------------------|------------------------------------------|-------------------------------------------|-----------|
| Action transparency| Git commits = full transparency          | Conceded                                   | Aff |
| Reasoning opacity  | Not addressed                            | Commits miss the "why"                     | **Neg** |
| Speed of review    | Async review is sufficient               | Agent speed > human review speed           | **Neg** |
| Reversibility      | `git revert` is immediate                | Prevention > reversion                     | **Neg** |

### Impact Calculus

The Aff establishes a **necessary condition** for trust. The Neg demonstrates it is not **sufficient**. The Neg's counterplan (pre-action review gates) is strictly superior — it includes everything the Aff offers plus pre-commit oversight. **Verdict: Neg wins by counterplan superiority.** The Aff should adopt the counterplan.

---

## 5. Resolution 4 — Encoded Ethics

> **Resolved: AI ethical constraints should be encoded as versioned files within the system they govern.**

### Affirmative Case

**Harm:** Ethical constraints in vendor system prompts are invisible to users, unmodifiable, and unaccountable. Users cannot verify what rules govern their AI, cannot adjust them for their context, and cannot audit whether the rules are followed.

**Plan:** Encode ethical constraints as Markdown files in the repository. Make them subject to the same version control, review, and modification process as code.

**Solvency:** Version-controlled ethics files are readable, diffable, and governed by CODEOWNERS. Changes require explicit review. The constraints are transparent by construction.

**Impact:** Shifts ethical governance from vendor-controlled to user-controlled, enabling contextual adaptation and accountability.

### Negative Case

**Kritik (fundamental challenge):** The Aff conflates *visibility* with *governance*. A Markdown file is not a law; it is a suggestion. The LLM does not mechanically obey the file — it receives the text as part of a prompt and may follow, ignore, or misinterpret it. Encoding ethics as text creates an **illusion of governance** without enforcement machinery.

**Disadvantage (False Security):** Publishing ethical constraints that are not enforced at runtime is worse than having no published constraints, because it gives users a false sense of safety. Users who read the governance constraints and believe they are enforced may take risks they would not take with a system that made no ethical claims.

**Counterplan:** Implement ethical constraints as **runtime enforcement mechanisms** — input validation, output filtering, and action sandboxing — rather than as prompt-level text. Publish the enforcement rules (not just the aspirational text) as the governance artifact.

### Clash Matrix

| Issue              | Aff Position                             | Neg Position                              | Advantage |
|--------------------|------------------------------------------|-------------------------------------------|-----------|
| Transparency       | Ethics visible and diffable              | Conceded                                   | Aff |
| Enforcement        | Prompt guidance is sufficient            | LLMs don't obey; runtime needed           | **Neg** |
| User expectations  | Users understand prompt-level guidance   | Users may assume enforcement              | **Neg** |
| Adaptability       | Users can modify constraints per-project | Runtime rules are harder to customize     | Aff |

### Impact Calculus

The Neg's kritik is devastating: the central mechanism (Markdown file → LLM compliance) has no causal link. The Aff establishes transparency value but cannot claim enforcement. **Verdict: Neg wins on enforcement; Aff retains transparency.** The optimal position combines both — visible ethical principles backed by runtime enforcement.

---

## 6. Resolution 5 — Collaborative Identity

> **Resolved: AI agent identity should be co-created by human and agent, not imposed by a vendor.**

### Affirmative Case

**Harm:** Vendor-assigned AI identities are generic, undifferentiated, and disconnected from the project context. Users have no voice in defining the agent's tone, values, or behavioral norms.

**Plan:** Implement a bootstrap protocol where human and agent collaboratively define the agent's persona, stored as versioned Markdown.

**Solvency:** The bootstrap protocol produces a project-specific, user-approved identity. Changes are tracked through Git like any other configuration.

**Impact:** Better alignment between agent behavior and team expectations. Emotional investment in a co-created agent increases adoption and trust.

### Negative Case

**Turn (the advantage becomes a disadvantage):** Co-creation requires effort that most users will not invest. In practice, defaults will dominate. The Aff's impact (better alignment through customization) applies only to the small minority who engage with the bootstrap process. For the majority, co-creation is a friction cost without a benefit.

**Empirical Challenge:** No evidence is presented that co-created personas produce measurably better outcomes (code quality, bug rates, task completion) than default personas. The claimed impact is subjective (user satisfaction) rather than functional.

**Disadvantage (Attack Surface):** Storing identity as editable Markdown creates a governance risk. An attacker who can modify `AGENTS.md` can redefine the agent's constraints — identity becomes a vulnerability vector.

### Clash Matrix

| Issue              | Aff Position                             | Neg Position                              | Advantage |
|--------------------|------------------------------------------|-------------------------------------------|-----------|
| User engagement    | Co-creation increases investment         | Most users won't engage                   | **Neg** |
| Output quality     | Better alignment improves quality        | No empirical evidence                      | **Neg** |
| Security           | Versioned config is auditable            | Editable config is an attack vector        | **Neg** |
| Philosophical      | User agency over AI identity             | Conceded as a value                        | Aff |

### Impact Calculus

The Neg wins empirically — the Aff cannot demonstrate functional impact beyond philosophical preference. The Aff retains the philosophical value of user agency, but this does not outweigh the Neg's practical objections. **Verdict: Neg wins on practical grounds; Aff wins on principle.** The resolution should be qualified: co-creation is *available* as an option, not *required* as a default.

---

## 7. Cross-Cutting Debate Patterns

### 7.1 The Scope Problem

Every Aff case would be strengthened by explicitly scoping the resolution. GMI's arguments are strong for specific contexts (single-repo, async, GitHub-native teams) and weak outside them. In debate terms, the Aff should **concede inapplicable ground** rather than defending universal claims.

### 7.2 The Enforcement Gap

The Neg's strongest line of attack across multiple resolutions is the gap between *stated properties* and *enforced properties*. Auditability does not enforce review. Ethical text does not enforce compliance. Identity configuration does not enforce security. The Aff's systemic weakness is conflating visibility with control.

### 7.3 Counterplan Superiority

In three of five resolutions, the Neg wins not by rejecting the Aff's values but by offering a **strictly superior alternative** — a counterplan that includes the Aff's benefits plus additional safeguards. This suggests GMI's direction is correct but its implementation is incomplete. The Neg's counterplans map to a development roadmap.

### 7.4 Impact Weighing

| Resolution               | Aff strongest impact             | Neg strongest impact              | Net |
|--------------------------|----------------------------------|-----------------------------------|-----|
| Context fidelity         | Quality (async workflows)        | Latency (sync workflows)          | Split |
| Infrastructure reuse     | Adoption simplicity              | Long-term scalability             | Split |
| Trust through transparency| Necessary trust condition        | Insufficient; need pre-action gates| Neg |
| Encoded ethics           | Transparency                     | False security from unenforced rules| Neg |
| Collaborative identity   | User agency (philosophical)      | No empirical functional benefit   | Neg |

---

## 8. Summary

Competitive debate reveals that GMI's arguments are **defensible on their own ground but vulnerable to counterplans and enforcement critiques**. The Affirmative establishes genuine value in every resolution — context fidelity, simplicity, transparency, ethical visibility, user agency — but overreaches when claiming these properties are sufficient rather than necessary.

The Negative's most effective strategy is not *rejection* but *improvement*: accepting GMI's values while proposing strictly superior implementations. This is the most useful outcome of the debate framework — it transforms opposition into a development roadmap.

| Resolution               | Debate verdict                    | Development implication                    |
|--------------------------|-----------------------------------|--------------------------------------------|
| Context fidelity         | Aff wins (async); Neg wins (sync)| Scope claims to async workflows             |
| Infrastructure reuse     | Aff wins (adoption); Neg wins (scale)| Plan for scaling constraints            |
| Trust through transparency| Neg wins (counterplan)           | Add pre-action review gates                 |
| Encoded ethics           | Neg wins (kritik)                | Implement runtime enforcement               |
| Collaborative identity   | Neg wins (empirics)              | Make co-creation optional, not default      |

The debate framework's unique contribution is forcing GMI to defend its claims against the *strongest* opposition — not a sympathetic reviewer but an adversary whose job is to find every weakness. What survives that test is genuinely robust.

*"The best swordsman in the world doesn't need to fear the second best swordsman — he needs to fear the worst, because there's no telling what that fool will do."*

---

*Applied to [GitHub Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence) v1.1.0*
