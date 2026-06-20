# GitHub Minimum Intelligence Improvements 1

## Purpose

This document turns the improvement review into an implementation brief. An AI
agent should be able to read this file, modify the repository, and verify the
changes without needing the original conversation.

The project idea is strong: GitHub Issues become the conversation UI, Git
becomes durable memory, and GitHub Actions becomes the runtime. The current
implementation proves that concept, but the default operating mode gives the
agent broad authority: it can run shell commands, edit files, commit all
changes, and push directly to the default branch.

The next improvement pass should make the default mode safer, more repeatable,
and easier to install in real repositories. Prioritize reducing authority before
adding features.

## Current Implementation References

Important files:

- `.github/workflows/github-minimum-intelligence-agent.yml`
- `.github-minimum-intelligence/lifecycle/agent.ts`
- `.github-minimum-intelligence/lifecycle/local-chat.ts`
- `.github-minimum-intelligence/lifecycle/local-chat.test.ts`
- `.github-minimum-intelligence/package.json`
- `.github-minimum-intelligence/README.md`
- `.github-minimum-intelligence/docs/security-assessment.md`

Current behavior to preserve unless explicitly changed:

- Issue creation and issue comments can trigger the agent.
- Each issue maps to one persistent pi session file.
- The agent posts a GitHub issue comment with its final response.
- Session state is stored under `.github-minimum-intelligence/state/`.
- The installer can install or upgrade `.github-minimum-intelligence/`.
- Local chat remains available through `bun run chat`.

## Priority Order

Implement in this order:

1. PR-first default mode.
2. Opt-in activation.
3. Correct session attribution.
4. Narrow workflow permissions and runtime secrets.
5. Release-based installer.
6. Runtime tool policy.
7. Test coverage for the GitHub agent path.
8. Dependency pinning and supply-chain tightening.
9. README and security documentation updates.

## 1. Make PR-First Mode the Default

### Problem

The GitHub agent stages all changes with `git add -A`, commits them, and pushes
directly to the repository default branch. This is implemented in
`.github-minimum-intelligence/lifecycle/agent.ts` around the commit and push
block.

Direct-to-main is convenient but should not be the default for an autonomous
agent. It bypasses branch protection, code review, and normal human approval.

### Desired Behavior

Default behavior:

- The agent creates or updates a branch named `agent/issue-<issue-number>`.
- The agent commits its changes to that branch.
- The agent opens a pull request against the default branch.
- If a PR for the issue already exists, the agent updates that branch and posts
  a comment to the existing PR or issue.
- The agent still posts its conversational response to the triggering issue.

Optional legacy behavior:

- Direct push to the default branch remains available through explicit config.
- The option must be named clearly, for example:
  - `commitMode: "pull_request"` default
  - `commitMode: "direct"` opt-in

Recommended config location:

`.github-minimum-intelligence/.pi/settings.json`

