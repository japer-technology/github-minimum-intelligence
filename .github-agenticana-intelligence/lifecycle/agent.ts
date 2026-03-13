/**
 * agent.ts — Lifecycle orchestrator for Agenticana Intelligence.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the main entry point for the Agenticana Intelligence AI agent system.
 * It receives a GitHub issue (or issue comment) event, dispatches to the
 * appropriate specialist agent(s), runs the `pi` agent against the user's
 * prompt, and posts the result back as an issue comment.  It also manages all
 * session state and the ReasoningBank so that multi-turn conversations across
 * multiple workflow runs are seamlessly resumed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LIFECYCLE POSITION
 * ─────────────────────────────────────────────────────────────────────────────
 * Workflow step order:
 *   1. Authorize   (inline shell)            — auth check + add 🚀 reaction indicator
 *   2. Install     (bun install)            — install npm/bun dependencies
 *   3. Run         (agent.ts)               ← YOU ARE HERE
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT EXECUTION PIPELINE
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Fetch issue title/body from GitHub via the `gh` CLI.
 *   2. Strip the `~` prefix from the prompt (routing signal, not user content).
 *   3. Resolve (or create) a conversation session for this issue number.
 *   4. Read dispatch.yaml and issue labels to determine which agent(s) to invoke.
 *   5. Run the `pi` coding agent binary with the prompt (+ prior session if resuming).
 *   6. Extract the assistant's final text reply from the JSONL output.
 *   7. Persist the issue → session mapping and update ReasoningBank if applicable.
 *   8. Stage, commit, and push all changes back to the default branch.
 *   9. Post the extracted reply as a new comment on the originating issue.
 *  10. [finally] Add an outcome reaction: 👍 on success or 👎 on error.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SESSION CONTINUITY
 * ─────────────────────────────────────────────────────────────────────────────
 * Agenticana maintains per-issue session state in:
 *   .github-agenticana-intelligence/state/issues/<number>.json
 *   .github-agenticana-intelligence/state/sessions/<timestamp>.jsonl
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PUSH CONFLICT RESOLUTION
 * ─────────────────────────────────────────────────────────────────────────────
 * Multiple agents may race to push to the same branch.  The script retries a
 * failed `git push` up to 10 times with increasing backoff delays, pulling
 * with `--rebase -X theirs` between attempts.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GITHUB COMMENT SIZE LIMIT
 * ─────────────────────────────────────────────────────────────────────────────
 * GitHub enforces a ~65 535 character limit on issue comments.  The agent reply
 * is capped at 60 000 characters to leave a comfortable safety margin.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPENDENCIES
 * ─────────────────────────────────────────────────────────────────────────────
 * - Node.js built-in `fs` module  (existsSync, readFileSync, writeFileSync, mkdirSync)
 * - Node.js built-in `path` module (resolve)
 * - GitHub CLI (`gh`)             — must be authenticated via GITHUB_TOKEN
 * - `pi` binary                   — installed by `bun install` from package.json
 * - System tools: `tee`, `tac`, `jq`, `git`, `bash`
 * - Bun runtime                   — for Bun.spawn and top-level await
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

// ─── Paths and event context ───────────────────────────────────────────────────
// `import.meta.dir` resolves to `.github-agenticana-intelligence/lifecycle/`; stepping up one level
// gives us the `.github-agenticana-intelligence/` directory which contains `state/` and `node_modules/`.
const agenticanaDir = resolve(import.meta.dir, "..");
const stateDir = resolve(agenticanaDir, "state");
const issuesDir = resolve(stateDir, "issues");
const sessionsDir = resolve(stateDir, "sessions");
const piSettingsPath = resolve(agenticanaDir, ".pi", "settings.json");

// The `pi` CLI requires a repo-root-relative path for `--session-dir`, not an
// absolute one, so we keep this as a relative string constant.
const sessionsDirRelative = ".github-agenticana-intelligence/state/sessions";

// GitHub enforces a ~65 535 character limit on issue comments; cap at 60 000
// characters to leave a comfortable safety margin and avoid API rejections.
const MAX_COMMENT_LENGTH = 60000;

// Parse the full GitHub Actions event payload (contains issue/comment details).
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, "utf-8"));

// "issues" for new issues, "issue_comment" for replies on existing issues.
const eventName = process.env.GITHUB_EVENT_NAME!;

// "owner/repo" format — used when calling the GitHub REST API via `gh api`.
const repo = process.env.GITHUB_REPOSITORY!;

// Fall back to "main" if the repository's default branch is not set in the event.
const defaultBranch = event.repository?.default_branch ?? "main";

// The issue number is present on both the `issues` and `issue_comment` payloads.
const issueNumber: number = event.issue.number;

// Read the committed `.pi` defaults and pass them explicitly to the runtime.
const piSettings = JSON.parse(readFileSync(piSettingsPath, "utf-8"));
const configuredProvider: string = piSettings.defaultProvider;
const configuredModel: string = piSettings.defaultModel;
const configuredThinking: string | undefined = piSettings.defaultThinkingLevel;

if (!configuredProvider || !configuredModel) {
  throw new Error(
    `Invalid .pi settings at ${piSettingsPath}: expected defaultProvider and defaultModel`
  );
}

// Catch whitespace-only or obviously malformed model identifiers early so the
// pi agent doesn't start up only to fail with an opaque API error.
if (configuredModel.trim() !== configuredModel || /\s/.test(configuredModel)) {
  throw new Error(
    `Invalid model identifier "${configuredModel}" in ${piSettingsPath}: ` +
    `model IDs must not contain whitespace. ` +
    `Update the "defaultModel" field in .pi/settings.json to a valid model ID for the "${configuredProvider}" provider.`
  );
}

console.log(`Configured provider: ${configuredProvider}, model: ${configuredModel}${configuredThinking ? `, thinking: ${configuredThinking}` : ""}`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Spawn an arbitrary subprocess, capture its stdout, and return both the
 * trimmed output and the process exit code.
 */
