# Scientific Method — Applied to GitHub Minimum Intelligence

> *"The scientific method doesn't ask 'Is this warranted?' — it asks 'Can this be falsified?'"*

The scientific method decomposes knowledge claims into a cycle of observation, hypothesis, prediction, experiment, and revision. Unlike rhetorical or argumentative frameworks, it demands that every claim expose itself to empirical refutation. A claim that cannot be tested is not wrong — it is not yet science.

This document applies the scientific method to the core claims advanced by GitHub Minimum Intelligence (GMI), reformulating each as a testable hypothesis with explicit falsification criteria.

---

## 1. The Method

| Stage              | Role                                                                 |
|--------------------|----------------------------------------------------------------------|
| **Observation**    | A phenomenon or pattern noticed in the domain                        |
| **Hypothesis**     | A proposed explanation or mechanism, stated in falsifiable form       |
| **Prediction**     | A specific, measurable outcome that follows if the hypothesis holds  |
| **Experiment**     | A procedure designed to test the prediction under controlled conditions |
| **Falsification**  | The criteria that would disprove the hypothesis if the prediction fails |
| **Revision**       | How the hypothesis changes in light of experimental results           |

A complete scientific argument reads: *"We observe **O**. We hypothesize **H**. If H is correct, we predict **P**. We test via **E**. If **P** fails, **H** is falsified and must be revised."*

---

## 2. Hypothesis 1 — Context Fidelity

### Observation

External AI tools lose project context between interactions, producing suggestions that conflict with existing architecture, miss prior decisions, or repeat solved problems.

### Hypothesis

An AI agent operating inside a repository checkout — with direct filesystem, Git history, and issue thread access — will maintain higher context fidelity than an equivalent agent operating on serialized context summaries.

### Prediction

Given two identical tasks (bug fix, feature proposal, code review) across the same codebase, the repository-native agent will:

| Metric                             | Predicted outcome                                   |
|------------------------------------|-----------------------------------------------------|
| Conflicting suggestions            | Fewer than the context-serialized agent              |
| References to prior decisions      | More frequent, more accurate                         |
| Token budget for context           | Lower (reads filesystem directly vs. packing context)|
| Factual errors about project state | Lower rate                                           |

### Experiment

1. Select 20 real issues from GMI's history where context matters (architecture choices, naming conventions, dependency decisions).
2. Present each issue to both a repository-native agent (GMI) and an external agent (given the issue text plus a context window of relevant files).
3. Blind-evaluate responses for accuracy, relevance, and consistency with project history.

### Falsification Criteria

If the context-serialized agent matches or exceeds the repository-native agent on ≥3 of the 4 metrics across ≥75% of tasks, the hypothesis is falsified. Context serialization is sufficient, and the complexity of repository-native deployment is not justified by measurable improvement.

### Revision Path

If partially falsified (advantage only on some metrics), narrow the hypothesis: repository-native context may matter only for specific task types (e.g., architectural decisions but not formatting fixes).

---

## 3. Hypothesis 2 — Infrastructural Reuse

### Observation

GMI builds no new backend services, no new authentication systems, and no new data stores — it repurposes GitHub Issues, Actions, and Git as its conversation, compute, and memory layers.

### Hypothesis

Repurposing existing GitHub primitives results in lower total operational cost (maintenance burden, failure modes, security surface) than building equivalent dedicated infrastructure.

### Prediction

| Metric                          | Predicted outcome                                          |
|---------------------------------|------------------------------------------------------------|
| Components to maintain          | GMI: 1 npm package; dedicated system: ≥4 components       |
| Authentication systems          | GMI: 0 (uses GITHUB_TOKEN); dedicated: ≥1 custom          |
| Uptime dependency on third party| GMI: GitHub only; dedicated: GitHub + custom infra          |
| Time to initial deployment      | GMI: <5 min (npm install); dedicated: hours to days         |
| Attack surface area             | GMI: inherits GitHub's surface; dedicated: GitHub + custom  |

