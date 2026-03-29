# Implementation Outline: Rebuttal-Driven Security Hardening

This document outlines the concrete changes required to implement Recommendation 4 from [Toulmin Lessons](toulmin-lessons.md) — mapping each security finding to the Toulmin claim it rebuts and hardening GMI accordingly. Four security findings are in scope: SEC-008 (workflow self-replication), SEC-002 (unrestricted network egress), SEC-005 (no branch protection), and SEC-003 (token scope).

---

## 1. Current State

The [security assessment](../security-assessment.md) identifies ten findings. Section 4 of `toulmin-lessons.md` selects four and maps them to the Toulmin claims they weaken. None of the four mitigations are implemented today:

| SEC Finding | Rebuts Claim | Current State | Gap |
|---|---|---|---|
| SEC-008 (workflow self-replication) | Ethical — do no harm | `agent.ts` stages all changes via `git add -A` with no path filtering | No pre-commit check rejects modifications to `.github/workflows/` |
| SEC-002 (network egress) | Trust — sovereignty through legibility | Workflow YAML has no `allowed-endpoints` or firewall rules | Runner has unrestricted outbound network access |
| SEC-005 (no branch protection) | Trust — reversibility | Install process does not configure branch protection | Agent pushes directly to the default branch without review gates |
| SEC-003 (token scope) | Trust — least privilege | Workflow requests `contents: write`, `actions: write`, `issues: write`, `pages: write`, `id-token: write` | Permissions are broader than the agent job strictly requires |

---

## 2. Changes to `lifecycle/agent.ts` — Workflow Self-Modification Detection (SEC-008)

This is the highest-priority change because SEC-008 is rated Critical and directly rebuts the "do no harm" ethical claim.

### 2.1 Add a Staged-Diff Path Check Before Commit

**Current behavior** (approximate lines 385–399): After the agent run completes, `agent.ts` executes `git add -A`, checks whether the index is dirty with `git diff --cached --quiet`, and commits unconditionally if changes exist.

**Required change**: Between `git add -A` and `git commit`, inspect the staged file list for restricted paths. If any staged file matches a blocked pattern, unstage it and log a warning.

```typescript
// After git add -A, before git commit:
const staged = await run(["git", "diff", "--cached", "--name-only"]);
const blockedPaths = (staged.stdout ?? "")
  .split("\n")
  .filter(f => f.startsWith(".github/workflows/"));

if (blockedPaths.length > 0) {
  console.error("SEC-008: Blocked modification to workflow files:", blockedPaths);
  for (const file of blockedPaths) {
    await run(["git", "reset", "HEAD", "--", file]);
  }
}
```

### 2.2 Decide on Fail-Hard vs. Fail-Soft Behavior

Two approaches are possible:

| Approach | Behavior | Trade-off |
|---|---|---|
| **Fail-soft** (recommended initially) | Unstage the blocked files, log a warning, commit remaining changes | Agent continues to be useful; the violation is recorded but not fatal |
| **Fail-hard** | Abort the entire commit and push; post a violation notice as an issue comment | Stronger enforcement, but a false positive (e.g., agent legitimately asked to document a workflow) blocks all work |

Start with fail-soft and escalate to fail-hard once the detection has been validated in production.

### 2.3 Extend the Blocked-Path List

The initial list should block `.github/workflows/` modifications. Consider extending it to other sensitive paths:

| Blocked Pattern | Reason |
|---|---|
| `.github/workflows/` | Prevents workflow injection and self-replication |
| `.github/CODEOWNERS` | Prevents bypassing review requirements |
| `.github-minimum-intelligence/lifecycle/agent.ts` | Prevents self-modification of the agent runtime |

Store the blocked-path list in a configuration file (e.g., `.github-minimum-intelligence/config/restricted-paths.json`) so it can be updated without modifying `agent.ts` itself.

### 2.4 Audit Trail

When a blocked path is detected, append an entry to the agent's commit message body:

```
minimum-intelligence: work on issue #42

SEC-008: Blocked workflow modification — .github/workflows/ci.yml was unstaged.
```

This creates a persistent, auditable record in Git history.

---

## 3. Changes to the Workflow YAML — Network Egress Restriction (SEC-002)

### 3.1 GitHub Actions `allowed-endpoints` (Preferred)

