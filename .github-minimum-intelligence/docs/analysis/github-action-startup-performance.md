# Analysis: GitHub Action Startup Performance

The question is whether the current workflow implementation starts the agent as fast as possible. This document breaks down every phase between "user posts a comment" and "the agent begins reasoning," measures each phase's contribution to startup latency, examines alternatives, and identifies what can be improved versus what is constrained by GitHub's platform.

---

## 1. The Current Startup Pipeline

When a user opens an issue or posts a comment, the workflow executes these steps in strict sequence before the `pi` agent begins its first LLM call:

| Step | Workflow Phase | What Happens | Estimated Duration |
|---|---|---|---|
| 0 | **Queue** | GitHub receives the webhook, schedules the job, provisions a runner | 3–15s (uncontrollable) |
| 1 | **Authorize** | Single `gh api` call to check collaborator permission | 1–3s |
| 2 | **Reject** | Conditional — only runs on auth failure, skipped on success | 0s (skip) |
| 3 | **Checkout** | `actions/checkout@v4` with `fetch-depth: 0` (full history) | 5–60s (depends on repo size) |
| 4 | **Setup Bun** | `oven-sh/setup-bun@v2` downloads and installs the Bun runtime | 3–10s |
| 5 | **Preinstall** | `bun indicator.ts` — adds 🚀 reaction via `gh` CLI | 2–5s |
| 6 | **Install** | `bun install --frozen-lockfile` in `.github-minimum-intelligence/` | 10–30s |
| 7 | **Run** | `bun agent.ts` — agent startup, session resolution, prompt building, `pi` invocation | 3–8s before first LLM call |

**Total pre-LLM latency: ~27–131 seconds.** The typical case for a small-to-medium repository is **30–60 seconds** from webhook to first LLM token.

The user-visible latency is slightly different — the 🚀 reaction (step 5) provides feedback around the 15–35 second mark, but the actual agent response does not begin generating until step 7.

---

## 2. Phase-by-Phase Analysis

### 2.1 Queue and Runner Provisioning (Step 0)

**Duration:** 3–15 seconds typical; can spike to 30+ seconds during GitHub-wide demand peaks.

**What's happening:** GitHub Actions receives the webhook event, evaluates workflow trigger conditions, checks concurrency rules, allocates a runner from the `ubuntu-latest` pool, and boots the runner environment.

**Can this be optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Use `ubuntu-latest` (current) | GitHub's best-provisioned pool; fastest queue times | ✅ Already doing this |
| Self-hosted runners | Eliminates queue time entirely (~0s provisioning) | ⚠️ Requires infrastructure, contradicts zero-infra design |
| Larger runners (`ubuntu-latest-4-cores`, etc.) | No queue-time benefit; helps execution speed only | ❌ No startup improvement |
| `runs-on: ubuntu-24.04` (pinned) | Slightly faster if image is pre-cached; avoids image resolution | ⚠️ Marginal; loses auto-upgrade |

**Verdict:** The current choice (`ubuntu-latest`) is optimal for the zero-infrastructure constraint. Queue time is platform-controlled and cannot be reduced without self-hosted runners.

### 2.2 Authorization (Step 1)

**Duration:** 1–3 seconds.

**What's happening:** A single GitHub REST API call checks the actor's collaborator permission level.

**Can this be optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Remove auth check | Saves 1–3s but allows any user to trigger the agent | ❌ Security requirement |
| Move auth to workflow-level `if` | Would need to use context variables only; GitHub doesn't expose permission in `github.*` context | ❌ Not possible without API call |
| Run auth in parallel with checkout | GitHub Actions steps are strictly sequential within a job | ❌ Platform limitation |
| Use repository ruleset permissions instead | Still requires an API call | ❌ No improvement |

**Verdict:** Already minimal. A single API call is the cheapest possible authorization check.

### 2.3 Checkout (Step 3)

**Duration:** 5–60 seconds, scaling with repository size and history depth.