Example:

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-5.5",
  "defaultThinkingLevel": "high",
  "commitMode": "pull_request"
}
```

### Implementation Notes

In `agent.ts`:

1. Read `commitMode` from `.pi/settings.json`.
2. Default to `"pull_request"` if missing.
3. After the agent run and mapping write, stage and commit changes as today.
4. If `commitMode === "direct"`, keep the current push behavior.
5. If `commitMode === "pull_request"`:
   - Create or switch to `agent/issue-${issueNumber}`.
   - Rebase or merge from `origin/${defaultBranch}` before committing where
     practical.
   - Push to `origin HEAD:agent/issue-${issueNumber}`.
   - Use `gh pr list` to find an existing open PR with that head branch.
   - If none exists, create one with `gh pr create`.
   - Add a link to the PR in the issue comment.

Suggested helper functions:

- `async function getCommitMode(): Promise<"pull_request" | "direct">`
- `async function ensureAgentBranch(issueNumber: number, defaultBranch: string): Promise<string>`
- `async function pushAgentBranch(branchName: string): Promise<void>`
- `async function findOpenPrForBranch(branchName: string): Promise<string | null>`
- `async function createPr(branchName: string, issueNumber: number, title: string): Promise<string>`

### Acceptance Criteria

- A new install does not push agent-generated code directly to `main`.
- A new issue that causes file changes results in an `agent/issue-N` branch.
- A PR is created once and reused on later comments for the same issue.
- The issue comment includes the agent response and the PR URL when relevant.
- `commitMode: "direct"` preserves existing direct-push behavior.
- Push failure still produces a useful issue comment.

## 2. Make Activation Explicit by Default

### Problem

The README advertises that opening any issue triggers the agent. The workflow
currently runs on all opened issues and all non-bot issue comments.

This is surprising in real repositories, can consume LLM credits, and can make
normal issue tracking noisy.

### Desired Behavior

Default behavior should require explicit activation by one of:

- An issue label, default `gmi`.
- A slash command, default `/gmi`.
- A dedicated issue template that applies the activation label.

Recommended default:

- New issues run only if they have label `gmi` or title/body starts with `/gmi`.
- Comments run only if the comment body starts with `/gmi`.
- The `/gmi` prefix is stripped before sending the prompt to the LLM.

### Implementation Notes

Workflow-level filtering cannot fully check labels and command bodies in a
maintainable way. Do a cheap early exit inside `agent.ts` after reading the
event payload and before invoking pi.

Add config:

```json
{
  "activation": {
    "mode": "explicit",
    "label": "gmi",
    "command": "/gmi"
  }
}
```

Valid modes:

- `"explicit"` default
- `"always"` opt-in legacy behavior

In `agent.ts`:

1. Read activation config from settings.
2. For `issues` events:
   - Check issue labels for `activation.label`.
   - Check whether title or body starts with `activation.command`.
3. For `issue_comment` events:
   - Check whether comment body starts with `activation.command`.
4. If not activated, log a clear message and return success without posting a
   response.
5. If activated by command, strip the command prefix from the prompt.

Keep `RESERVED_PREFIXES`, but evaluate it after activation command stripping.

### Acceptance Criteria

- Ordinary issues do not trigger an LLM call by default.
- Issues labeled `gmi` do trigger.
- Comments starting `/gmi` do trigger.
- The model does not receive the literal `/gmi` prefix unless the user escaped
  or quoted it intentionally.
- `activation.mode: "always"` restores current behavior.

## 3. Fix Session Attribution

### Problem

`agent.ts` identifies the latest session file with:

```bash
ls -t .github-minimum-intelligence/state/sessions/*.jsonl | head -1
```

This can misattribute a session if multiple issue runs are active at the same
time. The workflow serializes per issue, but different issues can still run in
parallel.

`local-chat.ts` already documents a better pattern: snapshot the session
directory before running pi, then attribute the new entry by diff.

### Desired Behavior

The GitHub agent should never guess the session file by global newest mtime.

For a new session:

- Snapshot session files before running pi.
- Run pi.
- Snapshot session files after running pi.
- Identify exactly one new session file.
- Write that path to `state/issues/<issueNumber>.json`.
- If zero or multiple new session files appear, fail with a clear error.

For a resumed session:

- Reuse the mapped `sessionPath`.
- Verify the file still exists.
- Do not remap to another file unless pi explicitly creates a replacement and
  the replacement can be attributed safely.

### Implementation Notes

Add helpers to `agent.ts`:

```ts
function listSessionFiles(): Set<string>
function diffSessionFiles(before: Set<string>, after: Set<string>): string[]
function resolveSessionAfterRun(mode: string, existingSessionPath: string, before: Set<string>): string
```

The local runner may already contain similar code. Reuse the same approach
rather than inventing incompatible behavior.

### Acceptance Criteria

- New issue maps to the session file created by its own pi run.
- Concurrent issues cannot steal each other's session mapping.
- Resume mode keeps the existing session mapping.
- Ambiguous attribution fails loudly instead of silently mapping the wrong file.

## 4. Narrow Permissions and Secrets

### Problem

The workflow declares:

```yaml
permissions:
  contents: write
  issues: write
  actions: write
```

The security assessment already marks `actions: write` as excess. The runtime
also passes every supported provider API key into the agent environment, even
though only one configured provider is used.

### Desired Behavior

- Remove `actions: write` from the default workflow if possible.
- Split installer and agent permissions if a single top-level permission block
  is too broad.
- Pass only the selected provider's key into the pi process.
- Keep `GITHUB_TOKEN` available only for GitHub API operations that require it.

### Implementation Notes

Workflow permissions:

- Prefer job-level `permissions` instead of top-level permissions.
- `run-install` likely needs `contents: write`.
- `run-agent` needs `contents: write`, `issues: write`, and possibly
  `pull-requests: write` after PR-first mode is added.
- Do not grant `actions: write` unless a tested installer behavior proves it is
  required.

Secrets:

- It is acceptable for the workflow to expose secrets as environment variables
  to `agent.ts` initially, but `agent.ts` should only pass the selected
  provider key to the pi subprocess.
- Consider building `env` explicitly in `Bun.spawn(piArgs, { env: ... })`.
- Preserve required baseline env vars such as `PATH`, `HOME`, `GITHUB_TOKEN`,
  and the selected provider key.

### Acceptance Criteria

- `actions: write` is absent from the default workflow.
- `run-agent` has no more permissions than required for issue comments, content
  branch pushes, and PR creation.
- A configured OpenAI run does not expose Anthropic, Gemini, xAI, OpenRouter,
  Mistral, or Groq keys to the pi subprocess.
- Missing-key errors remain clear and provider-specific.

## 5. Install From Releases, Not main.zip

### Problem

The installer downloads from `refs/heads/main.zip`. This makes installation and
upgrade behavior mutable. A user cannot reliably pin what version they install.

### Desired Behavior

- Default installer downloads a tagged release.
- Users can pin a specific version.
- The installer can still offer an explicit "latest" channel.
- The downloaded archive is validated where practical.

### Implementation Notes

Add workflow dispatch input:

```yaml
workflow_dispatch:
  inputs:
    version:
      description: "GMI version to install, for example v2.0.1 or latest"
      required: false
      default: "latest"
```

Installer behavior:

1. If `version == latest`, query GitHub releases for the latest stable release.
2. If `version` is a tag, download that tag archive.
3. Use the release asset or tag archive instead of the `main` branch archive.
4. Compare local `.github-minimum-intelligence/VERSION` to the selected version.
5. Record installed source in a small metadata file, for example
   `.github-minimum-intelligence/INSTALLATION.json`.

Example metadata:

```json
{
  "source": "release",
  "version": "2.0.1",
  "tag": "v2.0.1",
  "installedAt": "2026-06-20T00:00:00.000Z"
}
```

### Acceptance Criteria

- New installs use a release tag by default.
- Users can install a specific version.
- Upgrade checks compare against the chosen release channel.
- The installer no longer depends on the current contents of `main`.

## 6. Add Runtime Tool Policy

### Problem

The GitHub agent invokes pi with:

```txt
--tools read,bash,edit,write,grep,find,ls
```

That is powerful. The README says users can make it read-only by editing source
code, but source edits are the wrong interface for a safety policy.

### Desired Behavior

Add a settings-based tool policy.

Example:

```json
{
  "toolPolicy": {
    "mode": "pr",
    "tools": ["read", "grep", "find", "ls", "edit", "write"],
    "allowBash": false
  }
}
```

Suggested modes:

- `"read_only"`: `read,grep,find,ls`
- `"edit_without_bash"`: `read,edit,write,grep,find,ls`
- `"full"`: `read,bash,edit,write,grep,find,ls`

Default should be `"edit_without_bash"` or `"read_only"` depending on how much
the project wants to prioritize safety over capability. For public adoption,
`"edit_without_bash"` is a reasonable compromise when combined with PR-first
mode.

### Implementation Notes

In `agent.ts`:

1. Read `toolPolicy.mode`.
2. Convert mode to a tool string.
3. Use that string in `piArgs` instead of the hard-coded tool list.
4. Validate unknown modes and fail with a clear settings error.

### Acceptance Criteria

- Users can change tool mode without editing TypeScript.
- Read-only mode cannot invoke bash, edit, or write tools.
- Default install does not require unrestricted bash unless explicitly chosen.
- README documents the setting.

## 7. Add GitHub Agent Tests

### Problem

Current tests cover only a few `local-chat` regressions. They do not test the
GitHub Actions agent path, which is the riskiest code path.

### Desired Behavior

Add tests that exercise `agent.ts` logic without making real GitHub API calls,
real LLM calls, or real git pushes.

### Implementation Notes

The current `agent.ts` is a script with top-level side effects. Testing will be
easier if it is refactored into a small library plus entrypoint:

- `lifecycle/agent-core.ts`: pure helpers and orchestrator functions.
- `lifecycle/agent.ts`: thin executable wrapper that reads env and calls core.

Recommended tests:

1. Activation:
   - ordinary issue ignored in explicit mode
   - label activates issue
   - `/gmi` activates comment and strips prefix
   - always mode preserves legacy behavior
2. Session mapping:
   - new session maps by directory diff
   - resume preserves existing mapping
   - ambiguous session diff fails
3. Provider key validation:
   - missing key posts useful message
   - unknown provider behavior is explicit
4. Comment extraction:
   - extracts final assistant text from JSONL
   - handles empty assistant message
   - handles malformed JSONL gracefully
5. Commit mode:
   - PR mode pushes `agent/issue-N`
   - direct mode pushes `HEAD:<defaultBranch>`
   - PR mode reuses existing PR
6. Failure handling:
   - pi failure produces a clear error
   - push failure still posts issue response
   - reaction failure does not mask original error

Use dependency injection for:

- process runner
- filesystem access
- GitHub API wrapper
- current time
- pi invocation

### Acceptance Criteria

- `bun test lifecycle/` covers both local runner and GitHub agent helpers.
- Tests do not require network access.
- Tests do not require real GitHub credentials.
- New safety behavior is locked by regression tests.

## 8. Pin Dependency Versions

### Problem

`@earendil-works/pi-coding-agent` is pinned exactly, but several dependencies
use caret ranges in `.github-minimum-intelligence/package.json`.

For an autonomous agent runtime, exact versions are preferable.

### Desired Behavior

- Pin all dependencies and devDependencies exactly.
- Keep `bun.lock` updated.
- Add an audit/update process to docs.

### Implementation Notes

Change examples:

```json
"ansi-regex": "6.1.0",
"marked": "15.0.12",
"marked-terminal": "7.3.0"
```

Then run:

```bash
bun install --frozen-lockfile
```

If the lockfile needs to change, run normal install without frozen lockfile and
commit the resulting lockfile.

### Acceptance Criteria

- No dependency in `package.json` uses `^` or `~`.
- `bun install --frozen-lockfile` succeeds.
- `bun test lifecycle/` succeeds.

## 9. Update Documentation and Positioning

### Problem

The README sells the strongest version of the concept, but it does not make the
new safer default operating model clear. It also tells users to edit source code
for read-only mode.

### Desired Behavior

The README should clearly describe:

- The default trigger model.
- The default PR-first model.
- How to opt into direct mode.
- How to choose tool policy.
- How releases and upgrades work.
- What secrets are required for each provider.
- The operational risk of public repositories.

### Implementation Notes

Update `.github-minimum-intelligence/README.md`:

- Installation step 4 should say to label an issue with `gmi` or comment with
  `/gmi`, depending on the implemented trigger.
- Replace "Make it read-only - add `--tools ...` to source" with settings-based
  `toolPolicy`.
- Add a "Default Safety Model" section:
  - explicit activation
  - PR-first commits
  - least required workflow permissions
  - provider-specific secret use
- Add a "Direct Mode" warning section.

Update `.github-minimum-intelligence/docs/security-assessment.md`:

- Mark addressed findings as mitigated or partially mitigated.
- Keep remaining hosted-runner risks explicit.

### Acceptance Criteria

- README matches actual defaults.
- No documentation tells users to edit TypeScript for routine configuration.
- Security docs distinguish between fixed risks and unavoidable hosted-runner
  properties.

## Verification Checklist

After implementation, run:

```bash
cd .github-minimum-intelligence
bun install --frozen-lockfile
bun test lifecycle/
```

Also perform a dry workflow simulation if test scaffolding supports it:

- issue opened without `gmi`: no pi call
- issue opened with `gmi`: pi call, branch push, PR creation
- comment with `/gmi`: same issue session resumes
- concurrent issue simulation: session mappings do not cross
- missing API key: useful issue comment
- direct mode: pushes to default branch only when explicitly configured

## Definition of Done

This improvement pass is done when:

- Default installs are explicit-trigger and PR-first.
- Direct-to-main behavior is opt-in and documented as higher risk.
- The agent does not attribute sessions by global newest mtime.
- Workflow permissions are job-scoped and minimal.
- Runtime secrets are provider-specific.
- Installer uses release tags rather than `main.zip`.
- Tool policy is configured in settings, not hard-coded source edits.
- GitHub agent behavior has meaningful automated tests.
- README and security docs match the implementation.

