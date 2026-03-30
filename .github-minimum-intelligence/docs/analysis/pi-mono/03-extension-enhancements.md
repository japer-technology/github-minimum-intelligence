# Implementation: Extension Enhancements

This document details the implementation plan for new pi extensions that improve security, observability, and GitHub integration, as identified in the [implementation plan](implementation-plan.md).

---

## 1. Current State

GMI has one extension: `github-context.ts`, which registers a `github_repo_context` tool that returns structured repository metadata via the `gh` CLI.

The pi extension API supports significantly more capabilities than GMI currently uses:

| Capability | Used | Available |
|---|---|---|
| Custom tools (`registerTool`) | ✅ 1 tool | Unlimited |
| Custom commands (`registerCommand`) | ❌ | ✅ |
| Event interception (`on("tool_call")`) | ❌ | ✅ |
| Context injection (`on("before_agent_start")`) | ❌ | ✅ |
| Session events | ❌ | ✅ |
| Custom shortcuts (`registerShortcut`) | ❌ | ✅ (interactive only) |
| Custom flags (`registerFlag`) | ❌ | ✅ |
| UI components (`ctx.ui.*`) | ❌ | ✅ (interactive only) |

In `--mode json` (headless), all tool, command, event, and flag capabilities work. UI components (`ctx.ui.*`) are non-interactive — `confirm()` auto-accepts, `select()` returns the first option, and `notify()` is a no-op.

---

## 2. Proposed Extensions

### 2.1 Permission Gate Extension

**File:** `.pi/extensions/permission-gate.ts`

**Purpose:** Intercept dangerous tool calls and block them, preventing the agent from accidentally executing destructive operations.

**Blocked patterns:**

| Category | Patterns |
|---|---|
| Destructive filesystem | `rm -rf /`, `rm -rf ~`, `rm -rf .` |
| Privilege escalation | `sudo`, `su -`, `chmod 777` |
| Network exfiltration | `curl -X POST`, `wget --post-data` |
| Credential access | `cat ~/.ssh/`, `cat /etc/shadow` |
| Package modification | `npm publish`, `pip upload` |
| Git force operations | `git push --force`, `git reset --hard` |