async function run(cmd: string[], opts?: { stdin?: any }): Promise<{ exitCode: number; stdout: string }> {
  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "inherit",
    stdin: opts?.stdin,
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { exitCode, stdout: stdout.trim() };
}

/**
 * Convenience wrapper: run `gh <args>` and return trimmed stdout.
 */
async function gh(...args: string[]): Promise<string> {
  const { exitCode, stdout } = await run(["gh", ...args]);
  if (exitCode !== 0) {
    throw new Error(`gh ${args[0]} failed with exit code ${exitCode}`);
  }
  return stdout;
}

// ─── Restore reaction state from Authorize step ─────────────────────
const reactionState = existsSync("/tmp/reaction-state.json")
  ? JSON.parse(readFileSync("/tmp/reaction-state.json", "utf-8"))
  : null;

// Track whether the agent completed successfully so the `finally` block can
// add the correct outcome reaction (👍 on success, 👎 on error).
let succeeded = false;

try {
  // ── Read issue title and body from the event payload ──────────────────────────
  // Use the webhook payload directly to avoid two `gh` API round-trips (~2–4 s).
  // GitHub truncates string fields at 65 536 characters in webhook payloads, so
  // we fall back to the API only when the body hits that limit.
  const title = event.issue.title;
  let body: string = event.issue.body ?? "";
  if (body.length >= 65536) {
    body = await gh("issue", "view", String(issueNumber), "--json", "body", "--jq", ".body");
  }

  // ── Strip the ~ prefix (routing signal, not part of the user's question) ────
  let prompt: string;
  if (eventName === "issue_comment") {
    prompt = event.comment.body.replace(/^~\s*/, "");
  } else {
    prompt = `${title.replace(/^~\s*/, "")}\n\n${body}`;
  }

  // ── Resolve or create session mapping ───────────────────────────────────────
  mkdirSync(issuesDir, { recursive: true });
  mkdirSync(sessionsDir, { recursive: true });

  let mode = "new";
  let sessionPath = "";
  const mappingFile = resolve(issuesDir, `${issueNumber}.json`);

  if (existsSync(mappingFile)) {
    const mapping = JSON.parse(readFileSync(mappingFile, "utf-8"));
    if (existsSync(mapping.sessionPath)) {
      mode = "resume";
      sessionPath = mapping.sessionPath;
      console.log(`Found existing session: ${sessionPath}`);
    } else {
      console.log("Mapped session file missing, starting fresh");
    }
  } else {
    console.log("No session mapping found, starting fresh");
  }

  // ── Configure git identity ───────────────────────────────────────────────────
  await run(["git", "config", "user.name", "github-agenticana-intelligence[bot]"]);
  await run(["git", "config", "user.email", "github-agenticana-intelligence[bot]@users.noreply.github.com"]);

  // ── Validate provider API key ────────────────────────────────────────────────
  const providerKeyMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    xai: "XAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    mistral: "MISTRAL_API_KEY",
    groq: "GROQ_API_KEY",
  };
  const requiredKeyName = providerKeyMap[configuredProvider];
  if (requiredKeyName && !process.env[requiredKeyName]) {
    await gh(
      "issue", "comment", String(issueNumber),
      "--body",
      `## ⚠️ Missing API Key: \`${requiredKeyName}\`\n\n` +
      `The configured provider is \`${configuredProvider}\`, but the \`${requiredKeyName}\` secret is not available to this workflow run.\n\n` +
      `### How to fix\n\n` +
      `**Option A — Repository secret** _(simplest)_\n` +
      `1. Go to **Settings → Secrets and variables → Actions → New repository secret**\n` +
      `2. Name: \`${requiredKeyName}\`, Value: your API key\n\n` +
      `**Option B — Organization secret** _(already have one?)_\n` +
      `Organization secrets are only available to workflows if the secret has been explicitly granted to this repository:\n` +
      `1. Go to your **Organization Settings → Secrets and variables → Actions**\n` +
      `2. Click the \`${requiredKeyName}\` secret → **Repository access**\n` +
      `3. Add **this repository** to the selected repositories list\n\n` +
      `Once the secret is accessible, re-trigger this workflow by posting a new comment on this issue.`
    );
    throw new Error(
      `${requiredKeyName} is not available to this workflow run. ` +
      `If you have set it as a repository secret, verify the secret name matches exactly. ` +
      `If you have set it as an organization secret, ensure this repository has been granted access ` +
      `(Organization Settings → Secrets and variables → Actions → ${requiredKeyName} → Repository access).`
    );
  }

  // ── Run the pi agent ─────────────────────────────────────────────────────────
  const piBin = resolve(agenticanaDir, "node_modules", ".bin", "pi");
  const piArgs = [
    piBin,
    "--mode",
    "json",
    "--provider",
    configuredProvider,
    "--model",
    configuredModel,
    ...(configuredThinking ? ["--thinking", configuredThinking] : []),
    "--session-dir",
    sessionsDirRelative,
    "-p",
    prompt,
  ];
  if (mode === "resume" && sessionPath) {
    piArgs.push("--session", sessionPath);
  }

  const pi = Bun.spawn(piArgs, { stdout: "pipe", stderr: "inherit" });
  const tee = Bun.spawn(["tee", "/tmp/agent-raw.jsonl"], { stdin: pi.stdout, stdout: "inherit" });
  await tee.exited;

  const piExitCode = await pi.exited;
  if (piExitCode !== 0) {
    throw new Error(
      `pi agent exited with code ${piExitCode} (provider: ${configuredProvider}, model: ${configuredModel}). ` +
      `This may indicate an invalid or misspelled model ID in .pi/settings.json. ` +
      `Check the workflow logs above for details.`
    );
  }

  // ── Extract final assistant text ─────────────────────────────────────────────
  const tac = Bun.spawn(["tac", "/tmp/agent-raw.jsonl"], { stdout: "pipe" });
  const jq = Bun.spawn(
    ["jq", "-r", "-s", '[ .[] | select(.type == "message_end" and .message.role == "assistant") | select((.message.content // []) | map(select(.type == "text")) | length > 0) ] | .[0].message.content[] | select(.type == "text") | .text'],
    { stdin: tac.stdout, stdout: "pipe" }
  );
  const agentText = await new Response(jq.stdout).text();
  await jq.exited;

  // ── Determine latest session file ────────────────────────────────────────────
  const { stdout: latestSession } = await run([
    "bash", "-c", `ls -t ${sessionsDirRelative}/*.jsonl 2>/dev/null | head -1`,
  ]);

  // ── Persist issue → session mapping ─────────────────────────────────────────
  if (latestSession) {
    writeFileSync(
      mappingFile,
      JSON.stringify({
        issueNumber,
        sessionPath: latestSession,
        updatedAt: new Date().toISOString(),
      }, null, 2) + "\n"
    );
    console.log(`Saved mapping: issue #${issueNumber} -> ${latestSession}`);
  } else {
    console.log("Warning: no session file found to map");
  }

  // ── Commit and push state changes ───────────────────────────────────────────
  const addResult = await run(["git", "add", "-A"]);
  if (addResult.exitCode !== 0) {
    console.error("git add failed with exit code", addResult.exitCode);
  }
  const { exitCode } = await run(["git", "diff", "--cached", "--quiet"]);
  if (exitCode !== 0) {
    const commitResult = await run(["git", "commit", "-m", `agenticana-intelligence: work on issue #${issueNumber}`]);
    if (commitResult.exitCode !== 0) {
      console.error("git commit failed with exit code", commitResult.exitCode);
    }
  }

  // Retry push up to 10 times with increasing backoff delays.
  const pushBackoffs = [1000, 2000, 3000, 5000, 7000, 8000, 10000, 12000, 12000, 15000];
  let pushSucceeded = false;
  for (let i = 1; i <= 10; i++) {
    const push = await run(["git", "push", "origin", `HEAD:${defaultBranch}`]);
    if (push.exitCode === 0) { pushSucceeded = true; break; }
    if (i < 10) {
      console.log(`Push failed, rebasing and retrying (${i}/10)...`);
      await run(["git", "pull", "--rebase", "-X", "theirs", "origin", defaultBranch]);
      await new Promise(r => setTimeout(r, pushBackoffs[i - 1]));
    }
  }
  if (!pushSucceeded) {
    throw new Error(
      "All 10 push attempts failed. Auto-reconciliation could not be completed. " +
      "Session state was not persisted to remote. Check the workflow logs for details."
    );
  }

  // ── Post reply as issue comment ──────────────────────────────────────────────
  const trimmedText = agentText.trim();
  let commentBody = trimmedText.length > 0
    ? trimmedText.slice(0, MAX_COMMENT_LENGTH)
    : `✅ The agent ran successfully but did not produce a text response. Check the repository for any file changes that were made.\n\nFor full details, see the [workflow run logs](https://github.com/${repo}/actions).`;
  if (!pushSucceeded) {
    commentBody += `\n\n---\n⚠️ **Warning:** The agent's session state could not be pushed to the repository. Conversation context may not be preserved for follow-up comments. See the [workflow run logs](https://github.com/${repo}/actions) for details.`;
  }
  await gh("issue", "comment", String(issueNumber), "--body", commentBody);

  succeeded = true;

} finally {
  // ── Guaranteed outcome reaction: 👍 on success, 👎 on error ─────────────────
  if (reactionState) {
    try {
      const { reactionTarget, commentId: stateCommentId } = reactionState;
      const outcomeContent = succeeded ? "+1" : "-1";
      if (reactionTarget === "comment" && stateCommentId) {
        await gh("api", `repos/${repo}/issues/comments/${stateCommentId}/reactions`, "-f", `content=${outcomeContent}`);
      } else {
        await gh("api", `repos/${repo}/issues/${issueNumber}/reactions`, "-f", `content=${outcomeContent}`);
      }
    } catch (e) {
      console.error("Failed to add outcome reaction:", e);
    }
  }
}
