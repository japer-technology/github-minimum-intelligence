# Implementation: SDK Migration

This document details the implementation plan for migrating from the current subprocess-based pi invocation to the TypeScript SDK, as identified in the [implementation plan](implementation-plan.md).

---

## 1. Current State

### 1.1 Subprocess Architecture

`agent.ts` currently spawns pi as a subprocess and processes its output through a shell pipeline:

```
agent.ts
  └─ Bun.spawn(pi --mode json ...)
       └─ stdout → tee /tmp/agent-raw.jsonl
                     └─ tac → jq → agentText
```

**Key characteristics:**
- Pi runs as an independent process with its own lifecycle
- Communication is one-way: agent sends a prompt, pi streams JSONL events to stdout
- Output extraction uses `tac` (reverse file) + `jq` (JSON filter) to find the last assistant message
- Error handling is binary: exit code 0 = success, non-zero = failure
- No programmatic access to intermediate events (tool calls, thinking blocks, compaction)

### 1.2 Current Pi Invocation (agent.ts lines 309–359)

```typescript
const piArgs = [
  piBin,
  "--mode", "json",
  "--provider", configuredProvider,
  "--model", configuredModel,
  ...(configuredThinking ? ["--thinking", configuredThinking] : []),
  "--session-dir", sessionsDirRelative,
  "-p", prompt,
  ...(mode === "resume" && sessionPath ? ["--session", sessionPath] : []),
];

const pi = Bun.spawn(piArgs, { stdout: "pipe", stderr: "inherit" });
const tee = Bun.spawn(["tee", "/tmp/agent-raw.jsonl"], {
  stdin: pi.stdout,
  stdout: "inherit",
});
await tee.exited;
const piExitCode = await pi.exited;
// ... tac + jq pipeline to extract assistant text
```

---

## 2. SDK Architecture

Pi exports a TypeScript SDK for programmatic usage:

```typescript
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(), // or file-based
  authStorage,
  modelRegistry,
});

await session.prompt("What files are in the current directory?");
```

**Key advantages:**
- Direct access to all session events (tool calls, thinking blocks, message updates)
- Programmatic control over session lifecycle
- No shell pipeline — output extraction is native TypeScript
- Structured error handling with typed exceptions
- Access to token usage, cost tracking, and compaction metrics

---

## 3. Migration Plan

### 3.1 Phase 1: Parallel Implementation

Create a new function `runPiSdk()` alongside the existing `runPiSubprocess()` in `agent.ts`. Use a feature flag to switch between them.

```typescript
// Feature flag
const USE_SDK = process.env.GMI_USE_SDK === "true";

if (USE_SDK) {
  agentText = await runPiSdk(prompt, mode, sessionPath);
} else {
  agentText = await runPiSubprocess(prompt, mode, sessionPath);
}
```

### 3.2 Phase 2: SDK Implementation

```typescript
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";

async function runPiSdk(
  prompt: string,
  mode: "new" | "resume",
  sessionPath: string,
): Promise<string> {
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  const sessionManager = SessionManager.create({
    sessionDir: resolve(minimumIntelligenceDir, "state", "sessions"),
  });

  const sessionOptions: Record<string, unknown> = {
    sessionManager,
    authStorage,
    modelRegistry,
    provider: configuredProvider,
    model: configuredModel,
    thinkingLevel: configuredThinking ?? undefined,
  };

  if (mode === "resume" && sessionPath) {
    sessionOptions.sessionFile = sessionPath;
  }

  const { session } = await createAgentSession(sessionOptions);

  // Collect assistant text from the session
  let assistantText = "";

  session.on("message_end", (event) => {
    if (event.message.role === "assistant") {
      for (const block of event.message.content) {
        if (block.type === "text") {
          assistantText = block.text; // Keep the last one
        }
      }
    }
  });

  // Optional: log events for debugging
  session.on("tool_call", (event) => {
    console.error(`[pi-sdk] Tool call: ${event.toolName}`);
  });

  await session.prompt(prompt);

  return assistantText;
}
```

### 3.3 Phase 3: Session File Mapping

The SDK's `SessionManager` needs to be configured to use the same session directory and file format as the subprocess approach. Verify that:

1. Session files are written to `state/sessions/` in the same JSONL format
2. Session file paths are compatible with the `state/issues/<N>.json` mapping
3. Resumed sessions load correctly from existing session files

### 3.4 Phase 4: Extension and Skill Loading

The SDK loads extensions and skills from `.pi/` directories automatically (same as CLI). Verify that:

1. `github-context.ts` extension loads and registers its tool
2. Custom skills (memory, skill-creator) are discovered
3. Prompt templates are available
4. `APPEND_SYSTEM.md` is appended to the system prompt

### 3.5 Phase 5: Remove Subprocess Code

Once the SDK path is validated, remove:

1. `runPiSubprocess()` function
2. `tee`, `tac`, `jq` pipeline
3. `GMI_USE_SDK` feature flag
4. `/tmp/agent-raw.jsonl` temp file usage

---

## 4. Key Differences

| Aspect | Subprocess | SDK |
|---|---|---|
| Output extraction | `tac` + `jq` shell pipeline | Direct event listener |
| Error handling | Exit code check | Typed exceptions |
| Event access | None (JSONL post-processing only) | Full lifecycle events |
| Token/cost tracking | Not available | Direct API |
| Process overhead | Fork + exec + pipes | In-process |
| Debugging | Read JSONL file | Set breakpoints |
| Extension loading | Automatic (CLI) | Automatic (SDK) |
| Session management | CLI flags | Programmatic API |

---

## 5. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SDK API breaks between versions | Medium | High | Pin pi-coding-agent version; test before upgrading |
| Session file format incompatibility | Low | High | Test with existing session files before migration |
| Extension loading differences | Low | Medium | Verify extension discovery paths match CLI behaviour |
| Missing `tee` equivalent for logging | Medium | Low | Write JSONL events to file manually via event listener |
| Bun compatibility with SDK internals | Low | High | SDK is designed for Bun; test thoroughly |
| System prompt differences | Low | Medium | Compare system prompts from CLI and SDK; verify `APPEND_SYSTEM.md` loading |

---

## 6. Prerequisites

1. **Stable SDK API** — The SDK API should be stable (no breaking changes expected in the next 2–3 versions)
2. **SDK documentation** — Review [docs/sdk.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/sdk.md) for complete API reference
3. **Test environment** — Local testing setup to validate SDK behaviour before deploying to GitHub Actions

---

## 7. Decision Criteria

Migrate to SDK when any of these conditions are met:

- The subprocess `jq` pipeline fails on a valid JSONL event (fragility)
- A feature requires access to intermediate events (tool calls, thinking blocks)
- Token/cost tracking is needed for budgeting
- The subprocess approach causes debugging difficulties

**Current recommendation:** Defer. The subprocess approach works reliably and the shell pipeline has not shown fragility. The SDK migration is a significant refactor with medium reward. Implement when a concrete limitation of the subprocess approach is encountered.

---

## 8. Summary

The SDK migration replaces the subprocess + shell pipeline with native TypeScript integration. It provides direct event access, structured error handling, and programmatic session management. The migration should be implemented in phases: parallel implementation with feature flag, validation against existing sessions, and finally removal of the subprocess code path. The primary risk is SDK API stability; mitigate by pinning versions and testing before deployment.

*Estimated effort: 4–8 hours (including testing and validation). Risk: Medium.*