**Implementation:**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  const BLOCKED_PATTERNS = [
    /\brm\s+(-[a-z]*f[a-z]*\s+)?(-[a-z]*r[a-z]*\s+)?(\/|~|\.\s|\.\.)/i,
    /\bsudo\b/i,
    /\bchmod\s+777\b/,
    /\bgit\s+push\s+--force\b/i,
    /\bgit\s+reset\s+--hard\b/i,
    /\bnpm\s+publish\b/i,
  ];

  pi.on("tool_call", async (event) => {
    if (event.toolName === "bash" && event.input.command) {
      const cmd = event.input.command;
      for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(cmd)) {
          return {
            block: true,
            reason: `Blocked by permission gate: command matches restricted pattern "${pattern.source}"`,
          };
        }
      }
    }
  });
}
```

**Behaviour in `--mode json`:** The `tool_call` event fires before execution. Returning `{ block: true }` prevents the tool call and sends the reason back to the LLM, which can reformulate its approach.

---

### 2.2 Path Protection Extension

**File:** `.pi/extensions/path-protection.ts`

**Purpose:** Block file writes to sensitive paths, preventing the agent from modifying configuration files, secrets, or infrastructure code without explicit intent.

**Protected paths:**

| Path Pattern | Reason |
|---|---|
| `.env*` | Environment secrets |
| `.github/workflows/*` | CI/CD pipeline |
| `node_modules/` | Dependencies (should use package manager) |
| `.git/` | Git internals |
| `*.pem`, `*.key` | Cryptographic material |
| `.pi/settings.json` | Agent configuration (prevent self-modification loops) |

**Implementation:**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  const PROTECTED_PATHS = [
    /^\.env/,
    /^\.github\/workflows\//,
    /node_modules\//,
    /^\.git\//,
    /\.(pem|key)$/,
    /^\.pi\/settings\.json$/,
  ];

  pi.on("tool_call", async (event) => {
    if ((event.toolName === "write" || event.toolName === "edit") && event.input.path) {
      const filePath = event.input.path;
      for (const pattern of PROTECTED_PATHS) {
        if (pattern.test(filePath)) {
          return {
            block: true,
            reason: `Blocked by path protection: "${filePath}" matches protected pattern "${pattern.source}". If this write is intentional, use the bash tool instead.`,
          };
        }
      }
    }
  });
}
```

**Note:** This blocks `write` and `edit` tools only. The `bash` tool can still modify these files — the gate is a guardrail, not a sandbox. For full isolation, run the agent in a container.

---

### 2.3 GitHub Issue Context Extension

**File:** `.pi/extensions/github-issue-context.ts`

**Purpose:** Register additional GitHub-aware tools that reduce the agent's need to construct `gh` CLI commands:

| Tool | Description |
|---|---|
| `github_issue_context` | Returns current issue metadata (title, body, labels, assignees, state) |
| `github_issue_comments` | Returns comments on the current or specified issue |
| `github_pr_status` | Returns PR status (checks, reviews, merge state) for a given PR number |

**Implementation outline:**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "github_issue_context",
    label: "GitHub Issue Context",
    description:
      "Returns structured metadata about a GitHub issue: " +
      "title, body, labels, assignees, state, and creation date.",
    parameters: Type.Object({
      issue_number: Type.Number({ description: "Issue number to look up" }),
    }),
    async execute(_toolCallId, params, _signal) {
      try {
        const { execSync } = await import("node:child_process");
        const raw = execSync(
          `gh issue view ${params.issue_number} --json title,body,labels,assignees,state,createdAt`,
          { encoding: "utf-8", timeout: 15_000 },
        );
        return {
          content: [{ type: "text" as const, text: raw.trim() }],
          details: {},
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Failed: ${message}` }],
          details: {},
        };
      }
    },
  });

  pi.registerTool({
    name: "github_issue_comments",
    label: "GitHub Issue Comments",
    description: "Returns comments on a GitHub issue.",
    parameters: Type.Object({
      issue_number: Type.Number({ description: "Issue number" }),
    }),
    async execute(_toolCallId, params, _signal) {
      try {
        const { execSync } = await import("node:child_process");
        const raw = execSync(
          `gh issue view ${params.issue_number} --comments --json comments`,
          { encoding: "utf-8", timeout: 15_000 },
        );
        return {
          content: [{ type: "text" as const, text: raw.trim() }],
          details: {},
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Failed: ${message}` }],
          details: {},
        };
      }
    },
  });

  pi.registerTool({
    name: "github_pr_status",
    label: "GitHub PR Status",
    description:
      "Returns the status of a pull request: checks, reviews, merge state.",
    parameters: Type.Object({
      pr_number: Type.Number({ description: "Pull request number" }),
    }),
    async execute(_toolCallId, params, _signal) {
      try {
        const { execSync } = await import("node:child_process");
        const raw = execSync(
          `gh pr view ${params.pr_number} --json title,state,statusCheckRollup,reviews,mergeable,mergedAt`,
          { encoding: "utf-8", timeout: 15_000 },
        );
        return {
          content: [{ type: "text" as const, text: raw.trim() }],
          details: {},
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Failed: ${message}` }],
          details: {},
        };
      }
    },
  });
}
```

---

### 2.4 Agent Metadata Extension

**File:** `.pi/extensions/agent-metadata.ts`

**Purpose:** Inject contextual metadata into the agent's system prompt at the start of each conversation, providing the agent with awareness of its environment:

- Current date and time (UTC)
- GitHub Actions run ID and URL
- Repository name and owner
- Issue number being processed
- Whether this is a new or resumed session

**Implementation:**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    const metadata = [
      `Current UTC time: ${new Date().toISOString()}`,
      `GitHub repository: ${process.env.GITHUB_REPOSITORY ?? "unknown"}`,
      `GitHub Actions run: ${process.env.GITHUB_RUN_ID ?? "local"}`,
      `Run URL: ${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY ?? ""}/actions/runs/${process.env.GITHUB_RUN_ID ?? ""}`,
    ].join("\n");

    return {
      systemPrompt: event.systemPrompt + `\n\n## Environment Context\n${metadata}`,
    };
  });
}
```

---

## 3. Implementation Order

1. **Permission gate** — Highest security impact; prevents accidental destructive operations
2. **Path protection** — Complements permission gate for file-level protection
3. **GitHub issue context** — Extends the existing github-context.ts pattern
4. **Agent metadata** — Nice-to-have context enrichment

---

## 4. Testing Strategy

### 4.1 Permission Gate

Test with issues that ask the agent to perform destructive operations:

- "Delete all files in the repository" → Should be blocked
- "Run `sudo apt-get install`" → Should be blocked
- "Create a new file at `src/hello.ts`" → Should be allowed
- "Run `npm install express`" → Should be allowed

### 4.2 Path Protection

Test with issues that ask the agent to modify protected files:

- "Update `.env` with a new API key" → Should be blocked (via write/edit tools)
- "Edit the GitHub Actions workflow" → Should be blocked
- "Create a new file at `src/utils.ts`" → Should be allowed

### 4.3 GitHub Issue Context

Test by asking the agent to summarise another issue or check PR status:

- "What is issue #5 about?" → Should use `github_issue_context` tool
- "What's the status of PR #10?" → Should use `github_pr_status` tool

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Permission gate blocks legitimate operations | Medium | Medium | Use specific patterns (not overly broad); provide bypass instruction in block message |
| Path protection prevents needed edits | Low | Medium | Allow bash fallback; message explains how to use bash for intentional edits |
| Extension load failure breaks agent | Low | High | Extensions load independently; one failure doesn't prevent others from loading |
| `gh` CLI not authenticated | Low | High | `GITHUB_TOKEN` is already passed in the workflow; `gh` uses it automatically |

---

## 6. Directory Structure After Implementation

```
.pi/extensions/
├── github-context.ts            # Existing — repository metadata
├── github-issue-context.ts      # New — issue/PR tools
├── permission-gate.ts           # New — dangerous command blocking
├── path-protection.ts           # New — sensitive file protection
└── agent-metadata.ts            # New — environment context injection
```

---

## 7. Summary

Four new extensions add security guardrails (permission gate, path protection), expanded GitHub integration (issue/PR context tools), and environment awareness (metadata injection). All use pi's existing extension infrastructure — auto-discovered from `.pi/extensions/`, loaded via `jiti` (no compilation), and fully functional in `--mode json`. The permission gate and path protection extensions are the highest-priority items due to their security impact.

*Estimated effort: 2–3 hours (including testing). Risk: Low–Medium.*
