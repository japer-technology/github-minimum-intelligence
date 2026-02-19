/**
 * enabled.ts — Fail-closed guard for the .GITCLAW-ENABLED.md sentinel file.
 *
 * Run this as the first step in every .GITCLAW-* workflow.
 * If `.GITCLAW/.GITCLAW-ENABLED.md` is absent the script prints an
 * explanatory message and exits non-zero, blocking all subsequent steps.
 */

import { existsSync } from "fs";
import { resolve } from "path";

const enabledFile = resolve(import.meta.dir, "..", ".GITCLAW-ENABLED.md");

if (!existsSync(enabledFile)) {
  console.error("GitClaw disabled by missing .GITCLAW-ENABLED.md");
  process.exit(1);
}

console.log("GitClaw enabled — .GITCLAW-ENABLED.md found.");
