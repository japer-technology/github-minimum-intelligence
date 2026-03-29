# Formal Logic — Applied to GitHub Minimum Intelligence

> *"Formal logic doesn't ask 'Is this warranted?' — it asks 'Does this necessarily follow?'"*

Formal logic evaluates arguments by their structure, not their content. A valid argument is one where the conclusion cannot be false if the premises are true — regardless of whether the premises are, in fact, true. Soundness requires both valid structure *and* true premises.

This document translates the core claims of GitHub Minimum Intelligence (GMI) into formal logical structures, evaluating each for validity (does the conclusion follow?), soundness (are the premises true?), and completeness (are all necessary premises stated?).

---

## 1. The Framework

| Concept             | Role                                                                 |
|---------------------|----------------------------------------------------------------------|
| **Proposition**     | A statement that is either true or false                              |
| **Premise**         | A proposition assumed or asserted as true for the argument            |
| **Conclusion**      | A proposition that is claimed to follow from the premises             |
| **Validity**        | The conclusion follows necessarily from the premises                  |
| **Soundness**       | The argument is valid *and* all premises are true                     |
| **Hidden premise**  | An unstated assumption required for validity                          |
| **Logical form**    | The abstract structure (modus ponens, disjunctive syllogism, etc.)    |

A sound deductive argument reads: *"Given premises P₁, P₂, … Pₙ are true, conclusion C necessarily follows by rule R."*

---

## 2. Argument 1 — Context Through Colocation

### Natural Language

Repository-native AI eliminates the context gap that external AI tools cannot close because the agent operates within the same substrate as the work it assists.

### Formal Structure

```
P1: An agent that operates within the same substrate as its work 
    has direct access to full project context.
P2: Direct access to full project context eliminates the context gap.
P3: GMI's agent operates within the repository (the substrate of the work).
∴ C: GMI's agent eliminates the context gap.
    [Modus Ponens: P1 ∧ P3 → direct access; P2 ∧ direct access → C]
```

### Validity Assessment

**Valid.** The syllogism is structurally sound — if P1, P2, and P3 are true, C follows necessarily.

### Soundness Assessment

| Premise | Status | Challenge |
|---------|--------|-----------|
| P1      | **Contestable** | "Direct access" conflates filesystem access with *comprehension*. An agent can read every file without understanding architectural intent. |
| P2      | **Contestable** | "Eliminates" is absolute. Context gaps exist at multiple levels: syntactic (file contents), semantic (design rationale), pragmatic (user intent). Filesystem access addresses only the syntactic level. |
| P3      | **True** | GMI runs in a full checkout on a GitHub Actions runner. This is verifiable. |

### Hidden Premises