GitHub Enterprise Cloud supports restricting outbound network access via a `allowed-endpoints` key at the job level. If the repository is on an eligible plan:

```yaml
jobs:
  run-agent:
    runs-on: ubuntu-latest
    allowed-endpoints:
      api.openai.com:443
      api.github.com:443
      github.com:443
```

**File**: `.github/workflows/github-minimum-intelligence-agent.yml`, within the `run-agent` job definition.

**Considerations**:

- The `allowed-endpoints` feature is only available on GitHub Enterprise Cloud with the GitHub Actions firewall enabled. For repositories on GitHub Free or Team plans, this key is silently ignored.
- The exact endpoints depend on the configured LLM provider. If the provider changes (e.g., from OpenAI to Anthropic), the allowlist must be updated.
- Outbound access to `github.com` and `api.github.com` is required for `git push`, `gh` CLI operations, and Actions artifact upload.

### 3.2 Document Manual Firewall Configuration (Fallback)

For repositories not on Enterprise Cloud, add a section to the installation guide documenting how to restrict egress manually:

- **Self-hosted runners**: Configure firewall rules on the runner host to allow only the required endpoints.
- **Network policy documentation**: Add a file at `.github-minimum-intelligence/docs/network-policy.md` listing the required outbound endpoints with ports and protocols.

**Required endpoints to document**:

| Endpoint | Port | Purpose |
|---|---|---|
| `api.openai.com` | 443 | LLM API calls (default provider) |
| `api.github.com` | 443 | GitHub REST API (`gh` CLI, API calls) |
| `github.com` | 443 | Git push/pull operations |
| `uploads.github.com` | 443 | Pages artifact upload |

### 3.3 Workflow-Level Change

Regardless of `allowed-endpoints` availability, add a comment block to the workflow YAML documenting the expected network access pattern:

```yaml
# ── Network Access ─────────────────────────────────────────────────────────
# This job requires outbound HTTPS access to:
#   - api.openai.com (LLM API)
#   - api.github.com / github.com (Git and GitHub API)
# On GitHub Enterprise Cloud with Actions firewall enabled, add:
#   allowed-endpoints:
#     api.openai.com:443
#     api.github.com:443
#     github.com:443
```

---

## 4. Changes to Installation Guide — Branch Protection (SEC-005)

### 4.1 Add Branch Protection Instructions to the Install Process

**Current state**: The installation process (triggered by `workflow_dispatch` in the `run-install` job) copies files and configures the agent but does not set up branch protection. The agent pushes directly to the default branch via `git push origin HEAD:${defaultBranch}`.

**Required change**: Add a post-install documentation section (in the README or a dedicated install guide) that instructs the repository owner to enable branch protection:

| Setting | Recommended Value | Reason |
|---|---|---|
| Require pull request reviews | 1 reviewer | Prevents unreviewed agent pushes from persisting |
| Require status checks | Enabled (CI must pass) | Ensures agent changes don't break the build |
| Restrict who can push | Repository admins only | Blocks direct pushes; all changes go through PRs |
| Include administrators | Yes | Ensures admins are also subject to protection rules |

### 4.2 Reconcile Branch Protection with Agent Push Model

Enabling branch protection on the default branch creates a fundamental conflict with the current agent architecture, which pushes directly to the default branch:

```typescript
// agent.ts line 406
const push = await run(["git", "push", "origin", `HEAD:${defaultBranch}`]);
```

Two resolution paths exist:

| Path | Change Required | Impact |
|---|---|---|
| **A: Agent pushes to a PR branch** | Modify `agent.ts` to push to `gmi/issue-<N>` and open a PR via `gh pr create` | Agent changes become reviewable; requires significant `agent.ts` refactor |
| **B: Agent bypasses protection via app token** | Use a GitHub App installation token with bypass permissions instead of `GITHUB_TOKEN` | Maintains current push model; weakens the protection rule |
| **C: Document without enforcing** | Add branch protection instructions but mark them as optional for full-agent workflows | Honest about the trade-off; no code change required |

**Recommendation**: Start with Path C (documentation) immediately. Plan Path A as a longer-term architectural change, since pushing to a PR branch also addresses SEC-006 (no code review gate). Path B should be avoided as it undermines the purpose of branch protection.

