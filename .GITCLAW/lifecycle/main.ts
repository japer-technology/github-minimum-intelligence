/**
 * main.ts — Core agent orchestrator for gitclaw.
 *
 * Lifecycle:
 *   1. Fetch issue title/body from GitHub.
 *   2. Resolve (or create) a conversation session for this issue.
 *   3. Run the `pi` coding agent with the user's prompt.
 *   4. Extract the assistant's final text reply.
 *   5. Commit session state and any repo changes back to git.
 *   6. Post the reply as a comment on the originating issue.
 *   7. Remove the 👀 reaction that `preinstall.ts` added.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

// --- Paths and event context ------------------------------------------
const gitclawDir = resolve(import.meta.dir, "..");
const stateDir = resolve(gitclawDir, "state");
const issuesDir = resolve(stateDir, "issues");
const sessionsDir = resolve(stateDir, "sessions");

/** Relative path used as a CLI arg for `pi` (must be repo-root-relative). */
const sessionsDirRelative = ".GITCLAW/state/sessions";

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, "utf-8"));
const eventName = process.env.GITHUB_EVENT_NAME!;
const repo = process.env.GITHUB_REPOSITORY!;
const defaultBranch = event.repository?.default_branch ?? "main";
const issueNumber: number = event.issue.number;

// --- Helpers ----------------------------------------------------------

/** Spawn a subprocess, capture stdout, and return the exit code. */
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

/** Convenience wrapper: run `gh <args>` and return trimmed stdout. */
async function gh(...args: string[]): Promise<string> {
  const { stdout } = await run(["gh", ...args]);
  return stdout;
}

// --- Restore reaction state from preinstall ---------------------------
// `preinstall.ts` persists the reaction ID so we can clean it up later
// in the `finally` block, even if the agent run itself fails.
const reactionState = existsSync("/tmp/reaction-state.json")
  ? JSON.parse(readFileSync("/tmp/reaction-state.json", "utf-8"))
  : null;

try {
  // --- Fetch issue title and body -------------------------------------
  const title = await gh("issue", "view", String(issueNumber), "--json", "title", "--jq", ".title");
  const body = await gh("issue", "view", String(issueNumber), "--json", "body", "--jq", ".body");

  // --- Resolve or create session mapping ------------------------------
  // Each issue maps to exactly one session file via `state/issues/<n>.json`.
  // If a mapping exists and the session file is present, we resume it;
  // otherwise we start fresh.
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

  // --- Configure git identity ------------------------------------------
  await run(["git", "config", "user.name", "gitclaw[bot]"]);
  await run(["git", "config", "user.email", "gitclaw[bot]@users.noreply.github.com"]);

  // --- Build prompt from event context --------------------------------
  // For issue_comment events, use the new comment body as the prompt.
  // For issue-opened events, combine the title and body.
  let prompt: string;
  if (eventName === "issue_comment") {
    prompt = event.comment.body;
  } else {
    prompt = `${title}\n\n${body}`;
  }

  // --- Run the pi agent ------------------------------------------------
  // Pipe output through `tee` so we get both a live log and a persisted
  // copy at `/tmp/agent-raw.jsonl` for post-processing.
  const piBin = resolve(gitclawDir, "node_modules", ".bin", "pi");
  const piArgs = [piBin, "--mode", "json", "--session-dir", sessionsDirRelative, "-p", prompt];
  if (mode === "resume" && sessionPath) {
    piArgs.push("--session", sessionPath);
  }

  const pi = Bun.spawn(piArgs, { stdout: "pipe", stderr: "ignore" });
  const tee = Bun.spawn(["tee", "/tmp/agent-raw.jsonl"], { stdin: pi.stdout, stdout: "inherit" });
  await tee.exited;

  // --- Extract final assistant text ------------------------------------
  // The agent emits newline-delimited JSON.  We reverse the file with
  // `tac` and use `jq` to grab the text content from the most recent
  // `message_end` event — that is the reply we post back to the issue.
  const tac = Bun.spawn(["tac", "/tmp/agent-raw.jsonl"], { stdout: "pipe" });
  const jq = Bun.spawn(
    ["jq", "-r", "-s", '[ .[] | select(.type == "message_end") ] | .[0].message.content[] | select(.type == "text") | .text'],
    { stdin: tac.stdout, stdout: "pipe" }
  );
  const agentText = await new Response(jq.stdout).text();
  await jq.exited;

  // --- Determine latest session file -----------------------------------
  const { stdout: latestSession } = await run([
    "bash", "-c", `ls -t ${sessionsDirRelative}/*.jsonl 2>/dev/null | head -1`,
  ]);

  // --- Persist issue → session mapping ---------------------------------
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

  // --- Commit and push state changes -----------------------------------
  // Push with a retry loop: on conflict, rebase and try again (up to 3×).
  await run(["git", "add", "-A"]);
  const { exitCode } = await run(["git", "diff", "--cached", "--quiet"]);
  if (exitCode !== 0) {
    await run(["git", "commit", "-m", `gitclaw: work on issue #${issueNumber}`]);
  }

  for (let i = 1; i <= 3; i++) {
    const push = await run(["git", "push", "origin", `HEAD:${defaultBranch}`]);
    if (push.exitCode === 0) break;
    console.log(`Push failed, rebasing and retrying (${i}/3)...`);
    await run(["git", "pull", "--rebase", "origin", defaultBranch]);
  }

  // --- Post reply as issue comment -------------------------------------
  // GitHub has a ~65 535 character limit on comments; we cap at 60 000
  // to leave a comfortable margin.
  const commentBody = agentText.slice(0, 60000);
  await gh("issue", "comment", String(issueNumber), "--body", commentBody);

} finally {
  // --- Guaranteed cleanup: remove 👀 reaction -------------------------
  // Always runs, even if the agent errored, so the user knows work stopped.
  if (reactionState?.reactionId) {
    try {
      const { reactionId, reactionTarget, commentId } = reactionState;
      if (reactionTarget === "comment" && commentId) {
        await gh("api", `repos/${repo}/issues/comments/${commentId}/reactions/${reactionId}`, "-X", "DELETE");
      } else {
        await gh("api", `repos/${repo}/issues/${issueNumber}/reactions/${reactionId}`, "-X", "DELETE");
      }
    } catch (e) {
      console.error("Failed to remove reaction:", e);
    }
  }
}