**What's happening:** `actions/checkout@v4` with `fetch-depth: 0` clones the entire repository history. This is needed because `agent.ts` performs `git commit` and `git push`, which requires a full checkout to resolve references and handle rebases.

**Can this be optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| `fetch-depth: 1` (shallow clone) | Saves 2–50s on large repos; checkout becomes near-instant on small repos | ⚠️ Breaks `git pull --rebase` conflict resolution |
| `fetch-depth: 2` | Minimal history for simple push; much faster than full clone | ⚠️ May break rebase on conflicts |
| Shallow clone + `git fetch --unshallow` only on push failure | Fast path: shallow; slow path: full fetch only when needed | ✅ Potential optimization |
| `sparse-checkout` with only `.github-minimum-intelligence/` | Saves time if repo has many large files | ⚠️ Breaks if agent needs to read/edit repo files (it does) |
| `actions/checkout@v4` with `filter: blob:none` (treeless clone) | Downloads tree structure but defers blob downloads | ✅ Potential optimization — still allows push/rebase |

**This is the single largest variable-cost step in the pipeline.** For repositories with thousands of commits, `fetch-depth: 0` can take 30–60 seconds. The treeless clone option (`filter: blob:none`) is the most promising optimization — it downloads the commit graph and tree objects but defers file content downloads to on-demand fetches, which dramatically reduces initial clone time while still supporting `git push` and `git pull --rebase`.

However, `fetch-depth: 0` is the **safest** option. The treeless clone (`filter: blob:none`) is supported by GitHub and `actions/checkout@v4`, but it changes git's behavior in subtle ways — for example, `git log --stat` and `git diff` will trigger on-demand fetches. Since the `pi` agent may run arbitrary git commands, the safest choice is the full clone.

**Verdict:** `fetch-depth: 0` is the safest option. A shallow clone with deferred unshallow (`fetch-depth: 1`, then unshallow only on push conflict) could save 5–40 seconds on large repos but adds complexity and risk. The treeless clone (`filter: blob:none`) is a middle ground worth investigating for repositories where checkout time dominates.

### 2.4 Bun Setup (Step 4)

**Duration:** 3–10 seconds.

**What's happening:** `oven-sh/setup-bun@v2` downloads the Bun binary, extracts it, and adds it to `PATH`. The action has built-in caching — if the same Bun version was used in a recent run, it restores from the runner's tool cache.

**Can this be optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Pin Bun version (e.g., `bun-version: "1.2.x"`) | Improves cache hit rate; `latest` resolves to a new version on each release | ✅ Low-risk improvement |
| Use Node.js instead of Bun | Node.js is pre-installed on `ubuntu-latest`; zero setup time | ⚠️ Requires rewriting TypeScript execution strategy; loses Bun's `--frozen-lockfile` speed |
| Pre-install Bun in a custom Docker image | Eliminates setup step entirely | ❌ Requires maintaining a Docker image; contradicts zero-infra |
| Use `npx tsx` or `ts-node` | Pre-installed Node.js can run TypeScript with these; zero runtime setup | ⚠️ Slower execution; adds npm install overhead for tsx/ts-node |

**Verdict:** Pinning the Bun version is a free optimization that improves cache hit rates. Switching to Node.js would eliminate this step entirely but Bun's faster install and execution speed likely recovers the 3–10 seconds elsewhere in the pipeline.

### 2.5 Preinstall / Indicator (Step 5)

**Duration:** 2–5 seconds.

**What's happening:** `bun indicator.ts` makes a single `gh api` call to add a 🚀 reaction, then writes a JSON file to `/tmp`. This step runs *before* dependency installation so the user gets visual feedback as early as possible.

