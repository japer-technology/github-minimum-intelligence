# Analysis: OpenClaw Implementation Alongside Minimum Intelligence

Two intelligences in one repository. Minimum Intelligence answers on `!` — the imperative. OpenClaw answers on `@` — the invocation. Each has its own folder, its own workflow, its own session state, its own identity. They share the repository, the issue threads, and the commit graph. They do not share a runtime, a model configuration, or a trigger surface. This document examines how that coexistence works, what it requires, and what it makes possible.

---

## 1. The Prefix Protocol

The core mechanism is a one-character dispatch: the first character of an issue title or comment body determines which intelligence responds.

| Prefix | Intelligence | Folder | Workflow |
|--------|-------------|--------|----------|
| `!` | Minimum Intelligence (GMI) | `.github-minimum-intelligence/` | `.github/workflows/github-minimum-intelligence-agent.yml` |
| `@` | OpenClaw Intelligence | `.github-openclaw-intelligence/` | `.github/workflows/.github-openclaw-intelligence-agent.yml` |
| _(other)_ | Neither — no agent responds | — | — |

### 1.1 Why Prefixes, Not Separate Repos

Both intelligences operate on the same codebase. A developer asking GMI to review a file and asking OpenClaw to search the web for context about that file's API are working on the same problem from different angles. Splitting them into separate repositories would break the shared context — the commit graph, the file tree, the issue history — that makes multi-intelligence collaboration valuable.

Prefixes keep the dispatch in the conversational layer (issue text) rather than the structural layer (repository topology). The human chooses which intelligence to address by how they begin their message, the same way they would address a specific person in a group conversation.

### 1.2 Dispatch Rules

For a new issue (`issues.opened` event):

| Condition | Result |
|-----------|--------|
| Title starts with `!` | GMI workflow runs, OpenClaw workflow skips |
| Title starts with `@` | OpenClaw workflow runs, GMI workflow skips |
| Title starts with anything else | Both workflows skip |

For a comment on an existing issue (`issue_comment.created` event):

| Condition | Result |
|-----------|--------|
| Comment body starts with `!` | GMI workflow runs, OpenClaw workflow skips |
| Comment body starts with `@` | OpenClaw workflow runs, GMI workflow skips |
| Comment body starts with anything else | Both workflows skip |

The prefix is stripped before passing the text to the agent as a prompt. `! Review the auth module` becomes `Review the auth module`. `@ Search for CVEs in lodash 4.17` becomes `Search for CVEs in lodash 4.17`. The intelligence never sees the dispatch character — it receives a clean prompt.

### 1.3 Implementation in the Workflow

Each workflow adds a prefix check to its existing trigger guard. The GMI workflow currently has:

```yaml
if: >-
  (github.event_name == 'issues')
  || (github.event_name == 'issue_comment' && !endsWith(github.event.comment.user.login, '[bot]'))
```

With the prefix protocol, this becomes:

```yaml
if: >-
  (github.event_name == 'issues' && startsWith(github.event.issue.title, '!'))
  || (github.event_name == 'issue_comment' && !endsWith(github.event.comment.user.login, '[bot]') && startsWith(github.event.comment.body, '!'))
```

The OpenClaw workflow uses the same pattern with `@`:

```yaml
if: >-
  (github.event_name == 'issues' && startsWith(github.event.issue.title, '@'))
  || (github.event_name == 'issue_comment' && !endsWith(github.event.comment.user.login, '[bot]') && startsWith(github.event.comment.body, '@'))
```

### 1.4 Implementation in agent.ts

The agent script strips the prefix before building the prompt. In the GMI agent:

```typescript
if (eventName === "issue_comment") {
  prompt = event.comment.body.replace(/^!\s*/, "");
} else {
  prompt = `${title.replace(/^!\s*/, "")}\n\n${body}`;
}
```

The OpenClaw agent applies the same logic for `@`:

```typescript
if (eventName === "issue_comment") {
  prompt = event.comment.body.replace(/^@\s*/, "");
} else {
  prompt = `${title.replace(/^@\s*/, "")}\n\n${body}`;
}
```

---

## 2. The Folder Structure