### Experiment

1. Build a minimal dedicated alternative: a webhook server, a job queue, a conversation database, and an auth layer — all providing the same capabilities GMI gets from GitHub primitives.
2. Measure lines of code, number of dependencies, deployment time, and documented CVEs across the dependency tree.
3. Run both systems for 30 days and compare: failure incidents, time-to-recover, and maintenance interventions required.

### Falsification Criteria

If the dedicated system achieves equivalent functionality with ≤50% more code and ≤2 additional failure incidents over 30 days, the infrastructural reuse hypothesis is falsified — the operational cost difference is too small to justify the constraints imposed by GitHub's primitives.

### Revision Path

If partially falsified, the hypothesis may hold only for small-scale or single-developer projects where the dedicated system's overhead is disproportionate. The scope qualifier must be tightened.

---

## 4. Hypothesis 3 — Auditability and Trust

### Observation

Every GMI agent action produces a Git commit — diffable, attributable, and reversible. Configuration files (persona, behavioral constraints) are checked-in Markdown subject to PR review.

### Hypothesis

Systems where every automated action is recorded as a version-controlled artifact are trusted more — and recover faster from errors — than systems where actions are logged but not version-controlled.

### Prediction

| Metric                          | Predicted outcome                                          |
|---------------------------------|------------------------------------------------------------|
| Time to detect unintended change| Git diff: seconds; log-based: minutes to hours              |
| Time to revert unintended change| `git revert`: seconds; log-based: manual reconstruction     |
| Reviewer confidence             | Higher when reviewing diffs than log entries                 |
| Post-incident analysis          | More complete when full history is traversable via `git log` |

### Experiment

1. Introduce 5 known-bad changes via the agent (a broken dependency, a security antipattern, a style violation, a logic error, a configuration mistake).
2. Measure: (a) time for a reviewer to detect each issue, (b) time to revert, (c) confidence rating (1–5 scale) in the reversion's completeness.
3. Compare against the same 5 changes introduced via a log-only system (actions recorded in an append-only log, no Git history).

### Falsification Criteria

If the log-only system achieves detection and reversion times within 2× of the Git-based system across all 5 scenarios, and reviewer confidence is ≥3.5/5 in both cases, the auditability advantage is falsified as a meaningful trust differentiator.

### Revision Path

If falsified, reframe the advantage as one of *developer familiarity* (Git is a known tool) rather than inherent structural superiority. The trust claim becomes a convenience claim.

---

## 5. Hypothesis 4 — Encoded Ethics

### Observation

GMI encodes ethical constraints (the Four Laws of AI) as versioned Markdown files in the repository, co-located with the system they govern.

### Hypothesis

Ethical constraints encoded as inspectable, versioned text and co-located with the system they govern are more consistently followed by an LLM agent than equivalent constraints delivered via an external, non-inspectable system prompt.

### Prediction

| Metric                              | Predicted outcome                                     |
|-------------------------------------|-------------------------------------------------------|
| Constraint violation rate           | Lower when constraints are in-repo (inspectable)       |
| Drift from intended behavior        | Lower over time when constraints are version-controlled |
| User awareness of constraints       | Higher when constraints are readable files              |
| Resistance to prompt injection      | **No difference** — both are prompt-level guidance       |

### Experiment