**Can this be optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Move reaction to the Authorize step | Saves one separate step invocation (~1s overhead); reaction happens 5–10s earlier | ✅ Viable — add reaction inline in the auth shell script |
| Use `actions/github-script@v7` | JavaScript action runs in-process; avoids Bun startup + `gh` CLI subprocess overhead | ⚠️ Adds a dependency on `actions/github-script`; marginal gain |
| Use `curl` directly instead of `gh` | Eliminates `gh` CLI overhead (~0.5s) | ⚠️ More verbose; `gh` handles auth automatically |
| Eliminate indicator entirely | Saves 2–5s | ❌ Removes user feedback |

**Verdict:** Moving the reaction into the Authorize step's shell script is the cleanest optimization. It eliminates one step boundary, one Bun cold start, and delivers the reaction 5–15 seconds earlier.

### 2.6 Dependency Installation (Step 6)

**Duration:** 10–30 seconds.

**What's happening:** `bun install --frozen-lockfile` resolves and downloads all packages listed in `bun.lock`. The lockfile contains the full `pi-coding-agent` dependency tree including AWS SDK packages, Anthropic/OpenAI SDKs, and their transitive dependencies. The lockfile is 81 KB, indicating a non-trivial dependency graph.

**Can this be optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Cache `node_modules` with `actions/cache` | Restores prior `node_modules` from cache; install step becomes a no-op on cache hit | ✅ Significant improvement (10–25s saved) |
| Use Bun's built-in cache (`~/.bun/install/cache`) | `oven-sh/setup-bun@v2` does not cache the global install cache by default | ✅ Can be enabled; partial improvement |
| Vendor `node_modules` into the repository | Zero install time; always available | ⚠️ Adds ~50–200 MB to repo; slow checkout |
| Pre-bundle `pi` + dependencies into a single file | Eliminates install step entirely; single `.js` file in repo | ⚠️ Complex bundling; may break `pi` CLI binary behavior |
| Use a smaller dependency | The `@mariozechner/pi-coding-agent` package pulls in AWS SDK, multiple LLM SDKs | ❌ This is the core dependency; cannot be replaced |

**Caching is the highest-impact optimization in the entire pipeline.** The first run will still take 10–30s, but subsequent runs (the common case) would restore `node_modules` from cache in 2–5 seconds. `actions/cache` with a hash of `bun.lock` as the cache key provides deterministic cache invalidation.

**Verdict:** Adding `actions/cache` for `node_modules` (keyed on `bun.lock` hash) is the single most impactful change available. Expected savings: 8–25 seconds on cache-hit runs.

### 2.7 Agent Startup (Step 7, pre-LLM portion)

**Duration:** 3–8 seconds before the first LLM API call.

**What's happening inside `agent.ts` before calling `pi`:**
1. Parse event JSON, read settings (~instant)
2. Read reaction state file (~instant)
3. Two `gh issue view` calls to fetch issue title and body (~2–4s)
4. Session resolution: `mkdirSync`, `existsSync`, `readFileSync` (~instant)
5. Git config: two `git config` calls (~0.5s)
6. Prompt building (~instant)
7. API key validation (~instant)
8. Spawn `pi` binary (~1–2s for process startup)

**Can this be optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Use event payload instead of `gh issue view` | Saves 2–4s; event payload already contains title and body | ⚠️ Payload body can be truncated for very long issues |
| Use event payload with fallback to API on truncation | Fast path for most issues; API call only when body is truncated | ✅ Good hybrid approach |
| Run git config in parallel with gh calls | Bun supports concurrent async operations | ✅ Minor improvement (~0.5s) |
| Pre-resolve session during install step | Moves session lookup before agent execution | ⚠️ Adds complexity for minimal gain |

**Verdict:** Using the event payload for issue content (with an API fallback for truncated bodies) saves 2–4 seconds on every run. This is a clean optimization with minimal risk.

---

## 3. Comparative Analysis: Alternative Architectures

### 3.1 Pre-compiled Binary Instead of Bun + TypeScript

