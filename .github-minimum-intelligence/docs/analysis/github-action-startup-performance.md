# Analysis: GitHub Action Startup Performance

The question is whether the current workflow implementation starts the agent as fast as possible. This document breaks down every phase between "user posts a comment" and "the agent begins reasoning," measures each phase's contribution to startup latency, examines alternatives, and identifies what is constrained by GitHub's platform versus what could still be improved.

---

## 1. The Current Startup Pipeline

When a user opens an issue or posts a comment, the workflow executes these steps in strict sequence before the `pi` agent begins its first LLM call:

| Step | Workflow Phase | What Happens | Estimated Duration |
|---|---|---|---|
| 0 | **Queue** | GitHub receives the webhook, schedules the job, provisions a runner | 3–15s (uncontrollable) |
| 1 | **Authorize** | Single `gh api` permission check + 🚀 reaction + write `/tmp/reaction-state.json` | 1–3s |
| 2 | **Reject** | Conditional — only runs on auth failure, skipped on success | 0s (skip) |
| 3 | **Checkout** | `actions/checkout@v6` with `fetch-depth: 0` (full history) | 5–60s (depends on repo size) |
| 4 | **Setup Bun** | `oven-sh/setup-bun@v2` with pinned `bun-version: "1.2"` | 3–10s |
| 5 | **Cache** | `actions/cache@v5` restores `node_modules` keyed on `bun.lock` hash | 1–5s |
| 6 | **Install** | `bun install --frozen-lockfile` in `.github-minimum-intelligence/` | 0–5s (cache hit) / 10–30s (cache miss) |
| 7 | **Run** | `bun agent.ts` — event payload parsing, session resolution, prompt building, `pi` invocation | 2–5s before first LLM call |

**Total pre-LLM latency on cache hit: ~15–50 seconds.** The typical case for a small-to-medium repository with warm caches is **18–30 seconds** from webhook to first LLM token.

**Total pre-LLM latency on cache miss (first run or after dependency update): ~27–130 seconds.**

The user receives visual feedback (🚀 reaction) at the very first step — within 3–15 seconds of posting.

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

**Verdict:** Already optimal for the zero-infrastructure constraint. Queue time is platform-controlled and cannot be reduced without self-hosted runners.

### 2.2 Authorization + Indicator (Step 1)

**Duration:** 1–3 seconds.

**What's happening:** A single `gh api` call checks the actor's collaborator permission level. On success, a second `gh api` call adds the 🚀 reaction and writes the reaction state to `/tmp/reaction-state.json` for the agent's `finally` block.

**Current state:** The 🚀 indicator reaction was previously a separate Bun script step that ran after checkout. It has been merged into the Authorize step's inline shell, which means:
- The reaction fires at the earliest possible moment (before checkout, setup, or install).
- No Bun cold-start overhead for the indicator.
- One fewer step boundary (~0.5–1s saved per eliminated step).

**Can this be further optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Remove auth check | Saves 1–3s but allows any user to trigger the agent | ❌ Security requirement |
| Use `curl` instead of `gh` | Eliminates `gh` CLI overhead (~0.3s) | ⚠️ More verbose; `gh` handles auth automatically |
| Fire auth + reaction in parallel (background `&`) | Saves ~0.5s by overlapping the two API calls | ✅ Possible but adds shell complexity for marginal gain |

**Verdict:** Already near-optimal. The indicator is in the earliest possible position. Remaining micro-optimizations (curl, backgrounding) save less than 1 second each.

### 2.3 Checkout (Step 3)

**Duration:** 5–60 seconds, scaling with repository size and history depth.

**What's happening:** `actions/checkout@v6` with `fetch-depth: 0` clones the entire repository history. This is needed because `agent.ts` performs `git commit` and `git push` with a retry-on-conflict loop that calls `git pull --rebase -X theirs`, which requires sufficient history depth to resolve references.

**Can this be optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| `fetch-depth: 1` (shallow clone) | Saves 2–50s on large repos | ⚠️ Breaks `git pull --rebase` conflict resolution |
| `fetch-depth: 2` | Minimal history for simple push | ⚠️ May break rebase on conflicts |
| Shallow clone + `git fetch --unshallow` only on push failure | Fast path: shallow; slow path: full fetch only when needed | ✅ Best remaining optimization (see §5.1) |
| `sparse-checkout` with only `.github-minimum-intelligence/` | Saves time if repo has many large files | ❌ Breaks when `pi` agent reads/edits repo files |
| `filter: blob:none` (treeless clone) | Downloads tree structure but defers blob downloads | ✅ Middle ground — allows push/rebase with lower initial cost |

