# Analysis: SDK Migration — Arguments For and Against

This document provides a detailed examination of the proposal to migrate GMI's agent invocation from the current subprocess model to the pi TypeScript SDK, as described in [05-sdk-migration.md](../05-sdk-migration.md). The analysis evaluates both sides of the decision — why it is a good idea and why it is a bad idea — grounded in GMI's specific deployment context: a headless GitHub Actions agent running `pi --mode json` as a subprocess.

---

## 1. Context

GMI invokes pi as a subprocess and extracts the final assistant reply through a `tee` → `tac` → `jq` shell pipeline. The SDK alternative would replace this with direct TypeScript API calls (`createAgentSession`, `session.prompt`), running pi in-process. Both approaches produce functionally identical results — an assistant text string consumed by `agent.ts` to post as an issue comment.

The question is not *whether* the SDK works — it does — but whether the migration is *warranted* given the current system's reliability, the transition cost, and the architectural trade-offs involved.

---

## 2. Arguments For Migration (Good Idea)

### 2.1 Elimination of Shell Pipeline Fragility

The current extraction pipeline is a chain of four Unix tools:

```
stdout → tee /tmp/agent-raw.jsonl → tac → jq (complex filter) → agentText
```

The `jq` filter is a single-line expression that selects `message_end` events with role `assistant` containing `text` blocks. This works, but:

- Any change to pi's JSONL event schema (field renames, new event types, nested structure changes) can silently break extraction.
- The filter is opaque — a developer unfamiliar with `jq` cannot easily verify its correctness by reading the code.
- Debugging a `jq` failure requires manually inspecting `/tmp/agent-raw.jsonl` and re-running the filter outside the agent process.

The SDK replaces this with a typed `message_end` event listener. Schema changes surface as TypeScript compilation errors rather than silent runtime failures.

**Strength of argument: High.** Shell pipelines for structured data extraction are a well-known source of subtle bugs, and this one is particularly dense.

### 2.2 Structured Error Handling

The subprocess model has binary error semantics: exit code 0 means success, anything else means failure. The current code surfaces this as a generic error message suggesting an invalid model ID — a reasonable guess but not always correct.

The SDK provides typed exceptions with error categories (authentication failure, rate limit, context window exceeded, invalid model, network error). This enables:

- Specific error messages in issue comments ("Rate limited — retrying in 30s" vs. "pi agent exited with code 1")
- Differentiated retry logic (retry on rate limit, abort on invalid model)
- Structured logging for operational monitoring

**Strength of argument: High.** Specific error handling directly improves the user experience for anyone triggering the agent via an issue comment.

### 2.3 Access to Intermediate Events

The subprocess model discards all intermediate events. Tool calls, thinking blocks, compaction events, and token usage metrics are written to `/tmp/agent-raw.jsonl` but never programmatically consumed.

The SDK provides event listeners for the full agent lifecycle:

| Event | Use Case |
|---|---|
| `tool_call` | Log which tools the agent invoked; detect unsafe commands |
| `thinking` | Capture chain-of-thought for reasoning transparency |
| `compaction` | Monitor context window pressure; alert on frequent compaction |
| `token_usage` | Track per-run costs for budgeting |

These capabilities directly support planned features like [LLM reasoning transparency](../../toulmin-6-llm-reasoning-transparency-implementation.md) and [rebuttal-driven security hardening](../../toulmin-4-rebuttal-driven-security-hardening-implementation.md).

**Strength of argument: Medium-High.** Valuable, but only realised if downstream features that consume these events are actually implemented.

### 2.4 Token and Cost Visibility

GMI currently has zero visibility into per-run token consumption or API costs. Usage can only be estimated by checking provider dashboards. The SDK exposes token counts (input, output, cached) and cost calculations per session turn.

This enables:

- Per-issue cost tracking stored in `state/issues/<N>.json`
- Budget alerts (reject conversations exceeding a threshold)
- Cost-optimised model selection (use a cheaper model for simple issues)

**Strength of argument: Medium.** Useful for operational maturity, but not critical until scale becomes a concern.

### 2.5 Reduced Process Overhead

The subprocess model incurs:

- Process fork and exec overhead for `pi`, `tee`, `tac`, and `jq` (four processes)
- Inter-process communication through pipes
- Disk I/O for the intermediate JSONL file

The SDK runs everything in-process with native TypeScript event dispatch. While the overhead difference is small relative to LLM API latency (which dominates wall-clock time), it simplifies the execution model and reduces the number of moving parts.

**Strength of argument: Low-Medium.** The performance difference is negligible in practice, but the architectural simplification is real.

### 2.6 Improved Debugging Experience

Debugging the subprocess model requires:

1. Inspecting `/tmp/agent-raw.jsonl` (which may be truncated or incomplete)
2. Re-running the `tac + jq` pipeline manually
3. Adding `console.error` statements to `agent.ts` and redeploying