### 4.3 Document the Trade-Off

Add a note to the installation guide explaining that strict branch protection and direct-push agent operation are in tension, and that the repository owner must choose between:

1. **Full branch protection** — agent opens PRs that require human review before merge
2. **Agent autonomy** — agent pushes directly to the default branch with post-hoc review via Git history
3. **Hybrid** — branch protection enabled, but the agent's workflow token is granted bypass permissions (weakened protection)

---

## 5. Changes to Workflow Permissions — Token Scope Audit (SEC-003)

### 5.1 Audit Current Permissions

**File**: `.github/workflows/github-minimum-intelligence-agent.yml`, lines 77–82.

The current permissions block:

```yaml
permissions:
  contents: write
  issues: write
  actions: write
  pages: write
  id-token: write
```

### 5.2 Evaluate Each Permission by Job

The workflow contains multiple jobs. Not every job needs every permission. Permissions should be scoped per job rather than at the workflow level:

| Permission | `run-agent` needs | `run-install` needs | `run-gitpages` needs |
|---|---|---|---|
| `contents: write` | Yes — commits and pushes | Yes — commits installed files | Yes — checks out code |
| `issues: write` | Yes — posts comments, reactions | No | No |
| `actions: write` | No | Yes — triggers subsequent workflows | No |
| `pages: write` | No | No | Yes — deploys to Pages |
| `id-token: write` | No | No | Yes — OIDC for Pages deployment |

### 5.3 Move Permissions to Job Level

**Required change**: Remove the workflow-level `permissions` block and add per-job permissions:

```yaml
jobs:
  run-agent:
    permissions:
      contents: write
      issues: write
    # ...

  run-install:
    permissions:
      contents: write
      actions: write
    # ...

  run-gitpages:
    permissions:
      contents: read    # Only needs to read for checkout
      pages: write
      id-token: write
    # ...
```

**Considerations**:

- Moving from workflow-level to job-level permissions is a breaking change if any job implicitly relies on a permission it did not declare. Each job must be tested after the migration.
- The `run-gitpages` job only needs `contents: read` (to check out the code for building the Pages artifact), not `contents: write`.
- If `run-install` triggers subsequent workflows via pushed commits, `actions: write` remains necessary for that job. If the trigger mechanism changes, this permission can be removed.

### 5.4 Consider Fine-Grained PAT

The `GITHUB_TOKEN` automatically generated by GitHub Actions is scoped to the repository. However, if the workflow uses an organization-level token or PAT with broader scope, replace it with a fine-grained PAT limited to:

- This repository only
- The minimum required permissions (contents, issues, pages)

This change is outside `agent.ts` and the workflow YAML — it requires updating the repository or organization secrets configuration.

---

## 6. New Configuration File — Restricted Paths

### 6.1 Create `config/restricted-paths.json`

**Path**: `.github-minimum-intelligence/config/restricted-paths.json`

```json
{
  "blockedPrefixes": [
    ".github/workflows/"
  ],
  "description": "Paths the agent is not permitted to modify. Changes to these paths will be unstaged before commit."
}
```

### 6.2 Load in `agent.ts`

Add a utility function that reads the restricted-paths configuration at startup and uses it in the staged-diff check (Section 2.1):

```typescript
const restrictedPaths = JSON.parse(
  await Bun.file(".github-minimum-intelligence/config/restricted-paths.json").text()
).blockedPrefixes as string[];
```

**Considerations**:

- If the configuration file does not exist, the agent should proceed without path restrictions (fail-open) rather than crashing. This preserves backward compatibility for repositories that have not yet created the file.
- The configuration file itself should be on the restricted list (or protected via CODEOWNERS) to prevent the agent from removing its own restrictions.

---

## 7. Documentation Changes

### 7.1 Update `SECURITY.md`

Add a reference to this implementation outline and note which SEC findings now have active mitigations (once implemented).

### 7.2 Update `security-assessment.md`

Change the status of each addressed finding from "Open" to "Mitigated" (or "Partially Mitigated" for SEC-002 and SEC-005 where full enforcement depends on the hosting plan or architectural decisions).

### 7.3 Update `README.md`

If branch protection instructions are added to the installation section, ensure both the canonical README at `.github-minimum-intelligence/README.md` and the root `README.md` copy are updated.

---