- **HP1:** Full project context is contained within the repository filesystem and Git history. (Excludes: Slack conversations, design documents in external tools, verbal agreements, tacit knowledge.)
- **HP2:** The agent can process the available context within its token budget. (A 200k-file monorepo may contain full context that exceeds the model's window.)

### Verdict

**Valid but unsound as stated.** P2's absolute claim ("eliminates") makes the argument brittle. Replacing "eliminates" with "reduces" yields a sound argument.

---

## 3. Argument 2 — Infrastructural Superiority

### Natural Language

Repurposing existing GitHub primitives is architecturally superior to building dedicated AI infrastructure.

### Formal Structure

```
P1: For any system S, if S can be built from existing, maintained 
    components rather than new components, then S has lower operational 
    cost and higher reliability.
P2: GMI is built from existing GitHub components (Issues, Actions, Git).
P3: Dedicated AI infrastructure requires new components (backend, 
    auth, data store).
∴ C: GMI has lower operational cost and higher reliability than 
    dedicated AI infrastructure.
    [Modus Ponens: P1 ∧ P2 → lower cost/higher reliability for GMI;
     contrast with P3]
```

### Validity Assessment

**Valid.** If P1 is true and P2 correctly characterizes GMI, C follows.

### Soundness Assessment

| Premise | Status | Challenge |
|---------|--------|-----------|
| P1      | **Contestable** | The premise assumes existing components are *fit for purpose*. Repurposing components for unintended use cases can introduce impedance mismatch, increasing rather than decreasing operational cost. A purpose-built system may have higher initial cost but lower long-term friction. |
| P2      | **True** | Verifiable from the codebase. GMI uses no custom backend. |
| P3      | **True** | Any equivalent dedicated system would require at minimum a compute layer and a state layer. |

### Hidden Premises

- **HP1:** GitHub's primitives are sufficiently expressive for GMI's interaction model. (If Issues cannot represent structured conversations, the cost of working around limitations may exceed the cost of building a purpose-built conversation layer.)
- **HP2:** GitHub's availability and reliability exceed what a project team could achieve independently. (True for most teams; false for organizations with dedicated SRE capabilities.)

### Fallacy Risk

**Equivocation on "superior."** The argument uses "architecturally superior" but proves only "operationally cheaper under specific conditions." Superiority implies a total ordering; the actual relationship is a partial ordering contingent on use case.

### Verdict

**Valid but scope-dependent.** Sound for small-to-medium single-repo projects. Unsound when the constraints of GitHub's primitives create workaround costs that exceed the cost of purpose-built alternatives.

---

## 4. Argument 3 — Trust Through Auditability

### Natural Language

Repository-native AI is inherently more trustworthy than platform-hosted AI because every action is auditable, reversible, and governed by existing access control.

### Formal Structure

```
P1: If every action of a system is auditable, reversible, and subject 
    to access control, then the system is trustworthy.
P2: Every action of GMI's agent is a Git commit — auditable, 
    reversible, and governed by repository access control.
∴ C: GMI's agent is trustworthy.
    [Modus Ponens: P1 ∧ P2 → C]
```

### Validity Assessment

**Valid.** The structure is a straightforward modus ponens.

### Soundness Assessment

| Premise | Status | Challenge |
|---------|--------|-----------|
| P1      | **False as stated** | Auditability is *necessary* but not *sufficient* for trust. A system can be fully auditable and still untrustworthy if: (a) no one reviews the audit trail, (b) the audit trail records actions but not reasoning, (c) the system acts faster than humans can review. |
| P2      | **Partially true** | Agent *code changes* are Git commits. But agent *reasoning* is not recorded. The commit is the conclusion; the derivation is opaque. |

### Logical Correction

```
P1': If every action of a system is auditable, reversible, and subject 
     to access control, AND reviewers actively inspect the audit trail, 
     then the system is more trustworthy than an equivalent system 
     without these properties.
P2': Most GMI agent actions are Git commits; reasoning is not 
     currently captured.
∴ C': GMI's agent is more trustworthy than an unauditable equivalent, 
     conditional on active review and incomplete with respect to 
     reasoning transparency.
```

### Hidden Premises

- **HP1:** Reviewers have the expertise and time to evaluate agent-generated diffs. (A correct but malicious change may pass review if the reviewer lacks domain knowledge.)
- **HP2:** Access control is correctly configured. (GMI's own security assessment identifies SEC-005: no branch protection.)

### Verdict

**Valid but unsound.** P1 conflates necessary and sufficient conditions. The corrected argument (P1', C') is both valid and sound — but weaker than the original claim.

---

## 5. Argument 4 — Ethics as Encoded Constraints

### Natural Language

AI infrastructure must be governed by explicit, hierarchical ethical constraints encoded in the same substrate the AI operates on.

### Formal Structure

```
P1: Ethical constraints that are inspectable and co-located with the 
    system they govern are more likely to be maintained and enforced.
P2: GMI encodes its ethical constraints (the Four Laws) as versioned 
    Markdown in the repository.
P3: The repository is the substrate GMI operates on.
∴ C: GMI's ethical constraints are more likely to be maintained and 
    enforced than externally imposed constraints.
    [P1 ∧ P2 ∧ P3 → C]
```

### Validity Assessment

**Valid.** If co-location improves maintenance and enforcement (P1), and GMI co-locates its constraints (P2, P3), then the conclusion follows.

### Soundness Assessment

| Premise | Status | Challenge |
|---------|--------|-----------|
| P1      | **Contestable** | "More likely to be maintained" is plausible for human-readable configuration. "More likely to be enforced" conflates *visibility* with *enforcement*. A visible constraint without a runtime enforcement mechanism is advisory, not enforced. |
| P2      | **True** | Verifiable: `the-four-laws-of-ai.md` exists in the repo. |
| P3      | **True** | The agent reads its configuration from the repo filesystem. |

### Logical Distinction

The argument conflates two distinct properties:

```
Maintenance:  co-location → easier to update → more likely maintained    ✓ Valid
Enforcement:  co-location → ??? → more likely enforced                   ✗ Non sequitur
```

Co-location aids *maintenance* (humans can find and edit the file). It does not aid *enforcement* (the LLM does not mechanically obey the file's contents). Enforcement requires runtime mechanisms external to the constraint text itself.

### Verdict

**Valid for maintenance; invalid for enforcement.** The argument is a non sequitur when it claims enforcement follows from co-location. Splitting the conclusion into two separate claims — one about maintenance, one about enforcement — reveals that only the maintenance claim is sound.

---

## 6. Argument 5 — Identity Through Dialogue

### Natural Language

Agent identity that emerges from dialogue and is maintained as editable configuration is more adaptive and aligned than identity imposed by a vendor.

### Formal Structure

```
P1: If an agent's identity is defined through dialogue between human 
    and agent, then the resulting identity reflects the human's 
    expectations.
P2: If an identity reflects the human's expectations, then the agent's 
    outputs are more aligned with the human's needs.
P3: GMI's bootstrap protocol defines identity through human-agent 
    dialogue.
∴ C: GMI's agent outputs are more aligned with the human's needs.
    [Hypothetical Syllogism: P1 ∧ P2 ∧ P3 → C]
```

### Validity Assessment

**Valid.** Hypothetical syllogism is a sound inference rule.

### Soundness Assessment

| Premise | Status | Challenge |
|---------|--------|-----------|
| P1      | **Contestable** | Dialogue may produce an identity that reflects what the human *says* they want, not what they actually need. There is a well-documented gap between stated and revealed preferences. |
| P2      | **Contestable** | Alignment of *identity* (tone, style) does not entail alignment of *outputs* (code quality, decision correctness). An agent with the "perfect" persona can still produce incorrect code. |
| P3      | **True** | The bootstrap protocol is documented and observable. |

### Hidden Premises

- **HP1:** The dialogue produces a sufficiently specified identity. (If the human provides vague guidance, the identity is effectively a default.)
- **HP2:** Identity persistence matters — the agent retains and uses the defined identity across sessions. (Dependent on prompt engineering and context window management.)

### Fallacy Risk

**Affirming the consequent (partial).** The argument assumes: *identity alignment → output alignment*. But output alignment has many causes (model capability, task difficulty, context quality). Identity alignment is neither necessary nor sufficient.

### Verdict

**Valid but weakly sound.** The premises establish a plausible causal chain but each link is contestable. The argument proves something weaker than it claims: collaborative identity definition is a *contributor* to alignment, not a *sufficient condition* for it.

---

## 7. Meta-Analysis: Recurring Logical Patterns

### 7.1 Necessary vs. Sufficient Conditions

The most common logical error across GMI's arguments is conflating necessary and sufficient conditions. Auditability is *necessary* for trust, not *sufficient*. Co-location is *necessary* for maintenance, not *sufficient* for enforcement. Dialogue is a *contributor* to alignment, not a *guarantee*.

### 7.2 Absolute Language in Non-Absolute Claims

Words like "eliminates," "inherently," "must be," and "superior" impose logical obligations that the premises cannot discharge. Replacing them with qualified language ("reduces," "tends to be," "should be considered") produces sound arguments from valid structures.

### 7.3 Equivocation

Several arguments equivocate on key terms: "context" (syntactic vs. semantic), "trust" (auditability vs. safety), "enforce" (visibility vs. runtime constraint), "aligned" (persona vs. output quality). Defining terms precisely is a prerequisite for sound formal reasoning.

### 7.4 The Value of Formalization

Translating natural-language arguments into formal logic reveals structural weaknesses that informal reading misses. GMI's arguments are *persuasive* in natural language — they are less *certain* when held to formal standards. This is not a defect; few practical arguments achieve formal soundness. The value is in knowing *where* the uncertainty lives.

---

## 8. Summary

Formal logic provides a strict lens for evaluating GMI's claims:

| Argument                 | Valid? | Sound? | Key weakness                                      |
|--------------------------|--------|--------|---------------------------------------------------|
| Context through colocation | Yes    | No*    | "Eliminates" → should be "reduces"                |
| Infrastructural superiority| Yes    | Partial| Scope-dependent; equivocates on "superior"         |
| Trust through auditability | Yes    | No*    | Necessary ≠ sufficient; reasoning is opaque        |
| Ethics as encoded constraints | Yes  | Partial| Valid for maintenance; invalid for enforcement     |
| Identity through dialogue  | Yes    | Weak   | Identity alignment ≠ output alignment              |

*\* Sound when claims are weakened to qualified versions.*

Every argument is **valid** — the logical structure holds. None is **fully sound** as originally stated — the premises make claims stronger than the evidence supports. This is the characteristic finding of formal analysis applied to practical arguments: the architecture of reasoning is correct, but the building materials need qualification.

Formal logic's contribution is not to reject these arguments but to *locate precisely* where each one overreaches — and, consequently, where qualification transforms a brittle absolute into a resilient conditional.

*"In logic, there is no such thing as 'almost valid.'"*

---

*Applied to [GitHub Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence) v1.1.0*