**This is the single largest variable-cost step in the pipeline** and the primary remaining optimization target. For repositories with thousands of commits, `fetch-depth: 0` can take 30–60 seconds while a shallow clone takes 2–5 seconds.

The treeless clone (`filter: blob:none`) downloads the commit graph and tree objects but defers file content (blob) downloads to on-demand fetches. This dramatically reduces initial clone time while still supporting `git push` and `git pull --rebase`. However, it changes git's behavior — `git log --stat`, `git diff`, and `git show` will trigger on-demand network fetches. Since the `pi` agent may run arbitrary git commands, this introduces unpredictable latency during agent execution.

**Verdict:** `fetch-depth: 0` is the safest option. The shallow-clone-with-deferred-unshallow strategy (§5.1) is the most promising remaining optimization.

### 2.4 Bun Setup (Step 4)

**Duration:** 3–10 seconds.

**What's happening:** `oven-sh/setup-bun@v2` downloads the Bun binary, extracts it, and adds it to `PATH`. The action has built-in tool-cache support — on repeated runs with the same version, it restores from the runner's tool cache instead of downloading.

**Current state:** The version is pinned to `"1.2"` (range pin), which maximizes tool-cache hit rates while accepting patch-level updates automatically. This is already the recommended configuration.

**Can this be further optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Use Node.js instead of Bun | Node.js is pre-installed; zero setup time | ⚠️ Saves 3–10s on setup but loses Bun's faster install + execution (see §3.2) |
| Pre-install Bun in a custom Docker image | Eliminates setup step entirely | ❌ Requires image registry + maintenance |
| Pin to exact patch version (e.g., `"1.2.5"`) | Guarantees identical binary across runs | ⚠️ Requires manual bumps; marginal improvement over range pin |

**Verdict:** Already optimized. The `"1.2"` range pin provides the best balance of cache hits and automatic patch updates.

### 2.5 Dependency Caching + Installation (Steps 5–6)

**Duration:** 1–5s (cache restore) + 0–5s (install on cache hit) = **1–10s total on cache hit.** On cache miss: 1–5s (cache restore miss) + 10–30s (full install) = **11–35s total.**

**What's happening:**
1. `actions/cache@v5` attempts to restore `.github-minimum-intelligence/node_modules` using a cache key derived from the hash of `bun.lock`. On a cache hit, the entire `node_modules` directory is restored from GitHub's cache storage.
2. `bun install --frozen-lockfile` then runs. On a cache hit where the restored `node_modules` matches the lockfile, Bun's install becomes a near-instant validation pass. On a cache miss, Bun performs a full dependency resolution and download.

**Current state:** Dependency caching via `actions/cache@v5` keyed on `bun.lock` hash is already in place. This is the single highest-impact optimization in the pipeline — it reduces the typical install step from 10–30 seconds to 0–5 seconds.