The SDK supports standard TypeScript debugging — breakpoints, step-through, variable inspection — in any IDE. Event listeners can be added or modified without redeploying.

**Strength of argument: Medium.** Matters most during development and incident investigation; less relevant during steady-state operation.

### 2.7 TypeScript Type Safety Across the Boundary

The subprocess model creates a serialization boundary: `agent.ts` (TypeScript) → pipe (bytes) → `jq` (untyped text) → `agentText` (string). There is no type checking across this boundary.

The SDK keeps everything in TypeScript. Session events, message types, and error codes are all typed. Refactoring is safer because the compiler catches type mismatches.

**Strength of argument: Medium.** The current pipeline is small enough that type safety adds modest value, but it becomes more important if the event-processing logic grows.

### 2.8 Elimination of External Tool Dependencies

The subprocess model requires `tee`, `tac`, and `jq` to be present on the GitHub Actions runner. While these are available on standard Ubuntu runners, they are:

- Not guaranteed on custom or self-hosted runners
- Not available in all container images
- Additional binaries that must be trusted

The SDK has zero external binary dependencies.

**Strength of argument: Low.** Standard GitHub-hosted runners include all required tools. This only matters if GMI moves to non-standard runner environments.

---

## 3. Arguments Against Migration (Bad Idea)

### 3.1 Working System Risk

The subprocess approach has been stable since GMI's inception. The `tac + jq` pipeline, while not elegant, has not produced a known failure on valid JSONL output. Rewriting a working system introduces the risk of new bugs in code that previously had none.

The engineering maxim "if it isn't broken, don't fix it" applies strongly here. Every line of new code is a potential source of regression.

**Strength of argument: High.** The strongest argument against migration. Working, tested code has immense value.

### 3.2 API Stability Risk

CLI interfaces are traditionally more stable than programmatic APIs. The `pi --mode json` interface has a strong implicit contract: command-line flags and JSONL event format changes are visible, documented, and versioned. Breaking changes are rare because many users depend on the CLI.

SDK APIs, by contrast, evolve more freely. Internal method signatures, class hierarchies, and event schemas may change between minor versions. A pi-coding-agent SDK update could require `agent.ts` changes, while the CLI invocation would continue to work unchanged.

**Strength of argument: High.** SDK coupling is deeper than CLI coupling. The pi-coding-agent SDK is relatively young, and its API surface may not yet be stable.

### 3.3 Process Isolation Benefits

The subprocess model provides natural isolation:

- **Memory isolation:** Pi runs in its own process with its own heap. An out-of-memory condition in pi does not crash `agent.ts`.
- **Crash isolation:** If pi segfaults or hangs, `agent.ts` detects this via the exit code and can report the failure cleanly.
- **Resource cleanup:** Process termination guarantees all resources (file handles, network connections) are released by the OS.

The SDK runs pi in the same process as `agent.ts`. A crash, memory leak, or infinite loop in the SDK takes down the entire agent.

**Strength of argument: Medium-High.** Process isolation is a genuine architectural benefit, especially for a long-running agent that handles untrusted input (arbitrary issue comment text).

### 3.4 Increased Coupling Depth

The subprocess model creates a clean architectural boundary:

```
agent.ts ──[CLI contract]──> pi binary
```

The only coupling points are: command-line arguments, JSONL output format, and exit codes. These are documented and versioned.

The SDK migration replaces this with:

```
agent.ts ──[TypeScript imports]──> pi-coding-agent internals
```

