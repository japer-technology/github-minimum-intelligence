# Access Control Analysis — The Best Way Forward

> **Purpose:** This document is the authoritative analysis of how access control should work in GitHub Minimum Intelligence. It maps what GitHub actually exposes, what the current workflow enforces, and what a variable-driven policy engine should look like — all within a single workflow file.

---

## 1. The Two Gates

There are exactly two places to control who interacts with the agent. They are not the same thing.

| Gate | What it controls | Precision | Who owns it |
|------|-----------------|-----------|-------------|
| **Platform gate** | Whether GitHub allows a user to create an issue or comment at all | Coarse | GitHub (repo settings, interaction limits) |
| **Workflow gate** | Whether the agent processes the event after it fires | Precise | You (workflow YAML, variables, API calls) |

On a public repository, GitHub permits any authenticated user to open issues and post comments by default. The only native platform-level restriction is the **interaction limits** feature, which offers three classes — `existing users`, `prior contributors`, `collaborators only` — but these are temporary windows (24h / 3d / 1w / 1mo / 6mo), not permanent policy. There is no built-in "allow these five users forever" setting at the platform layer.

**Key insight:** Rejecting at the workflow gate does not remove the issue or comment from the UI. It only prevents the agent from spending LLM tokens. If you need to suppress the posts themselves, the platform-level tools are interaction limits, repository moderation, or routing issues to a separate issues-only repository with tighter access. GitHub explicitly documents the separate issues-only repository pattern for this use case.

The workflow gate is therefore the primary control surface. It is where all precise policy enforcement must live.

---

## 2. What GitHub Exposes for Identity

GitHub provides five classes of identity information that a workflow can inspect. Each class has different reliability, API requirements, and failure modes.

### 2.1 Exact Username — `github.actor`

The strongest and simplest check. Compare the actor's login against a hardcoded or variable-driven allowlist.

| Aspect | Detail |
|--------|--------|
| Source | `github.actor` (workflow context) |
| Reliability | Exact match; no API call needed |
| Failure mode | None (always available on every event) |
| Best for | Small teams, emergency overrides, named exceptions |

```yaml
if: contains(fromJson('["alice","bob"]'), github.actor)
```

### 2.2 Repository Permission / Role — Collaborator API

The current approach used by this workflow. GitHub's collaborator permission endpoint returns both a base `permission` value and a `role_name`.

| `permission` values | `role_name` values |
|--------------------|--------------------|
| `admin` | `admin` |
| `write` | `write`, `maintain`, or a custom role |
| `read` | `read`, `triage`, or a custom role |
| `none` | `none` |

Note: `maintain` and `triage` are collapsed into `write` and `read` respectively in the `permission` field, but appear correctly in `role_name`. For example, a user with the `maintain` role returns `permission: "write"` — indistinguishable from a plain write collaborator unless you also check `role_name: "maintain"`. A robust check must consult both fields when fine-grained role distinctions matter.

| Aspect | Detail |
|--------|--------|
| Source | `gh api repos/{owner}/{repo}/collaborators/{actor}/permission` |
| Reliability | High; uses the default `GITHUB_TOKEN` |
| Failure mode | Returns `none` for non-collaborators; API returns 404 for users with no relationship |
| Best for | Default fail-closed posture; "only repo insiders" |

### 2.3 Author Association — Event Payload

GitHub assigns every issue/comment author a relationship classification. This is available directly in the event payload — no API call required.

| Value | Meaning |
|-------|---------|
| `OWNER` | Repository owner |
| `MEMBER` | Organization member (if org-owned repo) |
| `COLLABORATOR` | Invited collaborator |
| `CONTRIBUTOR` | Has merged pull request |
| `FIRST_TIME_CONTRIBUTOR` | First PR not yet merged |
| `FIRST_TIMER` | First interaction of any kind |
| `NONE` | No prior relationship |

| Aspect | Detail |
|--------|--------|
| Source | `github.event.comment.author_association` / `github.event.issue.author_association` |
| Reliability | Good; embedded in the webhook payload |
| Failure mode | `NONE` for unknown users; `CONTRIBUTOR` requires a merged PR — open PRs don't count |
| Best for | "Contributors and above" without maintaining a manual list |