**Can this be further optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Also cache `~/.bun/install/cache` (Bun's global cache) | Faster installs on lockfile changes (partial re-download) | ✅ Minor improvement; only helps on cache miss |
| Use `actions/cache/restore` (restore-only, no save) + explicit save on miss | Avoids save overhead on cache hit runs | ⚠️ More complex; saves ~1s |
| Vendor `node_modules` into the repository | Zero install time always | ⚠️ Adds ~50–200 MB to repo; slows checkout more than it saves |
| Pre-bundle all deps into a single file | Eliminates install step entirely | ⚠️ Complex; may break `pi` CLI binary |

**Verdict:** Already well-optimized. The `actions/cache` + `bun install --frozen-lockfile` combination is the standard best practice. Adding Bun's global cache as a secondary cache path could marginally improve cache-miss scenarios but adds complexity for diminishing returns.

### 2.6 Agent Startup (Step 7, pre-LLM portion)

**Duration:** 2–5 seconds before the first LLM API call.

**What's happening inside `agent.ts` before calling `pi`:**
1. Parse event JSON, read `.pi/settings.json` (~instant)
2. Read reaction state from `/tmp/reaction-state.json` (~instant)
3. Read issue title and body from event payload (~instant; API fallback only if body ≥ 65 536 chars)
4. Session resolution: `mkdirSync`, `existsSync`, `readFileSync` (~instant)
5. Git config: two sequential `git config` calls (~0.5s)
6. Prompt building (~instant)
7. API key validation (~instant)
8. Spawn `pi` binary (~1–2s for process startup)

**Current state:** The agent already uses the webhook event payload directly for issue title and body, falling back to the `gh` API only when the body appears truncated at the 65 536-character webhook limit. This eliminates the two `gh issue view` API calls that previously cost 2–4 seconds on every invocation.

**Can this be further optimized?**

| Option | Effect | Feasibility |
|---|---|---|
| Run both `git config` calls as a single shell command | Saves ~0.2s by avoiding one Bun.spawn round-trip | ✅ Trivial |
| Pre-configure git identity in the workflow step | Moves git config out of agent.ts into the workflow YAML | ✅ Saves ~0.5s of Bun subprocess overhead |
| Eagerly spawn `pi` while resolving session | Overlap session resolution with `pi` process initialization | ⚠️ `pi` needs session path as a CLI argument; can't start before resolution completes |

**Verdict:** Already near-optimal. The event-payload approach eliminated the dominant latency source. The remaining micro-optimizations save less than 1 second combined.

---

## 3. Comparative Analysis: Alternative Architectures

### 3.1 Pre-compiled Binary Instead of Bun + TypeScript

| Metric | Current (Bun + TypeScript) | Pre-compiled Binary (Go/Rust) |
|---|---|---|
| Runtime setup | 3–10s (Bun from tool cache) | 0s (static binary in repo) |
| Dependency install | 0–5s (cache hit) | 0s (compiled in) |
| Cold start | ~1–2s (Bun JIT) | ~0.1s |
| Development iteration speed | Fast (edit .ts, run) | Slow (compile, test, commit binary) |
| Cross-platform support | Automatic (Bun handles it) | Must compile for each target |
| Repository size impact | ~5 KB of TypeScript | 10–50 MB binary |
| **Total startup savings** | — | **~5–15s** (reduced from the original ~15–40s estimate due to caching) |

A pre-compiled binary eliminates runtime setup and dependency installation entirely. However, the savings are smaller now that caching is in place — the gap narrows from ~15–40 seconds to ~5–15 seconds. The development complexity, repository bloat, and build pipeline requirements remain significant trade-offs.

### 3.2 Node.js Instead of Bun

| Metric | Current (Bun + cache) | Node.js Alternative |
|---|---|---|
| Runtime setup | 3–10s (Bun from tool cache) | 0s (pre-installed on runner) |
| TypeScript execution | Native Bun support | Requires `npx tsx` or compilation step |
| Dependency install (cache hit) | 0–5s | 2–10s (`npm ci` with cached `node_modules`) |
| Dependency install (cache miss) | 10–30s | 15–45s (`npm ci` full install) |
| **Net effect (cache hit)** | — | Saves ~3–5s on setup; similar or slower install |
| **Net effect (cache miss)** | — | Saves ~3–10s on setup; loses ~5–15s on install |

With caching in place, the Bun setup step is the only "extra" cost compared to Node.js. On cache-hit runs, the net savings from switching to Node.js would be roughly 0–5 seconds — not enough to justify the migration effort and the loss of Bun's faster package management.

### 3.3 Docker Container Action

| Metric | Current (Workflow Steps) | Docker Container Action |
|---|---|---|
| Runner provisioning | Standard ubuntu runner | Same runner + Docker pull overhead |
| Image pull | N/A | 5–30s (depends on image size and caching) |
| Runtime setup | 3–10s | 0s (baked into image) |
| Dependency install | 0–5s (cache hit) | 0s (baked into image) |
| **Net effect (first run)** | — | Slower (Docker pull overhead exceeds savings) |
| **Net effect (cached run)** | — | Roughly neutral; Docker layer cache ≈ actions/cache |

A Docker container action pre-bakes Bun and `node_modules` into an image. With dependency caching already in place, the advantage of Docker is marginal — both approaches achieve near-instant dependency availability on repeat runs. Docker adds image registry maintenance and versioning complexity the project explicitly avoids.

### 3.4 JavaScript GitHub Action (action.yml with runs.using: node20)

| Metric | Current (Workflow Steps) | JS Action |
|---|---|---|
| Runtime setup | 3–10s (Bun) | 0s (Node.js is the Actions runtime) |
| Dependency install | 0–5s (cache hit) | 0s (bundled into action) |
| Step overhead | 6 steps (each has ~0.5–1s overhead) | 1 step (action entry point) |
| **Total startup savings** | — | **~5–15s** |
| Development cost | — | Requires bundling (ncc/esbuild), rewriting Bun-specific APIs |

A JavaScript action runs directly in the Actions runtime without provisioning a separate runtime. However, the core dependency (`@mariozechner/pi-coding-agent`) is a CLI binary that must be invoked as a subprocess — it cannot be bundled into a JavaScript action. The `pi` binary and its SDK dependencies still need to be installed at runtime, which means the expensive dependency installation cannot be eliminated by bundling alone.

---

## 4. What Is Actually Slow (Pareto Analysis)

Ranking the phases by latency contribution in the current (optimized) pipeline:

| Rank | Phase | Typical Duration (cache hit) | Remaining Optimization Potential | Effort |
|---|---|---|---|---|
| **1** | Checkout | 5–60s | **Medium-High** — shallow clone with deferred unshallow | Moderate (workflow + agent.ts changes) |
| **2** | Queue/Provision | 3–15s | **None** — platform-controlled | N/A |
| **3** | Bun Setup | 3–10s | **Low** — only eliminatable by switching to Node.js | High (migration) |
| **4** | Agent pre-LLM | 2–5s | **Negligible** — already uses event payload | N/A |
| **5** | Cache + Install | 1–10s | **Low** — already cached effectively | N/A |
| **6** | Authorization | 1–3s | **None** — already minimal | N/A |

**After applying all low-risk optimizations, checkout is the dominant variable cost.** On a small repository (< 100 commits), checkout takes 2–5 seconds and the entire pipeline is already near the theoretical minimum. On a large repository (10 000+ commits), checkout can take 30–60 seconds and becomes the single largest bottleneck.

---

## 5. Remaining Optimization Opportunities

### 5.1 Shallow Clone with Deferred Unshallow (Only Remaining High-Impact Change)

The current workflow uses `fetch-depth: 0`, which clones the entire git history. This is the safest option because the push retry loop in `agent.ts` uses `git pull --rebase -X theirs`, which requires reachable commit history to resolve conflicts.

A two-phase approach could optimize this:

**Phase 1 (fast path):** Clone with `fetch-depth: 1`. This takes 2–5 seconds regardless of repository size.

**Phase 2 (conflict path):** If `git push` fails with a conflict, run `git fetch --unshallow origin` before the rebase retry. This deferred unshallow only runs when there's a push conflict — which is the minority case (concurrent agent runs on the same repository).

```yaml
- name: Checkout
  uses: actions/checkout@v6
  with:
    ref: ${{ github.event.repository.default_branch }}
    fetch-depth: 1
```

And in `agent.ts`, the push retry loop would become:

```typescript
let unshallowed = false;
for (let i = 1; i <= 10; i++) {
  const push = await run(["git", "push", "origin", `HEAD:${defaultBranch}`]);
  if (push.exitCode === 0) { pushSucceeded = true; break; }
  if (!unshallowed) {
    await run(["git", "fetch", "--unshallow", "origin"]);
    unshallowed = true;
  }
  await run(["git", "pull", "--rebase", "-X", "theirs", "origin", defaultBranch]);
  await new Promise(r => setTimeout(r, pushBackoffs[i - 1]));
}
```

**Expected saving:** 3–55 seconds depending on repository size. Small repos: 1–3s. Large repos: 20–55s.

**Risk:** Moderate. The `pi` agent may run git commands (e.g., `git log`, `git blame`, `git diff <old-commit>`) that require history depth. With a shallow clone, these commands would fail or return incomplete results. This risk depends entirely on what git operations the `pi` agent performs, which varies per prompt.

**Mitigation:** The `pi` agent could be instructed (via system prompt or tool configuration) to run `git fetch --unshallow origin` before performing any history-dependent git operations. However, this adds latency at a different point in the pipeline.

### 5.2 Treeless Clone (Middle Ground)

The `filter: blob:none` option provides a compromise:

```yaml
- name: Checkout
  uses: actions/checkout@v6
  with:
    ref: ${{ github.event.repository.default_branch }}
    fetch-depth: 0
    filter: blob:none
```

This downloads the full commit graph and tree objects but defers blob (file content) downloads to on-demand fetches. Initial clone is faster because it skips downloading historical file content, but all commit metadata, branches, and tags are immediately available.

**Expected saving:** 2–30 seconds on repositories with large historical blobs. Minimal impact on repos with small files.

**Risk:** Low-Moderate. Git operations that inspect file content from old commits (`git show <sha>:file`, `git diff <sha1>..<sha2>`) will trigger network fetches mid-operation. `git log --oneline`, `git branch`, and `git rebase` work normally without additional fetches.

### 5.3 Parallel Git Config (Micro-Optimization)

The two `git config` calls in `agent.ts` are currently sequential:

```typescript
await run(["git", "config", "user.name", "github-minimum-intelligence[bot]"]);
await run(["git", "config", "user.email", "github-minimum-intelligence[bot]@users.noreply.github.com"]);
```

These could be combined into a single subprocess call or moved to the workflow YAML:

```yaml
- name: Run
  run: |
    git config user.name "github-minimum-intelligence[bot]"
    git config user.email "github-minimum-intelligence[bot]@users.noreply.github.com"
    bun .github-minimum-intelligence/lifecycle/agent.ts
```

**Expected saving:** ~0.3–0.5 seconds (eliminates one Bun.spawn round-trip).

**Risk:** None.

---

## 6. Optimizations Already Applied

The following optimizations from the initial analysis have been implemented. They are documented here for completeness and to establish the baseline for the current performance profile.

| Optimization | When Applied | Savings Realized |
|---|---|---|
| **Dependency caching** (`actions/cache@v5` keyed on `bun.lock` hash) | Implemented | 8–25s on cache-hit runs |
| **Bun version pinning** (`bun-version: "1.2"`) | Implemented | 1–3s (improved tool-cache hit rate) |
| **Indicator merged into Authorize step** (inline shell `gh api` call) | Implemented | 2–4s (eliminated step boundary + Bun cold start); reaction fires ~10s earlier |
| **Event payload for issue content** (with API fallback at 65 536 chars) | Implemented | 2–4s (eliminated two `gh issue view` API calls) |
| **Combined realized savings** | — | **~13–36s** compared to the pre-optimization pipeline |

---

## 7. What Cannot Be Made Faster

Some aspects of the startup pipeline are fixed costs imposed by the platform:

| Constraint | Duration | Why It Cannot Be Reduced |
|---|---|---|
| Webhook delivery | 1–5s | GitHub's internal routing; no user control |
| Runner provisioning | 3–15s | Pool allocation; only eliminatable with self-hosted runners |
| `actions/checkout` overhead | 2–5s (minimum) | Even a shallow clone has fixed overhead from the action's setup |
| Step transition overhead | ~0.5–1s per step | GitHub Actions runtime overhead per step boundary |
| First Bun cold start | ~1s | JIT compilation of TypeScript on first execution |
| First `pi` binary startup | ~1–2s | Process initialization for the coding agent |
| LLM API first-token latency | 1–5s | Network round-trip + model loading; provider-controlled |

**Theoretical minimum startup latency** (shallow clone, all caches hit, small repo): **~12–18 seconds** from webhook to first LLM token.

**Current typical startup latency** (full clone, caches hit, small-to-medium repo): **~18–30 seconds** from webhook to first LLM token.

**Hard floor with self-hosted runner:** **~6–10 seconds** (eliminates queue time + tool setup).

---

## 8. Summary

**Is this the fastest way to implement the GitHub Action startup?**

**Yes, within the project's zero-infrastructure constraint, the current implementation is near-optimal.** All four low-risk, high-impact optimizations identified in the original analysis have been applied:

1. ✅ Dependency caching via `actions/cache` (saved 8–25s)
2. ✅ Bun version pinned to `"1.2"` (saved 1–3s)
3. ✅ Indicator reaction merged into Authorize step (saved 2–4s, fires ~10s earlier)
4. ✅ Event payload used for issue content with API fallback (saved 2–4s)

**Combined, these optimizations reduced the typical startup latency from ~30–60 seconds to ~18–30 seconds** — roughly a 2× improvement.

**What remains:**

The only remaining optimization with significant impact is **checkout strategy** (shallow clone or treeless clone), which could save 3–55 seconds on large repositories but introduces moderate risk for the `pi` agent's git operations. For small repositories — where checkout already takes 2–5 seconds — this optimization has negligible impact.

| Current Latency Profile | Small Repo (cache hit) | Large Repo (cache hit) |
|---|---|---|
| Queue + provision | 3–15s | 3–15s |
| Authorize + indicator | 1–3s | 1–3s |
| Checkout | 2–5s | 20–60s |
| Bun setup | 3–5s (tool cache) | 3–5s (tool cache) |
| Cache + install | 1–5s | 1–5s |
| Agent pre-LLM | 2–5s | 2–5s |
| **Total** | **12–38s** | **30–93s** |

For small-to-medium repositories, the pipeline is already within 5–10 seconds of the theoretical minimum (~12–18 seconds). For large repositories, the shallow clone strategy (§5.1) could close the gap significantly, but at the cost of potential failures when the `pi` agent runs history-dependent git commands.

**The current implementation represents the optimal balance of startup speed, reliability, and architectural simplicity.** Further speed gains require either accepting moderate risk (shallow clone) or abandoning the zero-infrastructure design (self-hosted runners, Docker images, pre-compiled binaries).