| Metric | Current (Bun + TypeScript) | Pre-compiled Binary (Go/Rust) |
|---|---|---|
| Runtime setup | 3–10s (download Bun) | 0s (static binary in repo) |
| Dependency install | 10–30s | 0s (compiled in) |
| Cold start | ~1–2s (Bun JIT) | ~0.1s |
| Development iteration speed | Fast (edit .ts, run) | Slow (compile, test, commit binary) |
| Cross-platform support | Automatic (Bun handles it) | Must compile for each target |
| Repository size impact | ~5 KB of TypeScript | 10–50 MB binary |
| **Total startup savings** | — | **~15–40s** |

A pre-compiled binary eliminates runtime setup and dependency installation entirely. However, it introduces significant development complexity, increases repository size by 10–50 MB, and requires a build pipeline for releases. This contradicts the project's "minimal infrastructure" philosophy.

### 3.2 Node.js Instead of Bun

| Metric | Current (Bun) | Node.js Alternative |
|---|---|---|
| Runtime setup | 3–10s | 0s (pre-installed on runner) |
| TypeScript execution | Native Bun support | Requires `npx tsx` or compilation step |
| Dependency install | 10–30s (`bun install`) | 15–45s (`npm ci`) |
| Package resolution | Bun's fast resolver | npm's resolver (slower) |
| **Net effect** | — | Saves ~3–10s on setup, loses ~5–15s on install |

Node.js eliminates the Bun setup step because it is pre-installed on GitHub-hosted runners. However, npm's install speed is significantly slower than Bun's, and executing TypeScript requires an additional tool (`tsx`, `ts-node`, or a pre-compilation step). The net effect is roughly neutral or slightly slower overall.

### 3.3 Docker Container Action

| Metric | Current (Composite Steps) | Docker Container Action |
|---|---|---|
| Runner provisioning | Standard ubuntu runner | Same runner + Docker pull overhead |
| Image pull | N/A | 5–30s (depends on image size and caching) |
| Runtime setup | 3–10s | 0s (baked into image) |
| Dependency install | 10–30s | 0s (baked into image) |
| **Net effect** | — | Faster on cache hit; slower on cache miss |

A Docker container action pre-bakes Bun and `node_modules` into an image. On cache hit, this eliminates steps 4 and 6 entirely. On cache miss (first run, or after image update), the Docker pull adds 5–30 seconds of overhead. This approach also requires maintaining a Docker image and publishing it to a registry — adding infrastructure the project explicitly avoids.

### 3.4 JavaScript GitHub Action (action.yml with runs.using: node20)

| Metric | Current (Workflow Steps) | JS Action |
|---|---|---|
| Runtime setup | 3–10s (Bun) | 0s (Node.js is the Actions runtime) |
| Dependency install | 10–30s | 0s (bundled into action) |
| Step overhead | 7 separate steps (each has ~1s overhead) | 1 step (action entry point) |
| **Total startup savings** | — | **~15–35s** |
| Development cost | — | Requires bundling (ncc/esbuild), rewriting Bun-specific APIs |

A JavaScript action (`runs.using: node20`) runs directly in the Actions runtime without provisioning a separate runtime. Dependencies can be pre-bundled using `@vercel/ncc` or `esbuild`. This is how most high-performance GitHub Actions are implemented (checkout, cache, setup-node all use this pattern).

However, the core dependency (`@mariozechner/pi-coding-agent`) is a CLI binary, not a JavaScript library. It cannot be bundled into a JavaScript action — it must be invoked as a subprocess. The orchestration code (agent.ts, indicator.ts) could be bundled, but the expensive dependency installation (`pi` and its SDKs) would still need to happen at runtime.

---

## 4. What Is Actually Slow (Pareto Analysis)

Ranking the phases by latency contribution and optimization potential:

| Rank | Phase | Typical Duration | Optimization Potential | Effort |
|---|---|---|---|---|
| **1** | Dependency Install | 10–30s | **High** — caching saves 8–25s | Low (add `actions/cache` step) |
| **2** | Checkout | 5–60s | **Medium** — only matters for large repos | Low (change `fetch-depth`) |
| **3** | Bun Setup | 3–10s | **Medium** — pin version for better caching | Trivial |
| **4** | Queue/Provision | 3–15s | **None** — platform-controlled | N/A |
| **5** | Agent pre-LLM | 3–8s | **Low** — use event payload to save 2–4s | Low |
| **6** | Indicator | 2–5s | **Low** — merge into auth step to save ~2s | Low |
| **7** | Authorization | 1–3s | **None** — already minimal | N/A |

**80% of the controllable latency comes from two steps: dependency installation and checkout.** Everything else is either platform-constrained or already near-optimal.

---

## 5. Recommended Optimizations

Listed in order of impact-to-effort ratio:

### 5.1 Add Dependency Caching (Highest Impact)

Add an `actions/cache` step to cache `.github-minimum-intelligence/node_modules`:

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: .github-minimum-intelligence/node_modules
    key: mi-deps-${{ hashFiles('.github-minimum-intelligence/bun.lock') }}
```

**Expected saving:** 8–25 seconds on cache-hit runs (the common case).

**Risk:** None. Cache miss falls back to full install. Cache invalidates automatically when `bun.lock` changes.

### 5.2 Pin Bun Version

Change `bun-version: latest` to a pinned version:

```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: "1.2"
```

**Expected saving:** 1–3 seconds (better tool cache hit rate).

**Risk:** Minimal. Version can be bumped periodically. The `1.2` range pin accepts patch updates while avoiding major-version surprises.

### 5.3 Use Shallow Clone with Deferred Unshallow

Change checkout to shallow, unshallow only on push conflict:

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    ref: ${{ github.event.repository.default_branch }}
    fetch-depth: 1
```

Then in agent.ts, modify the push retry loop to `git fetch --unshallow` before the first rebase attempt.

**Expected saving:** 2–50 seconds depending on repository size and history depth.

**Risk:** Moderate. Shallow clones behave differently with rebase. If the `pi` agent runs git commands that expect full history, they may fail. Requires testing with the specific git operations the agent performs.

### 5.4 Merge Indicator into Authorization Step

Move the 🚀 reaction from a separate Bun script to an inline shell command in the Authorize step:

```yaml
- name: Authorize
  id: authorize
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    # Auth check (existing)
    PERM=$(gh api "repos/${{ github.repository }}/collaborators/${{ github.actor }}/permission" --jq '.permission' 2>/dev/null || echo "none")
    if [[ "$PERM" != "admin" && "$PERM" != "maintain" && "$PERM" != "write" ]]; then
      echo "::error::Unauthorized"
      exit 1
    fi
    # Add indicator reaction (moved from indicator.ts)
    if [[ "${{ github.event_name }}" == "issue_comment" ]]; then
      REACTION_ID=$(gh api "repos/${{ github.repository }}/issues/comments/${{ github.event.comment.id }}/reactions" -f content=rocket --jq '.id' 2>/dev/null || echo "")
      echo '{"reactionId":"'"$REACTION_ID"'","reactionTarget":"comment","commentId":${{ github.event.comment.id }},"issueNumber":${{ github.event.issue.number }},"repo":"${{ github.repository }}"}' > /tmp/reaction-state.json
    else
      REACTION_ID=$(gh api "repos/${{ github.repository }}/issues/${{ github.event.issue.number }}/reactions" -f content=rocket --jq '.id' 2>/dev/null || echo "")
      echo '{"reactionId":"'"$REACTION_ID"'","reactionTarget":"issue","commentId":null,"issueNumber":${{ github.event.issue.number }},"repo":"${{ github.repository }}"}' > /tmp/reaction-state.json
    fi
```

**Expected saving:** 2–4 seconds (eliminates one step boundary + one Bun cold start). The 🚀 reaction arrives ~10 seconds earlier in the pipeline.

**Risk:** Low. The indicator logic is simple; shell implementation is straightforward. The `/tmp/reaction-state.json` contract with agent.ts is preserved.

### 5.5 Use Event Payload for Issue Content