This creates coupling at the API level (function signatures, class hierarchies, event types) and potentially at the transitive dependency level (whatever pi-coding-agent depends on must also be compatible with agent.ts's Bun runtime).

If GMI ever wants to switch from pi to a different coding agent, the subprocess model requires changing one function. The SDK model requires rewriting all event-handling and session-management code.

**Strength of argument: Medium-High.** Coupling depth affects long-term maintainability and optionality.

### 3.5 Migration Effort vs. Reward

The estimated effort is 4–8 hours of significant refactoring, including:

- Restructuring `agent.ts` from shell-pipe orchestration to async/await event processing
- Validating session file compatibility
- Verifying extension and skill loading
- Testing across providers (OpenAI, Anthropic)
- Maintaining a parallel implementation with feature flag during validation

The reward is primarily architectural cleanliness. There is no user-facing feature that requires the SDK today.

**Strength of argument: Medium.** The effort is manageable, but spending it on features that directly benefit users (e.g., web search, permission gates) has higher impact.

### 3.6 Session File Compatibility Uncertainty

The subprocess and SDK approaches may write session files in subtly different formats or directory structures. The existing `state/issues/<N>.json` mapping relies on session files being written to predictable paths in `state/sessions/`. If the SDK's `SessionManager` uses different file naming conventions, path resolution, or JSONL serialization, existing sessions could become unresumable.

**Strength of argument: Medium.** Testable and mitigable, but a real risk during the transition period, especially for long-running issue conversations.

### 3.7 Extension Loading Uncertainty

Pi's CLI automatically discovers and loads extensions from `.pi/extensions/`. The SDK documentation states that extensions work the same way, but the discovery mechanism may differ in edge cases:

- Working directory resolution (does the SDK resolve `.pi/` relative to `process.cwd()` or to the SDK's entry point?)
- Extension compilation (does the SDK handle TypeScript transpilation the same way as the CLI?)
- Event hook registration order (are extensions loaded before or after session creation?)

Any difference could cause `github-context.ts` to fail silently, removing the `github_repo_context` tool from the agent's capabilities.

**Strength of argument: Medium.** Verifiable through testing, but the silent failure mode is concerning.

### 3.8 Rollback Complexity

The migration plan proposes a parallel implementation with a feature flag. This means maintaining two code paths (subprocess and SDK) during the validation period. If the SDK path reveals issues after deployment, the subprocess path must be kept in sync with any other `agent.ts` changes made during the validation period.

Once the subprocess code is removed (Phase 5 of the migration plan), rolling back requires re-implementing the shell pipeline from scratch or reverting the entire migration commit.

**Strength of argument: Low-Medium.** The feature flag approach mitigates this, but the dual-maintenance burden is real during the transition.

### 3.9 Loss of Operational Transparency

The `/tmp/agent-raw.jsonl` file is a complete, human-readable transcript of every event pi emitted. Operators can inspect it directly with standard Unix tools (`grep`, `less`, `wc -l`). It serves as both a debugging artifact and an audit trail.

The SDK model requires explicitly implementing equivalent logging. Without it, the only record of what happened is the session file (which uses pi's internal format) and whatever event listeners the developer remembers to add.

**Strength of argument: Low-Medium.** Solvable by adding a logging event listener, but it is additional code that must be written and maintained.

### 3.10 Deepening Vendor Dependency

The subprocess model treats pi as a replaceable component — any coding agent that accepts a prompt on stdin and emits text on stdout could be substituted. The SDK migration binds `agent.ts` to pi-coding-agent's specific API surface, making pi an integral part of GMI's architecture rather than a swappable tool.

This narrows GMI's optionality if a superior coding agent emerges or if pi-coding-agent is discontinued.

**Strength of argument: Low.** GMI is already deeply integrated with pi (settings, extensions, skills, session format). The subprocess boundary provides theoretical replaceability, but in practice the coupling is already deep.

---

## 4. Comparative Summary

| Dimension | Subprocess (Status Quo) | SDK (Proposed) |
|---|---|---|
| **Reliability** | Proven; no known failures | Unproven in GMI context |
| **Error specificity** | Binary (exit code) | Typed exceptions |
| **Event visibility** | Post-hoc JSONL inspection | Real-time event listeners |
| **Type safety** | None across boundary | Full TypeScript types |
| **Process isolation** | Strong (separate process) | None (in-process) |
| **Coupling** | Shallow (CLI contract) | Deep (API surface) |
| **Debugging** | JSONL file inspection | IDE breakpoints |
| **External deps** | `tee`, `tac`, `jq` | None |
| **Migration cost** | Zero (current state) | 4–8 hours |
| **Vendor lock-in** | Lower (CLI boundary) | Higher (API dependency) |

---

## 5. Weighted Assessment

Assigning weights based on GMI's current maturity and deployment context (early-stage, single-maintainer, GitHub Actions):

| Factor | Weight | Subprocess | SDK |
|---|---|---|---|
| Reliability (proven track record) | 30% | ★★★★★ | ★★★☆☆ |
| Error handling quality | 15% | ★★☆☆☆ | ★★★★★ |
| Future feature enablement | 15% | ★★☆☆☆ | ★★★★★ |
| Architectural simplicity | 15% | ★★★★☆ | ★★★★☆ |
| Migration cost / risk | 15% | ★★★★★ | ★★☆☆☆ |
| Operational visibility | 10% | ★★★★☆ | ★★★☆☆ |

**Subprocess weighted score:** 4.05 / 5.00
**SDK weighted score:** 3.55 / 5.00

The subprocess approach scores higher primarily due to its proven reliability and zero migration cost. The SDK scores higher on error handling and future feature enablement, but these benefits are not yet needed.

---

## 6. Conclusion

The SDK migration is a **good idea in principle** — it offers genuine architectural improvements in error handling, event visibility, and type safety. However, it is a **premature idea in practice** — the subprocess approach works reliably, the benefits are not yet needed, and the migration carries real risks (API stability, process isolation loss, session compatibility).

The decision should be **trigger-based**, not calendar-based. Migrate when a concrete limitation of the subprocess approach is encountered (see [decision-framework.md](decision-framework.md) for specific trigger criteria), not on a predetermined schedule.

---

*Analysis derived from [05-sdk-migration.md](../05-sdk-migration.md), [implementation-plan.md](../implementation-plan.md), and [pi-mono-feature-utilization.md](../../pi-mono-feature-utilization.md). Applies to GMI agent.ts as of 2026-03-30.*
