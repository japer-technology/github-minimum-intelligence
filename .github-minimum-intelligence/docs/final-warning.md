# Before You Begin

## Final Warning: Important Information

**We recommend reading this document before using this software. It covers what the system does, what to be aware of, and how to use it responsibly.**

---

### What This Software Is

This is an AI-powered coding. It is intended for use by qualified developers for the purpose of building, maintaining, and deploying complex software systems.

---

### Capabilities and Scope

Before deploying this system, it helps to understand what the agent can access. The [Capabilities Analysis](warning-blast-radius.md) is a factual, evidence-based audit of the out-of-the-box capabilities available to the agent running as a GitHub Actions workflow.

> **Note:** Most of these capabilities are standard properties of any GitHub Actions workflow running on `ubuntu-latest`. They are not unique to this project. We document them here so you can make informed decisions about your security posture.

**Key areas to be aware of:**

| Dimension | Level |
|---|---|
| Code & Repository Access | 🔴 High priority |
| Supply Chain Considerations | 🔴 High priority |
| Secret Exposure | 🔴 High priority |
| Cross-Repository Access (Org) | 🔴 High priority |
| Network Egress | 🟠 Moderate priority |
| Compute Resources | 🟠 Moderate priority |
| Persistence | 🟡 Low priority |

**Summary:** Like any GitHub Actions workflow with write permissions, the agent has broad access to the repository and its secrets. Standard hardening practices (branch protection, scoped tokens, code review) are recommended — see the full analysis for details.

**Full analysis:** [warning-blast-radius.md](warning-blast-radius.md)

**Security assessment:** [security-assessment.md](security-assessment.md)

---

### Things to Keep in Mind

- **AI-generated code may contain errors, hallucinations, or security vulnerabilities.** Always review before deploying to production.

- **Do not use AI output as the sole basis for decisions affecting human safety, liberty, or livelihood.**

- **This software may produce confident-sounding responses that are factually incorrect.** Verify important claims independently.

- **Outputs may reflect biases present in training data.** Exercise professional judgment at all times.

- **Do not feed secrets, API keys, passwords, or private credentials into AI prompts.**

---

### Before You Use This Software

**Do not use this software if you:**

- Intend to cause harm to individuals, communities, or the public interest.
- Plan to build weapons, surveillance tools targeting individuals or groups, or tools of oppression.
- Seek to exfiltrate, expose, or misuse private data, credentials, or secrets.
- Aim to introduce malicious code, supply chain attacks, or deliberate vulnerabilities.

**Talk to a qualified professional before use if you:**

- Are unsure whether your intended use could cause harm.
- Are handling sensitive personal data or regulated information.
- Are building safety-critical systems (medical, aviation, automotive).
- Are operating in a jurisdiction with specific AI compliance requirements.

---

### Dosage and Method of Use

- **Recommended dose:** Apply in measured, reviewable increments. Small, well-tested changes are safer than large, sweeping ones.
- **Do not exceed:** Human oversight capacity. If you cannot review what the AI produces, you are using too much.
- **Method:** Always pair with version control, code review, and automated testing.
- **Duration of use:** Continuous use without breaks in human judgment may lead to over-reliance. Step back regularly.

---

### Possible Side Effects

Like all powerful tools, this software may cause side effects. Not everybody experiences them.

**Common (may affect more than 1 in 10 users):**
- Over-confidence in generated output
- Reduced inclination to read documentation
- Mild dependency on autocomplete

**Uncommon (may affect up to 1 in 10 users):**
- Cargo-culted code patterns
- Subtle bugs introduced by plausible-looking but incorrect logic
- Erosion of foundational coding skills

**Rare (may affect up to 1 in 100 users):**
- Deployment of unreviewed AI-generated code to production
- Accidental exposure of sensitive data in prompts or logs
- Licensing or intellectual property complications

**Very rare (may affect up to 1 in 1,000 users):**
- Critical security vulnerabilities shipped to end users
- Complete loss of understanding of own codebase

**If you experience any serious side effects, stop and consult your team lead, security officer, or ethics board.**

---

### Storage

- Store all AI-generated artifacts in version-controlled repositories.
- Maintain audit trails for all consequential AI-driven actions.
- Keep backups. Ensure all work is reversible.
- Do not store this software's outputs as a substitute for authoritative documentation.

---

### Disposal

- When decommissioning, ensure all AI-generated code is reviewed for orphaned credentials, hardcoded secrets, or undocumented dependencies.
- Exercise your right to leave. Export your data and history. Your work belongs to you.

---

### Contents of the Package

| Component | Purpose |
|---|---|
| AI Model | Code generation, analysis, and assistance |
| Human Operator | Judgment, accountability, and final authority |

**The active ingredient is human judgment. The AI is the excipient.**

---

### Foundational Questions

Six questions define the philosophical and architectural foundation of this project. Read them to understand not just *what* this software does, but *why* it exists and *how* it changes the relationship between developers and AI.

| Question | Document | Core Inquiry |
|----------|----------|--------------|
| **What?** | [question-what.md](question-what.md) | What is GitHub Minimum Intelligence? A repository-native AI collaboration framework — not a hosted platform, but a local intelligence layer built from issues, workflows, markdown, and commits. |
| **Who?** | [question-who.md](question-who.md) | Who speaks, executes, remembers, and governs when the repository itself becomes the mind? Identity as a layered stack of human, workflow, and model. |
| **When?** | [question-when.md](question-when.md) | How does Git replace ephemeral sessions? Memory becomes durable, trust becomes auditable, and collaboration becomes resilient across time. |
| **Where?** | [question-where.md](question-where.md) | Where does intelligence live? Runtime in GitHub Actions, memory in versioned state files, identity in checked-in markdown, authorization in repository permissions. |
| **How?** | [question-how.md](question-how.md) | Issues as conversational input, Actions as execution runtime, an LLM as reasoning substrate, and Git commits as durable memory. |
| **How Much?** | [question-how-much.md](question-how-much.md) | How much intelligence can a repository hold? The ceiling is social stewardship, not token count — memory scales with Git history, not context windows. |

**Overview:** [questions.md](questions.md)

**Architectural thesis:** [the-repo-is-the-mind.md](the-repo-is-the-mind.md)

---

### Manufacturer

Maintained by humans, for humans.

*If you have any questions, or if there is anything you are not sure about, ask a human.*

---

**If something goes wrong:** `git revert`, then think.

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/logo.png" alt="Minimum Intelligence" width="500">
  </picture>
</p>
