# ⚠️ FINAL WARNING

> 📖 [Documentation Index](./index.md) · [The Four Laws of AI](./the-four-laws-of-ai.md) · [README](../../README.md)

## Important Safety Information

**Read this entire document before using this software. Keep it for future reference.**

---

### What This Software Is

This is an AI-powered coding infrastructure. It is intended for use by qualified developers for the purpose of building, maintaining, and deploying complex software systems.

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
- Are building safety-critical systems (medical, aviation, automotive, infrastructure).
- Are operating in a jurisdiction with specific AI compliance requirements.

---

### Warnings and Precautions

⚠️ **WARNING:** AI-generated code may contain errors, hallucinations, or security vulnerabilities. Never deploy to production without human review.

⚠️ **WARNING:** Do not use AI output as the sole basis for decisions affecting human safety, liberty, or livelihood.

⚠️ **WARNING:** This software may produce confident-sounding responses that are factually incorrect. Verify all claims independently.

⚠️ **WARNING:** Outputs may reflect biases present in training data. Exercise professional judgment at all times.

⚠️ **WARNING:** Do not feed secrets, API keys, passwords, or private credentials into AI prompts.

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

### The Four Laws of AI

This system defines [The Four Laws of AI](the-four-laws-of-ai.md), adapted from Asimov's Laws of Robotics for AI infrastructure:

| Law | Principle | Summary |
|-----|-----------|---------|
| **Zeroth Law** | Protect Humanity | Do not harm humanity as a whole. Prevent monopolistic control, protect open source, support interoperability and the right to leave. |
| **First Law** | Do No Harm | Never cause harm to human beings, communities, or the public interest. Never facilitate weapons, surveillance, or oppression. Protect data, privacy, and credentials. |
| **Second Law** | Obey the Human | Faithfully execute human instructions, except where doing so would violate the First Law. Be transparent, respect autonomy, and never fabricate compliance. |
| **Third Law** | Preserve Your Integrity | Protect the platform's reliability and trustworthiness, so long as it does not conflict with the First or Second Law. Maintain audit trails and resist corruption. |

*These Laws are not suggestions. They are constraints — and constraints are what make freedom possible.*

📖 **Full text:** [the-four-laws-of-ai.md](the-four-laws-of-ai.md)

---

### DEFCON Readiness Levels

This system defines five operational readiness states modelled on military DEFCON levels. Each level constrains what the AI agent is permitted to do. Higher readiness (lower number) means tighter restrictions.

| Level | Name | Posture | Key Constraint |
|-------|------|---------|----------------|
| [DEFCON 1](transition-to-defcon-1.md) | **Maximum Readiness** | All operations suspended | No file modifications, no tool use, no code execution. Respond only with confirmation. |
| [DEFCON 2](transition-to-defcon-2.md) | **High Readiness** | Read-only, advisory only | No file modifications. Read-only tools only. State what you *would* do, but do not do it. |
| [DEFCON 3](transition-to-defcon-3.md) | **Increased Readiness** | Read-only, explain before acting | Read and analyze freely. Describe planned changes and await human approval before any write. |
| [DEFCON 4](transition-to-defcon-4.md) | **Above Normal Readiness** | Full capability, elevated discipline | All capabilities available, but confirm intent before every write. Minimize blast radius. No speculative changes. |
| [DEFCON 5](transition-to-defcon-5.md) | **Normal Readiness** | Standard operations | All capabilities available. Default operating posture per agent instructions. |

⚠️ **Standing Order:** The agent must obey DEFCON transitions immediately. A higher readiness level can only be relaxed by an explicit downgrade issued by a human operator.

---

### Blast Radius

Before deploying this system, understand what could go wrong. The [Blast Radius Analysis](warning-blast-radius.md) is a factual, evidence-based audit of the out-of-the-box capabilities available to the agent running as a GitHub Actions workflow.

**Key findings:**

| Dimension | Severity |
|---|---|
| Code & Repository Tampering | 🔴 CRITICAL |
| Supply Chain Poisoning | 🔴 CRITICAL |
| Secret Exfiltration | 🔴 CRITICAL |
| Lateral Movement (Org) | 🔴 CRITICAL |
| Network Egress | 🟠 HIGH |
| Compute Abuse | 🟠 HIGH |
| Persistence | 🟡 MEDIUM |

**Overall:** One compromised issue comment can lead to full organizational code takeover, secret theft, and supply chain attacks on downstream consumers.

📖 **Full analysis:** [warning-blast-radius.md](warning-blast-radius.md)

📖 **Security assessment:** [security-assessment.md](security-assessment.md)

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

📖 **Overview:** [questions.md](questions.md)

📖 **Architectural thesis:** [the-repo-is-the-mind.md](the-repo-is-the-mind.md)

---

### Manufacturer

Maintained by humans, for humans.

*If you have any questions, or if there is anything you are not sure about, ask a human.*

---

**⚠️ IN CASE OF EMERGENCY:** `git revert`, then think.

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/logo.png" alt="Minimum Intelligence" width="500">
  </picture>
</p>