OpenClaw Intelligence lives in `.github-openclaw-intelligence/`, a sibling to `.github-minimum-intelligence/`. The internal structure mirrors GMI's conventions while accommodating OpenClaw's heavier runtime.

```
.github-openclaw-intelligence/
├── .pi/
│   └── settings.json              # LLM provider, model, thinking level
├── AGENTS.md                      # OpenClaw agent identity and standing orders
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE.md
├── PACKAGES.md
├── README.md
├── SECURITY.md
├── VERSION
├── bun.lock
├── config/
│   └── extensions.json            # Which OpenClaw extensions and skills to activate
├── docs/
│   └── ...                        # OpenClaw-specific documentation
├── install/
│   ├── OPENCLAW-AGENTS.md         # Default AGENTS.md for fresh installs
│   └── settings.json              # Default .pi/settings.json
├── lifecycle/
│   └── agent.ts                   # Core orchestrator (OpenClaw variant)
├── package.json                   # Dependencies (OpenClaw runtime + pi agent)
├── public-fabric/                 # Optional GitHub Pages content
└── state/
    ├── issues/                    # Issue-to-session mappings
    ├── sessions/                  # Conversation transcripts (JSONL)
    └── memory.log                 # Append-only long-term memory
```

### 2.1 What Differs from GMI

| Aspect | GMI (`.github-minimum-intelligence/`) | OpenClaw (`.github-openclaw-intelligence/`) |
|--------|---------------------------------------|---------------------------------------------|
| Agent runtime | `pi` CLI (7 tools, lightweight) | OpenClaw runtime (30+ tools, full platform) |
| Dependencies | Single `pi` npm package | OpenClaw core + selected extensions + skills |
| Build step | `bun install` (~10 s) | `bun install` + build pipeline (~1–3 min) |
| Tool surface | File read/write, grep, glob, bash, browser, web | All GMI tools + sub-agents, canvas, media, memory search |
| Config | `.pi/settings.json` (provider, model) | `.pi/settings.json` + `config/extensions.json` (extension/skill selection) |
| Install size | ~50 MB (`node_modules`) | ~200–500 MB (`node_modules` + build artifacts) |
| Session format | JSONL (pi agent output) | JSONL (OpenClaw agent output, includes tool call/result pairs) |

### 2.2 What Stays the Same

Both intelligences share these structural conventions:

- **State directory layout:** `state/issues/<n>.json` maps to `state/sessions/<id>.jsonl`
- **Session continuity:** `--session <path>` resumes prior context
- **Memory log:** Append-only `memory.log` with `merge=union` git attribute
- **Lifecycle pipeline:** Authorize → checkout → install → run → commit → post reply
- **Push-retry loop:** Up to 10 attempts with `git pull --rebase -X theirs`
- **Comment size cap:** 60 000 characters (GitHub's ~65 535 limit with safety margin)
- **Reaction protocol:** 🚀 on start, 👍 on success, 👎 on error

---

## 3. The Workflow

The OpenClaw workflow at `.github/workflows/.github-openclaw-intelligence-agent.yml` follows the same three-job structure as GMI's workflow: install, agent, and pages.

### 3.1 Triggers

```yaml
name: .github-openclaw-intelligence-agent

on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]
  push:
    branches: ["main"]
    paths-ignore:
      - ".github/workflows/**"
  workflow_dispatch:
```

Identical triggers to GMI. The prefix check in the `if:` guard on the `run-agent` job determines which workflow actually executes.

### 3.2 Jobs

| Job | Purpose | Trigger |
|-----|---------|---------|
| `run-install` | Download and install `.github-openclaw-intelligence/` from a template repo | `workflow_dispatch` |
| `run-agent` | Process `@`-prefixed issues/comments through the OpenClaw runtime | `issues.opened` or `issue_comment.created` |
| `run-gitpages` | Publish `public-fabric/` to GitHub Pages | `push` to main |

### 3.3 The run-agent Job

The agent job mirrors GMI's structure with adjustments for OpenClaw's heavier build:

| Step | GMI | OpenClaw |
|------|-----|----------|
| Authorize | Same — collaborator permission check + 🚀 reaction | Same |
| Reject | Same — 👎 on auth failure | Same |
| Checkout | `fetch-depth: 0` | `fetch-depth: 0` |
| Check folder | `.github-minimum-intelligence` exists? | `.github-openclaw-intelligence` exists? |
| Setup Bun | `bun-version: "1.2"` | `bun-version: "1.2"` |
| Cache | Key: `mi-deps-${{ hashFiles('...bun.lock') }}` | Key: `oci-deps-${{ hashFiles('...bun.lock') }}` |
| Install | `bun install --frozen-lockfile` | `bun install --frozen-lockfile` |
| Build | _(not needed)_ | `bun run build` (OpenClaw TypeScript compilation) |
| Run | `bun .github-minimum-intelligence/lifecycle/agent.ts` | `bun .github-openclaw-intelligence/lifecycle/agent.ts` |

The additional build step is the primary difference. OpenClaw's monorepo requires TypeScript compilation and bundling before the agent can run. With caching, the build adds ~30–60 s to warm invocations and ~1–3 min to cold ones.

### 3.4 Concurrency

Each intelligence gets its own concurrency group:

```yaml
# GMI
concurrency:
  group: github-minimum-intelligence-${{ github.repository }}-issue-${{ github.event.issue.number }}

# OpenClaw
concurrency:
  group: github-openclaw-intelligence-${{ github.repository }}-issue-${{ github.event.issue.number }}
```

This means GMI and OpenClaw can run simultaneously on different issues, or even on the same issue (one triggered by `!`, the other by `@`). They will not block each other. Git push conflicts between the two are handled by each intelligence's independent retry loop — their state directories are separate, so rebases resolve cleanly.

---

## 4. Session Isolation

Both intelligences maintain independent session state in their respective folders. They do not share sessions, memory, or issue mappings.

### 4.1 State Paths

| Resource | GMI Path | OpenClaw Path |
|----------|----------|---------------|
| Issue mapping | `.github-minimum-intelligence/state/issues/42.json` | `.github-openclaw-intelligence/state/issues/42.json` |
| Session transcript | `.github-minimum-intelligence/state/sessions/<id>.jsonl` | `.github-openclaw-intelligence/state/sessions/<id>.jsonl` |
| Memory log | `.github-minimum-intelligence/state/memory.log` | `.github-openclaw-intelligence/state/memory.log` |

### 4.2 Why Full Isolation

Sharing sessions between two different agent runtimes with different tool surfaces, different context window sizes, and potentially different LLM providers would produce unreliable context. A session transcript from OpenClaw (which includes tool call/result pairs for 30+ tools) fed into GMI's pi agent (which expects 7-tool transcripts) would confuse the session parser or waste context window on tool interactions the agent cannot reproduce.

Full isolation ensures each intelligence operates in a context it understands. Cross-intelligence awareness — where OpenClaw knows what GMI said, or vice versa — comes from the shared issue thread, not from shared session files. Both agents can read the issue's comment history via the GitHub API, which gives them visibility into each other's responses without coupling their internal state.

### 4.3 Cross-Intelligence Conversation

A typical multi-intelligence interaction on a single issue:

```
Issue #42: "! Explain the auth module"
  → GMI responds with architecture explanation

Comment: "@ Search for recent CVEs affecting our JWT library"
  → OpenClaw responds with web search results

Comment: "! Refactor based on the CVEs OpenClaw found"
  → GMI reads the full issue thread (including OpenClaw's comment),
    incorporates the CVE information, and proposes code changes
```

Each intelligence sees the other's output as part of the issue's comment history. The human orchestrates the collaboration by choosing which intelligence to address for each turn. This is not automated multi-agent routing — it is human-directed multi-intelligence collaboration.

---

## 5. What OpenClaw Brings

The [github-fabric OpenClaw analysis](https://github.com/japer-technology/github-fabric/tree/main/.github-fabric/docs/repo/openclaw) and the [githubification lesson](https://github.com/japer-technology/githubification/blob/main/.githubification/lesson-from-openclaw.md) established that OpenClaw is the most architecturally complex agent to be expressed through GitHub-as-infrastructure. When implemented alongside GMI, it brings capabilities that GMI does not have:

### 5.1 Tool Surface Comparison

| Capability | GMI (pi agent) | OpenClaw |
|-----------|----------------|----------|
| File read/write/edit | ✅ | ✅ |
| Code search (grep, glob) | ✅ | ✅ |
| Bash execution | ✅ | ✅ |
| Browser automation | ✅ | ✅ (richer — headless Chromium with CDP) |
| Web search / fetch | ✅ | ✅ (richer — multiple search backends) |
| Sub-agent orchestration | ❌ | ✅ |
| Semantic memory search | ❌ | ✅ (BM25 + vector embeddings) |
| Media understanding | ❌ | ✅ (image analysis, OCR, PDF extraction) |
| Canvas rendering | ❌ | ❌ (no display on Actions runner) |
| Voice / audio | ❌ | ❌ (no audio surface on Actions runner) |
| Diff analysis | Basic | ✅ (dedicated extension) |
| Multi-model failover | ❌ | ✅ (automatic provider fallback) |

### 5.2 The Complementary Roles

The two intelligences serve different purposes in the developer's workflow:

| Role | Best Served By | Why |
|------|---------------|-----|
| Quick code review | GMI | Lightweight, fast startup (~18–30 s), focused tool surface |
| Deep research with web context | OpenClaw | Web search, browser automation, sub-agent delegation |
| Simple Q&A about the codebase | GMI | Low latency, minimal token consumption |
| Complex multi-step analysis | OpenClaw | Sub-agent orchestration, semantic memory, richer tool surface |
| File edits and commits | GMI | Purpose-built for repository modification |
| Cross-reference with external systems | OpenClaw | Browser automation, web fetch, media understanding |

The prefix protocol lets the developer match the task to the intelligence. Routine questions go to GMI (`!`). Complex, multi-source tasks go to OpenClaw (`@`).

---

## 6. Cost and Resource Impact

Running two intelligences doubles the potential Actions minutes consumption and the git storage growth. The practical impact depends on usage patterns.

### 6.1 Actions Minutes

| Intelligence | Per-Invocation (warm cache) | Per-Invocation (cold) |
|-------------|---------------------------|----------------------|
| GMI | ~1.5–3 min | ~3–5 min |
| OpenClaw | ~2.5–4 min | ~5–7 min |
| Combined ceiling | ~4–7 min | ~8–12 min |

On the free tier (2 000 min/month), a mixed workload of ~60% GMI and ~40% OpenClaw invocations yields approximately 350–500 total invocations per month. This is lower than GMI alone (~600–1 300) but sufficient for most individual or small-team repositories.

### 6.2 Git Storage

| Resource | GMI Growth/Month | OpenClaw Growth/Month | Combined |
|----------|-----------------|----------------------|----------|
| Session transcripts | 1–20 MB | 2.5–50 MB | 3.5–70 MB |
| Memory logs | 25–100 KB | 50–200 KB | 75–300 KB |
| Issue mappings | ~25 KB | ~25 KB | ~50 KB |
| **Total** | ~1–20 MB | ~2.5–50 MB | **~3.5–70 MB** |

Annual combined growth: ~42–840 MB. At the upper bound, periodic archival of old sessions is advisable. The `.gitattributes` `merge=union` directive must cover both memory logs:

```
.github-minimum-intelligence/state/memory.log merge=union
.github-openclaw-intelligence/state/memory.log merge=union
```

### 6.3 LLM Token Budget

Each intelligence has its own provider and model configuration. A cost-optimized setup might use a cheaper model for GMI (routine tasks) and a more capable model for OpenClaw (complex tasks):

| Intelligence | Model Example | Typical Cost per Invocation |
|-------------|---------------|---------------------------|
| GMI | GPT-4o-mini or Claude Haiku | $0.002–0.01 |
| OpenClaw | Claude Sonnet or GPT-4o | $0.03–0.15 |

The prefix protocol naturally partitions cost: developers route cheap questions to GMI and expensive questions to OpenClaw.

---

## 7. Installation and Upgrade

### 7.1 Install Flow

The `run-install` job in `.github-openclaw-intelligence-agent.yml` follows the same pattern as GMI's installer:

1. Check for `.github-openclaw-intelligence/` folder.
2. If absent → download from template repository, install fresh.
3. If present → compare `VERSION` files, upgrade if remote is newer.
4. Preserve user-customised files (`AGENTS.md`, `.pi/`, `state/`) across upgrades.
5. Ensure `.gitignore` entries for `node_modules/` and `.github-openclaw-intelligence/node_modules/`.
6. Ensure `.gitattributes` entry for `memory.log merge=union`.
7. Commit and push.

### 7.2 Independent Versioning

Each intelligence has its own `VERSION` file and its own template repository:

| Intelligence | Version File | Template Source |
|-------------|-------------|----------------|
| GMI | `.github-minimum-intelligence/VERSION` | `japer-technology/github-minimum-intelligence` |
| OpenClaw | `.github-openclaw-intelligence/VERSION` | A dedicated OpenClaw template repository |

Upgrades are independent. Updating GMI does not affect OpenClaw, and vice versa. A repository can run GMI at version 1.0.3 and OpenClaw at version 2.1.0 without conflict.

### 7.3 Installing Both

A repository that wants both intelligences runs each installer's `workflow_dispatch` independently:

1. Go to **Actions → github-minimum-intelligence-agent → Run workflow** to install GMI.
2. Go to **Actions → .github-openclaw-intelligence-agent → Run workflow** to install OpenClaw.

Each installer creates its own folder and commits independently. The order does not matter.

---

## 8. Governance

### 8.1 Shared Authorization

Both workflows use the same authorization mechanism: the GitHub collaborator permission check. A user who is authorized for GMI is authorized for OpenClaw. There is no separate permission model per intelligence — repository collaborator roles are the single source of truth.

### 8.2 Independent Configuration

Each intelligence has its own:

- **LLM provider and model** (`.pi/settings.json`) — GMI can use OpenAI while OpenClaw uses Anthropic.
- **Agent identity** (`AGENTS.md`) — different standing orders, different personality, different constraints.
- **Extension/skill selection** (OpenClaw's `config/extensions.json`) — which tools are activated.
- **Session state** (`state/`) — fully isolated conversation history.

### 8.3 Disabling One Intelligence

Removing one intelligence does not affect the other:

- Delete `.github-openclaw-intelligence/` → OpenClaw stops, GMI continues.
- Delete `.github-minimum-intelligence/` → GMI stops, OpenClaw continues.
- Delete both → no agents respond to any issues.

Each workflow's safety check (`Check for .github-*-intelligence` step) handles the missing-folder case gracefully with a skip, not a failure.

### 8.4 The Audit Trail

Both intelligences commit to the same repository, so their combined activity appears in a single `git log`. A reviewer can see:

```
abc1234  agent: gmi responds to issue #42
def5678  agent: openclaw responds to issue #42
ghi9012  agent: gmi responds to issue #43
```

The commit author and message distinguish which intelligence produced each change. The full audit trail — who asked what, which intelligence answered, what state changed — lives in one commit graph.

---

## 9. Summary

| Dimension | Design Decision |
|-----------|----------------|
| **Dispatch** | `!` prefix → GMI, `@` prefix → OpenClaw, no prefix → neither |
| **Folder** | `.github-minimum-intelligence/` and `.github-openclaw-intelligence/` side by side |
| **Workflow** | `github-minimum-intelligence-agent.yml` and `.github-openclaw-intelligence-agent.yml` |
| **Session state** | Fully isolated — separate `state/` directories, no shared sessions |
| **Cross-intelligence awareness** | Via the shared issue thread (comment history), not shared state |
| **Authorization** | Shared — GitHub collaborator permissions apply to both |
| **Configuration** | Independent — each intelligence has its own provider, model, identity |
| **Versioning** | Independent — separate `VERSION` files and template sources |
| **Concurrency** | Independent concurrency groups — both can run simultaneously |
| **Git push conflicts** | Separate state directories ensure clean rebases |
| **Cost model** | Additive — combined Actions minutes and storage, partitioned by prefix |
| **Complementary roles** | GMI for fast, focused repository tasks; OpenClaw for complex, multi-tool tasks |

Two intelligences in one repository is not twice the complexity. It is twice the capability with the same governance model. The prefix protocol gives the human explicit control over which mind to engage, and the folder-level isolation ensures they never interfere with each other. The repository gains a lightweight, fast intelligence for routine work and a powerful, tool-rich intelligence for complex work — both governed by the same collaborator permissions, both auditable in the same commit graph, both addressable from the same issue thread.