1. Define 10 test scenarios where the Four Laws should constrain agent behavior (e.g., "do not delete files without explicit request", "do not expose credentials in commits").
2. Run each scenario twice: once with constraints in-repo (GMI's model), once with identical constraints in a hidden system prompt.
3. Measure violation rates across 100 runs per scenario (to account for LLM nondeterminism).

### Falsification Criteria

If violation rates are statistically indistinguishable (p > 0.05) between the two delivery methods across all 10 scenarios, the hypothesis is falsified. The placement of ethical constraints (in-repo vs. system prompt) does not affect adherence; the content of the constraints is what matters.

### Revision Path

If falsified, the value of in-repo ethics shifts from *behavioral compliance* to *governance transparency* — the constraints are visible to humans, not more effective on the model. The ethical claim becomes a legibility claim, not an enforcement claim.

---

## 6. Hypothesis 5 — Collaborative Identity

### Observation

GMI's bootstrap protocol frames agent identity as a negotiation between human and agent, producing a versioned persona stored as editable configuration.

### Hypothesis

Agents whose identity is collaboratively authored and stored as editable configuration produce outputs more aligned with user expectations than agents with vendor-assigned fixed identities.

### Prediction

| Metric                          | Predicted outcome                                          |
|---------------------------------|------------------------------------------------------------|
| User satisfaction with tone     | Higher for co-created personas                              |
| Alignment with project norms    | Higher when persona is project-specific                     |
| Persona maintenance effort      | Low — most users will accept defaults                       |
| Measurable output quality       | **No significant difference** in code correctness            |

### Experiment

1. Offer 30 users two agent configurations: (a) a co-created persona following GMI's bootstrap, (b) a generic default persona.
2. Each user completes 5 tasks with each configuration (order randomized).
3. Measure: task completion quality (objective), user satisfaction (subjective), and willingness to continue using the agent.

### Falsification Criteria

If user satisfaction and willingness-to-continue scores are statistically indistinguishable between the two groups, the collaborative identity hypothesis is falsified as a driver of practical alignment. Identity co-creation is a preference, not a functional advantage.

### Revision Path

If falsified, reframe identity co-creation as a *governance* mechanism (humans explicitly define constraints) rather than an *alignment* mechanism (identity improves outputs). Separate the governance value from the personality value.

---

## 7. Epistemological Boundaries

The scientific method reveals specific limitations when applied to GMI's claims:

### 7.1 Reproducibility Challenge

LLM outputs are stochastic. Experiments must account for nondeterminism through large sample sizes and statistical significance testing — a higher bar than typical software benchmarks.

### 7.2 Operationalization Gap

Claims like "trust," "sovereignty," and "alignment" must be operationalized into measurable proxies. The choice of proxy shapes the conclusion: measuring "time to revert" tests a different aspect of trust than measuring "willingness to grant permissions."

### 7.3 Confounding Variables

Repository-native vs. external is not the only variable. Differences in model quality, prompt engineering, task complexity, and user expertise all confound the comparison. Experimental design must isolate the variable of interest.

### 7.4 Unfalsifiable Residuals

Some of GMI's claims resist falsification: "The repository is the mind" is a metaphor, not a hypothesis. "AI infrastructure must be governed by explicit ethical constraints" is a normative statement, not an empirical one. The scientific method can test the *consequences* of these positions but not the positions themselves.

---

## 8. Summary

The scientific method transforms GMI's architectural assertions into testable hypotheses with explicit falsification criteria. Its verdict:

| Hypothesis                   | Testability | Expected strength | Key risk                        |
|------------------------------|-------------|-------------------|---------------------------------|
| Context fidelity             | High        | Strong            | Serialization may be "good enough" |
| Infrastructural reuse        | High        | Moderate          | Constraints may outweigh savings |
| Auditability and trust       | High        | Strong            | Familiarity vs. structural advantage |
| Encoded ethics               | High        | Weak              | Placement ≠ effectiveness        |
| Collaborative identity       | Medium      | Weak              | Preference ≠ functional gain     |

The strongest claims are those most amenable to empirical testing — context fidelity and auditability. The weakest are those that conflate governance transparency with behavioral effectiveness — encoded ethics and collaborative identity. The scientific method does not adjudicate which claims are *important*; it adjudicates which are *testable* and which survive testing.

*"A theory that explains everything explains nothing."*

---

*Applied to [GitHub Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence) v1.1.0*
