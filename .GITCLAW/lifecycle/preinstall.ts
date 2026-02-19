/**
 * preinstall.ts — Adds a 👀 reaction to signal that the agent is working.
 *
 * Runs *before* dependency installation so the user sees immediate
 * feedback. The reaction ID is persisted to `/tmp/reaction-state.json`
 * so that `main.ts` can remove it when the run completes.
 */

import { readFileSync, writeFileSync } from "fs";

// --- Read GitHub Actions event context --------------------------------
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, "utf-8"));
const eventName = process.env.GITHUB_EVENT_NAME!;
const repo = process.env.GITHUB_REPOSITORY!;
const issueNumber: number = event.issue.number;

/** Thin wrapper around the GitHub CLI that returns trimmed stdout. */
async function gh(...args: string[]): Promise<string> {
  const proc = Bun.spawn(["gh", ...args], { stdout: "pipe", stderr: "inherit" });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;
  return stdout.trim();
}

// --- Add 👀 reaction --------------------------------------------------
let reactionId: string | null = null;
let reactionTarget: "comment" | "issue" = "issue";
let commentId: number | null = null;

try {
  if (eventName === "issue_comment") {
    commentId = event.comment.id;
    reactionId = await gh(
      "api", `repos/${repo}/issues/comments/${commentId}/reactions`,
      "-f", "content=eyes", "--jq", ".id"
    );
    reactionTarget = "comment";
  } else {
    reactionId = await gh(
      "api", `repos/${repo}/issues/${issueNumber}/reactions`,
      "-f", "content=eyes", "--jq", ".id"
    );
  }
} catch (e) {
  console.error("Failed to add reaction:", e);
}

// --- Persist state for main.ts cleanup --------------------------------
// Write reaction state so main.ts can clean it up in its `finally` block.
writeFileSync("/tmp/reaction-state.json", JSON.stringify({
  reactionId,
  reactionTarget,
  commentId,
  issueNumber,
  repo,
}));