### 2.4 Organization Membership — Org API

Checks whether the actor is an active member of a specific GitHub organization.

| Aspect | Detail |
|--------|--------|
| Source | `gh api orgs/{org}/memberships/{actor}` |
| Reliability | Good **if** the token has org membership read access |
| Failure mode | Without proper token scope, only **public** membership is visible. Private membership returns 404 |
| Requires | A PAT or GitHub App token with `read:org` scope, stored as a separate secret |
| Best for | "Only members of our org" on a public repo |

### 2.5 Team Membership — Team API

Checks whether the actor belongs to a specific team within an organization.

| Aspect | Detail |
|--------|--------|
| Source | `gh api orgs/{org}/teams/{team_slug}/memberships/{actor}` |
| Reliability | Good **if** the token has org and team read access |
| Failure mode | Same as org — requires explicit token scope; fails silently without it |
| Requires | Same `read:org` token as org membership checks |
| Best for | Fine-grained team-level control; "only the `core` team can talk to the agent" |

### 2.6 Enterprise Identity — Enterprise APIs (Limited)

Enterprise Managed Users (EMU) cannot create public content or collaborate outside their enterprise on GitHub.com. Standard enterprise membership checks require enterprise-admin-level API permissions that a public repo workflow cannot assume.

**Practical conclusion:** Enterprise identity gating is not viable for a public-repo agent without owning the enterprise side and wiring in enterprise-level APIs. It is excluded from the recommended design.

---

## 3. The Current Implementation

The current `Authorize` step (lines 311–337 of the workflow) does exactly one thing:

```bash
PERM=$(gh api "repos/$REPO/collaborators/$ACTOR/permission" --jq '.permission' 2>/dev/null || echo "none")
if [[ "$PERM" != "admin" && "$PERM" != "maintain" && "$PERM" != "write" ]]; then
  exit 1
fi
```

This is correct and fail-closed. It has three limitations:

1. **Hardcoded policy.** Changing who can access the agent requires editing the workflow YAML and committing it. That is a code change, not a configuration change.
2. **Single dimension.** It only checks repository permission. There is no way to add named exceptions, org membership, or author-association gating without rewriting the step.
3. **No PR exclusion.** The `issue_comment` event fires for both issue comments and pull request conversation comments. The current job-level `if:` does not filter out PR comments. A user commenting on a PR can trigger the agent, which may be unintended.

---

## 4. Recommended Design: Variable-Driven Policy Engine

### 4.1 Principles

1. **One workflow.** No additional workflow files. The policy engine lives inside the existing `Authorize` step of `run-agent`.
2. **Configuration over code.** Policy is set through GitHub Actions repository variables (`vars.*`), not by editing YAML.
3. **Fail-closed.** If no policy variables are set, the default behavior is identical to today: write-or-higher collaborators only.
4. **Any-or-all.** A single mode switch controls whether passing *any* enabled check grants access (OR logic) or *all* enabled checks must pass (AND logic).
5. **PR exclusion.** The job-level guard should filter out pull request comments.

### 4.2 Policy Variables

All variables are set in **Settings → Secrets and variables → Actions → Variables** at the repository or organization level. No code changes required to adjust policy.

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `MI_POLICY_MODE` | `any` / `all` | `any` | `any` = pass if any enabled check passes. `all` = pass only if every enabled check passes |
| `MI_ALLOWED_USERS` | CSV of logins | *(empty)* | Exact username allowlist |
| `MI_ALLOWED_ASSOCIATIONS` | CSV of associations | *(empty)* | Author association gate (e.g., `OWNER,MEMBER,COLLABORATOR`) |
| `MI_MIN_PERMISSION` | permission level | `write` | Minimum collaborator permission (e.g., `write`, `admin`, `read`) |
| `MI_ALLOWED_ORG` | org login | *(empty)* | Require membership in this org |
| `MI_ALLOWED_TEAMS` | CSV of team slugs | *(empty)* | Require membership in at least one of these teams (requires `MI_ALLOWED_ORG`) |
| `MI_REQUIRE_COMMAND_PREFIX` | string | *(empty)* | If set, only process comments whose body starts with this prefix (e.g., `/agent`) |