In agent.ts, use the event payload's `issue.title` and `issue.body` directly, falling back to the API only when the body appears truncated:

```typescript
let title = event.issue.title;
let body = event.issue.body ?? "";
// GitHub truncates issue body at 65536 chars in webhook payloads
if (body.length >= 65536) {
  body = await gh("issue", "view", String(issueNumber), "--json", "body", "--jq", ".body");
}
```

**Expected saving:** 2–4 seconds (eliminates two `gh` API calls in the common case).

**Risk:** Low. GitHub webhook payloads truncate string fields at 65,536 characters (per [GitHub's webhook payload size documentation](https://docs.github.com/en/webhooks/webhook-events-and-payloads#webhook-payload-object-common-properties)). Issues with bodies approaching this limit are rare.

---

## 6. What Cannot Be Made Faster

Some aspects of the startup pipeline are fixed costs imposed by the platform:

| Constraint | Duration | Why It Cannot Be Reduced |
|---|---|---|
| Webhook delivery | 1–5s | GitHub's internal routing; no user control |
| Runner provisioning | 3–15s | Pool allocation; only eliminatable with self-hosted runners |
| `actions/checkout` overhead | 2–5s (minimum) | Even a shallow clone has fixed overhead from action setup |
| Step transition overhead | ~0.5–1s per step | GitHub Actions runtime overhead per step boundary |
| First Bun cold start | ~1s | JIT compilation of TypeScript on first execution |
| First `gh` CLI call | ~0.5s | CLI binary startup and auth token validation |
| First `pi` binary startup | ~1–2s | Process initialization for the coding agent |

**Theoretical minimum startup latency** (all optimizations applied, cache-hit, small repo): **~15–20 seconds** from webhook to first LLM token.

**Theoretical minimum with self-hosted runner:** **~8–12 seconds** (eliminates queue time + tool setup).

**Hard floor:** The LLM API call itself has 1–5 seconds of latency before the first token arrives, depending on provider and model. This is outside the workflow's control.

---

## 7. Summary

**Is this the fastest way to implement the GitHub Action startup?**

The current implementation is well-structured but leaves **15–30 seconds of recoverable latency** on the table. The pipeline is not the slowest possible, but it is not the fastest either.

**What's already right:**
- Bun is faster than Node.js/npm for TypeScript execution and dependency installation.
- The indicator step runs before dependency install, providing early user feedback.
- `--frozen-lockfile` avoids resolution overhead.
- The concurrency group prevents duplicate runs.
- The authorization check is minimal (one API call).

**What can be improved without architectural changes:**

| Optimization | Expected Savings | Risk |
|---|---|---|
| Add `actions/cache` for `node_modules` | 8–25s | None |
| Pin Bun version | 1–3s | None |
| Use event payload for issue content | 2–4s | Low |
| Merge indicator into auth step | 2–4s | Low |
| **Combined (cache hit, small repo)** | **13–36s** | — |

**What would require architectural changes:**

| Change | Expected Savings | Trade-off |
|---|---|---|
| Shallow clone with deferred unshallow | 2–50s | Complexity; risk with git operations |
| Pre-compiled binary | 15–40s | Build pipeline; large binary in repo |
| Docker container action | 10–30s | Image registry; maintenance overhead |
| Self-hosted runners | 3–15s | Infrastructure; contradicts zero-infra design |

The most impactful single change is **dependency caching** — it saves the most time, has zero risk, and requires only adding one workflow step. Combined with pinning the Bun version and using the event payload directly, the typical startup-to-LLM latency drops from **30–60 seconds** to **15–30 seconds** — roughly a 2× improvement with minimal code changes and no architectural compromises.

The current architecture's fundamental constraint is that it runs `bun install` on every invocation. Every alternative approach to eliminating this (vendoring, bundling, Docker, binary compilation) trades the project's "zero infrastructure, single folder" simplicity for speed. Dependency caching is the only optimization that preserves the architecture while dramatically reducing this cost.