## 8. Testing and Validation

### 8.1 Workflow Self-Modification Detection (SEC-008)

| Test | Method | Expected Result |
|---|---|---|
| Agent asked to modify a workflow file | Trigger agent via issue comment requesting a workflow change | Workflow file is unstaged; warning logged; remaining changes committed |
| Agent makes no workflow changes | Normal agent operation | No warning logged; commit proceeds normally |
| Configuration file missing | Delete `restricted-paths.json` and trigger agent | Agent proceeds without path restrictions (fail-open) |
| Agent modifies its own `agent.ts` | If `agent.ts` path is in blocked list | File is unstaged; warning logged |

### 8.2 Token Scope (SEC-003)

| Test | Method | Expected Result |
|---|---|---|
| Agent job runs with reduced permissions | Move permissions to job level | Agent can still commit, push, and comment |
| Pages job runs with read-only contents | Set `contents: read` on `run-gitpages` | Pages deployment succeeds |
| Install job triggers subsequent workflows | Verify `actions: write` on `run-install` | Post-install workflows fire correctly |

### 8.3 Branch Protection (SEC-005)

| Test | Method | Expected Result |
|---|---|---|
| Branch protection enabled, agent pushes directly | Enable protection rules; trigger agent | Push is rejected (unless bypass is configured) |
| Branch protection enabled, agent opens PR | After Path A refactor | PR is created; merge requires review |

### 8.4 Network Egress (SEC-002)

| Test | Method | Expected Result |
|---|---|---|
| `allowed-endpoints` configured on Enterprise Cloud | Add the YAML key; trigger agent | Agent can reach LLM API and GitHub; all other egress blocked |
| `allowed-endpoints` on non-Enterprise plan | Add the YAML key; trigger agent | Key is silently ignored; agent operates normally |

---

## 9. Dependency and Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Path check has false positives (agent legitimately needs to document workflows) | Medium | Medium — blocks valid work | Start with fail-soft; review warnings before switching to fail-hard |
| Job-level permissions break an implicit dependency | Low | High — job fails | Test each job individually after migration; keep workflow-level permissions as rollback |
| Branch protection blocks agent entirely | High (if Path A not implemented) | High — agent becomes non-functional | Start with documentation-only (Path C); implement PR-based push (Path A) before enforcing protection |
| `allowed-endpoints` not available on plan | Medium | Low — feature is silently ignored | Document manual firewall as fallback |
| Restricted-paths config is modified by agent | Low — agent rarely touches config | High — agent removes its own guardrails | Add config path to blocked list or protect via CODEOWNERS |

---

## 10. Implementation Order

The recommended sequence minimizes risk and allows incremental validation:

1. **Create `config/restricted-paths.json`** — zero-risk structural change
2. **Add staged-diff path check in `agent.ts`** (SEC-008) — core safety mechanism, fail-soft mode
3. **Add per-job permissions in the workflow YAML** (SEC-003) — reduces token scope
4. **Add network access documentation comment to the workflow** (SEC-002) — informational, no behavioral change
5. **Add branch protection instructions to the installation guide** (SEC-005) — documentation-only (Path C)
6. **Add `allowed-endpoints` to the workflow** (SEC-002) — effective only on Enterprise Cloud
7. **Validate fail-soft behavior in production** — confirm no false positives
8. **Escalate to fail-hard** (SEC-008) — after validation period
9. **Implement PR-based push model** (SEC-005, Path A) — longer-term architectural change enabling strict branch protection

---

## Summary

Implementing Rebuttal-Driven Security Hardening requires changes concentrated in two files — `lifecycle/agent.ts` (workflow self-modification detection) and the workflow YAML (permissions scoping and network egress documentation) — with supporting changes to configuration, installation documentation, and the security assessment. The most impactful and immediately actionable change is adding a staged-diff path check in `agent.ts` to block workflow file modifications (SEC-008). The remaining mitigations range from straightforward (per-job permissions) to architecturally significant (PR-based push model for branch protection). Each mitigation directly strengthens a specific Toulmin claim, transforming the security assessment from a static audit into an active component of GMI's argumentative structure.

---

*Implementation outline derived from [Toulmin Lessons §4](toulmin-lessons.md) and the [Security Assessment](../security-assessment.md) of [GitHub Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence)*