For org and team checks, one additional **secret** is required:

| Secret | Purpose |
|--------|---------|
| `MI_ORG_READ_TOKEN` | A PAT or GitHub App token with `read:org` scope. Only needed when `MI_ALLOWED_ORG` or `MI_ALLOWED_TEAMS` is set |

### 4.3 Check Evaluation Order

The policy engine evaluates one hard gate followed by five policy checks. Each policy check is only *enabled* if its corresponding variable is non-empty.

```
1. Command prefix gate     → reject if body doesn't start with prefix (hard gate)
2. Exact username check    → MI_ALLOWED_USERS
3. Author association check → MI_ALLOWED_ASSOCIATIONS
4. Collaborator permission → MI_MIN_PERMISSION
5. Org membership check    → MI_ALLOWED_ORG
6. Team membership check   → MI_ALLOWED_TEAMS (requires MI_ALLOWED_ORG)
```

The command prefix gate is a **hard gate** — if the prefix is set and the comment doesn't match, the request is rejected immediately regardless of other checks.

For checks 2–6, the `MI_POLICY_MODE` variable controls the combination logic:

- **`any`** (default): Access is granted if the actor passes *at least one* enabled check.
- **`all`**: Access is granted only if the actor passes *every* enabled check.

### 4.4 Default Behavior

When no policy variables are configured:

- No checks are enabled (all variables are empty by default).
- The engine falls back to the current behavior: query the collaborator permission API and require `write` or higher.
- This preserves exact backward compatibility.

### 4.5 PR Comment Exclusion

The job-level `if:` condition should add a `pull_request` exclusion:

```yaml
if: >-
  (
    github.event_name == 'issues'
    || (
      github.event_name == 'issue_comment'
      && !endsWith(github.event.comment.user.login, '[bot]')
    )
  )
  && !github.event.issue.pull_request
```

This preserves the existing bot exclusion (`!endsWith(..., '[bot]')`) and adds one new clause: `&& !github.event.issue.pull_request`. The `github.event.issue.pull_request` field is present (truthy) when the `issue_comment` event fires on a pull request conversation. Adding this clause restricts the agent to issue-only events.

---

## 5. Practical Presets

These are ready-to-use variable configurations for common access control postures.

### 5.1 Locked to Write Collaborators Only (Current Default)

```
MI_MIN_PERMISSION = write
(all other variables empty)
```

Identical to the current hardcoded behavior. No change required.

### 5.2 Named Users Only

```
MI_ALLOWED_USERS    = ericmourant,alice,bob
MI_MIN_PERMISSION   = (empty)
MI_POLICY_MODE      = any
```

Only the three named users can trigger the agent. Collaborator permission is not checked.

### 5.3 Repo Insiders Plus Contributors

```
MI_ALLOWED_ASSOCIATIONS = OWNER,MEMBER,COLLABORATOR,CONTRIBUTOR
MI_MIN_PERMISSION       = (empty)
MI_POLICY_MODE          = any
```

Anyone who has merged a PR or been added as a collaborator can use the agent. No manual allowlist.

### 5.4 Must Be Both in Org AND on Named List

```
MI_ALLOWED_USERS = ericmourant,alice
MI_ALLOWED_ORG   = my-org
MI_POLICY_MODE   = all
```

Requires passing both checks. The actor must be in the named list *and* an active member of the org.

### 5.5 Team-Gated Access

```
MI_ALLOWED_ORG   = my-org
MI_ALLOWED_TEAMS = core,agents
MI_POLICY_MODE   = any
```

Only members of the `core` or `agents` team in `my-org` can trigger the agent.

### 5.6 Command-Prefix Mode (Reduce Noise)

```
MI_MIN_PERMISSION        = write
MI_REQUIRE_COMMAND_PREFIX = /agent
```

Only write-or-higher collaborators can trigger the agent, and only when their comment starts with `/agent`. All other comments are silently ignored.

---

## 6. Control Strength by Class

| Identity Class | Workflow Gate Strength | Platform Gate Strength | API Dependency | Token Requirement |
|---------------|----------------------|----------------------|----------------|-------------------|
| Exact username | ★★★★★ Excellent | N/A | None | Default `GITHUB_TOKEN` |
| Collaborator role | ★★★★★ Excellent | ★★★★ Good | Collaborator API | Default `GITHUB_TOKEN` |
| Author association | ★★★★ Good | N/A | None (payload) | Default `GITHUB_TOKEN` |
| Org membership | ★★★★ Good | ★★ Limited | Org membership API | `read:org` PAT |
| Team membership | ★★★★ Good | ★★ Limited | Team membership API | `read:org` PAT |
| Enterprise identity | ★★ Weak | ★ Very limited | Enterprise admin API | Enterprise admin token |
| Arbitrary public user classes | ★ Weak | ★ Weak | N/A | N/A |

---

## 7. What This Does Not Solve

The workflow gate controls **who can wake the agent**. It does not address these orthogonal concerns:

1. **Post suppression.** Unauthorized users can still post issues and comments on a public repo. The agent ignores them, but the posts remain visible. Only platform-level tools (interaction limits, moderation, separate issues-only repo) can prevent the posts themselves.

2. **Output review.** The agent pushes commits and posts comments without human review. Access control determines *input* authorization, not *output* authorization. Output review requires branch protection, required reviewers, or a separate approval workflow.

3. **Token scope.** The `GITHUB_TOKEN` used by the workflow has org-wide scope determined by the organization's default token permissions. Access control on the agent does not reduce the blast radius of what the agent can do once authorized. That requires fine-grained PATs, environment-scoped secrets, or repository-scoped GitHub App tokens.

4. **Network and runtime security.** The runner has unrestricted network egress and passwordless sudo. These are GitHub Actions platform properties, not access control concerns. They are documented in the existing [Security Assessment](/.github-minimum-intelligence/docs/security-assessment.md).

---

## 8. Migration Path from Current Implementation

The migration is a single-step change to the `Authorize` step in the workflow YAML. No other steps, jobs, or files change.

### What Changes

| Component | Before | After |
|-----------|--------|-------|
| Job-level `if:` | No PR exclusion | Adds `&& !github.event.issue.pull_request` |
| `Authorize` step | 7 lines: hardcoded permission check | Policy engine reading `vars.*` and `secrets.MI_ORG_READ_TOKEN` |
| `Reject` step | No change | No change |
| All other steps | No change | No change |

### What Does Not Change

- The `run-install` job — untouched.
- The `run-gitpages` job — untouched.
- The agent TypeScript code — untouched.
- The DEFCON framework — untouched. DEFCON levels control what the agent *does* after authorization; the policy engine controls who gets past authorization in the first place. These are complementary, not overlapping.
- Backward compatibility — when no `MI_*` variables are set, the engine falls back to the current write-or-higher check.

### Deployment

1. Set desired `MI_*` variables in **Settings → Secrets and variables → Actions → Variables**.
2. If using org or team checks, add `MI_ORG_READ_TOKEN` as a repository secret.
3. Merge the updated workflow file.
4. Existing behavior is preserved unless variables are explicitly changed.

---

## 9. Recommendation

Keep one workflow. Make the agent issue-only. Default to `MI_MIN_PERMISSION=write`. Optionally add `MI_ALLOWED_USERS` for emergency exceptions. Use org and team checks only when you add `MI_ORG_READ_TOKEN`.

The current hardcoded guard is in exactly the right place — the `Authorize` step of `run-agent`. The change is to make that step read policy from variables instead of from inline conditionals. Everything else in the workflow stays the same.

The variable-driven approach gives you:

- **Exact named users** via `MI_ALLOWED_USERS`
- **Repo relationship classes** via `MI_ALLOWED_ASSOCIATIONS`
- **Collaborator minimum role** via `MI_MIN_PERMISSION`
- **Org-wide membership** via `MI_ALLOWED_ORG`
- **Team-level membership** via `MI_ALLOWED_TEAMS`
- **Any-or-all logic** via `MI_POLICY_MODE`
- **Command prefix filtering** via `MI_REQUIRE_COMMAND_PREFIX`
- **Zero-config backward compatibility** via the fallback default

That maps cleanly onto the five identity classes GitHub actually exposes, avoids enterprise-level API dependencies that a public repo cannot assume, and keeps the entire system in one workflow file with no additional infrastructure.
